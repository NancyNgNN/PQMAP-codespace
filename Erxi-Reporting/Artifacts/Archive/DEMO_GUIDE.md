# PQMAP - Power Quality Monitoring and Analysis Platform

## Demo Guide

### Overview
PQMAP is a comprehensive web-based platform for monitoring, analyzing, and reporting on power quality events across CLP's electrical grid. This prototype demonstrates the unified platform for engineers and account managers to track voltage dips, harmonics, and other power disturbances.

### Getting Started

#### Demo Login - Quick Start

**First Time Setup:**
1. Open the application in your browser
2. On the login page, click the **"Create Demo User Account"** button
3. Wait for the success message: "Demo user created successfully!"
4. Now sign in with:
   - **Email:** admin@clp.com
   - **Password:** admin123

The demo user will be created with **admin** role and full access to all features.

**If you see "Invalid login credentials":**
- Click the "Create Demo User Account" button first
- This creates the user account in Supabase Auth
- Then you can sign in with the credentials above

### System Features

#### 1. Dashboard (Main View)
- **Real-time Statistics**: Total events, critical events, active substations, average event duration
- **Substation Map**: Visual map showing all substations with event indicators
- **Root Cause Analysis**: Pie chart breakdown of event causes
- **SARFI Metrics**: System Average RMS Variation Frequency Index trends over 12 months
- **Event List**: Searchable and filterable table of recent power quality events

#### 2. Event Management
- **Event List**: Browse all power quality events with detailed information
- **Event Details**: View comprehensive event information including:
  - Location and timestamp
  - Magnitude and duration
  - Severity and status
  - Affected phases
  - Root cause analysis
- **Waveform Display**: Interactive voltage and current waveform visualization
- **Customer Impact**: View affected customers and estimated downtime
- **Status Management**: Update event status (new → acknowledged → investigating → resolved)

#### 3. Data Analytics
- **Events by Type**: Distribution of different event types
- **24-Hour Distribution**: Hourly event occurrence patterns
- **Harmonic Analysis**: Average THD (Total Harmonic Distortion) metrics
- **IEEE 519 Compliance**: Voltage THD limits and current compliance rates
- **Key Metrics**: Voltage dips, interruptions, and distortion statistics

#### 4. Asset Management
- **Meter Inventory**: Complete list of all PQ meters with status
- **Status Tracking**: Active, abnormal, and inactive meter counts
- **Location Mapping**: Meters organized by substation
- **Communication Status**: Last communication timestamps
- **Firmware Versions**: Track meter firmware versions

#### 5. Reporting Tools
- **Report Types**:
  - Supply Reliability Report (IDR and fault analysis)
  - Annual PQ Performance (EN50160, IEEE519 compliance)
  - Meter Availability (Communication and uptime)
  - Customer Impact Analysis
  - Harmonic Analysis
  - Voltage Quality Reports
- **Date Range Selection**: Custom reporting periods
- **Export Formats**: PDF, Excel, CSV, HTML
- **Standards Compliance**: EN50160, IEEE519, IEC61000 metrics

#### 6. Notification System
- **Configurable Rules**: Set up alerts based on event type and severity
- **Multi-channel**: Email and SMS notifications
- **Waveform Attachments**: Include waveform data in alerts
- **Typhoon Mode**: Suppress non-critical alerts during severe weather
- **Recipient Management**: Multiple recipients per rule

#### 7. PQ Services
- **Service Records**: Track customer consultations and site surveys
- **Findings Documentation**: Record observations and measurements
- **Recommendations**: Document suggested improvements
- **Benchmark Standards**: ITIC, SEMI F47, IEC61000, IEEE519
- **Service Types**: Site surveys, harmonic analysis, consultations

#### 8. System Health
- **Component Monitoring**:
  - Server status
  - Communication systems
  - Database performance
  - Integration health
- **Integration Status**:
  - Phase 1: PQMS, CPDIS, UAM, WIS (Active)
  - Phase 2: ADMS, GIS, ERP Enlight, SMP (Planned)
- **Watchdog Logs**: Recent health check history
- **Real-time Updates**: Automatic refresh every 30 seconds

### Database Schema

The system uses a comprehensive Supabase database with the following main tables:

- **profiles**: User profiles with role-based access control
- **substations**: Physical substation locations
- **pq_meters**: Power quality monitoring devices
- **pq_events**: All power quality events with detailed metadata
- **customers**: Customer accounts and service information
- **event_customer_impact**: Links events to affected customers
- **sarfi_metrics**: Monthly SARFI index calculations
- **notification_rules**: Alert configuration
- **system_health**: System monitoring logs
- **pq_service_records**: Service consultation records
- **reports**: Generated report metadata

### Mock Data

The system includes comprehensive mock data:
- 10 substations across Hong Kong regions
- 30+ power quality meters
- 80+ customer accounts
- 450+ power quality events
- 12 months of SARFI metrics
- System health monitoring logs
- Notification rules
- Integration status

### User Roles

1. **Admin**: Full system access, can manage all data and settings
2. **Operator**: Can view and modify events, meters, and service records
3. **Viewer**: Read-only access to all dashboards and reports

### Technical Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with RLS
- **Build Tool**: Vite

### Security Features

- Row Level Security (RLS) on all tables
- Role-based access control
- Secure authentication with Supabase Auth
- Protected API endpoints
- Audit trails for critical operations

### Standards Compliance

The system tracks compliance with international power quality standards:
- **EN 50160**: Voltage characteristics of electricity supplied by public distribution systems
- **IEEE 519**: Harmonic control in electrical power systems
- **IEC 61000**: Electromagnetic compatibility (EMC)
- **ITIC Curve**: Information Technology Industry Council power acceptability
- **SEMI F47**: Semiconductor equipment power quality requirements

### Future Enhancements (Phase 2)

- Real-time event streaming
- Advanced predictive analytics
- Mobile application
- Integration with ADMS, GIS, ERP
- Automated report scheduling
- Customer self-service portal
- Machine learning for root cause prediction
- Advanced waveform analysis tools

### Support

For technical support or questions about the PQMAP system, please contact the CLP Power Quality team.
