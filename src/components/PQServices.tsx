import { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Download,
  Filter,
  Users,
  Calendar,
  BarChart3,
  Eye,
  ChevronDown,
  FileDown,
  Building2,
  MapPin,
  AlertTriangle,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Customer, PQServiceRecord, ServiceType } from '../types/database';
import AddServiceModal from './PQServices/AddServiceModal';
import ViewDetailsModal from './PQServices/ViewDetailsModal';
import EventDetails from './EventManagement/EventDetails';
import * as XLSX from 'xlsx';

export default function PQServices() {
  // State Management
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<PQServiceRecord[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'main' | 'services'>('main');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'month' | '3months' | 'year' | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  
  // Filters
  const [serviceTypeFilter, setServiceTypeFilter] = useState<ServiceType | 'all'>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'7days' | '30days' | 'custom' | 'all'>('all');
  const [benchmarkFilter, setBenchmarkFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'last_service' | 'total_services'>('name');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedService, setSelectedService] = useState<PQServiceRecord | null>(null);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  type EventDetailsTab = 'overview' | 'technical' | 'impact' | 'services' | 'children' | 'timeline' | 'idr';
  const [eventDetailsInitialTab, setEventDetailsInitialTab] = useState<EventDetailsTab>('overview');
  const [selectedEventData, setSelectedEventData] = useState<{
    event: any;
    substation: any;
    impacts: any[];
  } | null>(null);

  // Load data
  useEffect(() => {
    loadCustomers();
    loadServices();
  }, []);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*, substation:substations(*)')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error loading customers:', err);
    }
  };

  const loadServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pq_service_records')
        .select('*, customer:customers(*), engineer:profiles(*)')
        .order('service_date', { ascending: false });

      if (error) throw error;

      const serviceRows = (data || []) as PQServiceRecord[];
      const idrNumbers = Array.from(
        new Set(
          serviceRows
            .map((s) => (s.idr_no || '').trim())
            .filter((v) => v.length > 0)
        )
      );

      let idrToVoltageDipEvent = new Map<string, { id: string; idr_no: string }>();
      if (idrNumbers.length > 0) {
        const { data: eventsData, error: eventsError } = await supabase
          .from('pq_events')
          .select('id, idr_no, event_type')
          .in('idr_no', idrNumbers)
          .eq('event_type', 'voltage_dip');

        if (eventsError) throw eventsError;
        (eventsData || []).forEach((e: any) => {
          if (e.idr_no) {
            idrToVoltageDipEvent.set(String(e.idr_no), { id: e.id, idr_no: String(e.idr_no) });
          }
        });
      }

      const enriched = serviceRows.map((s) => {
        const idrNo = (s.idr_no || '').trim();
        if (idrNo && idrToVoltageDipEvent.has(idrNo)) {
          return { ...s, event: idrToVoltageDipEvent.get(idrNo) };
        }
        return { ...s, event: undefined };
      });

      setServices(enriched);
    } catch (err) {
      console.error('Error loading services:', err);
    } finally {
      setLoading(false);
    }
  };

  // Dashboard metrics
  const getDashboardMetrics = () => {
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    let filteredServices = services;
    if (timeRange === 'month') {
      filteredServices = services.filter(s => new Date(s.service_date) >= oneMonthAgo);
    } else if (timeRange === '3months') {
      filteredServices = services.filter(s => new Date(s.service_date) >= threeMonthsAgo);
    } else if (timeRange === 'year') {
      filteredServices = services.filter(s => new Date(s.service_date) >= oneYearAgo);
    }

    const thisMonthServices = services.filter(s => new Date(s.service_date) >= oneMonthAgo).length;

    const serviceCounts = filteredServices.reduce((acc, service) => {
      acc[service.service_type] = (acc[service.service_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCustomers: customers.length,
      totalServices: filteredServices.length,
      thisMonthServices,
      serviceCounts,
    };
  };

  const metrics = getDashboardMetrics();

  // Filter customers
  const getFilteredCustomers = () => {
    let filtered = customers;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.name.toLowerCase().includes(query) ||
          c.account_number.toLowerCase().includes(query)
      );
    }

    // Sort
    if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'last_service') {
      filtered.sort((a, b) => {
        const aService = services.filter(s => s.customer_id === a.id).sort((x, y) => 
          new Date(y.service_date).getTime() - new Date(x.service_date).getTime()
        )[0];
        const bService = services.filter(s => s.customer_id === b.id).sort((x, y) => 
          new Date(y.service_date).getTime() - new Date(x.service_date).getTime()
        )[0];
        
        if (!aService && !bService) return 0;
        if (!aService) return 1;
        if (!bService) return -1;
        return new Date(bService.service_date).getTime() - new Date(aService.service_date).getTime();
      });
    } else if (sortBy === 'total_services') {
      filtered.sort((a, b) => {
        const aCount = services.filter(s => s.customer_id === a.id).length;
        const bCount = services.filter(s => s.customer_id === b.id).length;
        return bCount - aCount;
      });
    }

    return filtered;
  };

  // Filter services for selected customer
  const getFilteredServices = () => {
    if (!selectedCustomer) return [];
    
    let filtered = services.filter(s => s.customer_id === selectedCustomer.id);

    // Service type filter
    if (serviceTypeFilter !== 'all') {
      filtered = filtered.filter(s => s.service_type === serviceTypeFilter);
    }

    // Date range filter
    if (dateRangeFilter === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter(s => new Date(s.service_date) >= sevenDaysAgo);
    } else if (dateRangeFilter === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(s => new Date(s.service_date) >= thirtyDaysAgo);
    }

    // Benchmark filter
    if (benchmarkFilter !== 'all') {
      filtered = filtered.filter(s => s.benchmark_standard === benchmarkFilter);
    }

    return filtered;
  };

  // Get customer service stats
  const getCustomerStats = (customerId: string) => {
    const customerServices = services.filter(s => s.customer_id === customerId);
    const lastService = customerServices.sort((a, b) => 
      new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
    )[0];

    return {
      totalServices: customerServices.length,
      lastServiceDate: lastService?.service_date || null,
    };
  };

  // Handle View Event button click
  const handleViewEvent = async (eventId: string, initialTab: EventDetailsTab = 'overview') => {
    console.log('🔍 [PQServices] View Event clicked:', eventId);
    
    try {
      // Fetch event data
      const { data: eventData, error: eventError } = await supabase
        .from('pq_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('❌ [PQServices] Error fetching event:', eventError);
        alert('Failed to load event details. Please try again.');
        return;
      }

      console.log('✅ [PQServices] Event data loaded:', eventData);

      // Fetch substation data
      const { data: substationData } = await supabase
        .from('substations')
        .select('*')
        .eq('id', eventData.substation_id)
        .single();

      console.log('✅ [PQServices] Substation data loaded:', substationData);

      // Fetch impacts
      const { data: impactsData, error: impactsError } = await supabase
        .from('event_customer_impact')
        .select(`
          *,
          customer:customers (
            id,
            name,
            account_number,
            address
          )
        `)
        .eq('event_id', eventId);

      if (impactsError) {
        console.error('❌ [PQServices] Error fetching impacts:', impactsError);
      }

      console.log('✅ [PQServices] Impacts loaded:', {
        count: impactsData?.length || 0,
        firstImpact: impactsData?.[0]
      });

      setEventDetailsInitialTab(initialTab);

      setSelectedEventData({
        event: eventData,
        substation: substationData,
        impacts: impactsData || []
      });
      setShowEventDetailsModal(true);

      console.log('✅ [PQServices] Event details modal opened');
    } catch (error) {
      console.error('❌ [PQServices] Unexpected error loading event:', error);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  // Export functionality
  const handleExportCustomerServices = async () => {
    if (!selectedCustomer) return;

    const customerServices = getFilteredServices();
    
    const exportData = customerServices.map(service => ({
      'Service Date': new Date(service.service_date).toLocaleDateString('en-GB'),
      'Service Type': service.service_type.replace(/_/g, ' ').toUpperCase(),
      'Event ID': service.event_id || 'N/A',
      'Benchmark Standard': service.benchmark_standard || 'None',
      'Findings': service.findings || '',
      'Recommendations': service.recommendations || '',
      'Engineer': service.engineer?.full_name || 'Not assigned',
      'Created': new Date(service.created_at).toLocaleDateString('en-GB'),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Services');

    // Add header
    const header = [
      [`PQ Services Report - ${selectedCustomer.name}`],
      [`Account Number: ${selectedCustomer.account_number}`],
      [`Export Date: ${new Date().toLocaleDateString('en-GB')}`],
      [`Total Services: ${customerServices.length}`],
      [],
    ];
    XLSX.utils.sheet_add_aoa(ws, header, { origin: 'A1' });

    XLSX.writeFile(wb, `PQ_Services_${selectedCustomer.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportDropdown(false);
  };

  // Recent activities (last 10 services across all customers)
  const recentActivities = services.slice(0, 10);

  const serviceTypeLabels: Record<string, string> = {
    site_survey: 'Site Survey',
    harmonic_analysis: 'Harmonic Analysis',
    consultation: 'Consultation',
    on_site_study: 'On-site Study',
    power_quality_audit: 'Power Quality Audit',
    installation_support: 'Installation Support',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Dashboard Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="w-8 h-8 text-slate-700" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">PQ Services</h1>
              <p className="text-slate-600 mt-1">Customer-centric power quality service logging</p>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">Time Range:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="month">This Month</option>
              <option value="3months">Last 3 Months</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        {/* Dashboard Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-blue-600" />
              <p className="text-sm font-medium text-slate-600">Total Customers</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{metrics.totalCustomers}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <Wrench className="w-6 h-6 text-green-600" />
              <p className="text-sm font-medium text-slate-600">Total Services</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{metrics.totalServices}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6 text-purple-600" />
              <p className="text-sm font-medium text-slate-600">This Month</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{metrics.thisMonthServices}</p>
          </div>
        </div>

        {/* Horizontal Bar Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-6 h-6 text-slate-700" />
            <h2 className="text-xl font-bold text-slate-900">Services by Category</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(serviceTypeLabels).map(([key, label]) => {
              const count = metrics.serviceCounts[key] || 0;
              const maxCount = Math.max(...Object.values(metrics.serviceCounts), 1);
              const percentage = (count / maxCount) * 100;

              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{label}</span>
                    <span className="font-bold text-slate-900">{count}</span>
                  </div>
                  <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl shadow-lg p-4 border border-slate-100">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer name or account number..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="name">Name</option>
              <option value="last_service">Last Service Date</option>
              <option value="total_services">Total Services</option>
            </select>
          </div>

          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Filter className="w-5 h-5" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && selectedCustomer && (
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Service Type</label>
              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Types</option>
                {Object.entries(serviceTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Date Range</label>
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Benchmark Standard</label>
              <select
                value={benchmarkFilter}
                onChange={(e) => setBenchmarkFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Standards</option>
                <option value="IEEE 519">IEEE 519</option>
                <option value="IEC 61000">IEC 61000</option>
                <option value="ITIC Curve">ITIC Curve</option>
                <option value="SEMI F47">SEMI F47</option>
                <option value="EN 50160">EN 50160</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Content: Customer List + Customer Detail */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Customer Sidebar */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white p-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5" />
                Customers ({getFilteredCustomers().length})
              </h2>
            </div>
            <div className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto">
              {getFilteredCustomers().map((customer) => {
                const stats = getCustomerStats(customer.id);
                const isSelected = selectedCustomer?.id === customer.id;

                return (
                  <button
                    key={customer.id}
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setActiveTab('main');
                    }}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-slate-900 truncate">{customer.name}</p>
                          {customer.critical_customer && (
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600">{customer.account_number}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                          <span className="px-2 py-0.5 bg-slate-100 rounded font-medium">
                            {stats.totalServices} services
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                );
              })}

              {getFilteredCustomers().length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No customers found</p>
                  <p className="text-sm mt-1">Try adjusting your search</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customer Detail */}
        <div className="xl:col-span-3">
          {selectedCustomer ? (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-slate-200">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('main')}
                    className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                      activeTab === 'main'
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Main Info
                  </button>
                  <button
                    onClick={() => setActiveTab('services')}
                    className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                      activeTab === 'services'
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    PQ Services
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'main' && (
                  <div className="space-y-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                          {selectedCustomer.name}
                          {selectedCustomer.critical_customer && (
                            <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" />
                              Critical Customer
                            </span>
                          )}
                        </h2>
                        <p className="text-slate-600 mt-1">Account: {selectedCustomer.account_number}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-5 h-5 text-slate-600" />
                          <p className="text-sm font-semibold text-slate-700">Customer Type</p>
                        </div>
                        <p className="text-slate-900 capitalize">{selectedCustomer.customer_type}</p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-5 h-5 text-slate-600" />
                          <p className="text-sm font-semibold text-slate-700">Location</p>
                        </div>
                        <p className="text-slate-900">{selectedCustomer.address || 'Not specified'}</p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-5 h-5 text-slate-600" />
                          <p className="text-sm font-semibold text-slate-700">Substation</p>
                        </div>
                        <p className="text-slate-900">
                          {selectedCustomer.substation?.name || 'Not linked'}
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Wrench className="w-5 h-5 text-slate-600" />
                          <p className="text-sm font-semibold text-slate-700">Contract Demand</p>
                        </div>
                        <p className="text-slate-900">
                          {selectedCustomer.contract_demand_kva 
                            ? `${selectedCustomer.contract_demand_kva} kVA`
                            : 'Not specified'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm font-semibold text-slate-700 mb-2">Total Services</p>
                        <p className="text-3xl font-bold text-blue-600">
                          {getCustomerStats(selectedCustomer.id).totalServices}
                        </p>
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm font-semibold text-slate-700 mb-2">Last Service</p>
                        <p className="text-lg font-bold text-green-600">
                          {getCustomerStats(selectedCustomer.id).lastServiceDate
                            ? new Date(getCustomerStats(selectedCustomer.id).lastServiceDate!).toLocaleDateString('en-GB')
                            : 'No services yet'}
                        </p>
                      </div>

                      <div className="p-4 bg-white rounded-lg border border-slate-200 md:col-span-2">
                        <p className="text-sm font-semibold text-slate-700 mb-3">IDR Numbers</p>
                        {services.filter(s => s.customer_id === selectedCustomer.id).length === 0 ? (
                          <p className="text-sm text-slate-500">No services yet</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {services
                              .filter(s => s.customer_id === selectedCustomer.id)
                              .map((s) => {
                                const idrNo = (s.idr_no || s.event?.idr_no || '').trim();
                                const mappedEventId = s.event?.id;
                                const hasEvent = !!mappedEventId;
                                return (
                                  <button
                                    key={s.id}
                                    type="button"
                                    disabled={!hasEvent}
                                    onClick={() => {
                                      if (mappedEventId) handleViewEvent(mappedEventId, 'idr');
                                    }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                                      hasEvent
                                        ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                        : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                                    }`}
                                    title={hasEvent ? 'Open IDR details' : 'No related event linked'}
                                  >
                                    {idrNo || 'No IDR'}
                                  </button>
                                );
                              })}
                          </div>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                          Click an IDR number to open the related event and view IDR details.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'services' && (
                  <div className="space-y-4">
                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900">
                        Service Log ({getFilteredServices().length})
                      </h3>
                      <div className="flex items-center gap-2">
                        {/* Export */}
                        <div className="relative export-dropdown-container">
                          <button
                            onClick={() => setShowExportDropdown(!showExportDropdown)}
                            disabled={getFilteredServices().length === 0}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Export"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          {showExportDropdown && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                              <button
                                onClick={handleExportCustomerServices}
                                className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                              >
                                <FileDown className="w-4 h-4 text-green-600" />
                                Export to Excel
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Add Service */}
                        <button
                          onClick={() => setShowAddModal(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                        >
                          <Plus className="w-5 h-5" />
                          Add Service
                        </button>
                      </div>
                    </div>

                    {/* Services Table */}
                    {loading ? (
                      <div className="py-12 text-center text-slate-500">
                        <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                        <p className="mt-3">Loading services...</p>
                      </div>
                    ) : getFilteredServices().length === 0 ? (
                      <div className="py-12 text-center text-slate-500">
                        <Wrench className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="font-medium text-lg">No services found</p>
                        <p className="text-sm mt-1">Add a service to get started</p>
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Service Type
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Event ID
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                IDR No.
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Content
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {getFilteredServices().map((service) => (
                              <tr key={service.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm text-slate-900">
                                  {new Date(service.service_date).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                                    {serviceTypeLabels[service.service_type]}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {service.event?.id ? (
                                    <button 
                                      onClick={() => {
                                        console.log('🖱️ [PQServices] Event ID clicked in table:', service.event?.id);
                                        if (service.event?.id) handleViewEvent(service.event.id, 'overview');
                                      }}
                                      className="text-blue-600 hover:text-blue-700 font-medium underline"
                                    >
                                      {service.event.id.slice(0, 8)}...
                                    </button>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {service.event?.id ? (
                                    <button
                                      type="button"
                                      onClick={() => handleViewEvent(service.event!.id, 'idr')}
                                      className="text-blue-600 hover:text-blue-700 font-medium underline"
                                      title="Open IDR details"
                                    >
                                      {(service.idr_no || service.event?.idr_no || 'No IDR')}
                                    </button>
                                  ) : (
                                    <span className="text-slate-400">{(service.idr_no || '—')}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                                  {service.content ? (
                                    <div dangerouslySetInnerHTML={{ __html: service.content.slice(0, 100) + '...' }} />
                                  ) : (
                                    <span className="text-slate-400">No content</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => {
                                      setSelectedService(service);
                                      setShowDetailsModal(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-12 text-center">
              <Users className="w-20 h-20 mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Customer Selected</h3>
              <p className="text-slate-600">Select a customer from the list to view details and service history</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-lg p-6 text-white">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          Recent Activities
        </h2>
        <div className="space-y-3">
          {recentActivities.map((service) => (
            <div key={service.id} className="p-4 bg-white/10 rounded-lg backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{service.customer?.name}</p>
                  <div className="flex items-center gap-2 mt-1 text-sm opacity-75">
                    <span>{new Date(service.service_date).toLocaleDateString('en-GB')}</span>
                    <span>•</span>
                    <span>{serviceTypeLabels[service.service_type]}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm opacity-75">Engineer</p>
                  <p className="font-medium">{service.engineer?.full_name || 'Not assigned'}</p>
                </div>
              </div>
            </div>
          ))}

          {recentActivities.length === 0 && (
            <div className="p-8 text-center opacity-50">
              <p>No recent activities</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedCustomer && (
        <AddServiceModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            loadServices();
            setShowAddModal(false);
          }}
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
        />
      )}

      <ViewDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedService(null);
        }}
        service={selectedService}
        onViewEvent={handleViewEvent}
      />

      {/* Event Details Modal */}
      {showEventDetailsModal && selectedEventData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-y-auto">
            {/* Modal Header with Close Button */}
            <div className="sticky top-0 bg-gradient-to-r from-slate-700 to-slate-900 text-white p-4 rounded-t-2xl flex items-center justify-between z-10">
              <h2 className="text-xl font-bold">Event Details</h2>
              <button
                onClick={() => {
                  console.log('❌ [PQServices] Closing event details modal');
                  setShowEventDetailsModal(false);
                  setSelectedEventData(null);
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Event Details Component */}
            <div className="p-6">
              <EventDetails
                event={selectedEventData.event}
                substation={selectedEventData.substation}
                impacts={selectedEventData.impacts}
                initialTab={eventDetailsInitialTab}
                onStatusChange={async (eventId, status) => {
                  console.log('🔄 [PQServices] Status change requested:', { eventId, status });
                  // Reload services after status change
                  await loadServices();
                }}
                onEventDeleted={() => {
                  console.log('🗑️ [PQServices] Event deleted, reloading services');
                  setShowEventDetailsModal(false);
                  setSelectedEventData(null);
                  setEventDetailsInitialTab('overview');
                  loadServices();
                }}
                onEventUpdated={() => {
                  console.log('🔄 [PQServices] Event updated, reloading services');
                  loadServices();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
