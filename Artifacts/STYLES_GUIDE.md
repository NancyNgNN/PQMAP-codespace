# PQMAP Styles Guide

**Version:** 1.3  
**Last Updated:** December 19, 2025  
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

#### 1. Required State Variables

```typescript
// Sort states
const [sortField, setSortField] = useState<string>('id'); // Default sort field
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
```

#### 2. Sort Handler Function

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

#### 3. Apply Sorting Logic

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

#### 4. Sortable Table Headers

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

#### 5. Non-Sortable Headers (Actions, etc.)

```tsx
<th className="py-3 px-2 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
  Actions
</th>
```

### Sorting Best Practices

1. **Default Sort**: Choose a sensible default sort field (e.g., 'id', 'name', 'timestamp')
2. **Visual Indicators**: Always show sort direction with icons
   - `ArrowUp`: Ascending sort on this column
   - `ArrowDown`: Descending sort on this column
   - `ArrowUpDown` (opacity-30): Column is sortable but not currently sorted
3. **Reset Pagination**: Always reset to page 1 when sort changes
4. **Case Insensitive**: Convert strings to lowercase for consistent sorting
5. **Handle Nulls**: Provide fallback values for null/undefined fields
6. **Special Cases**: Handle dates, joins, and computed values with switch statement
7. **Icon Size**: Use `w-3 h-3` for sort icons in table headers
8. **Hover Effect**: Add `hover:text-blue-600` to sortable header buttons
9. **Button Styling**: Use `flex items-center gap-1` for proper icon alignment
10. **Non-Sortable Columns**: Don't add sort buttons to action columns or non-data columns

### Complete Example

**AssetManagement.tsx** provides a complete implementation of table sorting:
- 12 sortable columns (Meter ID, Site ID, Voltage Level, Substation, Circuit, Area, Location, SS400, SS132, SS011, Status)
- 1 non-sortable column (Actions)
- Handles joined data (Substation name lookup)
- Integrates with filtering and pagination
- Proper icon indicators for all states

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

**End of Styles Guide**
