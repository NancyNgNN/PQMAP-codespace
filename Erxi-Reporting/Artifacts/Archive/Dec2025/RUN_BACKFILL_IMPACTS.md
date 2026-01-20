# Run Backfill for Customer Impacts

## Problem
Your event `61dd3e52` shows `customer_count = 56` but the Customer Impact tab is empty because there are no records in the `event_customer_impact` table.

## Root Cause
Historical events (created before the auto-generation trigger) don't have detailed customer impact records. The trigger only works for NEW events inserted after the migration was run.

## Solution
Run the backfill script to generate customer impact records for all existing events.

## Prerequisites ✅
- ✅ `customer_transformer_matching` table exists and is populated (you just ran this!)
- ✅ Events have `substation_id` and `circuit_id` values (you just updated these!)
- ✅ `generate_customer_impacts_for_event()` function exists

## Steps to Run Backfill

### Option 1: Via Supabase SQL Editor (Recommended)
1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy the contents of `scripts/backfill_customer_impacts.sql`
4. Paste and click **Run**
5. Wait for completion (may take 1-5 minutes depending on event count)

### Option 2: Via psql Command Line
```bash
psql "postgresql://postgres.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f scripts/backfill_customer_impacts.sql
```

### Option 3: Via Supabase CLI
```bash
supabase db execute -f scripts/backfill_customer_impacts.sql
```

## Expected Output
You should see output like:
```
=== BACKFILL CUSTOMER IMPACTS - STARTED ===
Total events in database: 150
Events with substation + circuit: 145
Active customer mappings found: 250
Starting backfill process...

Progress: 100 customer impacts generated so far...
Progress: 200 customer impacts generated so far...
...

=== BACKFILL COMPLETE ===
Total customer impacts generated: 8,400
Average impacts per event: 58.00
```

## Verification Queries

After running the backfill, verify it worked:

```sql
-- Check if impacts were created for your specific event
SELECT COUNT(*) as impact_count
FROM event_customer_impact
WHERE event_id = '61dd3e52-94ed-4370-9f68-94453c09ca6b';

-- Should return: impact_count = 56 (or similar)

-- Check sample records with customer names
SELECT 
  eci.id,
  c.name as customer_name,
  c.account_number,
  eci.impact_level,
  eci.estimated_downtime_min
FROM event_customer_impact eci
JOIN customers c ON eci.customer_id = c.id
WHERE eci.event_id = '61dd3e52-94ed-4370-9f68-94453c09ca6b'
LIMIT 5;
```

## After Backfill
1. Refresh your browser (clear cache if needed)
2. Navigate to Event Management
3. Click on event `61dd3e52`
4. Open the **Customer Impact** tab
5. You should now see customer names, addresses, and impact details! 🎉

## Troubleshooting

### If backfill says "No active mappings found"
This means the `customer_transformer_matching` table is empty. Run:
```sql
SELECT COUNT(*) FROM customer_transformer_matching WHERE active = true;
```

If it returns 0, you need to re-run the circuit update migration:
```sql
-- Re-run the mapping generation
-- (from migration 20251215160000_update_circuit_ids_h1_h2_h3.sql)
```

### If some events still have no impacts
Check if those events have NULL values:
```sql
SELECT id, substation_id, circuit_id, customer_count
FROM pq_events
WHERE id = '61dd3e52-94ed-4370-9f68-94453c09ca6b';
```

Both `substation_id` and `circuit_id` must be non-NULL for the backfill to work.

---

**Next Step:** Run the backfill script now! 🚀
