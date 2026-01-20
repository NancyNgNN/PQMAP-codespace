import { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { supabase } from '../../lib/supabase';
import type { ServiceType } from '../../types/database';

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customerId: string;
  customerName: string;
}

export default function AddServiceModal({ isOpen, onClose, onSuccess, customerId, customerName }: AddServiceModalProps) {
  const [formData, setFormData] = useState({
    service_date: new Date().toISOString().split('T')[0],
    service_type: 'site_survey' as ServiceType,
    event_id: '',
    findings: '',
    recommendations: '',
    benchmark_standard: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Event selector state
  const [customerEvents, setCustomerEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [eventDateFilter, setEventDateFilter] = useState<'7days' | '30days' | '90days' | 'all'>('all');
  const [showEventDropdown, setShowEventDropdown] = useState(false);

  // TipTap editor for content field
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Enter service notes, observations, and details here...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[150px] p-3',
      },
    },
  });

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Use the auth user ID directly as engineer_id
        // The profiles table uses auth.uid() as the primary key
        setCurrentUserId(user.id);
      }
    };

    if (isOpen) {
      getCurrentUser();
      loadCustomerEvents();
    }
  }, [isOpen, customerId]);

  // Load events for the selected customer
  const loadCustomerEvents = async () => {
    setLoadingEvents(true);
    try {
      // First, get event IDs for this customer
      const { data: impactData, error: impactError } = await supabase
        .from('event_customer_impact')
        .select('event_id')
        .eq('customer_id', customerId);

      if (impactError) {
        console.error('Error loading customer impacts:', impactError);
        setCustomerEvents([]);
        return;
      }

      const eventIds = impactData?.map(i => i.event_id) || [];

      if (eventIds.length === 0) {
        setCustomerEvents([]);
        return;
      }

      // Then fetch the events (only mother events or standalone events)
      const { data: eventsData, error: eventsError } = await supabase
        .from('pq_events')
        .select('id, timestamp, event_type, magnitude, duration_ms, severity, is_mother_event')
        .in('id', eventIds)
        .or('is_mother_event.eq.true,is_child_event.eq.false')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (eventsError) {
        console.error('Error loading events:', eventsError);
        setCustomerEvents([]);
        return;
      }

      console.log('\u2705 Loaded', eventsData?.length || 0, 'events for customer');
      setCustomerEvents(eventsData || []);
    } catch (error) {
      console.error('Error loading customer events:', error);
      setCustomerEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Filter events based on search and filters
  const getFilteredEvents = () => {
    let filtered = customerEvents;

    // Date range filter
    if (eventDateFilter !== 'all') {
      const now = new Date();
      const daysAgo = eventDateFilter === '7days' ? 7 : eventDateFilter === '30days' ? 30 : 90;
      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(e => new Date(e.timestamp) >= cutoffDate);
    }

    // Event type filter
    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter(e => e.event_type === eventTypeFilter);
    }

    // Search query
    if (eventSearchQuery) {
      const query = eventSearchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.id.toLowerCase().includes(query) ||
        e.event_type.toLowerCase().includes(query) ||
        new Date(e.timestamp).toLocaleDateString().includes(query)
      );
    }

    return filtered;
  };

  const serviceTypeOptions: { value: ServiceType; label: string }[] = [
    { value: 'site_survey', label: 'Site Survey' },
    { value: 'harmonic_analysis', label: 'Harmonic Analysis' },
    { value: 'consultation', label: 'Consultation' },
    { value: 'on_site_study', label: 'On-site Study' },
    { value: 'power_quality_audit', label: 'Power Quality Audit' },
    { value: 'installation_support', label: 'Installation Support' },
  ];

  const benchmarkOptions = [
    { value: '', label: 'None / Not Applicable' },
    { value: 'IEEE 519', label: 'IEEE 519 (Harmonic Control)' },
    { value: 'IEC 61000', label: 'IEC 61000 (Electromagnetic Compatibility)' },
    { value: 'ITIC Curve', label: 'ITIC Curve (Voltage Tolerance)' },
    { value: 'SEMI F47', label: 'SEMI F47 (Semiconductor Equipment)' },
    { value: 'EN 50160', label: 'EN 50160 (Voltage Characteristics)' },
  ];

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);

    try {
      // Get content from TipTap editor
      const content = editor?.getHTML() || '';

      const serviceData = {
        customer_id: customerId,
        service_date: formData.service_date,
        service_type: formData.service_type,
        event_id: formData.event_id || null,
        findings: formData.findings || null,
        recommendations: formData.recommendations || null,
        benchmark_standard: formData.benchmark_standard || null,
        engineer_id: currentUserId,
        content: content,
      };

      const { error: insertError } = await supabase
        .from('pq_service_records')
        .insert(serviceData);

      if (insertError) throw insertError;

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Error saving service:', err);
      setError(err.message || 'Failed to save service record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      service_date: new Date().toISOString().split('T')[0],
      service_type: 'site_survey',
      event_id: '',
      findings: '',
      recommendations: '',
      benchmark_standard: '',
    });
    editor?.commands.setContent('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Add PQ Service</h2>
            <p className="text-blue-100 mt-1">Customer: {customerName}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            disabled={isSaving}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Service Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Service Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.service_date}
                onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Service Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Service Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value as ServiceType })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {serviceTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Event ID (Optional) - Searchable Dropdown */}
            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Link to Event (Optional)
              </label>
              
              {/* Selected Event Display / Search Input */}
              <div className="relative">
                <input
                  type="text"
                  value={eventSearchQuery || (formData.event_id ? `Event: ${formData.event_id.slice(0, 8)}...` : '')}
                  onChange={(e) => {
                    setEventSearchQuery(e.target.value);
                    setShowEventDropdown(true);
                    if (!e.target.value) {
                      setFormData({ ...formData, event_id: '' });
                    }
                  }}
                  onFocus={() => setShowEventDropdown(true)}
                  placeholder="Search events by date, type, or ID..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {loadingEvents && (
                  <Loader2 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2 animate-spin" />
                )}
              </div>

              {/* Dropdown */}
              {showEventDropdown && !loadingEvents && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                  {/* Filters */}
                  <div className="sticky top-0 bg-slate-50 border-b border-slate-200 p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={eventDateFilter}
                        onChange={(e) => setEventDateFilter(e.target.value as any)}
                        className="text-xs px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="all">All Time</option>
                        <option value="7days">Last 7 Days</option>
                        <option value="30days">Last 30 Days</option>
                        <option value="90days">Last 90 Days</option>
                      </select>
                      <select
                        value={eventTypeFilter}
                        onChange={(e) => setEventTypeFilter(e.target.value)}
                        className="text-xs px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="all">All Types</option>
                        <option value="voltage_sag">Voltage Sag</option>
                        <option value="voltage_swell">Voltage Swell</option>
                        <option value="interruption">Interruption</option>
                        <option value="transient">Transient</option>
                        <option value="harmonic_distortion">Harmonic Distortion</option>
                        <option value="voltage_imbalance">Voltage Imbalance</option>
                      </select>
                    </div>
                    {(eventTypeFilter !== 'all' || eventDateFilter !== 'all' || eventSearchQuery) && (
                      <button
                        onClick={() => {
                          setEventTypeFilter('all');
                          setEventDateFilter('all');
                          setEventSearchQuery('');
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>

                  {/* Event List */}
                  <div className="divide-y divide-slate-200">
                    {getFilteredEvents().length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        {customerEvents.length === 0 ? (
                          <p>No events found for this customer</p>
                        ) : (
                          <p>No events match your filters</p>
                        )}
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setFormData({ ...formData, event_id: '' });
                            setEventSearchQuery('');
                            setShowEventDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-600 italic"
                        >
                          (No event linked)
                        </button>
                        {getFilteredEvents().map((event) => (
                          <button
                            key={event.id}
                            onClick={() => {
                              setFormData({ ...formData, event_id: event.id });
                              setEventSearchQuery('');
                              setShowEventDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-semibold text-slate-900">
                                    {new Date(event.timestamp).toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                  <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                                    event.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                    event.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                    event.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                    {event.event_type.replace(/_/g, ' ').toUpperCase()}
                                  </span>
                                  {event.is_mother_event && (
                                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-100 text-purple-700">
                                      Mother Event
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 truncate">
                                  ID: {event.id}
                                </p>
                              </div>
                              {event.magnitude && (
                                <div className="text-right flex-shrink-0">
                                  <p className="text-xs font-semibold text-slate-900">
                                    {event.magnitude.toFixed(1)}%
                                  </p>
                                  {event.duration_ms && (
                                    <p className="text-xs text-slate-600">
                                      {event.duration_ms}ms
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500 mt-1">
                Link this service to a specific PQ event from this customer
                {customerEvents.length > 0 && ` (${customerEvents.length} available)`}
              </p>
            </div>

            {/* Benchmark Standard */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Benchmark Standard
              </label>
              <select
                value={formData.benchmark_standard}
                onChange={(e) => setFormData({ ...formData, benchmark_standard: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {benchmarkOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Findings */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Findings
            </label>
            <textarea
              value={formData.findings}
              onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
              rows={3}
              placeholder="Summarize key findings from the service..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Recommendations */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Recommendations
            </label>
            <textarea
              value={formData.recommendations}
              onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
              rows={3}
              placeholder="Provide recommendations for improvements..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Content (Rich Text) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Service Content / Notes <span className="text-red-500">*</span>
            </label>
            <div className="border border-slate-300 rounded-lg bg-white overflow-hidden">
              {/* Toolbar */}
              <div className="border-b border-slate-200 bg-slate-50 p-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={`px-3 py-1 rounded text-sm font-semibold ${
                    editor?.isActive('bold') ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100'
                  }`}
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={`px-3 py-1 rounded text-sm italic ${
                    editor?.isActive('italic') ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100'
                  }`}
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={`px-3 py-1 rounded text-sm ${
                    editor?.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100'
                  }`}
                >
                  • List
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={`px-3 py-1 rounded text-sm ${
                    editor?.isActive('orderedList') ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100'
                  }`}
                >
                  1. List
                </button>
              </div>
              {/* Editor */}
              <EditorContent editor={editor} className="bg-white" />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              General notes and observations during the service visit
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-semibold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Service
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
