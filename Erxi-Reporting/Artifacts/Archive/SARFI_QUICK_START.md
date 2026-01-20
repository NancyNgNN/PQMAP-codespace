# SARFI Configuration - Quick Start Guide

## ⚠️ Important: RLS Permissions

The seed scripts require elevated permissions. The standard `VITE_SUPABASE_ANON_KEY` cannot insert data due to Row Level Security (RLS) policies.

**Recommended Approach**: Use Supabase Dashboard SQL Editor

## Step-by-Step Setup

### Step 1: Apply Database Migration ✅

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **SQL Editor**
3. Copy entire contents of: `/supabase/migrations/20251209000000_create_sarfi_profiles.sql`
4. Paste and click **"Run"**
5. Should see: "Success. No rows returned"
6. Verify in **Table Editor** → Tables list shows:
   - `sarfi_profiles`
   - `sarfi_profile_weights`

### Step 2: Seed Sample Data 📊

Stay in SQL Editor and run this SQL:

```sql
-- 1. Insert sample substations
INSERT INTO substations (name, code, voltage_level, latitude, longitude, region, status)
VALUES 
  ('Tsuen Wan', 'TW-SS01', '132kV', 22.3722, 114.1152, 'New Territories', 'operational'),
  ('Causeway Bay', 'CB-SS01', '132kV', 22.2804, 114.1846, 'Hong Kong Island', 'operational'),
  ('Kowloon Bay', 'KB-SS01', '132kV', 22.3218, 114.2116, 'Kowloon', 'operational'),
  ('Sha Tin', 'ST-SS01', '11kV', 22.3822, 114.1945, 'New Territories', 'operational'),
  ('Central', 'CT-SS01', '132kV', 22.2819, 114.1579, 'Hong Kong Island', 'operational')
ON CONFLICT (code) DO NOTHING;

-- 2. Insert sample PQ meters (2-3 per substation)
INSERT INTO pq_meters (meter_id, substation_id, location, status, last_communication, firmware_version, installed_date)
SELECT 
  'PQM-' || LPAD((ROW_NUMBER() OVER ())::text, 3, '0'),
  id,
  name || ' - Floor ' || (ROW_NUMBER() OVER (PARTITION BY id)),
  'active',
  NOW(),
  '2.1.0',
  '2023-01-15'
FROM substations, generate_series(1, 3)
ON CONFLICT (meter_id) DO NOTHING;

-- 3. Insert SARFI profiles for 2023, 2024, 2025
INSERT INTO sarfi_profiles (name, description, year, is_active)
VALUES 
  ('2023 Standard Profile', 'SARFI calculation profile for 2023 with regional weighting factors', 2023, false),
  ('2024 Standard Profile', 'SARFI calculation profile for 2024 with regional weighting factors', 2024, false),
  ('2025 Standard Profile', 'SARFI calculation profile for 2025 with regional weighting factors', 2025, true)
ON CONFLICT (name) DO NOTHING;

-- 4. Insert weighting factors (random weights between 0.5 and 5.0)
INSERT INTO sarfi_profile_weights (profile_id, meter_id, weight_factor, notes)
SELECT 
  p.id,
  m.id,
  ROUND((0.5 + RANDOM() * 4.5)::numeric, 4), -- Weight between 0.5 and 5.0
  'Auto-generated for ' || p.year
FROM sarfi_profiles p
CROSS JOIN pq_meters m
ON CONFLICT (profile_id, meter_id) DO NOTHING;

-- 5. Verify data
SELECT 'Substations' as table_name, COUNT(*) as count FROM substations
UNION ALL
SELECT 'PQ Meters', COUNT(*) FROM pq_meters
UNION ALL
SELECT 'SARFI Profiles', COUNT(*) FROM sarfi_profiles
UNION ALL
SELECT 'Profile Weights', COUNT(*) FROM sarfi_profile_weights;
```

Expected results:
- Substations: 5
- PQ Meters: ~15
- SARFI Profiles: 3
- Profile Weights: ~45

### Step 3: Verify Setup ✓

In Supabase Dashboard → **Table Editor**:

1. **sarfi_profiles** table:
   - Should show 3 rows (2023, 2024, 2025)
   - 2025 should have `is_active = true`

2. **sarfi_profile_weights** table:
   - Should have ~45 rows (3 profiles × ~15 meters)
   - Each row has a `weight_factor` between 0.5 and 5.0

3. **pq_meters** table:
   - Should have ~15 meters
   - All with `status = 'active'`

### Step 4: Test the Feature 🎉

1. Start the application:
   ```bash
   npm run dev
   ```

2. Navigate to the SARFI dashboard

3. Look for the **settings icon (⚙️)** in the upper right corner of the SARFI chart

4. Click it to open the configuration modal

5. You should see:
   - Profile dropdown with 3 options
   - Voltage level filter
   - Toggle switches
   - Apply button

6. Test the filters:
   - Select "2025 Standard Profile"
   - Choose a voltage level
   - Toggle "Show Data Table"
   - Click "Apply Filters"

7. The data table should appear showing:
   - Meter numbers
   - SARFI-10 through SARFI-90 incident counts
   - Weight factors

## Alternative: Command Line Setup (Advanced)

If you have the service role key:

1. Add to `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Update `scripts/seed-complete.js` to use service role key

3. Run:
   ```bash
   node scripts/seed-complete.js
   ```

⚠️ **Warning**: Service role key bypasses all security. Use only in development!

## Troubleshooting

### Issue: "new row violates row-level security policy"
**Solution**: Use Supabase Dashboard SQL Editor instead of command line scripts

### Issue: Configuration modal doesn't open
**Checks**:
- Browser console for errors
- Migration applied successfully?
- Profiles exist in database?

### Issue: "No profiles found" in dropdown
**Solution**:
```sql
SELECT * FROM sarfi_profiles;
```
If empty, re-run Step 2 SQL

### Issue: Data table shows "No data"
**Solution**:
```sql
SELECT COUNT(*) FROM sarfi_profile_weights;
```
If zero, re-run Step 2 section 4

### Issue: Cannot edit weights (admin page)
**Check**: User role must be 'admin' or 'operator'
```sql
SELECT role FROM profiles WHERE id = auth.uid();
```

## What's Next?

After successful setup:

1. **For Users**:
   - Test different profile selections
   - Try voltage level filters
   - Toggle data table on/off
   - Test filter persistence (refresh page)

2. **For Admins**:
   - Navigate to Profile Management
   - Try creating a new profile
   - Edit weight factors inline
   - Delete test profiles

3. **For Developers**:
   - Review code in `/src/components/Dashboard/SARFI*.tsx`
   - Check service layer in `/src/services/sarfiService.ts`
   - Read full docs in `/Artifacts/SARFI_CONFIG_IMPLEMENTATION.md`

## Quick Reference

| Feature | Location | Description |
|---------|----------|-------------|
| Config Button | SARFI Chart (⚙️) | Opens filter modal |
| Profile Select | Modal → Profile | Choose calc year |
| Voltage Filter | Modal → Voltage Level | Filter by kV |
| Special Events | Modal → Toggle | Exclude typhoon/maintenance |
| Data Table | Modal → Toggle | Show meter details |
| Weight Management | Settings → SARFI Profiles | Edit factors (admin) |

## Files You Need

- **Migration**: `/supabase/migrations/20251209000000_create_sarfi_profiles.sql`
- **Full Docs**: `/Artifacts/SARFI_CONFIG_IMPLEMENTATION.md`
- **Architecture**: `/Artifacts/SARFI_ARCHITECTURE.md`
- **Deployment**: `/Artifacts/SARFI_DEPLOYMENT_CHECKLIST.md`

---

**Setup Time**: ~5 minutes  
**Difficulty**: Easy (using dashboard) | Advanced (using scripts)

🎉 **You're all set!** The SARFI configuration feature is ready to use.
