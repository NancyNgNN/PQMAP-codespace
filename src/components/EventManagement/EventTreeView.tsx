import React from 'react';
import { ChevronDown, ChevronRight, GitBranch, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { EventTreeNode } from '../../types/eventTypes';

interface EventTreeViewProps {
  treeData: EventTreeNode[];
  selectedEventId?: string;
  onEventSelect: (event: any) => void;
  onGroupEvents: (eventIds: string[]) => void;
  onUngroupEvents: (parentEventId: string) => void;
}

export default function EventTreeView({ 
  treeData, 
  selectedEventId, 
  onEventSelect, 
  onGroupEvents, 
  onUngroupEvents 
}: EventTreeViewProps) {
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set());
  const [selectedEvents, setSelectedEvents] = React.useState<Set<string>>(new Set());

  const toggleExpanded = (eventId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedNodes(newExpanded);
  };

  const toggleEventSelection = (eventId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      newSelected.add(eventId);
    }
    setSelectedEvents(newSelected);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDuration = (durationMs: number) => {
    if (durationMs < 1000) return `${durationMs}ms`;
    if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
    return `${(durationMs / 60000).toFixed(1)}m`;
  };

  const renderTreeNode = (node: EventTreeNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedEventId === node.id;
    const isChecked = selectedEvents.has(node.id);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} className="select-none">
        {/* Event Row */}
        <div
          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all hover:bg-slate-50 ${
            isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200'
          }`}
          style={{ marginLeft: `${level * 20}px` }}
          onClick={() => onEventSelect(node.event)}
        >
          {/* Expand/Collapse Button */}
          <div className="w-6 flex justify-center">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(node.id);
                }}
                className="p-1 hover:bg-slate-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Selection Checkbox */}
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => toggleEventSelection(node.id, e)}
            className="mr-3"
          />

          {/* Event Icon */}
          <div className="mr-3">
            {node.event.is_mother_event ? (
              <GitBranch className="w-5 h-5 text-purple-600" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-slate-300"></div>
            )}
          </div>

          {/* Event Details */}
          <div className="flex-1 grid grid-cols-6 gap-4 items-center text-sm">
            {/* Timestamp */}
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{new Date(node.event.timestamp).toLocaleString()}</span>
            </div>

            {/* Type & Severity */}
            <div className="flex items-center gap-2">
              <span className="capitalize font-medium">
                {node.event.event_type.replace('_', ' ')}
              </span>
              <span className={`px-2 py-1 text-xs rounded border ${getSeverityColor(node.event.severity)}`}>
                {node.event.severity.toUpperCase()}
              </span>
            </div>

            {/* Location */}
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>{node.event.circuit_id}</span>
            </div>

            {/* Duration */}
            <div>
              {formatDuration(node.event.duration_ms)}
            </div>

            {/* Magnitude */}
            <div>
              {node.event.magnitude?.toFixed(1)}
              {node.event.event_type.includes('voltage') ? '%' : ''}
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              {!node.event.validated_by_adms && (
                <AlertTriangle className="w-4 h-4 text-yellow-500" title="Not validated by ADMS" />
              )}
              <span className={`px-2 py-1 text-xs rounded ${
                node.event.status === 'resolved' ? 'bg-green-100 text-green-800' :
                node.event.status === 'investigating' ? 'bg-blue-100 text-blue-800' :
                node.event.status === 'acknowledged' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {node.event.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Child Events */}
        {hasChildren && isExpanded && (
          <div className="mt-2 space-y-2">
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-2 p-4 bg-slate-50 rounded-lg">
        <button
          onClick={() => onGroupEvents(Array.from(selectedEvents))}
          disabled={selectedEvents.size < 2}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Group Selected Events
        </button>
        <button
          onClick={() => {
            selectedEvents.forEach(eventId => {
              const node = findNodeInTree(treeData, eventId);
              if (node?.event.is_mother_event) {
                onUngroupEvents(eventId);
              }
            });
          }}
          disabled={selectedEvents.size === 0}
          className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Ungroup Selected
        </button>
        <div className="ml-auto text-sm text-slate-600">
          {selectedEvents.size} events selected
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-6 gap-4 px-12 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide border-b">
        <div>Timestamp</div>
        <div>Type & Severity</div>
        <div>Location</div>
        <div>Duration</div>
        <div>Magnitude</div>
        <div>Status</div>
      </div>

      {/* Tree View */}
      <div className="space-y-2">
        {treeData.map(node => renderTreeNode(node))}
      </div>
    </div>
  );
}

// Helper function to find node in tree
function findNodeInTree(nodes: EventTreeNode[], eventId: string): EventTreeNode | null {
  for (const node of nodes) {
    if (node.id === eventId) {
      return node;
    }
    const found = findNodeInTree(node.children, eventId);
    if (found) return found;
  }
  return null;
}