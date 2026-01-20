# PQ Services - Setup Instructions

## Issue 1: Schema Error Fix

**Problem:** "Could not find the 'content' column of 'pq_service_records' in the schema cache"

**Solution:** The migration needs to be applied to your Supabase database.

### Steps to Apply Migration:

1. **Open Supabase Dashboard**
   - Go to your project: https://supabase.com/dashboard/project/[your-project-id]
   - Navigate to **SQL Editor** in the left sidebar

2. **Apply the Migration**
   - Copy the entire content from: `/supabase/migrations/20251218000001_update_pq_service_records.sql`
   - Paste it into the SQL Editor
   - Click **Run** button
   - Wait for confirmation: "Success. No rows returned"

3. **Verify the Changes**
   Run this query to verify:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'pq_service_records'
   ORDER BY ordinal_position;
   ```
   
   You should see:
   - `event_id` column (uuid, nullable)
   - `content` column (text, nullable)

---

## Issue 2: Profile Query Fix

**Problem:** 400 Bad Request when querying profiles by user_id

**Solution:** Fixed in AddServiceModal.tsx - now uses auth user ID directly instead of querying profiles table.

**Changes Made:**
- Removed the profile lookup query
- Now sets `engineer_id` to the authenticated user's ID directly
- This matches how EventDetails.tsx handles user IDs

---

## Issue 3: Backfill Historical Data

**Purpose:** Populate PQ Services with historical records to see dashboard metrics and service logs.

### Steps to Backfill Data:

1. **Prerequisites**
   - ✅ Migration must be applied first (see Issue 1)
   - ✅ You should have customer records in the database
   - ✅ You should have at least one profile record

2. **Run Backfill Script**
   - Open Supabase Dashboard → SQL Editor
   - Copy the entire content from: `/scripts/backfill-pq-services.sql`
   - Paste into SQL Editor
   - Click **Run**
   - Wait for: "Backfill completed successfully!"

3. **What the Script Does**
   - Creates 3-8 service records per customer (for first 20 customers)
   - Randomizes dates over past 2 years
   - Varies service types across all 6 categories
   - Generates realistic findings and recommendations
   - Creates rich text content with HTML formatting
   - 20% of records linked to random events (if events exist)
   - 50% of records have benchmark standards

4. **Verify Results**
   The script includes verification queries at the end that show:
   - Total services by type
   - Monthly distribution (last 12 months)
   - Sample records with customer and engineer names

---

## Testing After Setup

1. **Refresh PQMAP Application**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - This clears the schema cache

2. **Check Dashboard**
   - Navigate to PQ Services page
   - Verify dashboard metrics show data:
     - Total Customers
     - Total Services
     - This Month count
     - Services by Category chart

3. **Select a Customer**
   - Click on any customer in the left sidebar
   - Verify Main Info tab shows customer details
   - Switch to PQ Services tab
   - Verify service log table shows historical records

4. **Test Add Service**
   - Click **Add Service** button
   - Fill in the form
   - Test the rich text editor (bold, italic, lists)
   - Click **Save Service**
   - Verify new service appears in the table

5. **Test View Details**
   - Click **View Details** on any service
   - Verify all fields display correctly
   - Verify rich text content renders properly
   - Close modal

6. **Test Export**
   - Click Export button (download icon)
   - Click **Export to Excel**
   - Verify Excel file downloads with service data

7. **Test Filters**
   - Click **Filters** button to expand filter panel
   - Try different service type filters
   - Try date range filters
   - Try benchmark standard filters
   - Verify table updates accordingly

8. **Test Recent Activities**
   - Scroll to bottom of page
   - Verify "Recent Activities" shows last 10 services
   - Check it displays customer names and service types

---

## Troubleshooting

### Error: "relation pq_service_records does not exist"
- The table hasn't been created yet
- Check if you have the initial database schema migration
- Contact DBA to ensure base tables are created

### Error: "column content does not exist"
- Migration hasn't been applied yet
- Follow steps in Issue 1 above

### Error: "insert or update on table pq_service_records violates foreign key constraint"
- Ensure the customer_id exists in customers table
- Ensure the engineer_id exists in profiles table
- Ensure the event_id (if provided) exists in pq_events table

### Dashboard shows zero metrics
- Run the backfill script (Issue 3)
- Ensure you have customer records in the database
- Check browser console for errors
- Verify Supabase connection is working

### Rich text editor not working
- Check if TipTap packages are installed: `npm list @tiptap/react`
- If missing, run: `npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder`
- Restart the development server

---

## Files Modified/Created

### Modified:
1. `/src/types/database.ts`
   - Updated `ServiceType` to include 6 service types
   - Updated `PQServiceRecord` interface

2. `/src/components/PQServices.tsx`
   - Complete redesign with dashboard, filters, customer sidebar
   - Tabs for Main Info and PQ Services
   - Export functionality
   - Recent activities section

3. `/src/components/PQServices/AddServiceModal.tsx`
   - Fixed profile query issue
   - Now uses auth user ID directly

### Created:
1. `/supabase/migrations/20251218000001_update_pq_service_records.sql`
   - Adds event_id and content columns
   - Extends service_type enum
   - Creates indexes

2. `/src/components/PQServices/AddServiceModal.tsx`
   - Modal with TipTap rich text editor
   - All form fields with validation

3. `/src/components/PQServices/ViewDetailsModal.tsx`
   - Card-style detail view
   - Displays all service information

4. `/scripts/backfill-pq-services.sql`
   - Generates historical service records
   - Creates realistic test data

---

## Summary

**To get PQ Services working:**

1. ✅ Apply migration: `20251218000001_update_pq_service_records.sql`
2. ✅ Run backfill script: `backfill-pq-services.sql`
3. ✅ Hard refresh browser
4. ✅ Test all features

**Expected Result:**
- Dashboard shows metrics with real data
- Customer list populated
- Service history visible for each customer
- Can add new services with rich text content
- Can view service details
- Can export service data to Excel
- Recent activities shows last 10 services
