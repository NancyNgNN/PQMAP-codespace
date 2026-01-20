# Mother Event Grouping - Questions for Stakeholders
*Generated: December 1, 2025*

## Overview
This document contains questions that need stakeholder input to refine the Mother Event Grouping functionality beyond the basic implementation.

---

## **1. Business Rules & Priorities**

### 1.1 Event Priority Rules
- [ ] Should transmission events (400kV) always become mother events regardless of timing?
- [ ] Should events with higher customer impact take priority as mother events?
- [ ] Are there specific equipment types that should never be grouped (e.g., planned maintenance events)?
- [ ] Should critical/emergency events always remain independent?

### 1.2 Magnitude & Severity Considerations
- [ ] Should events below a certain magnitude threshold be excluded from grouping?
- [ ] If two events occur simultaneously, should magnitude determine the mother event?
- [ ] How should the system handle events with identical timestamps and magnitude?

### 1.3 Voltage Level Hierarchy
- [ ] Should higher voltage events (400kV) always be mother events over lower voltage (11kV)?
- [ ] How should the system handle cross-voltage level grouping?
- [ ] Are there voltage combinations that should never be grouped?

---

## **2. Advanced Grouping Scenarios**

### 2.1 Geographic Considerations
- [ ] Should nearby substations be considered for grouping (e.g., within same district)?
- [ ] How should the system handle events from interconnected substations?
- [ ] Should transmission corridor events be grouped differently?

### 2.2 Event Type Compatibility
- [ ] Can different event types be grouped together (e.g., voltage dip + harmonic event)?
- [ ] Should certain event types always remain separate (e.g., transients)?
- [ ] How should planned vs. unplanned events be handled in grouping?

### 2.3 Cascading Event Handling
- [ ] What's the maximum time window for considering cascading effects?
- [ ] Should the system look for secondary cascades (events caused by child events)?
- [ ] How should rapid succession events (multiple events in seconds) be handled?

---

## **3. User Interface & Workflow**

### 3.1 Manual Grouping Interface
- [x] **IMPLEMENTED**: Users can drag-and-drop events to create groups via multi-select in event list
- [x] **IMPLEMENTED**: Event information displayed during manual grouping selection
- [x] **IMPLEMENTED**: System shows recommendations for potential groupings via auto-group function

### 3.2 Event Detail Interface
- [x] **DECIDED**: Children event tab appears at top section of EventDetails component for mother events only
- [x] **DECIDED**: Child events display exactly like mother events with "Child" label
- [x] **DECIDED**: Clicking child event replaces current view, with back arrow navigation
- [x] **DECIDED**: No multi-select function in event detail (operations done in event list)
- [x] **DECIDED**: Child event details are view/edit only, no grouping operations
- [x] **DECIDED**: When child event selected from event list, show as individual with "Child" label

### 3.3 Validation & Warnings
- [ ] Should the system warn users when grouping events from different:
  - Time periods (beyond 10 minutes)?
  - Substations?
  - Voltage levels?
  - Event types?
- [ ] What confirmation should be required for ungrouping automatic groups?

### 3.4 Visual Representation
- [x] **DECIDED**: No special visual indicators for child events beyond "Child" label
- [ ] Should the tree view show additional metadata (timing, relationship strength)?
- [ ] What icons or colors should represent different grouping states?

---

## **4. Operational Considerations**

### 4.1 Notification Impact
- [ ] When events are grouped, should notifications be:
  - Sent only for the mother event?
  - Consolidated into a single notification?
  - Include summary of all child events?
- [ ] How should notification timing work if grouping happens after initial alerts?

### 4.2 Reporting & Analytics
- [ ] Should grouped events be counted as one event or multiple in statistics?
- [ ] How should SARFI calculations handle grouped events?
- [ ] Should reports show grouped events expanded or summarized?

### 4.3 Historical Data Handling
- [ ] Should the system retroactively group existing historical events?
- [ ] How should grouping changes be audited and logged?
- [ ] Should there be a "grouping confidence score" for automatic groupings?

---

## **5. Performance & Scalability**

### 5.1 Processing Efficiency
- [ ] What's the expected volume of events to process simultaneously?
- [ ] Should grouping run in real-time or batch mode?
- [ ] How should the system handle high-frequency event periods (storms, major outages)?

### 5.2 Configuration Management
- [ ] Should the 10-minute grouping window be:
  - Configurable per user/role?
  - Different for different event types?
  - Adjustable based on system conditions?

---

## **6. Integration Considerations** *(Future)*

### 6.1 External System Impact
- [ ] How should grouped events be represented when sent to other systems?
- [ ] Should external validation (ADMS) affect grouping decisions?
- [ ] How should customer impact calculations work with grouped events?

### 6.2 Data Synchronization
- [ ] If external systems update event data, should grouping be re-evaluated?
- [ ] How should conflicts between automatic and manual grouping be resolved?

---

## **7. Edge Cases & Special Scenarios**

### 7.1 Unusual Event Patterns
- [ ] How should the system handle:
  - Events that span the 10-minute boundary?
  - Multiple simultaneous events at the same substation?
  - Events that could belong to multiple potential groups?

### 7.2 System State Considerations
- [ ] Should grouping behavior change during:
  - Typhoon/storm mode?
  - Maintenance windows?
  - System emergencies?

### 7.3 Data Quality Issues
- [ ] How should the system handle events with:
  - Missing timestamp data?
  - Incorrect substation assignments?
  - Duplicate event entries?

---

## **Priority for Next Discussion**

### **High Priority** *(Needed for Phase 1 implementation)*
1. Business rules for event priority (Section 1.1)
2. Manual grouping interface requirements (Section 3.1)
3. Notification impact decisions (Section 4.1)
4. Configuration management needs (Section 5.2)

### **Medium Priority** *(For Phase 2 enhancement)*
1. Advanced grouping scenarios (Section 2)
2. Visual representation preferences (Section 3.3)
3. Reporting integration (Section 4.2)

### **Low Priority** *(Future considerations)*
1. Integration considerations (Section 6)
2. Edge cases handling (Section 7)

---

## **Meeting Structure Suggestion**

### **Session 1: Core Business Logic** (30 minutes)
- Review Section 1: Business Rules & Priorities
- Decide on basic event priority hierarchy
- Define minimum viable grouping rules

### **Session 2: User Experience** (30 minutes)
- Review Section 3: User Interface & Workflow
- Define manual grouping workflow
- Specify validation and warning requirements

### **Session 3: Operational Impact** (20 minutes)
- Review Section 4: Operational Considerations
- Align with notification and reporting needs
- Define audit and logging requirements

This structured approach ensures all aspects of Mother Event Grouping are thoroughly considered while maintaining focus on immediate implementation needs.