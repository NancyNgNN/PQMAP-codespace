# PQMAP User Survey
## Pre-Implementation User Requirements Validation

**Survey Duration:** 5-10 minutes  
**Target Audience:** Engineers and Customer Service staff who will use the PQMAP system  
**Survey Date:** December 2025  
**Purpose:** To validate requirements and gather user preferences before system implementation

---

## Section 1: Respondent Profile

**1.1 What is your primary role?**
- [ ] Power Quality Engineer
- [ ] Operations Engineer
- [ ] Customer Service Representative
- [ ] System Administrator
- [ ] Manager/Supervisor
- [ ] Other: _______________

**1.2 How often do you currently login PQMS/CPDIS to handle power quality events or customer inquiries?**
### Find out the system usage pattern
- [ ] 2-3 times per day
- [ ] Daily
- [ ] 2-3 times per week
- [ ] Weekly
- [ ] None

**1.3 How long do you spend on PQMS/CPDIS to handle power quality events or customer inquiries per day?**
### Find out the system usage pattern
- [ ] Over 2 hours
- [ ] 1-2 hours
- [ ] less than 1 hour
- [ ] None
- [ ] Other. Please specify: _______

**1.4 How long do you spend daily to consolidate data from PQMS/CPDIS and other system for full picture of PQ events**
### Evaluate the benefit of PQMAP
- [ ] Over 2 hours
- [ ] 1-2 hours
- [ ] less than 1 hour
- [ ] None
- [ ] Other. Please specify: _______

**1.5 How long do you spend daily outside the PQMS/CPDIS to generate reports or diagarm to fulfill internal & external communication?**
### Evaluate the time/cost saving for report generation by PQMAP
- [ ] Over 2 hours
- [ ] 1-2 hours
- [ ] less than 1 hour
- [ ] None
- [ ] Other. Please specify: _______

---

## Section 2: Event Management (Module 1)

**2.1 Which search and filter criteria would you use most frequently?  (Select top 4)**
- [ ] Timestamp/Date range
- [ ] Location
- [ ] Event category [Mother, Children, Voltage Dip, Harmonic, Late]
- [ ] Voltage level
- [ ] Duration threshold
- [ ] Affected customer count
- [ ] IDR number
- [ ] Remaining voltage (%)
- [ ] Validation status (ADMS validated)

**2.2 For event waveform analysis, which features are essential for your work? (Select all that apply)**
- [ ] Zoom in/out capability
- [ ] Waveform filtering
- [ ] Harmonic analysis
- [ ] Time-domain analysis
- [ ] Other. Please specify: _______

**2.3 What is the system logic to automatic grouping as "Mother Event?(Select all that apply)**
- [ ] Timestamp (E.g. Incidents happened in 10 mins)
- [ ] Same location (E.g. Tsuen Wan)
- [ ] Same substation (E.g. Tsuen Wan Chung On Street Substation)
- [ ] Not sure

---

## Section 3: Impact Analysis (Module 2)

**3.1 How important is it to see affected customers for each power quality event?**
### Evaluate the importance to integrate to CCMS/CCS or build a data mapping service
- [ ] Critical - Primary use case
- [ ] Very Important - Frequently needed
- [ ] Moderately Important - Occasionally needed
- [ ] Not Important - Rarely needed

---

## Section 4: Analysis & Reporting (Modules 3 & 5)

**4.1 Which logic or calculation need update in PQMAP? (Select all that apply)**
- [ ] SARFI index
- [ ] False positive events guarding
- [ ] 
- [ ] 
- [ ] 
- [ ] Other. Please specify: _______

**4.2 Which reports are most critical for your work? (Select top 3)**
- [ ] Supply Reliability Report
- [ ] Annual PQ Performance Report
- [ ] EN50160 Weekly Report
- [ ] 10-minute Interval Logs
- [ ] Meter & Communication Availability Report
- [ ] Other. Please specify: _______

**4.3 What export formats do you need? (Select all that apply)**
- [ ] CSV
- [ ] Excel
- [ ] PDF
- [ ] Word
- [ ] XML

---

## Section 5: Dashboard & Visualization (Module 4)

**5.1 Which dashboard widgets would be most valuable for your daily work? (Select top 5)**
### Find out if any reports has zero usage.
- [ ] Affected Substation for ongoing incidents(Map View)
- [ ] Event List (Table View)
- [ ] Event Analysis (Heat Map View)
- [ ] Affected Customer List for specific incidnet (Table View)
- [ ] SARFI-X Trends (Line Chart)
- [ ] Root Cause Analysis by incidents (Histogram)
- [ ] Transmission vs Distribution Voltage Dips for majority factor
- [ ] Affected Equipment/Meter type Summary 
- [ ] Real-time Harmonic Monitoring
- [ ] System Health Status (List view)
- [ ] Notifications/Announcements centre (List view)

**5.2 Should the dashboard be customizable (add/remove/arrange widgets)?**
- [ ] Yes, each user should customize their own view
- [ ] Yes, adopt role-based layout (Engineers, services team, management...etc.)
- [ ] No, standard layout for all users is better
- [ ] Unsure

---

## Section 6: Notifications (Module 7)

**6.1 For which types of events should you receive immediate notifications? (Select all that apply)**
- [ ] All voltage dip events
- [ ] Only significant voltage dips (configurable threshold)
- [ ] Validated PQ events only
- [ ] Harmonic abnormalities
- [ ] Configurable number of customers affected
- [ ] Critical infrastructure affected
- [ ] System abnormalities/errors
- [ ] Other. Please specify: _______________

**6.2 Should notifications be sent only for "Mother Events" to avoid duplicate alerts?**
- [ ] Yes, send only for primary events
- [ ] No, send for all related events
- [ ] Make it configurable
- [ ] Unsure

---

## Section 7: User Experience & Priorities

**7.1 What are your biggest pain points with current power quality event management? (Open-ended)**

_____________________________________________

_____________________________________________

_____________________________________________

**7.2 If you could only have THREE modules implemented first, which would they be?**

1. _____________________________________________

2. _____________________________________________

3. _____________________________________________

**7.3 What concerns do you have about the new PQMAP system? (Open-ended)**

_____________________________________________

_____________________________________________

_____________________________________________

**7.4 What concerns do you have about mastering the new PQMAP system? (Open-ended)**

_____________________________________________

_____________________________________________

_____________________________________________

**7.5 Any additional comments or suggestions?**

_____________________________________________

_____________________________________________

_____________________________________________

---

## Thank You!

Your feedback is invaluable for ensuring PQMAP meets your needs and improves your daily workflow. 

**Estimated Completion Time:** 7-10 minutes

**Contact:** If you have questions about this survey, please contact [Project Manager Name/Email]

---

## Survey Analysis Notes (For Internal Use)

### Key Objectives:
1. **Validate Requirements:** Confirm that documented requirements align with actual user needs
2. **Prioritize Features:** Identify which features are critical vs. nice-to-have
3. **Understand Workflows:** Learn how users currently work and what improvements matter most
4. **Assess Optional Features:** Determine investment priority for AI and smart meter features
5. **Identify Pain Points:** Discover issues not captured in formal requirements
6. **Plan Training:** Understand user experience level and training needs

### Analysis Approach:
- **Quantitative:** Frequency analysis for checkbox questions
- **Priority Mapping:** Weight responses by user role and experience level
- **Qualitative:** Theme extraction from open-ended responses
- **Gap Analysis:** Compare survey results with requirements document
- **Risk Assessment:** Identify potential adoption barriers

### Expected Outcomes:
- Feature prioritization matrix
- User persona refinement
- Training plan requirements
- UI/UX design priorities
- Optional feature go/no-go decisions

# Archive
**2.1 When viewing the event list, which information is MOST important to you? (Select top 3)**
- [ ] Event category (voltage dip, harmonic, flicker, etc.)
- [ ] Location and affected area
- [ ] Timestamp and duration
- [ ] Event status (validated/unvalidated)
- [ ] Number of affected customers
- [ ] Remaining voltage (%)
- [ ] Severity/Priority level

**2.4 Should you have the ability to manually group, ungroup, merge, or delete events?**
- [ ] Yes, full control is essential
- [ ] Yes, but only for certain user roles
- [ ] No, automatic grouping is sufficient
- [ ] Unsure

**3.2 How useful would it be to link voltage dip events with system fault reports (IDR)?**
- [ ] Extremely useful - Would save significant time
- [ ] Very useful - Good for root cause analysis
- [ ] Somewhat useful - Nice to have
- [ ] Not useful - Not part of my workflow

**3.3 For the optional features below, please rate their importance:**

**Load Rejection Analysis** (identifying transformer load drops due to voltage dips)
- [ ] High Priority
- [ ] Medium Priority
- [ ] Low Priority
- [ ] Not Needed

**AI Pattern Recognition** (filtering false positive load rejections)
- [ ] High Priority
- [ ] Medium Priority
- [ ] Low Priority
- [ ] Not Needed

**Smart Meter Event Tracking** (power up/down events during dips)
- [ ] High Priority
- [ ] Medium Priority
- [ ] Low Priority
- [ ] Not Needed

**4.1 Which PQ parameters do you most frequently analyze? (Select all that apply)**
- [ ] Voltage dip magnitude and duration
- [ ] SARFI indices (SARFI-10 to SARFI-90)
- [ ] Harmonic levels (THD, TDD)
- [ ] Power Factor
- [ ] Voltage deviation
- [ ] Flicker
- [ ] Compliance with standards (ITIC, SEMI F47, IEC61000, EN50160)

**4.2 How often do you need to generate reports?**
- [ ] Daily
- [ ] Weekly
- [ ] Monthly
- [ ] Quarterly
- [ ] Annually
- [ ] Ad-hoc/On-demand

**5.2 How important is real-time harmonic monitoring with IEEE 519 compliance alerts?**
- [ ] Critical - Monitor continuously
- [ ] Very Important - Check daily
- [ ] Moderately Important - Check weekly
- [ ] Not Important - Annual review is sufficient

**6.3 How important is the "Typhoon Mode" (suppress notifications during typhoon but continue recording)?**
- [ ] Critical - Essential during severe weather
- [ ] Very Important - Prevents notification overload
- [ ] Moderately Important - Nice to have
- [ ] Not Important - Not needed

### Section 7: Asset Management (Module 6)

**7.1 How often do you need to access meter inventory information?**
- [ ] Daily
- [ ] Weekly
- [ ] Monthly
- [ ] Rarely
- [ ] Never

**7.2 Which meter information is most critical for your work? (Select top 5)**
- [ ] Meter location (GPS coordinates)
- [ ] Meter status (active/abnormal/inactive)
- [ ] Asset and serial numbers
- [ ] IP address and MAC address
- [ ] SCADA code
- [ ] Circuit and voltage level
- [ ] Brand and model
- [ ] Communication status
- [ ] Event history

**7.3 How useful would a map view of meter locations be for identifying event locations?**
- [ ] Extremely useful - Would use frequently
- [ ] Very useful - Good for spatial analysis
- [ ] Somewhat useful - Occasionally helpful
- [ ] Not useful - Prefer table view

**7.4 Should the system allow you to ignore overcurrent signals for specific meters with faulty equipment?**
- [ ] Yes, essential for accurate event detection
- [ ] Yes, but only for administrators
- [ ] No, all signals should be recorded
- [ ] Unsure

---

### Section 8: Integration & Data Access (Modules 8 & 9)

**8.1 How important is it to access historical data (up to 7 years) from multiple systems in one platform?**
- [ ] Critical - Essential for trend analysis
- [ ] Very Important - Frequently needed
- [ ] Moderately Important - Occasionally useful
- [ ] Not Important - Current data is sufficient

**8.2 Which search capabilities are most important? (Select all that apply)**
- [ ] Advanced multi-criteria search
- [ ] Quick search/filter on main screens
- [ ] Saved search templates
- [ ] Natural language search
- [ ] Search history

**8.3 Should the system alert you when interfacing systems (PQMS, CPDIS, ADMS, etc.) have connection issues?**
- [ ] Yes, immediate alerts critical
- [ ] Yes, daily summary is sufficient
- [ ] No, IT team should handle this
- [ ] Unsure

**9.3 Rank the following modules by priority (1 = Highest, 9 = Lowest)**

- [ ] Event Management
- [ ] Impact Analysis
- [ ] Analysis & Reporting
- [ ] Dashboard & Visualization
- [ ] Notifications
- [ ] Asset Management
- [ ] Integration
- [ ] Data Export/Import
- [ ] User Management

**9.4 How much training time would you need to become proficient with the new system?**
- [ ] Less than 1 day
- [ ] 1-2 days
- [ ] 3-5 days
- [ ] 1-2 weeks
- [ ] More than 2 weeks
---