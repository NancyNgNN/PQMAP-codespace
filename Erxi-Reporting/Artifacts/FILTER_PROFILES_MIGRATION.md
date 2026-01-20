# Filter Profiles Migration Guide

## Overview
This guide explains how to apply the `filter_profiles` table migration to enable multi-device sync for event management filters.

## Migration Details

**Migration File:** `20251210000000_create_filter_profiles.sql`  
**Date:** December 10, 2025  
**Purpose:** Enable multi-device synchronization of user filter preferences  

## What's Included

### Database Changes
- **New Table:** `filter_profiles`
- **Columns:**
  - `id` (UUID, Primary Key)
  - `user_id` (UUID, Foreign Key to auth.users)
  - `name` (TEXT, Required)
  - `description` (TEXT, Optional)
  - `filters` (JSONB, Required) - Stores EventFilter configuration
  - `is_default` (BOOLEAN) - Auto-load flag
  - `created_at`, `updated_at` (TIMESTAMPTZ)

### Features
- **Row Level Security (RLS)** enabled
- **Unique constraint** on (user_id, name)
- **Indexes** for performance optimization
- **Triggers:**
  - Auto-update `updated_at` timestamp
  - Ensure only one default profile per user
- **RLS Policies:**
  - Users can manage their own profiles
  - Admins can view all profiles

### Code Changes
- ✅ `FilterProfile` interface added to `database.ts`
- ✅ Supabase CRUD operations implemented
- ✅ localStorage removed (replaced with Supabase)
- ✅ Auto-load default profile on page load
- ✅ "Set as Default" functionality
- ✅ Edit/Delete profile actions
- ✅ Visual indicators (⭐) for default profiles

## How to Apply

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Go to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy Migration SQL**
   ```bash
   cat /workspaces/codespaces-react/supabase/migrations/20251210000000_create_filter_profiles.sql
   ```

4. **Paste and Execute**
   - Paste the SQL into the editor
   - Click "Run" or press `Ctrl+Enter`

5. **Verify Success**
   - You should see: "Success. No rows returned"
   - Check the Tables section for `filter_profiles`

### Option 2: Supabase CLI

```bash
cd /workspaces/codespaces-react
supabase db push
```

### Option 3: Direct psql Connection

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f supabase/migrations/20251210000000_create_filter_profiles.sql
```

## Verification Steps

### 1. Check Table Exists
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'filter_profiles';
```

Expected: Returns 1 row with `filter_profiles`

### 2. Check Columns
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'filter_profiles'
ORDER BY ordinal_position;
```

Expected: Returns 8 columns (id, user_id, name, description, filters, is_default, created_at, updated_at)

### 3. Check RLS Policies
```sql
SELECT polname, polcmd 
FROM pg_policies 
WHERE tablename = 'filter_profiles';
```

Expected: Returns 5 policies (SELECT, INSERT, UPDATE, DELETE for users, SELECT for admins)

### 4. Check Triggers
```sql
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'filter_profiles';
```

Expected: Returns 2 triggers

### 5. Test in Application
1. Open Event Management page
2. Set some filters
3. Click "Save Profile" button
4. Enter a profile name
5. Click "Save Profile"
6. Check Supabase dashboard → `filter_profiles` table for the new record

## Migration from localStorage

### Automatic Migration (Optional)
If you want to migrate existing localStorage profiles to Supabase, add this code temporarily:

```typescript
// Add to EventManagement.tsx useEffect
useEffect(() => {
  const migrateLocalStorageProfiles = async () => {
    const localProfiles = localStorage.getItem('eventFilterProfiles');
    if (!localProfiles) return;

    try {
      const profiles = JSON.parse(localProfiles);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const profile of profiles) {
        await supabase.from('filter_profiles').insert({
          user_id: user.id,
          name: profile.name,
          filters: profile.filters,
          is_default: false
        });
      }

      // Remove localStorage after successful migration
      localStorage.removeItem('eventFilterProfiles');
      console.log('✅ Migrated profiles from localStorage to Supabase');
    } catch (error) {
      console.error('Error migrating profiles:', error);
    }
  };

  migrateLocalStorageProfiles();
}, []);
```

## Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Drop table and all related objects
DROP TABLE IF EXISTS filter_profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_filter_profiles_updated_at() CASCADE;
DROP FUNCTION IF EXISTS ensure_single_default_profile() CASCADE;
```

## Post-Migration

### Update DATABASE_SCHEMA.md Status
After successful migration, update the migration history:

```markdown
| 2025-12-10 | `20251210000000_create_filter_profiles.sql` | ✅ **Applied** | Filter profiles for multi-device sync |
```

### Features Now Available
- ✅ Save filter configurations with custom names
- ✅ Load saved profiles from any device
- ✅ Set a default profile that auto-loads
- ✅ Edit profile names
- ✅ Delete unwanted profiles
- ✅ Per-user isolation (users only see their own profiles)
- ✅ Admin visibility (admins can view all profiles)

## Troubleshooting

### Error: relation "filter_profiles" does not exist
**Solution:** Migration not applied. Follow the "How to Apply" steps above.

### Error: permission denied for table filter_profiles
**Solution:** RLS policies not applied. Re-run the migration script.

### Error: duplicate key value violates unique constraint
**Solution:** You're trying to create a profile with a name that already exists. Choose a different name.

### Profiles not loading
**Solution:** 
1. Check user is authenticated: `supabase.auth.getUser()`
2. Check browser console for errors
3. Verify RLS policies allow SELECT for current user

## Support

For issues or questions:
1. Check Supabase logs in Dashboard → Logs
2. Review browser console for errors
3. Verify migration was applied successfully
4. Check that user authentication is working

---

**Migration Status:** ⏳ Ready to Apply  
**Breaking Changes:** None (backward compatible)  
**Downtime Required:** No  
**Estimated Apply Time:** < 1 second
