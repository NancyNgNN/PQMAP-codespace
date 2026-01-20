import { FileText, BarChart3, User, Database, Wifi, Calendar, Download, Filter, Search, X, FileCheck, Plus, Edit2, Save, Copy, Target, Trash2, Users, Activity, TrendingUp, ChevronDown, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import LineChart from './Charts/LineChart';
import { supabase } from '../lib/supabase';

interface PQServiceLog {
  id: string;
  eventId: number;
  customerId: string;
  customerName: string;
  date: string;
  technician: string;
  description: string;
  action: string;
  status: string;
}

interface VoltageStandard {
  id: string;
  standard: string;
  version: string;
  category: string;
  parameter: string;
  level: string;
  min: string;
  max: string;
  unit: string;
  remarks: string;
}

interface VoltageDipEvent {
  id: string;
  eventId: string;
  date: string;
  magnitude: number; // percentage
  duration: number; // seconds
  voltageLevel: string;
  location: string;
  standard: string;
  compliant: boolean;
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState('pq_summary');
  
  // PQ Summary filters
  const [dateRange, setDateRange] = useState({ start: '2025-01-01', end: '2025-12-29' });
  const [showHarmonicEvents, setShowHarmonicEvents] = useState(true);
  const [showVoltageEvents, setShowVoltageEvents] = useState(true);
  const [showInterruptions, setShowInterruptions] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // PQ Summary Profile Management
  const [pqSummaryProfiles, setPqSummaryProfiles] = useState<any[]>([]);
  const [showSavePqProfileModal, setShowSavePqProfileModal] = useState(false);
  const [showLoadPqProfileModal, setShowLoadPqProfileModal] = useState(false);
  const [newPqProfileName, setNewPqProfileName] = useState('');
  const [editingPqProfileId, setEditingPqProfileId] = useState<string | null>(null);
  
  // PQ Service Log Modal
  const [showServiceLogModal, setShowServiceLogModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [serviceLogs, setServiceLogs] = useState<PQServiceLog[]>([]);
  const [isEditingLog, setIsEditingLog] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [newLog, setNewLog] = useState({ customerId: '', customerName: '', technician: '', description: '', action: '', status: 'Open' });
  
  // Affected Customers Modal
  const [showAffectedCustomersModal, setShowAffectedCustomersModal] = useState(false);
  const [selectedAffectedCustomers, setSelectedAffectedCustomers] = useState<any[]>([]);
  
  // Benchmarking Tab
  const [benchmarkingSection, setBenchmarkingSection] = useState<'pq_standard' | 'voltage_dip'>('pq_standard');
  
  // PQ Standard (formerly Voltage Dip Benchmarking table)
  const [benchmarkSearch, setBenchmarkSearch] = useState('');
  const [selectedStandard, setSelectedStandard] = useState('All');
  const [selectedParameter, setSelectedParameter] = useState('All');
  const [showAddStandardModal, setShowAddStandardModal] = useState(false);
  const [editingStandard, setEditingStandard] = useState<VoltageStandard | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [newStandard, setNewStandard] = useState({
    standard: 'CLP Supply Rules',
    version: '2001',
    category: 'Voltage / Freq Control',
    parameter: 'Voltage Deviation',
    level: '11kV',
    min: '-2.5',
    max: '10',
    unit: '%',
    remarks: ''
  });
  
  // Voltage Dip Benchmarking (new scatter plot analysis)
  const [dipSelectionType, setDipSelectionType] = useState<'voltage_level' | 'individual'>('voltage_level');
  const [dipSelectedVoltageLevels, setDipSelectedVoltageLevels] = useState<string[]>(['400KV']);
  const [dipSelectedMeters, setDipSelectedMeters] = useState<string[]>([]);
  const [dipDateRange, setDipDateRange] = useState({ start: '2025-01-01', end: '2025-12-30' });
  const [dipShowResults, setDipShowResults] = useState(false);
  const [dipSelectedStandards, setDipSelectedStandards] = useState<string[]>(['IEC61000-4-34/11']);
  const [dipChartData, setDipChartData] = useState<any[]>([]);
  
  // Profile Tab States
  const [profileDataType, setProfileDataType] = useState<'voltage' | 'current'>('voltage');
  const [profileValueType, setProfileValueType] = useState<'average' | 'raw'>('average');
  const [profileVoltageLevel, setProfileVoltageLevel] = useState('All');
  const [profileSearchQuery, setProfileSearchQuery] = useState('');
  const [profileSelectedMeters, setProfileSelectedMeters] = useState<string[]>([]);
  const [profileDateRange, setProfileDateRange] = useState({ start: '2025-01-01', end: '2025-12-29' });
  const [profileParameters, setProfileParameters] = useState<string[]>(['V1', 'V2', 'V3']);
  const [showProfileResults, setShowProfileResults] = useState(false);
  const [profileChartData, setProfileChartData] = useState<Record<string, any[]>>({});
  const [savedProfiles, setSavedProfiles] = useState<any[]>([]);
  const [showSaveProfileModal, setShowSaveProfileModal] = useState(false);
  const [showLoadProfileModal, setShowLoadProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  
  // Meter Communication Tab States
  const [commSelectionType, setCommSelectionType] = useState<'all' | 'meter' | 'level' | 'substation' | 'others'>('all');
  const [commDateRange, setCommDateRange] = useState({ 
    startDate: '2025-12-15', 
    startHour: '00',
    endDate: '2025-12-16', 
    endHour: '23' 
  });
  const [commReportData, setCommReportData] = useState<any[]>([]);
  const [commShowReport, setCommShowReport] = useState(false);
  const [commSearchQuery, setCommSearchQuery] = useState('');
  const [commSortColumn, setCommSortColumn] = useState<string>('siteId');
  const [commSortDirection, setCommSortDirection] = useState<'asc' | 'desc'>('asc');
  const [commFilterLessThan100, setCommFilterLessThan100] = useState(false);
  const [commLoading, setCommLoading] = useState(false);
  
  // Data Maintenance Tab States
  const [verificationTab, setVerificationTab] = useState<'raw' | 'daily' | 'weekly'>('raw');
  
  // Raw Data States
  const [rawSelectedMeter, setRawSelectedMeter] = useState<string>('');
  const [rawParameter, setRawParameter] = useState('Voltage');
  const [rawDateRange, setRawDateRange] = useState({ 
    startDate: '2025-01-01', 
    startHour: '00', 
    startMinute: '00',
    endDate: '2025-01-23', 
    endHour: '23', 
    endMinute: '59' 
  });
  const [rawData, setRawData] = useState<any[]>([]);
  const [rawShowResults, setRawShowResults] = useState(false);
  const [rawSearchQuery, setRawSearchQuery] = useState('');
  const [rawVoltageLevel, setRawVoltageLevel] = useState('All');
  
  // Daily Data States
  const [dailyVoltageLevel, setDailyVoltageLevel] = useState('400KV');
  const [dailyParameter, setDailyParameter] = useState('Voltage');
  const [dailyDateRange, setDailyDateRange] = useState({ 
    startDate: '2025-01-01', 
    startHour: '00',
    endDate: '2025-12-30', 
    endHour: '23' 
  });
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [dailyShowResults, setDailyShowResults] = useState(false);
  
  // Weekly Data States
  const [weeklyVoltageLevel, setWeeklyVoltageLevel] = useState('400KV');
  const [weeklyParameter, setWeeklyParameter] = useState('Voltage THD');
  const [weeklyDateRange, setWeeklyDateRange] = useState({ 
    startDate: '2025-01-01', 
    startHour: '00',
    endDate: '2025-12-30', 
    endHour: '00' 
  });
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [weeklyShowResults, setWeeklyShowResults] = useState(false);
  
  // Mock Meters Data (547 total, showing subset)
  const mockMeters = Array.from({ length: 547 }, (_, i) => {
    const voltagelevels = ['400KV', '132KV', '33KV', '11KV', '380V'];
    const locations = ['APA', 'APB', 'AUS', 'AWR', 'BCH', 'BOU', 'CAN', 'CCN', 'CCS', 'CHI', 'CHY'];
    const voltageLevel = voltagelevels[Math.floor(Math.random() * voltagelevels.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const meterNum = String(i).padStart(4, '0');
    const suffix = ['H1', 'H2', 'H3'][Math.floor(Math.random() * 3)];
    return {
      id: `PQMS_${voltageLevel}.${location}${meterNum}_${suffix}`,
      voltageLevel,
      location
    };
  });
  
  // Mock voltage readings for chart display
  const generateMockVoltageData = (meterId: string, startDate: Date, endDate: Date, dataType: 'voltage' | 'current' = 'voltage') => {
    const data = [];
    const baseVoltage = meterId.includes('400KV') ? 240000 : 
                       meterId.includes('132KV') ? 76000 :
                       meterId.includes('33KV') ? 19000 :
                       meterId.includes('11KV') ? 6350 : 220;
    
    const baseCurrent = meterId.includes('400KV') ? 1000 : 
                       meterId.includes('132KV') ? 800 :
                       meterId.includes('33KV') ? 500 :
                       meterId.includes('11KV') ? 300 : 100;
    
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const pointsToGenerate = Math.min(daysDiff * 24, 365); // Up to 365 points for better visualization
    
    for (let i = 0; i < pointsToGenerate; i++) {
      const timestamp = new Date(startDate.getTime() + (i * (endDate.getTime() - startDate.getTime()) / pointsToGenerate));
      
      if (dataType === 'voltage') {
        // Generate realistic voltage variations with some sine wave pattern
        const variation = Math.sin(i / 10) * 0.01 + (Math.random() - 0.5) * 0.015;
        const v1 = baseVoltage * (1 + variation);
        const v2 = baseVoltage * (1 + variation + (Math.random() - 0.5) * 0.005);
        const v3 = baseVoltage * (1 + variation - (Math.random() - 0.5) * 0.005);
        
        data.push({
          timestamp: timestamp.toISOString(),
          V1: Number(v1.toFixed(2)),
          V2: Number(v2.toFixed(2)),
          V3: Number(v3.toFixed(2))
        });
      } else {
        // Generate realistic current variations
        const variation = Math.sin(i / 8) * 0.15 + (Math.random() - 0.5) * 0.1;
        const i1 = baseCurrent * (1 + variation);
        const i2 = baseCurrent * (1 + variation + (Math.random() - 0.5) * 0.08);
        const i3 = baseCurrent * (1 + variation - (Math.random() - 0.5) * 0.08);
        
        data.push({
          timestamp: timestamp.toISOString(),
          I1: Number(i1.toFixed(2)),
          I2: Number(i2.toFixed(2)),
          I3: Number(i3.toFixed(2))
        });
      }
    }
    return data;
  };
  
  // Mock data for PQ Summary table
  const mockSummaryData = [
    { id: 1, eventId: 'EVT-2025-001', date: '2025-12-28', type: 'Voltage Dip', severity: 'High', duration: '0.5s', affectedCustomers: 12, location: 'SS-001', serviceLogCount: 2 },
    { id: 2, eventId: 'EVT-2025-002', date: '2025-12-27', type: 'Harmonic', severity: 'Medium', duration: '2.3h', affectedCustomers: 5, location: 'SS-003', serviceLogCount: 1 },
    { id: 3, eventId: 'EVT-2025-003', date: '2025-12-26', type: 'Interruption', severity: 'Critical', duration: '15m', affectedCustomers: 45, location: 'SS-002', serviceLogCount: 3 },
    { id: 4, eventId: 'EVT-2025-004', date: '2025-12-25', type: 'Voltage Swell', severity: 'Low', duration: '1.2s', affectedCustomers: 0, location: 'SS-005', serviceLogCount: 0 },
    { id: 5, eventId: 'EVT-2025-005', date: '2025-12-24', type: 'Harmonic', severity: 'Medium', duration: '4.1h', affectedCustomers: 8, location: 'SS-001', serviceLogCount: 1 },
  ];
  
  // Mock Affected Customers data
  const mockAffectedCustomersData: Record<number, any[]> = {
    1: [
      { id: 'CUST-001', name: 'ABC Corp', accountNumber: 'AC-12345', address: '123 Business St, Kowloon', contactPerson: 'John Chan', phone: '2345-6789', impactLevel: 'High' },
      { id: 'CUST-002', name: 'ABC Corp - Building B', accountNumber: 'AC-12346', address: '125 Business St, Kowloon', contactPerson: 'Mary Wong', phone: '2345-6790', impactLevel: 'Medium' },
      { id: 'CUST-003', name: 'Retail Shop A', accountNumber: 'AC-12347', address: '127 Business St, Kowloon', contactPerson: 'David Lee', phone: '2345-6791', impactLevel: 'Low' },
      { id: 'CUST-004', name: 'Office Tower C', accountNumber: 'AC-12348', address: '129 Business St, Kowloon', contactPerson: 'Sarah Ng', phone: '2345-6792', impactLevel: 'Medium' },
      { id: 'CUST-005', name: 'Restaurant D', accountNumber: 'AC-12349', address: '131 Business St, Kowloon', contactPerson: 'Tom Cheung', phone: '2345-6793', impactLevel: 'High' },
      { id: 'CUST-006', name: 'Factory E', accountNumber: 'AC-12350', address: '133 Business St, Kowloon', contactPerson: 'Linda Lam', phone: '2345-6794', impactLevel: 'Critical' },
      { id: 'CUST-007', name: 'Mall F', accountNumber: 'AC-12351', address: '135 Business St, Kowloon', contactPerson: 'Peter Ho', phone: '2345-6795', impactLevel: 'Medium' },
      { id: 'CUST-008', name: 'Hospital G', accountNumber: 'AC-12352', address: '137 Business St, Kowloon', contactPerson: 'Dr. Wang', phone: '2345-6796', impactLevel: 'Critical' },
      { id: 'CUST-009', name: 'School H', accountNumber: 'AC-12353', address: '139 Business St, Kowloon', contactPerson: 'Principal Chen', phone: '2345-6797', impactLevel: 'High' },
      { id: 'CUST-010', name: 'Hotel I', accountNumber: 'AC-12354', address: '141 Business St, Kowloon', contactPerson: 'Manager Liu', phone: '2345-6798', impactLevel: 'Medium' },
      { id: 'CUST-011', name: 'Bank J', accountNumber: 'AC-12355', address: '143 Business St, Kowloon', contactPerson: 'Director Tsang', phone: '2345-6799', impactLevel: 'Critical' },
      { id: 'CUST-012', name: 'Gym K', accountNumber: 'AC-12356', address: '145 Business St, Kowloon', contactPerson: 'Owner Ko', phone: '2345-6800', impactLevel: 'Low' },
    ],
    2: [
      { id: 'CUST-013', name: 'XYZ Ltd', accountNumber: 'AC-23456', address: '456 Industry Rd, New Territories', contactPerson: 'Alice Tang', phone: '2456-7890', impactLevel: 'Medium' },
      { id: 'CUST-014', name: 'XYZ Ltd - Warehouse', accountNumber: 'AC-23457', address: '458 Industry Rd, New Territories', contactPerson: 'Bob Yip', phone: '2456-7891', impactLevel: 'Low' },
      { id: 'CUST-015', name: 'Neighbor Factory', accountNumber: 'AC-23458', address: '460 Industry Rd, New Territories', contactPerson: 'Charlie Ma', phone: '2456-7892', impactLevel: 'Medium' },
      { id: 'CUST-016', name: 'Distribution Center', accountNumber: 'AC-23459', address: '462 Industry Rd, New Territories', contactPerson: 'Diana Chow', phone: '2456-7893', impactLevel: 'High' },
      { id: 'CUST-017', name: 'Tech Lab', accountNumber: 'AC-23460', address: '464 Industry Rd, New Territories', contactPerson: 'Eric Fung', phone: '2456-7894', impactLevel: 'Medium' },
    ],
    3: [
      { id: 'CUST-018', name: 'Tech Industries', accountNumber: 'AC-34567', address: '789 Tech Park, Hong Kong', contactPerson: 'Frank Leung', phone: '2567-8901', impactLevel: 'Critical' },
      { id: 'CUST-019', name: 'Tech Industries - R&D', accountNumber: 'AC-34568', address: '791 Tech Park, Hong Kong', contactPerson: 'Grace Wong', phone: '2567-8902', impactLevel: 'Critical' },
      { id: 'CUST-020', name: 'Adjacent Office Building', accountNumber: 'AC-34569', address: '793 Tech Park, Hong Kong', contactPerson: 'Henry Kwok', phone: '2567-8903', impactLevel: 'High' },
    ],
    5: [
      { id: 'CUST-021', name: 'Manufacturing Co', accountNumber: 'AC-45678', address: '321 Factory Ln, Kowloon', contactPerson: 'Irene Cheng', phone: '2678-9012', impactLevel: 'Medium' },
      { id: 'CUST-022', name: 'Manufacturing Co - Plant 2', accountNumber: 'AC-45679', address: '323 Factory Ln, Kowloon', contactPerson: 'Jack Hui', phone: '2678-9013', impactLevel: 'Medium' },
      { id: 'CUST-023', name: 'Nearby Workshop', accountNumber: 'AC-45680', address: '325 Factory Ln, Kowloon', contactPerson: 'Kelly Tam', phone: '2678-9014', impactLevel: 'Low' },
    ],
  };
  
  // Mock PQ Service Logs data
  const mockServiceLogs: Record<number, PQServiceLog[]> = {
    1: [
      { id: 'LOG-001', eventId: 1, customerId: 'CUST-001', customerName: 'ABC Corp', date: '2025-12-28 10:30', technician: 'John Doe', description: 'Initial investigation completed', action: 'Site inspection performed', status: 'In Progress' },
      { id: 'LOG-002', eventId: 1, customerId: 'CUST-002', customerName: 'ABC Corp - Building B', date: '2025-12-28 14:20', technician: 'Jane Smith', description: 'Voltage regulator adjusted', action: 'Equipment maintenance', status: 'Completed' }
    ],
    2: [
      { id: 'LOG-003', eventId: 2, customerId: 'CUST-003', customerName: 'XYZ Ltd', date: '2025-12-27 09:15', technician: 'Mike Wilson', description: 'Harmonic filter inspection', action: 'Equipment check', status: 'Completed' }
    ],
    3: [
      { id: 'LOG-004', eventId: 3, customerId: 'CUST-004', customerName: 'Tech Industries', date: '2025-12-26 08:00', technician: 'Sarah Johnson', description: 'Emergency response initiated', action: 'Power restoration', status: 'Completed' },
      { id: 'LOG-005', eventId: 3, customerId: 'CUST-005', customerName: 'Tech Industries - Warehouse', date: '2025-12-26 10:30', technician: 'Tom Brown', description: 'Root cause analysis', action: 'Investigation', status: 'Completed' },
      { id: 'LOG-006', eventId: 3, customerId: 'CUST-006', customerName: 'Adjacent Commercial Center', date: '2025-12-26 15:45', technician: 'Sarah Johnson', description: 'Follow-up inspection', action: 'Site verification', status: 'Completed' }
    ],
    5: [
      { id: 'LOG-007', eventId: 5, customerId: 'CUST-007', customerName: 'Manufacturing Co', date: '2025-12-24 11:00', technician: 'David Lee', description: 'Equipment monitoring started', action: 'Data collection', status: 'Open' }
    ]
  };
  
  // Mock Voltage Standards data (from CLP Supply Rules)
  const [voltageStandards, setVoltageStandards] = useState<VoltageStandard[]>([
    { id: '1', standard: 'CLP Supply Rules', version: '2001', category: 'Harmonics (Voltage)', parameter: '3rd Harmonics', level: '11kV', min: 'N/A', max: '3.0', unit: '%', remarks: 'N/A' },
    { id: '2', standard: 'CLP Supply Rules', version: '2001', category: 'Harmonics (Voltage)', parameter: '5th Harmonics', level: '11kV', min: 'N/A', max: '5.0', unit: '%', remarks: 'N/A' },
    { id: '3', standard: 'CLP Supply Rules', version: '2001', category: 'Harmonics (Voltage)', parameter: '7th Harmonics', level: '11kV', min: 'N/A', max: '4.0', unit: '%', remarks: 'N/A' },
    { id: '4', standard: 'CLP Supply Rules', version: '2001', category: 'Harmonics (Voltage)', parameter: '9th Harmonics', level: '11kV', min: 'N/A', max: '2.5', unit: '%', remarks: 'N/A' },
    { id: '5', standard: 'CLP Supply Rules', version: '2001', category: 'Voltage / Freq Control', parameter: 'Frequency', level: 'N/A', min: '49', max: '51', unit: 'Hz', remarks: 'N/A' },
    { id: '6', standard: 'CLP Supply Rules', version: '2001', category: 'Voltage / Freq Control', parameter: 'Voltage Deviation', level: '11kV', min: '-2.5', max: '10', unit: '%', remarks: 'N/A' },
    { id: '7', standard: 'CLP Supply Rules', version: '2001', category: 'Voltage / Freq Control', parameter: 'Voltage Deviation', level: '132kV', min: '-2.5', max: '10', unit: '%', remarks: 'N/A' },
    { id: '8', standard: 'CLP Supply Rules', version: '2001', category: 'Harmonics (Voltage)', parameter: 'THD', level: '11kV', min: 'N/A', max: '8.0', unit: '%', remarks: 'N/A' },
    { id: '9', standard: 'EN50160', version: '2010', category: 'Harmonics (Voltage)', parameter: 'Eh:(3,11)', level: '11kV', min: 'N/A', max: '5.0', unit: '%', remarks: 'Even harmonics order 3-11' },
    { id: '10', standard: 'EN50160', version: '2010', category: 'Harmonics (Voltage)', parameter: 'Eh:(11,17)', level: '11kV', min: 'N/A', max: '3.5', unit: '%', remarks: 'Even harmonics order 11-17' },
    { id: '11', standard: 'EN50160', version: '2010', category: 'Harmonics (Voltage)', parameter: 'Eh:(17,23)', level: '11kV', min: 'N/A', max: '2.5', unit: '%', remarks: 'Even harmonics order 17-23' },
    { id: '12', standard: 'EN50160', version: '2010', category: 'Harmonics (Voltage)', parameter: 'Oh:(3,11)', level: '11kV', min: 'N/A', max: '6.0', unit: '%', remarks: 'Odd harmonics order 3-11' },
    { id: '13', standard: 'EN50160', version: '2010', category: 'Harmonics (Voltage)', parameter: 'Oh:(11,17)', level: '11kV', min: 'N/A', max: '4.5', unit: '%', remarks: 'Odd harmonics order 11-17' },
    { id: '14', standard: 'IEC61000-2', version: '2002', category: 'Harmonics (Voltage)', parameter: 'THD', level: '11kV', min: 'N/A', max: '8.0', unit: '%', remarks: 'IEC compatibility level' },
    { id: '15', standard: 'IEC61000-2', version: '2002', category: 'Power Quality', parameter: 'Voltage Flickering', level: '11kV', min: 'N/A', max: '1.0', unit: 'Pst', remarks: 'Short-term flicker' },
    { id: '16', standard: 'IEC61000-2', version: '2002', category: 'Power Quality', parameter: 'Voltage Unbalance', level: '11kV', min: 'N/A', max: '2.0', unit: '%', remarks: 'Negative sequence' },
    { id: '17', standard: 'IEEE519', version: '2014', category: 'Harmonics (Current)', parameter: 'TDD', level: '33kV', min: 'N/A', max: '5.0', unit: '%', remarks: 'Total demand distortion' },
    { id: '18', standard: 'IEEE519', version: '2014', category: 'Harmonics (Voltage)', parameter: 'THD', level: '33kV', min: 'N/A', max: '5.0', unit: '%', remarks: 'Total harmonic distortion' },
    { id: '19', standard: 'IEC61000 Supply Code', version: '2015', category: 'Power Quality', parameter: 'Power Factor', level: '11kV', min: '0.85', max: '1.0', unit: 'p.u.', remarks: 'Lagging power factor' },
    { id: '20', standard: 'SO-MS06-A-K18', version: '2018', category: 'Harmonics (Voltage)', parameter: 'Eh:(23,35)', level: '132kV', min: 'N/A', max: '1.5', unit: '%', remarks: 'Even harmonics order 23-35' },
  ]);
  
  // Mock voltage dip events for benchmarking
  const mockVoltageDipEvents: VoltageDipEvent[] = [
    { id: '1', eventId: 'EVT-2025-001', date: '2025-12-28', magnitude: 85, duration: 0.5, voltageLevel: '11kV', location: 'SS-001', standard: 'CLP Supply Rules', compliant: true },
    { id: '2', eventId: 'EVT-2025-015', date: '2025-12-27', magnitude: 45, duration: 1.2, voltageLevel: '132kV', location: 'SS-003', standard: 'CLP Supply Rules', compliant: false },
    { id: '3', eventId: 'EVT-2025-027', date: '2025-12-26', magnitude: 70, duration: 0.3, voltageLevel: '11kV', location: 'SS-002', standard: 'CLP Supply Rules', compliant: true },
    { id: '4', eventId: 'EVT-2025-033', date: '2025-12-25', magnitude: 30, duration: 2.5, voltageLevel: '380V', location: 'SS-005', standard: 'CLP Supply Rules', compliant: false },
    { id: '5', eventId: 'EVT-2025-041', date: '2025-12-24', magnitude: 90, duration: 0.2, voltageLevel: '11kV', location: 'SS-001', standard: 'CLP Supply Rules', compliant: true },
  ];
  
  const handleOpenServiceLog = (eventId: number) => {
    setSelectedEventId(eventId);
    setServiceLogs(mockServiceLogs[eventId] || []);
    setShowServiceLogModal(true);
    setIsEditingLog(false);
  };
  
  const handleOpenAffectedCustomers = (eventId: number, count: number) => {
    if (count === 0) return; // Don't open modal if no customers
    setSelectedEventId(eventId);
    setSelectedAffectedCustomers(mockAffectedCustomersData[eventId] || []);
    setShowAffectedCustomersModal(true);
  };
  
  const handleAddNewLog = () => {
    if (selectedEventId && newLog.customerName && newLog.technician && newLog.description) {
      const log: PQServiceLog = {
        id: `LOG-${Date.now()}`,
        eventId: selectedEventId,
        date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        ...newLog
      };
      setServiceLogs([...serviceLogs, log]);
      setNewLog({ customerId: '', customerName: '', technician: '', description: '', action: '', status: 'Open' });
      setIsEditingLog(false);
      setEditingLogId(null);
    }
  };

  const handleEditLog = (log: PQServiceLog) => {
    setEditingLogId(log.id);
    setNewLog({
      customerId: log.customerId,
      customerName: log.customerName,
      technician: log.technician,
      description: log.description,
      action: log.action,
      status: log.status
    });
    setIsEditingLog(true);
  };

  const handleSaveEditedLog = () => {
    if (editingLogId && newLog.customerName && newLog.technician && newLog.description) {
      setServiceLogs(serviceLogs.map(log => 
        log.id === editingLogId 
          ? { ...log, ...newLog }
          : log
      ));
      setNewLog({ customerId: '', customerName: '', technician: '', description: '', action: '', status: 'Open' });
      setIsEditingLog(false);
      setEditingLogId(null);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingLog(false);
    setEditingLogId(null);
    setNewLog({ customerId: '', customerName: '', technician: '', description: '', action: '', status: 'Open' });
  };
  
  // Voltage Standards handlers
  const handleAddStandard = () => {
    if (editingStandard) {
      setVoltageStandards(voltageStandards.map(s => s.id === editingStandard.id ? { ...editingStandard, ...newStandard } : s));
    } else {
      const standard: VoltageStandard = {
        id: `STD-${Date.now()}`,
        ...newStandard
      };
      setVoltageStandards([...voltageStandards, standard]);
    }
    setShowAddStandardModal(false);
    setEditingStandard(null);
    setNewStandard({
      standard: 'CLP Supply Rules',
      version: '2001',
      category: 'Voltage / Freq Control',
      parameter: 'Voltage Deviation',
      level: '11kV',
      min: '-2.5',
      max: '10',
      unit: '%',
      remarks: ''
    });
  };
  
  const handleEditStandard = (standard: VoltageStandard) => {
    setEditingStandard(standard);
    setNewStandard({
      standard: standard.standard,
      version: standard.version,
      category: standard.category,
      parameter: standard.parameter,
      level: standard.level,
      min: standard.min,
      max: standard.max,
      unit: standard.unit,
      remarks: standard.remarks
    });
    setShowAddStandardModal(true);
  };
  
  const handleDeleteStandard = (id: string) => {
    if (confirm('Are you sure you want to delete this standard?')) {
      setVoltageStandards(voltageStandards.filter(s => s.id !== id));
    }
  };
  
  const handleCopyTable = () => {
    const headers = ['Standard', 'Version', 'Category', 'Parameter', 'Level', 'Min', 'Max', 'Unit', 'Remarks'];
    const rows = filteredStandards.map(s => [s.standard, s.version, s.category, s.parameter, s.level, s.min, s.max, s.unit, s.remarks]);
    const text = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(text);
    alert('Table copied to clipboard!');
  };
  
  const handleExportCSV = () => {
    const headers = ['Standard', 'Version', 'Category', 'Parameter', 'Level', 'Min', 'Max', 'Unit', 'Remarks'];
    const rows = filteredStandards.map(s => [s.standard, s.version, s.category, s.parameter, s.level, s.min, s.max, s.unit, s.remarks]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voltage_standards_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };
  
  // Voltage Dip Benchmarking handlers
  const handleGetBenchmarkResult = () => {
    // Mock data for voltage dip events based on the images
    const mockDipEvents = [
      { id: '1', timestamp: '2025-09-24 06:27:38.495933', meter: 'PQMS_400KV.BKP0227_SHE1', duration: 10.329, vmin: 0.000, groupid: '20250605001_HIGH' },
      { id: '2', timestamp: '2025-09-24 06:53:14.937443', meter: 'PQMS_400KV.BKP0227_SHE1', duration: 10.330, vmin: 0.000, groupid: '20250924020_HIGH' },
      { id: '3', timestamp: '2025-09-24 05:54:12.920769', meter: 'PQMS_400KV.BKP0227_SHE1', duration: 0.078, vmin: 50.605, groupid: '20250924038_HIGH' },
      { id: '4', timestamp: '2025-09-08 10:39:23.260609', meter: 'PQMS_400KV.BKP0256_CPK1', duration: 0.090, vmin: 64.817, groupid: '20250924030_HIGH' },
      { id: '5', timestamp: '2025-09-08 10:39:32.512373', meter: 'PQMS_400KV.BKP0227_SHE1', duration: 0.090, vmin: 64.819, groupid: '20250924030_HIGH' },
      { id: '6', timestamp: '2025-09-08 10:38:37.901413', meter: 'PQMS_400KV.BKP0256_CPK1', duration: 0.081, vmin: 67.396, groupid: '20250924030_HIGH' },
      { id: '7', timestamp: '2025-09-08 10:38:37.143231', meter: 'PQMS_400KV.BKP0227_SHE1', duration: 0.071, vmin: 67.420, groupid: '20250924030_HIGH' },
      { id: '8', timestamp: '2025-09-24 05:37:38.402107', meter: 'PQMS_400KV.BKP0227_SHE1', duration: 0.067, vmin: 74.987, groupid: '20250924013_HIGH' },
      { id: '9', timestamp: '2025-09-24 12:12:50.063375', meter: 'PQMS_400KV.BKP0227_SHE1', duration: 0.030, vmin: 83.955, groupid: '20250908001_HIGH' },
      { id: '10', timestamp: '2025-09-24 12:12:54.606004', meter: 'PQMS_400KV.BKP0227_SHE1', duration: 0.039, vmin: 84.294, groupid: '20250908001_HIGH' },
    ];
    
    setDipChartData(mockDipEvents);
    setDipShowResults(true);
  };
  
  // Filter standards
  const filteredStandards = voltageStandards.filter(s => {
    const matchesSearch = benchmarkSearch === '' || 
      Object.values(s).some(val => val.toString().toLowerCase().includes(benchmarkSearch.toLowerCase()));
    const matchesStandard = selectedStandard === 'All' || s.standard === selectedStandard;
    const matchesParameter = selectedParameter === 'All' || s.parameter === selectedParameter;
    return matchesSearch && matchesStandard && matchesParameter;
  });
  
  // Get unique values for dropdowns
  const uniqueStandards = ['All', ...Array.from(new Set(voltageStandards.map(s => s.standard)))];
  const uniqueParameters = ['All', ...Array.from(new Set(voltageStandards.map(s => s.parameter))).sort()];

  // Pagination calculations
  const totalPages = Math.ceil(filteredStandards.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStandards = filteredStandards.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [benchmarkSearch, selectedStandard, selectedParameter]);

  // PQ Summary Profile Handlers
  const handleSavePqProfile = () => {
    if (!newPqProfileName.trim()) {
      alert('Please enter a profile name');
      return;
    }
    
    const profile = {
      id: editingPqProfileId || `pq-profile-${Date.now()}`,
      name: newPqProfileName,
      dateRange: { ...dateRange },
      showHarmonicEvents,
      showVoltageEvents,
      showInterruptions,
      searchQuery,
      createdAt: new Date().toISOString()
    };
    
    if (editingPqProfileId) {
      setPqSummaryProfiles(pqSummaryProfiles.map(p => p.id === editingPqProfileId ? profile : p));
    } else {
      setPqSummaryProfiles([...pqSummaryProfiles, profile]);
    }
    
    setShowSavePqProfileModal(false);
    setNewPqProfileName('');
    setEditingPqProfileId(null);
  };

  const handleLoadPqProfile = (profileId: string) => {
    const profile = pqSummaryProfiles.find(p => p.id === profileId);
    if (profile) {
      setDateRange(profile.dateRange);
      setShowHarmonicEvents(profile.showHarmonicEvents);
      setShowVoltageEvents(profile.showVoltageEvents);
      setShowInterruptions(profile.showInterruptions);
      setSearchQuery(profile.searchQuery);
      setShowLoadPqProfileModal(false);
    }
  };

  const handleEditPqProfile = (profileId: string) => {
    const profile = pqSummaryProfiles.find(p => p.id === profileId);
    if (profile) {
      setNewPqProfileName(profile.name);
      setEditingPqProfileId(profileId);
      setShowLoadPqProfileModal(false);
      setShowSavePqProfileModal(true);
    }
  };

  const handleDeletePqProfile = (profileId: string) => {
    if (confirm('Are you sure you want to delete this profile?')) {
      setPqSummaryProfiles(pqSummaryProfiles.filter(p => p.id !== profileId));
    }
  };

  // Profile Tab Handlers
  const handleGetProfileResult = () => {
    if (profileSelectedMeters.length === 0) {
      alert('Please select at least one meter');
      return;
    }
    
    // Validate date range (max 1 year)
    const startDate = new Date(profileDateRange.start);
    const endDate = new Date(profileDateRange.end);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 365) {
      const proceed = window.confirm(
        `You have selected ${Math.ceil(daysDiff / 365)} year(s) of data, which exceeds the recommended limit of 1 year.\n\n` +
        `This may result in slow performance and long loading times.\n\n` +
        `Do you want to proceed anyway?`
      );
      if (!proceed) return;
    }
    
    // Check meter count limit (10 meters)
    if (profileSelectedMeters.length > 10) {
      const proceed = window.confirm(
        `You have selected ${profileSelectedMeters.length} meters, which exceeds the recommended limit of 10 meters.\n\n` +
        `This may result in slow performance and long loading times.\n\n` +
        `Do you want to proceed anyway?`
      );
      if (!proceed) return;
    }
    
    // Generate chart data for each selected meter
    const chartData: Record<string, any[]> = {};
    profileSelectedMeters.forEach(meterId => {
      chartData[meterId] = generateMockVoltageData(meterId, startDate, endDate, profileDataType);
    });
    
    setProfileChartData(chartData);
    setShowProfileResults(true);
  };

  const handleSaveProfile = () => {
    if (!newProfileName.trim()) {
      alert('Please enter a profile name');
      return;
    }
    
    const profile = {
      id: editingProfileId || `profile-${Date.now()}`,
      name: newProfileName,
      dataType: profileDataType,
      valueType: profileValueType,
      voltageLevel: profileVoltageLevel,
      selectedMeters: profileSelectedMeters,
      parameters: profileParameters,
      dateRange: profileDateRange,
      createdAt: new Date().toISOString()
    };
    
    if (editingProfileId) {
      setSavedProfiles(savedProfiles.map(p => p.id === editingProfileId ? profile : p));
    } else {
      setSavedProfiles([...savedProfiles, profile]);
    }
    
    setShowSaveProfileModal(false);
    setNewProfileName('');
    setEditingProfileId(null);
  };

  const handleLoadProfile = (profile: any) => {
    setProfileDataType(profile.dataType);
    setProfileValueType(profile.valueType);
    setProfileVoltageLevel(profile.voltageLevel);
    setProfileSelectedMeters(profile.selectedMeters);
    setProfileParameters(profile.parameters);
    setProfileDateRange(profile.dateRange);
    setShowLoadProfileModal(false);
    setShowProfileResults(true);
  };

  const handleDeleteProfile = (profileId: string) => {
    if (confirm('Are you sure you want to delete this profile?')) {
      setSavedProfiles(savedProfiles.filter(p => p.id !== profileId));
    }
  };

  const handleEditProfile = (profile: any) => {
    setNewProfileName(profile.name);
    setEditingProfileId(profile.id);
    setShowSaveProfileModal(true);
  };

  const handleExportProfileCSV = () => {
    const headers = ['Meter ID', 'Timestamp', ...profileParameters];
    const allData: any[] = [];
    
    profileSelectedMeters.forEach(meterId => {
      const chartData = profileChartData[meterId] || [];
      chartData.forEach(point => {
        allData.push([
          meterId,
          point.timestamp,
          ...profileParameters.map(p => point[p] || 0)
        ]);
      });
    });
    
    const csv = [headers.join(','), ...allData.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profileDataType}_profile_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const filteredMeters = mockMeters.filter(m => {
    const matchesVoltageLevel = profileVoltageLevel === 'All' || m.voltageLevel === profileVoltageLevel;
    const matchesSearch = profileSearchQuery === '' || m.id.toLowerCase().includes(profileSearchQuery.toLowerCase());
    return matchesVoltageLevel && matchesSearch;
  });

  const toggleMeterSelection = (meterId: string) => {
    if (profileSelectedMeters.includes(meterId)) {
      setProfileSelectedMeters(profileSelectedMeters.filter(id => id !== meterId));
    } else {
      setProfileSelectedMeters([...profileSelectedMeters, meterId]);
    }
  };

  const handleToggleParameter = (param: string) => {
    if (profileParameters.includes(param)) {
      setProfileParameters(profileParameters.filter(p => p !== param));
    } else {
      setProfileParameters([...profileParameters, param]);
    }
  };

  // Meter Communication handlers
  const handleGetAvailabilityReport = async () => {
    setCommLoading(true);
    try {
      // Calculate expected count (hours in date range)
      const startDateTime = new Date(`${commDateRange.startDate}T${commDateRange.startHour}:00:00`);
      const endDateTime = new Date(`${commDateRange.endDate}T${commDateRange.endHour}:59:59`);
      const hoursDiff = Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60));
      
      // Validate date range (max 1 year)
      const daysDiff = Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 365) {
        const proceed = window.confirm(
          `You have selected ${Math.ceil(daysDiff / 365)} year(s) of data, which exceeds the recommended limit of 1 year.\n\n` +
          `This may result in slow performance and long loading times.\n\n` +
          `Do you want to proceed anyway?`
        );
        if (!proceed) {
          setCommLoading(false);
          return;
        }
      }
      
      const expectedCount = hoursDiff;

      // Fetch meters from database
      let query = supabase
        .from('pq_meters')
        .select('id, meter_id, location, status, substation_id, voltage_level, last_communication');

      const { data: meters, error: metersError } = await query;

      if (metersError) throw metersError;

      // For each meter, count actual readings in the date range
      const reportData = await Promise.all(
        (meters || []).map(async (meter) => {
          // Count readings from meter_voltage_readings table
          const { count, error: countError } = await supabase
            .from('meter_voltage_readings')
            .select('*', { count: 'exact', head: true })
            .eq('meter_id', meter.meter_id)
            .gte('timestamp', startDateTime.toISOString())
            .lte('timestamp', endDateTime.toISOString());

          let actualCount = count || 0;
          
          // If no data in database, generate realistic mock availability for demo purposes
          if (actualCount === 0 && expectedCount > 0) {
            // Use meter_id as seed for consistent random values
            const seed = meter.meter_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const random = (seed % 100) / 100;
            
            // Generate realistic availability: 60% at 100%, some 85-95%, few <85%
            let availabilityPercent;
            if (random < 0.60) {
              // 60% of meters: 100% availability
              availabilityPercent = 100;
            } else if (random < 0.90) {
              // 30% of meters: 85-95% availability
              availabilityPercent = 85 + ((random - 0.60) / 0.30) * 10;
            } else {
              // 10% of meters: 70-85% availability
              availabilityPercent = 70 + ((random - 0.90) / 0.10) * 15;
            }
            
            actualCount = Math.floor((availabilityPercent / 100) * expectedCount);
          }
          
          const availability = expectedCount > 0 ? (actualCount / expectedCount) * 100 : 0;

          return {
            siteId: meter.id.substring(0, 8),
            meterId: meter.meter_id,
            location: meter.location || 'N/A',
            voltageLevel: meter.voltage_level || 'N/A',
            count: actualCount,
            expectedCount: expectedCount,
            availability: Number(availability.toFixed(2)),
            status: meter.status
          };
        })
      );

      setCommReportData(reportData);
      setCommShowReport(true);
    } catch (error) {
      console.error('Error fetching availability report:', error);
      alert('Failed to fetch availability report. Please try again.');
    } finally {
      setCommLoading(false);
    }
  };

  const handleCommSort = (column: string) => {
    if (commSortColumn === column) {
      setCommSortDirection(commSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setCommSortColumn(column);
      setCommSortDirection('asc');
    }
  };

  const handleCommExportCSV = () => {
    const filteredData = getFilteredCommData();
    const headers = ['SiteID', 'Name', 'Count', 'Availability (%)'];
    const rows = filteredData.map(row => [
      row.siteId,
      row.meterId,
      row.count,
      row.availability
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `availability_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const handleCommCopy = () => {
    const filteredData = getFilteredCommData();
    const headers = ['SiteID', 'Name', 'Count', 'Availability (%)'];
    const rows = filteredData.map(row => [
      row.siteId,
      row.meterId,
      row.count,
      row.availability
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    navigator.clipboard.writeText(csv);
    alert('Data copied to clipboard!');
  };

  const getFilteredCommData = () => {
    let filtered = commReportData;

    // Filter by search query
    if (commSearchQuery) {
      filtered = filtered.filter(row => 
        row.siteId.toLowerCase().includes(commSearchQuery.toLowerCase()) ||
        row.meterId.toLowerCase().includes(commSearchQuery.toLowerCase())
      );
    }

    // Filter by <100% availability
    if (commFilterLessThan100) {
      filtered = filtered.filter(row => row.availability < 100);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aVal = a[commSortColumn];
      let bVal = b[commSortColumn];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return commSortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return commSortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const commSummaryStats = () => {
    const filtered = getFilteredCommData();
    const totalSites = filtered.length;
    const totalExpected = filtered.reduce((sum, row) => sum + row.expectedCount, 0);
    const totalActual = filtered.reduce((sum, row) => sum + row.count, 0);
    const totalAvailability = totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0;

    return {
      totalSites,
      totalAvailability: Number(totalAvailability.toFixed(2)),
      expectedCount: filtered.length > 0 ? filtered[0].expectedCount : 0
    };
  };

  // Data Maintenance - Raw Data Handler
  const handleGetRawData = async () => {
    try {
      // Check date range limit
      const startTime = new Date(`${rawDateRange.startDate}T${rawDateRange.startHour}:${rawDateRange.startMinute}`);
      const endTime = new Date(`${rawDateRange.endDate}T${rawDateRange.endHour}:${rawDateRange.endMinute}`);
      const daysDiff = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 31) {
        const proceed = window.confirm(
          `You have selected ${daysDiff} days of data, which exceeds the recommended limit of 1 month (31 days).\n\n` +
          `This may result in slow performance and long loading times.\n\n` +
          `Do you want to proceed anyway?`
        );
        if (!proceed) return;
      }
      
      // Generate mock data for selected meter
      const mockData: any[] = [];
      const meters = rawSelectedMeter ? [rawSelectedMeter] : ['PQMS_11KV.APA0042_H3'];
      
      meters.forEach(meterName => {
        const currentTime = new Date(startTime);
        
        while (currentTime <= endTime) {
          mockData.push({
            name: meterName,
            parameter: rawParameter,
            timestamp: currentTime.toISOString().replace('T', ' ').slice(0, 16),
            l1: (6500 + Math.random() * 200).toFixed(3),
            l2: (6500 + Math.random() * 200).toFixed(3),
            l3: (6500 + Math.random() * 200).toFixed(3)
          });
          
          currentTime.setMinutes(currentTime.getMinutes() + 10);
          
          // Limit to 1000 rows
          if (mockData.length >= 1000) break;
        }
        if (mockData.length >= 1000) return;
      });
      
      setRawData(mockData);
      setRawShowResults(true);
    } catch (error) {
      console.error('Error generating raw data:', error);
      alert('Failed to generate raw data');
    }
  };

  // Data Maintenance - Clear Raw Data
  const handleClearRawData = () => {
    setRawData([]);
    setRawShowResults(false);
    setRawSelectedMeter('');
    setRawSearchQuery('');
  };

  // Data Maintenance - Clear Daily Data
  const handleClearDailyData = () => {
    setDailyData([]);
    setDailyShowResults(false);
  };

  // Data Maintenance - Clear Weekly Data
  const handleClearWeeklyData = () => {
    setWeeklyData([]);
    setWeeklyShowResults(false);
  };

  // Data Maintenance - Daily Data Handler
  const handleGetDailyData = async () => {
    try {
      // Check date range limit
      const startDate = new Date(dailyDateRange.startDate);
      const endDate = new Date(dailyDateRange.endDate);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 365) {
        const proceed = window.confirm(
          `You have selected ${Math.ceil(daysDiff / 365)} year(s) of data, which exceeds the recommended limit of 1 year.\n\n` +
          `This may result in slow performance and long loading times.\n\n` +
          `Do you want to proceed anyway?`
        );
        if (!proceed) return;
      }
      
      let metersToUse: any[] = [];
      
      // Try to query meters by voltage level from database
      const { data: meters, error } = await supabase
        .from('pq_meters')
        .select('id, meter_id, location, voltage_level')
        .eq('voltage_level', dailyVoltageLevel);

      if (error || !meters || meters.length === 0) {
        // Use mock meters if database query fails or returns no results
        metersToUse = [
          { id: '1', meter_id: `PQMS_${dailyVoltageLevel}.EKP0227_SHE1`, location: 'Mock Location', voltage_level: dailyVoltageLevel },
          { id: '2', meter_id: `PQMS_${dailyVoltageLevel}.EKP0256_CPK1`, location: 'Mock Location', voltage_level: dailyVoltageLevel },
          { id: '3', meter_id: `PQMS_${dailyVoltageLevel}.CPK0076_BKP2`, location: 'Mock Location', voltage_level: dailyVoltageLevel }
        ];
      } else {
        metersToUse = meters;
      }

      const mockData: any[] = [];

      metersToUse.forEach(meter => {
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          mockData.push({
            name: meter.meter_id,
            parameter: dailyParameter,
            status: Math.random() > 0.9 ? '0' : '',
            timestamp: currentDate.toISOString().split('T')[0],
            v1max: (235000 + Math.random() * 5000).toFixed(3),
            v2max: (235000 + Math.random() * 5000).toFixed(3),
            v3max: (235000 + Math.random() * 5000).toFixed(3),
            v1min: (230000 + Math.random() * 2000).toFixed(3),
            v2min: (230000 + Math.random() * 2000).toFixed(3),
            v3min: (230000 + Math.random() * 2000).toFixed(3)
          });
          
          currentDate.setDate(currentDate.getDate() + 1);
          
          // Limit rows
          if (mockData.length >= 500) break;
        }
        if (mockData.length >= 500) return;
      });

      setDailyData(mockData);
      setDailyShowResults(true);
    } catch (error) {
      console.error('Error generating daily data:', error);
      alert('Failed to generate daily data');
    }
  };

  // Data Maintenance - Weekly Data Handler
  const handleGetWeeklyData = async () => {
    try {
      // Check date range limit
      const startDate = new Date(weeklyDateRange.startDate);
      const endDate = new Date(weeklyDateRange.endDate);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 365) {
        const proceed = window.confirm(
          `You have selected ${Math.ceil(daysDiff / 365)} year(s) of data, which exceeds the recommended limit of 1 year.\n\n` +
          `This may result in slow performance and long loading times.\n\n` +
          `Do you want to proceed anyway?`
        );
        if (!proceed) return;
      }
      
      let metersToUse: any[] = [];
      
      // Try to query meters by voltage level from database
      const { data: meters, error } = await supabase
        .from('pq_meters')
        .select('id, meter_id, location, voltage_level')
        .eq('voltage_level', weeklyVoltageLevel);

      if (error || !meters || meters.length === 0) {
        // Use mock meters if database query fails or returns no results
        metersToUse = [
          { id: '1', meter_id: `PQMS_${weeklyVoltageLevel}.EKP0227_SHE1`, location: 'Mock Location', voltage_level: weeklyVoltageLevel },
          { id: '2', meter_id: `PQMS_${weeklyVoltageLevel}.EKP0256_CPK1`, location: 'Mock Location', voltage_level: weeklyVoltageLevel },
          { id: '3', meter_id: `PQMS_${weeklyVoltageLevel}.CPK0076_BKP2`, location: 'Mock Location', voltage_level: weeklyVoltageLevel }
        ];
      } else {
        metersToUse = meters;
      }

      const mockData: any[] = [];

      metersToUse.forEach(meter => {
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          mockData.push({
            name: meter.meter_id,
            parameter: weeklyParameter,
            status: '',
            timestamp: currentDate.toISOString().split('T')[0],
            l1: (0.8 + Math.random() * 0.4).toFixed(3),
            l2: (0.8 + Math.random() * 0.4).toFixed(3),
            l3: (0.8 + Math.random() * 0.4).toFixed(3)
          });
          
          currentDate.setDate(currentDate.getDate() + 7);
          
          // Limit rows
          if (mockData.length >= 300) break;
        }
        if (mockData.length >= 300) return;
      });

      setWeeklyData(mockData);
      setWeeklyShowResults(true);
    } catch (error) {
      console.error('Error generating weekly data:', error);
      alert('Failed to generate weekly data');
    }
  };

  // Export CSV for Data Maintenance
  const handleExportVerificationCSV = (data: any[], type: 'raw' | 'daily' | 'weekly') => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (type === 'raw') {
      headers = ['Name', 'Parameter', 'Timestamp', 'L1', 'L2', 'L3'];
      rows = data.map(row => [row.name, row.parameter, row.timestamp, row.l1, row.l2, row.l3]);
    } else if (type === 'daily') {
      headers = ['Name', 'Parameter', 'Status', 'Timestamp', 'V1max', 'V2max', 'V3max', 'V1min', 'V2min', 'V3min'];
      rows = data.map(row => [row.name, row.parameter, row.status, row.timestamp, row.v1max, row.v2max, row.v3max, row.v1min, row.v2min, row.v3min]);
    } else if (type === 'weekly') {
      headers = ['Name', 'Parameter', 'status', 'Timestamp', 'L1', 'L2', 'L3'];
      rows = data.map(row => [row.name, row.parameter, row.status, row.timestamp, row.l1, row.l2, row.l3]);
    }

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification_${type}_data_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const tabs = [
    { id: 'pq_summary', label: 'PQ Summary', icon: BarChart3 },
    { id: 'benchmarking', label: 'Benchmarking', icon: Target },
    { id: 'profile', label: 'Voltage & Current Profile', icon: User },
    { id: 'data_maintenance', label: 'Data Maintenance', icon: Database },
    { id: 'meter_communication', label: 'Meter Communication', icon: Wifi },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-8 h-8 text-slate-700" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reporting</h1>
          <p className="text-slate-600 mt-1">Generate and manage power quality reports</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'pq_summary' && (
            <div className="space-y-6">
              {/* Header with Profile Actions */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">PQ Summary</h2>
                  <p className="text-slate-600">Power Quality summary reports and analytics.</p>
                </div>
                <div className="flex gap-2">
                  {pqSummaryProfiles.length > 0 && (
                    <button
                      onClick={() => setShowLoadPqProfileModal(true)}
                      className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-all text-sm flex items-center gap-2"
                    >
                      <ChevronDown className="w-4 h-4" />
                      Load Filter Profile
                    </button>
                  )}
                  <button
                    onClick={() => setShowSavePqProfileModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Filter Profile
                  </button>
                </div>
              </div>

              {/* Filters Section */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-5 h-5 text-slate-700" />
                  <h3 className="font-semibold text-slate-900">Filter Parameters</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Search Box */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      <Search className="w-4 h-4 inline mr-1" />
                      Search by Event ID or Customer
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Enter event ID or customer name..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  {/* Date Range */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Time Range
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Event Type Filters */}
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Event Types</label>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-300 hover:bg-slate-50 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={showHarmonicEvents}
                        onChange={(e) => setShowHarmonicEvents(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">Harmonic Events</span>
                    </label>
                    
                    <label className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-300 hover:bg-slate-50 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={showVoltageEvents}
                        onChange={(e) => setShowVoltageEvents(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">Voltage Events</span>
                    </label>
                    
                    <label className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-300 hover:bg-slate-50 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={showInterruptions}
                        onChange={(e) => setShowInterruptions(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">Interruptions</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm">
                    Apply Filters
                  </button>
                  <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-all text-sm">
                    Reset
                  </button>
                  <button className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export Report
                  </button>
                </div>
              </div>

              {/* Summary Table */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Event ID</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Event Type</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Severity</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Duration</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Location</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">Affected Customer</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">PQ Service Log</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {mockSummaryData.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-blue-600">{row.eventId}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{row.date}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                              row.type === 'Harmonic' ? 'bg-purple-100 text-purple-700' :
                              row.type === 'Voltage Dip' ? 'bg-yellow-100 text-yellow-700' :
                              row.type === 'Voltage Swell' ? 'bg-orange-100 text-orange-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {row.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                              row.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                              row.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                              row.severity === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {row.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{row.duration}</td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.location}</td>
                          <td className="px-4 py-3 text-sm text-center">
                            <button
                              onClick={() => handleOpenAffectedCustomers(row.id, row.affectedCustomers)}
                              disabled={row.affectedCustomers === 0}
                              className={`inline-flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                                row.affectedCustomers > 0
                                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer'
                                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                              }`}
                              title={row.affectedCustomers > 0 ? `View ${row.affectedCustomers} affected customer(s)` : 'No affected customers'}
                            >
                              {row.affectedCustomers}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <button
                              onClick={() => handleOpenServiceLog(row.id)}
                              className={`relative inline-flex items-center justify-center p-2 rounded-lg transition-all ${
                                row.serviceLogCount > 0
                                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                              title={row.serviceLogCount > 0 ? `${row.serviceLogCount} service log(s)` : 'No service logs'}
                            >
                              <FileCheck className="w-5 h-5" />
                              {row.serviceLogCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                  {row.serviceLogCount}
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button className="text-blue-600 hover:text-blue-800 font-medium">
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'benchmarking' && (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <h2 className="text-xl font-bold text-slate-900">Benchmarking</h2>
                <p className="text-slate-600">Manage PQ standards and analyze voltage dip events.</p>
              </div>

              {/* Benchmarking Sub-tabs */}
              <div className="bg-white rounded-lg border border-slate-200">
                <div className="border-b border-slate-200">
                  <nav className="flex px-6">
                    {[
                      { id: 'pq_standard', label: 'PQ Standard' },
                      { id: 'voltage_dip', label: 'Voltage Dip Benchmarking' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setBenchmarkingSection(tab.id as 'pq_standard' | 'voltage_dip')}
                        className={`py-3 px-6 font-medium text-sm border-b-2 ${
                          benchmarkingSection === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-6">
                  {/* PQ Standard Section */}
                  {benchmarkingSection === 'pq_standard' && (
                    <div className="space-y-6">
                      {/* Controls Section */}
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Search Box */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          <Search className="w-4 h-4 inline mr-1" />
                          Search
                        </label>
                        <input
                          type="text"
                          value={benchmarkSearch}
                          onChange={(e) => setBenchmarkSearch(e.target.value)}
                          placeholder="Search standards..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>

                      {/* By Standard Dropdown */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">By Standard:</label>
                        <select
                          value={selectedStandard}
                          onChange={(e) => setSelectedStandard(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          {uniqueStandards.map(std => (
                            <option key={std} value={std}>{std}</option>
                          ))}
                        </select>
                      </div>

                      {/* By Parameter Dropdown */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">By Parameter:</label>
                        <select
                          value={selectedParameter}
                          onChange={(e) => setSelectedParameter(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          {uniqueParameters.map(param => (
                            <option key={param} value={param}>{param}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => setShowAddStandardModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add New Standard
                      </button>
                      <button
                        onClick={handleCopyTable}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-all text-sm flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                      <button
                        onClick={handleExportCSV}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        CSV
                      </button>
                    </div>
                  </div>

                  {/* Standards Table */}
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Standard</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Version</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Category</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Parameter</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Level</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Min</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Max</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Unit</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Remarks</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {paginatedStandards.length > 0 ? (
                            paginatedStandards.map((standard) => (
                              <tr key={standard.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-slate-900">{standard.standard}</td>
                                <td className="px-4 py-3 text-sm text-slate-700">{standard.version}</td>
                                <td className="px-4 py-3 text-sm text-slate-700">{standard.category}</td>
                                <td className="px-4 py-3 text-sm text-slate-700">{standard.parameter}</td>
                                <td className="px-4 py-3 text-sm text-slate-700">{standard.level}</td>
                                <td className="px-4 py-3 text-sm text-slate-700">{standard.min}</td>
                                <td className="px-4 py-3 text-sm text-slate-700">{standard.max}</td>
                                <td className="px-4 py-3 text-sm text-slate-700">{standard.unit}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{standard.remarks}</td>
                                <td className="px-4 py-3 text-sm text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleEditStandard(standard)}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-all"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteStandard(standard.id)}
                                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-all"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                                No standards found matching your criteria
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-slate-600">
                            Page {currentPage} of {totalPages}
                          </span>
                          <span className="text-sm text-slate-500">
                            • {itemsPerPage} items per page
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1}
                            className={`p-1.5 rounded transition-all ${
                              currentPage === 1
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Previous page"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <span className="inline-flex items-center justify-center w-8 h-8 text-sm font-semibold text-white bg-blue-600 rounded">
                            {currentPage}
                          </span>
                          <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                            className={`p-1.5 rounded transition-all ${
                              currentPage === totalPages
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Next page"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                    </div>
                  )}


              {/* Voltage Dip Benchmarking Section */}
              {benchmarkingSection === 'voltage_dip' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-12 gap-6">
                    {/* Left Panel - Selection Controls */}
                    <div className="col-span-12 lg:col-span-3 space-y-4">
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <h3 className="text-sm font-bold text-slate-900 mb-4">1. Select meter(s) from the list:</h3>
                      
                      {/* Selection Type */}
                      <div className="space-y-2 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={dipSelectionType === 'voltage_level'}
                            onChange={() => setDipSelectionType('voltage_level')}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-sm font-medium text-slate-700">By Voltage Level of Mother Event</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={dipSelectionType === 'individual'}
                            onChange={() => setDipSelectionType('individual')}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-sm font-medium text-slate-700">By Individual Meters</span>
                        </label>
                        {dipSelectionType === 'individual' && (
                          <p className="text-xs text-slate-500 ml-6">* Max. of 1 year and 10 meters only</p>
                        )}
                      </div>

                      {/* Voltage Level Selection */}
                      {dipSelectionType === 'voltage_level' && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-slate-600 mb-2">Available list:</p>
                          <div className="space-y-1 max-h-48 overflow-y-auto border border-slate-200 rounded p-2 bg-white">
                            {['400KV', '132KV', '33KV', '11KV', '380V'].map((level) => (
                              <label key={level} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={dipSelectedVoltageLevels.includes(level)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setDipSelectedVoltageLevels([...dipSelectedVoltageLevels, level]);
                                    } else {
                                      setDipSelectedVoltageLevels(dipSelectedVoltageLevels.filter(l => l !== level));
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-slate-700">{level}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Individual Meter Selection */}
                      {dipSelectionType === 'individual' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-slate-600">Available list:</p>
                            <span className="text-xs text-blue-600 font-semibold">547</span>
                          </div>
                          <input
                            type="text"
                            placeholder="Search"
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 mb-2"
                          />
                          <div className="border border-slate-200 rounded bg-white">
                            <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                              {['PQMS_400KV.BKP0227_SHE1', 'PQMS_400KV.BKP0256_CPK1', 'PQMS_400KV.CPK0076_BKP2'].map((meter) => (
                                <label key={meter} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded text-xs">
                                  <input
                                    type="checkbox"
                                    checked={dipSelectedMeters.includes(meter)}
                                    onChange={(e) => {
                                      if (e.target.checked && dipSelectedMeters.length < 10) {
                                        setDipSelectedMeters([...dipSelectedMeters, meter]);
                                      } else if (!e.target.checked) {
                                        setDipSelectedMeters(dipSelectedMeters.filter(m => m !== meter));
                                      }
                                    }}
                                    className="w-3.5 h-3.5 text-blue-600"
                                  />
                                  <span className="text-slate-700">{meter}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2 text-xs">
                            <button className="text-blue-600 hover:text-blue-700">&lt;</button>
                            <span className="text-slate-600">Selected Meters: (Max. of 10)</span>
                            <button className="text-blue-600 hover:text-blue-700">&gt;&gt;</button>
                          </div>
                          <div className="text-xs text-right">
                            <span className="text-blue-600 font-semibold">{dipSelectedMeters.length}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Time Range */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <h3 className="text-sm font-bold text-slate-900 mb-4">2. Set time range: (Max. of 1 year)</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">From:</label>
                          <input
                            type="date"
                            value={dipDateRange.start}
                            onChange={(e) => setDipDateRange({ ...dipDateRange, start: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">To:</label>
                          <input
                            type="date"
                            value={dipDateRange.end}
                            onChange={(e) => setDipDateRange({ ...dipDateRange, end: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={handleGetBenchmarkResult}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-bold hover:shadow-lg transition-all"
                    >
                      GET BENCHMARK RESULT
                    </button>
                  </div>

                  {/* Right Panel - Results */}
                  <div className="col-span-12 lg:col-span-9 space-y-4">
                    {dipShowResults ? (
                      <>
                        {/* Chart Area */}
                        <div className="bg-white rounded-lg border border-slate-200 p-6">
                          <h3 className="text-lg font-bold text-slate-900 mb-4">Voltage Dip Benchmarking</h3>
                          
                          {/* Chart */}
                          <div className="relative bg-white rounded-lg border border-slate-200" style={{ height: '500px', width: '100%' }}>
                            <svg width="100%" height="100%" viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid meet">
                              {/* Define margins */}
                              <defs>
                                <clipPath id="chart-area">
                                  <rect x="80" y="30" width="1000" height="400" />
                                </clipPath>
                              </defs>
                              
                              {/* Background */}
                              <rect x="80" y="30" width="1000" height="400" fill="#ffffff" />
                              
                              {/* Grid lines - Horizontal */}
                              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((val) => {
                                const y = 430 - (val / 100) * 400;
                                return (
                                  <g key={`h-${val}`}>
                                    <line x1="80" y1={y} x2="1080" y2={y} stroke="#cbd5e1" strokeWidth="1" />
                                    <text x="70" y={y + 4} textAnchor="end" fontSize="12" fill="#64748b">{val}</text>
                                  </g>
                                );
                              })}
                              
                              {/* Grid lines - Vertical */}
                              {[0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((val) => {
                                const x = 80 + (val / 1.0) * 1000;
                                return (
                                  <g key={`v-${val}`}>
                                    <line x1={x} y1="30" x2={x} y2="430" stroke="#cbd5e1" strokeWidth="1" />
                                    <text x={x} y="448" textAnchor="middle" fontSize="12" fill="#64748b">{val.toFixed(1)}</text>
                                  </g>
                                );
                              })}
                              
                              {/* Standards zones */}
                              <g clipPath="url(#chart-area)">
                                {/* IEC61000-4-34/11 - Green zone */}
                                {dipSelectedStandards.includes('IEC61000-4-34/11') && (
                                  <>
                                    <rect x="80" y="30" width="100" height="200" fill="#86efac" opacity="0.5" />
                                    <rect x="180" y="30" width="100" height="280" fill="#86efac" opacity="0.5" />
                                    <rect x="280" y="30" width="400" height="280" fill="#86efac" opacity="0.5" />
                                    <rect x="680" y="30" width="400" height="88" fill="#86efac" opacity="0.5" />
                                    
                                    {/* Border lines */}
                                    <polyline
                                      points="80,230 180,230 180,310 680,310 680,118 1080,118 1080,30"
                                      fill="none"
                                      stroke="#22c55e"
                                      strokeWidth="3"
                                    />
                                  </>
                                )}
                                
                                {/* SEMI F47 - Blue zone */}
                                {dipSelectedStandards.includes('SEMI F47') && (
                                  <>
                                    <rect x="80" y="30" width="100" height="230" fill="#93c5fd" opacity="0.5" />
                                    <rect x="180" y="30" width="300" height="310" fill="#93c5fd" opacity="0.5" />
                                    <rect x="480" y="30" width="600" height="88" fill="#93c5fd" opacity="0.5" />
                                    
                                    {/* Border lines */}
                                    <polyline
                                      points="80,260 180,260 180,340 480,340 480,118 1080,118 1080,30"
                                      fill="none"
                                      stroke="#3b82f6"
                                      strokeWidth="3"
                                    />
                                  </>
                                )}
                                
                                {/* ITIC - Yellow/Beige zone */}
                                {dipSelectedStandards.includes('ITIC') && (
                                  <>
                                    <rect x="80" y="30" width="100" height="250" fill="#fef3c7" opacity="0.5" />
                                    <rect x="180" y="30" width="400" height="310" fill="#fef3c7" opacity="0.5" />
                                    <rect x="580" y="30" width="500" height="88" fill="#fef3c7" opacity="0.5" />
                                    
                                    {/* Border lines */}
                                    <polyline
                                      points="80,280 180,280 180,340 580,340 580,118 1080,118 1080,30"
                                      fill="none"
                                      stroke="#eab308"
                                      strokeWidth="3"
                                    />
                                  </>
                                )}
                              </g>
                              
                              {/* Data points */}
                              <g clipPath="url(#chart-area)">
                                {dipChartData.map((point, idx) => {
                                  const x = 80 + (Math.min(point.duration, 1.0) / 1.0) * 1000;
                                  const y = 430 - (point.vmin / 100) * 400;
                                  return (
                                    <g key={idx}>
                                      <circle
                                        cx={x}
                                        cy={y}
                                        r="6"
                                        fill="#dc2626"
                                        stroke="#ffffff"
                                        strokeWidth="2"
                                        className="cursor-pointer"
                                        style={{ transition: 'all 0.2s' }}
                                      >
                                        <title>{`${point.meter}\nVmin: ${point.vmin}%\nDuration: ${point.duration}s`}</title>
                                      </circle>
                                    </g>
                                  );
                                })}
                              </g>
                              
                              {/* Axes */}
                              <line x1="80" y1="430" x2="1080" y2="430" stroke="#1e293b" strokeWidth="2" />
                              <line x1="80" y1="30" x2="80" y2="430" stroke="#1e293b" strokeWidth="2" />
                              
                              {/* Axes labels */}
                              <text x="580" y="480" textAnchor="middle" fontSize="14" fontWeight="600" fill="#1e293b">Duration (s)</text>
                              <text x="40" y="230" textAnchor="middle" fontSize="14" fontWeight="600" fill="#1e293b" transform="rotate(-90 40 230)">Voltage (%)</text>
                            </svg>
                          </div>

                          {/* Legend */}
                          <div className="mt-4 flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                              <input 
                                type="radio" 
                                name="standard" 
                                checked={dipSelectedStandards.includes('IEC61000-4-34/11')} 
                                onChange={() => setDipSelectedStandards(['IEC61000-4-34/11'])} 
                                className="w-4 h-4 text-blue-600" 
                              />
                              <span className="text-slate-700">IEC61000-4-34/11</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input 
                                type="radio" 
                                name="standard" 
                                checked={dipSelectedStandards.includes('SEMI F47')} 
                                onChange={() => setDipSelectedStandards(['SEMI F47'])} 
                                className="w-4 h-4 text-blue-600" 
                              />
                              <span className="text-slate-700">SEMI F47</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input 
                                type="radio" 
                                name="standard" 
                                checked={dipSelectedStandards.includes('ITIC')} 
                                onChange={() => setDipSelectedStandards(['ITIC'])} 
                                className="w-4 h-4 text-blue-600" 
                              />
                              <span className="text-slate-700">ITIC</span>
                            </div>
                          </div>
                          
                          {/* Statistics Table */}
                          <div className="mt-6 bg-slate-50 rounded-lg p-4">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-300">
                                  <th className="text-left py-2 font-semibold text-slate-700">Curve</th>
                                  <th className="text-center py-2 font-semibold text-slate-700">Passed</th>
                                  <th className="text-center py-2 font-semibold text-slate-700">Failed</th>
                                  <th className="text-center py-2 font-semibold text-slate-700">&gt;1s</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                <tr>
                                  <td className="py-2 text-slate-700">IEC61000-4-34/11</td>
                                  <td className="text-center py-2 text-slate-700">8</td>
                                  <td className="text-center py-2 text-slate-700">0</td>
                                  <td className="text-center py-2 text-slate-700">2</td>
                                </tr>
                                <tr>
                                  <td className="py-2 text-slate-700">SEMI F47</td>
                                  <td className="text-center py-2 text-slate-700">8</td>
                                  <td className="text-center py-2 text-slate-700">0</td>
                                  <td className="text-center py-2 text-slate-700">2</td>
                                </tr>
                                <tr>
                                  <td className="py-2 text-slate-700">ITIC</td>
                                  <td className="text-center py-2 text-slate-700">3</td>
                                  <td className="text-center py-2 text-slate-700">5</td>
                                  <td className="text-center py-2 text-slate-700">2</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <p className="text-xs text-slate-600 mt-4 italic">
                            * Each point represents an event group (power system fault). Select point to show voltage dip details:
                          </p>
                        </div>

                        {/* Data Table */}
                        <div className="bg-white rounded-lg border border-slate-200">
                          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <input
                              type="text"
                              placeholder="Search:"
                              className="px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex gap-2">
                              <button className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-50">Copy</button>
                              <button className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-50">CSV</button>
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-blue-600 text-white">
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-semibold">groupid</th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold">meter</th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold">Duration (s)</th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold">Vmin (%)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {dipChartData.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 text-sm text-slate-700">{row.groupid}</td>
                                    <td className="px-4 py-2 text-sm text-slate-700">{row.meter}</td>
                                    <td className="px-4 py-2 text-sm text-slate-700">{row.duration}</td>
                                    <td className="px-4 py-2 text-sm text-slate-700">{row.vmin}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-600">
                            Showing 1 to {dipChartData.length} of {dipChartData.length} entries
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 p-12 text-center">
                        <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 text-lg font-medium">No results yet</p>
                        <p className="text-slate-400 text-sm mt-2">
                          Select meter(s), set time range, and click "GET BENCHMARK RESULT" to view analysis
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                </div>
              )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Header with Actions */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Voltage & Current Profile</h2>
                  <p className="text-slate-600">Analyze historical voltage/current data by meter.</p>
                </div>
                <div className="flex gap-2">
                  {savedProfiles.length > 0 && (
                    <button
                      onClick={() => setShowLoadProfileModal(true)}
                      className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-all text-sm flex items-center gap-2"
                    >
                      <ChevronDown className="w-4 h-4" />
                      Load Profile
                    </button>
                  )}
                  {showProfileResults && (
                    <button
                      onClick={() => setShowSaveProfileModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save Profile
                    </button>
                  )}
                </div>
              </div>

              {/* Filters Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Panel - Selection Criteria */}
                <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 space-y-6">
                  {/* Step 1: Data Type Toggle */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      1. Select data (Raw data will take time):
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={profileValueType === 'average'}
                          onChange={() => setProfileValueType('average')}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-slate-700">Daily Average</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={profileValueType === 'raw'}
                          onChange={() => setProfileValueType('raw')}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-slate-700">Raw Data</span>
                      </label>
                    </div>
                  </div>

                  {/* Step 2: Voltage Level */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      2. Select meter(s) from the list:
                    </label>
                    <div className="space-y-2">
                      {['All', '400KV', '132KV', '33KV', '11KV', '380V'].map(level => (
                        <label key={level} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={profileVoltageLevel === level}
                            onChange={() => setProfileVoltageLevel(level)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-sm text-slate-700">{level}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Step 3: Time Range */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      3. Set time range:
                    </label>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">From:</label>
                        <input
                          type="date"
                          value={profileDateRange.start}
                          onChange={(e) => setProfileDateRange({ ...profileDateRange, start: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">To:</label>
                        <input
                          type="date"
                          value={profileDateRange.end}
                          onChange={(e) => setProfileDateRange({ ...profileDateRange, end: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Get Profile Button */}
                  <button
                    onClick={handleGetProfileResult}
                    className="w-full py-3 bg-gradient-to-r from-blue-700 to-blue-900 text-white rounded-lg font-bold hover:shadow-lg transition-all text-sm uppercase"
                  >
                    GET PROFILE RESULT
                  </button>
                </div>

                {/* Center Panel - Meter Selection */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Data Type Toggle */}
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Type of Data:
                    </label>
                    <div className="flex gap-4">
                      <button
                        onClick={() => {
                          setProfileDataType('voltage');
                          setProfileParameters(['V1', 'V2', 'V3']);
                        }}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          profileDataType === 'voltage'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Voltage
                      </button>
                      <button
                        onClick={() => {
                          setProfileDataType('current');
                          setProfileParameters(['I1', 'I2', 'I3']);
                        }}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          profileDataType === 'current'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Current
                      </button>
                    </div>
                  </div>

                  {/* Meter List */}
                  <div className="bg-white rounded-lg border border-slate-200">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                      <span className="font-semibold text-slate-700">Total Number of Meter: {filteredMeters.length}</span>
                      <input
                        type="text"
                        placeholder="Search"
                        value={profileSearchQuery}
                        onChange={(e) => setProfileSearchQuery(e.target.value)}
                        className="px-3 py-1 border border-slate-300 rounded text-sm w-48"
                      />
                    </div>
                    <div className="h-96 overflow-y-auto p-2">
                      {filteredMeters.slice(0, 50).map(meter => (
                        <label
                          key={meter.id}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={profileSelectedMeters.includes(meter.id)}
                            onChange={() => toggleMeterSelection(meter.id)}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-sm text-slate-700">{meter.id}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Panel - Selected Meters */}
                <div className="bg-white rounded-lg border border-slate-200">
                  <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <span className="font-semibold text-slate-700">Selected Meters: {profileSelectedMeters.length}</span>
                  </div>
                  <div className="h-96 overflow-y-auto p-2">
                    {profileSelectedMeters.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-sm">
                        No meters selected
                      </div>
                    ) : (
                      profileSelectedMeters.map((meterId) => (
                        <div
                          key={meterId}
                          className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded"
                        >
                          <span className="text-sm text-slate-700">{meterId}</span>
                          <button
                            onClick={() => toggleMeterSelection(meterId)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Results Section */}
              {showProfileResults && (
                <div className="space-y-6">
                  {/* Chart Controls */}
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-sm font-semibold text-slate-700 mr-4">
                          Type of Data: {profileDataType === 'voltage' ? 'Voltage' : 'Current'}, {profileValueType === 'average' ? 'AVG' : 'RAW'}
                        </span>
                        <span className="text-sm text-slate-600 mr-4">
                          From: {profileDateRange.start}
                        </span>
                        <span className="text-sm text-slate-600">
                          To: {profileDateRange.end}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-700">Select parameter:</span>
                          {(profileDataType === 'voltage' ? ['V1', 'V2', 'V3'] : ['I1', 'I2', 'I3']).map(param => (
                            <label key={param} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={profileParameters.includes(param)}
                                onChange={() => handleToggleParameter(param)}
                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer accent-blue-600"
                              />
                              <span className="text-sm text-slate-700 font-medium">{param}</span>
                            </label>
                          ))}
                        </div>
                        <button
                          onClick={() => alert('Copy chart to clipboard')}
                          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-all text-sm flex items-center gap-1"
                        >
                          <Copy className="w-4 h-4" />
                          Copy
                        </button>
                        <button
                          onClick={handleExportProfileCSV}
                          className="px-3 py-1.5 bg-green-600 text-white rounded hover:shadow-lg transition-all text-sm flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          CSV
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {profileSelectedMeters.map((meterId) => {
                      const chartData = profileChartData[meterId] || [];
                      return (
                        <div key={meterId} className="bg-white rounded-lg border border-slate-200 p-4">
                          <LineChart
                            data={chartData}
                            parameters={profileParameters}
                            title={meterId}
                            height={250}
                            showLegend={true}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'data_maintenance' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Data Maintenance</h2>
                  <p className="text-slate-600">Verify and manage raw, daily, and weekly power quality data.</p>
                </div>
                <div className="flex gap-2"></div>
              </div>

              {/* Verification Sub-tabs */}
              <div className="bg-white rounded-lg border border-slate-200">
                <div className="border-b border-slate-200">
                  <nav className="flex px-6">
                    {[
                      { id: 'raw', label: 'Raw Data' },
                      { id: 'daily', label: 'Daily Data' },
                      { id: 'weekly', label: 'Weekly Data' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setVerificationTab(tab.id as any)}
                        className={`py-3 px-6 font-medium text-sm border-b-2 ${
                          verificationTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-6">
                  {/* Raw Data Tab */}
                  {verificationTab === 'raw' && (
                    <div className="grid grid-cols-[300px,1fr] gap-6">
                      {/* Left Panel - Filters */}
                      <div className="space-y-6 bg-slate-50 p-4 rounded-lg">
                        {/* Step 1: Select Meters */}
                        <div>
                          <h3 className="text-sm font-bold text-slate-700 mb-3 bg-blue-100 px-3 py-2 rounded">
                            1. Select one meter from the list:
                          </h3>
                          <div className="bg-white rounded border border-slate-300 p-2 mb-2">
                            <input
                              type="text"
                              placeholder="Search"
                              value={rawSearchQuery}
                              onChange={(e) => setRawSearchQuery(e.target.value)}
                              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                          </div>
                          <div className="text-center text-sm font-semibold text-slate-600 mb-2">Total Number of Meters: 547</div>
                          <div className="bg-white rounded border border-slate-300 max-h-[300px] overflow-y-auto">
                            {['PQMS_11KV.APA0042_H3', 'PQMS_11KV.APA0043_H1', 'PQMS_11KV.APA0044_H4', 'PQMS_11KV.APA0103_H2', 'PQMS_11KV.APB0047_H3'].map((meter) => (
                              <label key={meter} className="flex items-center px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-sm">
                                <input
                                  type="radio"
                                  name="rawMeterSelection"
                                  value={meter}
                                  checked={rawSelectedMeter === meter}
                                  onChange={(e) => setRawSelectedMeter(e.target.value)}
                                  className="w-4 h-4 text-blue-600 border-slate-300 mr-2"
                                />
                                <span className="text-slate-700">{meter}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Step 2: Select Parameter */}
                        <div>
                          <h3 className="text-sm font-bold text-slate-700 mb-3 bg-blue-100 px-3 py-2 rounded">
                            2. Select parameter:
                          </h3>
                          <select
                            value={rawParameter}
                            onChange={(e) => setRawParameter(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                          >
                            <option>Voltage</option>
                            <option>Frequency</option>
                            <option>Voltage Unbalance</option>
                            <option>Power Factor</option>
                            <option>Voltage THD</option>
                            <option>5th Harmonics</option>
                            <option>7th Harmonics</option>
                            <option>Voltage Flickering</option>
                          </select>
                        </div>

                        {/* Step 3: Set Time Range */}
                        <div>
                          <h3 className="text-sm font-bold text-slate-700 mb-3 bg-blue-100 px-3 py-2 rounded">
                            3. Set time range: (Max. of 1 month)
                          </h3>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">From:</label>
                              <div className="flex gap-1">
                                <input
                                  type="date"
                                  value={rawDateRange.startDate}
                                  onChange={(e) => setRawDateRange({...rawDateRange, startDate: e.target.value})}
                                  className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <input
                                  type="number"
                                  value={rawDateRange.startHour}
                                  disabled
                                  className="w-12 px-1 py-1.5 text-sm border border-slate-300 rounded outline-none text-center bg-slate-100 text-slate-400 cursor-not-allowed"
                                />
                                <span className="self-center text-slate-400">:</span>
                                <input
                                  type="number"
                                  value={rawDateRange.startMinute}
                                  disabled
                                  className="w-12 px-1 py-1.5 text-sm border border-slate-300 rounded outline-none text-center bg-slate-100 text-slate-400 cursor-not-allowed"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">To:</label>
                              <div className="flex gap-1">
                                <input
                                  type="date"
                                  value={rawDateRange.endDate}
                                  onChange={(e) => setRawDateRange({...rawDateRange, endDate: e.target.value})}
                                  className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <input
                                  type="number"
                                  value={rawDateRange.endHour}
                                  disabled
                                  className="w-12 px-1 py-1.5 text-sm border border-slate-300 rounded outline-none text-center bg-slate-100 text-slate-400 cursor-not-allowed"
                                />
                                <span className="self-center text-slate-400">:</span>
                                <input
                                  type="number"
                                  value={rawDateRange.endMinute}
                                  disabled
                                  className="w-12 px-1 py-1.5 text-sm border border-slate-300 rounded outline-none text-center bg-slate-100 text-slate-400 cursor-not-allowed"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={handleGetRawData}
                          disabled={!rawSelectedMeter}
                          className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Get Raw Data
                        </button>

                        {rawShowResults && (
                          <button
                            onClick={handleClearRawData}
                            className="w-full mt-3 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-all"
                          >
                            Clear Results
                          </button>
                        )}
                      </div>

                      {/* Right Panel - Results */}
                      <div>
                        <div className="bg-white rounded-lg border border-slate-300 p-4 mb-4">
                          <h3 className="text-sm font-semibold text-slate-600 mb-2">Selected Meter:</h3>
                          <div className="text-slate-800 font-medium">
                            {rawSelectedMeter || 'None'}
                          </div>
                        </div>

                        {rawShowResults && rawData.length > 0 && (
                          <div>
                            <div className="flex justify-end mb-3">
                              <button
                                onClick={() => handleExportVerificationCSV(rawData, 'raw')}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold text-sm flex items-center gap-2"
                              >
                                <Download className="w-4 h-4" />
                                Export CSV
                              </button>
                            </div>
                            <div className="border border-slate-300 rounded-lg overflow-hidden">
                              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gradient-to-r from-slate-900 to-slate-800 text-white sticky top-0">
                                    <tr>
                                      <th className="px-4 py-3 text-left font-semibold">Name</th>
                                      <th className="px-4 py-3 text-left font-semibold">Parameter</th>
                                      <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                                      <th className="px-4 py-3 text-right font-semibold">L1</th>
                                      <th className="px-4 py-3 text-right font-semibold">L2</th>
                                      <th className="px-4 py-3 text-right font-semibold">L3</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white">
                                    {rawData.map((row, idx) => (
                                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                                        <td className="px-4 py-2 text-slate-700">{row.name}</td>
                                        <td className="px-4 py-2 text-slate-700">{row.parameter}</td>
                                        <td className="px-4 py-2 text-slate-700">{row.timestamp}</td>
                                        <td className="px-4 py-2 text-right text-slate-800 font-mono">{row.l1}</td>
                                        <td className="px-4 py-2 text-right text-slate-800 font-mono">{row.l2}</td>
                                        <td className="px-4 py-2 text-right text-slate-800 font-mono">{row.l3}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Daily Data Tab */}
                  {verificationTab === 'daily' && (
                    <div className="grid grid-cols-[300px,1fr] gap-6">
                      {/* Left Panel - Filters */}
                      <div className="space-y-6 bg-slate-50 p-4 rounded-lg">
                        <div>
                          <h3 className="text-sm font-bold text-slate-700 mb-3 bg-blue-100 px-3 py-2 rounded">
                            1. Select meter(s) from the list:
                          </h3>
                          <div className="bg-white rounded-lg border border-cyan-300 p-4">
                            <h4 className="text-sm font-semibold text-cyan-700 mb-3">Available List</h4>
                            <div className="space-y-2">
                              <h5 className="text-sm font-semibold text-slate-700">Voltage Level:</h5>
                              {['400KV', '132KV', '33KV', '11KV', '380V'].map((level) => (
                                <label key={level} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="radio"
                                    name="dailyVoltageLevel"
                                    value={level}
                                    checked={dailyVoltageLevel === level}
                                    onChange={(e) => setDailyVoltageLevel(e.target.value)}
                                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-2 focus:ring-blue-500"
                                  />
                                  <span className="text-slate-700">{level}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-slate-700 mb-3 bg-blue-100 px-3 py-2 rounded">
                            2. Select parameter:
                          </h3>
                          <select
                            value={dailyParameter}
                            onChange={(e) => setDailyParameter(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                          >
                            <option>Voltage</option>
                            <option>Frequency</option>
                            <option>Voltage Unbalance</option>
                            <option>Power Factor</option>
                            <option>Voltage Flickering</option>
                          </select>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-slate-700 mb-3 bg-blue-100 px-3 py-2 rounded">
                            3. Set time range: (Max. of 1 year)
                          </h3>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">From:</label>
                              <div className="flex gap-1">
                                <input
                                  type="date"
                                  value={dailyDateRange.startDate}
                                  onChange={(e) => setDailyDateRange({...dailyDateRange, startDate: e.target.value})}
                                  className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <input
                                  type="number"
                                  value={dailyDateRange.startHour}
                                  disabled
                                  className="w-12 px-1 py-1.5 text-sm border border-slate-300 rounded outline-none text-center bg-slate-100 text-slate-400 cursor-not-allowed"
                                />
                                <span className="self-center text-slate-400">:</span>
                                <input
                                  type="number"
                                  value="00"
                                  disabled
                                  className="w-12 px-1 py-1.5 text-sm border border-slate-300 rounded outline-none text-center bg-slate-100 text-slate-400 cursor-not-allowed"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">To:</label>
                              <div className="flex gap-1">
                                <input
                                  type="date"
                                  value={dailyDateRange.endDate}
                                  onChange={(e) => setDailyDateRange({...dailyDateRange, endDate: e.target.value})}
                                  className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <input
                                  type="number"
                                  value={dailyDateRange.endHour}
                                  disabled
                                  className="w-12 px-1 py-1.5 text-sm border border-slate-300 rounded outline-none text-center bg-slate-100 text-slate-400 cursor-not-allowed"
                                />
                                <span className="self-center text-slate-400">:</span>
                                <input
                                  type="number"
                                  value="59"
                                  disabled
                                  className="w-12 px-1 py-1.5 text-sm border border-slate-300 rounded outline-none text-center bg-slate-100 text-slate-400 cursor-not-allowed"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={handleGetDailyData}
                          className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                        >
                          Get Daily Data
                        </button>

                        {dailyShowResults && (
                          <button
                            onClick={handleClearDailyData}
                            className="w-full mt-3 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-all"
                          >
                            Clear Results
                          </button>
                        )}
                      </div>

                      {/* Right Panel - Results */}
                      <div>
                        {dailyShowResults && dailyData.length > 0 && (
                          <div>
                            <div className="flex justify-end mb-3">
                              <button
                                onClick={() => handleExportVerificationCSV(dailyData, 'daily')}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold text-sm flex items-center gap-2"
                              >
                                <Download className="w-4 h-4" />
                                Export CSV
                              </button>
                            </div>
                            <div className="border border-slate-300 rounded-lg overflow-hidden">
                              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gradient-to-r from-slate-900 to-slate-800 text-white sticky top-0">
                                    <tr>
                                      <th className="px-4 py-3 text-left font-semibold">Name</th>
                                      <th className="px-4 py-3 text-left font-semibold">Parameter</th>
                                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                                      <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                                      <th className="px-4 py-3 text-right font-semibold">V1max</th>
                                      <th className="px-4 py-3 text-right font-semibold">V2max</th>
                                      <th className="px-4 py-3 text-right font-semibold">V3max</th>
                                      <th className="px-4 py-3 text-right font-semibold">V1min</th>
                                      <th className="px-4 py-3 text-right font-semibold">V2min</th>
                                      <th className="px-4 py-3 text-right font-semibold">V3min</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white">
                                    {dailyData.map((row, idx) => (
                                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                                        <td className="px-4 py-2 text-slate-700">{row.name}</td>
                                        <td className="px-4 py-2 text-slate-700">{row.parameter}</td>
                                        <td className="px-4 py-2 text-slate-700">{row.status}</td>
                                        <td className="px-4 py-2 text-slate-700">{row.timestamp}</td>
                                        <td className="px-4 py-2 text-right text-slate-800 font-mono">{row.v1max}</td>
                                        <td className="px-4 py-2 text-right text-slate-800 font-mono">{row.v2max}</td>
                                        <td className="px-4 py-2 text-right text-slate-800 font-mono">{row.v3max}</td>
                                        <td className="px-4 py-2 text-right text-slate-800 font-mono">{row.v1min}</td>
                                        <td className="px-4 py-2 text-right text-slate-800 font-mono">{row.v2min}</td>
                                        <td className="px-4 py-2 text-right text-slate-800 font-mono">{row.v3min}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Weekly Data Tab */}
                  {verificationTab === 'weekly' && (
                    <div className="grid grid-cols-[300px,1fr] gap-6">
                      {/* Left Panel - Filters */}
                      <div className="space-y-6 bg-slate-50 p-4 rounded-lg">
                        <div>
                          <h3 className="text-sm font-bold text-slate-700 mb-3 bg-blue-100 px-3 py-2 rounded">
                            1. Select meter(s) from the list:
                          </h3>
                          <div className="bg-white rounded-lg border border-cyan-300 p-4">
                            <h4 className="text-sm font-semibold text-cyan-700 mb-3">Available List</h4>
                            <div className="space-y-2">
                              <h5 className="text-sm font-semibold text-slate-700">Voltage Level:</h5>
                              {['400KV', '132KV', '33KV', '11KV', '380V'].map((level) => (
                                <label key={level} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="radio"
                                    name="weeklyVoltageLevel"
                                    value={level}
                                    checked={weeklyVoltageLevel === level}
                                    onChange={(e) => setWeeklyVoltageLevel(e.target.value)}
                                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-2 focus:ring-blue-500"
                                  />
                                  <span className="text-slate-700">{level}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-slate-700 mb-3 bg-blue-100 px-3 py-2 rounded">
                            2. Select parameter:
                          </h3>
                          <select
                            value={weeklyParameter}
                            onChange={(e) => setWeeklyParameter(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                          >
                            <option>Voltage THD</option>
                            <option>5th Harmonics</option>
                            <option>7th Harmonics</option>
                          </select>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-slate-700 mb-3 bg-blue-100 px-3 py-2 rounded">
                            3. Set time range: (Max. of 1 year)
                          </h3>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">From:</label>
                              <div className="flex gap-1">
                                <input
                                  type="date"
                                  value={weeklyDateRange.startDate}
                                  onChange={(e) => setWeeklyDateRange({...weeklyDateRange, startDate: e.target.value})}
                                  className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <input
                                  type="number"
                                  value={weeklyDateRange.startHour}
                                  disabled
                                  className="w-12 px-1 py-1.5 text-sm border border-slate-300 rounded outline-none text-center bg-slate-100 text-slate-400 cursor-not-allowed"
                                />
                                <span className="self-center text-slate-400">:</span>
                                <input
                                  type="number"
                                  value="00"
                                  disabled
                                  className="w-12 px-1 py-1.5 text-sm border border-slate-300 rounded outline-none text-center bg-slate-100 text-slate-400 cursor-not-allowed"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">To:</label>
                              <div className="flex gap-1">
                                <input
                                  type="date"
                                  value={weeklyDateRange.endDate}
                                  onChange={(e) => setWeeklyDateRange({...weeklyDateRange, endDate: e.target.value})}
                                  className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <input
                                  type="number"
                                  value={weeklyDateRange.endHour}
                                  disabled
                                  className="w-12 px-1 py-1.5 text-sm border border-slate-300 rounded outline-none text-center bg-slate-100 text-slate-400 cursor-not-allowed"
                                />
                                <span className="self-center text-slate-400">:</span>
                                <input
                                  type="number"
                                  value="59"
                                  disabled
                                  className="w-12 px-1 py-1.5 text-sm border border-slate-300 rounded outline-none text-center bg-slate-100 text-slate-400 cursor-not-allowed"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={handleGetWeeklyData}
                          className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                        >
                          Get Weekly Data
                        </button>

                        {weeklyShowResults && (
                          <button
                            onClick={handleClearWeeklyData}
                            className="w-full mt-3 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-all"
                          >
                            Clear Results
                          </button>
                        )}
                      </div>

                      {/* Right Panel - Results */}
                      <div>
                        {weeklyShowResults && weeklyData.length > 0 && (
                          <div>
                            <div className="flex justify-end mb-3">
                              <button
                                onClick={() => handleExportVerificationCSV(weeklyData, 'weekly')}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold text-sm flex items-center gap-2"
                              >
                                <Download className="w-4 h-4" />
                                Export CSV
                              </button>
                            </div>
                            <div className="border border-slate-300 rounded-lg overflow-hidden">
                              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gradient-to-r from-slate-900 to-slate-800 text-white sticky top-0">
                                    <tr>
                                      <th className="px-4 py-3 text-left font-semibold">Name</th>
                                      <th className="px-4 py-3 text-left font-semibold">Parameter</th>
                                      <th className="px-4 py-3 text-left font-semibold">status</th>
                                      <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                                      <th className="px-4 py-3 text-right font-semibold">L1</th>
                                      <th className="px-4 py-3 text-right font-semibold">L2</th>
                                      <th className="px-4 py-3 text-right font-semibold">L3</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white">
                                    {weeklyData.map((row, idx) => (
                                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                                        <td className="px-4 py-2 text-slate-700">{row.name}</td>
                                        <td className="px-4 py-2 text-slate-700">{row.parameter}</td>
                                        <td className="px-4 py-2 text-slate-700">{row.status}</td>
                                        <td className="px-4 py-2 text-slate-700">{row.timestamp}</td>
                                        <td className="px-4 py-2 text-right text-slate-800 font-mono">{row.l1}</td>
                                        <td className="px-4 py-2 text-right text-slate-800 font-mono">{row.l2}</td>
                                        <td className="px-4 py-2 text-right text-slate-800 font-mono">{row.l3}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'meter_communication' && (
            <div className="space-y-6">
              {/* Filters Section */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Availability Report Filters</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Selection Type */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      <Filter className="w-4 h-4 inline mr-1" />
                      Select Meter/s:
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'all', label: 'All' },
                        { value: 'meter', label: 'By Meter' },
                        { value: 'level', label: 'By Level' },
                        { value: 'substation', label: 'By Substation' },
                        { value: 'others', label: 'Others' }
                      ].map(option => (
                        <label key={option.value} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-300 hover:bg-slate-50 cursor-pointer transition-all">
                          <input
                            type="radio"
                            name="commSelection"
                            value={option.value}
                            checked={commSelectionType === option.value}
                            onChange={(e) => setCommSelectionType(e.target.value as any)}
                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Date/Time Range */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Time Range:
                    </label>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">From:</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={commDateRange.startDate}
                            onChange={(e) => setCommDateRange({ ...commDateRange, startDate: e.target.value })}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                          <select
                            value={commDateRange.startHour}
                            onChange={(e) => setCommDateRange({ ...commDateRange, startHour: e.target.value })}
                            className="w-20 px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          >
                            {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(hour => (
                              <option key={hour} value={hour}>{hour}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-600 mb-1">To:</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={commDateRange.endDate}
                            onChange={(e) => setCommDateRange({ ...commDateRange, endDate: e.target.value })}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                          <select
                            value={commDateRange.endHour}
                            onChange={(e) => setCommDateRange({ ...commDateRange, endHour: e.target.value })}
                            className="w-20 px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          >
                            {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(hour => (
                              <option key={hour} value={hour}>{hour}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleGetAvailabilityReport}
                    disabled={commLoading}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {commLoading ? 'Loading...' : 'Get Availability Report'}
                  </button>
                  {commShowReport && (
                    <button
                      onClick={() => {
                        setCommShowReport(false);
                        setCommReportData([]);
                        setCommSearchQuery('');
                        setCommFilterLessThan100(false);
                      }}
                      className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-all text-sm"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Results Section */}
              {commShowReport && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Summary Statistics - Left Panel */}
                  <div className="lg:col-span-1 space-y-4">
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 p-4">
                      <h3 className="text-sm font-semibold text-slate-700 mb-1">From:</h3>
                      <p className="text-base font-bold text-slate-900">
                        {commDateRange.startDate}
                      </p>
                      <p className="text-sm text-slate-600">{commDateRange.startHour}:00</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 p-4">
                      <h3 className="text-sm font-semibold text-slate-700 mb-1">To:</h3>
                      <p className="text-base font-bold text-slate-900">
                        {commDateRange.endDate}
                      </p>
                      <p className="text-sm text-slate-600">{commDateRange.endHour}:59</p>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                      <h3 className="text-xs font-semibold text-slate-600 mb-2">Total Sites</h3>
                      <p className="text-3xl font-bold text-slate-900">{commSummaryStats().totalSites}</p>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                      <h3 className="text-xs font-semibold text-slate-600 mb-2">Expected Count</h3>
                      <p className="text-3xl font-bold text-slate-900">{commSummaryStats().expectedCount}</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 p-4">
                      <h3 className="text-xs font-semibold text-slate-600 mb-2">Total Availability</h3>
                      <p className="text-3xl font-bold text-green-600">{commSummaryStats().totalAvailability}%</p>
                    </div>
                  </div>

                  {/* Data Table - Right Panel */}
                  <div className="lg:col-span-3">
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      {/* Action Bar */}
                      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              value={commSearchQuery}
                              onChange={(e) => setCommSearchQuery(e.target.value)}
                              placeholder="Search by SiteID or Name..."
                              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                          </div>
                          <button
                            onClick={() => setCommFilterLessThan100(!commFilterLessThan100)}
                            className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                              commFilterLessThan100
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <AlertCircle className="w-4 h-4" />
                            &lt;100%
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleCommCopy}
                            className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-all text-sm flex items-center gap-2"
                          >
                            <Copy className="w-4 h-4" />
                            Copy
                          </button>
                          <button
                            onClick={handleCommExportCSV}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            CSV
                          </button>
                        </div>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
                        <table className="w-full">
                          <thead className="bg-gradient-to-r from-slate-900 to-slate-800 text-white sticky top-0">
                            <tr>
                              <th 
                                onClick={() => handleCommSort('siteId')}
                                className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700"
                              >
                                SiteID {commSortColumn === 'siteId' && (commSortDirection === 'asc' ? '↑' : '↓')}
                              </th>
                              <th 
                                onClick={() => handleCommSort('meterId')}
                                className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700"
                              >
                                Name {commSortColumn === 'meterId' && (commSortDirection === 'asc' ? '↑' : '↓')}
                              </th>
                              <th 
                                onClick={() => handleCommSort('count')}
                                className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-slate-700"
                              >
                                Count {commSortColumn === 'count' && (commSortDirection === 'asc' ? '↑' : '↓')}
                              </th>
                              <th 
                                onClick={() => handleCommSort('availability')}
                                className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-slate-700"
                              >
                                Availability (%) {commSortColumn === 'availability' && (commSortDirection === 'asc' ? '↑' : '↓')}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {getFilteredCommData().length > 0 ? (
                              getFilteredCommData().map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-3 text-sm text-slate-700">{row.siteId}</td>
                                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.meterId}</td>
                                  <td className="px-4 py-3 text-sm text-right text-slate-700">{row.count}</td>
                                  <td className="px-4 py-3 text-sm text-right">
                                    <span className={`inline-flex items-center gap-1 font-semibold ${
                                      row.availability === 100 ? 'text-green-600' : 
                                      row.availability >= 90 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      {row.availability === 100 && <CheckCircle className="w-4 h-4" />}
                                      {row.availability < 100 && <AlertCircle className="w-4 h-4" />}
                                      {row.availability.toFixed(2)}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                                  No data available
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PQ Service Log Modal */}
      {showServiceLogModal && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCheck className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">PQ Service Logs</h2>
                  <p className="text-sm opacity-90">Event ID: {mockSummaryData.find(e => e.id === selectedEventId)?.eventId}</p>
                </div>
              </div>
              <button
                onClick={() => setShowServiceLogModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {serviceLogs.length > 0 ? (
                <div className="space-y-3">
                  {serviceLogs.map((log) => (
                    <div key={log.id}>
                      {editingLogId === log.id ? (
                        /* Edit Form for This Log */
                        <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
                          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <Edit2 className="w-5 h-5 text-yellow-600" />
                            Edit Service Log: {log.id}
                          </h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                              <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Impacted Customer <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={newLog.customerName}
                                onChange={(e) => setNewLog({ ...newLog, customerName: e.target.value })}
                                placeholder="Enter customer name or ID"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Technician <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={newLog.technician}
                                onChange={(e) => setNewLog({ ...newLog, technician: e.target.value })}
                                placeholder="Enter technician name"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                              <select
                                value={newLog.status}
                                onChange={(e) => setNewLog({ ...newLog, status: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              >
                                <option>Open</option>
                                <option>In Progress</option>
                                <option>Completed</option>
                              </select>
                            </div>
                            <div className="col-span-2">
                              <label className="block text-sm font-semibold text-slate-700 mb-1">Action</label>
                              <input
                                type="text"
                                value={newLog.action}
                                onChange={(e) => setNewLog({ ...newLog, action: e.target.value })}
                                placeholder="Enter action taken"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Description <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={newLog.description}
                                onChange={(e) => setNewLog({ ...newLog, description: e.target.value })}
                                placeholder="Enter detailed description"
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={handleSaveEditedLog}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-semibold flex items-center gap-2"
                            >
                              <Save className="w-4 h-4" />
                              Save Changes
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all text-sm font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Display Log */
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-blue-300 transition-all">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold text-slate-500">{log.id}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  log.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                  log.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                  'bg-orange-100 text-orange-700'
                                }`}>
                                  {log.status}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-blue-700 mb-2 bg-blue-50 px-2 py-1 rounded inline-block">
                                Customer: {log.customerName}
                              </p>
                              <p className="text-sm text-slate-600 mb-1">
                                <span className="font-semibold">Date:</span> {log.date}
                              </p>
                              <p className="text-sm text-slate-600 mb-1">
                                <span className="font-semibold">Technician:</span> {log.technician}
                              </p>
                              <p className="text-sm text-slate-600 mb-1">
                                <span className="font-semibold">Action:</span> {log.action}
                              </p>
                              <p className="text-sm text-slate-700 mt-2">
                                <span className="font-semibold">Description:</span> {log.description}
                              </p>
                            </div>
                            <button 
                              onClick={() => handleEditLog(log)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              disabled={isEditingLog}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg p-8 text-center border-2 border-dashed border-slate-300">
                  <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 mb-4">No service logs available for this event</p>
                </div>
              )}

              {/* Add New Log Form */}
              {isEditingLog && !editingLogId ? (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-600" />
                    Add New Service Log
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Impacted Customer <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newLog.customerName}
                        onChange={(e) => setNewLog({ ...newLog, customerName: e.target.value })}
                        placeholder="Enter customer name or ID"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Technician <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newLog.technician}
                        onChange={(e) => setNewLog({ ...newLog, technician: e.target.value })}
                        placeholder="Enter technician name"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                      <select
                        value={newLog.status}
                        onChange={(e) => setNewLog({ ...newLog, status: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option>Open</option>
                        <option>In Progress</option>
                        <option>Completed</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Action</label>
                      <input
                        type="text"
                        value={newLog.action}
                        onChange={(e) => setNewLog({ ...newLog, action: e.target.value })}
                        placeholder="Enter action taken"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={newLog.description}
                        onChange={(e) => setNewLog({ ...newLog, description: e.target.value })}
                        placeholder="Enter detailed description"
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleAddNewLog}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-semibold flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save Log
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all text-sm font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : !editingLogId && (
                <button
                  onClick={() => {
                    setIsEditingLog(true);
                    setEditingLogId(null);
                  }}
                  className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Add New Service Log
                </button>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowServiceLogModal(false)}
                className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-all font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add/Edit Standard Modal */}
      {showAddStandardModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Target className="w-6 h-6" />
                    {editingStandard ? 'Edit Standard' : 'Add New Standard'}
                  </h3>
                  <p className="text-blue-100 text-sm mt-1">
                    {editingStandard ? 'Update standard parameters' : 'Define a new voltage standard'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAddStandardModal(false);
                    setEditingStandard(null);
                    setNewStandard({
                      standard: '',
                      version: '',
                      category: '',
                      parameter: '',
                      level: '',
                      min: '',
                      max: '',
                      unit: '',
                      remarks: ''
                    });
                  }}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Standard *
                  </label>
                  <input
                    type="text"
                    value={newStandard.standard}
                    onChange={(e) => setNewStandard({ ...newStandard, standard: e.target.value })}
                    placeholder="e.g., CLP Supply Rules"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Version *
                  </label>
                  <input
                    type="text"
                    value={newStandard.version}
                    onChange={(e) => setNewStandard({ ...newStandard, version: e.target.value })}
                    placeholder="e.g., 2001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Category *
                  </label>
                  <input
                    type="text"
                    value={newStandard.category}
                    onChange={(e) => setNewStandard({ ...newStandard, category: e.target.value })}
                    placeholder="e.g., Harmonics (Voltage)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Parameter *
                  </label>
                  <input
                    type="text"
                    value={newStandard.parameter}
                    onChange={(e) => setNewStandard({ ...newStandard, parameter: e.target.value })}
                    placeholder="e.g., 5th Harmonics"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Voltage Level
                  </label>
                  <input
                    type="text"
                    value={newStandard.level}
                    onChange={(e) => setNewStandard({ ...newStandard, level: e.target.value })}
                    placeholder="e.g., 11kV"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={newStandard.unit}
                    onChange={(e) => setNewStandard({ ...newStandard, unit: e.target.value })}
                    placeholder="e.g., %"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Minimum Value
                  </label>
                  <input
                    type="text"
                    value={newStandard.min}
                    onChange={(e) => setNewStandard({ ...newStandard, min: e.target.value })}
                    placeholder="e.g., 0.0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Maximum Value
                  </label>
                  <input
                    type="text"
                    value={newStandard.max}
                    onChange={(e) => setNewStandard({ ...newStandard, max: e.target.value })}
                    placeholder="e.g., 5.0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Remarks
                </label>
                <textarea
                  value={newStandard.remarks}
                  onChange={(e) => setNewStandard({ ...newStandard, remarks: e.target.value })}
                  placeholder="Additional notes or context..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={handleAddStandard}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm"
                >
                  {editingStandard ? 'Update Standard' : 'Add Standard'}
                </button>
                <button
                  onClick={() => {
                    setShowAddStandardModal(false);
                    setEditingStandard(null);
                    setNewStandard({
                      standard: '',
                      version: '',
                      category: '',
                      parameter: '',
                      level: '',
                      min: '',
                      max: '',
                      unit: '',
                      remarks: ''
                    });
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-all text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Affected Customers Modal */}
      {showAffectedCustomersModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    Affected Customers
                  </h3>
                  <p className="text-blue-100 text-sm mt-1">
                    Event ID: EVT-2025-{String(selectedEventId).padStart(3, '0')} • {selectedAffectedCustomers.length} Customer(s)
                  </p>
                </div>
                <button
                  onClick={() => setShowAffectedCustomersModal(false)}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {selectedAffectedCustomers.length > 0 ? (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-100 border-b-2 border-slate-300">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Customer ID</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Customer Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Account Number</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Address</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Contact Person</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Phone</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Impact Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedAffectedCustomers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-blue-600">{customer.id}</td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{customer.name}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{customer.accountNumber}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{customer.address}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{customer.contactPerson}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{customer.phone}</td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              customer.impactLevel === 'Critical' ? 'bg-red-100 text-red-700' :
                              customer.impactLevel === 'High' ? 'bg-orange-100 text-orange-700' :
                              customer.impactLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {customer.impactLevel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg p-8 text-center border-2 border-dashed border-slate-300">
                  <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No affected customers found</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowAffectedCustomersModal(false)}
                className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-all font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Save Profile Modal */}
      {showSaveProfileModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Save className="w-6 h-6" />
                    Save Profile
                  </h3>
                  <p className="text-blue-100 text-sm mt-1">
                    {editingProfileId ? 'Update profile name' : 'Give your profile a name'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowSaveProfileModal(false);
                    setNewProfileName('');
                    setEditingProfileId(null);
                  }}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Profile Name
                </label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="e.g., 400KV January Analysis"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Profile Settings:</h4>
                <div className="space-y-1 text-sm text-slate-600">
                  <p>• Data Type: {profileDataType === 'voltage' ? 'Voltage' : 'Current'} ({profileValueType === 'average' ? 'Daily Average' : 'Raw Data'})</p>
                  <p>• Voltage Level: {profileVoltageLevel}</p>
                  <p>• Selected Meters: {profileSelectedMeters.length}</p>
                  <p>• Parameters: {profileParameters.join(', ')}</p>
                  <p>• Date Range: {profileDateRange.start} to {profileDateRange.end}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowSaveProfileModal(false);
                  setNewProfileName('');
                  setEditingProfileId(null);
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={!newProfileName.trim()}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingProfileId ? 'Update Profile' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Load Profile Modal */}
      {showLoadProfileModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <FileCheck className="w-6 h-6" />
                    Saved Profiles
                  </h3>
                  <p className="text-blue-100 text-sm mt-1">
                    Load, edit, or delete your saved profiles
                  </p>
                </div>
                <button
                  onClick={() => setShowLoadProfileModal(false)}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {savedProfiles.length === 0 ? (
                <div className="bg-slate-50 rounded-lg p-8 text-center border-2 border-dashed border-slate-300">
                  <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No saved profiles yet</p>
                  <p className="text-slate-400 text-sm mt-2">Create a profile configuration and save it for future use</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-slate-900 mb-2">{profile.name}</h4>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600">
                            <p><span className="font-semibold">Data Type:</span> {profile.dataType === 'voltage' ? 'Voltage' : 'Current'}</p>
                            <p><span className="font-semibold">Value Type:</span> {profile.valueType === 'average' ? 'Daily Average' : 'Raw Data'}</p>
                            <p><span className="font-semibold">Voltage Level:</span> {profile.voltageLevel}</p>
                            <p><span className="font-semibold">Meters:</span> {profile.selectedMeters.length} selected</p>
                            <p><span className="font-semibold">Parameters:</span> {profile.parameters.join(', ')}</p>
                            <p><span className="font-semibold">Date Range:</span> {profile.dateRange.start} to {profile.dateRange.end}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleLoadProfile(profile.id)}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleEditProfile(profile.id)}
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all font-semibold text-sm"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProfile(profile.id)}
                            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all font-semibold text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowLoadProfileModal(false)}
                className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-all font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Save PQ Summary Profile Modal */}
      {showSavePqProfileModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Save className="w-6 h-6" />
                    Save Filter Profile
                  </h3>
                  <p className="text-blue-100 text-sm mt-1">
                    {editingPqProfileId ? 'Update profile name' : 'Give your filter settings a name'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowSavePqProfileModal(false);
                    setNewPqProfileName('');
                    setEditingPqProfileId(null);
                  }}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Profile Name
                </label>
                <input
                  type="text"
                  value={newPqProfileName}
                  onChange={(e) => setNewPqProfileName(e.target.value)}
                  placeholder="e.g., High Severity Events - Q4 2025"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Current Filter Settings:</h4>
                <div className="space-y-1 text-sm text-slate-600">
                  <p>• Date Range: {dateRange.start} to {dateRange.end}</p>
                  <p>• Event Types:</p>
                  <ul className="ml-4 space-y-0.5">
                    <li>{showHarmonicEvents ? '✓' : '✗'} Harmonic Events</li>
                    <li>{showVoltageEvents ? '✓' : '✗'} Voltage Events</li>
                    <li>{showInterruptions ? '✓' : '✗'} Interruptions</li>
                  </ul>
                  {searchQuery && <p>• Search Query: "{searchQuery}"</p>}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowSavePqProfileModal(false);
                  setNewPqProfileName('');
                  setEditingPqProfileId(null);
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePqProfile}
                disabled={!newPqProfileName.trim()}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingPqProfileId ? 'Update Profile' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Load PQ Summary Profile Modal */}
      {showLoadPqProfileModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <FileCheck className="w-6 h-6" />
                    Saved Filter Profiles
                  </h3>
                  <p className="text-blue-100 text-sm mt-1">
                    Load, edit, or delete your saved filter profiles
                  </p>
                </div>
                <button
                  onClick={() => setShowLoadPqProfileModal(false)}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {pqSummaryProfiles.length === 0 ? (
                <div className="bg-slate-50 rounded-lg p-8 text-center border-2 border-dashed border-slate-300">
                  <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No saved filter profiles yet</p>
                  <p className="text-slate-400 text-sm mt-2">Save your current filter settings for quick access later</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pqSummaryProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-slate-900 mb-2">{profile.name}</h4>
                          <div className="space-y-1 text-sm text-slate-600">
                            <p><span className="font-semibold">Date Range:</span> {profile.dateRange.start} to {profile.dateRange.end}</p>
                            <p><span className="font-semibold">Event Types:</span> 
                              {profile.showHarmonicEvents && ' Harmonic'}
                              {profile.showVoltageEvents && ' Voltage'}
                              {profile.showInterruptions && ' Interruptions'}
                            </p>
                            {profile.searchQuery && <p><span className="font-semibold">Search:</span> "{profile.searchQuery}"</p>}
                            <p className="text-xs text-slate-400 mt-2">Created: {new Date(profile.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleLoadPqProfile(profile.id)}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleEditPqProfile(profile.id)}
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all font-semibold text-sm"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePqProfile(profile.id)}
                            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all font-semibold text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowLoadPqProfileModal(false)}
                className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-all font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
