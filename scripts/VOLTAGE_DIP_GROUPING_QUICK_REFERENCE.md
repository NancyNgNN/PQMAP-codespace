# Voltage Dip Only Grouping - Quick Reference

## 📋 Summary
**Date:** December 23, 2025  
**Change:** Enforce that only `voltage_dip` events can have mother-child relationships  
**Status:** ✅ Complete and ready for deployment

---

## 🎯 What Changed

### Frontend Validation
- **Manual Grouping**: Now validates all selected events are `voltage_dip` type
- **Automatic Grouping**: Automatically filters to only process `voltage_dip` events
- **Error Message**: "Only voltage_dip events can be grouped together"
- **Ungrouping**: No restrictions (allows cleanup of legacy bad data)

### Database Cleanup
- SQL script cleans up all existing non-`voltage_dip` mother-child relationships
- Comprehensive logging tracks every change
- Validation ensures 100% compliance after migration

---

## 📁 Files Changed

### Modified
- `src/services/mother-event-grouping.ts` - Added voltage_dip validation

### Created
- `scripts/backfill-voltage-dip-only-grouping.sql` - Migration script
- `scripts/VOLTAGE_DIP_GROUPING_MIGRATION.md` - Detailed migration guide
- `scripts/IMPLEMENTATION_SUMMARY.md` - Complete implementation details
- `tests/voltage-dip-only-grouping.test.ts` - Test cases and validation
- `scripts/VOLTAGE_DIP_GROUPING_QUICK_REFERENCE.md` - This file

---

## 🚀 Deployment Checklist

### 1. Database Migration (Run First)
```bash
# 1. Create backup
CREATE TABLE pq_events_backup_20251223 AS SELECT * FROM pq_events;

# 2. Run migration script in Supabase SQL Editor
# Copy/paste: scripts/backfill-voltage-dip-only-grouping.sql

# 3. Verify results (should all be 0)
SELECT COUNT(*) FROM pq_events WHERE is_mother_event=true AND event_type!='voltage_dip';
SELECT COUNT(*) FROM pq_events WHERE is_child_event=true AND event_type!='voltage_dip';
```

### 2. Frontend Deployment
```bash
git add src/services/mother-event-grouping.ts
git commit -m "feat: Enforce voltage_dip only grouping"
git push origin main
# Deploy via your CI/CD pipeline
```

### 3. Testing
- [ ] Test manual grouping with voltage_dip events (should work)
- [ ] Test manual grouping with mixed types (should show error)
- [ ] Test automatic grouping (should process voltage_dip only)
- [ ] Verify error message displays correctly

---

## 🧪 Quick Test Commands

### Frontend Tests
```typescript
// In browser console after loading EventManagement
import { MotherEventGroupingService } from './services/mother-event-grouping';

// Test 1: Valid grouping (should return canGroup: true)
MotherEventGroupingService.canGroupEvents([
  { event_type: 'voltage_dip', substation_id: 'sub-1' },
  { event_type: 'voltage_dip', substation_id: 'sub-1' }
]);

// Test 2: Invalid grouping (should return canGroup: false)
MotherEventGroupingService.canGroupEvents([
  { event_type: 'voltage_dip', substation_id: 'sub-1' },
  { event_type: 'voltage_swell', substation_id: 'sub-1' }
]);
```

### Database Validation
```sql
-- Should return 0 (no non-voltage_dip mothers)
SELECT COUNT(*) FROM pq_events 
WHERE is_mother_event = true AND event_type != 'voltage_dip';

-- Should return 0 (no non-voltage_dip children)
SELECT COUNT(*) FROM pq_events 
WHERE is_child_event = true AND event_type != 'voltage_dip';

-- View migration log summary
SELECT change_reason, COUNT(*) as count
FROM event_grouping_migration_log
GROUP BY change_reason;
```

---

## 🔧 Troubleshooting

### Problem: Users see error when trying to group events
**Solution:** This is expected behavior if they selected non-voltage_dip events. Error message guides them to select only voltage_dip events.

### Problem: Automatic grouping not creating groups
**Check:** Ensure there are voltage_dip events within 10-minute windows at the same substation.

### Problem: SQL script shows validation errors
**Action:** Review the migration log table, check specific events, may need to investigate data integrity issues.

---

## 📊 Expected Results After Migration

### Database State
- ✅ All mother events are `voltage_dip` type
- ✅ All child events are `voltage_dip` type
- ✅ No orphaned children (parent_event_id pointing to non-existent events)
- ✅ Former non-voltage_dip mothers are now standalone
- ✅ Former non-voltage_dip children are now standalone
- ✅ Voltage_dip children of non-voltage_dip parents promoted to mothers

### User Experience
- ✅ Can group multiple voltage_dip events manually
- ✅ Gets clear error when trying to group non-voltage_dip events
- ✅ Automatic grouping only processes voltage_dip events
- ✅ Can still ungroup any event (for cleanup)

---

## 📚 Documentation Reference

| Document | Purpose |
|----------|---------|
| `VOLTAGE_DIP_GROUPING_MIGRATION.md` | Detailed migration guide with step-by-step instructions |
| `IMPLEMENTATION_SUMMARY.md` | Complete technical implementation details |
| `voltage-dip-only-grouping.test.ts` | Test cases and validation scenarios |
| `backfill-voltage-dip-only-grouping.sql` | Database migration script |
| `VOLTAGE_DIP_GROUPING_QUICK_REFERENCE.md` | This quick reference guide |

---

## 🎓 Business Rules

### Can Be Grouped (✅)
- Multiple voltage_dip events
- Same substation
- Not already in a group
- Within reasonable time window (for automatic grouping)

### Cannot Be Grouped (❌)
- Non-voltage_dip event types
- Already grouped events
- Different substations
- Mixed event types

### Ungrouping (No Restrictions)
- Any event can be ungrouped
- Useful for cleaning up legacy data
- No validation applied

---

## 💡 Key Points to Remember

1. **Only voltage_dip events can be mothers or children**
2. **Manual grouping validates before attempting**
3. **Automatic grouping filters automatically**
4. **Migration script is idempotent** (safe to run multiple times)
5. **All changes are logged** (event_grouping_migration_log table)
6. **Ungrouping has no restrictions** (for cleanup)

---

## 🆘 Need Help?

### Migration Issues
1. Check migration log table: `SELECT * FROM event_grouping_migration_log`
2. Review validation queries in migration script
3. Verify backup exists before rollback

### Frontend Issues
1. Check browser console for errors
2. Verify service file deployed correctly
3. Test validation with console commands above

### Questions
- Refer to detailed docs in `scripts/` directory
- Check test cases in `tests/voltage-dip-only-grouping.test.ts`
- Review implementation summary for technical details

---

**Last Updated:** December 23, 2025  
**Version:** 1.0  
**Deployment Status:** Ready for production
