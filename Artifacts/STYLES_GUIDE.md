# PQMAP Styles Guide

**Version:** 1.6  
**Last Updated:** January 14, 2026  
**Purpose:** Document reusable UI patterns, export/import utilities, and design standards for PQMAP application

---

## Table of Contents

1. [Export Functionality](#export-functionality)
2. [Import Functionality](#import-functionality)
3. [Button Patterns](#button-patterns)
4. [Dropdown Patterns](#dropdown-patterns)
5. [Icon Usage](#icon-usage)
6. [Color Scheme](#color-scheme)
7. [Spacing & Layout](#spacing--layout)
8. [Animation Standards](#animation-standards)
9. [Modal Patterns](#modal-patterns)
10. [Profile Edit Modal Patterns](#profile-edit-modal-patterns)
11. [Data Refresh Pattern (RefreshKey)](#data-refresh-pattern-refreshkey) ⭐ NEW
12. [Adding New Features](#adding-new-features)

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

#### **🎯 Excel Export Standard Pattern: Chart Image + Data Table**

**IMPORTANT RULE**: When implementing "Export to Excel" functionality for dashboard components with charts:

1. **Chart Image at Top**: Capture the visualization using html2canvas
2. **Data Table Below**: Add the relevant data table underneath
3. **Layout**: Single worksheet with image in top rows, data table starting below (leave ~15-20 rows for image space)

**This pattern applies to:**
- Dashboard charts (RootCause, SARFI, Insight, SARFI-70 Monitor)
- Any component with both visualization and tabular data
- Reports that combine charts with detailed event lists

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

### Excel Export with Chart Image + Data Table Pattern

**Implementation Example** (SARFI-70 Monitor):

```typescript
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

const handleExportExcel = async () => {
  if (!chartRef.current || !selectedMonth) return;
  
  setIsExporting(true);
  setShowExportDropdown(false);

  try {
    // Step 1: Capture chart as image (optional - for future enhancement)
    // Note: Embedding images in Excel requires exceljs library
    // Current implementation exports data table only
    // const canvas = await html2canvas(chartRef.current, { 
    //   backgroundColor: '#ffffff', 
    //   scale: 2 
    // });
    // const imageData = canvas.toDataURL('image/png');

    // Step 2: Create workbook
    const wb = XLSX.utils.book_new();

    // Step 3: Prepare data table
    const tableData = sortedEvents.map(event => ({
      'Sequence': event.sequence,
      'S/S': event.substationCode,
      'Voltage Level': event.voltageLevel,
      'Incident Timestamp': formatTimestamp(event.timestamp),
      'OC': event.oc,
      'SARFI-70': event.sarfi70.toFixed(4)
    }));

    // Step 4: Create worksheet with header section
    const ws = XLSX.utils.aoa_to_sheet([
      ['SARFI-70 KPI Monitoring Report'],
      [`Selected Month: ${selectedMonth.label}`],
      [`Total Events: ${tableEvents.length}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [], // Empty row
      ['Chart Image: See exported PNG file'],
      [] // Empty row - reserve rows 1-20 for future image embedding
    ]);

    // Step 5: Add data table starting from row 20
    XLSX.utils.sheet_add_json(ws, tableData, { origin: 'A20' });

    // Step 6: Set column widths
    ws['!cols'] = [
      { wch: 10 },  // Sequence
      { wch: 15 },  // S/S
      { wch: 15 },  // Voltage Level
      { wch: 20 },  // Incident Timestamp
      { wch: 10 },  // OC
      { wch: 12 }   // SARFI-70
    ];

    // Step 7: Add worksheet and generate file
    XLSX.utils.book_append_sheet(wb, ws, 'SARFI-70 Report');
    
    const fileName = `SARFI70_Report_${selectedMonth.year}_${String(selectedMonth.month).padStart(2, '0')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);

    console.log('Excel export completed');
    
  } catch (error) {
    console.error('Excel export error:', error);
    alert('Failed to export to Excel');
  } finally {
    setIsExporting(false);
  }
};
```

**Key Points**:
- **Header Section**: Rows 1-7 contain report metadata
- **Image Space**: Rows 7-19 reserved for chart image (future enhancement with exceljs)
- **Data Table**: Starts at row 20 with proper column headers
- **Column Widths**: Set via `!cols` property for readability
- **Filename Convention**: `{Component}_{Year}_{Month}_{Date}.xlsx`

**For Future Image Embedding**:
To embed actual chart images in Excel, install and use `exceljs` library instead of `xlsx`:
```bash
npm install exceljs
```

---

## Import Functionality

### 📥 Standard Import Pattern

**IMPORTANT RULE**: Every import feature must include these four components:

1. **Import Button with Dropdown** - UI to trigger import/download template
2. **Template Download Function** - Generates CSV template with headers and example data
3. **Import Validation Function** - Validates each row before database insertion
4. **Import Results Modal** - Shows success/failed counts with detailed error messages

### Complete Import Implementation

#### 1. Required State Variables

```typescript
// Import states
const [showImportDropdown, setShowImportDropdown] = useState(false);
const [showImportModal, setShowImportModal] = useState(false);
const [isImporting, setIsImporting] = useState(false);
const [importResults, setImportResults] = useState<{
  success: number;
  failed: number;
  errors: Array<{ row: number; column: string; message: string }>;
} | null>(null);
```

#### 2. Import Button UI

**Standard Pattern (Icon + Label):**

```tsx
import { Upload, FileDown } from 'lucide-react';

<div className="relative import-dropdown-container">
  <button
    onClick={() => setShowImportDropdown(!showImportDropdown)}
    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all"
  >
    <Upload className="w-5 h-5" />
    <span className="font-semibold">Import</span>
    <ChevronDown className="w-4 h-4" />
  </button>

  {showImportDropdown && (
    <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-30 min-w-[200px]">
      <label className="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer transition-colors">
        <input
          type="file"
          accept=".csv"
          onChange={handleImportCSV}
          className="hidden"
        />
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-blue-600" />
          <span>Import CSV</span>
        </div>
      </label>
      <button
        onClick={handleDownloadTemplate}
        className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-green-50 text-left transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileDown className="w-4 h-4 text-green-600" />
          <span>Download Template</span>
        </div>
      </button>
    </div>
  )}
</div>
```

**Key Styling:**
- Gradient background: `from-blue-600 to-indigo-600`
- Shadow on hover: `hover:shadow-lg`
- Dropdown z-index: `z-30` (higher than export dropdown)
- Color-coded icons: Blue for import, Green for template

#### 3. Template Download Function

```typescript
const handleDownloadTemplate = () => {
  // Define all column headers
  const headers = [
    'event_type',
    'timestamp',
    'substation_id',
    'voltage_level',
    'circuit_id',
    'meter_id',
    'duration_ms',
    'remaining_voltage',
    'affected_phases',
    'severity',
    'magnitude',
    'customer_count',
    'address',
    'cause',
    'equipment_type',
    'weather',
    'remarks',
    'parent_event_id'
  ];

  // Create example row with valid sample data
  const exampleRow = [
    'voltage_dip',
    '2024-01-15 10:30:00',
    'SUBSTATION_ID',
    '132kV',
    'CIRCUIT_001',
    'METER_001',
    '500',
    '85',
    'A,B,C',
    'medium',
    '15',
    '0',
    'Location Address',
    'Equipment Failure',
    'Transformer',
    'Normal',
    'Additional remarks',
    ''
  ];

  // Add helpful comments explaining field formats
  const csvContent = [
    headers.join(','),
    exampleRow.join(','),
    '# event_type: voltage_dip, voltage_swell, momentary_interruption, sustained_interruption, voltage_sag',
    '# timestamp: YYYY-MM-DD HH:MM:SS format',
    '# voltage_level: 400kV, 132kV, 33kV, 11kV, 380V',
    '# affected_phases: Comma-separated (e.g., A,B,C)',
    '# severity: low, medium, high, critical',
    '# parent_event_id: Leave empty for standalone events, or provide existing event ID for child events'
  ].join('\n');

  // Download as CSV file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `event_import_template_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  
  setShowImportDropdown(false);
};
```

**Template Best Practices:**
- Include all required and optional fields
- Provide realistic example data
- Add comment lines (starting with #) explaining formats
- Use current date in filename
- Required fields should be marked in comments
- Valid enum values should be listed

#### 4. Import CSV Function

```typescript
const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setIsImporting(true);
  setShowImportDropdown(false);
  setShowImportModal(true);

  try {
    // Parse CSV file
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const errors: Array<{ row: number; column: string; message: string }> = [];
    let successCount = 0;
    let failedCount = 0;

    // Validate required columns exist
    const requiredColumns = ['event_type', 'timestamp', 'substation_id', 'voltage_level'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const rowNumber = i + 1;
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      // Validate row data
      const rowErrors = validateImportRow(row, rowNumber);
      
      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        failedCount++;
        continue;
      }

      // Create database record
      try {
        const eventData = {
          event_type: row.event_type as any,
          timestamp: new Date(row.timestamp).toISOString(),
          substation_id: row.substation_id,
          voltage_level: row.voltage_level,
          circuit_id: row.circuit_id || null,
          meter_id: row.meter_id || null,
          duration_ms: row.duration_ms ? parseInt(row.duration_ms) : 1000,
          remaining_voltage: row.remaining_voltage ? parseFloat(row.remaining_voltage) : null,
          affected_phases: row.affected_phases ? row.affected_phases.split(',').map(p => p.trim()) : ['A', 'B', 'C'],
          severity: row.severity || 'medium',
          magnitude: row.magnitude ? parseFloat(row.magnitude) : 0,
          customer_count: row.customer_count ? parseInt(row.customer_count) : 0,
          address: row.address || null,
          cause: row.cause || null,
          equipment_type: row.equipment_type || null,
          weather: row.weather || null,
          remarks: row.remarks || null,
          parent_event_id: row.parent_event_id || null,
          is_child_event: !!row.parent_event_id,
          status: 'open' as const,
          validated_by_adms: false,
          false_event: false
        };

        const { error } = await supabase
          .from('pq_events')
          .insert([eventData]);

        if (error) throw error;

        successCount++;
      } catch (error: any) {
        errors.push({
          row: rowNumber,
          column: 'General',
          message: `Failed to create event: ${error.message || 'Unknown error'}`
        });
        failedCount++;
      }
    }

    // Store results
    setImportResults({
      success: successCount,
      failed: failedCount,
      errors: errors
    });

    // Reload data if any succeeded
    if (successCount > 0) {
      await loadData();
    }
  } catch (error: any) {
    alert(`Import failed: ${error.message}`);
    setShowImportModal(false);
  } finally {
    setIsImporting(false);
    event.target.value = ''; // Reset file input
  }
};
```

**Import Function Key Points:**
- Filter out comment lines (starting with #)
- Validate CSV structure before processing
- Track success and failure counts separately
- Continue processing even if some rows fail
- Reset file input after import completes
- Reload data only if at least one row succeeded

#### 5. Validation Function

```typescript
const validateImportRow = (
  row: Record<string, string>, 
  rowNumber: number
): Array<{ row: number; column: string; message: string }> => {
  const errors: Array<{ row: number; column: string; message: string }> = [];
  
  // Validate event_type (required enum)
  const validEventTypes = ['voltage_dip', 'voltage_swell', 'momentary_interruption', 'sustained_interruption', 'voltage_sag'];
  if (!validEventTypes.includes(row.event_type)) {
    errors.push({
      row: rowNumber,
      column: 'event_type',
      message: `Invalid value. Must be one of: ${validEventTypes.join(', ')}`
    });
  }

  // Validate timestamp (required date)
  if (!row.timestamp || isNaN(new Date(row.timestamp).getTime())) {
    errors.push({
      row: rowNumber,
      column: 'timestamp',
      message: 'Invalid date format. Use YYYY-MM-DD HH:MM:SS'
    });
  }

  // Validate substation_id (required, must exist in DB)
  if (!row.substation_id) {
    errors.push({
      row: rowNumber,
      column: 'substation_id',
      message: 'Substation ID is required'
    });
  } else {
    const substationExists = substations.some(s => 
      s.id === row.substation_id || s.name === row.substation_id
    );
    if (!substationExists) {
      errors.push({
        row: rowNumber,
        column: 'substation_id',
        message: 'Substation not found in database'
      });
    }
  }

  // Validate voltage_level (required enum)
  const validVoltageLevels = ['400kV', '132kV', '33kV', '11kV', '380V'];
  if (!validVoltageLevels.includes(row.voltage_level)) {
    errors.push({
      row: rowNumber,
      column: 'voltage_level',
      message: `Invalid value. Must be one of: ${validVoltageLevels.join(', ')}`
    });
  }

  // Validate duration_ms (optional positive number)
  if (row.duration_ms && (isNaN(parseInt(row.duration_ms)) || parseInt(row.duration_ms) < 0)) {
    errors.push({
      row: rowNumber,
      column: 'duration_ms',
      message: 'Must be a positive number'
    });
  }

  // Validate remaining_voltage (optional 0-100)
  if (row.remaining_voltage) {
    const value = parseFloat(row.remaining_voltage);
    if (isNaN(value) || value < 0 || value > 100) {
      errors.push({
        row: rowNumber,
        column: 'remaining_voltage',
        message: 'Must be a number between 0 and 100'
      });
    }
  }

  // Validate severity (optional enum)
  if (row.severity) {
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(row.severity)) {
      errors.push({
        row: rowNumber,
        column: 'severity',
        message: `Invalid value. Must be one of: ${validSeverities.join(', ')}`
      });
    }
  }

  // Validate parent_event_id (optional UUID format)
  if (row.parent_event_id && !row.parent_event_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    errors.push({
      row: rowNumber,
      column: 'parent_event_id',
      message: 'Must be a valid UUID format or leave empty'
    });
  }

  return errors;
};
```

**Validation Best Practices:**
- Validate all required fields first
- Check enum values against allowed lists
- Validate foreign keys (e.g., substation_id exists)
- Validate data types (numbers, dates, UUIDs)
- Validate ranges (e.g., 0-100 for percentages)
- Return all errors for a row, not just the first one
- Provide clear, actionable error messages

#### 6. Import Results Modal

```tsx
{showImportModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Upload className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">CSV Import Results</h2>
        </div>
        <button
          onClick={() => {
            setShowImportModal(false);
            setImportResults(null);
          }}
          disabled={isImporting}
          className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content Area (Scrollable) */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {isImporting ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 text-lg">Importing events...</p>
            <p className="text-slate-500 text-sm mt-2">Please wait while we process your CSV file</p>
          </div>
        ) : importResults ? (
          <>
            {/* Summary Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Success</span>
                  </div>
                  <div className="text-3xl font-bold text-green-600">{importResults.success}</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <X className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-gray-600">Failed</span>
                  </div>
                  <div className="text-3xl font-bold text-red-600">{importResults.failed}</div>
                </div>
              </div>
            </div>

            {/* Error Details Section */}
            {importResults.errors.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Error Details ({importResults.errors.length})
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {importResults.errors.map((error, index) => (
                    <div
                      key={index}
                      className="bg-red-50 border border-red-200 rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                          {error.row}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">Row {error.row}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm font-medium text-red-700">Column: {error.column}</span>
                          </div>
                          <p className="text-sm text-gray-700">{error.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success Message (All Passed) */}
            {importResults.success > 0 && importResults.failed === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <Check className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  All Events Imported Successfully!
                </h3>
                <p className="text-green-700">
                  {importResults.success} event{importResults.success > 1 ? 's' : ''} have been added to the system.
                </p>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Footer (Always at Bottom) */}
      {!isImporting && importResults && (
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex-shrink-0">
          <button
            onClick={() => {
              setShowImportModal(false);
              setImportResults(null);
            }}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
          >
            Close
          </button>
        </div>
      )}
    </div>
  </div>
)}
```

**Modal Styling Key Points:**
- **Flexbox Layout**: `flex flex-col` ensures footer stays at bottom
- **Content Area**: `flex-1 overflow-y-auto` makes middle section scrollable
- **Footer**: `flex-shrink-0` prevents footer from shrinking
- **Max Height**: `max-h-[90vh]` prevents modal from exceeding viewport
- **Loading State**: Spinner with descriptive text during import
- **Color Coding**: Green for success, Red for failures, Orange for warnings

#### 7. Click Outside Handler

```typescript
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (showImportDropdown && !target.closest('.import-dropdown-container')) {
      setShowImportDropdown(false);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [showImportDropdown]);
```

### Import Feature Checklist

When implementing import functionality, ensure:

- [ ] Import button with dropdown UI
- [ ] Download template function with example data
- [ ] CSV parsing with header validation
- [ ] Row-by-row validation function
- [ ] Database insertion with error handling
- [ ] Import results modal with summary
- [ ] Error details display with row/column info
- [ ] Success message for complete imports
- [ ] Close button always visible at bottom
- [ ] Click outside to close dropdown
- [ ] File input reset after import
- [ ] Data reload after successful import
- [ ] Loading state during processing
- [ ] Proper error messages for users

### Import vs Export Comparison

| Feature | Export | Import |
|---------|--------|--------|
| **Button Color** | Blue (`bg-blue-600`) | Blue-Indigo Gradient |
| **Icon** | Download | Upload |
| **Dropdown Options** | Excel/CSV/PDF | Import CSV / Download Template |
| **Processing** | Read from DB → File | File → Validate → Write to DB |
| **Feedback** | File download | Results modal |
| **Error Handling** | Alert on failure | Detailed error list |
| **Data Direction** | Outbound | Inbound |

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

### Substation Dropdown Format

**IMPORTANT RULE**: When displaying substations in dropdown/select elements, always use the format `{code} - {name}` to help users quickly identify substations by their short code.

**Standard Implementation:**

```tsx
// 1. Query substations with both code and name
const { data: substations } = await supabase
  .from('substations')
  .select('id, code, name')
  .order('code');

// 2. Display format in dropdown options
<select value={selectedSubstationId} onChange={handleChange}>
  <option value="">Select Substation</option>
  {substations?.map(s => (
    <option key={s.id} value={s.id}>
      {s.code} - {s.name}
    </option>
  ))}
</select>

// Example displays:
// "APA - Airport A"
// "BKK - Bangkok Central"
// "CPT - Capital District"
```

**Why This Pattern:**
- Users can quickly scan by familiar short codes
- Full name provides context for unfamiliar substations
- Consistent with industry standards for substation identification
- Easier to find specific substations in long lists

**Components Using This Pattern:**
- `MeterFormModal.tsx` - Substation selection dropdown
- Asset management forms
- Any substation picker/selector

---

### Dashboard Config Modal Pattern

**IMPORTANT RULE**: For dashboard widgets with complex filtering needs (3+ filter types), use a comprehensive config modal instead of inline filter dropdowns. This provides better UX for profile management and multiple filter categories.

**Standard Implementation:**

Reference: `SubstationMap.tsx`, `MeterMap.tsx`

```tsx
// 1. Main Component Structure
const [isConfigOpen, setIsConfigOpen] = useState(false);
const [filters, setFilters] = useState<FilterInterface>(() => {
  const saved = localStorage.getItem('componentFilters');
  return saved ? JSON.parse(saved) : defaultFilters;
});

// 2. Header with Settings Button
<div className="flex items-center gap-2">
  {/* Export button, other controls */}
  <button
    onClick={() => setIsConfigOpen(true)}
    className="p-2 hover:bg-slate-100 rounded-lg"
    title="Configure Filters"
  >
    <Settings2 className="w-5 h-5 text-slate-600" />
  </button>
</div>

// 3. Config Modal Component
{isConfigOpen && (
  <ComponentConfigModal
    filters={filters}
    onApply={(newFilters) => {
      setFilters(newFilters);
      setIsConfigOpen(false);
    }}
    onClose={() => setIsConfigOpen(false)}
    uniqueOptions={uniqueOptions}  // Pass computed unique values
    otherData={otherData}
  />
)}
```

**Config Modal Structure (ComponentConfigModal.tsx):**

```tsx
interface Props {
  filters: FilterInterface;
  onApply: (filters: FilterInterface) => void;
  onClose: () => void;
  // Pass unique values computed from data
  uniqueLoadTypes: string[];
  uniqueVoltageLevels: string[];
  substations: Substation[];
}

const ComponentConfigModal: React.FC<Props> = ({
  filters: initialFilters,
  onApply,
  onClose,
  uniqueLoadTypes,
  uniqueVoltageLevels,
  substations
}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [profiles, setProfiles] = useState<FilterProfile[]>(() => {
    const saved = localStorage.getItem('componentProfiles');
    return saved ? JSON.parse(saved) : [];
  });

  // Profile management state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-slate-900">Configure Filters</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Profile Management Section */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Filter Profile
            </label>
            <div className="flex gap-2">
              <select
                value={filters.profileId}
                onChange={(e) => handleLoadProfile(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">Select a profile...</option>
                {profiles.map(profile => (
                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
              </select>
              <button
                onClick={() => setShowProfileModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Save
              </button>
            </div>
            {/* Edit/Delete buttons if profile selected */}
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={filters.searchText}
              onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
              placeholder="Search by ID..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          {/* Grid Layout for Checkboxes */}
          <div className="grid grid-cols-2 gap-6">
            {/* Load Types */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Load Type
              </label>
              <div className="space-y-2">
                {uniqueLoadTypes.map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.loadTypes.includes(type)}
                      onChange={(e) => {/* toggle logic */}}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Voltage Levels */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Voltage Level
              </label>
              <div className="space-y-2">
                {uniqueVoltageLevels.map(level => (
                  <label key={level} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.voltageLevels.includes(level)}
                      onChange={(e) => {/* toggle logic */}}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">{level}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Scrollable List (Substations) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Substations
            </label>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3 space-y-2">
              {substations.map(sub => (
                <label key={sub.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.substations.includes(sub.id)}
                    onChange={(e) => {/* toggle logic */}}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">{sub.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex gap-2">
          <button
            onClick={handleClearAll}
            className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(filters)}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Nested Profile Save Modal (z-index 60) */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Save Filter Profile</h3>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Profile name..."
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowProfileModal(false)}
                className="flex-1 px-4 py-2 bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

**Key Features:**

1. **Profile Management**
   - Save current filters as named profile
   - Load saved profiles from dropdown
   - Edit existing profile (updates name and filters)
   - Delete profiles with confirmation
   - Stored in localStorage with key `componentProfiles`

2. **Layout Structure**
   - Fixed header with title and close button
   - Scrollable content area (`flex-1 overflow-y-auto`)
   - Fixed footer with action buttons
   - Maximum height: `max-h-[90vh]`

3. **Filter Organization**
   - Profile selector at top
   - Text search input
   - Grid layout for checkboxes (2 columns: `grid grid-cols-2 gap-6`)
   - Scrollable list for long items (max-h-48)

4. **Z-Index Hierarchy**
   - Main modal: `z-50`
   - Nested profile modal: `z-60`
   - Backdrop: `bg-black/50`

5. **Filter Persistence**
   - Main filters: localStorage key `componentFilters`
   - Profiles: localStorage key `componentProfiles`
   - Profile ID tracked in filters interface

6. **Button Layout**
   - Three-button footer: Clear All | Cancel | Apply
   - Equal widths with `flex-1`
   - Clear All and Cancel: gray theme
   - Apply: blue theme (primary action)

**When to Use:**
- Dashboard widgets with 3+ filter categories
- Components with profile/preset functionality
- Complex filtering with search + multiple checkboxes
- Need for save/load filter configurations

**When NOT to Use:**
- Simple single-filter scenarios
- Inline filter bars with 1-2 options
- Non-dashboard components

### Filter Dropdown with Checkboxes

**IMPORTANT RULE**: All filter dropdowns with checkbox options should include "Select All" and "Clear All" buttons for better user experience.

**Standard Pattern:**

```tsx
{showDropdown && (
  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
    {/* Select All / Clear All */}
    <div className="p-2 border-b border-slate-200 flex gap-2">
      <button
        onClick={() => {
          const allOptions = ['option1', 'option2', 'option3'];
          setFilters(prev => ({ ...prev, fieldName: allOptions }));
        }}
        className="flex-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium"
      >
        Select All
      </button>
      <button
        onClick={() => setFilters(prev => ({ ...prev, fieldName: [] }))}
        className="flex-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200 font-medium"
      >
        Clear All
      </button>
    </div>

    {/* Checkbox Options */}
    <div className="p-2">
      {options.map(option => (
        <label
          key={option.value}
          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
        >
          <input
            type="checkbox"
            checked={filters.fieldName.includes(option.value)}
            onChange={(e) => {
              if (e.target.checked) {
                setFilters(prev => ({ ...prev, fieldName: [...prev.fieldName, option.value] }));
              } else {
                setFilters(prev => ({ ...prev, fieldName: prev.fieldName.filter(v => v !== option.value) }));
              }
            }}
            className="rounded text-blue-600"
          />
          <span className="text-sm font-medium text-slate-700">{option.label}</span>
        </label>
      ))}
    </div>
  </div>
)}
```

**Key Styling Elements:**
- **Button Container**: `p-2 border-b border-slate-200 flex gap-2` - Creates button bar at top
- **Select All Button**: `bg-blue-50 text-blue-600 hover:bg-blue-100` - Blue theme
- **Clear All Button**: `bg-slate-100 text-slate-600 hover:bg-slate-200` - Gray theme
- **Button Size**: `text-xs` for compact appearance
- **Equal Width**: `flex-1` makes both buttons same width
- **Font Weight**: `font-medium` for emphasis

**Implementation Examples:**
- Event Type Filter: 6 event types (Voltage Dip, Voltage Swell, Harmonic, Interruption, Transient, Flicker)
- Voltage Level Filter: 5 voltage levels (400kV, 132kV, 33kV, 11kV, 380V)
- Any multi-select filter with 3+ options

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

## Table Sorting Pattern

### Standard Implementation

**IMPORTANT RULE**: All data tables should include column sorting functionality for improved user experience.

### Two Sorting Patterns Based on Table Width

#### Pattern 1: Inline Column Sorting (Full-Width & Half-Width Tables)

**Use When:**
- Tables with sufficient width (half-page or full-page)
- Multiple columns with adequate space
- Data tables like Asset Management, Customer lists, etc.

**Implementation:**

##### 1. Required State Variables

```typescript
// Sort states
const [sortField, setSortField] = useState<string>('id'); // Default sort field
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
```

##### 2. Sort Handler Function

```typescript
const handleSort = (field: string) => {
  if (sortField === field) {
    // Toggle direction if clicking same field
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  } else {
    // Set new field and default to ascending
    setSortField(field);
    setSortDirection('asc');
  }
  setCurrentPage(1); // Reset pagination to first page
};
```

##### 3. Apply Sorting Logic

```typescript
// Apply sorting before pagination
const sortedData = [...filteredData].sort((a, b) => {
  let aVal: any;
  let bVal: any;

  // Handle special fields (joins, computed values)
  switch (sortField) {
    case 'substation':
      aVal = substationMap[a.substation_id]?.name || '';
      bVal = substationMap[b.substation_id]?.name || '';
      break;
    case 'date':
      aVal = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      bVal = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      break;
    default:
      aVal = (a as any)[sortField] || '';
      bVal = (b as any)[sortField] || '';
  }

  // Handle different types
  if (typeof aVal === 'string' && typeof bVal === 'string') {
    aVal = aVal.toLowerCase();
    bVal = bVal.toLowerCase();
  }

  if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
  if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
  return 0;
});
```

##### 4. Sortable Table Headers

```tsx
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

<thead>
  <tr className="border-b border-slate-200">
    <th className="py-3 px-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
      <button 
        onClick={() => handleSort('field_name')} 
        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
      >
        Column Name
        {sortField === 'field_name' 
          ? (sortDirection === 'asc' 
              ? <ArrowUp className="w-3 h-3" /> 
              : <ArrowDown className="w-3 h-3" />
            )
          : <ArrowUpDown className="w-3 h-3 opacity-30" />
        }
      </button>
    </th>
    {/* Repeat for other sortable columns */}
  </tr>
</thead>
```

##### 5. Non-Sortable Headers

```tsx
<th className="py-3 px-2 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
  Actions
</th>
```

**Example Implementation:** AssetManagement.tsx
- 12 sortable columns with inline sort icons
- Full-width table with adequate space
- Sort icons appear next to each column header

---

#### Pattern 2: Dropdown Sort Button (Narrow Tables & Lists)

**Use When:**
- Narrow tables or tree lists with limited width
- Side panels or compact list views
- Event tree views, narrow data lists, etc.

**Implementation:**

##### 1. Required State Variables

```typescript
// Sort states
const [showSortDropdown, setShowSortDropdown] = useState(false);
const [sortBy, setSortBy] = useState<'timestamp' | 'event_type' | 'meter_id' | 'voltage_level' | 'duration'>('timestamp');
```

##### 2. Click Outside Handler

```typescript
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (showSortDropdown && !target.closest('.sort-dropdown-container')) {
      setShowSortDropdown(false);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [showSortDropdown]);
```

##### 3. Sort Button UI

```tsx
import { ArrowUpDown } from 'lucide-react';

<div className="flex items-center gap-2">
  {/* Sort Button */}
  <div className="relative sort-dropdown-container">
    <button
      onClick={() => setShowSortDropdown(!showSortDropdown)}
      className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
      title="Sort Events"
    >
      <ArrowUpDown className="w-5 h-5" />
    </button>
    
    {showSortDropdown && (
      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
        <button
          onClick={() => {
            setSortBy('timestamp');
            setShowSortDropdown(false);
          }}
          className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${
            sortBy === 'timestamp' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-slate-700'
          }`}
        >
          <ArrowUpDown className="w-4 h-4" />
          Sort by Timestamp
        </button>
        <button
          onClick={() => {
            setSortBy('event_type');
            setShowSortDropdown(false);
          }}
          className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${
            sortBy === 'event_type' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-slate-700'
          }`}
        >
          <ArrowUpDown className="w-4 h-4" />
          Sort by Event Type
        </button>
        {/* Add more sort options */}
      </div>
    )}
  </div>
</div>
```

##### 4. Apply Sorting Logic

```typescript
const sortedData = [...filteredData].sort((a, b) => {
  switch (sortBy) {
    case 'timestamp':
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    case 'event_type':
      return (a.event_type || '').localeCompare(b.event_type || '');
    case 'meter_id':
      return (a.meter_id || '').localeCompare(b.meter_id || '');
    case 'voltage_level':
      const voltageOrder = { '400kV': 1, '132kV': 2, '33kV': 3, '11kV': 4, '380V': 5 };
      const aVolt = voltageOrder[a.voltage_level as keyof typeof voltageOrder] || 999;
      const bVolt = voltageOrder[b.voltage_level as keyof typeof voltageOrder] || 999;
      return aVolt - bVolt;
    case 'duration':
      return (b.duration_ms || 0) - (a.duration_ms || 0);
    default:
      return 0;
  }
});
```

**Example Implementation:** EventManagement.tsx (Event Tree)
- Single sort button with dropdown menu
- Narrow event tree list
- Sort button positioned next to export button in header

---

### Sorting Best Practices

1. **Default Sort**: Choose a sensible default sort field (e.g., 'id', 'name', 'timestamp')
2. **Visual Indicators**: Always show sort direction with icons
   - **Pattern 1 (Inline)**: Show `ArrowUp`/`ArrowDown`/`ArrowUpDown` next to column headers
   - **Pattern 2 (Dropdown)**: Highlight active sort option with blue background
3. **Reset Pagination**: Always reset to page 1 when sort changes
4. **Case Insensitive**: Convert strings to lowercase for consistent sorting
5. **Handle Nulls**: Provide fallback values for null/undefined fields
6. **Special Cases**: Handle dates, joins, and computed values with switch statement
7. **Icon Size**: 
   - Inline sort icons: `w-3 h-3`
   - Dropdown button icon: `w-5 h-5`
   - Dropdown menu icons: `w-4 h-4`
8. **Hover Effect**: 
   - Inline: `hover:text-blue-600` on column headers
   - Dropdown: `hover:bg-slate-50` on button and menu items

---

## Profile Edit Modal Patterns

**IMPORTANT RULE**: Profile edit modals should adapt to their context - use compact quick filters in space-constrained areas, or full criteria selection in dedicated management pages.

### Pattern 1: Compact Profile Edit (Dashboard/Narrow Sections)

**Use When:**
- Dashboard widgets with limited space
- Sidebar or narrow panel contexts
- Quick profile updates needed
- User needs rapid filter adjustments

**Key Features:**
- **Quick Filter Buttons**: Small, compact button groups for rapid selection
- **Date Quick Filters**: Today / Last 7 Days / Last Month / This Year
- **Meter Quick Select**: Voltage level buttons (400kV, 132kV, etc.) to auto-select all meters
- **Active Filter Toggle**: Checkbox to show only active meters
- **Compact Styling**: `text-xs` buttons, minimal padding, `flex-wrap` for responsive layout

**Implementation Example:**

```tsx
import { useState } from 'react';
import { Edit2, X } from 'lucide-react';

export default function CompactProfileEditModal({ profile, onSave }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMeterIds, setSelectedMeterIds] = useState<string[]>([]);
  const [voltageFilter, setVoltageFilter] = useState('All');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Date quick filter handler
  const handleDateQuickFilter = (filter: 'today' | 'last7days' | 'lastMonth' | 'thisYear') => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    switch (filter) {
      case 'today':
        setStartDate(formatDate(today));
        setEndDate(formatDate(today));
        break;
      case 'last7days':
        const last7 = new Date(today);
        last7.setDate(today.getDate() - 7);
        setStartDate(formatDate(last7));
        setEndDate(formatDate(today));
        break;
      case 'lastMonth':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        setStartDate(formatDate(lastMonthStart));
        setEndDate(formatDate(lastMonthEnd));
        break;
      case 'thisYear':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const yearEnd = new Date(today.getFullYear(), 11, 31);
        setStartDate(formatDate(yearStart));
        setEndDate(formatDate(yearEnd));
        break;
    }
  };

  // Quick select meters by voltage level
  const handleQuickSelectVoltage = (voltageLevel: string) => {
    const filtered = meters.filter(m => 
      m.voltage_level === voltageLevel &&
      (!showActiveOnly || m.is_active)
    );
    setSelectedMeterIds(filtered.map(m => m.id));
  };

  return (
    <div className="space-y-4">
      {/* Date Range with Quick Filters */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Date Range
        </label>
        {/* Quick Date Filters - Compact */}
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => handleDateQuickFilter('today')}
            className="flex-1 px-2 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-medium transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handleDateQuickFilter('last7days')}
            className="flex-1 px-2 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-medium transition-colors"
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => handleDateQuickFilter('lastMonth')}
            className="flex-1 px-2 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-medium transition-colors"
          >
            Last Month
          </button>
          <button
            type="button"
            onClick={() => handleDateQuickFilter('thisYear')}
            className="flex-1 px-2 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-medium transition-colors"
          >
            This Year
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {/* Meter Selection with Quick Filters */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Select PQ Meters
        </label>
        {/* Quick Select by Voltage - Compact */}
        <div className="flex gap-2 flex-wrap mb-3">
          <button
            type="button"
            onClick={() => handleQuickSelectVoltage('400kV')}
            className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-medium"
          >
            ⚡ 400kV
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelectVoltage('132kV')}
            className="px-2 py-1 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded text-xs font-medium"
          >
            ⚡ 132kV
          </button>
          {/* More voltage levels... */}
        </div>
        {/* Meter dropdown with filters */}
      </div>
    </div>
  );
}
```

**Styling Key Points:**
- Button size: `px-2 py-1.5` for date filters, `px-2 py-1` for voltage quick selects
- Text size: `text-xs` for all quick filter buttons
- Colors: Voltage buttons use specific colors (blue-400kV, cyan-132kV, teal-33kV, green-11kV, yellow-380V)
- Layout: `flex gap-2` with `flex-wrap` for responsive wrapping
- Spacing: `mb-3` between quick filters and main inputs

---

### Pattern 2: Full Width Profile Edit (Management Pages)

**Use When:**
- Event Management or dedicated profile management pages
- Full-width modals or pages
- Complex criteria selection needed
- User has time to carefully configure filters

**Key Features:**
- **No Quick Filters**: Users manually select all criteria
- **Full Criteria Display**: All filters visible and configurable
- **Update Profile Button**: Explicit save action required
- **Detailed Validation**: Comprehensive error messages
- **Multi-step Forms**: Can include tabs or sections for organization

**Implementation Example:**

```tsx
export default function FullWidthProfileEdit({ profile, onUpdate }) {
  return (
    <div className="space-y-6">
      {/* Profile Name */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Profile Name
        </label>
        <input
          type="text"
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
          placeholder="Enter profile name"
        />
      </div>

      {/* Date Range - No Quick Filters */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Date Range
        </label>
        <div className="grid grid-cols-2 gap-4">
          <input type="date" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg" />
          <input type="date" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg" />
        </div>
      </div>

      {/* Meter Selection - No Quick Select Buttons */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Select PQ Meters
        </label>
        <select multiple className="w-full px-4 py-2.5 border border-slate-300 rounded-lg h-48">
          {/* Meter options */}
        </select>
      </div>

      {/* Explicit Save Action */}
      <div className="flex gap-3 justify-end">
        <button className="px-5 py-2.5 border border-slate-300 rounded-lg">
          Cancel
        </button>
        <button className="px-5 py-2.5 bg-blue-600 text-white rounded-lg">
          Update Profile
        </button>
      </div>
    </div>
  );
}
```

**Styling Key Points:**
- Standard input size: `px-4 py-2.5` (larger than compact)
- Text size: `text-sm` or regular (not `text-xs`)
- Spacing: `space-y-6` for generous vertical spacing
- No quick filter buttons - users configure manually
- Prominent action buttons at bottom

---

### Pattern Selection Guide

| Context | Pattern | Quick Filters | Button Size | Use Case |
|---------|---------|---------------|-------------|----------|
| **Dashboard Widgets** | Compact | Yes | `text-xs`, `px-2 py-1` | SARFI Chart config |
| **Sidebar Panels** | Compact | Yes | `text-xs`, `px-2 py-1` | Quick profile edits |
| **Event Management** | Full Width | No | `text-sm`, `px-4 py-2.5` | Comprehensive filter setup |
| **Profile Management Page** | Full Width | No | `text-sm`, `px-4 py-2.5` | Create/edit profiles |
| **Modal (< 600px)** | Compact | Yes | `text-xs`, `px-2 py-1` | Space-constrained modals |
| **Modal (> 600px)** | Full Width | Optional | `text-sm`, `px-4 py-2.5` | Large modals |

### Best Practices

1. **Choose Pattern Based on Context**: Dashboard = Compact, Management Pages = Full Width
2. **Consistent Sizing**: Compact buttons always `text-xs`, Full width always `text-sm` or larger
3. **Quick Filters for Speed**: Only add quick filters when users need rapid updates
4. **Validation**: Both patterns need validation, but Full Width can show more detailed errors
5. **Mobile**: Compact pattern works better on mobile due to smaller buttons
6. **Accessibility**: Always include labels and ARIA attributes regardless of pattern

---
9. **Button Styling**: Use `flex items-center gap-1` or `gap-2` for proper icon alignment
10. **Non-Sortable Columns**: Don't add sort buttons to action columns or non-data columns

### Pattern Selection Guide

| Table Type | Width | Pattern | Example |
|------------|-------|---------|---------|
| Asset/Customer Lists | Full Width | Inline Column Sorting | AssetManagement.tsx |
| Data Tables | Half Width+ | Inline Column Sorting | Meter Inventory |
| Event Tree | Narrow | Dropdown Sort Button | EventManagement.tsx |
| Side Panels | Narrow | Dropdown Sort Button | Compact Lists |
| Modal Lists | Variable | Use Inline if >50% width, else Dropdown | Context-dependent |

---

## Dual-Column Selection Pattern

### Overview

**Use When:**
- Adding multiple items from an available pool to a selected list
- User needs to quickly select/deselect many items
- Visual confirmation of selections is important
- Batch operations are common

**Key Features:**
- Two-column layout with distinct visual styling
- Immediate move on checkbox click
- Bulk operations (Select All / Unselect All)
- Search filters left column only
- Clear visual distinction between available and selected

### Standard Implementation

**Reference:** `WeightingFactors.tsx` (Add Meter Modal)

#### 1. Required State Variables

```typescript
const [showModal, setShowModal] = useState(false);
const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
const [searchQuery, setSearchQuery] = useState<string>('');
const [isProcessing, setIsProcessing] = useState(false);
```

#### 2. Handler Functions

```typescript
// Toggle individual item
const handleToggleItem = (itemId: string) => {
  const newSelected = new Set(selectedItemIds);
  if (newSelected.has(itemId)) {
    newSelected.delete(itemId);
  } else {
    newSelected.add(itemId);
  }
  setSelectedItemIds(newSelected);
};

// Select all visible items in left column
const handleSelectAll = () => {
  const newSelected = new Set(selectedItemIds);
  filteredAvailableItems.forEach(item => newSelected.add(item.id));
  setSelectedItemIds(newSelected);
};

// Unselect all items (move all from right to left)
const handleUnselectAll = () => {
  setSelectedItemIds(new Set());
};

// Process selected items
const handleSubmit = async () => {
  if (selectedItemIds.size === 0) {
    alert('Please select at least one item');
    return;
  }

  setIsProcessing(true);
  try {
    const promises = Array.from(selectedItemIds).map(itemId =>
      addItemToList(itemId)
    );
    await Promise.all(promises);
    
    // Reload data and close modal
    await loadData();
    setShowModal(false);
    setSelectedItemIds(new Set());
    setSearchQuery('');
  } catch (error: any) {
    console.error('❌ Error:', error);
    alert(error.message || 'Failed to add items');
  } finally {
    setIsProcessing(false);
  }
};
```

#### 3. Data Filtering Logic

```typescript
// Exclude already added items and selected items from left column
const addedItemIds = new Set(existingItems.map(item => item.id));
const availableItems = allItems.filter(item => 
  !addedItemIds.has(item.id) && !selectedItemIds.has(item.id)
);

// Filter left column by search query
const filteredAvailableItems = availableItems.filter(item => 
  item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  item.description.toLowerCase().includes(searchQuery.toLowerCase())
);

// Get selected items for right column
const selectedItems = allItems.filter(item => selectedItemIds.has(item.id));
```

#### 4. Modal UI Structure

```tsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col">
    {/* Header */}
    <div className="flex items-center justify-between p-6 border-b border-slate-200">
      <div>
        <h3 className="text-xl font-bold text-slate-900">Select Items</h3>
        <p className="text-sm text-slate-500 mt-1">
          Click checkboxes to move items between columns
        </p>
      </div>
      <button
        onClick={() => {
          setShowModal(false);
          setSelectedItemIds(new Set());
          setSearchQuery('');
        }}
        className="p-2 hover:bg-slate-100 rounded-lg"
      >
        <X className="w-5 h-5" />
      </button>
    </div>

    {/* Search Bar */}
    <div className="px-6 pt-6 pb-4">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search available items..."
        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      />
    </div>

    {/* Dual Column Layout */}
    <div className="flex-1 overflow-y-auto px-6 pb-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Left Column - Available Items */}
        <div className="border border-slate-300 rounded-lg overflow-hidden">
          <div className="bg-slate-100 px-4 py-3 border-b border-slate-300 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-900">Available Items</h4>
              <p className="text-xs text-slate-600 mt-0.5">
                {filteredAvailableItems.length} items
              </p>
            </div>
            <button
              onClick={handleSelectAll}
              disabled={filteredAvailableItems.length === 0}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select All
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredAvailableItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p className="text-sm">
                  {searchQuery ? 'No items match your search' : 'No available items'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredAvailableItems.map(item => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => handleToggleItem(item.id)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-600 truncate">
                        {item.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Selected Items */}
        <div className="border border-slate-300 rounded-lg overflow-hidden">
          <div className="bg-green-100 px-4 py-3 border-b border-green-300 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-900">Selected Items</h4>
              <p className="text-xs text-slate-600 mt-0.5">
                {selectedItemIds.size} selected
              </p>
            </div>
            <button
              onClick={handleUnselectAll}
              disabled={selectedItemIds.size === 0}
              className="px-3 py-1.5 text-xs font-medium bg-slate-600 text-white rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Unselect All
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {selectedItemIds.size === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p className="text-sm">No items selected</p>
                <p className="text-xs text-slate-400 mt-1">
                  Click checkboxes on the left to select items
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {selectedItems.map(item => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => handleToggleItem(item.id)}
                      className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-600 truncate">
                        {item.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Footer */}
    <div className="flex-shrink-0 flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
      <p className="text-sm text-slate-600">
        {selectedItemIds.size} item{selectedItemIds.size !== 1 ? 's' : ''} selected
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setShowModal(false);
            setSelectedItemIds(new Set());
            setSearchQuery('');
          }}
          className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={selectedItemIds.size === 0 || isProcessing}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Add Items</span>
            </>
          )}
        </button>
      </div>
    </div>
  </div>
</div>
```

### Styling Guidelines

#### Color Scheme
- **Left Column Header**: `bg-slate-100` with `border-slate-300`
- **Right Column Header**: `bg-green-100` with `border-green-300` (success theme)
- **Left Hover**: `hover:bg-blue-50` (indicates potential selection)
- **Right Hover**: `hover:bg-red-50` (indicates potential removal)
- **Select All Button**: `bg-blue-600 text-white hover:bg-blue-700`
- **Unselect All Button**: `bg-slate-600 text-white hover:bg-slate-700`

#### Layout
- **Modal Width**: `max-w-5xl` for dual columns
- **Modal Height**: `max-h-[85vh]` to fit most screens
- **Column Grid**: `grid-cols-2 gap-4`
- **Item List Height**: `max-h-96 overflow-y-auto` for scrolling
- **Item Padding**: `px-4 py-3` for comfortable touch targets

#### Typography
- **Column Title**: `font-semibold text-slate-900`
- **Item Count**: `text-xs text-slate-600`
- **Item Name**: `text-sm font-medium text-slate-900 truncate`
- **Item Description**: `text-xs text-slate-600 truncate`
- **Button Text**: `text-xs font-medium` for action buttons

#### Interactive Elements
- **Checkbox Size**: `w-4 h-4` with proper focus rings
- **Immediate Toggle**: Checkbox onChange calls `handleToggleItem` directly
- **Transition**: `transition-colors` on hover states
- **Disabled State**: `disabled:opacity-50 disabled:cursor-not-allowed`

### Behavior Rules

1. **Checkbox Click → Immediate Move**
   - No "Move" button needed
   - Click checkbox in left column → item appears in right column
   - Click checkbox in right column → item returns to left column

2. **Search Filters Left Column Only**
   - Search bar only filters available items
   - Selected items remain visible regardless of search
   - Clear search input when closing modal

3. **Bulk Operations**
   - "Select All" adds all visible (filtered) items from left to right
   - "Unselect All" moves all items from right to left
   - Buttons disabled when no items available

4. **Data Management**
   - Left column excludes already added items AND selected items
   - Right column shows only selected items
   - Use Set for efficient ID management

5. **Submit Action**
   - Process all items in right column at once
   - Show loading state during processing
   - Close modal and reset state on success
   - Keep modal open and show error on failure

### Use Cases

**Perfect For:**
- Adding meters to SARFI profiles
- Assigning users to groups
- Selecting multiple filters
- Building custom reports with data sources
- Managing permissions (assign roles to users)
- Creating event groupings

**Not Recommended For:**
- Single-item selection (use dropdown or radio buttons)
- Small lists (<5 items) where multi-select dropdown suffices
- Sequential wizards where order matters
- Hierarchical selections (use tree view instead)

### Accessibility Considerations

1. **Keyboard Navigation**: Checkboxes are keyboard accessible
2. **Screen Readers**: Clear labels on columns and buttons
3. **Focus Management**: Visible focus rings on interactive elements
4. **Color Independence**: Don't rely solely on color (use text labels)
5. **Loading States**: Provide clear feedback during processing

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

### Dashboard Charts with Chart + Data Export

**SARFI-70 Monitor Component:**

Dashboard components that combine charts with interactive data tables should offer two export options:

1. **Export as Image (PNG)** - Captures entire visualization using html2canvas
2. **Export to Excel** - Chart image at top + selected data table below

**Implementation Pattern**:
```tsx
{showExportDropdown && (
  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
    <button
      onClick={handleExportChart}
      disabled={isExporting}
      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
    >
      <Download className="w-4 h-4" />
      Export as Image
    </button>
    <button
      onClick={handleExportExcel}
      disabled={isExporting || !selectedMonth}  // Enable only when data is selected
      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
    >
      <Download className="w-4 h-4" />
      Export to Excel
    </button>
  </div>
)}
```

**Key Features**:
- Excel option disabled until user selects data (e.g., clicks a chart point)
- Excel file contains header rows + reserved space for image + data table
- Filename follows pattern: `{Component}_{Params}_{Date}.xlsx`

**Components Using This Pattern**:
- SARFI70Monitor (chart + monthly events table)
- Future dashboard components with interactive charts

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

### Dashboard Chart Components with Filters

**RootCauseChart & Similar Components:**

Dashboard chart components follow a consistent pattern with:
1. **Independent date filters** - Each chart has its own filter configuration
2. **Profile management** - Save and load date range preferences
3. **Export as image** - Using html2canvas to capture visualization
4. **Filter persistence** - Stored in localStorage

```tsx
// Component structure
const [filters, setFilters] = useState<RootCauseFilters>(() => {
  const saved = localStorage.getItem('rootCauseFilters');
  return saved ? JSON.parse(saved) : { profileId: '', startDate: '', endDate: '' };
});

// Filter events
const getFilteredEvents = (): PQEvent[] => {
  return events.filter(event => {
    if (event.false_event) return false; // Always exclude false events
    if (filters.startDate && new Date(event.timestamp) < new Date(filters.startDate)) return false;
    if (filters.endDate && new Date(event.timestamp) > new Date(filters.endDate)) return false;
    return true;
  });
};

// Header with filters and export
<div className="flex items-center justify-between mb-6">
  <div className="flex items-center gap-3">
    <BarChart3 className="w-6 h-6 text-slate-700" />
    <div>
      <h2 className="text-xl font-bold text-slate-900">Root Cause Analysis</h2>
      <p className="text-sm text-slate-600 mt-1">
        {filteredEvents.length} events analyzed
      </p>
    </div>
  </div>
  <div className="flex items-center gap-2">
    {/* Export button */}
    {/* Config button */}
  </div>
</div>
```

**Key Features:**
- **Independent Filters**: Each chart maintains its own filter state
- **Profile Support**: ConfigModal components (e.g., RootCauseConfigModal) for saving date ranges
- **False Event Exclusion**: Always filter out `event.false_event === true`
- **Event Count Display**: Show filtered event count in subtitle
- **Empty State**: Display helpful message when no data matches filters
- **Export via html2canvas**: Capture entire chart div including headers

**Filter Storage Pattern:**
```typescript
// Key naming convention: `{componentName}Filters` and `{componentName}Profiles`
localStorage.setItem('rootCauseFilters', JSON.stringify(filters));
localStorage.setItem('rootCauseProfiles', JSON.stringify(profiles));
```

---

## Modal Patterns

### Report Modal with Configuration and Data Table

**Use Case**: Large overlay modal combining configuration controls, summary statistics, filters, and paginated data table

**Example**: Meter Availability Report (AssetManagement.tsx, Dec 19, 2025)

#### Modal Structure

```tsx
{showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6" />
          <div>
            <h3 className="text-xl font-bold">Modal Title</h3>
            <p className="text-blue-100 text-sm">Subtitle description</p>
          </div>
        </div>
        <button onClick={closeModal} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Configuration Section */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
        {/* Time range selectors, presets, custom inputs */}
      </div>

      {/* Summary Statistics */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Stat cards with color-coded backgrounds */}
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Search input, dropdown filters, clear button */}
        </div>
      </div>

      {/* Scrollable Table Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <table className="w-full">
          <thead className="sticky top-0 bg-white border-b-2 border-slate-300 z-10">
            {/* Sortable headers with ArrowUp/ArrowDown/ArrowUpDown */}
          </thead>
          <tbody>
            {/* Data rows with hover effects */}
          </tbody>
        </table>

        {/* Pagination controls */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
          {/* Page info and navigation buttons */}
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="text-sm text-slate-600">
          <span className="font-semibold">{count}</span> items displayed
        </div>
        <button onClick={closeModal} className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-all">
          Close
        </button>
      </div>
    </div>
  </div>
)}
```

#### Key Design Elements

**1. Full-Width Layout**:
- `max-w-7xl` for wide screens (accommodates 7+ columns)
- `max-h-[95vh]` prevents exceeding viewport
- `overflow-hidden` on container, `overflow-y-auto` on content

**2. Sticky Header & Footer**:
- Header: `sticky top-0` with gradient background and z-10
- Footer: `sticky bottom-0` with solid background
- Both prevent scrolling out of view

**3. Configuration Section**:
- Visual preset buttons (active state highlighting)
- Conditional custom inputs (show/hide based on selection)
- Color scheme: Blue for active, white for inactive
- Examples: Time range (24h, 7d, 30d, custom)

**4. Summary Statistics Grid**:
- `grid grid-cols-1 md:grid-cols-4` for responsive layout
- Color-coded background cards (slate-50, green-50, blue-50)
- Large font size (text-2xl) for emphasis
- Clear labels with small text (text-xs)

**5. Filter Controls**:
- `flex items-center justify-between` layout
- Search input with Search icon positioned absolutely
- Multi-select dropdowns for categories
- Clear Filters button with active count badge

**6. Sortable Table**:
- Sticky header: `thead` with `sticky top-0 bg-white z-10`
- Sort buttons: `flex items-center gap-1` with icons
- Color-coded badges for status/severity columns
- Hover row effect: `hover:bg-slate-50`
- Empty state: Centered message with helpful actions

**7. Pagination**:
- Range display: "Showing X to Y of Z items"
- Previous/Next buttons with disabled states
- Page counter: "Page X / Y"
- Chevron icons (ChevronLeft, ChevronRight)

#### Color Coding Patterns

**Time Range Buttons**:
```tsx
className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
  selected
    ? 'bg-blue-600 text-white shadow-md'
    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
}`}
```

**Availability/Status Badges**:
```tsx
// High availability (≥90%)
<span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
  95.50%
</span>

// Medium availability (50-89%)
<span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-bold">
  72.33%
</span>

// Low availability (<50%)
<span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold">
  15.00%
</span>
```

**Summary Stat Cards**:
```tsx
// Default card
<div className="bg-slate-50 p-4 rounded-lg">...</div>

// Success card
<div className="bg-green-50 p-4 rounded-lg">...</div>

// Info card
<div className="bg-blue-50 p-4 rounded-lg">...</div>
```

#### Responsive Considerations

1. **Grid Breakpoints**: Use `md:grid-cols-4` to stack on mobile
2. **Flex Wrapping**: `flex-wrap` on filter controls
3. **Table Overflow**: `overflow-x-auto` wrapper for wide tables
4. **Modal Padding**: `p-4` on outer container for mobile spacing

#### Accessibility

- Close button with hover effect and title attribute
- Keyboard navigation (future: Escape key to close)
- Color contrast meets WCAG AA standards
- Screen reader labels on icon-only buttons
- Disabled state styling on pagination buttons

#### Performance Optimization

- Pagination reduces DOM size (20 items per page)
- Sticky positioning for header/footer (better than fixed)
- Efficient filtering with early returns
- Memoization opportunities for expensive calculations

---

## Report Builder Patterns

### Interactive Pivot Table Interface

**Component**: `src/components/Dashboard/ReportBuilder/ReportBuilder.tsx`

**Libraries Used**:
- `react-pivottable` - Pivot table and aggregation
- `plotly.js` + `react-plotly.js` - Chart rendering
- `xlsx` - Excel export
- `jspdf` + `jspdf-autotable` - PDF export

#### Key UI Patterns

**Pivot Table Container**:
```tsx
<div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
  <PivotTableUI
    data={filteredData}
    onChange={s => setPivotState(s)}
    renderers={Object.assign({}, TableRenderers, PlotlyRenderers)}
    {...pivotState}
  />
</div>
```

**Filter Section Layout**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
  {/* Date Range Preset */}
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-2">
      Date Range
    </label>
    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg">
      <option value="today">Today</option>
      <option value="last7days">Last 7 Days</option>
      <option value="last30days">Last 30 Days</option>
      {/* ... more options */}
    </select>
  </div>
  
  {/* Multi-Select Filter */}
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-2">
      Event Types
    </label>
    <select 
      multiple 
      className="w-full px-3 py-2 border border-slate-300 rounded-lg h-32"
    >
      <option value="voltage_dip">Voltage Dip</option>
      <option value="voltage_swell">Voltage Swell</option>
      {/* ... more options */}
    </select>
  </div>
</div>
```

**Action Button Row**:
```tsx
<div className="flex flex-wrap items-center gap-3 mb-6">
  {/* Primary Actions */}
  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     transition-all shadow-md flex items-center gap-2">
    <Save className="w-4 h-4" />
    Save Report
  </button>
  
  {/* Secondary Actions */}
  <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 
                     rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2">
    <Download className="w-4 h-4" />
    Export
  </button>
  
  {/* Auto-Refresh Toggle */}
  <label className="flex items-center gap-2 cursor-pointer">
    <input 
      type="checkbox" 
      className="w-4 h-4 text-blue-600 rounded border-slate-300 
                 focus:ring-blue-500"
    />
    <span className="text-sm font-medium text-slate-700">Auto-Refresh</span>
  </label>
  
  {/* Refresh Interval Selector (when enabled) */}
  {autoRefresh && (
    <select className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
      <option value={30000}>30 seconds</option>
      <option value={60000}>1 minute</option>
      <option value={300000}>5 minutes</option>
      {/* ... more options */}
    </select>
  )}
</div>
```

**Calculated Field Button**:
```tsx
<button 
  onClick={() => setShowCalculatedFieldEditor(true)}
  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 
             transition-all shadow-md flex items-center gap-2"
  title="Create custom calculated field"
>
  <Plus className="w-4 h-4" />
  Add Calculated Field
</button>
```

### Calculated Field Editor Modal

**Component**: `src/components/Dashboard/ReportBuilder/CalculatedFieldEditor.tsx`

**Modal Structure**:
```tsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] 
                  overflow-hidden flex flex-col">
    {/* Header */}
    <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 
                    flex items-center justify-between">
      <h3 className="text-xl font-bold text-white">
        Calculated Field Editor
      </h3>
      <button onClick={onClose} className="text-white/80 hover:text-white">
        <X className="w-5 h-5" />
      </button>
    </div>
    
    {/* Content (scrollable) */}
    <div className="p-6 overflow-y-auto flex-1">
      {/* Field Name Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Field Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g., duration_sec"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg 
                     focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>
      
      {/* Expression Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Expression <span className="text-red-500">*</span>
        </label>
        <textarea
          placeholder="e.g., [duration_ms] / 1000"
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono 
                     text-sm focus:ring-2 focus:ring-purple-500"
        />
        <p className="text-xs text-slate-500 mt-1">
          Use [Field Name] syntax. Example: [v1] + [v2] + [v3]
        </p>
      </div>
      
      {/* Available Fields Grid */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Available Fields (click to insert)
        </label>
        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto 
                        border border-slate-200 rounded-lg p-3 bg-slate-50">
          {fields.map(field => (
            <button
              key={field}
              onClick={() => insertField(field)}
              className="px-2 py-1 bg-white border border-slate-300 rounded 
                         hover:bg-blue-50 hover:border-blue-400 text-xs 
                         font-mono text-left transition-all"
            >
              {field}
            </button>
          ))}
        </div>
      </div>
    </div>
    
    {/* Footer */}
    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 
                    flex justify-end gap-3">
      <button onClick={onClose} className="px-4 py-2 border border-slate-300 
                                           text-slate-700 rounded-lg hover:bg-white">
        Cancel
      </button>
      <button onClick={handleSave} className="px-4 py-2 bg-purple-600 text-white 
                                               rounded-lg hover:bg-purple-700">
        Add Field
      </button>
    </div>
  </div>
</div>
```

### Share Report Modal

**Component**: `src/components/Dashboard/ReportBuilder/ShareReportModal.tsx`

**User Selection Pattern**:
```tsx
{/* Search Input */}
<input
  type="text"
  placeholder="Search users by name, email, or department..."
  className="w-full px-4 py-2 border border-slate-300 rounded-lg 
             focus:ring-2 focus:ring-blue-500 mb-4"
/>

{/* User List with Checkboxes */}
<div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 
                rounded-lg p-3 bg-slate-50">
  {filteredUsers.map(user => (
    <label
      key={user.id}
      className="flex items-center gap-3 p-3 bg-white rounded-lg 
                 hover:bg-blue-50 cursor-pointer border border-transparent 
                 hover:border-blue-300 transition-all"
    >
      <input
        type="checkbox"
        checked={selectedUsers.includes(user.id)}
        className="w-4 h-4 text-blue-600 rounded border-slate-300 
                   focus:ring-blue-500"
      />
      <div className="flex-1">
        <p className="font-medium text-slate-900">{user.full_name}</p>
        <p className="text-xs text-slate-500">{user.email}</p>
        {user.department && (
          <p className="text-xs text-slate-400">{user.department}</p>
        )}
      </div>
    </label>
  ))}
</div>

{/* Selection Summary */}
<div className="mt-4 p-3 bg-blue-50 rounded-lg">
  <p className="text-sm text-blue-800">
    {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
  </p>
</div>
```

**Optional Message**:
```tsx
<div className="mt-4">
  <label className="block text-sm font-medium text-slate-700 mb-2">
    Message (optional)
  </label>
  <textarea
    placeholder="Add a message to notify users about this report..."
    rows={3}
    className="w-full px-3 py-2 border border-slate-300 rounded-lg 
               focus:ring-2 focus:ring-blue-500"
  />
</div>
```

### Report List Pattern

**Saved Reports Display**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {reports.map(report => (
    <div
      key={report.id}
      className="bg-white rounded-xl shadow-md hover:shadow-lg 
                 transition-all border border-slate-200 p-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-slate-900 mb-1">{report.name}</h4>
          {report.description && (
            <p className="text-sm text-slate-600 line-clamp-2">
              {report.description}
            </p>
          )}
        </div>
        {report.is_shared && (
          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 
                           text-xs rounded-full">
            Shared
          </span>
        )}
      </div>
      
      {/* Metadata */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
        <Calendar className="w-3 h-3" />
        <span>{formatDate(report.created_at)}</span>
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => loadReport(report)}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg 
                     hover:bg-blue-700 text-sm font-medium"
        >
          Load
        </button>
        <button
          onClick={() => shareReport(report)}
          className="px-3 py-2 border border-slate-300 text-slate-700 
                     rounded-lg hover:bg-slate-50 text-sm"
          title="Share report"
        >
          <Share2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => deleteReport(report)}
          className="px-3 py-2 border border-red-300 text-red-600 
                     rounded-lg hover:bg-red-50 text-sm"
          title="Delete report"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  ))}
</div>
```

### Date Range Preset Options

**Standard Presets**:
```typescript
const datePresets = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'last90days', label: 'Last 90 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisQuarter', label: 'This Quarter' },
  { value: 'lastQuarter', label: 'Last Quarter' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
  { value: 'last365days', label: 'Last 365 Days' },
  { value: 'custom', label: 'Custom Range...' }
];
```

**Custom Date Range Picker** (when preset is 'custom'):
```tsx
<div className="grid grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-2">
      Start Date
    </label>
    <input
      type="datetime-local"
      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
    />
  </div>
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-2">
      End Date
    </label>
    <input
      type="datetime-local"
      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
    />
  </div>
</div>
```

### CSS Import Requirements

**Add to `src/index.css`**:
```css
/* React PivotTable CSS */
@import 'react-pivottable/pivottable.css';

/* Optional: Custom pivot table styles */
.pvtUi {
  font-family: inherit;
  font-size: 14px;
}

.pvtTable {
  border-collapse: collapse;
}

.pvtTable thead tr th,
.pvtTable tbody tr th {
  background-color: #f8fafc;
  font-weight: 600;
  color: #334155;
}
```

---

## Data Refresh Pattern (RefreshKey)

**IMPORTANT RULE**: Every component with CRUD operations (Create, Update, Delete) should implement the refreshKey pattern to automatically reload data and show the latest changes without manual page refresh.

### What is RefreshKey?

RefreshKey is a simple counter-based pattern that triggers data reload in child list components when parent components perform CRUD operations. It eliminates the need for manual page refresh (F5) and provides instant feedback to users.

### When to Use

Use the refreshKey pattern when:
- **Parent-child component relationship** exists (e.g., Management component + List component)
- **CRUD operations** are performed in modals or separate components
- **Data lists need to refresh** after create/update/delete operations
- **User expects immediate visual feedback** after changes

### Implementation Pattern

#### 1. Parent Component Setup (Management/Container)

**Example: GroupManagement.tsx**

```typescript
import { useState } from 'react';
import GroupList from './GroupList';
import GroupEditor from './GroupEditor';
import type { NotificationGroup } from '../../types/database';

export default function GroupManagement() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  
  // 🔑 RefreshKey state - increment to trigger reload
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEdit = (group: NotificationGroup) => {
    setSelectedGroupId(group.id);
    setEditorOpen(true);
  };

  const handleNew = () => {
    setSelectedGroupId(undefined);
    setEditorOpen(true);
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    setSelectedGroupId(undefined);
  };

  const handleEditorSaved = () => {
    setEditorOpen(false);
    setSelectedGroupId(undefined);
    // 🔑 Increment refreshKey to trigger list reload
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div>
      {/* 🔑 Pass refreshKey to list component */}
      <GroupList 
        onEdit={handleEdit} 
        onNew={handleNew} 
        refreshKey={refreshKey} 
      />
      
      {editorOpen && (
        <GroupEditor
          groupId={selectedGroupId}
          onClose={handleEditorClose}
          onSaved={handleEditorSaved}
        />
      )}
    </div>
  );
}
```

**Key Points:**
- Initialize `refreshKey` with `useState(0)`
- Increment in success handlers: `setRefreshKey(prev => prev + 1)`
- Pass as prop to list component
- Increment after ANY data-modifying operation (create, update, delete)

#### 2. Child Component Setup (List/Table)

**Example: GroupList.tsx**

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { NotificationGroup } from '../../types/database';

interface GroupListProps {
  onEdit: (group: NotificationGroup) => void;
  onNew: () => void;
  // 🔑 Add optional refreshKey prop
  refreshKey?: number;
}

export default function GroupList({ onEdit, onNew, refreshKey }: GroupListProps) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial load
  useEffect(() => {
    loadGroups();
  }, []);

  // 🔑 Reload when refreshKey changes
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      loadGroups();
    }
  }, [refreshKey]);

  const loadGroups = async () => {
    setLoading(true);
    
    const { data: groupsData } = await supabase
      .from('notification_groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (groupsData) {
      // Process data...
      setGroups(groupsData);
    }

    setLoading(false);
  };

  // ... rest of component
}
```

**Key Points:**
- Add `refreshKey?: number` to props interface (optional)
- Create separate `useEffect` watching `refreshKey`
- Check `refreshKey !== undefined && refreshKey > 0` before reloading
- Call existing `loadGroups()` function (don't duplicate logic)

#### 3. Operations That Should Trigger Refresh

**Always increment refreshKey after:**

1. ✅ **Create Operations**
   ```typescript
   const handleCreate = async () => {
     // ... create logic
     if (success) {
       setRefreshKey(prev => prev + 1);
     }
   };
   ```

2. ✅ **Update Operations**
   ```typescript
   const handleUpdate = async () => {
     // ... update logic
     if (success) {
       setRefreshKey(prev => prev + 1);
     }
   };
   ```

3. ✅ **Delete Operations**
   ```typescript
   const handleDelete = async () => {
     // ... delete logic
     if (success) {
       setRefreshKey(prev => prev + 1);
     }
   };
   ```

4. ✅ **Status Changes**
   ```typescript
   const handleStatusToggle = async () => {
     // ... status change logic
     if (success) {
       setRefreshKey(prev => prev + 1);
     }
   };
   ```

5. ✅ **Batch Operations**
   ```typescript
   const handleBulkAction = async () => {
     // ... bulk operation
     if (success) {
       setRefreshKey(prev => prev + 1);
     }
   };
   ```

### Common Use Cases

#### Use Case 1: Group Management
- **Parent**: `GroupManagement.tsx`
- **List**: `GroupList.tsx`
- **Editor**: `GroupEditor.tsx`
- **Trigger**: After saving group or adding/removing members
- **Result**: Member count updates immediately in group cards

#### Use Case 2: Template Management
- **Parent**: `TemplateManagement.tsx`
- **List**: `TemplateList.tsx`
- **Editor**: `TemplateEditor.tsx`
- **Trigger**: After creating, updating, or archiving templates
- **Result**: Template status and counts update immediately

#### Use Case 3: Rule Management
- **Parent**: `RuleManagement.tsx`
- **List**: `RuleList.tsx`
- **Editor**: `RuleEditor.tsx`
- **Trigger**: After saving, activating, or deleting rules
- **Result**: Rule list reflects changes instantly

### Best Practices

1. **Use Increment Pattern**: Always use `setRefreshKey(prev => prev + 1)` instead of `setRefreshKey(refreshKey + 1)` to avoid stale closure issues

2. **Optional Prop**: Make `refreshKey` optional in child components for backward compatibility
   ```typescript
   refreshKey?: number;
   ```

3. **Check Before Reload**: In child component, check if refreshKey is defined and greater than 0
   ```typescript
   if (refreshKey !== undefined && refreshKey > 0) {
     loadData();
   }
   ```

4. **Single Responsibility**: RefreshKey should only trigger data reload, not change UI state

5. **Combine with Toast**: Use toast notifications alongside refreshKey for complete user feedback
   ```typescript
   const handleSaved = () => {
     toast.success('Group updated successfully!');
     setRefreshKey(prev => prev + 1);
   };
   ```

6. **Don't Overuse**: Only use for parent-child relationships. If components are siblings, use a shared state manager or context instead

### Common Mistakes to Avoid

❌ **DON'T** reload on every refreshKey change:
```typescript
// BAD - reloads even when refreshKey is 0 initially
useEffect(() => {
  loadData();
}, [refreshKey]);
```

✅ **DO** check if refreshKey is valid:
```typescript
// GOOD - only reloads when intentionally incremented
useEffect(() => {
  if (refreshKey !== undefined && refreshKey > 0) {
    loadData();
  }
}, [refreshKey]);
```

❌ **DON'T** use direct value:
```typescript
// BAD - can cause stale closure issues
setRefreshKey(refreshKey + 1);
```

✅ **DO** use function form:
```typescript
// GOOD - always uses latest value
setRefreshKey(prev => prev + 1);
```

❌ **DON'T** forget to pass the prop:
```typescript
// BAD - forgot refreshKey
<ListComponent onEdit={handleEdit} />
```

✅ **DO** pass refreshKey prop:
```typescript
// GOOD
<ListComponent onEdit={handleEdit} refreshKey={refreshKey} />
```

### Testing RefreshKey Implementation

To verify refreshKey works correctly:

1. Open the component in browser
2. Perform a create/update operation (e.g., add member to group)
3. Close the modal/editor
4. **Verify**: List should update immediately without F5
5. **Check**: Updated data should be visible (e.g., member count increases)
6. **Confirm**: No manual refresh required

### Components Using RefreshKey Pattern

Current implementations:
- ✅ `GroupManagement.tsx` → `GroupList.tsx`
- 🔜 `TemplateManagement.tsx` → `TemplateList.tsx` (recommended)
- 🔜 `RuleManagement.tsx` → `RuleList.tsx` (recommended)
- 🔜 Any component with create/edit modals and list views

---

## Adding New Features

### ⚠️ Critical Checklist for New Features

When adding any new functional module, component, or major feature to PQMAP, follow this comprehensive checklist to ensure proper integration with all systems.

---

### 1. **User Management & Permissions** ⭐ MUST DO

**Why**: Every new feature needs proper access control to maintain security and user experience.

**Steps**:

1. **Add Module to Permission System**  
   📁 File: `src/services/userManagementService.ts`
   
   ```typescript
   // Add to systemModules array
   export const systemModules: SystemModule[] = [
     // ... existing modules
     { 
       id: 'yourNewModule',              // Unique ID (camelCase)
       name: 'Your New Module',          // Display name
       description: 'Brief description', // What it does
       category: 'Core'                  // See categories below
     }
   ];
   ```

2. **Choose Appropriate Category**:
   - `Core` - Essential system functions (dashboards, events, assets)
   - `Analytics` - Analysis and reporting features
   - `Reporting` - Report generation
   - `Services` - External integrations
   - `Administration` - System management
   - `Data Maintenance` - Data configuration tools

3. **Set Default Permissions** (Optional - auto-generated if not specified):
   ```typescript
   // Manual Implementator example - restrict certain actions
   manual_implementator: systemModules.map((module, index) => {
     // Add your module to restriction lists if needed
     const restrictedModules = ['userManagement', 'systemSettings', 'yourNewModule'];
     const noDeleteModules = ['events', 'assets', 'yourNewModule'];
     
     let permissions: PermissionAction[] = ['read'];
     
     if (restrictedModules.includes(module.id)) {
       permissions = ['read'];  // Read-only
     } else if (noDeleteModules.includes(module.id)) {
       permissions = ['create', 'read', 'update'];  // No delete
     } else {
       permissions = ['create', 'read', 'update', 'delete'];  // Full access
     }
     
     return { ...permission_object, permissions };
   })
   ```

4. **Default Permissions by Role** (if not customized):
   - `system_admin`: Create, Read, Update, Delete
   - `system_owner`: Create, Read, Update, Delete
   - `manual_implementator`: Create, Read, Update (no Delete)
   - `watcher`: Read only

---

### 2. Navigation Integration

**Add to Sidebar**:  
📁 File: `src/components/Navigation.tsx`

```typescript
// For main navigation
const menuItems = [
  // ... existing items
  { id: 'yourNewModule', icon: YourIcon, label: 'Your Module' }
];

// OR for Data Maintenance section
const dataMaintenanceItems = [
  { id: 'userManagement', icon: Users, label: 'User Management' },
  { id: 'yourNewModule', icon: YourIcon, label: 'Your Module' },
  // ... other items
];
```

**Add Route**:  
📁 File: `src/App.tsx`

```typescript
import YourNewModule from './components/YourNewModule';

// In AppContent component
{currentView === 'yourNewModule' && <YourNewModule />}
```

---

### 3. Database Schema (if needed)

**Create Migration**:  
📁 Location: `supabase/migrations/`

```sql
-- Example: 20260105000000_create_your_table.sql
CREATE TABLE your_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- your fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Policies (example)
CREATE POLICY "Users can view their own data"
  ON your_table FOR SELECT
  USING (auth.uid() = user_id);
```

**Update Types**:  
📁 File: `src/types/database.ts`

```typescript
export interface YourNewInterface {
  id: string;
  // your fields
  created_at: string;
  updated_at: string;
}
```

---

### 4. Service Layer (Recommended)

**Create Service File**:  
📁 File: `src/services/yourModuleService.ts`

```typescript
import { supabase } from '../lib/supabase';
import type { YourNewInterface } from '../types/database';

export async function fetchYourData(): Promise<YourNewInterface[]> {
  const { data, error } = await supabase
    .from('your_table')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createYourData(input: Partial<YourNewInterface>): Promise<YourNewInterface> {
  const { data, error } = await supabase
    .from('your_table')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ... more CRUD functions
```

---

### 5. Export/Import (if applicable)

**Follow Standard Patterns**:

- **Export**: Add Excel/CSV/PDF export using `exportService.ts`
- **Import**: Implement 4-component import pattern (see [Import Functionality](#import-functionality))
  - Import button with dropdown
  - Template download function
  - CSV validation
  - Results modal

---

### 6. Documentation Updates

**Required Files**:

1. **PROJECT_FUNCTION_DESIGN.md**  
   📁 `Artifacts/PROJECT_FUNCTION_DESIGN.md`
   
   Add new section under "Core Functional Modules":
   ```markdown
   ### X. Your New Module ✨ NEW (Date)
   
   **Purpose**: Brief description
   
   **Location**: Navigation path
   
   #### Sub-Modules (if any)
   
   #### Key Features
   
   #### Data Structure
   
   #### Component Files
   ```

2. **STYLES_GUIDE.md** (if new UI patterns)  
   📁 `Artifacts/STYLES_GUIDE.md`
   
   Document any new:
   - Button patterns
   - Modal designs
   - Custom components
   - Export/import implementations

---

### 7. Testing Checklist

Before considering feature complete:

- [ ] All TypeScript errors resolved
- [ ] Component renders without errors
- [ ] Navigation works from sidebar
- [ ] Permissions enforced (test with different roles)
- [ ] Export functions work (if applicable)
- [ ] Import validation catches errors (if applicable)
- [ ] Mobile responsive design verified
- [ ] Loading states display properly
- [ ] Error handling tested
- [ ] Database queries optimized
- [ ] RLS policies correct
- [ ] Documentation updated

---

### Quick Reference: Files to Update

| Task | Files to Modify |
|------|----------------|
| **Permissions** | `src/services/userManagementService.ts` |
| **Navigation** | `src/components/Navigation.tsx`, `src/App.tsx` |
| **Database** | `supabase/migrations/*.sql`, `src/types/database.ts` |
| **Service** | `src/services/yourModuleService.ts` |
| **Component** | `src/components/YourModule.tsx` |
| **Documentation** | `Artifacts/PROJECT_FUNCTION_DESIGN.md`, `Artifacts/STYLES_GUIDE.md` |

---

### Common Pitfalls to Avoid

1. ❌ **Forgetting permissions** - Every module needs permission configuration
2. ❌ **Inconsistent naming** - Use camelCase for IDs, proper case for display names
3. ❌ **Missing error handling** - Always handle API errors gracefully
4. ❌ **No loading states** - Users need feedback during async operations
5. ❌ **Skipping documentation** - Future developers (including you) need context
6. ❌ **Not testing with different roles** - Permissions must work correctly
7. ❌ **Breaking existing patterns** - Follow established UI/UX conventions
8. ❌ **Ignoring mobile** - All features should be responsive

---

### Example: Complete Feature Addition

**Scenario**: Adding a "Data Quality" module to monitor data integrity

```typescript
// 1. Add to userManagementService.ts
{ 
  id: 'dataQuality',
  name: 'Data Quality',
  description: 'Monitor data integrity and completeness',
  category: 'Administration'
}

// 2. Add to Navigation.tsx
{ id: 'dataQuality', icon: CheckCircle, label: 'Data Quality' }

// 3. Add to App.tsx
import DataQuality from './components/DataQuality';
{currentView === 'dataQuality' && <DataQuality />}

// 4. Create component: src/components/DataQuality.tsx
// 5. Create service: src/services/dataQualityService.ts
// 6. Update database.ts types
// 7. Document in PROJECT_FUNCTION_DESIGN.md
```

---

**Remember**: This checklist ensures consistency, maintainability, and proper integration with PQMAP's permission system. Following these steps prevents technical debt and makes the codebase easier to understand and extend.

---

## PSBG Cause Management Modal Pattern

**IMPORTANT RULE**: PSBG cause options should be managed through a dedicated modal that allows adding new options while preventing deletion of options currently in use.

### Standard Implementation

**Component**: `PSBGConfigModal.tsx`  
**Use Case**: Managing PSBG cause dropdown options in event detail forms

#### Modal Structure

```tsx
import { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertTriangle } from 'lucide-react';

interface PSBGConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: string[]) => void;
  currentOptions: string[];
  usedOptions: string[]; // Options currently selected in events
}

export default function PSBGConfigModal({
  isOpen,
  onClose,
  onSave,
  currentOptions,
  usedOptions
}: PSBGConfigModalProps) {
  const [options, setOptions] = useState<string[]>(currentOptions);
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    if (isOpen) {
      setOptions(currentOptions);
      setNewOption('');
    }
  }, [isOpen, currentOptions]);

  const handleAddOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (optionToRemove: string) => {
    if (usedOptions.includes(optionToRemove)) {
      alert(`Cannot delete "${optionToRemove}" because it is currently used in events.`);
      return;
    }
    setOptions(options.filter(opt => opt !== optionToRemove));
  };

  const handleSave = () => {
    onSave(options);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Manage PSBG Causes</h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Add New Option */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Add New PSBG Cause
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddOption()}
                placeholder="Enter new cause..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddOption}
                disabled={!newOption.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Current Options */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Current PSBG Causes ({options.length})
            </label>
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
              {options.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  No PSBG causes configured
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {options.map((option, index) => {
                    const isUsed = usedOptions.includes(option);
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">
                            {option}
                          </span>
                          {isUsed && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              In Use
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveOption(option)}
                          disabled={isUsed}
                          className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title={isUsed ? 'Cannot delete - currently used in events' : 'Delete option'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Usage Warning */}
          {usedOptions.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Options in use cannot be deleted</p>
                  <p className="mt-1">
                    {usedOptions.length} option{usedOptions.length !== 1 ? 's' : ''} currently selected in events.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### Key Features

1. **Add New Options**: Input field with add button for new PSBG causes
2. **Delete Protection**: Options currently used in events cannot be deleted
3. **Visual Indicators**: "In Use" badges for options that cannot be removed
4. **Usage Warning**: Alert showing how many options are protected
5. **Immediate Feedback**: Enter key support for quick adding

#### Usage in Event Detail Form

```tsx
// In EventDetail.tsx or similar component
const [showPSBGConfig, setShowPSBGConfig] = useState(false);
const [psbgOptions, setPsbgOptions] = useState<string[]>([
  'VEGETATION',
  'DAMAGED BY THIRD PARTY', 
  'UNCONFIRMED',
  'ANIMALS, BIRDS, INSECTS'
]);
const [usedPsbgOptions, setUsedPsbgOptions] = useState<string[]>([]);

// Load used options (options currently selected in events)
useEffect(() => {
  const loadUsedOptions = async () => {
    const { data } = await supabase
      .from('pq_events')
      .select('psbg_cause')
      .not('psbg_cause', 'is', null);
    
    const used = [...new Set(data?.map(d => d.psbg_cause).filter(Boolean) || [])];
    setUsedPsbgOptions(used);
  };
  
  loadUsedOptions();
}, []);

// PSBG Cause field with config button
<div className="flex items-center gap-2">
  <select
    value={event.psbg_cause || ''}
    onChange={(e) => handlePsbgCauseChange(e.target.value)}
    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
  >
    <option value="">Select PSBG Cause</option>
    {psbgOptions.map(option => (
      <option key={option} value={option}>{option}</option>
    ))}
  </select>
  <button
    onClick={() => setShowPSBGConfig(true)}
    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
    title="Manage PSBG Cause Options"
  >
    <Settings className="w-5 h-5" />
  </button>
</div>

// Config Modal
{showPSBGConfig && (
  <PSBGConfigModal
    isOpen={showPSBGConfig}
    onClose={() => setShowPSBGConfig(false)}
    onSave={setPsbgOptions}
    currentOptions={psbgOptions}
    usedOptions={usedPsbgOptions}
  />
)}
```

#### Styling Guidelines

- **Modal Size**: `max-w-md` (medium modal for focused task)
- **Header Gradient**: Blue gradient matching other config modals
- **Delete Button**: Red color, disabled state when option is in use
- **In Use Badge**: Green badge to indicate protected status
- **Warning Alert**: Yellow background for important information
- **Scrollable List**: `max-h-64` for option list with overflow handling

---

**End of Styles Guide**