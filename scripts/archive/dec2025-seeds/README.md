# Archived Scripts - December 2025

**Archive Date:** December 19, 2025  
**Reason:** One-time setup, seeding, and migration scripts that have been executed

---

## 📦 Archived Files

### One-Time Seeding Scripts
- `console-seed-fixed.js` - Fixed console seeding script (superseded)
- `debug-mother-events.js` - Debug script for mother events
- `debug-seed-console.js` - Debug console seeding
- `quick-seed-console.js` - Quick console data seeding
- `quick-seed.js` - Quick data seeding utility
- `seed-complete.js` - Complete data seeding
- `seed-mother-events.js` - Mother event seeding
- `seed-sarfi-profiles.js` - SARFI profiles seeding
- `console-seed-mother-events.js` - Console mother events seed

### SARFI Setup Scripts
- `debug-sarfi-table.js` - SARFI table debugging
- `seed-sarfi-console.js` - SARFI console seeding
- `seed-sarfi-data.js` - SARFI data seeding (JS)
- `seed-sarfi-data.sql` - SARFI data seeding (SQL)
- `populate-sarfi70-values.sql` - SARFI70 values population

### Event Data Generation
- `check-child-events.sql` - Child events verification
- `check-events.sql` - Events table verification
- `check-false-events.sql` - False events verification
- `debug-voltage-dip-events.sql` - Voltage dip events debugging
- `fix-and-generate-test-data.sql` - Test data generation
- `generate-false-events.sql` - False events generation
- `seed-voltage-dip-events.sql` - Voltage dip events seeding

### One-Time Fixes & Migrations
- `fix-profile-policies.sql` - Profile RLS policies fix
- `fix-rls-policies.sql` - RLS policies fix
- `fix-user-role.sql` - User role fix
- `set-admin-role.sql` - Admin role setup
- `fix-mother-event-schema.js` - Mother event schema fix
- `console-schema-fix.js` - Console schema fix
- `update-existing-events.js` - Event data migration
- `reorganize_events_database.sql` - Database reorganization
- `test_customer_transformer_mappings.sql` - Customer mapping tests
- `verify_before_backfill.sql` - Pre-backfill verification

---

## ⚠️ Important Notes

1. **Do NOT delete these files** - They may be needed for:
   - Setting up new development environments
   - Understanding database evolution
   - Troubleshooting historical issues
   - Reference for future migrations

2. **These scripts have already been executed** on the current database

3. **For fresh setup**, refer to:
   - `scripts/README.md` - Current active scripts
   - `supabase/migrations/` - Official migration files
   - Database Controls UI in the application

---

## 🔄 Active Scripts (Not Archived)

The following scripts remain active in `/scripts`:
- `backfill-pq-services.sql` - PQ services data backfill
- `backfill_customer_impacts.sql` - Customer impacts backfill
- `check-pq-services-setup.sql` - PQ services verification
- `check-table-structure.sql` - Table structure verification
- `FINAL-complete-setup.sql` - Complete PQ services setup
- `step0-check-database-state.sql` - Database state diagnostic
- `step1-create-from-scratch.sql` - PQ services table creation
- `step1-update-existing.sql` - PQ services table update
- `step1-verify-and-fix.sql` - PQ services verification
- `update-functional-design.js` - Documentation updater

---

## 📝 Recovery Instructions

If you need to re-run any archived script:
1. Copy the script from archive back to scripts/ or root
2. Review the script to ensure it's still compatible
3. Test in development environment first
4. Run with appropriate database credentials
