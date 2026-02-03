import { ComponentType } from 'react';

// Widget identifiers
export type WidgetId = 
  | 'stats-cards'
  | 'substation-map'
  | 'meter-map'
  | 'sarfi-chart'
  | 'root-cause-chart'
  | 'insight-chart'
  | 'affected-customer-chart'
  | 'affected-equipment-chart'
  | 'event-list'
  | 'sarfi-70-monitor';

// Widget size options
export type WidgetSize = 'full' | 'half'; // 12 cols or 6 cols

// Widget configuration in catalog
export interface WidgetConfig {
  id: WidgetId;
  title: string;
  description: string;
  defaultSize: WidgetSize;
  locked?: boolean; // If true, width cannot be changed
  icon?: string;
  component?: ComponentType<any>;
  settings?: Record<string, any>;
}

// Widget instance in layout
export interface WidgetLayout {
  id: WidgetId;
  col: number;
  row: number;
  width: number; // 6 or 12 for half or full width
  visible: boolean;
  settings?: Record<string, any>;
}

// Complete dashboard layout
export interface DashboardLayout {
  version: string;
  widgets: WidgetLayout[];
}

// Widget catalog - defines all available widgets
export const WIDGET_CATALOG: Record<WidgetId, WidgetConfig> = {
  'stats-cards': {
    id: 'stats-cards',
    title: 'Statistics Cards',
    description: 'Overview statistics: total events, critical events, active substations',
    defaultSize: 'full',
    locked: true,
  },
  'substation-map': {
    id: 'substation-map',
    title: 'Substation Map',
    description: 'Geographic visualization of substations with incident counts',
    defaultSize: 'full',
    locked: true,
  },
  'meter-map': {
    id: 'meter-map',
    title: 'Meter Map',
    description: 'Geographic visualization of PQ meters by load type',
    defaultSize: 'full',
    locked: true,
  },
  'sarfi-chart': {
    id: 'sarfi-chart',
    title: 'SARFI Chart',
    description: 'SARFI-70/80/90 trends with integrated data table',
    defaultSize: 'full',
    locked: true,
  },
  'root-cause-chart': {
    id: 'root-cause-chart',
    title: 'Root Cause Analysis',
    description: 'Top 10 causes of power quality events',
    defaultSize: 'half',
    locked: true,
  },
  'insight-chart': {
    id: 'insight-chart',
    title: 'Insights & Trends',
    description: 'Voltage dip trends and high-incident substations',
    defaultSize: 'half',
    locked: true,
  },
  'affected-customer-chart': {
    id: 'affected-customer-chart',
    title: 'Affected Customers',
    description: 'Customer impact visualization',
    defaultSize: 'full',
    locked: true,
  },
  'affected-equipment-chart': {
    id: 'affected-equipment-chart',
    title: 'Affected Equipment',
    description: 'Equipment failure analysis by type',
    defaultSize: 'half',
    locked: true,
  },
  'event-list': {
    id: 'event-list',
    title: 'Recent Events',
    description: 'Latest power quality events',
    defaultSize: 'full',
    locked: true,
  },
  'sarfi-70-monitor': {
    id: 'sarfi-70-monitor',
    title: 'SARFI-70 KPI Monitor',
    description: '3-year trend comparison with monthly breakdown',
    defaultSize: 'full',
    locked: true,
  },
};

// Default layouts by role
export const DEFAULT_LAYOUTS: Record<string, DashboardLayout> = {
  admin: {
    version: '1.0',
    widgets: [
      { id: 'stats-cards', col: 0, row: 0, width: 12, visible: true },
      { id: 'substation-map', col: 0, row: 1, width: 12, visible: true },
      { id: 'meter-map', col: 0, row: 2, width: 12, visible: true },
      { id: 'sarfi-chart', col: 0, row: 3, width: 12, visible: true },
      { id: 'root-cause-chart', col: 0, row: 4, width: 6, visible: true },
      { id: 'insight-chart', col: 6, row: 4, width: 6, visible: true },
      { id: 'affected-customer-chart', col: 0, row: 5, width: 12, visible: true },
      { id: 'affected-equipment-chart', col: 0, row: 6, width: 6, visible: true },
      { id: 'event-list', col: 0, row: 7, width: 12, visible: true },
      { id: 'sarfi-70-monitor', col: 0, row: 8, width: 12, visible: true },
    ],
  },
  operator: {
    version: '1.0',
    widgets: [
      { id: 'stats-cards', col: 0, row: 0, width: 12, visible: true },
      { id: 'substation-map', col: 0, row: 1, width: 12, visible: true },
      { id: 'meter-map', col: 0, row: 2, width: 12, visible: true },
      { id: 'sarfi-chart', col: 0, row: 3, width: 12, visible: true },
      { id: 'root-cause-chart', col: 0, row: 4, width: 6, visible: true },
      { id: 'insight-chart', col: 6, row: 4, width: 6, visible: true },
      { id: 'affected-customer-chart', col: 0, row: 5, width: 12, visible: true },
      { id: 'affected-equipment-chart', col: 0, row: 6, width: 6, visible: true },
      { id: 'event-list', col: 0, row: 7, width: 12, visible: true },
      { id: 'sarfi-70-monitor', col: 0, row: 8, width: 12, visible: false },
    ],
  },
  viewer: {
    version: '1.0',
    widgets: [
      { id: 'stats-cards', col: 0, row: 0, width: 12, visible: false },
      { id: 'substation-map', col: 0, row: 1, width: 12, visible: false },
      { id: 'meter-map', col: 0, row: 2, width: 12, visible: true },
      { id: 'sarfi-chart', col: 0, row: 3, width: 12, visible: false },
      { id: 'root-cause-chart', col: 0, row: 4, width: 6, visible: false },
      { id: 'insight-chart', col: 6, row: 4, width: 6, visible: false },
      { id: 'affected-customer-chart', col: 0, row: 5, width: 12, visible: true },
      { id: 'affected-equipment-chart', col: 0, row: 6, width: 6, visible: false },
      { id: 'event-list', col: 0, row: 7, width: 12, visible: true },
      { id: 'sarfi-70-monitor', col: 0, row: 8, width: 12, visible: false },
    ],
  },
};

// Utility functions
export const getWidgetConfig = (id: WidgetId): WidgetConfig => {
  return WIDGET_CATALOG[id];
};

export const getDefaultLayoutForRole = (role: string): DashboardLayout => {
  return DEFAULT_LAYOUTS[role] || DEFAULT_LAYOUTS.admin;
};

export const validateLayout = (layout: DashboardLayout): boolean => {
  if (!layout || !layout.version || !Array.isArray(layout.widgets)) {
    return false;
  }

  // Check all widget IDs are valid
  return layout.widgets.every(w => 
    Object.keys(WIDGET_CATALOG).includes(w.id) &&
    typeof w.row === 'number' &&
    typeof w.col === 'number' &&
    (w.width === 6 || w.width === 12) &&
    typeof w.visible === 'boolean'
  );
};

export const exportLayoutToXML = (layout: DashboardLayout): string => {
  const widgets = layout.widgets
    .map(w => {
      const settingsXml = w.settings 
        ? `>\n    <settings>${JSON.stringify(w.settings)}</settings>\n  </widget>`
        : ' />';
      
      return `  <widget id="${w.id}" col="${w.col}" row="${w.row}" width="${w.width}" visible="${w.visible}"${settingsXml}`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<dashboard version="${layout.version}">
${widgets}
</dashboard>`;
};

export const importLayoutFromXML = (xml: string): DashboardLayout | null => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    
    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      console.error('XML parsing error:', parserError.textContent);
      return null;
    }

    const version = doc.documentElement.getAttribute('version') || '1.0';
    const widgetElements = doc.querySelectorAll('widget');
    
    const widgets: WidgetLayout[] = Array.from(widgetElements).map(el => {
      const settingsEl = el.querySelector('settings');
      return {
        id: el.getAttribute('id') as WidgetId,
        col: parseInt(el.getAttribute('col') || '0'),
        row: parseInt(el.getAttribute('row') || '0'),
        width: parseInt(el.getAttribute('width') || '12'),
        visible: el.getAttribute('visible') === 'true',
        settings: settingsEl ? JSON.parse(settingsEl.textContent || '{}') : undefined,
      };
    });

    const layout: DashboardLayout = { version, widgets };
    
    // Validate before returning
    if (!validateLayout(layout)) {
      console.error('Invalid layout structure');
      return null;
    }

    return layout;
  } catch (error) {
    console.error('Error importing layout from XML:', error);
    return null;
  }
};
