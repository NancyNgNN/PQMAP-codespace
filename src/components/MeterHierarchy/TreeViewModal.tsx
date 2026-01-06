import React, { useState, useMemo } from 'react';
import { X, ChevronRight, ChevronDown, Search, Network } from 'lucide-react';
import type { PQMeter } from '../../types/database';
import { buildMeterHierarchyTree, type MeterTreeNode } from '../../services/meterHierarchyService';

interface TreeViewModalProps {
  meters: PQMeter[];
  onClose: () => void;
}

const TreeViewModal: React.FC<TreeViewModalProps> = ({ meters, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);

  // Build tree structure
  const treeData = useMemo(() => {
    return buildMeterHierarchyTree(meters);
  }, [meters]);

  // Filter tree based on search
  const filteredTree = useMemo(() => {
    if (!searchTerm.trim()) return treeData;

    const searchLower = searchTerm.toLowerCase();
    
    const filterNode = (node: MeterTreeNode): MeterTreeNode | null => {
      const matchesSearch = 
        node.meter.meter_id.toLowerCase().includes(searchLower) ||
        node.meter.area?.toLowerCase().includes(searchLower) ||
        node.meter.voltage_level?.toLowerCase().includes(searchLower);

      const filteredChildren = node.children
        .map(child => filterNode(child))
        .filter((child): child is MeterTreeNode => child !== null);

      if (matchesSearch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    };

    return treeData
      .map(node => filterNode(node))
      .filter((node): node is MeterTreeNode => node !== null);
  }, [treeData, searchTerm]);

  // Auto-expand when searching
  React.useEffect(() => {
    if (searchTerm.trim()) {
      const allIds = new Set<string>();
      const collectIds = (nodes: MeterTreeNode[]) => {
        nodes.forEach(node => {
          allIds.add(node.id);
          collectIds(node.children);
        });
      };
      collectIds(filteredTree);
      setExpandedNodes(allIds);
    }
  }, [searchTerm, filteredTree]);

  // Handle expand/collapse all
  const handleExpandAll = () => {
    if (expandAll) {
      setExpandedNodes(new Set());
    } else {
      const allIds = new Set<string>();
      const collectIds = (nodes: MeterTreeNode[]) => {
        nodes.forEach(node => {
          allIds.add(node.id);
          collectIds(node.children);
        });
      };
      collectIds(treeData);
      setExpandedNodes(allIds);
    }
    setExpandAll(!expandAll);
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const isExpanded = (nodeId: string) => expandedNodes.has(nodeId);

  // Get color based on level
  const getLevelColor = (level: number): { bg: string; text: string; border: string } => {
    switch (level) {
      case 0: // SS400
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-300',
        };
      case 1: // SS132
        return {
          bg: 'bg-purple-50',
          text: 'text-purple-700',
          border: 'border-purple-300',
        };
      case 2: // SS011
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-300',
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-300',
        };
    }
  };

  // Render tree node
  const renderNode = (node: MeterTreeNode, level: number = 0) => {
    const hasChildren = node.children.length > 0;
    const expanded = isExpanded(node.id);
    const colors = getLevelColor(level);
    const isHighlighted = searchTerm.trim() && 
      (node.meter.meter_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
       node.meter.area?.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
      <div key={node.id} className="ml-6 first:ml-0">
        {/* Node */}
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg border ${colors.bg} ${colors.border} ${
            isHighlighted ? 'ring-2 ring-yellow-400' : ''
          } transition-all`}
        >
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              onClick={() => toggleNode(node.id)}
              className={`p-0.5 hover:bg-white rounded transition-colors ${colors.text}`}
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          
          {/* Node Content */}
          <div className="flex items-center gap-4 flex-1">
            <div className={`flex items-center gap-2 ${colors.text} font-medium`}>
              <Network className="w-4 h-4" />
              <span>{node.meter.meter_id}</span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="font-medium">{node.meter.voltage_level}</span>
              {node.meter.area && (
                <span className="px-2 py-0.5 bg-white rounded border border-gray-200">
                  {node.meter.area}
                </span>
              )}
              {node.meter.status && (
                <span className={`px-2 py-0.5 rounded text-xs ${
                  node.meter.status === 'active' 
                    ? 'bg-green-100 text-green-700'
                    : node.meter.status === 'abnormal'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {node.meter.status}
                </span>
              )}
              {hasChildren && (
                <span className="text-xs text-gray-500">
                  ({node.children.length} {node.children.length === 1 ? 'child' : 'children'})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Children */}
        {hasChildren && expanded && (
          <div className="mt-2 ml-6 border-l-2 border-gray-200 pl-4">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Statistics
  const stats = useMemo(() => {
    let total = 0;
    let ss400Count = 0;
    let ss132Count = 0;
    let ss011Count = 0;

    const countNodes = (nodes: MeterTreeNode[], level: number = 0) => {
      nodes.forEach(node => {
        total++;
        if (level === 0) ss400Count++;
        else if (level === 1) ss132Count++;
        else if (level === 2) ss011Count++;
        countNodes(node.children, level + 1);
      });
    };

    countNodes(treeData);

    return { total, ss400Count, ss132Count, ss011Count };
  }, [treeData]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full h-[90vh] max-w-7xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Meter Hierarchy Tree View</h2>
            <p className="text-sm text-gray-500 mt-1">
              Visualizing {stats.total} meters across {stats.ss400Count} root nodes
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by meter ID, area, or voltage level..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Expand/Collapse All */}
            <button
              onClick={handleExpandAll}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {expandAll ? 'Collapse All' : 'Expand All'}
            </button>
          </div>

          {/* Statistics */}
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-700">
                SS400: <span className="font-semibold">{stats.ss400Count}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-purple-700">
                SS132: <span className="font-semibold">{stats.ss132Count}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-700">
                SS011: <span className="font-semibold">{stats.ss011Count}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredTree.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Network className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">
                {searchTerm.trim() ? 'No meters found matching your search' : 'No meter hierarchy data available'}
              </p>
              {searchTerm.trim() && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTree.map(node => renderNode(node))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {searchTerm.trim() ? (
              <span>
                Showing {filteredTree.length} of {treeData.length} root nodes
              </span>
            ) : (
              <span>
                Displaying complete meter hierarchy with {stats.total} total meters
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TreeViewModal;
