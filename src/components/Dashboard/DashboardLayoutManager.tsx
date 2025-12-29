import { useState, useEffect } from 'react';
import { Settings, Plus, Download, Upload, X, GripVertical, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { WidgetLayout, DashboardLayout, WIDGET_CATALOG, WidgetId, exportLayoutToXML, importLayoutFromXML } from '../../types/dashboard';

interface DashboardLayoutManagerProps {
  layout: DashboardLayout;
  onLayoutChange: (layout: DashboardLayout) => void;
  onSave: () => void;
  onCancel: () => void;
  onResetToDefault?: () => void;
}

export default function DashboardLayoutManager({
  layout,
  onLayoutChange,
  onSave,
  onCancel,
  onResetToDefault,
}: DashboardLayoutManagerProps) {
  const [availableWidgets, setAvailableWidgets] = useState<WidgetId[]>([]);
  const [draggedWidget, setDraggedWidget] = useState<WidgetId | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    // Get widgets that are not visible
    const visibleIds = layout.widgets.filter(w => w.visible).map(w => w.id);
    const available = Object.keys(WIDGET_CATALOG).filter(
      id => !visibleIds.includes(id as WidgetId)
    ) as WidgetId[];
    setAvailableWidgets(available);
    console.log('[DashboardLayoutManager] Available widgets:', available);
    console.log('[DashboardLayoutManager] Current layout:', layout);
  }, [layout]);

  const handleDragStart = (widgetId: WidgetId, source: 'sidebar' | 'dashboard') => {
    console.log('[DashboardLayoutManager] Drag started:', widgetId, 'from', source);
    setDraggedWidget(widgetId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverIndex !== index) {
      console.log('[DashboardLayoutManager] Drag over index changed from', dragOverIndex, 'to', index, 'dragging:', draggedWidget);
    }
    setDragOverIndex(index);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);

    if (!draggedWidget) {
      console.log('[DashboardLayoutManager] Drop failed: no dragged widget');
      return;
    }

    console.log('[DashboardLayoutManager] ====== DROP EVENT ======');
    console.log('[DashboardLayoutManager] Dragged widget:', draggedWidget);
    console.log('[DashboardLayoutManager] Target index:', targetIndex);
    console.log('[DashboardLayoutManager] Current visible widgets:', layout.widgets.filter(w => w.visible).map(w => ({ id: w.id, row: w.row })));

    const sourceWidget = layout.widgets.find(w => w.id === draggedWidget);
    console.log('[DashboardLayoutManager] Source widget found:', sourceWidget);
    
    if (!sourceWidget || !sourceWidget.visible) {
      // Dragging from sidebar - add new widget
      console.log('[DashboardLayoutManager] Adding new widget from sidebar:', draggedWidget);
      const widgetConfig = WIDGET_CATALOG[draggedWidget];
      
      const newWidget: WidgetLayout = {
        id: draggedWidget,
        col: 0,
        row: targetIndex,
        width: widgetConfig.defaultSize === 'full' ? 12 : 6,
        visible: true,
      };

      console.log('[DashboardLayoutManager] New widget config:', newWidget);

      // Get current visible widgets and update rows
      const visibleWidgets = layout.widgets.filter(w => w.visible);
      
      // Update rows for widgets at or after insertion point
      const updatedVisible = visibleWidgets.map(w => {
        if (w.row >= targetIndex) {
          return { ...w, row: w.row + 1 };
        }
        return w;
      });

      // Insert new widget at target index
      updatedVisible.splice(targetIndex, 0, newWidget);

      // Renumber all rows to be sequential
      const reorderedVisible = updatedVisible.map((w, index) => ({
        ...w,
        row: index,
        col: 0,
      }));

      // Get all widgets (including hidden ones) and update the one we just added
      const allWidgets = layout.widgets.map(w => {
        if (w.id === draggedWidget) {
          return newWidget;
        }
        return w;
      });

      // Merge visible (reordered) with hidden widgets
      const hiddenWidgets = allWidgets.filter(w => !w.visible && w.id !== draggedWidget);
      const finalWidgets = [...reorderedVisible, ...hiddenWidgets];

      console.log('[DashboardLayoutManager] Final widgets after add:', finalWidgets.filter(w => w.visible).map(w => ({ id: w.id, row: w.row })));
      onLayoutChange({ ...layout, widgets: finalWidgets });
    } else {
      // Reordering within dashboard
      console.log('[DashboardLayoutManager] Reordering widget:', draggedWidget);
      const visibleWidgets = layout.widgets.filter(w => w.visible);
      const sourceIndex = visibleWidgets.findIndex(w => w.id === draggedWidget);
      
      console.log('[DashboardLayoutManager] Source index:', sourceIndex, 'Target index:', targetIndex);
      
      if (sourceIndex === -1) {
        console.log('[DashboardLayoutManager] Error: source widget not found in visible widgets');
        return;
      }
      
      if (sourceIndex === targetIndex) {
        console.log('[DashboardLayoutManager] No reorder needed - same position');
        return;
      }

      // Reorder widgets
      const reordered = [...visibleWidgets];
      const [removed] = reordered.splice(sourceIndex, 1);
      
      // Adjust target index if we're moving down
      const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
      console.log('[DashboardLayoutManager] Adjusted target index:', adjustedTargetIndex);
      
      reordered.splice(adjustedTargetIndex, 0, removed);

      // Update row numbers
      const updatedVisible = reordered.map((w, index) => ({
        ...w,
        row: index,
        col: 0,
      }));

      // Merge with hidden widgets
      const hiddenWidgets = layout.widgets.filter(w => !w.visible);
      
      console.log('[DashboardLayoutManager] Final widgets after reorder:', updatedVisible.map(w => ({ id: w.id, row: w.row })));
      onLayoutChange({
        ...layout,
        widgets: [...updatedVisible, ...hiddenWidgets],
      });
    }

    setDraggedWidget(null);
    console.log('[DashboardLayoutManager] ====== DROP COMPLETE ======');
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
    setDragOverIndex(null);
  };

  const handleRemoveWidget = (widgetId: WidgetId) => {
    console.log('[DashboardLayoutManager] Removing widget:', widgetId);
    const visibleWidgets = layout.widgets.filter(w => w.visible && w.id !== widgetId);
    
    // Reorder remaining widgets
    const updatedVisible = visibleWidgets.map((w, index) => ({
      ...w,
      row: index,
      col: 0,
    }));

    // Mark removed widget as not visible
    const removedWidget = layout.widgets.find(w => w.id === widgetId);
    const hiddenWidgets = layout.widgets.filter(w => !w.visible);
    
    if (removedWidget) {
      hiddenWidgets.push({ ...removedWidget, visible: false });
    }

    console.log('[DashboardLayoutManager] After removal, visible:', updatedVisible, 'hidden:', hiddenWidgets);
    onLayoutChange({
      ...layout,
      widgets: [...updatedVisible, ...hiddenWidgets],
    });
  };

  const handleToggleWidth = (widgetId: WidgetId) => {
    const config = WIDGET_CATALOG[widgetId];
    
    // Check if widget is locked
    if (config.locked) {
      console.log('[DashboardLayoutManager] Width toggle blocked: widget is locked', widgetId);
      return;
    }

    console.log('[DashboardLayoutManager] Toggling width for:', widgetId);
    onLayoutChange({
      ...layout,
      widgets: layout.widgets.map(w =>
        w.id === widgetId ? { ...w, width: w.width === 12 ? 6 : 12 } : w
      ),
    });
  };

  const handleExport = () => {
    const xml = exportLayoutToXML(layout);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-layout-${new Date().toISOString().split('T')[0]}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const xml = e.target?.result as string;
        const importedLayout = importLayoutFromXML(xml);
        
        if (importedLayout) {
          onLayoutChange(importedLayout);
        } else {
          alert('Failed to import layout. Please check the file format.');
        }
      } catch (error) {
        console.error('Error importing layout:', error);
        alert('Failed to import layout. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const visibleWidgets = layout.widgets
    .filter(w => w.visible)
    .sort((a, b) => a.row - b.row);

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-100">
      {/* Main Edit Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Customize Dashboard</h2>
            <p className="text-sm text-slate-600 mt-1">
              Drag widgets from the right sidebar to add them. Drag to reorder.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            {onResetToDefault && (
              <button
                onClick={onResetToDefault}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
                title="Reset to role-based default layout"
              >
                <RotateCcw className="w-4 h-4" />
                Default
              </button>
            )}
            <label className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              Import
              <input
                type="file"
                accept=".xml"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Save Layout
            </button>
          </div>
        </div>

        {/* Dashboard Grid Preview */}
        <div className="p-6 min-h-screen">
          <div className="space-y-4">
            {visibleWidgets.length === 0 && (
              <div className="text-center py-12">
                <Settings className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No widgets on dashboard. Drag widgets from the right sidebar to add them.</p>
              </div>
            )}
            
            {visibleWidgets.map((widget, index) => {
              const config = WIDGET_CATALOG[widget.id];
              const isDragging = draggedWidget === widget.id;
              const isDropTarget = dragOverIndex === index;

              return (
                <div key={widget.id} className="relative">
                  {/* Drop zone before widget */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[DashboardLayoutManager] Drag over DROP ZONE before widget:', widget.id, 'index:', index);
                      handleDragOver(e, index);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[DashboardLayoutManager] Drag enter DROP ZONE before widget:', widget.id, 'index:', index);
                    }}
                    onDrop={(e) => {
                      console.log('[DashboardLayoutManager] DROP on zone before widget:', widget.id, 'index:', index);
                      handleDrop(e, index);
                    }}
                    className={`h-20 border-2 border-dashed rounded-lg mb-4 flex items-center justify-center text-sm font-medium transition-all cursor-pointer ${
                      isDropTarget && draggedWidget !== widget.id
                        ? 'bg-blue-100 border-blue-400 text-blue-600'
                        : draggedWidget ? 'border-slate-300 hover:border-blue-300 hover:bg-blue-50 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-400'
                    }`}
                  >
                    {isDropTarget && draggedWidget !== widget.id ? (
                      <span className="font-semibold">⬇ Drop here ⬇</span>
                    ) : draggedWidget ? (
                      <span>Drop before {config.title}</span>
                    ) : (
                      <span className="text-xs">Drop zone</span>
                    )}
                  </div>

                  <div
                    draggable
                    onDragStart={(e) => {
                      console.log('[DashboardLayoutManager] Widget drag start:', widget.id, 'index:', index);
                      handleDragStart(widget.id, 'dashboard');
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[DashboardLayoutManager] Drop on widget body ignored:', widget.id);
                    }}
                    onDragEnd={handleDragEnd}
                    className={`bg-white rounded-lg border-2 transition-all ${
                      isDragging
                        ? 'border-blue-500 shadow-xl opacity-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    style={{
                      width: widget.width === 12 ? '100%' : '50%',
                    }}
                  >
                    {/* Widget Header */}
                    <div 
                      className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 cursor-move"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDragEnter={handleDragEnter}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-slate-400 hover:text-slate-600">
                          <GripVertical className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">{config.title}</h3>
                          <p className="text-xs text-slate-600">{config.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!config.locked && (
                          <button
                            onClick={() => handleToggleWidth(widget.id)}
                            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                            title={widget.width === 12 ? 'Make half width' : 'Make full width'}
                          >
                            {widget.width === 12 ? (
                              <Minimize2 className="w-4 h-4" />
                            ) : (
                              <Maximize2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        {config.locked && (
                          <div className="px-2 py-1 text-xs bg-slate-200 text-slate-600 rounded" title="Width is locked for this widget">
                            {widget.width === 12 ? 'Full Width' : 'Half Width'}
                          </div>
                        )}
                        <button
                          onClick={() => handleRemoveWidget(widget.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                          title="Remove widget"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {/* Widget Preview */}
                    <div 
                      className="p-6 h-48 flex items-center justify-center text-slate-400 bg-slate-50"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDragEnter={handleDragEnter}
                    >
                      <div className="text-center">
                        <Settings className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">{config.title}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Final drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[DashboardLayoutManager] Drag over FINAL DROP ZONE, index:', visibleWidgets.length);
                handleDragOver(e, visibleWidgets.length);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[DashboardLayoutManager] Drag enter FINAL DROP ZONE');
              }}
              onDrop={(e) => {
                console.log('[DashboardLayoutManager] DROP on FINAL zone, index:', visibleWidgets.length);
                handleDrop(e, visibleWidgets.length);
              }}
              className={`h-24 border-2 border-dashed rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                dragOverIndex === visibleWidgets.length
                  ? 'bg-blue-100 border-blue-400 text-blue-600'
                  : draggedWidget ? 'border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-500' : 'border-slate-300 bg-slate-50 text-slate-400'
              }`}
            >
              <p className="text-sm font-medium">
                {dragOverIndex === visibleWidgets.length ? '⬇ Drop here ⬇' : draggedWidget ? 'Drop at end' : 'Drag widgets here'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Widget Catalog */}
      <div className="w-80 bg-white border-l border-slate-200 overflow-y-auto shadow-xl">
        <div className="p-6 border-b border-slate-200 bg-slate-50 sticky top-0">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Available Widgets
          </h3>
          <p className="text-sm text-slate-600 mt-1">Drag to add to dashboard</p>
        </div>
        <div className="p-4 space-y-3">
          {availableWidgets.map((widgetId) => {
            const config = WIDGET_CATALOG[widgetId];
            const isDragging = draggedWidget === widgetId;

            return (
              <div
                key={widgetId}
                draggable
                onDragStart={() => {
                  console.log('[DashboardLayoutManager] Sidebar widget drag start:', widgetId);
                  handleDragStart(widgetId, 'sidebar');
                }}
                onDragEnd={handleDragEnd}
                className={`p-4 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50 shadow-lg opacity-50'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow'
                }`}
              >
                <h4 className="font-medium text-slate-900 text-sm mb-1">
                  {config.title}
                </h4>
                <p className="text-xs text-slate-600 mb-2">{config.description}</p>
                <div>
                  <span className="inline-block px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded">
                    {config.defaultSize === 'full' ? 'Full Width' : 'Half Width'}
                  </span>
                </div>
              </div>
            );
          })}
          {availableWidgets.length === 0 && (
            <div className="text-center py-8">
              <Settings className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-500">All widgets are added to the dashboard</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
