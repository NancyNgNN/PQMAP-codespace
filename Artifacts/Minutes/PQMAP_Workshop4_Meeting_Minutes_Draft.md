# PQMAP Workshop #4 (Work Level) - Meeting Minutes

**Date:** January 27, 2026  
**Meeting Type:** Workshop Session - Work Level  
**Duration:** ~75 minutes (00:00:03 - 01:15:30)  
**Participants:**
- Arthur Chan (Arthur Man Him) - Project Lead
- Woody Chan (Woody Hing Lok) - CLP Operations
- Chun Chung Chow - Technical Team
- Simon Yu - Business Analyst
- Calvin Wong - Stakeholder
- Kam Tim Fung - Stakeholder
- Crystal Li (Crystal Ngong Yung) - Technical Advisor
- Nancy Ng (Nancy Ying Yin) - Developer

---

## 1. Asset Management - Meter Inventory Interface

### Discussion:
- **Meter List View**: Integration with PMS (Power Monitoring System) for read-only meter inventory data
  - Decided to pull meter master data from PMS rather than maintaining duplicate records in PQMAP
  - Interface will display meter status matrix showing active/inactive status
  
- **Meter Detail Page Structure**: Multiple tabs designed for comprehensive meter information:
  - **Overview Tab**: Basic meter information, installation location, voltage level
  - **Events Tab**: All PQ events associated with the meter with filtering capabilities
  - **Channel Info Tab**: Communication channel details and status
  - **PQ Services Tab**: Customer service records linked to the meter
  - **Energy Profile Tab**: Historical energy consumption patterns
  
- **Communication Events Tracking**: 
  - Track meter disconnect/reconnection events
  - Monitor modem reboot occurrences
  - Log communication failures with timestamps

### Decisions:
- ✅ Meter inventory will be READ-ONLY from PMS
- ✅ All meter management operations must be performed in source systems (PMS/CPDS)
- ✅ PQMAP will serve as a consolidated view, not a data entry point for meter master data

---

## 2. Notification System Design

### 2.1 Internal Notification System (Banner/Popup Messages)

#### Discussion:
- **Message Types**: 
  - Urgent system announcements (banner display)
  - Event-triggered notifications (popup alerts)
  - Administrative messages to operator groups
  
- **Template Management**:
  - Estimated need for approximately 10 notification templates
  - Templates will focus on voltage dip/swell events (NOT harmonics)
  - Variable substitution in templates (e.g., [duration_ms], [voltage_level], [affected_customers])
  
- **Target Events for Notifications**:
  - Voltage dip events only
  - Voltage swell events only
  - NO notifications for harmonic events (confirmed multiple times)

#### Decisions:
- ✅ Implement internal banner/popup notification system
- ✅ Template count: ~10 templates (finalized after further review)
- ✅ Notification scope: Voltage dip/swell events ONLY
- ❌ Message scheduling feature NOT needed (users can use Outlook for scheduled messages)
- ❌ Waveform images NOT needed in email notifications

---

### 2.2 Email Notification Configuration

#### Discussion:
- **Notification Rules**: Based on multiple criteria:
  - Duration thresholds (e.g., events lasting > X milliseconds)
  - Voltage dip percentage (e.g., remaining voltage < Y%)
  - Affected customer count (e.g., customers impacted > Z)
  
- **Email Volume Estimation**:
  - Target recipient groups: 5-20 users per event type
  - Administrative groups: System operators, managers
  - No need for individual user email preferences at this stage
  
- **Email Groups Management**:
  - Email distribution groups will be managed centrally by IT (not in PQMAP)
  - PQMAP will only store group names/references
  - Membership management handled in corporate email system (e.g., "SMP_EHS_support@clp.com.hk")

#### Decisions:
- ✅ Notification rules will support multi-condition logic (duration AND voltage AND customer count)
- ✅ Email groups managed externally; PQMAP stores group references only
- ✅ Notification delivery options: Email only (SMS removed from scope)
- ✅ Email content formats: Full detail OR Summary table (user preference per group)

---

### 2.3 System Alerts & Integration

#### Discussion:
- **Meter Status Alerts**:
  - Alert when meter becomes inactive (30-minute polling cycle from CPDS)
  - Alert for meter communication failures
  - Integration failure alerts with EIP/ADMS systems
  
- **Typhoon Mode (打風模式)**:
  - **Auto-enable**: System will automatically enable typhoon mode based on Weather Information System (WIS) integration
  - **Override capability**: Users can manually disable notifications if needed (rare cases)
  - **Behavior during typhoon mode**:
    - All email notifications STOPPED
    - Internal notifications STOPPED
    - No message queuing (messages discarded during typhoon period)
  - **Resume after typhoon**: Messages NOT sent retroactively; only new events trigger notifications

#### Decisions:
- ✅ Typhoon mode triggered automatically via WIS integration (no manual toggle needed)
- ✅ Users can manually disable notifications if auto-mode is not desired
- ✅ Messages during disabled period will be discarded (no queuing)
- ❌ Template content does NOT change during typhoon mode (templates are event-based, not weather-based)

---

### 2.4 Notification Groups & Recipient Management

#### Discussion:
- **Recipient Groups**:
  - Groups independent of UAM (User Access Management) roles
  - Different notification groups for different event types (Group A, Group B, etc.)
  - Example: Voltage dip events → Group A; System alerts → Group B
  
- **Notification Options per Group/User**:
  - Email full detail vs. Summary table only
  - Critical events only filter option
  - Following William system pattern: 2 options (Email Detail, Email Summary)

#### Decisions:
- ✅ Implement recipient groups separate from UAM roles
- ✅ Groups can be assigned to different notification rules
- ✅ Notification options: Email Detail / Email Summary (follow William system pattern)
- ❌ SMS channel NOT implemented (email only)

---

## 3. Data Maintenance

### 3.1 User Management & Permissions

#### Discussion:
- **UAM Integration**:
  - Users and roles synced from UAM (User Access Management) system
  - Role-based access control to be defined in PQMAP
  - Permission mapping: Which roles can access which modules/pages
  - Permission granularity: View / Edit / Update capabilities per role
  
- **Permission Scope**:
  - Each module/page will have role-based permissions
  - Need to define permission matrix (role vs. module access)

#### Decisions:
- ✅ User and role data pulled from UAM
- ✅ PQMAP will manage module-level permissions (which pages each role can access)
- ✅ Permission details to be discussed in follow-up sessions

---

### 3.2 Master Data Management

#### Discussion:
- **Substation Data**:
  - Synced from William system (read-only in PQMAP)
  - Source of truth: William system
  - All updates to substation data must be done in William
  
- **Station Code Mapping**:
  - **Issue identified**: Different systems use different naming conventions
    - Example: CPDS may use "APA132" (Airport A 132kV)
    - PUDA may use "APA" (without voltage level suffix)
  - **Resolution approach**: 
    - Align station codes across systems (PMS, CPDS, PUDA) in future sessions
    - Determine single source of truth for station codes
    - PUDA has detailed meter hierarchy tree structure to reference
  
- **Customer-Transformer Mapping**:
  - Data source: William system
  - Configuration table maintained in PQMAP (read-only)

#### Decisions:
- ✅ Substation master data: READ-ONLY from William
- ✅ Station code alignment to be discussed offline (PMS/CPDS/PUDA data reconciliation)
- ⏳ Customer-transformer mapping: Sync from William (implementation TBD)

---

### 3.3 PQ Service Data

#### Discussion:
- **PQ Services Tab in Meter Detail Page**:
  - Display PQ service records by customer
  - Data source: PSS (Power System Services) system
  - Show service history and current service status
  
- **Data Entry Point**:
  - All PQ service data entered in PSS system (source system)
  - PQMAP displays data in read-only mode

#### Decisions:
- ✅ PQ service data READ-ONLY from PSS
- ✅ Data entry must be done in PSS (not in PQMAP)

---

### 3.4 Weighting Factors & System Parameters

#### Discussion:
- **Weighting Factors**:
  - Reference data from PUDA system "Profile" configuration
  - Customer count weighting for SARFI calculations
  
- **System Parameters**:
  - Simon Yu to review and provide details on existing system parameters from William
  - ~30+ configuration settings identified in William system
  - Need to determine which parameters to migrate to PQMAP
  - **Action**: Simon to provide spec document or list of parameters

#### Decisions:
- ⏳ Weighting factors data structure to follow PUDA profile model
- ⏳ System parameters: To be discussed after Simon reviews William system configuration
- ❌ SARFI benchmark data (removed from scope in previous sessions)

---

## 4. Security & Access Control

### Discussion:
- **Cyber Security Concerns**:
  - Reference to IaaS (Infrastructure as a Service) vs. SaaS (Software as a Service) considerations
  - PQMAP is IaaS deployment (not external SaaS solution)
  - No third-party external contractor access concerns
  
- **Audit Logging**:
  - **Requirement**: Track user login activities (who logged in, when)
  - **Storage**: Audit logs stored in database (not displayed in UI by default)
  - **Access**: Logs retrieved only when needed for troubleshooting
  - **Decision**: NO dedicated "System Audit" module in UI; logs accessed via database queries

#### Decisions:
- ✅ Audit logs for user activities will be stored in database
- ❌ NO "System Audit" page in UI (logs accessed via DB when needed for investigation)
- ✅ Login tracking: Username, timestamp, IP address stored in backend

---

## 5. Upcoming Milestones

### February 3, 2026 - Scrum Review Session

#### Purpose:
- High-level walkthrough of all PQMAP features
- Demonstration for senior management and SN committee
- Review scope and functionality

#### Preparation:
- Arthur to prepare English presentation for management
- Functional screens to be demonstrated (may have placeholder data if features not fully implemented)
- All attendees to review meeting notes and provide feedback before Feb 3

#### Action Items:
- **Arthur**: Prepare high-level feature walkthrough slides
- **Simon**: Finalize system parameter list from William system
- **Nancy**: Continue documentation updates based on today's discussion
- **All**: Review meeting notes; raise concerns before Feb 3 meeting

---

## Open Items & Follow-Up Actions

### Immediate Actions:
1. **Simon**: 
   - Provide detailed list of system parameters from William
   - Create estimation table (pivot table) for email notification volume by user/role
   
2. **Arthur**: 
   - Finalize Excel documentation updates
   - Prepare Feb 3 presentation materials
   - Schedule offline sessions for station code alignment discussion
   
3. **Nancy**: 
   - Set up GitHub Copilot access (resolve license/extension issues)
   - Continue updating requirements documentation based on meeting notes
   - Follow work-level process documentation pattern

### Follow-Up Discussions Needed:
- **Station Code Mapping**: Align naming conventions across PMS/CPDS/PUDA systems
- **System Parameters**: Review 30+ configuration settings from William system
- **Permission Matrix**: Define role-based access control for each module

---

## Key Clarifications & Changes from Previous Sessions

### Confirmed Decisions:
1. **Notification Scope**: Voltage dip/swell events ONLY (no harmonics)
2. **Email Groups**: Managed externally (corporate email system), not in PQMAP UI
3. **Typhoon Mode**: Auto-enabled via WIS integration (user override available)
4. **Master Data**: PMS, CPDS, William remain source of truth (PQMAP is view-only)
5. **Message Scheduling**: NOT needed (users can use Outlook instead)
6. **Waveform Images**: NOT included in email notifications

### Removed from Scope:
- SMS notification channel
- Message scheduling feature
- System Audit UI module (logs stored in DB only)
- SARFI benchmark data management

---

## AI Assistant Clarification Questions

*This section helps improve the quality of automated summaries and documentation. Please answer any relevant questions below:*

### Notification System
1. **Template Variables**: What are the specific variable names that will be used in notification templates? (e.g., [duration_ms], [voltage_level], [customer_count])
   - **Answer**: 

2. **Email Volume Estimation**: Approximately how many email notifications are expected per day/week during normal operations?
   - **Answer**: 

3. **Typhoon Mode Frequency**: How often does typhoon mode typically activate in a year?
   - **Answer**: 

### Data Integration
4. **Station Code Mapping**: Which system should be considered the primary source of truth for station codes - PMS, CPDS, or PUDA?
   - **Answer**: 

5. **Sync Frequency**: How often should PQMAP sync data from external systems (PMS, William, PSS)? Real-time, hourly, daily?
   - **Answer**: 

### User Access & Permissions
6. **Role Count**: How many different user roles are expected in the UAM system?
   - **Answer**: 

7. **Module Count**: Approximately how many modules/pages will require permission configuration?
   - **Answer**: 

### Technical Requirements
8. **Concurrent Users**: What is the expected number of concurrent users during peak usage?
   - **Answer**: 

9. **Data Retention**: How long should audit logs and historical PQ event data be retained?
   - **Answer**: 

10. **Performance SLA**: Are there specific response time requirements for key operations (e.g., dashboard load time, search queries)?
    - **Answer**: 

### Priority Clarification
11. **Critical Path**: Which features discussed today are most critical for the Feb 3 management review?
    - **Answer**: 

12. **Dependencies**: Are there any external system dependencies (WIS, UAM, PSS) that could block development?
    - **Answer**: 

---

**Meeting End Time:** 01:15:30  
**Next Meeting:** February 3, 2026 (Scrum Review with Management)