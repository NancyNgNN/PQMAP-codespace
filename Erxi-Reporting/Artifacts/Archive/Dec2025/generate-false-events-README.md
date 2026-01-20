# Generate False Events SQL Script

## Purpose
This script generates 5 demonstration false events with characteristics that indicate false detections:
- **Very short duration**: < 100ms (35-52ms range)
- **High remaining voltage**: > 95% (96.8-98.5% range)
- **Zero customer impact**: No customers affected
- **Low severity**: All marked as low severity

## How to Run

### Option 1: Using Supabase CLI
```bash
supabase db execute --file generate-false-events.sql
```

### Option 2: Using psql directly
```bash
psql -h your-db-host -U your-username -d your-database -f generate-false-events.sql
```

### Option 3: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `generate-false-events.sql`
4. Paste and run

## Generated Events

The script creates 5 false events across different substations:

| Event | Substation | Code | Duration | Remaining Voltage | Days Ago |
|-------|------------|------|----------|-------------------|----------|
| 1 | Airport 'A' | APA | 45ms | 97.5% | 2 days |
| 2 | Beacon Hill | BCH | 38ms | 98.2% | 4 days |
| 3 | Canton Road | CAN | 52ms | 96.8% | 5 days |
| 4 | Boundary Street | BOU | 42ms | 97.9% | 6 days |
| 5 | Chuk Yuen | CHY | 35ms | 98.5% | 7 days |

## Verification

After running the script, verify the events were created:

```sql
SELECT 
  id,
  event_type,
  timestamp,
  duration_ms,
  remaining_voltage,
  false_event,
  validated_by_adms,
  (SELECT code FROM substations WHERE id = substation_id) as substation_code
FROM pq_events
WHERE false_event = true
  AND remarks LIKE '%Auto-generated false event for demonstration%'
ORDER BY timestamp DESC;
```

## Features Demonstrated

These false events are perfect for demonstrating:

1. **"Show false events only" filter** in EventManagement
2. **"Convert to Standalone Event" button** in Event Details (Overview tab)
3. **Timeline tracking** of false event marking and conversion
4. **False event badge** in event list

## Cleanup (Optional)

To remove the demonstration false events:

```sql
DELETE FROM pq_events
WHERE false_event = true
  AND remarks LIKE '%Auto-generated false event for demonstration%';
```

## Notes

- All events are marked with `false_event = true` and `validated_by_adms = true` (required by database constraint)
- Events are spread over the last 7 days for realistic demonstration
- Each event has detailed remarks explaining why it was flagged as false
- Zero customer impact reinforces the false detection pattern
