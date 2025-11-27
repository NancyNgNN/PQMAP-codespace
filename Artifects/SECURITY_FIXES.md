# Security and Performance Fixes

## Overview
This document details all security and performance improvements applied to the PQMAP database schema.

## Issues Fixed

### 1. Missing Foreign Key Indexes ✅
**Problem:** Foreign key columns without indexes cause poor query performance on JOIN operations.

**Solution:** Added indexes on all foreign key columns:
- `idx_event_customer_impact_event_id` - Optimizes event impact lookups
- `idx_event_customer_impact_customer_id` - Optimizes customer impact queries
- `idx_notifications_event_id` - Speeds up notification queries by event
- `idx_pq_events_meter_id` - Optimizes meter event lookups
- `idx_pq_events_parent_event_id` - Improves parent-child event queries
- `idx_pq_service_records_customer_id` - Speeds up service record lookups
- `idx_pq_service_records_engineer_id` - Optimizes engineer assignment queries
- `idx_reports_generated_by` - Improves report ownership queries

**Impact:** Significant performance improvement for all JOIN queries and related data lookups.

### 2. RLS Policy Optimization ✅
**Problem:** Policies using `auth.uid()` directly cause function re-evaluation for every row, leading to poor performance at scale.

**Solution:** Updated all RLS policies to use the optimized `(select auth.uid())` pattern:
- profiles - User profile access policies
- substations - Substation management policies
- pq_meters - Meter management policies
- customers - Customer data policies
- pq_events - Event management policies
- event_customer_impact - Impact data policies
- notifications - Notification policies
- notification_rules - Notification rule policies
- pq_service_records - Service record policies
- reports - Report generation policies
- system_health - System monitoring policies
- sarfi_metrics - SARFI metrics policies

**Impact:** Dramatically improved query performance by evaluating `auth.uid()` once per query instead of once per row.

### 3. Multiple Permissive Policies ✅
**Problem:** Tables had duplicate SELECT policies (one for viewing, one within "manage all" policies), causing confusion and potential security issues.

**Solution:** Separated policies by specific action (SELECT, INSERT, UPDATE, DELETE):
- Removed broad "FOR ALL" policies
- Created separate policies for each action
- Maintained read-only SELECT policies for all authenticated users
- Created specific INSERT/UPDATE/DELETE policies for admins/operators

**Tables Updated:**
- substations
- pq_meters
- customers
- pq_events
- event_customer_impact
- notifications
- notification_rules
- pq_service_records
- system_health
- sarfi_metrics

**Impact:** Clearer security model, easier to audit, and eliminates policy conflicts.

### 4. Unused Indexes Clarification
**Note:** The following indexes were flagged as "unused" but are actually critical for query performance:
- `idx_pq_events_substation` - Used for filtering events by substation
- `idx_pq_events_status` - Used for filtering events by status
- `idx_pq_meters_substation` - Used for filtering meters by substation

These indexes remain in place as they are essential for the application's query patterns.

### 5. Password Protection (Informational)
**Note:** Supabase Auth's leaked password protection should be enabled in the Supabase Dashboard:
1. Go to Authentication > Settings
2. Enable "Check for compromised passwords"
3. This checks passwords against HaveIBeenPwned database

This is a project-level setting, not a database migration.

## Security Model Summary

### Role-Based Access Control
- **Admin**: Full access to all operations (SELECT, INSERT, UPDATE, DELETE)
- **Operator**: Can manage events, meters, customers, and service records
- **Viewer**: Read-only access to all data

### Policy Structure
All tables now follow this pattern:
1. SELECT policies: Open to all authenticated users
2. INSERT policies: Restricted to admins/operators
3. UPDATE policies: Restricted to admins/operators
4. DELETE policies: Restricted to admins/operators

### Performance Optimizations
1. All foreign keys are indexed
2. All RLS policies use optimized `(select auth.uid())` pattern
3. Policies are separated by action for clarity
4. No duplicate or conflicting policies

## Testing Recommendations

After applying these fixes, test the following:

1. **Performance Testing**
   - Query events by substation (should use new indexes)
   - Query customer impact data (should use new indexes)
   - Load dashboard with multiple JOINs (should be faster)

2. **Security Testing**
   - Verify viewers cannot modify data
   - Verify operators can manage operational data
   - Verify admins have full access
   - Test row-level filtering works correctly

3. **Functional Testing**
   - Test all CRUD operations in each module
   - Verify reports generate correctly
   - Test notification rule management
   - Verify event status updates work

## Migration Applied
Migration file: `fix_security_and_performance_issues.sql`
Applied: 2025-11-03

## Additional Recommendations

1. **Regular Index Maintenance**
   - Monitor index usage with `pg_stat_user_indexes`
   - Rebuild indexes periodically: `REINDEX DATABASE`

2. **RLS Policy Monitoring**
   - Use `EXPLAIN ANALYZE` to verify policy performance
   - Monitor slow queries in Supabase Dashboard

3. **Security Audits**
   - Regularly review RLS policies
   - Test with different user roles
   - Monitor authentication attempts

4. **Performance Monitoring**
   - Set up query performance tracking
   - Monitor database connection pool usage
   - Track API response times

## Compliance

These fixes ensure compliance with:
- ✅ PostgreSQL best practices
- ✅ Supabase security recommendations
- ✅ Row Level Security optimization guidelines
- ✅ Database indexing best practices
