import { useState, useEffect } from 'react';
import { Settings, Plus, Download, Upload, X, GripVertical, Maximize2, Minimize2 } from 'lucide-react';
import { WidgetLayout, DashboardLayout, WIDGET_CATALOG, WidgetId, exportLayoutToXML, importLayoutFromXML } from '../../types/dashboard';

interface DashboardLayoutManagerProps {
  layout: DashboardLayout;
  onLayoutChange: (layout: DashboardLayout) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function DashboardLayoutManager({
  layout,
  onLayoutChange,
  onSave,
  onCancel,
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
  }, [layout]);

  const handleDragStart = (widgetId: WidgetId, source: 'sidebar' | 'dashboard') => {
    setDraggedWidget(widgetId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedWidget) return;

    const sourceWidget = layout.widgets.find(w => w.id === draggedWidget);
    
    if (!sourceWidget) {
      // Dragging from sidebar - add new widget
      const widgetConfig = WIDGET_CATALOG[draggedWidget];
      const visibleWidgets = layout.widgets.filter(w => w.visible);
      
      const newWidget: WidgetLayout = {
        id: draggedWidget,
        col: 0,
        row: targetIndex,
        width: widgetConfig.defaultSize === 'full' ? 12 : 6,
        visible: true,
      };

      // Update rows for widgets after insertion point
      const updatedWidgets = layout.widgets.map(w => {
        if (w.visible && w.row >= targetIndex) {
          return { ...w, row: w.row + 1 };
        }
        return w;
      });

      // Add the new widget
      const widgetIndex = updatedWidgets.findIndex(w => w.id === draggedWidget);
      if (widgetIndex !== -1) {
        updatedWidgets[widgetIndex] = newWidget;
      } else {
        updatedWidgets.push(newWidget);
      }

      onLayoutChange({ ...layout, widgets: updatedWidgets });
    } else if (sourceWidget.visible) {
      // Reordering within dashboard
      const visibleWidgets = layout.widgets.filter(w => w.visible);
      const sourceIndex = visibleWidgets.findIndex(w => w.id === draggedWidget);
      
      if (sourceIndex === -1 || sourceIndex === targetIndex) return;

      // Reorder widgets
      const reordered = [...visibleWidgets];
      const [removed] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, removed);

      // Update row numbers
      const updatedVisible = reordered.map((w, index) => ({
        ...w,
        row: index,
        col: 0,
      }));

      // Merge with hidden widgets
      const hiddenWidgets = layout.widgets.filter(w => !w.visible);
      
      onLayoutChange({
        ...layout,
        widgets: [...updatedVisible, ...hiddenWidgets],
      });
    }

    setDraggedWidget(null);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
    setDragOverIndex(null);
  };

  const handleRemoveWidget = (widgetId: WidgetId) => {
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

    onLayoutChange({
      ...layout,
      widgets: [...updatedVisible, ...hiddenWidgets],
    });
  };

  const handleToggleWidth = (widgetId: WidgetId) => {
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
            {visibleWidgets.map((widget, index) => {
              const config = WIDGET_CATALOG[widget.id];
              const isDragging = draggedWidget === widget.id;
              const isDropTarget = dragOverIndex === index;

              return (
                <div key={widget.id}>
                  {/* Drop zone before widget */}
                  {isDropTarget && draggedWidget !== widget.id && (
                    <div className="h-24 bg-blue-100 border-2 border-dashed border-blue-400 rounded-lg mb-4 flex items-center justify-center text-blue-600 text-sm font-medium">
                      Drop here
                    </div>
                  )}

                  <div
                    draggable
                    onDragStart={() => handleDragStart(widget.id, 'dashboard')}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white rounded-lg border-2 transition-all ${
                      isDragging
                        ? 'border-blue-500 shadow-xl opacity-50'
                        : 'border-slate-200'
                    }`}
                    style={{
                      width: widget.width === 12 ? '100%' : '50%',
                    }}
                  >
                    {/* Widget Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 cursor-move">
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
                    <div className="p-6 h-48 flex items-center justify-center text-slate-400 bg-slate-50">
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
              onDragOver={(e) => handleDragOver(e, visibleWidgets.length)}
              onDrop={(e) => handleDrop(e, visibleWidgets.length)}
              className={`h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-slate-400 transition-all ${
                dragOverIndex === visibleWidgets.length
                  ? 'bg-blue-100 border-blue-400 text-blue-600'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <p className="text-sm font-medium">
                {dragOverIndex === visibleWidgets.length ? 'Drop here' : 'Drag widgets here'}
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
                onDragStart={() => handleDragStart(widgetId, 'sidebar')}
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
