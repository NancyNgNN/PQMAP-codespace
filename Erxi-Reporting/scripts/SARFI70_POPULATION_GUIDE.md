# SARFI-70 Data Population Guide

## Overview
This script populates SARFI-70 values for all voltage_dip mother events with realistic data patterns to demonstrate the SARFI-70 KPI Monitoring dashboard.

## Data Characteristics

### Value Ranges
- **Range**: 0.001 to 0.1
- **Jan-June**: Lower values (0.001 to 0.03) - normal operation period
- **Jul-Dec**: Higher values (0.03 to 0.1) - summer/typhoon season with more severe events

### Testing Features
- **10 NULL values**: Distributed evenly across the dataset to test the "show 0" functionality
- **Seasonal variation**: Clear pattern showing higher SARFI-70 after June
- **Year-over-year trends**: Data allows for demonstrating improvement or degradation trends

## How to Run

### Option 1: Supabase SQL Editor (Recommended)
1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire content of `/scripts/populate-sarfi70-values.sql`
4. Paste into the SQL Editor
5. Click **Run** button
6. Watch the output for progress notifications and summary

### Option 2: psql Command Line
```bash
psql YOUR_DATABASE_CONNECTION_STRING < scripts/populate-sarfi70-values.sql
```

### Option 3: Supabase CLI
```bash
supabase db execute scripts/populate-sarfi70-values.sql
```

## Expected Output

The script will display:
- Progress notifications every 50 events
- NULL value assignments (10 total)
- Final summary with counts

Example output:
```
NOTICE:  Starting SARFI-70 population for voltage_dip mother events...
NOTICE:  Event 47 [...]: Set to NULL for testing (1 of 10)
NOTICE:  Processed 50 events...
NOTICE:  Processed 100 events...
...
NOTICE:  ==============================================
NOTICE:  SARFI-70 Population Complete!
NOTICE:  Total events updated: 480
NOTICE:  Events with NULL values: 10
NOTICE:  Events with SARFI-70 values: 470
NOTICE:  ==============================================
```

## Verification Queries

The script includes several verification queries that run automatically:

### 1. Distribution by Year and Month
Shows monthly totals, averages, min/max values, and NULL counts.

### 2. Overall Statistics
Summary of all SARFI-70 values with counts and statistical measures.

### 3. Seasonal Comparison
Compares Jan-Jun (lower) vs Jul-Dec (higher) patterns.

### 4. Sample Events
Shows first 20 events with their SARFI-70 values and categorization.

### 5. Year-over-Year Trend
Displays annual totals and indicates if trends are improving (📉) or degrading (📈).

## What to Expect in the Dashboard

After running this script, the SARFI-70 Monitor dashboard will show:

### Three Stacked Charts (2023, 2024, 2025)
- Each year displayed separately for easy comparison
- Yellow line for 2023
- Blue line for 2024
- Dark blue line for 2025

### Clear Seasonal Patterns
- Lower values Jan-June
- Higher values Jul-Dec (visible spike after June)

### Interactive Data Points
- Click any point to see all events for that month
- SARFI-70 column shows values with 4 decimal places
- NULL values display as "0.0000"

### Demonstration of Trends
The data will clearly show whether power quality is:
- **Improving**: Total SARFI-70 decreasing year over year
- **Degrading**: Total SARFI-70 increasing year over year
- **Fluctuating**: Seasonal patterns with year-to-year variations

## Re-running the Script

The script is **idempotent** - it can be run multiple times safely:
- Each run will overwrite existing SARFI-70 values
- NULL assignments will be redistributed (different events each time due to randomness)
- Data patterns will remain consistent (seasonal variation preserved)

## Troubleshooting

### No Events Found
If output shows 0 events updated:
```sql
-- Check if voltage_dip mother events exist
SELECT COUNT(*) 
FROM pq_events 
WHERE event_type = 'voltage_dip' 
  AND is_mother_event = TRUE 
  AND false_event = FALSE;
```

### Verify SARFI-70 Values
```sql
-- Quick check
SELECT 
  COUNT(*) AS total,
  COUNT(sarfi_70) AS with_values,
  MIN(sarfi_70) AS min_val,
  MAX(sarfi_70) AS max_val
FROM pq_events
WHERE event_type = 'voltage_dip'
  AND is_mother_event = TRUE;
```

### Reset All SARFI-70 Values (if needed)
```sql
UPDATE pq_events
SET sarfi_70 = NULL
WHERE event_type = 'voltage_dip'
  AND is_mother_event = TRUE;
```

## Performance Notes

- Script processes events sequentially
- Typical execution time: 2-5 seconds for 500 events
- Progress notifications every 50 events
- No impact on other database operations

## Next Steps

After running the script:
1. Refresh your dashboard to see updated data
2. Explore the three stacked charts showing 2023-2025 trends
3. Click data points to view monthly event details
4. Export charts as PNG for reports or presentations

---

**Created**: December 11, 2025  
**Purpose**: SARFI-70 KPI Monitoring Dashboard Data Population  
**Pattern**: Seasonal variation with higher values after June (0.001-0.1 range)
