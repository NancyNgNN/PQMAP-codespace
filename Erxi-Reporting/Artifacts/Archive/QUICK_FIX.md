# 🎯 Quick Fix Reference Card

## Your Error
```
Error: Failed to run sql query: ERROR: 42703: 
column "voltage_level" of relation "pq_meters" does not exist
```

---

## Why It Happens
❌ **Migration file exists but NOT executed in database**
- File location: `supabase/migrations/20251209000001_add_sarfi_columns.sql`
- Database status: Missing 8 columns (2 in pq_meters, 6 in pq_events)
- TypeScript expects these columns → Runtime errors

---

## Quick Fix (2 Steps)

### 1️⃣ Apply Migration (1 minute)

**Supabase Dashboard → SQL Editor → New Query**

Copy & Paste & Run:
```
📁 supabase/migrations/20251209000001_add_sarfi_columns.sql
```

✅ Success: "Success. No rows returned"

---

### 2️⃣ Run Seed Script (1 minute)

**Same SQL Editor → New Query**

Copy & Paste & Run:
```
📁 seed-sarfi-data.sql
```

✅ Success: "SARFI Data Seeding Complete! ✅"

---

## Verify It Worked

```sql
-- Check meters created (should return 8)
SELECT COUNT(*) FROM pq_meters WHERE meter_id LIKE 'MTR-SARFI-%';

-- Check columns exist (should return 2)
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'pq_meters' 
AND column_name IN ('meter_type', 'voltage_level');
```

---

## View Your Data

1. Dashboard → SARFI Metrics Trend Chart
2. Click Settings ⚙️
3. Select "2025 Standard Profile"
4. ✓ Check "Show Data Table"
5. Click "Apply Filters"
6. **See 8 meters with SARFI data! 🎉**

---

## Documents Created

📄 **DATABASE_SCHEMA.md** - Complete 14-table schema reference  
📄 **FIX_SCHEMA_ERROR.md** - Detailed error resolution guide  
📄 **SCHEMA_CONSOLIDATION_REPORT.md** - Full analysis report  
📄 **SARFI_SETUP_GUIDE.md** - Setup instructions

---

## Status
- ⚠️ **Before:** 85.7% schema alignment (12/14 tables)
- ✅ **After:** 100% schema alignment (14/14 tables)

---

## TL;DR
Run migration → Run seed → Done! ✅
