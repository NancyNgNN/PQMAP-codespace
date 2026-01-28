# Critical Messages System - Setup & Implementation Guide

**Date:** January 28, 2026  
**Purpose:** Display critical system announcements to all logged-in users and allow admins to manage these messages

---

## Overview

This system provides two main features:

### 1. **Critical Message Bar** 🔔
- Displays at the top of every page when a user is logged in
- Shows active critical messages (e.g., "Typhoon signal No.8 will be hoisted in the coming 1 hour")
- Auto-refreshes every 30 seconds to check for new messages
- Users can dismiss individual messages
- Color-coded by severity (Critical, Warning, Info)

### 2. **Admin Management Page** ⚙️
- Only accessible to system_admin and system_owner roles
- Create, edit, and delete critical messages
- Set start and end times for messages
- Configure severity levels
- Manage which messages are currently active

---

## Components Created

### 1. **CriticalMessageBar.tsx**
- **Location:** `src/components/CriticalMessageBar.tsx`
- **Purpose:** Display active critical messages at the top of the page
- **Features:**
  - Auto-refreshes every 30 seconds
  - Color-coded by severity (red/critical, yellow/warning, blue/info)
  - Dismissible by users
  - Shows end time if applicable

### 2. **CriticalMessageManagement.tsx**
- **Location:** `src/components/CriticalMessageManagement.tsx`
- **Purpose:** Admin interface for managing critical messages
- **Features:**
  - Create new messages with title, content, severity
  - Set start/end times
  - Edit existing messages
  - Delete messages
  - List all messages with status badges

### 3. **Critical Message Service**
- **Location:** `src/services/criticalMessageService.ts`
- **Functions:**
  - `fetchActiveCriticalMessages()` - Get active messages for display
  - `fetchAllCriticalMessages()` - Get all messages for admin
  - `createCriticalMessage()` - Create new message
  - `updateCriticalMessage()` - Update existing message
  - `deleteCriticalMessage()` - Delete a message

### 4. **Types Definition**
- **Location:** `src/types/critical-message.ts`
- **Interfaces:**
  - `CriticalMessage` - Database record type
  - `CriticalMessageInput` - Form input type

### 5. **Database Migration**
- **Location:** `supabase/migrations/20260128000000_create_critical_messages_table.sql`
- **Table:** `critical_messages`
- **Fields:**
  - `id` (UUID) - Unique identifier
  - `title` (TEXT) - Message title
  - `content` (TEXT) - Message body
  - `severity` (TEXT) - critical/warning/info
  - `is_active` (BOOLEAN) - Whether message is active
  - `start_time` (TIMESTAMPTZ) - When to show message
  - `end_time` (TIMESTAMPTZ) - When to stop showing (optional)
  - `created_by` (UUID) - User who created it
  - `created_at` (TIMESTAMPTZ) - Creation timestamp
  - `updated_at` (TIMESTAMPTZ) - Last update timestamp

---

## Setup Instructions

### Step 1: Run Database Migration

Execute the migration to create the `critical_messages` table:

```bash
# Option A: Using Supabase Dashboard
# 1. Go to SQL Editor in Supabase
# 2. Copy and paste the entire migration file content
# 3. Click "Run"

# Option B: Using Supabase CLI (if configured)
supabase db push
```

### Step 2: Verify Dependencies

Ensure these packages are installed (they should already be):
```json
{
  "react": "^18.3.1",
  "react-hot-toast": "^2.6.0",
  "lucide-react": "^0.344.0"
}
```

### Step 3: Clear Node Modules (if needed)

If you get module resolution errors:

```bash
cd /workspaces/PQMAP-codespace
rm -rf node_modules package-lock.json
npm install
```

### Step 4: Restart Development Server

```bash
npm run dev
```

---

## Usage Guide

### For Users (Notification Bar)

1. **Log in to the application**
2. **Critical messages appear at the top** in a colored banner
3. **Messages show:**
   - Title (e.g., "Typhoon Signal No.8")
   - Content/Description
   - End time (if applicable)
   - Severity indicator (icon and color)
4. **Dismiss a message** by clicking the X button
5. **Messages auto-refresh** every 30 seconds

**Example Message:**
```
🔴 CRITICAL
Typhoon Signal No.8
Typhoon signal No.8 will be hoisted in the coming 1 hour, 
please prepare for it
Valid until: 1/28/2026, 3:00 PM
```

### For Admins (Management Page)

#### Create a New Message

1. **Navigate to:** Data Maintenance → Critical Messages
2. **Click:** "New Message" button
3. **Fill in form:**
   - **Title:** "Typhoon Signal No.8"
   - **Content:** "Typhoon signal No.8 will be hoisted in the coming 1 hour, please prepare for it"
   - **Severity:** Select 🔴 Critical
   - **Active Now:** Check this box
   - **Start Time:** Click to set when to show (defaults to now)
   - **End Time:** Click to set when to stop showing (optional)
4. **Click:** "Create Message"
5. **Confirmation:** Message appears in the list
6. **Notification:** Message appears on all users' screens within 30 seconds

#### Edit a Message

1. Click the **Edit** (pencil) icon on the message card
2. Update any fields
3. Click **"Update Message"**
4. Changes apply immediately

#### Delete a Message

1. Click the **Delete** (trash) icon on the message card
2. Confirm deletion in the popup
3. Message is removed from all screens

#### Message Status Badges

- **ACTIVE** (green) - Message is currently showing to users
- **CRITICAL** / **WARNING** / **INFO** (red/yellow/blue) - Severity level

---

## Severity Levels Explained

### 🔴 Critical
- **When to use:** System down, severe outages, immediate action required
- **Example:** "Typhoon Signal No.8 - Seek shelter immediately"
- **Color:** Red background with red icon
- **User impact:** Most visible, demanding attention

### 🟡 Warning
- **When to use:** Important but not immediate, precautions recommended
- **Example:** "Heavy rain expected - Monitor area"
- **Color:** Yellow background with yellow icon
- **User impact:** Medium visibility

### 🔵 Info
- **When to use:** General announcements, maintenance notices
- **Example:** "System maintenance 2-3 AM tonight"
- **Color:** Blue background with blue icon
- **User impact:** Low visibility (informational)

---

## Technical Architecture

### Data Flow

```
User logs in
    ↓
CriticalMessageBar component mounts
    ↓
fetchActiveCriticalMessages() called
    ↓
Supabase query (with Row Level Security)
    ↓
Active messages returned (filtered by time)
    ↓
Messages displayed with color coding
    ↓
Auto-refresh every 30 seconds
```

### Row Level Security (RLS) Policies

**Policy 1: Users can view active messages**
- All authenticated users can see messages where:
  - `is_active = true`
  - `start_time <= NOW()`
  - `end_time IS NULL OR end_time > NOW()`

**Policy 2: Only admins can manage all messages**
- system_admin and system_owner can:
  - Read all messages (active or inactive)
  - Create new messages
  - Update messages
  - Delete messages

### Time Handling

- All times stored in **UTC** (TIMESTAMPTZ)
- Display converted to **user's local timezone**
- Comparison uses `NOW()` function in Supabase

Example:
```typescript
// If start_time = 2026-01-28T14:00:00Z
// and user is in GMT+8
// Display shows: 2026-01-28 10:00 PM (local time)
```

---

## Common Scenarios

### Scenario 1: Weather Warning System

**When:** Typhoon warning issued
**Steps:**
1. Admin clicks "New Message"
2. Fills in:
   - Title: "Typhoon Signal No.10"
   - Severity: Critical
   - Content: "Signal No.10 hoisted. Stay indoors."
   - Start Time: Now
   - End Time: 3 hours from now
3. Creates message
4. All users see red banner within 30 seconds
5. Message automatically disappears after 3 hours

### Scenario 2: System Maintenance

**When:** Scheduled database maintenance
**Steps:**
1. Admin creates message:
   - Title: "System Maintenance"
   - Severity: Warning
   - Content: "Database maintenance 2-3 AM. Service may be slow."
   - Start: 2 hours before maintenance
   - End: After maintenance completes
2. Users see yellow banner with warning
3. Admin can edit if maintenance extends

### Scenario 3: General Announcement

**When:** New feature released or policy update
**Steps:**
1. Admin creates message:
   - Title: "New Feature Available"
   - Severity: Info
   - Content: "Check out the new SARFI Report builder..."
   - Start: Now
   - End: Leave blank (indefinite)
2. Users see blue info banner
3. Message stays until admin deletes it

---

## Troubleshooting

### Messages not showing?

**Check 1:** Is message `is_active` = true?
- Admin page shows badge "ACTIVE" if true

**Check 2:** Is the current time between start and end?
- Message must have `start_time <= NOW()`
- Message must have `end_time IS NULL OR end_time > NOW()`

**Check 3:** Is the page loaded?
- Refresh browser (F5)
- Messages appear in 30 seconds of page load

### Error: "Failed to load messages"

**Cause:** Database connection or permissions
**Fix:**
1. Check if user is logged in
2. Verify database migration ran successfully
3. Check browser console for detailed error
4. Try logging out and back in

### Message appears for some users but not others

**Likely Cause:** Timezone differences
**Details:**
- All times stored in UTC
- Local display converts to user's timezone
- This is expected behavior

---

## File Locations Summary

| File | Purpose |
|------|---------|
| `src/components/CriticalMessageBar.tsx` | Display component |
| `src/components/CriticalMessageManagement.tsx` | Admin page |
| `src/services/criticalMessageService.ts` | Database service |
| `src/types/critical-message.ts` | TypeScript types |
| `supabase/migrations/20260128000000_create_critical_messages_table.sql` | Database schema |
| `src/App.tsx` | Integrated notification bar & route |
| `src/components/Navigation.tsx` | Added admin page link |

---

## Future Enhancements

1. **Email Notifications** - Send critical messages to user emails
2. **SMS/SMS Gateway** - Send urgent messages via SMS
3. **Sound Alert** - Play alert sound for critical messages
4. **Mobile Push** - Send push notifications to mobile apps
5. **Message Templates** - Pre-made templates for common scenarios
6. **Bulk Dismissal** - Users can "Mark as read for all"
7. **Statistics** - Track which messages users dismissed vs. saw
8. **Scheduling UI** - Calendar widget for easier date/time selection

---

## Support & Maintenance

### Regular Maintenance Tasks

- **Weekly:** Check if old messages need archival
- **Monthly:** Review message effectiveness (which ones users actually read?)
- **Quarterly:** Clean up expired messages from database

### Archival Strategy

Messages older than 30 days can be moved to archive table or deleted:

```sql
-- Delete messages older than 30 days
DELETE FROM critical_messages
WHERE created_at < NOW() - INTERVAL '30 days'
AND is_active = false;
```

---

**Last Updated:** January 28, 2026  
**Version:** 1.0  
**Status:** Ready for Production
