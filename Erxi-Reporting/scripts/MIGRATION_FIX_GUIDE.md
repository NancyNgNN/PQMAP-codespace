# PQ Services Migration - Step-by-Step Fix

## Error: "type 'service_type' does not exist"

This means your database doesn't have the `service_type` enum yet. Follow these steps:

---

## STEP 0: Check Your Database State

**Run this first** in Supabase SQL Editor:

```sql
-- Copy/paste from: scripts/step0-check-database-state.sql
```

This will tell you:
- ✅ Does `service_type` enum exist?
- ✅ Does `pq_service_records` table exist?
- ✅ What columns currently exist?

---

## STEP 1: Apply the Correct Migration

### **Scenario A: service_type DOES NOT exist** ❌

If step 0 showed "DOES NOT EXIST" for service_type:

**Run this** in Supabase SQL Editor:

```sql
-- Copy/paste from: scripts/step1-create-from-scratch.sql
```

This will:
- Create `service_type` enum with all 6 values
- Create `pq_service_records` table with all columns
- Create all necessary indexes
- Set up RLS policies
- Add triggers

---

### **Scenario B: service_type EXISTS but needs updates** ✅

If step 0 showed "EXISTS" for service_type but only has 3 values:

**Run this** in Supabase SQL Editor:

```sql
-- Copy/paste from: scripts/step1-update-existing.sql
```

This will:
- Add 3 new service type values
- Add `event_id` and `content` columns
- Create indexes
- Update comments

---

## STEP 2: Verify the Migration

Run this to confirm everything is ready:

```sql
-- Copy/paste from: scripts/check-pq-services-setup.sql
```

Expected result: ✅ All checks should pass

---

## STEP 3: Add Test Data

Once Step 1 is complete, run the backfill:

```sql
-- Copy/paste from: scripts/backfill-pq-services.sql
```

This creates 3-8 service records per customer with realistic data.

---

## STEP 4: Test in Browser

1. **Hard refresh** the browser: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Navigate to **PQ Services** page
3. Verify:
   - Dashboard shows metrics
   - Customer list appears
   - Can select customer
   - Can add new service (no more schema error!)

---

## Troubleshooting

### Still getting "type service_type does not exist"?

Check if you have multiple schemas:

```sql
SELECT nspname, typname 
FROM pg_type t
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE typname = 'service_type';
```

If empty, run **Scenario A** (create from scratch).

### Table already exists error?

That's okay! The scripts use `IF NOT EXISTS` clauses. Just continue.

### Foreign key constraint errors?

Ensure these tables exist first:
- `customers` table
- `pq_events` table  
- `profiles` table

If any are missing, you need to run your base schema migrations first.

### RLS policy errors?

If you get RLS policy errors, you may need to adjust the policies based on your auth setup. The scripts include basic policies that allow all authenticated users.

---

## Quick Reference

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `step0-check-database-state.sql` | Check current state | Always run first |
| `step1-create-from-scratch.sql` | Create everything | If service_type doesn't exist |
| `step1-update-existing.sql` | Update existing | If service_type exists |
| `check-pq-services-setup.sql` | Verify setup | After step 1 |
| `backfill-pq-services.sql` | Add test data | After step 1 |

---

## Summary

1. ✅ Run `step0-check-database-state.sql` to see what you have
2. ✅ Run either `step1-create-from-scratch.sql` OR `step1-update-existing.sql`
3. ✅ Run `check-pq-services-setup.sql` to verify
4. ✅ Run `backfill-pq-services.sql` to add data
5. ✅ Hard refresh browser and test!

The error should be resolved after completing these steps. 🎉
