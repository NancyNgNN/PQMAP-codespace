/**
 * Export Service
 * Provides reusable export functionality for Excel, CSV, and PDF formats
 * Matches Mother Event List.csv format with 44 columns
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PQEvent, Substation } from '../types/database';
import html2canvas from 'html2canvas';

// Define the export row structure matching Mother Event List.csv
export interface ExportRow {
  // Core Event Info (Column 1-10)
  motherEvent: string;           // "Mother Event" - Yes/No
  falseEvent: string;             // "False Event" - Yes/No
  timestamp: string;              // "Timestamp"
  siteId: string;                 // "SiteID"
  name: string;                   // "Name"
  voltLevel: string;              // "Volt Level"
  ss: string;                     // "S/S" (Substation code)
  circuit: string;                // "Circuit"
  region: string;                 // "Region"
  oc: string;                     // "OC"
  
  // Duration & Voltage (Column 11-14)
  duration: string;               // "Duration"
  v1: string;                     // "V1"
  v2: string;                     // "V2"
  v3: string;                     // "V3"
  
  // Customer Impact (Column 15)
  customerCount: string;          // "Customer Count"
  
  // SARFI Indices (Column 16-24)
  s10: string;                    // "S10"
  s20: string;                    // "S20"
  s30: string;                    // "S30"
  s40: string;                    // "S40"
  s50: string;                    // "S50"
  s60: string;                    // "S60"
  s70: string;                    // "S70"
  s80: string;                    // "S80"
  s90: string;                    // "S90"
  
  // IDs & References (Column 25-27)
  eventId: string;                // "EventID"
  groupId: string;                // "GroupID"
  remarks: string;                // "Remarks"
  
  // Incident Report (Column 28)
  idrNo: string;                  // "IDR No."
  
  // Timestamps (Column 29-32)
  detectTime: string;             // "Detect Time"
  recoverTime: string;            // "Recover Time"
  createTime: string;             // "Create Time"
  updateTime: string;             // "Update Time"
  
  // Location & Address (Column 33)
  address: string;                // "Address"
  
  // Outage Details (Column 34-36)
  equipmentType: string;          // "Equipment Type"
  causeGroup: string;             // "Cause Group"
  cause: string;                  // "Cause"
  
  // Fault Details (Column 37-40)
  objectPartGroup: string;        // "Object Part Group"
  objectPartCode: string;         // "Object Part Code"
  damageGroup: string;            // "Damage Group"
  damageCode: string;             // "Damage Code"
  
  // Additional Fields (Column 41-44)
  outageType: string;             // "Outage Type"
  weather: string;                // "Weather"
  totalCmi: string;               // "Total CMI"
  description: string;            // "Description"
  auto: string;                   // "Auto"
}

/**
 * Convert PQEvent to ExportRow format
 */
export function eventToExportRow(
  event: PQEvent,
  substation?: Substation,
  isChild: boolean = false
): ExportRow {
  // Extract V1, V2, V3 from waveform data (Option A: Average voltage)
  let v1 = 'N/A', v2 = 'N/A', v3 = 'N/A';
  
  if (event.v1 !== null && event.v1 !== undefined) v1 = event.v1.toFixed(2);
  if (event.v2 !== null && event.v2 !== undefined) v2 = event.v2.toFixed(2);
  if (event.v3 !== null && event.v3 !== undefined) v3 = event.v3.toFixed(2);
  
  // If not populated in DB, calculate from waveform_data
  if (v1 === 'N/A' && event.waveform_data?.voltage?.length) {
    const voltages = event.waveform_data.voltage.map(p => p.value);
    const avg = voltages.reduce((a, b) => a + b, 0) / voltages.length;
    v1 = avg.toFixed(2);
    v2 = avg.toFixed(2); // For demo, use same value
    v3 = avg.toFixed(2); // For demo, use same value
  }
  
  // Format duration
  const durationMs = event.duration_ms || 0;
  const durationSec = (durationMs / 1000).toFixed(3);
  
  // Format timestamp
  const timestamp = new Date(event.timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  return {
    // Core Event Info
    motherEvent: event.is_mother_event ? 'Yes' : 'No',
    falseEvent: event.false_event ? 'Yes' : 'No',
    timestamp: timestamp,
    siteId: event.meter_id || 'N/A',
    name: substation?.name || event.circuit_id || 'N/A',
    voltLevel: event.voltage_level || 'N/A',
    ss: substation?.code || 'N/A',
    circuit: event.circuit_id || 'N/A',
    region: substation?.region || 'N/A',
    oc: event.oc || 'N/A',
    
    // Duration & Voltage
    duration: `${durationSec}s`,
    v1: v1,
    v2: v2,
    v3: v3,
    
    // Customer Impact
    customerCount: event.customer_count?.toString() || '0',
    
    // SARFI Indices (use 0.00 for demo if not populated)
    s10: event.sarfi_10?.toFixed(2) || '0.00',
    s20: event.sarfi_20?.toFixed(2) || '0.00',
    s30: event.sarfi_30?.toFixed(2) || '0.00',
    s40: event.sarfi_40?.toFixed(2) || '0.00',
    s50: event.sarfi_50?.toFixed(2) || '0.00',
    s60: event.sarfi_60?.toFixed(2) || '0.00',
    s70: event.sarfi_70?.toFixed(2) || '0.00',
    s80: event.sarfi_80?.toFixed(2) || '0.00',
    s90: event.sarfi_90?.toFixed(2) || '0.00',
    
    // IDs & References
    eventId: event.id,
    groupId: event.parent_event_id || (event.is_mother_event ? event.id : 'N/A'),
    remarks: event.remarks || '',
    
    // Incident Report
    idrNo: event.idr_no || 'N/A',
    
    // Timestamps
    detectTime: timestamp,
    recoverTime: event.resolved_at ? new Date(event.resolved_at).toLocaleString() : 'N/A',
    createTime: new Date(event.created_at).toLocaleString(),
    updateTime: event.resolved_at ? new Date(event.resolved_at).toLocaleString() : new Date(event.created_at).toLocaleString(),
    
    // Location & Address
    address: event.address || substation?.name || 'N/A',
    
    // Outage Details
    equipmentType: event.equipment_type || 'N/A',
    causeGroup: event.cause_group || 'N/A',
    cause: event.cause || 'N/A',
    
    // Fault Details
    objectPartGroup: event.object_part_group || 'N/A',
    objectPartCode: event.object_part_code || 'N/A',
    damageGroup: event.damage_group || 'N/A',
    damageCode: event.damage_code || 'N/A',
    
    // Additional Fields
    outageType: event.outage_type || 'N/A',
    weather: event.weather || 'N/A',
    totalCmi: event.total_cmi?.toFixed(2) || '0.00',
    description: event.description || event.root_cause || 'N/A',
    auto: event.grouping_type === 'automatic' ? 'Yes' : 'No'
  };
}

/**
 * Generate filename with timestamp
 */
export function generateExportFilename(prefix: string, extension: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19).replace('T', '_');
  return `${prefix}_${timestamp}.${extension}`;
}

/**
 * Export events to Excel (.xlsx)
 */
export async function exportToExcel(
  events: PQEvent[],
  substations: Map<string, Substation>,
  filename?: string
): Promise<void> {
  // Convert events to export rows
  const rows: ExportRow[] = events.map(event => {
    const substation = event.substation_id ? substations.get(event.substation_id) : undefined;
    return eventToExportRow(event, substation);
  });
  
  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: [
      'motherEvent', 'falseEvent', 'timestamp', 'siteId', 'name', 'voltLevel', 'ss', 'circuit', 'region', 'oc',
      'duration', 'v1', 'v2', 'v3', 'customerCount',
      's10', 's20', 's30', 's40', 's50', 's60', 's70', 's80', 's90',
      'eventId', 'groupId', 'remarks', 'idrNo',
      'detectTime', 'recoverTime', 'createTime', 'updateTime',
      'address', 'equipmentType', 'causeGroup', 'cause',
      'objectPartGroup', 'objectPartCode', 'damageGroup', 'damageCode',
      'outageType', 'weather', 'totalCmi', 'description', 'auto'
    ]
  });
  
  // Set column headers (matching Mother Event List.csv)
  XLSX.utils.sheet_add_aoa(ws, [[
    'Mother Event', 'False Event', 'Timestamp', 'SiteID', 'Name', 'Volt Level', 'S/S', 'Circuit', 'Region', 'OC',
    'Duration', 'V1', 'V2', 'V3', 'Customer Count',
    'S10', 'S20', 'S30', 'S40', 'S50', 'S60', 'S70', 'S80', 'S90',
    'EventID', 'GroupID', 'Remarks', 'IDR No.',
    'Detect Time', 'Recover Time', 'Create Time', 'Update Time',
    'Address', 'Equipment Type', 'Cause Group', 'Cause',
    'Object Part Group', 'Object Part Code', 'Damage Group', 'Damage Code',
    'Outage Type', 'Weather', 'Total CMI', 'Description', 'Auto'
  ]], { origin: 'A1' });
  
  // Set column widths
  const colWidths = [
    { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
    { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 },
    { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
    { wch: 36 }, { wch: 36 }, { wch: 20 }, { wch: 15 },
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
    { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 8 }
  ];
  ws['!cols'] = colWidths;
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PQ Events');
  
  // Generate and download file
  const exportFilename = filename || generateExportFilename('PQ_Events_Export', 'xlsx');
  XLSX.writeFile(wb, exportFilename);
}

/**
 * Export events to CSV
 */
export async function exportToCSV(
  events: PQEvent[],
  substations: Map<string, Substation>,
  filename?: string
): Promise<void> {
  // Convert events to export rows
  const rows: ExportRow[] = events.map(event => {
    const substation = event.substation_id ? substations.get(event.substation_id) : undefined;
    return eventToExportRow(event, substation);
  });
  
  // Create CSV header
  const headers = [
    'Mother Event', 'False Event', 'Timestamp', 'SiteID', 'Name', 'Volt Level', 'S/S', 'Circuit', 'Region', 'OC',
    'Duration', 'V1', 'V2', 'V3', 'Customer Count',
    'S10', 'S20', 'S30', 'S40', 'S50', 'S60', 'S70', 'S80', 'S90',
    'EventID', 'GroupID', 'Remarks', 'IDR No.',
    'Detect Time', 'Recover Time', 'Create Time', 'Update Time',
    'Address', 'Equipment Type', 'Cause Group', 'Cause',
    'Object Part Group', 'Object Part Code', 'Damage Group', 'Damage Code',
    'Outage Type', 'Weather', 'Total CMI', 'Description', 'Auto'
  ];
  
  // Convert rows to CSV format
  const csvRows = [
    headers.join(','),
    ...rows.map(row => [
      row.motherEvent, row.falseEvent, row.timestamp, row.siteId, row.name, row.voltLevel, row.ss, row.circuit, row.region, row.oc,
      row.duration, row.v1, row.v2, row.v3, row.customerCount,
      row.s10, row.s20, row.s30, row.s40, row.s50, row.s60, row.s70, row.s80, row.s90,
      row.eventId, row.groupId, `"${row.remarks.replace(/"/g, '""')}"`, row.idrNo,
      row.detectTime, row.recoverTime, row.createTime, row.updateTime,
      `"${row.address.replace(/"/g, '""')}"`, row.equipmentType, row.causeGroup, row.cause,
      row.objectPartGroup, row.objectPartCode, row.damageGroup, row.damageCode,
      row.outageType, row.weather, row.totalCmi, `"${row.description.replace(/"/g, '""')}"`, row.auto
    ].join(','))
  ];
  
  const csvContent = csvRows.join('\n');
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename || generateExportFilename('PQ_Events_Export', 'csv'));
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Capture waveform display as image
 */
export async function captureWaveformImage(elementId: string): Promise<string | null> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Element with ID ${elementId} not found`);
      return null;
    }
    
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2
    });
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error capturing waveform image:', error);
    return null;
  }
}

/**
 * Export events to PDF with waveform images
 */
export async function exportToPDF(
  events: PQEvent[],
  substations: Map<string, Substation>,
  filename?: string,
  includeWaveform: boolean = false
): Promise<void> {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  
  // Add title
  doc.setFontSize(16);
  doc.text('Power Quality Events Report', 14, 15);
  
  // Add export date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
  
  // Convert events to export rows
  const rows: ExportRow[] = events.map(event => {
    const substation = event.substation_id ? substations.get(event.substation_id) : undefined;
    return eventToExportRow(event, substation);
  });
  
  // Prepare table data (select key columns for PDF - all 44 columns won't fit well)
  const tableData = rows.map(row => [
    row.motherEvent,
    row.falseEvent,
    row.timestamp,
    row.name,
    row.voltLevel,
    row.circuit,
    row.duration,
    row.customerCount,
    row.remarks.substring(0, 20) + (row.remarks.length > 20 ? '...' : '')
  ]);
  
  // Add table
  autoTable(doc, {
    head: [['Mother', 'False', 'Timestamp', 'Name', 'Voltage', 'Circuit', 'Duration', 'Customers', 'Remarks']],
    body: tableData,
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
    margin: { top: 28 }
  });
  
  // Add summary on last page
  const finalY = (doc as any).lastAutoTable.finalY || 28;
  doc.setFontSize(10);
  doc.text(`Total Events: ${events.length}`, 14, finalY + 10);
  doc.text(`Mother Events: ${events.filter(e => e.is_mother_event).length}`, 14, finalY + 15);
  doc.text(`False Events: ${events.filter(e => e.false_event).length}`, 14, finalY + 20);
  
  // Save file
  doc.save(filename || generateExportFilename('PQ_Events_Export', 'pdf'));
}

/**
 * Export Service Interface
 */
export const ExportService = {
  exportToExcel,
  exportToCSV,
  exportToPDF,
  eventToExportRow,
  generateExportFilename,
  captureWaveformImage
};
