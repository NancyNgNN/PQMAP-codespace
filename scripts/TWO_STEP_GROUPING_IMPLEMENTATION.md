# Two-Step Selection Pattern Implementation

**Date:** January 29, 2026  
**Feature:** Add children to existing mother events using multi-select  
**Status:** ✅ Implemented

---

## 🎯 Feature Overview

Users can now:
1. **Create new groups** - Select 2+ standalone events → "Group Events"
2. **Expand existing groups** - Select 1 mother + 1+ standalone events → "Add to Group"

---

## 🔄 User Workflow

### Scenario 1: Create New Group
```
1. Click "Multi-Select" button
2. Check 2 or more standalone voltage_dip/swell events
3. Button shows: "Group Events (N)"
4. Click button → First event becomes mother, others become children
```

### Scenario 2: Add Children to Existing Mother
```
1. Click "Multi-Select" button
2. Check ONE mother event (has GitBranch icon)
3. Check one or more standalone voltage_dip/swell events
4. Button shows: "Add to Group (N)"
5. Click button → Selected events become children of the mother
```

---

## 🛠️ Technical Implementation

### 1. Checkbox Visibility (EventManagement.tsx)

**Tree View & List View:**
```typescript
// Show checkboxes for:
// ✅ Mother events (voltage_dip/swell only)
// ✅ Standalone events (voltage_dip/swell only)
// ❌ Child events (never selectable)

const showCheckbox = isMultiSelectMode && 
  !event.parent_event_id && 
  (event.event_type === 'voltage_dip' || event.event_type === 'voltage_swell');
```

### 2. Smart Button Logic (EventManagement.tsx, Lines ~1573-1634)

```typescript
const selectedEvents = events.filter(e => selectedEventIds.has(e.id));
const motherEvents = selectedEvents.filter(e => e.is_mother_event);
const standaloneEvents = selectedEvents.filter(e => !e.is_mother_event && !e.parent_event_id);

const isAddToGroup = motherEvents.length === 1 && standaloneEvents.length > 0;
const isNewGroup = motherEvents.length === 0 && standaloneEvents.length >= 2;
const isInvalidSelection = motherEvents.length > 1;

const buttonText = isAddToGroup 
  ? `Add to Group (${standaloneEvents.length})` 
  : `Group Events (${selectedEventIds.size})`;
```

**Button States:**

| Selection | Button Text | Enabled | Action |
|-----------|-------------|---------|--------|
| 2+ standalone | "Group Events (N)" | ✅ Yes | Create new group |
| 1 mother + N standalone | "Add to Group (N)" | ✅ Yes | Add children |
| 1 mother only | "Add to Group (0)" | ❌ No | Need children |
| 2+ mothers | "Group Events (N)" | ❌ No | Too many mothers |
| Mixed invalid | - | ❌ No | Invalid selection |

### 3. New Service Method (mother-event-grouping.ts)

```typescript
/**
 * Add child events to an existing mother event
 * Used for expanding existing groups with new events
 */
static async addChildrenToMotherEvent(
  motherEventId: string, 
  childEventIds: string[]
): Promise<boolean>
```

**Validation Checks:**
1. ✅ Mother event exists and `is_mother_event = true`
2. ✅ All children are voltage_dip or voltage_swell
3. ✅ Children are not already grouped
4. ✅ All events from same substation
5. ✅ At least one child event provided

**Database Updates:**
```sql
UPDATE pq_events 
SET parent_event_id = $motherEventId,
    is_child_event = true
WHERE id IN ($childEventIds);
```

### 4. Updated Handler (EventManagement.tsx, Lines 1057-1125)

```typescript
const handleGroupEvents = async (eventIds: string[]) => {
  const selectedEvents = events.filter(e => eventIds.includes(e.id));
  const motherEvents = selectedEvents.filter(e => e.is_mother_event);
  const standaloneEvents = selectedEvents.filter(e => !e.is_mother_event && !e.parent_event_id);
  
  // Scenario 1: Add to existing group
  if (motherEvents.length === 1 && standaloneEvents.length > 0) {
    await MotherEventGroupingService.addChildrenToMotherEvent(
      motherEvents[0].id, 
      standaloneEvents.map(e => e.id)
    );
  }
  
  // Scenario 2: Create new group
  else if (motherEvents.length === 0 && standaloneEvents.length >= 2) {
    await MotherEventGroupingService.performManualGrouping(eventIds);
  }
  
  // Invalid scenario
  else {
    alert('Invalid selection...');
  }
};
```

### 5. Select All Logic (EventManagement.tsx, Line 1173)

```typescript
const handleSelectAll = () => {
  // Select all mother events AND standalone events
  // Only voltage_dip and voltage_swell types
  const selectableEvents = finalEvents.filter(e => 
    !e.parent_event_id && 
    (e.event_type === 'voltage_dip' || e.event_type === 'voltage_swell')
  );
  setSelectedEventIds(new Set(selectableEvents.map(e => e.id)));
};
```

---

## 🧪 Testing Scenarios

### Test 1: Create New Group ✅
**Steps:**
1. Multi-select mode ON
2. Select 3 standalone voltage_dip events
3. Button shows "Group Events (3)"
4. Click → First event becomes mother

**Expected:**
- 1 mother event created
- 2 child events linked to mother
- Success message: "Events grouped successfully!"

### Test 2: Add to Existing Group ✅
**Steps:**
1. Multi-select mode ON
2. Select 1 mother event (with GitBranch icon)
3. Select 2 standalone voltage_dip events
4. Button shows "Add to Group (2)"
5. Click → Events added as children

**Expected:**
- Mother event unchanged
- 2 new child events added
- Success message: "Successfully added 2 event(s) to the group."

### Test 3: Invalid - Multiple Mothers ❌
**Steps:**
1. Select 2 mother events
2. Button disabled
3. Warning: "⚠️ Only one mother event allowed"

**Expected:**
- Button disabled
- Cannot proceed

### Test 4: Invalid - Only Mother, No Children ❌
**Steps:**
1. Select 1 mother event only
2. Button disabled

**Expected:**
- Button disabled
- Tooltip: "Select 1 mother + children OR 2+ standalone events"

### Test 5: Mixed Event Types ❌
**Steps:**
1. Select 1 voltage_dip + 1 harmonic event
2. Button disabled (harmonic has no checkbox)

**Expected:**
- Harmonic event has no checkbox
- Only voltage_dip selected

### Test 6: Select All ✅
**Steps:**
1. Multi-select mode ON
2. Click "Select All"
3. All mothers + standalone voltage_dip/swell selected

**Expected:**
- Checkboxes appear for all voltage_dip/swell events (mothers + standalone)
- Child events have no checkbox
- Harmonic/other types have no checkbox

---

## 🎨 UI Indicators

### Visual Feedback

**Mother Event Indicators:**
- 🌿 **GitBranch icon** (purple) next to event name
- **Child count** displayed: "→ 2 PQ child events"

**Selection States:**
- **Selected:** Green background (`bg-green-50 border-green-300`)
- **Hover:** Blue background on click
- **Invalid:** Red warning text below button

**Button States:**
- **Enabled:** Purple background (`bg-purple-600`)
- **Disabled:** Gray/faded (`opacity-50`)
- **Tooltip:** Hover to see selection requirements

---

## 📊 Console Logging

Debug logs added for troubleshooting:

```javascript
// Button click
🎯 [Multi-Select Button Clicked] { 
  previousMode: false, 
  newMode: true, 
  filteredEventsCount: 584 
}

// Checkbox rendering
🔍 [Tree View Checkbox Debug] { 
  eventType: 'voltage_dip', 
  isMotherEvent: true, 
  showCheckbox: true 
}

// Button logic
🎯 [Smart Button Logic] { 
  motherCount: 1, 
  standaloneCount: 2, 
  isAddToGroup: true, 
  buttonText: 'Add to Group (2)' 
}

// Grouping action
🔧 [handleGroupEvents] { 
  totalSelected: 3, 
  motherCount: 1, 
  standaloneCount: 2 
}
➕ Adding children to existing mother: { 
  motherEventId: 'abc-123', 
  childCount: 2 
}
✅ Children added successfully
```

---

## 🚫 Business Rules

### Can Be Selected (Checkboxes Shown)
✅ **Mother events** - voltage_dip or voltage_swell  
✅ **Standalone events** - voltage_dip or voltage_swell, not grouped

### Cannot Be Selected (No Checkbox)
❌ **Child events** - Already in a group  
❌ **Other event types** - harmonic, interruption, transient, flicker  
❌ **Already processing** - During grouping operation

### Grouping Rules
✅ **Create new group:** 2+ standalone events  
✅ **Add to group:** 1 mother + 1+ standalone events  
❌ **Invalid:** Multiple mothers selected  
❌ **Invalid:** Only 1 event selected  
❌ **Invalid:** Mixed event types  
❌ **Invalid:** Events from different substations

---

## 🔄 Database Schema

No changes required. Uses existing fields:
- `is_mother_event` (boolean)
- `is_child_event` (boolean)
- `parent_event_id` (uuid, nullable)
- `event_type` (enum)
- `substation_id` (uuid)

---

## 📝 Files Modified

### 1. `/src/components/EventManagement/EventManagement.tsx`
- **Lines 1173-1179:** Updated `handleSelectAll()` to include mother events
- **Lines 1557-1576:** Added debug logging to Multi-Select button
- **Lines 1573-1634:** Implemented smart button logic with dynamic text
- **Lines 1057-1125:** Updated `handleGroupEvents()` to handle both scenarios
- **Lines 2194-2226:** Tree view checkbox now shows for mother events
- **Lines 2301-2333:** List view checkbox now shows for mother events

### 2. `/src/services/mother-event-grouping.ts`
- **Lines 88-165:** New method `addChildrenToMotherEvent()`

---

## 🎓 User Documentation

### Quick Start Guide

**To create a new event group:**
1. Click "Multi-Select"
2. Check 2+ standalone events (voltage_dip/swell)
3. Click "Group Events"

**To add events to existing group:**
1. Click "Multi-Select"
2. Check 1 mother event (has branch icon 🌿)
3. Check 1+ standalone events (voltage_dip/swell)
4. Click "Add to Group"
5. Confirm addition

**To ungroup events:**
- Open mother event details
- Click "Ungroup Events" button
- All children become standalone

---

## ✅ Completion Checklist

- [x] Checkboxes appear for mother events
- [x] Checkboxes appear for standalone events
- [x] No checkboxes for child events
- [x] Smart button text changes based on selection
- [x] Button disabled for invalid selections
- [x] New service method `addChildrenToMotherEvent()`
- [x] Validation prevents multiple mothers
- [x] Success/error messages implemented
- [x] Console logging for debugging
- [x] Select All includes mother events
- [x] Database updates working correctly
- [x] UI indicators (icons, colors) correct
- [x] Documentation completed

---

## 🐛 Known Issues / Future Enhancements

### Potential Improvements
1. **Batch operations** - Add multiple groups at once
2. **Drag & drop** - Drag events into groups visually
3. **Preview mode** - Show what will happen before executing
4. **Undo operation** - Rollback grouping mistakes
5. **Group naming** - Allow custom names for mother events

### Edge Cases to Monitor
- Very large selections (100+ events)
- Network latency during grouping
- Concurrent grouping operations by multiple users
- Events with missing substation data

---

**Status:** ✅ Feature Complete and Tested  
**Deployment Date:** January 29, 2026  
**Next Review:** As needed based on user feedback
