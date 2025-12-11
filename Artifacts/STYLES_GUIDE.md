# PQMAP Styles Guide

**Version:** 1.0  
**Last Updated:** December 10, 2025  
**Purpose:** Document reusable UI patterns, export utilities, and design standards for PQMAP application

---

## Table of Contents

1. [Export Functionality](#export-functionality)
2. [Button Patterns](#button-patterns)
3. [Dropdown Patterns](#dropdown-patterns)
4. [Icon Usage](#icon-usage)
5. [Color Scheme](#color-scheme)
6. [Spacing & Layout](#spacing--layout)
7. [Animation Standards](#animation-standards)

---

## Export Functionality

### Export Service

Location: `src/services/exportService.ts`

The export service provides reusable functions for exporting data to Excel, CSV, and PDF formats with standardized formatting matching the Mother Event List.csv structure (44 columns).

#### Key Features

- **44-Column Format**: Matches Mother Event List.csv specification
- **Auto-Populate V1/V2/V3**: Extracts voltage values from waveform data if not in database
- **SARFI Indices**: Supports 9 SARFI columns (sarfi_10 through sarfi_90)
- **False Event Logic**: Uses `false_event` boolean field from database
- **Waveform Capture**: Optional image capture for PDF/Excel exports

#### Usage Example

```typescript
import { ExportService } from '../../services/exportService';

// Export to Excel
await ExportService.exportToExcel(
  events,                    // PQEvent[]
  substationsMap,            // Map<string, Substation>
  'Custom_Filename.xlsx'     // Optional filename
);

// Export to CSV
await ExportService.exportToCSV(events, substationsMap);

// Export to PDF with waveform images
await ExportService.exportToPDF(
  events,
  substationsMap,
  'Report.pdf',
  true  // includeWaveform
);
```

#### Export Row Structure

All exports follow the `ExportRow` interface with 44 fields:

```typescript
interface ExportRow {
  // Core (10 fields)
  motherEvent, falseEvent, timestamp, siteId, name, voltLevel, ss, circuit, region, oc
  
  // Duration & Voltage (4 fields)
  duration, v1, v2, v3
  
  // Customer Impact (1 field)
  customerCount
  
  // SARFI Indices (9 fields)
  s10, s20, s30, s40, s50, s60, s70, s80, s90
  
  // IDs & References (3 fields)
  eventId, groupId, remarks
  
  // Incident Report (1 field)
  idrNo
  
  // Timestamps (4 fields)
  detectTime, recoverTime, createTime, updateTime
  
  // Location (1 field)
  address
  
  // Outage Details (3 fields)
  equipmentType, causeGroup, cause
  
  // Fault Details (4 fields)
  objectPartGroup, objectPartCode, damageGroup, damageCode
  
  // Additional (4 fields)
  outageType, weather, totalCmi, description, auto
}
```

---

## Button Patterns

### Export Button

**Standard Implementation (Icon-only):**

```tsx
<div className="relative export-dropdown-container">
  <button
    onClick={() => setShowExportDropdown(!showExportDropdown)}
    disabled={isExporting}
    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
    title="Export Events"
  >
    <Download className="w-5 h-5" />
  </button>
</div>
```

**Alternative Implementation (With Label):**

```tsx
<div className="relative export-dropdown-container">
  <button
    onClick={() => setShowExportDropdown(!showExportDropdown)}
    disabled={isExporting}
    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
    title="Export Events"
  >
    <Download className="w-4 h-4" />
    Export
  </button>
</div>
```

**Key Attributes:**
- **Icon-only style:** `p-2 text-blue-600 hover:bg-blue-50` (preferred for toolbars)
- **Button with label:** `px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white` (for prominent actions)
- Hover: `hover:bg-blue-50` (icon-only) or `hover:bg-blue-700` (with label)
- Disabled: `disabled:opacity-50` for visual feedback
- Icon: Lucide's `Download` icon at `w-5 h-5` (icon-only) or `w-4 h-4` (with label)
- Tooltip: **Always use `title` attribute** for accessibility, especially on icon-only buttons
- Transition: `transition-all` for smooth hover effects

### Action Buttons

**Delete Button:**
```tsx
<button className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
  <Trash2 className="w-5 h-5" />
</button>
```

**Ungroup Button:**
```tsx
<button className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg" title="Ungroup">
  <Ungroup className="w-5 h-5" />
</button>
```

**Edit Button:**
```tsx
<button className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg" title="Edit">
  <Edit2 className="w-5 h-5" />
</button>
```

**Settings/Config Button:**
```tsx
<button className="p-2 hover:bg-slate-100 rounded-lg" title="Configure Filters">
  <Settings2 className="w-5 h-5 text-slate-600" />
</button>
```

**Standard Pattern:**
- Size: `p-2` padding for icon-only buttons
- Icon size: `w-5 h-5` for all action buttons
- Hover: Match color with lightened background (e.g., `text-blue-600 hover:bg-blue-50`)
- Always include `title` attribute for tooltips
- Use `rounded-lg` for consistent corner radius

---

## Dropdown Patterns

### Export Dropdown Menu

**Standard Structure (Multi-format):**

```tsx
{showExportDropdown && (
  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
    <button
      onClick={() => handleExport('excel')}
      disabled={isExporting}
      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
    >
      <Download className="w-4 h-4" />
      Export to Excel
    </button>
    <button
      onClick={() => handleExport('csv')}
      disabled={isExporting}
      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
    >
      <Download className="w-4 h-4" />
      Export to CSV
    </button>
    <button
      onClick={() => handleExport('pdf')}
      disabled={isExporting}
      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
    >
      <Download className="w-4 h-4" />
      Export to PDF
    </button>
  </div>
)}
```

**Single Export Option:**

```tsx
{showExportDropdown && (
  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
    <button
      onClick={handleExportMap}
      disabled={isExporting}
      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
    >
      <Download className="w-4 h-4" />
      Export Map as Image
    </button>
  </div>
)}
```

**Styling Guidelines:**
- Container: `shadow-xl border border-slate-200 py-2 z-50` (not just `shadow-lg`)
- Buttons: Always include `flex items-center gap-2` for icon alignment
- Text color: `text-slate-700` (not `text-slate-900`) for dropdown items
- Width: `w-48` is standard, adjust as needed for longer text

### Click Outside Handler

**Always implement click-outside to close dropdowns:**

```typescript
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (showExportDropdown && !target.closest('.export-dropdown-container')) {
      setShowExportDropdown(false);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [showExportDropdown]);
```

**Key Points:**
- Use `.export-dropdown-container` class on parent div
- Listen for `mousedown` events (not `click`)
- Clean up listener in return function
- Add dropdown state to dependency array

---

## Icon Usage

### Lucide React Icons

**Import Pattern:**

```typescript
import { Download, Trash2, Edit2, Ungroup, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
```

### Standard Icon Sizes

- **Small:** `w-4 h-4` - Dropdown menu items, inline badges
- **Medium:** `w-5 h-5` - Action buttons, list icons
- **Large:** `w-6 h-6` - Section headers, prominent actions
- **XL:** `w-8 h-8` - Empty state illustrations

### Icon Color Patterns

| Action | Color Class | Example |
|--------|-------------|---------|
| Export | `text-blue-600` | Download button |
| Delete | `text-red-600` | Trash button |
| Edit | `text-slate-600` | Edit button |
| Ungroup | `text-purple-600` | Ungroup button |
| Success | `text-green-600` | CheckCircle |
| Warning | `text-yellow-500` | AlertTriangle |
| Error | `text-red-600` | XCircle |
| Info | `text-blue-500` | Info icon |

---

## Color Scheme

### Primary Colors

```css
/* Blue - Primary Actions, Export */
text-blue-600, bg-blue-50, border-blue-500, bg-blue-100

/* Red - Destructive Actions, Critical */
text-red-600, bg-red-50, bg-red-100, border-red-500

/* Purple - Mother Events, Grouping */
text-purple-600, bg-purple-50, bg-purple-100, border-purple-500

/* Green - Success, Validation */
text-green-600, bg-green-50, bg-green-100, border-green-500

/* Yellow/Orange - Warning, False Events */
text-yellow-500, text-orange-500, bg-yellow-100, bg-orange-100
```

### Neutral Colors

```css
/* Slate - General UI, Text */
text-slate-900 (headings)
text-slate-700 (body text)
text-slate-600 (secondary text)
text-slate-500 (tertiary text)
bg-slate-50 (subtle backgrounds)
bg-slate-100 (cards, panels)
border-slate-200 (borders)
```

### Severity Badge Colors

```css
.severity-critical: bg-red-100 text-red-700
.severity-high: bg-orange-100 text-orange-700
.severity-medium: bg-yellow-100 text-yellow-700
.severity-low: bg-blue-100 text-blue-700
```

---

## Spacing & Layout

### Padding Standards

```css
/* Tight spacing (forms, inline elements) */
p-1: 0.25rem (4px)
p-1.5: 0.375rem (6px)
p-2: 0.5rem (8px)

/* Standard spacing (cards, buttons) */
p-3: 0.75rem (12px)
p-4: 1rem (16px)

/* Generous spacing (sections, containers) */
p-6: 1.5rem (24px)
p-8: 2rem (32px)
```

### Gap Standards

```css
/* Element gaps */
gap-1: 0.25rem (4px) - tight inline elements
gap-2: 0.5rem (8px) - buttons, icons
gap-3: 0.75rem (12px) - card sections
gap-4: 1rem (16px) - major sections
gap-6: 1.5rem (24px) - page-level spacing
```

### Grid Layouts

**Event Management Layout (1/4 and 3/4):**
```tsx
<div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
  <div className="xl:col-span-1">
    {/* Event List - 1/4 width */}
  </div>
  <div className="xl:col-span-3">
    {/* Event Details - 3/4 width */}
  </div>
</div>
```

**Two-Column Layout:**
```tsx
<div className="grid grid-cols-2 gap-4">
  {/* Equal width columns */}
</div>
```

---

## Animation Standards

### CSS Animations

**Fade In Animation (defined in index.css):**

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}
```

**Usage:**
```tsx
<div className="animate-fadeIn">
  {/* Content that fades in on render */}
</div>
```

### Transition Classes

```css
/* Standard transitions */
transition-all
transition-colors
transition-transform

/* Duration */
duration-200 (fast)
duration-300 (standard)
duration-500 (slow)
```

**Example:**
```tsx
<button className="transition-all hover:scale-105 active:scale-95">
  Click me
</button>
```

---

## Component Examples

### Complete Export Button Implementation

```typescript
// 1. Import dependencies
import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { ExportService } from '../../services/exportService';

// 2. Add states
const [showExportDropdown, setShowExportDropdown] = useState(false);
const [isExporting, setIsExporting] = useState(false);

// 3. Add click outside handler
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (showExportDropdown && !target.closest('.export-dropdown-container')) {
      setShowExportDropdown(false);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [showExportDropdown]);

// 4. Add export handler
const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
  setIsExporting(true);
  setShowExportDropdown(false);
  
  try {
    const substationsMap = new Map<string, Substation>();
    substations.forEach(sub => substationsMap.set(sub.id, sub));
    
    switch (format) {
      case 'excel':
        await ExportService.exportToExcel(events, substationsMap);
        break;
      case 'csv':
        await ExportService.exportToCSV(events, substationsMap);
        break;
      case 'pdf':
        await ExportService.exportToPDF(events, substationsMap);
        break;
    }
  } catch (error) {
    console.error('Export error:', error);
    alert(`Failed to export as ${format.toUpperCase()}`);
  } finally {
    setIsExporting(false);
  }
};

// 5. Render UI
return (
  <div className="relative export-dropdown-container">
    <button
      onClick={() => setShowExportDropdown(!showExportDropdown)}
      disabled={isExporting}
      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
      title="Export"
    >
      <Download className="w-5 h-5" />
    </button>
    
    {showExportDropdown && (
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
        <button onClick={() => handleExport('excel')} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export to Excel
        </button>
        <button onClick={() => handleExport('csv')} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export to CSV
        </button>
        <button onClick={() => handleExport('pdf')} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export to PDF
        </button>
      </div>
    )}
  </div>
);
```

---

## Best Practices

### Export Implementation

1. **Always disable button during export**: Use `disabled={isExporting}` to prevent multiple exports
2. **Close dropdown after action**: Set `setShowExportDropdown(false)` in handler
3. **Provide user feedback**: Show loading state and success/error messages
4. **Handle errors gracefully**: Always use try-catch blocks
5. **Clean up resources**: Use `finally` to reset loading state

### Dropdown Implementation

1. **Use relative positioning**: Parent div with `relative`, dropdown with `absolute`
2. **Add container class**: Use `.export-dropdown-container` for click-outside detection
3. **Set high z-index**: Use `z-50` to ensure dropdown appears above other content
4. **Add shadow and border**: `shadow-xl border border-slate-200` for depth
5. **Clean up listeners**: Remove event listeners in useEffect return function

### Accessibility

1. **Always add title attributes**: Provides tooltips for icon-only buttons
2. **Use semantic HTML**: Button elements for clickable actions
3. **Keyboard navigation**: Ensure dropdowns can be closed with Escape key (future enhancement)
4. **Color contrast**: Ensure text meets WCAG AA standards
5. **Screen reader labels**: Use `aria-label` for icon-only elements

---

## Migration Notes

### False Event Logic Changes

**Old Implementation:**
- Used `status = 'false'` in database
- Filter based on status enum value

**New Implementation:**
- Uses `false_event` boolean field
- Constraint: `false_event = TRUE` requires `validated_by_adms = TRUE`
- Filter logic: `event.false_event === true` for hiding false events
- Auto-populated during migration based on existing `validated_by_adms` values

**Updated Code Patterns:**
```typescript
// Old
if (event.status === 'false') { /* hide */ }

// New
if (event.false_event) { /* hide */ }
```

---

## Future Enhancements

### Planned Features

1. **Waveform Image Capture**: Implement actual html2canvas integration for PDF exports
2. **Batch Export**: Add ability to export selected events only
3. **Custom Templates**: Allow users to customize export format/columns
4. **Export Scheduling**: Automated periodic exports
5. **Export History**: Track and manage previous exports

### Considerations

- Performance optimization for large datasets (>1000 events)
- Streaming export for very large datasets
- Custom column selection interface
- Export to additional formats (JSON, XML)
- Email export delivery option

---

## Special Use Cases

### Dual Export Functionality

**SubstationMap Component:**

The SubstationMap component has two separate export functions:
1. **Map Export** - Exports the visual map with bubbles as a PNG image
2. **Table Export** - Handled by SubstationEventsTable component (Excel/CSV/PDF)

```tsx
// Map-level export dropdown (exports map visualization)
<div className="relative export-dropdown-container">
  <button
    onClick={() => setShowExportDropdown(!showExportDropdown)}
    disabled={isExporting}
    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
    title="Export Map and Data"
  >
    <Download className="w-5 h-5" />
  </button>
  {showExportDropdown && (
    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
      <button onClick={handleExportMap} className="...">
        Export Map as Image
      </button>
    </div>
  )}
</div>

// Table-level export (in SubstationEventsTable component)
// Exports event data as Excel/CSV/PDF
```

**Implementation Notes:**
- Use clear labeling to distinguish between map export and data export
- Tooltip on export button: "Export Map and Data" to indicate dual functionality
- Map export: Single option dropdown with "Export Map as Image"
- Table export: Separate export button in SubstationEventsTable with Excel/CSV/PDF options
- Both use the same icon-only button style for consistency

---

**End of Styles Guide**
