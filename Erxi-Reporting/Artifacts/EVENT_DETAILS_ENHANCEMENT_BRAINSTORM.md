# Event Details Enhancement - Brainstorming Session

**Date:** December 10, 2025  
**Context:** Enhance Event Details component to display more PQ event data fields and improve child events presentation

---

## 📊 Current Schema Analysis

### ✅ Fields Currently Displayed in EventDetails.tsx
1. **Basic Info**: `id`, `event_type`, `timestamp`, `magnitude`, `duration_ms`
2. **Classification**: `severity`, `status`, `affected_phases`
3. **Relationships**: `is_mother_event`, `parent_event_id`, `root_cause`
4. **Location**: `substation` (name, voltage_level)
5. **Customer Impact**: Via `EventCustomerImpact` join

### ❌ Missing Fields NOT Displayed
According to `database.ts` PQEvent interface and DATABASE_SCHEMA.md:

#### Critical Missing Fields:
1. **`voltage_level`** (string) - Event voltage classification (400kV, 132kV, 11kV, 380V)
2. **`circuit_id`** (string) - Circuit identifier
3. **`customer_count`** (number | null) - Number of affected customers
4. **`remaining_voltage`** (number | null) - Voltage % during event (critical for SARFI)
5. **`validated_by_adms`** (boolean) - ADMS validation status
6. **`is_special_event`** (boolean) - Exclude from SARFI calculations flag

#### Mother Event Grouping Fields:
7. **`is_child_event`** (boolean) - Currently not displayed
8. **`grouping_type`** ('automatic' | 'manual' | null) - How event was grouped
9. **`grouped_at`** (string | null) - When event was grouped

#### Metadata:
10. **`meter_id`** (uuid) - Recording meter (shown in filter but not details)
11. **`created_at`** (timestamp) - Record creation time
12. **`resolved_at`** (timestamp) - Resolution time (shown only when resolved)

---

## 🎨 Design Proposals

### **Proposal 1: Tabbed Interface (Recommended)**
Organize information into logical tabs to reduce visual clutter.

#### Tab Structure:
```
┌─────────────────────────────────────────────────────────────┐
│ [Overview] [Technical] [Impact] [Child Events] [Timeline]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Tab Content Here                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Tab 1: **Overview** (Default)
- Event Type, Severity, Status
- Timestamp, Duration, Magnitude
- Substation, Location
- Quick Actions (Status Change, Delete)

#### Tab 2: **Technical**
- ⚡ Voltage Level (event.voltage_level)
- 🔌 Circuit ID (event.circuit_id)
- 📊 Remaining Voltage % (event.remaining_voltage)
- 📡 Meter ID (event.meter_id) with meter details
- 🌊 Affected Phases (event.affected_phases)
- ✅ ADMS Validation (event.validated_by_adms)
- 🏷️ Special Event Flag (event.is_special_event)
- 📈 Waveform Viewer (existing WaveformDisplay component)

#### Tab 3: **Impact Analysis**
- 👥 Customer Count (event.customer_count)
- 📋 Detailed Customer List (current impacts table)
- 📍 Impact Level Breakdown (severe/moderate/minor)
- ⏱️ Estimated Downtime Statistics

#### Tab 4: **Child Events** (Only for Mother Events)
- **Collapsible/Expandable Table** instead of cards
- Columns: Type | Time | Severity | Circuit | Remaining Voltage | Actions
- Click row to navigate (keep existing behavior)
- Show grouping info: `grouping_type` (Auto/Manual), `grouped_at`

#### Tab 5: **Timeline**
- 📅 Created At (event.created_at)
- 👁️ First Detected (event.timestamp)
- ⏰ Duration (event.duration_ms)
- ✅ Resolved At (event.resolved_at)
- 🔗 Grouped At (event.grouped_at) - if applicable
- Visual timeline component

---

### **Proposal 2: Accordion/Collapsible Sections**
Keep single-page layout but organize into collapsible sections.

```
▼ Basic Information (always expanded)
▼ Technical Details (click to expand)
▼ Customer Impact (click to expand)
▼ Child Events (2) (click to expand - only for mother events)
▼ Event Timeline (click to expand)
```

**Pros:**
- No need to switch tabs
- Can expand multiple sections simultaneously
- Good for printing/exporting

**Cons:**
- Longer scrolling
- Can feel cluttered if all expanded

---

### **Proposal 3: Split-View (Side-by-Side)**
Divide screen into two columns.

```
┌────────────────────┬──────────────────────────────┐
│                    │                              │
│  Mother Event      │  Technical Details           │
│  Details           │  • Voltage Level             │
│                    │  • Circuit ID                │
│  Basic Info        │  • Remaining Voltage         │
│  Impact Summary    │  • ADMS Validation           │
│  Status Controls   │  • Waveform                  │
│                    │                              │
├────────────────────┤                              │
│                    │                              │
│  Child Events (2)  │                              │
│  [Table/Cards]     │                              │
│                    │                              │
└────────────────────┴──────────────────────────────┘
```

**Pros:**
- More information visible at once
- Good use of wide screens

**Cons:**
- Less space per section
- Not mobile-friendly

---

## 🔧 Child Events Presentation Options

### **Option 1: Modal/Overlay Table (Your Suggestion)**
```tsx
<button onClick={() => setShowChildEventsModal(true)}>
  View Child Events (2)
</button>

// Modal shows full-width table with all child event details
```

**Pros:**
- Doesn't clutter main view
- Can show full table with all columns
- Can add sorting, filtering within modal
- Easy to close and return to mother event

**Cons:**
- Requires extra click to see child events
- Loses context when modal is open

---

### **Option 2: Inline Expandable Table** (Recommended)
```tsx
<div className="child-events-section">
  <button onClick={() => setExpanded(!expanded)}>
    {expanded ? '▼' : '▶'} Child Events (2)
  </button>
  
  {expanded && (
    <table className="child-events-table">
      <!-- Full table with sortable columns -->
    </table>
  )}
</div>
```

**Pros:**
- No modal needed, stays in context
- Can expand/collapse quickly
- Shows all details when expanded
- Keeps navigation stack visible

**Cons:**
- Takes up space when expanded
- May push other content down

---

### **Option 3: Side Drawer/Slide-out Panel**
```
Mother Event Details          │ [Slide-out from right]
                              │ Child Events (2)
[Normal Details View]         │ ├─ Event 1
                              │ ├─ Event 2
                              │ [Click to view details]
```

**Pros:**
- Doesn't cover mother event details
- Modern UX pattern
- Can stay open while reviewing mother event

**Cons:**
- Complex to implement
- May feel disconnected

---

### **Option 4: Two-Table Layout (Original System Style)**
Keep the original system's approach but enhance it:

```
┌─────────────────────────────────────────────────┐
│ Mother Events Table                             │
│ [Row selected highlights child section below]   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Child Events Table (filtered by selected mother)│
│ [Shows children of selected mother event]       │
└─────────────────────────────────────────────────┘
```

**In Event Details Context:**
```tsx
// In EventDetails component
{currentEvent.is_mother_event && (
  <div className="border-t pt-4 mt-4">
    <h3>Related Child Events ({childEvents.length})</h3>
    <ChildEventsTable 
      events={childEvents} 
      onEventClick={handleChildEventClick}
    />
  </div>
)}
```

**Pros:**
- Familiar pattern from original system
- Clear visual hierarchy
- All child events visible at once

**Cons:**
- Takes more vertical space
- Need to scroll if many children

---

## 📋 Recommended Implementation Plan

### **Phase 1: Add Missing Fields to EventDetails**

#### 1.1 Technical Details Section
```tsx
<div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
  <h4>Technical Specifications</h4>
  <dl className="grid grid-cols-2 gap-3">
    <div>
      <dt>Voltage Level:</dt>
      <dd>{event.voltage_level || 'N/A'}</dd>
    </div>
    <div>
      <dt>Circuit ID:</dt>
      <dd>{event.circuit_id || 'N/A'}</dd>
    </div>
    <div>
      <dt>Remaining Voltage:</dt>
      <dd>{event.remaining_voltage ? `${event.remaining_voltage}%` : 'N/A'}</dd>
    </div>
    <div>
      <dt>ADMS Validated:</dt>
      <dd>{event.validated_by_adms ? '✅ Yes' : '❌ No'}</dd>
    </div>
    <div>
      <dt>Special Event:</dt>
      <dd>{event.is_special_event ? '⭐ Yes' : 'No'}</dd>
    </div>
    <div>
      <dt>Grouping Type:</dt>
      <dd>{event.grouping_type ? event.grouping_type : 'N/A'}</dd>
    </div>
  </dl>
</div>
```

#### 1.2 Customer Impact Enhancement
```tsx
<div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg">
  <h4>Customer Impact Summary</h4>
  <div className="flex items-center gap-4 mb-3">
    <div>
      <span className="text-3xl font-bold">{event.customer_count || 0}</span>
      <p className="text-sm text-slate-600">Affected Customers</p>
    </div>
    <div>
      <span className="text-3xl font-bold">{impacts.length}</span>
      <p className="text-sm text-slate-600">Detailed Records</p>
    </div>
  </div>
  {/* Existing impacts table */}
</div>
```

#### 1.3 Timeline Section
```tsx
<div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
  <h4>Event Timeline</h4>
  <div className="space-y-2">
    <div className="flex justify-between">
      <span>Created:</span>
      <span>{new Date(event.created_at).toLocaleString()}</span>
    </div>
    <div className="flex justify-between">
      <span>Detected:</span>
      <span>{new Date(event.timestamp).toLocaleString()}</span>
    </div>
    {event.grouped_at && (
      <div className="flex justify-between">
        <span>Grouped:</span>
        <span>{new Date(event.grouped_at).toLocaleString()}</span>
      </div>
    )}
    {event.resolved_at && (
      <div className="flex justify-between">
        <span>Resolved:</span>
        <span>{new Date(event.resolved_at).toLocaleString()}</span>
      </div>
    )}
  </div>
</div>
```

---

### **Phase 2: Enhanced Child Events Display**

#### Recommended: **Inline Expandable Table + Quick View Cards**

**Default View** (Collapsed):
```tsx
{currentEvent.is_mother_event && (
  <div className="border-t pt-4 mt-4">
    <button 
      onClick={() => setShowChildTable(!showChildTable)}
      className="flex items-center gap-2 w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-lg"
    >
      <GitBranch className="w-5 h-5" />
      <span className="font-semibold">
        {showChildTable ? '▼' : '▶'} Child Events ({childEvents.length})
      </span>
      <span className="text-sm text-slate-600 ml-auto">
        Click to {showChildTable ? 'collapse' : 'expand'}
      </span>
    </button>
  </div>
)}
```

**Expanded View** (Table):
```tsx
{showChildTable && (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-slate-100">
          <th>Type</th>
          <th>Time</th>
          <th>Severity</th>
          <th>Circuit</th>
          <th>Voltage Level</th>
          <th>Remaining %</th>
          <th>Duration</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {childEvents.map(child => (
          <tr 
            key={child.id}
            className="border-b hover:bg-slate-50 cursor-pointer"
            onClick={() => handleChildEventClick(child)}
          >
            <td>{child.event_type}</td>
            <td>{new Date(child.timestamp).toLocaleString()}</td>
            <td>
              <span className={`px-2 py-1 rounded text-xs ${
                child.severity === 'critical' ? 'bg-red-100 text-red-700' :
                child.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {child.severity}
              </span>
            </td>
            <td>{child.circuit_id || 'N/A'}</td>
            <td>{child.voltage_level || 'N/A'}</td>
            <td>{child.remaining_voltage ? `${child.remaining_voltage}%` : 'N/A'}</td>
            <td>{child.duration_ms}ms</td>
            <td>
              <button className="text-blue-600 hover:underline text-sm">
                View Details →
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
```

---

## 🎯 Final Recommendations

### **UI Layout: Tabbed Interface**
Use tabs to organize information logically without overwhelming the user.

### **Child Events: Inline Expandable Table**
- Default: Collapsed with count badge
- Expanded: Full table with all technical details
- Click row to navigate to child event details (keep existing behavior)

### **Display All Missing Fields**
Organize into logical sections:
1. **Basic Info** (existing + voltage_level)
2. **Technical Details** (circuit_id, remaining_voltage, meter_id, ADMS validation, special event flag)
3. **Customer Impact** (customer_count + existing impacts table)
4. **Grouping Info** (grouping_type, grouped_at) - only if grouped
5. **Timeline** (created_at, timestamp, grouped_at, resolved_at)

### **Visual Indicators**
- 🟢 Green badge for ADMS validated events
- ⭐ Star icon for special events
- 🤖 "Auto" / 👤 "Manual" badges for grouping type
- 📊 Charts for customer impact distribution (pie chart: severe/moderate/minor)

---

## 📝 Database Schema Updates Needed

### Current Status: ✅ **All fields already in schema!**

According to `DATABASE_SCHEMA.md`, all required fields are present:
- ✅ `voltage_level` (pq_events table)
- ✅ `circuit_id` (pq_events table)
- ✅ `customer_count` (pq_events table)
- ✅ `remaining_voltage` (pq_events table)
- ✅ `validated_by_adms` (pq_events table)
- ✅ `is_special_event` (pq_events table)
- ✅ `is_child_event` (pq_events table)
- ✅ `grouping_type` (pq_events table)
- ✅ `grouped_at` (pq_events table)

**TypeScript Interface Status:** ✅ All fields present in `database.ts` PQEvent interface

**No migration needed!** Just need to update UI to display these fields.

---

## 🚀 Implementation Steps

### Step 1: Update EventDetails Component
1. Add new sections for missing fields
2. Enhance customer impact display with `customer_count`
3. Add timeline visualization
4. Show ADMS validation and special event badges

### Step 2: Implement Child Events Table
1. Create expandable section
2. Build table component with all columns
3. Add sorting/filtering capabilities
4. Keep existing navigation behavior

### Step 3: Add Visual Enhancements
1. Color-coded severity badges
2. Icons for technical specifications
3. Progress bar for remaining voltage
4. Timeline component for event lifecycle

### Step 4: Testing
1. Test with mother events (with children)
2. Test with standalone events
3. Test with child events (parent_event_id set)
4. Verify all data fields display correctly

---

## 💡 Additional Enhancement Ideas

### 1. **Export Event Details**
Button to export event details as PDF/Excel for reporting.

### 2. **Event Comparison**
Compare current event with similar past events (same circuit, similar magnitude).

### 3. **Related Events Map**
Visual map showing related events across substations.

### 4. **SARFI Impact Indicator**
Show if event is included in SARFI calculations and its contribution.

### 5. **Quick Actions Panel**
- Mark as Special Event
- Validate with ADMS
- Add to Report
- Create Notification Rule

---

## ❓ Questions for User

1. **Tab vs. Accordion:** Which layout do you prefer for organizing the information?
   - [ ] Tabbed interface (cleaner, less scrolling)
   - [ ] Accordion sections (see multiple sections at once)
   - [ ] Split-view (side-by-side columns)

2. **Child Events Display:** Which presentation do you prefer?
   - [ ] Inline expandable table (recommended)
   - [ ] Modal/overlay table
   - [ ] Side drawer panel
   - [ ] Always visible table below mother event

3. **Additional Features:** Which enhancements are most valuable?
   - [ ] Export to PDF/Excel
   - [ ] Event comparison with history
   - [ ] Visual timeline component
   - [ ] Customer impact charts (pie/bar)
   - [ ] Quick actions panel

4. **Field Priority:** Which missing fields are most critical to display?
   - [ ] All fields are equally important
   - [ ] Prioritize: voltage_level, circuit_id, remaining_voltage
   - [ ] Prioritize: customer_count, ADMS validation
   - [ ] Prioritize: grouping info, timeline

---

**Ready to implement based on your feedback!** 🎨✨
