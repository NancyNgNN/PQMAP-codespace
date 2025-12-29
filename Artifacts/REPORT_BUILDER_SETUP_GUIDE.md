# Report Builder Setup Guide

## Overview
The Report Builder provides Power BI-like capabilities for creating custom reports with pivot tables, charts, calculated fields, and data export.

## Installation

### 1. Install Dependencies

```bash
npm install react-pivottable plotly.js react-plotly.js xlsx jspdf jspdf-autotable
```

### 2. Install Type Definitions

```bash
npm install --save-dev @types/react-pivottable @types/plotly.js
```

### 3. Apply Database Migration

Run the SQL migration to create the `saved_reports` table:

```bash
# If using Supabase CLI
supabase db push

# Or manually apply the migration file:
# supabase/migrations/20250101000000_create_saved_reports.sql
```

### 4. Add CSS for react-pivottable

Add to `src/index.css` or your main CSS file:

```css
@import 'react-pivottable/pivottable.css';
```

## Features Implemented

### ✅ Pivot Table & Charts
- **10 Chart Types**: Table, Bar, Line, Pie, Scatter, Area, Heatmap, Box Plot, Stacked Bar, Stacked Area
- **Drag-and-Drop Interface**: Users can drag fields to rows/columns/values
- **20+ Aggregations**: Count, Sum, Average, Median, Min, Max, StdDev, Variance, etc.

### ✅ Calculated Fields
- **Custom Expressions**: Create fields using `[Field Name]` syntax
- **Operators**: +, -, *, /, parentheses for complex calculations
- **Examples**:
  - Duration in hours: `[duration_ms] / 3600000`
  - Cost calculation: `[duration_ms] / 1000 * 0.05`
  - Conditional: `[severity] === 'Critical' ? 100 : 0`

### ✅ Filters
- **Date Filters**: 13 presets (Today, Last 7 Days, This Month, Last 3 Years, Custom Range, etc.)
- **Event Type**: Multi-select checkbox filter
- **Severity**: Critical, Warning, Info filters
- **False Events**: Include/exclude toggle

### ✅ Auto-Refresh
- **Intervals**: 1, 5, 15, 30, 60 minutes
- **Manual Refresh**: Refresh button
- **Automatic**: Fetches new data from Supabase at specified interval

### ✅ Export
- **Excel (XLSX)**: Full dataset export with formatting
- **PDF**: Formatted table export with headers

### ✅ Save & Share
- **Save Reports**: Store report configurations to database
- **Load Reports**: Quick access to saved reports
- **Share with Users**: Select specific users to share with
- **Sharing Controls**: View shared reports, manage access

## Usage

### Adding Report Builder to Dashboard

The widget is already integrated:
- Widget ID: `'report-builder'`
- Title: "Report Builder"
- Default size: Full width
- Locked: Yes (cannot be resized)

To add to default layouts, update `src/types/dashboard.ts`:

```typescript
export const DEFAULT_LAYOUTS: Record<string, DashboardLayout> = {
  admin: {
    version: '1.0',
    widgets: [
      // ... existing widgets ...
      { id: 'report-builder', col: 0, row: 7, width: 12, visible: true },
    ],
  },
  // ... other roles ...
};
```

### Creating a Report

1. **Select Date Range**: Choose preset or custom date range
2. **Apply Filters**: Select event types, severity levels
3. **Drag Fields**: Drag fields to Rows, Columns, or Values areas
4. **Choose Aggregation**: Select how to aggregate data (Count, Sum, Average, etc.)
5. **Select Chart Type**: Choose visualization (Table, Bar, Line, etc.)
6. **Add Calculated Fields** (optional): Create custom calculations
7. **Save Report**: Give it a name and save for later use
8. **Share** (optional): Share with other users

### Calculated Field Examples

**Duration in Hours:**
```
[duration_ms] / 3600000
```

**Cost Calculation:**
```
[affected_customers] * [duration_ms] / 1000 * 0.05
```

**Severity Score:**
```
[severity] === 'Critical' ? 100 : ([severity] === 'Warning' ? 50 : 10)
```

**Downtime in Minutes:**
```
[duration_ms] / 60000
```

## Power BI Integration (Phase 2)

### Option 1: Direct Embedding (Recommended for Internal Users)

**Requirements:**
- Power BI Pro license per user (you have 100)
- Azure AD authentication
- Power BI workspace setup

**Implementation:**
```bash
npm install @microsoft/powerbi-client-react powerbi-client
```

Create `PowerBIEmbed.tsx`:
```typescript
import { PowerBIEmbed } from 'powerbi-client-react';
import { models } from 'powerbi-client';

export default function PowerBIEmbed({ embedUrl, accessToken }) {
  return (
    <PowerBIEmbed
      embedConfig={{
        type: 'report',
        embedUrl: embedUrl,
        accessToken: accessToken,
        tokenType: models.TokenType.Aad,
        settings: {
          panes: {
            filters: { expanded: false, visible: true },
          },
        },
      }}
      cssClassName="power-bi-frame"
    />
  );
}
```

### Option 2: Push Data to Power BI (Recommended for Your Use Case)

**Advantages:**
- Better performance (pre-aggregated data)
- More control over data freshness
- Works with existing Pro licenses
- Can schedule 15-minute updates

**Implementation Steps:**

1. **Create Power BI Dataset via REST API:**
```typescript
// Create dataset schema
const dataset = {
  name: "PQMAP Events",
  tables: [{
    name: "Events",
    columns: [
      { name: "EventID", dataType: "string" },
      { name: "EventDate", dataType: "DateTime" },
      { name: "Severity", dataType: "string" },
      { name: "Duration", dataType: "Int64" },
      { name: "AffectedCustomers", dataType: "Int64" },
      // ... other fields
    ]
  }]
};

// POST to Power BI API
await fetch('https://api.powerbi.com/v1.0/myorg/datasets', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(dataset)
});
```

2. **Push Data on Schedule:**
```typescript
// Every 15 minutes via cron job or serverless function
const events = await supabase.from('pq_events').select('*');

await fetch(`https://api.powerbi.com/v1.0/myorg/datasets/${datasetId}/tables/Events/rows`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ rows: events.data })
});
```

3. **Embed Report:**
Use the same PowerBIEmbed component as Option 1

### Authentication Setup (Azure AD SSO)

1. **Register App in Azure AD:**
   - Go to Azure Portal > App Registrations
   - New Registration: "PQMAP Power BI"
   - Redirect URI: Your app URL
   - API Permissions: Power BI Service > Report.Read.All, Dataset.ReadWrite.All

2. **Implement SSO:**
```typescript
import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: 'YOUR_CLIENT_ID',
    authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID',
    redirectUri: window.location.origin,
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

// Login
const loginResponse = await msalInstance.loginPopup({
  scopes: ['https://analysis.windows.net/powerbi/api/.default']
});

// Get token for API calls
const tokenResponse = await msalInstance.acquireTokenSilent({
  scopes: ['https://analysis.windows.net/powerbi/api/.default']
});
```

## Testing Power BI Embedding

You can test with your existing Power BI Pro account:

1. **Create Test Report in Power BI Desktop**
2. **Publish to Power BI Service**
3. **Get Embed URL:**
   - Open report in Power BI Service
   - File > Embed > Website or Portal
   - Copy embed URL
4. **Test in PQMAP:**
   - Add embed URL to PowerBIEmbed component
   - Authenticate with your Pro account
   - Verify report loads correctly

## Security Considerations

### Calculated Fields
Current implementation uses `eval()` for expression evaluation. For production:

**Option 1: Use a Safe Expression Parser**
```bash
npm install expr-eval
```

```typescript
import { Parser } from 'expr-eval';

const evaluateExpression = (expr: string, context: any) => {
  try {
    const parser = new Parser();
    return parser.evaluate(expr, context);
  } catch (error) {
    console.error('Expression error:', error);
    return null;
  }
};
```

**Option 2: Use jexl**
```bash
npm install jexl
```

```typescript
import jexl from 'jexl';

const evaluateExpression = (expr: string, context: any) => {
  try {
    return jexl.evalSync(expr, context);
  } catch (error) {
    console.error('Expression error:', error);
    return null;
  }
};
```

### Row-Level Security (RLS)

Supabase RLS policies are already configured for `saved_reports` table:
- Users can only view their own reports
- Users can view reports shared with them
- Users can view public reports
- Only report owners can modify/delete

### Data Export Limits

Consider adding limits to prevent large exports:

```typescript
const MAX_EXPORT_ROWS = 10000;

const handleExportExcel = () => {
  if (filteredEvents.length > MAX_EXPORT_ROWS) {
    alert(`Export limited to ${MAX_EXPORT_ROWS} rows. Please apply filters.`);
    return;
  }
  // ... existing export code
};
```

## Performance Optimization

### 1. Lazy Loading
Report Builder is already lazy-loaded when widget is rendered

### 2. Memoization
All expensive calculations use `useMemo`:
- `filteredEvents`: Only recalculates when filters change
- `pivotData`: Only recalculates when events or calculated fields change

### 3. Database Indexing
Ensure these indexes exist:
```sql
CREATE INDEX idx_pq_events_event_date ON pq_events(event_date);
CREATE INDEX idx_pq_events_severity ON pq_events(severity);
CREATE INDEX idx_pq_events_event_type ON pq_events(event_type);
CREATE INDEX idx_pq_events_false_event ON pq_events(false_event);
```

### 4. Query Optimization
Use Supabase query filters:
```typescript
const { data } = await supabase
  .from('pq_events')
  .select('*')
  .gte('event_date', startDate)
  .lte('event_date', endDate)
  .in('severity', selectedSeverities)
  .limit(5000);
```

## Troubleshooting

### Issue: Pivot table not rendering
**Solution**: Ensure CSS is imported:
```css
@import 'react-pivottable/pivottable.css';
```

### Issue: Charts not displaying
**Solution**: Check plotly.js installation and import

### Issue: Export fails
**Solution**: Check browser console for errors, verify xlsx/jspdf packages installed

### Issue: Calculated fields not working
**Solution**: Check expression syntax, ensure field names match exactly with brackets

### Issue: Reports not saving
**Solution**: Verify `saved_reports` table exists and RLS policies are correct

## Next Steps

1. ✅ Install dependencies
2. ✅ Apply database migration
3. ✅ Add Report Builder to default layouts
4. ✅ Test basic functionality
5. ⏳ Implement safer expression evaluation (Optional)
6. ⏳ Set up Power BI integration (Phase 2)
7. ⏳ Add export row limits (Recommended)
8. ⏳ Create user documentation

## Support

For issues or questions:
1. Check Supabase console for database errors
2. Check browser console for JavaScript errors
3. Review migration logs for SQL errors
4. Test with sample data first
