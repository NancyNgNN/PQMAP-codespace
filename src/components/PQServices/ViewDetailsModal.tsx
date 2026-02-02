import { X, Calendar, User, FileText, Link as LinkIcon, Award } from 'lucide-react';
import type { PQServiceRecord } from '../../types/database';

interface ViewDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: PQServiceRecord | null;
  onViewEvent?: (eventId: string) => void;
}

export default function ViewDetailsModal({ isOpen, onClose, service, onViewEvent }: ViewDetailsModalProps) {
  if (!isOpen || !service) return null;

  const serviceTypeLabels: Record<string, string> = {
    site_survey: 'Site Survey',
    harmonic_analysis: 'Harmonic Analysis',
    consultation: 'Consultation',
    on_site_study: 'On-site Study',
    power_quality_audit: 'Power Quality Audit',
    installation_support: 'Installation Support',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-700 to-slate-900 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Service Details</h2>
            <p className="text-slate-300 mt-1">
              {serviceTypeLabels[service.service_type] || service.service_type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Service Date */}
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <Calendar className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Service Date</p>
                <p className="text-slate-900">
                  {new Date(service.service_date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Engineer */}
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <User className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Engineer</p>
                <p className="text-slate-900">
                  {service.engineer?.full_name || 'Not assigned'}
                </p>
              </div>
            </div>

            {/* Service Type */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Service Type</p>
                <p className="text-blue-900 font-semibold">
                  {serviceTypeLabels[service.service_type] || service.service_type}
                </p>
              </div>
            </div>

            {/* Benchmark Standard */}
            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
              <Award className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Benchmark Standard</p>
                <p className="text-purple-900 font-semibold">
                  {service.benchmark_standard || 'None / Not Applicable'}
                </p>
              </div>
            </div>
          </div>

          {/* Event Link (Voltage Dip mapping via IDR No.) */}
          {(service.idr_no || service.event?.idr_no || service.event?.id) && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="w-5 h-5 text-blue-600" />
                <p className="font-semibold text-slate-900">Linked IDR / Event</p>
              </div>
              <div className="text-sm text-slate-700">
                <p>
                  <span className="font-semibold">IDR No:</span>{' '}
                  {service.idr_no || service.event?.idr_no || '—'}
                </p>
                {service.event?.id ? (
                  <button
                    onClick={() => {
                      console.log('🖱️ [ViewDetailsModal] View mapped event clicked:', service.event?.id);
                      if (onViewEvent && service.event?.id) {
                        onViewEvent(service.event.id);
                      }
                    }}
                    className="mt-2 text-blue-600 hover:text-blue-700 font-semibold underline"
                  >
                    View mapped Voltage Dip event
                  </button>
                ) : (
                  <p className="mt-2 text-slate-500">
                    No Voltage Dip event mapping found.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Content/Notes */}
          {service.content && (
            <div className="p-4 bg-white border border-slate-200 rounded-lg">
              <p className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-600" />
                Service Notes
              </p>
              <div
                className="prose max-w-none text-slate-700"
                dangerouslySetInnerHTML={{ __html: service.content }}
              />
            </div>
          )}

          {/* Findings */}
          {service.findings && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="font-semibold text-slate-900 mb-2">Findings</p>
              <p className="text-slate-700 whitespace-pre-wrap">{service.findings}</p>
            </div>
          )}

          {/* Recommendations */}
          {service.recommendations && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-semibold text-slate-900 mb-2">Recommendations</p>
              <p className="text-slate-700 whitespace-pre-wrap">{service.recommendations}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
              <p>
                <span className="font-semibold">Created:</span>{' '}
                {new Date(service.created_at).toLocaleString('en-GB')}
              </p>
              {service.updated_at && (
                <p>
                  <span className="font-semibold">Updated:</span>{' '}
                  {new Date(service.updated_at).toLocaleString('en-GB')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 flex items-center justify-end rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
