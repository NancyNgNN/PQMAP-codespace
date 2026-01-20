import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, AlertCircle } from 'lucide-react';

interface Event {
  id: string;
  timestamp: string;
  event_type: string;
  severity: string;
  circuit_id: string;
  duration_ms: number;
  magnitude?: number;
  status: string;
  validated_by_adms: boolean;
  is_mother_event: boolean;
  parent_event_id?: string;
  customer_count?: number;
  voltage_level: string;
  remaining_voltage?: number;
}

interface EventOperationsProps {
  events: Event[];
  onCreateEvent: (eventData: Partial<Event>) => Promise<void>;
  onUpdateEvent: (eventId: string, eventData: Partial<Event>) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
}

interface ConfirmDialog {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function EventOperations({
  events,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent
}: EventOperationsProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  });
  const [formData, setFormData] = useState<Partial<Event>>({});
  const [loading, setLoading] = useState(false);

  const eventTypes = [
    'voltage_sag', 'voltage_swell', 'outage', 'transient',
    'harmonics', 'flicker', 'frequency_deviation', 'interruption'
  ];

  const severityLevels = ['low', 'medium', 'high', 'critical'];
  const statusOptions = ['new', 'acknowledged', 'investigating', 'resolved'];
  const voltageLevels = ['132kV', '33kV', '11kV', '415V'];

  const resetForm = () => {
    setFormData({});
    setEditingEvent(null);
    setShowCreateForm(false);
  };

  const handleCreateEvent = () => {
    const newEventData: Partial<Event> = {
      timestamp: new Date().toISOString(),
      event_type: 'voltage_sag',
      severity: 'medium',
      status: 'new',
      voltage_level: '33kV',
      validated_by_adms: false,
      is_mother_event: false,
      duration_ms: 1000,
      ...formData
    };
    setFormData(newEventData);
    setShowCreateForm(true);
  };

  const handleEditEvent = (event: Event) => {
    setFormData(event);
    setEditingEvent(event);
  };

  const handleDeleteEvent = (event: Event) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Event',
      message: `Are you sure you want to delete this ${event.event_type} event from ${event.circuit_id}? This action cannot be undone.`,
      onConfirm: async () => {
        setLoading(true);
        try {
          await onDeleteEvent(event.id);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error) {
          console.error('Error deleting event:', error);
        } finally {
          setLoading(false);
        }
      },
      onCancel: () => setConfirmDialog({ ...confirmDialog, isOpen: false }),
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingEvent) {
        await onUpdateEvent(editingEvent.id, formData);
      } else {
        await onCreateEvent(formData);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof Event, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Create Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Event Operations</h3>
        <button
          onClick={handleCreateEvent}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </div>

      {/* Event Form */}
      {(showCreateForm || editingEvent) && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium">
              {editingEvent ? 'Edit Event' : 'Create New Event'}
            </h4>
            <button
              onClick={resetForm}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Timestamp */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timestamp
                </label>
                <input
                  type="datetime-local"
                  value={formData.timestamp ? new Date(formData.timestamp).toISOString().slice(0, 16) : ''}
                  onChange={(e) => updateFormData('timestamp', new Date(e.target.value).toISOString())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type
                </label>
                <select
                  value={formData.event_type || ''}
                  onChange={(e) => updateFormData('event_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {eventTypes.map(type => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Circuit ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Circuit ID
                </label>
                <input
                  type="text"
                  value={formData.circuit_id || ''}
                  onChange={(e) => updateFormData('circuit_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., CKT-001"
                  required
                />
              </div>

              {/* Voltage Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Voltage Level
                </label>
                <select
                  value={formData.voltage_level || ''}
                  onChange={(e) => updateFormData('voltage_level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {voltageLevels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity
                </label>
                <select
                  value={formData.severity || ''}
                  onChange={(e) => updateFormData('severity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {severityLevels.map(level => (
                    <option key={level} value={level}>
                      {level.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status || ''}
                  onChange={(e) => updateFormData('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>
                      {status.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (ms)
                </label>
                <input
                  type="number"
                  value={formData.duration_ms || ''}
                  onChange={(e) => updateFormData('duration_ms', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  required
                />
              </div>

              {/* Magnitude */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Magnitude
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.magnitude || ''}
                  onChange={(e) => updateFormData('magnitude', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Customer Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Count
                </label>
                <input
                  type="number"
                  value={formData.customer_count || ''}
                  onChange={(e) => updateFormData('customer_count', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>

              {/* Remaining Voltage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remaining Voltage (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.remaining_voltage || ''}
                  onChange={(e) => updateFormData('remaining_voltage', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.validated_by_adms || false}
                  onChange={(e) => updateFormData('validated_by_adms', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Validated by ADMS</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_mother_event || false}
                  onChange={(e) => updateFormData('is_mother_event', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Mother Event</span>
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : (editingEvent ? 'Update Event' : 'Create Event')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Event List with Actions */}
      <div className="space-y-2">
        <h4 className="text-md font-medium text-gray-900">Recent Events</h4>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {events.slice(0, 10).map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {event.event_type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      event.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      event.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      event.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {event.severity.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">{event.circuit_id}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="Edit Event"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete Event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className={`w-6 h-6 ${
                confirmDialog.type === 'danger' ? 'text-red-600' : 
                confirmDialog.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
              }`} />
              <h3 className="text-lg font-semibold text-gray-900">
                {confirmDialog.title}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={confirmDialog.onCancel}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {confirmDialog.cancelText || 'Cancel'}
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                disabled={loading}
                className={`px-4 py-2 text-white rounded-lg ${
                  confirmDialog.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'Processing...' : (confirmDialog.confirmText || 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}