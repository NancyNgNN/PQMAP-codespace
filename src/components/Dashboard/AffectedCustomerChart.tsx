import { useState, useEffect, useRef } from 'react';
import { Users, Settings2, Download, FileSpreadsheet, FileImage, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AffectedCustomerConfigModal, { AffectedCustomerFilters } from './AffectedCustomerConfigModal';
import AffectedCustomerProfileEditModal from './AffectedCustomerProfileEditModal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CustomerEventData {
  customer_id: string;
  account_number: string;
  customer_name: string;
  event_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface CustomerServiceData {
  customer_id: string;
  account_number: string;
  customer_name: string;
  service_count: number;
}

interface ServiceRecord {
  id: string;
  service_type: string;
  service_date: string;
  findings: string | null;
  recommendations: string | null;
  customer_account: string;
  customer_name: string;
}

interface CustomerEvent {
  account_number: string;
  customer_name: string;
  event_type: string;
  timestamp: string;
  duration_ms: number;
  severity: string;
  service_types?: string[];
}

export default function AffectedCustomerChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'events' | 'services'>('events');
  const [customerData, setCustomerData] = useState<CustomerEventData[]>([]);
  const [serviceData, setServiceData] = useState<CustomerServiceData[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerEventData | CustomerServiceData | null>(null);
  const [customerEvents, setCustomerEvents] = useState<CustomerEvent[]>([]);
  const [customerServices, setCustomerServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AffectedCustomerFilters | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 20;
  
  const [filters, setFilters] = useState<AffectedCustomerFilters>(() => {
    // Load saved filters from localStorage
    const saved = localStorage.getItem('affected_customer_filters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fall through to default
      }
    }
    // Default: Last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      excludeSpecialEvents: false,
    };
  });

  useEffect(() => {
    if (view === 'events') {
      loadCustomerData();
    } else {
      loadServiceData();
    }
  }, [filters, view]);

  useEffect(() => {
    localStorage.setItem('affected_customer_filters', JSON.stringify(filters));
  }, [filters]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportDropdown && !target.closest('.export-dropdown-container')) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportDropdown]);

  const loadServiceData = async () => {
    setLoading(true);
    console.log('🔄 Loading PQ service data with filters:', filters);
    
    try {
      // Query all pq_service_records with customer join
      const { data, error } = await supabase
        .from('pq_service_records')
        .select(`
          customer_id,
          service_type,
          service_date,
          customer:customers(account_number, name)
        `);

      if (error) {
        console.error('❌ Service data query error:', error);
        throw error;
      }

      console.log('✅ Service records loaded (before filtering):', data?.length || 0, 'records');
      
      // Filter by date range in memory
      let filteredData = data || [];
      if (filters.startDate && filters.endDate) {
        const filterStart = new Date(filters.startDate);
        const filterEnd = new Date(filters.endDate + 'T23:59:59');
        
        filteredData = data?.filter((record: any) => {
          if (!record.service_date) return false; // Exclude if no service date
          
          const serviceDate = new Date(record.service_date);
          
          // Service is within filter period if service date is between start and end
          return serviceDate >= filterStart && serviceDate <= filterEnd;
        }) || [];
        
        console.log('✅ After date filter:', filteredData.length, 'records');
      }

      console.log('✅ Final filtered records:', filteredData.length);

      // Aggregate data by customer
      const customerMap = new Map<string, CustomerServiceData>();

      filteredData.forEach((record: any) => {
        if (!record.customer) return;

        const customerId = record.customer_id;

        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customer_id: customerId,
            account_number: record.customer.account_number,
            customer_name: record.customer.name,
            service_count: 0,
          });
        }

        const customer = customerMap.get(customerId)!;
        customer.service_count += 1;
      });

      const customers = Array.from(customerMap.values());
      console.log('📊 Unique customers with services:', customers.length);

      // Sort by service count and take top 10
      customers.sort((a, b) => b.service_count - a.service_count);
      const top10 = customers.slice(0, 10);

      console.log('🔝 Top 10 customers (by service count):', top10.length);
      if (top10.length > 0) {
        console.log('📌 Top customer:', top10[0].account_number, 'with', top10[0].service_count, 'services');
      }

      setServiceData(top10);
    } catch (error) {
      console.error('❌ Error loading service data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerData = async () => {
    setLoading(true);
    console.log('🔄 Loading customer data (mother events only) with filters:', filters);
    
    try {
      // Query event_customer_impact with joins - filter for mother events only
      let query = supabase
        .from('event_customer_impact')
        .select(`
          customer_id,
          customer:customers(account_number, name),
          event:pq_events(id, timestamp, severity, is_special_event, is_mother_event)
        `)
        .eq('event.is_mother_event', true)
        .gte('event.timestamp', filters.startDate)
        .lte('event.timestamp', filters.endDate + 'T23:59:59');

      if (filters.excludeSpecialEvents) {
        query = query.or('event.is_special_event.is.null,event.is_special_event.eq.false');
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Customer data query error:', error);
        throw error;
      }

      console.log('✅ Mother event impacts loaded:', data?.length || 0, 'impacts');

      // Aggregate data by customer
      const customerMap = new Map<string, CustomerEventData>();

      data?.forEach((impact: any) => {
        if (!impact.customer || !impact.event) return;

        const customerId = impact.customer_id;
        const severity = impact.event.severity || 'low';

        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customer_id: customerId,
            account_number: impact.customer.account_number,
            customer_name: impact.customer.name,
            event_count: 0,
            critical_count: 0,
            high_count: 0,
            medium_count: 0,
            low_count: 0,
            severity: 'low',
          });
        }

        const customer = customerMap.get(customerId)!;
        customer.event_count += 1;

        switch (severity) {
          case 'critical':
            customer.critical_count += 1;
            break;
          case 'high':
            customer.high_count += 1;
            break;
          case 'medium':
            customer.medium_count += 1;
            break;
          case 'low':
            customer.low_count += 1;
            break;
        }
      });

      // Determine overall severity for each customer
      const customers = Array.from(customerMap.values()).map(c => ({
        ...c,
        severity: c.critical_count > 0 ? 'critical' as const
          : c.high_count > 0 ? 'high' as const
          : c.medium_count > 0 ? 'medium' as const
          : 'low' as const
      }));

      console.log('📊 Unique customers found:', customers.length);

      // Sort by event count and take top 10
      customers.sort((a, b) => b.event_count - a.event_count);
      const top10 = customers.slice(0, 10);

      console.log('🔝 Top 10 customers (by mother event count):', top10.length);
      if (top10.length > 0) {
        console.log('📌 Top customer:', top10[0].account_number, 'with', top10[0].event_count, 'mother events');
      }

      setCustomerData(top10);
    } catch (error) {
      console.error('❌ Error loading customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerEvents = async (customer: CustomerEventData) => {
    console.log('🔍 Loading mother events for customer:', customer.customer_id, customer.account_number);
    console.log('🔍 Date range:', filters.startDate, 'to', filters.endDate);
    
    try {
      const { data, error } = await supabase
        .from('event_customer_impact')
        .select(`
          event:pq_events(
            id,
            event_type,
            timestamp,
            duration_ms,
            severity,
            is_mother_event,
            pq_service_records!event_id(service_type)
          )
        `)
        .eq('customer_id', customer.customer_id)
        .eq('event.is_mother_event', true);

      if (error) {
        console.error('❌ Query error:', error);
        throw error;
      }

      console.log('✅ Raw query result:', data?.length || 0, 'mother event impacts found');
      
      if (data && data.length > 0) {
        console.log('📊 First impact:', data[0]);
      }

      // Filter by date range in JavaScript
      const startDateTime = new Date(filters.startDate + 'T00:00:00').getTime();
      const endDateTime = new Date(filters.endDate + 'T23:59:59').getTime();
      
      const events: CustomerEvent[] = data
        ?.filter((impact: any) => {
          if (!impact.event || !impact.event.timestamp) return false;
          const eventTime = new Date(impact.event.timestamp).getTime();
          return eventTime >= startDateTime && eventTime <= endDateTime;
        })
        .map((impact: any) => ({
          account_number: customer.account_number,
          customer_name: customer.customer_name,
          event_type: impact.event.event_type,
          timestamp: impact.event.timestamp,
          duration_ms: impact.event.duration_ms || 0,
          severity: impact.event.severity || 'low',
          service_types: impact.event.pq_service_records?.map((sr: any) => sr.service_type) || [],
        }))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || [];

      console.log('✅ Filtered mother events:', events.length, 'events in date range');
      
      if (events.length > 0) {
        console.log('📊 First mother event:', events[0]);
      }

      setCustomerEvents(events);
      setCurrentPage(1); // Reset to first page
    } catch (error) {
      console.error('❌ Error loading customer events:', error);
      setCustomerEvents([]);
    }
  };

  const loadCustomerServices = async (customer: CustomerServiceData) => {
    console.log('🔍 Loading services for customer:', customer.customer_id, customer.account_number);
    console.log('🔍 Date range:', filters.startDate, 'to', filters.endDate);
    
    try {
      const { data, error } = await supabase
        .from('pq_service_records')
        .select('id, service_type, service_date, findings, recommendations')
        .eq('customer_id', customer.customer_id);

      if (error) {
        console.error('❌ Query error:', error);
        throw error;
      }

      console.log('✅ All service records for customer:', data?.length || 0, 'services');
      
      // Filter by date range in memory
      let filteredData = data || [];
      if (filters.startDate && filters.endDate) {
        const filterStart = new Date(filters.startDate);
        const filterEnd = new Date(filters.endDate + 'T23:59:59');
        
        filteredData = data?.filter((record: any) => {
          if (!record.service_date) return false;
          
          const serviceDate = new Date(record.service_date);
          
          return serviceDate >= filterStart && serviceDate <= filterEnd;
        }) || [];
      }

      console.log('✅ Filtered service records:', filteredData.length, 'services');
      
      const services: ServiceRecord[] = filteredData.map((record: any) => ({
        id: record.id,
        service_type: record.service_type,
        service_date: record.service_date,
        findings: record.findings,
        recommendations: record.recommendations,
        customer_account: customer.account_number,
        customer_name: customer.customer_name,
      })).sort((a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime()) || [];

      setCustomerServices(services);
      setCurrentPage(1); // Reset to first page
    } catch (error) {
      console.error('❌ Error loading customer services:', error);
      setCustomerServices([]);
    }
  };

  const handleCustomerClick = (customer: CustomerEventData | CustomerServiceData) => {
    setSelectedCustomer(customer);
    if (view === 'events') {
      loadCustomerEvents(customer as CustomerEventData);
    } else {
      loadCustomerServices(customer as CustomerServiceData);
    }
  };

  const handleApplyFilters = (newFilters: AffectedCustomerFilters) => {
    setFilters(newFilters);
    setSelectedCustomer(null);
    setCustomerEvents([]);
    setCustomerServices([]);
  };

  const handleViewChange = (newView: 'events' | 'services') => {
    setView(newView);
    setSelectedCustomer(null);
    setCustomerEvents([]);
    setCustomerServices([]);
  };

  // Get severity color (for events view)
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 hover:bg-red-600';
      case 'high':
        return 'bg-orange-500 hover:bg-orange-600';
      case 'medium':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'low':
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-slate-500 hover:bg-slate-600';
    }
  };

  // Get count-based color (for services view)
  const getCountColor = (count: number, maxCount: number) => {
    const percentage = (count / maxCount) * 100;
    if (percentage >= 75) return 'bg-indigo-500 hover:bg-indigo-600';
    if (percentage >= 50) return 'bg-blue-500 hover:bg-blue-600';
    if (percentage >= 25) return 'bg-cyan-500 hover:bg-cyan-600';
    return 'bg-teal-500 hover:bg-teal-600';
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  // Squarified treemap algorithm
  const calculateTreeMapLayout = () => {
    const data = view === 'events' ? customerData : serviceData;
    if (data.length === 0) return [];

    const containerWidth = 1000; // Normalized width
    const containerHeight = 400; // Normalized height
    const totalValue = data.reduce((sum, c) => 
      sum + ('event_count' in c ? c.event_count : c.service_count), 0
    );

    // Sort by value descending for better squarification
    const sortedData = [...data].sort((a, b) => {
      const aCount = 'event_count' in a ? a.event_count : a.service_count;
      const bCount = 'event_count' in b ? b.event_count : b.service_count;
      return bCount - aCount;
    });

    const layout: any[] = [];
    let remainingData = [...sortedData];
    let x = 0;
    let y = 0;
    let width = containerWidth;
    let height = containerHeight;

    while (remainingData.length > 0) {
      const isHorizontal = width >= height;
      const totalRemaining = remainingData.reduce((sum, d) => 
        sum + ('event_count' in d ? d.event_count : d.service_count), 0
      );
      
      // Calculate how many items fit in current row/column
      let currentRow: typeof sortedData = [];
      let currentValue = 0;
      let bestAspectRatio = Infinity;
      
      for (let i = 0; i < remainingData.length; i++) {
        const testRow = remainingData.slice(0, i + 1);
        const testValue = testRow.reduce((sum, d) => 
          sum + ('event_count' in d ? d.event_count : d.service_count), 0
        );
        const rowSize = isHorizontal 
          ? (testValue / totalRemaining) * height
          : (testValue / totalRemaining) * width;
        
        // Calculate worst aspect ratio in this row
        let worstRatio = 0;
        testRow.forEach(item => {
          const itemCount = 'event_count' in item ? item.event_count : item.service_count;
          const itemSize = isHorizontal
            ? (itemCount / testValue) * width
            : (itemCount / testValue) * height;
          const ratio = Math.max(rowSize / itemSize, itemSize / rowSize);
          worstRatio = Math.max(worstRatio, ratio);
        });
        
        if (worstRatio < bestAspectRatio) {
          bestAspectRatio = worstRatio;
          currentRow = testRow;
          currentValue = testValue;
        } else {
          break; // Aspect ratio getting worse, stop here
        }
      }

      // Layout current row
      const rowSize = isHorizontal 
        ? (currentValue / totalRemaining) * height
        : (currentValue / totalRemaining) * width;
      
      let offset = 0;
      currentRow.forEach(item => {
        const itemCount = 'event_count' in item ? item.event_count : item.service_count;
        const itemSize = isHorizontal
          ? (itemCount / currentValue) * width
          : (itemCount / currentValue) * height;
        
        const rect = isHorizontal
          ? { x: offset, y, width: itemSize, height: rowSize }
          : { x, y: offset, width: rowSize, height: itemSize };
        
        layout.push({
          ...item,
          ...rect,
          count: itemCount,
          percentage: (itemCount / totalValue) * 100
        });
        
        offset += isHorizontal ? itemSize : itemSize;
      });
      
      // Update remaining space
      if (isHorizontal) {
        y += rowSize;
        height -= rowSize;
      } else {
        x += rowSize;
        width -= rowSize;
      }
      
      remainingData = remainingData.slice(currentRow.length);
    }

    return layout;
  };

  const treeMapData = calculateTreeMapLayout();
  const maxCount = view === 'events' 
    ? Math.max(...customerData.map(c => c.event_count), 1)
    : Math.max(...serviceData.map(c => c.service_count), 1);

  // Pagination
  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = view === 'events' ? customerEvents.slice(indexOfFirstEvent, indexOfLastEvent) : [];
  const currentServices = view === 'services' ? customerServices.slice(indexOfFirstEvent, indexOfLastEvent) : [];
  const totalPages = view === 'events' 
    ? Math.ceil(customerEvents.length / eventsPerPage)
    : Math.ceil(customerServices.length / eventsPerPage);

  // Export to Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    setShowExportDropdown(false);

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary
      const summaryData = [
        ['Affected Customer Analysis'],
        ['Generated:', new Date().toLocaleString()],
        ['Period:', `${filters.startDate} to ${filters.endDate}`],
        ['Top Customers:', '10'],
        ['Exclude Special Events:', filters.excludeSpecialEvents ? 'Yes' : 'No'],
        [],
        ['Customer Account', 'Customer Name', 'Total Events', 'Critical', 'High', 'Medium', 'Low', 'Overall Severity']
      ];

      customerData.forEach(c => {
        summaryData.push([
          c.account_number,
          c.customer_name,
          c.event_count.toString(),
          c.critical_count.toString(),
          c.high_count.toString(),
          c.medium_count.toString(),
          c.low_count.toString(),
          c.severity
        ]);
      });

      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      ws1['!cols'] = [
        { wch: 20 }, // Account
        { wch: 30 }, // Name
        { wch: 12 }, // Total
        { wch: 10 }, // Critical
        { wch: 10 }, // High
        { wch: 10 }, // Medium
        { wch: 10 }, // Low
        { wch: 15 }  // Severity
      ];
      XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

      // Sheet 2: Events (if customer selected)
      if (selectedCustomer && customerEvents.length > 0) {
        const eventsData = [
          ['Customer Events Detail'],
          ['Customer:', `${selectedCustomer.account_number} - ${selectedCustomer.customer_name}`],
          ['Total Events:', customerEvents.length.toString()],
          [],
          ['Customer Account', 'Customer Name', 'Event Type', 'PQ Services', 'Timestamp', 'Duration (ms)', 'Severity']
        ];

        customerEvents.forEach(e => {
          eventsData.push([
            e.account_number,
            e.customer_name,
            e.event_type,
            e.service_types && e.service_types.length > 0 ? e.service_types.join(', ') : '-',
            new Date(e.timestamp).toLocaleString(),
            e.duration_ms.toString(),
            e.severity
          ]);
        });

        const ws2 = XLSX.utils.aoa_to_sheet(eventsData);
        ws2['!cols'] = [
          { wch: 20 }, // Account
          { wch: 30 }, // Name
          { wch: 20 }, // Event Type
          { wch: 25 }, // PQ Services
          { wch: 20 }, // Timestamp
          { wch: 15 }, // Duration
          { wch: 12 }  // Severity
        ];
        XLSX.utils.book_append_sheet(wb, ws2, 'Events');
      }

      XLSX.writeFile(wb, `Affected_Customers_${new Date().toISOString().slice(0, 10)}.xlsx`);
      console.log('✅ Excel export completed');
    } catch (error) {
      console.error('❌ Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    setIsExporting(true);
    setShowExportDropdown(false);

    try {
      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.text('Affected Customer Analysis', 14, 20);

      // Metadata
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Period: ${filters.startDate} to ${filters.endDate}`, 14, 36);
      doc.text(`Top Customers: 10`, 14, 42);

      // Summary Table
      autoTable(doc, {
        startY: 50,
        head: [['Customer Account', 'Customer Name', 'Events', 'Critical', 'High', 'Medium', 'Low', 'Severity']],
        body: customerData.map(c => [
          c.account_number,
          c.customer_name,
          c.event_count,
          c.critical_count,
          c.high_count,
          c.medium_count,
          c.low_count,
          c.severity
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      });

      // Events Table (if customer selected)
      if (selectedCustomer && customerEvents.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text(`Customer Events: ${selectedCustomer.account_number}`, 14, 20);
        doc.setFontSize(10);
        doc.text(`${selectedCustomer.customer_name}`, 14, 28);

        autoTable(doc, {
          startY: 35,
          head: [['Event Type', 'PQ Services', 'Timestamp', 'Duration (ms)', 'Severity']],
          body: customerEvents.map(e => [
            e.event_type,
            e.service_types && e.service_types.length > 0 ? e.service_types.join(', ') : '-',
            new Date(e.timestamp).toLocaleString(),
            e.duration_ms,
            e.severity
          ]),
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
        });
      }

      doc.save(`Affected_Customers_${new Date().toISOString().slice(0, 10)}.pdf`);
      console.log('✅ PDF export completed');
    } catch (error) {
      console.error('❌ Error exporting to PDF:', error);
      alert('Failed to export to PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-12 border border-slate-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">Loading customer data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={chartRef} className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-slate-700" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Affected Customers</h2>
              <p className="text-sm text-slate-600">
                Top 10 customers by {view === 'events' ? 'event' : 'service'} count ({filters.startDate} to {filters.endDate})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Export Button */}
            <div className="relative export-dropdown-container">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={isExporting || customerData.length === 0}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export data"
              >
                <Download className="w-5 h-5" />
              </button>

              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                  <button
                    onClick={() => {
                      setEditingProfile(filters);
                      setIsEditProfileOpen(true);
                      setShowExportDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </button>
                  <div className="border-t border-slate-200 my-1"></div>
                  <button
                    onClick={handleExportExcel}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    Export to Excel
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileImage className="w-4 h-4 text-red-600" />
                    Export to PDF
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsConfigOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
              title="Configure filters"
            >
              <Settings2 className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="mb-6 flex gap-2 border-b border-slate-200">
          <button
            onClick={() => handleViewChange('events')}
            className={`px-6 py-3 font-semibold transition-all relative ${
              view === 'events'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Events
          </button>
          <button
            onClick={() => handleViewChange('services')}
            className={`px-6 py-3 font-semibold transition-all relative ${
              view === 'services'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            PQ Services
          </button>
        </div>

        {/* Tree Map */}
        <div className="mb-6">
          {(view === 'events' ? customerData : serviceData).length === 0 ? (
            <div className="h-96 flex items-center justify-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
              <div className="text-center">
                <Users className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600">No {view === 'events' ? 'event' : 'service'} data available</p>
                <p className="text-sm text-slate-500 mt-1">Adjust the date range or filters</p>
              </div>
            </div>
          ) : (
            <div className="relative w-full bg-slate-50 rounded-lg" style={{ height: '400px' }}>
              {treeMapData.map((customer) => {
                const isEvent = 'event_count' in customer;
                const colorClass = isEvent 
                  ? getSeverityColor((customer as any).severity)
                  : getCountColor((customer as any).service_count, maxCount);
                const tooltipText = isEvent
                  ? `${customer.customer_name}\nEvents: ${(customer as any).event_count}\nCritical: ${(customer as any).critical_count}, High: ${(customer as any).high_count}, Medium: ${(customer as any).medium_count}, Low: ${(customer as any).low_count}`
                  : `${customer.customer_name}\nPQ Services: ${(customer as any).service_count}`;
                
                return (
                  <button
                    key={customer.customer_id}
                    onClick={() => handleCustomerClick(customer)}
                    className={`
                      absolute ${colorClass}
                      text-white p-3 rounded-lg transition-all duration-200
                      hover:shadow-lg hover:scale-[1.02] hover:z-10
                      border-2 border-white
                      ${selectedCustomer?.customer_id === customer.customer_id ? 'ring-4 ring-blue-300 shadow-xl z-20' : ''}
                    `}
                    style={{
                      left: `${(customer.x / 1000) * 100}%`,
                      top: `${(customer.y / 400) * 100}%`,
                      width: `${(customer.width / 1000) * 100}%`,
                      height: `${(customer.height / 400) * 100}%`,
                    }}
                    title={tooltipText}
                  >
                    <div className="flex flex-col h-full justify-center overflow-hidden">
                      <div className="text-xs font-medium mb-1 truncate">{customer.account_number}</div>
                      <div className="text-sm font-semibold truncate">{customer.customer_name}</div>
                      <div className="text-2xl font-bold mt-1">{customer.count}</div>
                      <div className="text-xs opacity-90">{view === 'events' ? 'events' : 'services'}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Table */}
        {selectedCustomer && (
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {view === 'events' ? 'Events' : 'PQ Services'} for {selectedCustomer.account_number}
                </h3>
                <p className="text-sm text-slate-600">{selectedCustomer.customer_name}</p>
              </div>
              <div className="text-sm text-slate-600">
                Total: {view === 'events' ? customerEvents.length : customerServices.length} {view === 'events' ? 'events' : 'services'}
              </div>
            </div>

            {(view === 'events' ? customerEvents : customerServices).length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                No {view === 'events' ? 'events' : 'services'} found for this customer
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  {view === 'events' ? (
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Customer Account
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Customer Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Event Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            PQ Services
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Timestamp
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Duration
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Severity
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {currentEvents.map((event, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm text-slate-900">{event.account_number}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{event.customer_name}</td>
                            <td className="px-4 py-3 text-sm text-slate-900 capitalize">
                              {event.event_type.replace(/_/g, ' ')}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {event.service_types && event.service_types.length > 0
                                ? event.service_types.map(st => st.replace(/_/g, ' ')).join(', ')
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {new Date(event.timestamp).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {event.duration_ms < 1000
                                ? `${event.duration_ms}ms`
                                : `${(event.duration_ms / 1000).toFixed(2)}s`}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getSeverityBadgeColor(event.severity)}`}>
                                {event.severity}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Customer Account
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Customer Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Service Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Service Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Findings
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Recommendations
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {currentServices.map((service) => (
                          <tr key={service.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm text-slate-900">{service.customer_account}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{service.customer_name}</td>
                            <td className="px-4 py-3 text-sm text-slate-900 capitalize">
                              {service.service_type.replace(/_/g, ' ')}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {service.service_date ? new Date(service.service_date).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              <div className="max-w-xs truncate" title={service.findings || '-'}>
                                {service.findings || '-'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              <div className="max-w-xs truncate" title={service.recommendations || '-'}>
                                {service.recommendations || '-'}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      Showing {indexOfFirstEvent + 1} to {Math.min(indexOfLastEvent, view === 'events' ? customerEvents.length : customerServices.length)} of {view === 'events' ? customerEvents.length : customerServices.length} {view === 'events' ? 'events' : 'services'}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-sm text-slate-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Configuration Modal */}
      <AffectedCustomerConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        filters={filters}
        onApply={handleApplyFilters}
      />

      {/* Profile Edit Modal */}
      {isEditProfileOpen && editingProfile && (
        <AffectedCustomerProfileEditModal
          isOpen={isEditProfileOpen}
          onClose={() => {
            setIsEditProfileOpen(false);
            setEditingProfile(null);
          }}
          profile={editingProfile}
          onSave={(updatedProfile) => {
            handleApplyFilters(updatedProfile);
            setIsEditProfileOpen(false);
            setEditingProfile(null);
          }}
        />
      )}
    </>
  );
}
