# Scripts Folder - Index and Usage Guide

**Last Updated:** January 5, 2026

---

## 📁 Folder Structure

```
scripts/
├── SCADA_COMPLETE_SETUP.sql          ✨ NEW - SCADA module database setup
├── backfill-substation-audit-fields.sql
├── SCRIPTS_INDEX.md                  ✨ NEW - This file
├── README.md                          📚 Mother Event demo data generator
└── archive/                           🗄️ Historical scripts (Dec 2025)
    └── dec2025-seeds/                Scripts from December 2025 refactoring
```

---

## ✅ Active Scripts (Current Use)

### Database Setup & Migration

#### **SCADA_COMPLETE_SETUP.sql** ✨ NEW (Jan 5, 2026)
**Purpose:** Complete database setup for SCADA Substation Management module

**Usage:**
1. Open Supabase Dashboard → SQL Editor
2. Copy entire script content
3. Run in SQL Editor
4. Refresh SCADA page in app

**What it does:**
- Adds `updated_at` and `updated_by` columns to `substations` table
- Creates automatic timestamp update trigger
- Backfills existing substations with audit data
- Verifies setup with diagnostic queries

**Status:** ✅ Production Ready

---

#### **backfill-substation-audit-fields.sql** (Jan 5, 2026)
**Purpose:** Backfill audit fields for existing substations (included in SCADA_COMPLETE_SETUP.sql)

**Usage:** Run via SCADA_COMPLETE_SETUP.sql (recommended) or standalone via Supabase SQL Editor

**What it does:**
- Assigns random existing users to `updated_by` field
- Sets `updated_at` to `created_at` or NOW()
- Provides verification queries

**Status:** ✅ Included in SCADA_COMPLETE_SETUP.sql

---

### Data Maintenance

#### **backfill_customer_impacts.sql**
**Purpose:** Populate customer impact data for existing events

**Usage:** Run when customer impact data needs recalculation
```sql
-- Via Supabase SQL Editor
-- Copy and paste entire file content
```

**Status:** ✅ Active (on-demand use)

---

#### **backfill-pq-services.sql**
**Purpose:** Initialize PQ Services data for meters

**Status:** ✅ Active (on-demand use)

---

#### **backfill-meter-load-types.sql**
**Purpose:** Populate meter load type classifications

**Status:** ✅ Active (on-demand use)

---

### System Utilities

#### **backend_start.sh**
**Purpose:** Start backend development server

**Usage:**
```bash
chmod +x scripts/backend_start.sh
./scripts/backend_start.sh
```

**Status:** ✅ Active

---

#### **docker_build_and_run.sh**
**Purpose:** Build and run Docker containers

**Usage:**
```bash
chmod +x scripts/docker_build_and_run.sh
./scripts/docker_build_and_run.sh
```

**Status:** ✅ Active

---

### Diagnostic Scripts

#### **check-pq-services-setup.sql**
**Purpose:** Verify PQ Services table configuration

**Usage:** Run in Supabase SQL Editor for diagnostics

**Status:** ✅ Active

---

#### **check-table-structure.sql**
**Purpose:** Verify database table structures

**Usage:** Run in Supabase SQL Editor for diagnostics

**Status:** ✅ Active

---

#### **step0-check-database-state.sql**
**Purpose:** Comprehensive database state check

**Usage:** Run before major migrations

**Status:** ✅ Active

---

## 📚 Documentation Files

### **README.md**
**Purpose:** Mother Event Demo Data Generator guide

**Contents:**
- Quick setup using UI method
- Browser console method
- Testing instructions

**Status:** ✅ Active

---

### **DATABASE_UPDATES_2025-12-22.md**
**Purpose:** Database schema changes documentation (Dec 22, 2025)

**Status:** 📚 Historical reference

---

### **IMPLEMENTATION_SUMMARY.md**
**Purpose:** Implementation progress tracking

**Status:** 📚 Reference

---

### **MIGRATION_FIX_GUIDE.md**
**Purpose:** Migration troubleshooting guide

**Status:** 📚 Reference

---

### **PQ_SERVICES_SETUP_GUIDE.md**
**Purpose:** PQ Services configuration guide

**Status:** 📚 Reference

---

### **SARFI70_POPULATION_GUIDE.md**
**Purpose:** SARFI-70 data population instructions

**Status:** 📚 Reference

---

### **VOLTAGE_DIP_GROUPING_MIGRATION.md**
**Purpose:** Voltage dip grouping feature migration

**Status:** 📚 Historical reference

---

## 🗄️ Archived Scripts (archive/dec2025-seeds/)

**Purpose:** Historical seed scripts from December 2025 database refactoring

**Contents:**
- Event generation scripts
- Profile setup scripts
- SARFI data population
- RLS policy fixes
- Schema migration helpers

**Status:** 🗄️ Archived - kept for reference, not for active use

**When to use:** Only when recreating historical database states or debugging legacy issues

---

## 🚀 Quick Reference

### New SCADA Module Setup
```bash
# 1. Open Supabase Dashboard → SQL Editor
# 2. Run: scripts/SCADA_COMPLETE_SETUP.sql
# 3. Refresh app
```

### Generate Mother Event Demo Data
```bash
# Method 1: UI (Recommended)
# Navigate to Database Controls → Click "Generate Mother Events"

# Method 2: Console
# Open browser console → Copy content from archive/dec2025-seeds/console-seed-mother-events.js
```

### Check Database Health
```bash
# Run diagnostic scripts in order:
# 1. step0-check-database-state.sql
# 2. check-table-structure.sql
# 3. check-pq-services-setup.sql
```

---

## 📝 Script Naming Conventions

- **backfill-*.sql**: Data population scripts for existing records
- **check-*.sql**: Diagnostic and verification scripts
- **step*.sql**: Sequential migration/setup scripts
- **COMPLETE_SETUP.sql**: All-in-one setup scripts for modules
- ***.sh**: Shell scripts for automation

---

## ⚠️ Important Notes

1. **Always backup data** before running backfill scripts
2. **Test in development** before production deployment
3. **Read comments** in SQL files before execution
4. **Archived scripts** are historical - use with caution
5. **SCADA_COMPLETE_SETUP.sql** supersedes individual migration files

---

## 🔄 Maintenance

### When to Clean Up

- Remove duplicate/superseded scripts quarterly
- Archive scripts older than 6 months if inactive
- Update this index when adding new scripts
- Document breaking changes immediately

### Current Cleanup Status

- **Last Cleanup:** January 5, 2026
- **Archived Folder:** December 2025 seed scripts moved to archive/
- **Superseded Scripts:** None currently
- **Next Review:** April 2026

---

## 📞 Support

For issues with scripts:
1. Check script comments for usage instructions
2. Review related documentation in `/Artifacts`
3. Verify database schema matches expected state
4. Check Supabase logs for error details

---

**Generated by:** GitHub Copilot  
**Maintained by:** PQMAP Development Team
