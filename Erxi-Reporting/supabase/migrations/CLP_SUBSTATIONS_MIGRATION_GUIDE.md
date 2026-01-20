# CLP Substations Migration Guide

## Overview
This migration replaces existing substations with official CLP Power substation codes and updates all related tables.

## 📋 Migration Files (Execute in Order)

### 1. `20251215110000_backup_tables.sql` - **Backup Creation**
- Creates backup copies of 5 tables with `_backup_20251215` suffix
- Tables backed up:
  - `substations`
  - `pq_events`
  - `pq_meters`
  - `customers`
  - `customer_transformer_matching`
- **Storage impact**: Duplicates your data temporarily
- **Verification**: Shows backup vs original counts

### 2. `20251215120000_update_clp_substations.sql` - **Migration**
- Deletes existing substations
- Inserts 25 new CLP substations with official codes
- Updates all foreign key references in related tables
- **Data preserved**: All events, meters, customers, and mappings are migrated
- **New substations**: APA, APB, AWR, ATA, ATB, AUS, BAL, BCH, BKP, BOU, CAN, CCM, CCN, CCS, CHF, CHI, CHS, CHY, CKL, CLR, CPK, CPR, CTN, CWS, CYS

### 3. `20251215130000_rollback_restore_backups.sql` - **Rollback (Optional)**
- ⚠️ **Only run if migration fails or you need to revert**
- Restores all tables from backup copies
- Completely reverses the migration

### 4. `20251215140000_cleanup_backups.sql` - **Cleanup (Optional)**
- ⚠️ **Only run after confirming migration is successful**
- Deletes all backup tables to free up storage
- **Warning**: Cannot be undone

---

## 🚀 Step-by-Step Execution

### Step 1: Pre-Migration Check
```sql
-- Check current data counts
SELECT 'substations' as table, COUNT(*) as count FROM substations
UNION ALL
SELECT 'pq_events', COUNT(*) FROM pq_events
UNION ALL
SELECT 'pq_meters', COUNT(*) FROM pq_meters
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'customer_transformer_matching', COUNT(*) FROM customer_transformer_matching;

-- Check current substation codes
SELECT code, name FROM substations ORDER BY code;
```

### Step 2: Create Backups
1. Open Supabase SQL Editor
2. Copy and paste entire contents of `20251215110000_backup_tables.sql`
3. Click "Run"
4. **Verify**: Check that backup counts match original counts
5. **Expected output**: "✅ Backup Complete! 5 backup tables created"

### Step 3: Run Migration
1. In Supabase SQL Editor
2. Copy and paste entire contents of `20251215120000_update_clp_substations.sql`
3. Click "Run"
4. **Verify**: Review verification queries at the end
5. **Expected output**: 
   - 25 new substations with CLP codes
   - All events migrated to new substations
   - No orphaned records

### Step 4: Verify Migration Success
```sql
-- Check new substations
SELECT code, name, region, voltage_level, status 
FROM substations 
ORDER BY code;

-- Check event distribution
SELECT 
  s.code as substation_code,
  s.name as substation_name,
  COUNT(pe.id) as event_count
FROM substations s
LEFT JOIN pq_events pe ON pe.substation_id = s.id
GROUP BY s.id, s.code, s.name
ORDER BY event_count DESC;

-- Check for orphaned records (should be 0)
SELECT 
  (SELECT COUNT(*) FROM pq_events WHERE substation_id IS NULL) as orphaned_events,
  (SELECT COUNT(*) FROM pq_meters WHERE substation_id IS NULL) as orphaned_meters,
  (SELECT COUNT(*) FROM customers WHERE substation_id IS NULL) as orphaned_customers;
```

### Step 5A: If Migration Successful
1. Wait 24-48 hours to ensure everything works correctly
2. Then run `20251215140000_cleanup_backups.sql` to delete backups and free storage
3. ✅ Migration complete!

### Step 5B: If Migration Failed (Rollback)
1. **Immediately** run `20251215130000_rollback_restore_backups.sql`
2. This restores all original data from backups
3. Review error messages and contact support if needed

---

## 📊 New Substation Details

| Code | Name | Region | Voltage | Status |
|------|------|--------|---------|--------|
| APA | Airport 'A' | Outlying Islands | 132kV | Operational |
| APB | Airport 'B' | Outlying Islands | 132kV | Operational |
| AWR | Airport West Third Runway | Outlying Islands | 132kV | Operational |
| ATA | Au Tau 'A' Pumping Station | New Territories | 11kV | Operational |
| ATB | Au Tau 'B' | New Territories | 11kV | Operational |
| AUS | Austin Road | Kowloon | 132kV | Operational |
| BAL | Balu | New Territories | 11kV | Operational |
| BCH | Beacon Hill | Kowloon | 132kV | Operational |
| BKP | Black Point | New Territories | 400kV | Operational |
| BOU | Boundary Street | Kowloon | 132kV | Operational |
| CAN | Canton Road | Kowloon | 132kV | Operational |
| CCM | China Cement | New Territories | 132kV | Operational |
| CCN | Cheung Chau North | Outlying Islands | 11kV | Operational |
| CCS | Cheung Chau South | Outlying Islands | 11kV | Operational |
| CHF | Chunfeng | Hong Kong Island | 380V | Offline |
| CHI | Chi Wo Street | Kowloon | 11kV | Operational |
| CHS | Cheung Sha | Outlying Islands | 11kV | Operational |
| CHY | Chuk Yuen | Kowloon | 132kV | Operational |
| CKL | Cha Kwo Ling Road | Kowloon | 132kV | Operational |
| CLR | Chui Ling Road | Kowloon | 11kV | Maintenance |
| CPK | Castle Peak Power Station | New Territories | 400kV | Operational |
| CPR | Container Port Road | Kowloon | 132kV | Operational |
| CTN | Centenary | Hong Kong Island | 132kV | Operational |
| CWS | Chik Wan Street | Kowloon | 11kV | Operational |
| CYS | Chun Yat Street | Kowloon | 11kV | Operational |

---

## ⚠️ Important Notes

1. **Backup tables storage**: Backup tables will use additional storage space. Delete them after confirming migration success.

2. **Foreign key updates**: The migration automatically updates:
   - All `pq_events` records
   - All `pq_meters` records
   - All `customers` records
   - All `customer_transformer_matching` records

3. **Coordinates**: Coordinates are based on real Hong Kong locations where available, approximate otherwise.

4. **Rollback window**: Keep backups for at least 24-48 hours before cleanup.

5. **Customer Transformer Matching**: Your newly created feature will work seamlessly with new substation codes.

---

## 🆘 Troubleshooting

### Issue: Migration fails with foreign key error
**Solution**: Check if any custom constraints exist. The migration handles standard FK relationships.

### Issue: Orphaned records after migration
**Solution**: Run the rollback script immediately and investigate which table has the issue.

### Issue: Backup tables taking too much space
**Solution**: Don't panic. Backup tables are temporary and can be deleted after 24-48 hours of successful operation.

### Issue: Need to add more substations
**Solution**: After migration, you can add new substations normally using INSERT statements.

---

## 📞 Support

If you encounter any issues:
1. Run the verification queries
2. Check for error messages
3. If needed, run rollback script immediately
4. Review the migration logs

---

## ✅ Success Checklist

- [ ] Step 1: Pre-migration check completed
- [ ] Step 2: Backups created successfully
- [ ] Step 3: Migration executed without errors
- [ ] Step 4: Verification queries show correct data
- [ ] Step 5: All substations showing CLP codes
- [ ] Step 6: No orphaned records
- [ ] Step 7: Events properly distributed across substations
- [ ] Step 8: Wait 24-48 hours
- [ ] Step 9: Cleanup backups (optional)

---

**Last Updated**: December 15, 2025
