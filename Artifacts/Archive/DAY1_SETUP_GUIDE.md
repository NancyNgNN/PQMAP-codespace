# Notification System Migration - Day 1 Setup

## What was created:

✅ **Migration file**: `supabase/migrations/20260114000000_notification_system_migration.sql`
- Drops old tables (notifications, notification_rules)
- Creates 7 new tables with indexes and RLS policies
- Seeds 3 channels, 2 templates, 4 groups, 2 rules

✅ **Verification script**: `supabase/migrations/20260114000001_verify_notification_migration.sql`
- Comprehensive checks for all tables, seed data, RLS policies
- Run this after migration to confirm success

---

## How to apply the migration:

### Option 1: Via Supabase CLI (Recommended)

```bash
# Make sure you're in the project root
cd /path/to/PQMAP-codespace

# Apply the migration
supabase db push

# Or if using remote database
supabase db push --db-url "postgresql://..."
```

### Option 2: Via Supabase Dashboard

1. Open Supabase Dashboard: https://app.supabase.com
2. Select your PQMAP project
3. Go to **SQL Editor**
4. Copy the contents of `supabase/migrations/20260114000000_notification_system_migration.sql`
5. Paste and click **Run**
6. Wait for completion (should take 10-15 seconds)

---

## Verification Steps:

### 1. Check migration applied successfully

```sql
-- In Supabase SQL Editor, run:
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'notification%';
```

**Expected**: 7 tables (channels, templates, groups, group_members, rules, logs, config)

### 2. Run verification script

```bash
# Apply verification script
supabase db push
```

Or manually run `20260114000001_verify_notification_migration.sql` in SQL Editor.

**Expected output**:
- ✓ Old tables successfully removed
- ✓ All 7 tables created successfully
- ✓ Seed data verification: 3 channels, 2 templates, 4 groups, 2 rules
- ✓ RLS enabled on all tables
- ✓ 15+ policies created

### 3. Quick verification queries

```sql
-- Check seeded data
SELECT COUNT(*) AS channels FROM notification_channels;
SELECT COUNT(*) AS templates FROM notification_templates WHERE status = 'approved';
SELECT COUNT(*) AS groups FROM notification_groups;
SELECT COUNT(*) AS rules FROM notification_rules WHERE active = true;

-- Expected: 3, 2, 4, 2
```

### 4. Test RLS policies (from application)

The RLS policies will automatically enforce permissions based on user roles:
- **Everyone** can view approved templates, channels, groups, rules
- **Operators** can create draft templates
- **Admins** can approve templates, manage rules, channels, groups

---

## Seeded Data Summary:

### Channels (3):
1. **Email** - Primary email notifications (demo mode)
2. **SMS** - Text message notifications (demo mode)
3. **Microsoft Teams** - Teams webhook integration (demo mode)

### Templates (2):
1. **Critical PQ Event Alert** (PQ_EVENT_CRITICAL)
   - For critical severity events
   - 7 variables: event_type, severity, substation_name, timestamp, magnitude, duration, event_link
   - Supports: Email (HTML), SMS (160 char), Teams (Markdown)

2. **Voltage Dip with Customer Impact** (VOLTAGE_DIP_CUSTOMER_IMPACT)
   - For voltage dips affecting customers
   - 7 variables: substation_name, timestamp, magnitude, duration, customer_count, downtime_min, event_link
   - Supports: Email, Teams

### Groups (4):
1. **Emergency Response Team** - Critical event first responders
2. **Maintenance Crew** - Scheduled maintenance notifications
3. **Management** - Executive summary reports
4. **Operations Team** - Day-to-day operational alerts

*(No members assigned yet - needs manual assignment in Day 4)*

### Rules (2):
1. **Critical Events with Low Voltage**
   - Conditions: severity = "critical" AND magnitude < 80
   - Template: PQ_EVENT_CRITICAL
   - Channels: Email, SMS, Teams
   - Groups: Emergency Response Team
   - Mother event only: Yes
   - Include waveform: Yes

2. **Voltage Dips Affecting 50+ Customers**
   - Conditions: event_type = "voltage_dip" AND customer_count >= 50
   - Template: VOLTAGE_DIP_CUSTOMER_IMPACT
   - Channels: Email, Teams
   - Groups: Management
   - Typhoon mode enabled: Yes
   - Mother event only: Yes

---

## Troubleshooting:

### Error: "invalid input value for enum user_role"
**Cause**: Database uses `'admin'`, `'operator'`, `'viewer'` roles (not UAM system roles)  
**Fix**: Migration script has been updated to use correct roles  
**See**: [ROLE_SYSTEM_CLARIFICATION.md](Artifacts/ROLE_SYSTEM_CLARIFICATION.md) for details

### Error: "relation already exists"
**Cause**: Old migration already partially applied  
**Fix**: 
```sql
-- Manually drop all notification tables and retry
DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS notification_rules CASCADE;
DROP TABLE IF EXISTS notification_group_members CASCADE;
DROP TABLE IF EXISTS notification_groups CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS notification_channels CASCADE;
DROP TABLE IF EXISTS notification_system_config CASCADE;
```

### Error: "column does not exist"
**Cause**: Old tables not fully dropped  
**Fix**: Check that old `notifications` and `notification_rules` tables are gone

### Seed data missing
**Cause**: No user with role='admin' exists in profiles table  
**Fix**: Ensure at least one admin user exists before running migration:
```sql
-- Check if admin exists
SELECT id, email, role FROM profiles WHERE role = 'admin';

-- If no admin exists, update an existing user
UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
```

---

## Next Steps (Day 2):

Once migration is verified:
1. ✅ Update TypeScript types in `src/types/database.ts`
2. ✅ Create notification service in `src/services/notificationService.ts`
3. ✅ Add template approval permission to user management

**Estimated time for Day 2**: 3-4 hours

---

## Rollback (if needed):

If you need to rollback this migration:

```sql
-- Drop all new tables
DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS notification_rules CASCADE;
DROP TABLE IF EXISTS notification_group_members CASCADE;
DROP TABLE IF EXISTS notification_groups CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS notification_channels CASCADE;
DROP TABLE IF EXISTS notification_system_config CASCADE;

-- Recreate old tables (from backup or previous migration)
-- ... restore from backup_20260114 if available
```

---

## Files Created:

1. `supabase/migrations/20260114000000_notification_system_migration.sql` (800 lines)
2. `supabase/migrations/20260114000001_verify_notification_migration.sql` (300 lines)
3. `DAY1_SETUP_GUIDE.md` (this file)

**Status**: ✅ Ready to apply migration
