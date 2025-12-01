# NG_CPDIS_BRD Summary - Data Schema & Integration Focus

## **Objective**
- Create Next Generation Customer Power Disturbance Information System (CPDIS)
- Consolidate customer-side and CLP-side power quality data
- Enable real-time monitoring and analysis of power quality incidents
- Automate asset verification and customer impact assessment
- Replace legacy VDIMS system scheduled for retirement end-2024

## **Data Sources & Integration Points**

### **Primary Data Sources:**
- **Existing CPDIS (CMDI3)** - XML voltage dip files, PQDIF format, meter status
- **Power Quality Monitoring System (PQMS)** - XML files since 2016, PQDIF data since 2023
- **Supply Point System (SPS)** - Customer-transformer relationships (retiring, replacing with ERP/DNOO)
- **EWMS** - Incident reports (IDR), fault information (retiring 2025-2026, replacing with ERP)
- **System Operator (SO)** - Transformer relationships, weight factors

### **Data Exchange Formats:**
- **XML Files** - Voltage dip events with SCADA data, location, duration, voltage levels
- **PQDIF (Power Quality Data Interchange Format)** - Industrial standard, 10-min PQ parameters + waveforms
- **CSV Files** - Meter status updates (twice daily), export capabilities
- **API/XML Integration** - Real-time data to DNOO, PIOCO, other CLP systems

## **Core Data Schema**

### **Meter Data Fields:**
- Meter name, ID, serial number, asset number
- IP address, location coordinates (longitude/latitude)
- Brand, model, voltage level, substation, circuit
- Status (Active/Abnormal/Inactive)
- SCADA code mapping to location names

### **Event Data Fields:**
- **Voltage Events:** Timestamp, duration, voltage levels (3-phase), dip percentage
- **Waveform Data:** Time-domain characteristics, harmonic analysis capability
- **Location Data:** Meter name, substation, SCADA reference, geographical coordinates
- **Impact Data:** Affected customers, transformer relationships, customer count

### **Power Quality Parameters (10-minute intervals):**
- **Voltage:** RMS values, deviation events per EN50160
- **Current:** Available based on site conditions (CT deployment limited)
- **Power Factor:** Real power (kW) to apparent power (kVA) ratio
- **Harmonics:** Individual harmonics up to 24th order
- **Distortion Metrics:** TDD, THDI, THDV
- **Flicker:** EN50160 compliant measurements
- **Transient Events:** Voltage dips, surges, duration parameters

### **Customer & Asset Relationships:**
- Customer account numbers to transformer mapping
- Primary substation to customer substation relationships
- Weight factors for SARFI calculations
- Sensitive customer lists (updated by account managers)

## **Technical Requirements**

### **Data Processing:**
- Real-time event notification system
- Mother event grouping logic (transmission vs distribution events)
- False event filtering with configurable thresholds
- Automated transformer mapping between customer/primary substations

### **Storage & Retention:**
- Historical data retention for specified periods
- Daily meter status updates (twice daily)
- Event logs with debugging capabilities
- Backup historical mapping files for customer impact analysis

### **Integration APIs:**
- XML/API file generation for external systems
- SAP/ERP system synchronization for asset data
- DNOO/ADMS integration for customer lists
- PowerBI dashboard integration

### **Export Capabilities:**
- CSV/Excel export for all data views
- SARFI calculation reports (SARFI10-SARFI90)
- EN50160 compliance reports (7-day periods)
- Custom measurement reports with AI features

## **System Features for Integration**

### **Real-time Monitoring:**
- Event notifications via SMS/email
- System health monitoring with connection status alerts
- Meter communication availability tracking
- Automated alert generation for disconnected systems

### **Analysis Tools:**
- Voltage dip benchmarking (ITIC, SEMI F47, IEC61000-11/34)
- ACB tripping detection with configurable parameters
- Power quality service tracking and AECS calculation
- AI-powered report generation using Azure OpenAI

### **Configuration Management:**
- User profile and access control
- Notification templates and recipient management
- Parameter configuration for thresholds and intervals
- SCADA code to location name mapping

## **Functional Requirements**

### **Phase 1 (Priority):**
- Individual meter view with voltage sag/swell detection
- Waveform generation with advanced analysis features
- Event logging and 10-minute parameter logging
- Real-time event notifications
- Basic reporting and export functionality
- Asset management with meter inventory
- System maintenance and user management

### **Phase 2 (Future):**
- Supply reliability reporting
- Advanced SARFI calculations with weight factors
- Customer-transformer relationship automation
- PowerBI dashboard integration
- AI-enhanced measurement reporting
- Advanced notification systems

## **Standards Compliance**
- IEEE 519 - Harmonic distortion limits
- IEC 61000-4-11/34 - Power quality testing and measurement
- EN 50160 - Voltage characteristics of electricity supply
- PQDIF - Power Quality Data Interchange Format

## **Key Integration Considerations**
- System designed to replace multiple legacy systems (VDIMS, parts of SPS, EWMS)
- Maintains compatibility with existing data formats (XML, PQDIF)
- Prepares for integration with future ERP/DNOO systems
- Supports both real-time and batch data processing
- Provides comprehensive export capabilities for external system integration

---

**Document Version:** v0.01 (March 15, 2024)  
**Status:** Initial Requirements Definition - First Draft  
**Integration Focus:** Data schema optimized for power quality monitoring and customer impact analysis