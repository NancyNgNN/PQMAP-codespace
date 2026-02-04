import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  Download,
  FileText,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import ReportBuilder from './Dashboard/ReportBuilder/ReportBuilder';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import * as XLSX from 'xlsx';
import NotificationBell from './NotificationBell';

type PQSummaryEventType = 'Voltage Dip' | 'Voltage Swell' | 'Harmonic' | 'Interruption';

type PQSummarySeverity = 'Low' | 'Medium' | 'High' | 'Critical';

type PQServiceLogStatus = 'In Progress' | 'Completed';

type PQSummaryCustomer = {
  customerId: string;
  customerName: string;
  accountNumber: string;
  address: string;
  contactPerson: string;
  phone: string;
  impactLevel: PQSummarySeverity;
};

type PQSummaryServiceLog = {
  logId: string;
  status: PQServiceLogStatus;
  customerName: string;
  date: string; // YYYY-MM-DD HH:mm
  technician: string;
  action: string;
  description: string;
};

type BenchmarkParameter = 'Voltage Dip' | 'Voltage Swell' | 'Interruption';

type PQBenchmarkStandardMock = {
  id: string;
  name: string;
  family: string; // e.g. IEC / SEMI / ITIC / CLP Supply Rules
  parameter: BenchmarkParameter | string;
  description: string;
  updatedAt: string; // YYYY-MM-DD or year like "2001"
  // Extended fields for screenshot UI
  version?: string;
  category?: string;
  level?: string;
  min?: string;
  max?: string;
  unit?: string;
  remarks?: string;
  // For Voltage Dip benchmarking (durationSec vs minimum remaining voltage %)
  curvePoints: Array<{ durationSec: number; minVoltagePct: number }>;
};

type VoltageDipBenchmarkEventMock = {
  id: string;
  groupId?: string;
  meter?: string;
  timestamp: string; // YYYY-MM-DD HH:mm:ss
  location: string;
  durationSec: number;
  remainingVoltagePct: number;
};



type ReportingTab = 'pqSummary' | 'complianceSummary' | 'voltageCurrentProfile' | 'meterCommunication' | 'dynamicReport' | 'pqsisMaintenance';

type PQSISRecord = {
  caseNo: string; // e.g., "5337.2"
  customerName: string;
  customerGroup: string;
  requestDate: string; // dd/mm/yyyy
  serviceType: string;
  service: string;
  serviceCharging: number;
  chargedDepartment: string;
  serviceCompletionDate: string; // dd/mm/yyyy
  closedCase: string; // Yes/No
  inProgressCase: string; // Yes/No
  completedBeforeTargetDate: string; // Yes/No
  businessType: string;
  plannedReplyDate: string; // dd/mm/yyyy
  actualReplyDate: string; // dd/mm/yyyy
  plannedReportIssueDate: string; // dd/mm/yyyy
  actualReportIssueDate: string; // dd/mm/yyyy
  idrNumber?: string; // Optional link to IDR
};

type PQSISServiceType = 'Harmonics' | 'Supply Enquiry' | 'Site Survey' | 'Technical Services' | 'PQ Site Investigation' | 'Enquiry' | 'All';

type ComplianceSummaryReportView = 'pqStandards' | 'voltageDipBenchmarking' | 'individualHarmonics' | 'en50160';

type HarmonicType = 'V1_HD' | 'V2_HD' | 'V3_HD' | 'I1_HD' | 'I2_HD' | 'I3_HD';

type HarmonicDataRecord = {
  timestamp: string;
  order: number; // 3rd, 5th, 7th, etc.
  magnitude: number;
  angle: number;
  thd: number;
};

type EN50160Parameter = {
  parameter: string;
  limit: string;
  actualValue: string;
  result: 'Pass' | 'Fail';
};

const pad2 = (n: number) => String(n).padStart(2, '0');

const formatYYYYMMDDSlashes = (date: Date) => {
  return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;
};

const parseYYYYMMDDSlashes = (value: string): Date | null => {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function DatePickerPopover({
  value,
  onChange,
  onClose
}: {
  value: string;
  onChange: (next: string) => void;
  onClose: () => void;
}) {
  const today = new Date();
  const initial = parseYYYYMMDDSlashes(value) ?? new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonthIndex, setViewMonthIndex] = useState(initial.getMonth());

  const monthStart = new Date(viewYear, viewMonthIndex, 1);
  const monthEnd = new Date(viewYear, viewMonthIndex + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const startDay = monthStart.getDay();
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  const selectedDate = parseYYYYMMDDSlashes(value);

  const goPrevMonth = () => {
    const next = new Date(viewYear, viewMonthIndex - 1, 1);
    setViewYear(next.getFullYear());
    setViewMonthIndex(next.getMonth());
  };

  const goNextMonth = () => {
    const next = new Date(viewYear, viewMonthIndex + 1, 1);
    setViewYear(next.getFullYear());
    setViewMonthIndex(next.getMonth());
  };

  const handleSelectDay = (day: number) => {
    const d = new Date(viewYear, viewMonthIndex, day);
    onChange(formatYYYYMMDDSlashes(d));
    onClose();
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    <div className="absolute left-0 top-full mt-2 z-40 w-[320px] rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 hover:bg-slate-100 rounded-lg"
            onClick={goPrevMonth}
            title="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="text-sm font-semibold text-slate-900">
            {monthNames[viewMonthIndex]} {viewYear}
          </div>
          <button
            type="button"
            className="p-2 hover:bg-slate-100 rounded-lg"
            onClick={goNextMonth}
            title="Next month"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <button type="button" className="p-2 hover:bg-slate-100 rounded-lg" onClick={onClose} title="Close">
          <X className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      <div className="px-3 py-3">
        <div className="grid grid-cols-7 text-xs text-slate-600 font-semibold mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startDay }).map((_, idx) => (
            <div key={`sp-${idx}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const day = idx + 1;
            const cellDate = new Date(viewYear, viewMonthIndex, day);
            const isToday = isSameDay(cellDate, today);
            const isSelected = selectedDate ? isSameDay(cellDate, selectedDate) : false;

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleSelectDay(day)}
                className={classNames(
                  'h-9 w-9 rounded-lg text-sm font-semibold transition-colors mx-auto',
                  isSelected ? 'bg-blue-600 text-white' : 'text-slate-900 hover:bg-blue-50',
                  isToday && !isSelected ? 'border border-blue-600' : 'border border-transparent'
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200">
        <button
          type="button"
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          onClick={() => {
            onChange('');
            onClose();
          }}
        >
          Clear
        </button>
        <button
          type="button"
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          onClick={() => {
            onChange(formatYYYYMMDDSlashes(today));
            onClose();
          }}
        >
          Today
        </button>
      </div>
    </div>
  );
}

function getVoltageRequirementAtDuration(
  curve: Array<{ durationSec: number; minVoltagePct: number }>,
  durationSec: number
): number {
  if (curve.length === 0) return 0;
  const sorted = [...curve].sort((a, b) => a.durationSec - b.durationSec);
  const d = Math.max(0, durationSec);

  if (d <= sorted[0].durationSec) return sorted[0].minVoltagePct;
  if (d >= sorted[sorted.length - 1].durationSec) return sorted[sorted.length - 1].minVoltagePct;

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (d >= a.durationSec && d <= b.durationSec) {
      const span = b.durationSec - a.durationSec;
      if (span <= 0) return a.minVoltagePct;
      const t = (d - a.durationSec) / span;
      return a.minVoltagePct + t * (b.minVoltagePct - a.minVoltagePct);
    }
  }

  return sorted[sorted.length - 1].minVoltagePct;
}

function ComplianceSummaryTab({ selectedReportView }: { selectedReportView: ComplianceSummaryReportView }) {
  // Shared standards state for PQ Standards and Voltage Dip views
  const [standards, setStandards] = useState<PQBenchmarkStandardMock[]>(() => [
    {
      id: 'std-vd-1',
      name: 'IEC61000-4-34/11',
      family: 'IEC',
      parameter: 'Voltage Dip',
      description: 'IEC voltage dip immunity standard',
      updatedAt: '2011',
      version: '2011',
      category: 'Voltage Dip',
      level: 'All',
      min: 'N/A',
      max: 'N/A',
      unit: '%',
      remarks: 'Standard voltage dip tolerance curve',
      curvePoints: [
        { durationSec: 0.0, minVoltagePct: 40 },
        { durationSec: 0.1, minVoltagePct: 40 },
        { durationSec: 0.2, minVoltagePct: 70 },
        { durationSec: 0.5, minVoltagePct: 70 },
        { durationSec: 1.0, minVoltagePct: 80 }
      ]
    },
    {
      id: 'std-vd-2',
      name: 'SEMI F47',
      family: 'SEMI',
      parameter: 'Voltage Dip',
      description: 'SEMI semiconductor equipment voltage sag immunity',
      updatedAt: '2000',
      version: 'F47',
      category: 'Voltage Dip',
      level: 'All',
      min: 'N/A',
      max: 'N/A',
      unit: '%',
      remarks: 'Semiconductor manufacturing equipment standard',
      curvePoints: [
        { durationSec: 0.0, minVoltagePct: 50 },
        { durationSec: 0.02, minVoltagePct: 50 },
        { durationSec: 0.2, minVoltagePct: 70 },
        { durationSec: 0.5, minVoltagePct: 80 },
        { durationSec: 1.0, minVoltagePct: 90 }
      ]
    },
    {
      id: 'std-vd-3',
      name: 'ITIC',
      family: 'ITIC',
      parameter: 'Voltage Dip',
      description: 'Information Technology Industry Council curve',
      updatedAt: '2000',
      version: '2000',
      category: 'Voltage Dip',
      level: 'All',
      min: 'N/A',
      max: 'N/A',
      unit: '%',
      remarks: 'IT equipment voltage tolerance',
      curvePoints: [
        { durationSec: 0.0, minVoltagePct: 0 },
        { durationSec: 0.02, minVoltagePct: 0 },
        { durationSec: 0.1, minVoltagePct: 70 },
        { durationSec: 0.5, minVoltagePct: 80 },
        { durationSec: 1.0, minVoltagePct: 90 }
      ]
    },
    {
      id: 'std-1',
      name: 'CLP Supply Rules',
      family: 'CLP Supply Rules',
      parameter: '3rd Harmonics',
      description: 'N/A',
      updatedAt: '2001',
      version: '2001',
      category: 'Harmonics (Voltage)',
      level: '11kV',
      min: 'N/A',
      max: '3.0',
      unit: '%',
      remarks: 'N/A',
      curvePoints: []
    },
    {
      id: 'std-2',
      name: 'CLP Supply Rules',
      family: 'CLP Supply Rules',
      parameter: '5th Harmonics',
      description: 'N/A',
      updatedAt: '2001',
      version: '2001',
      category: 'Harmonics (Voltage)',
      level: '11kV',
      min: 'N/A',
      max: '5.0',
      unit: '%',
      remarks: 'N/A',
      curvePoints: []
    },
    {
      id: 'std-3',
      name: 'CLP Supply Rules',
      family: 'CLP Supply Rules',
      parameter: '7th Harmonics',
      description: 'N/A',
      updatedAt: '2001',
      version: '2001',
      category: 'Harmonics (Voltage)',
      level: '11kV',
      min: 'N/A',
      max: '4.0',
      unit: '%',
      remarks: 'N/A',
      curvePoints: []
    },
    {
      id: 'std-4',
      name: 'CLP Supply Rules',
      family: 'CLP Supply Rules',
      parameter: '9th Harmonics',
      description: 'N/A',
      updatedAt: '2001',
      version: '2001',
      category: 'Harmonics (Voltage)',
      level: '11kV',
      min: 'N/A',
      max: '2.5',
      unit: '%',
      remarks: 'N/A',
      curvePoints: []
    },
    {
      id: 'std-5',
      name: 'CLP Supply Rules',
      family: 'CLP Supply Rules',
      parameter: 'Frequency',
      description: 'N/A',
      updatedAt: '2001',
      version: '2001',
      category: 'Voltage / Freq Control',
      level: 'N/A',
      min: '49',
      max: '51',
      unit: 'Hz',
      remarks: 'N/A',
      curvePoints: []
    },
    {
      id: 'std-6',
      name: 'CLP Supply Rules',
      family: 'CLP Supply Rules',
      parameter: 'Voltage Deviation',
      description: 'N/A',
      updatedAt: '2001',
      version: '2001',
      category: 'Voltage / Freq Control',
      level: '11kV',
      min: '-2.5',
      max: '10',
      unit: '%',
      remarks: 'N/A',
      curvePoints: []
    }
  ]);

  // Render appropriate view based on selection
  if (selectedReportView === 'pqStandards') {
    return <PQStandardsView standards={standards} setStandards={setStandards} />;
  }

  if (selectedReportView === 'voltageDipBenchmarking') {
    return <VoltageDipBenchmarkingView standards={standards} />;
  }

  if (selectedReportView === 'individualHarmonics') {
    return <IndividualHarmonicsView />;
  }

  if (selectedReportView === 'en50160') {
    return <EN50160ReportsView />;
  }

  return null;
}

// PQ Standards Report View
function PQStandardsView({ 
  standards, 
  setStandards 
}: { 
  standards: PQBenchmarkStandardMock[]; 
  setStandards: React.Dispatch<React.SetStateAction<PQBenchmarkStandardMock[]>>;
}) {
  const [searchText, setSearchText] = useState('');
  const [searchType, setSearchType] = useState<'standard' | 'parameter'>('standard');
  const [filterFamily, setFilterFamily] = useState<string>('');
  const [filterParameter, setFilterParameter] = useState<BenchmarkParameter | ''>('');

  const uniqueFamilies = useMemo(() => {
    const families = Array.from(new Set(standards.map((s) => s.family)));
    families.sort((a, b) => a.localeCompare(b));
    return families;
  }, [standards]);

  const filteredStandards = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return standards.filter((s) => {
      if (filterFamily && s.family !== filterFamily) return false;
      if (filterParameter && s.parameter !== filterParameter) return false;
      if (q) {
        if (searchType === 'standard') {
          const hay = `${s.name} ${s.family} ${s.description}`.toLowerCase();
          if (!hay.includes(q)) return false;
        } else {
          const hay = s.parameter.toLowerCase();
          if (!hay.includes(q)) return false;
        }
      }
      return true;
    });
  }, [standards, searchText, searchType, filterFamily, filterParameter]);

  const [standardModalOpen, setStandardModalOpen] = useState(false);
  const [standardModalMode, setStandardModalMode] = useState<'create' | 'edit'>('create');
  const [editingStandardId, setEditingStandardId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formFamily, setFormFamily] = useState('IEC');
  const [formParameter, setFormParameter] = useState<BenchmarkParameter>('Voltage Dip');
  const [formDescription, setFormDescription] = useState('');

  const openCreateStandard = () => {
    setStandardModalMode('create');
    setEditingStandardId(null);
    setFormName('');
    setFormFamily('IEC');
    setFormParameter('Voltage Dip');
    setFormDescription('');
    setStandardModalOpen(true);
  };

  const openEditStandard = (standard: PQBenchmarkStandardMock) => {
    setStandardModalMode('edit');
    setEditingStandardId(standard.id);
    setFormName(standard.name);
    setFormFamily(standard.family);
    setFormParameter(standard.parameter as BenchmarkParameter);
    setFormDescription(standard.description);
    setStandardModalOpen(true);
  };

  const saveStandard = () => {
    const name = formName.trim();
    if (!name) {
      alert('Standard Name is required');
      return;
    }

    if (standardModalMode === 'create') {
      const id = `std-${Math.random().toString(16).slice(2)}`;
      const today = new Date();
      const updatedAt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const baseCurve =
        formParameter === 'Voltage Dip'
          ? [
              { durationSec: 0.02, minVoltagePct: 50 },
              { durationSec: 0.20, minVoltagePct: 70 },
              { durationSec: 0.50, minVoltagePct: 80 },
              { durationSec: 1.00, minVoltagePct: 90 }
            ]
          : [];

      setStandards((prev) => [
        {
          id,
          name,
          family: formFamily,
          parameter: formParameter,
          description: formDescription.trim(),
          updatedAt,
          curvePoints: baseCurve
        },
        ...prev
      ]);
    } else if (editingStandardId) {
      const today = new Date();
      const updatedAt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      setStandards((prev) =>
        prev.map((s) =>
          s.id === editingStandardId
            ? {
                ...s,
                name,
                family: formFamily,
                parameter: formParameter,
                description: formDescription.trim(),
                updatedAt
              }
            : s
        )
      );
    }

    setStandardModalOpen(false);
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteStandardId, setDeleteStandardId] = useState<string | null>(null);

  const openDeleteStandard = (standardId: string) => {
    setDeleteStandardId(standardId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteStandardId) return;
    setStandards((prev) => prev.filter((s) => s.id !== deleteStandardId));
    setDeleteModalOpen(false);
    setDeleteStandardId(null);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredStandards.length / itemsPerPage);
  const paginatedStandards = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStandards.slice(start, start + itemsPerPage);
  }, [filteredStandards, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, filterFamily, filterParameter]);

  const handleExport = () => {
    try {
      const exportData = filteredStandards.map(s => ({
        'Standard': s.name,
        'Version': s.version || s.updatedAt,
        'Category': s.category || s.family,
        'Parameter': s.parameter,
        'Level': s.level || 'N/A',
        'Min': s.min || 'N/A',
        'Max': s.max || 'N/A',
        'Unit': s.unit || 'N/A',
        'Remarks': s.remarks || s.description
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'PQ Standards');

      const fileName = `PQ_Standards_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export standards');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-slate-700" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">PQ Standards Report</h2>
            <p className="text-sm text-slate-600 mt-1">Manage power quality standards and benchmarks</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={filteredStandards.length === 0}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export to Excel
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-slate-700">Search By:</label>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as 'standard' | 'parameter')}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="standard">Standard</option>
                <option value="parameter">Parameter</option>
              </select>
            </div>
            
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={searchType === 'standard' ? 'Search standard...' : 'Search parameter...'}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">By Standard</span>
                <select
                  value={filterFamily}
                  onChange={(e) => setFilterFamily(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="">All</option>
                  {uniqueFamilies.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">By Parameter</span>
                <select
                  value={filterParameter}
                  onChange={(e) => setFilterParameter(e.target.value as BenchmarkParameter | '')}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="">All</option>
                  <option value="Voltage Dip">Voltage Dip</option>
                  <option value="Voltage Swell">Voltage Swell</option>
                  <option value="Interruption">Interruption</option>
                </select>
              </div>
              <button
                type="button"
                onClick={openCreateStandard}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add New Standard
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-bold">Standard</th>
                <th className="px-4 py-3 text-left font-bold">Version</th>
                <th className="px-4 py-3 text-left font-bold">Category</th>
                <th className="px-4 py-3 text-left font-bold">Parameter</th>
                <th className="px-4 py-3 text-left font-bold">Level</th>
                <th className="px-4 py-3 text-left font-bold">Min</th>
                <th className="px-4 py-3 text-left font-bold">Max</th>
                <th className="px-4 py-3 text-left font-bold">Unit</th>
                <th className="px-4 py-3 text-left font-bold">Remarks</th>
                <th className="px-4 py-3 text-center font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStandards.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    No standards found. Create a new standard to get started.
                  </td>
                </tr>
              ) : (
                paginatedStandards.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-900 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{s.version || s.updatedAt}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{s.category || s.family}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{s.parameter}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{s.level || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{s.min || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{s.max || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{s.unit || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{s.remarks || s.description}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditStandard(s)}
                          className="p-2 hover:bg-blue-100 rounded-lg text-blue-600"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteStandard(s.id)}
                          className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {filteredStandards.length > 0 && (
            <div className="px-4 py-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600">
              <div>
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredStandards.length)} of {filteredStandards.length} standards
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  Previous
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {standardModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                {standardModalMode === 'create' ? 'Add New Standard' : 'Edit Standard'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Standard Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="e.g. IEC 61000-4-30"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Family</label>
                <select
                  value={formFamily}
                  onChange={(e) => setFormFamily(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="IEC">IEC</option>
                  <option value="SEMI">SEMI</option>
                  <option value="ITIC">ITIC</option>
                  <option value="CLP Supply Rules">CLP Supply Rules</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Parameter</label>
                <select
                  value={formParameter}
                  onChange={(e) => setFormParameter(e.target.value as BenchmarkParameter)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="Voltage Dip">Voltage Dip</option>
                  <option value="Voltage Swell">Voltage Swell</option>
                  <option value="Interruption">Interruption</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="Optional description..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStandardModalOpen(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveStandard}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
              >
                {standardModalMode === 'create' ? 'Create' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Standard</h3>
                  <p className="text-sm text-slate-600">
                    Are you sure you want to delete this standard? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Voltage Dip Benchmarking View (from old Benchmarking tab)
function VoltageDipBenchmarkingView({ standards }: { standards: PQBenchmarkStandardMock[] }) {
  const voltageDipStandards = useMemo(
    () => standards.filter((s) => s.parameter === 'Voltage Dip'),
    [standards]
  );

  const [selectedStandardId, setSelectedStandardId] = useState<string>(() => voltageDipStandards[0]?.id ?? '');
  useEffect(() => {
    if (!selectedStandardId && voltageDipStandards.length > 0) {
      setSelectedStandardId(voltageDipStandards[0].id);
    }
  }, [selectedStandardId, voltageDipStandards]);

  const selectedStandard = useMemo(
    () => standards.find((s) => s.id === selectedStandardId) ?? null,
    [standards, selectedStandardId]
  );

  const [vdStartDate, setVdStartDate] = useState('2025/01/01');
  const [vdEndDate, setVdEndDate] = useState('2025/12/30');
  const [vdStartOpen, setVdStartOpen] = useState(false);
  const [vdEndOpen, setVdEndOpen] = useState(false);
  const [vdHasResult, setVdHasResult] = useState(false);

  const [meterSelectMode, setMeterSelectMode] = useState<'voltageLevel' | 'individual'>('voltageLevel');
  const [selectedVoltageLevels, setSelectedVoltageLevels] = useState<string[]>(['400KV']);
  const [selectedMeterIds, setSelectedMeterIds] = useState<Set<string>>(new Set());
  const [meterSearch, setMeterSearch] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [selectedStandardForChart, setSelectedStandardForChart] = useState<string>(() => voltageDipStandards[0]?.id || '');

  const toggleVoltageLevel = (level: string) => {
    setSelectedVoltageLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const allVdMeters = useMemo(() => {
    const levels = ['400KV', '132KV', '33KV', '11KV', '380V'] as const;
    const meters: Array<{ id: string; voltageLevel: string }> = [];
    for (let i = 0; i < 200; i++) {
      const level = levels[i % levels.length];
      const code = String(i).padStart(4, '0');
      meters.push({
        id: `PQMS_${level}.SITE${code}`,
        voltageLevel: level
      });
    }
    return meters;
  }, []);

  const filteredVdMeters = useMemo(() => {
    const q = meterSearch.trim().toLowerCase();
    if (!q) return allVdMeters.slice(0, 50);
    return allVdMeters.filter(m => m.id.toLowerCase().includes(q)).slice(0, 50);
  }, [allVdMeters, meterSearch]);

  const toggleMeter = (meterId: string) => {
    setSelectedMeterIds(prev => {
      const next = new Set(prev);
      if (next.has(meterId)) {
        next.delete(meterId);
      } else {
        next.add(meterId);
      }
      return next;
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (vdStartOpen && !target.closest('.vd-start-date-container')) setVdStartOpen(false);
      if (vdEndOpen && !target.closest('.vd-end-date-container')) setVdEndOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [vdStartOpen, vdEndOpen]);

  const mockVoltageDipEvents = useMemo<VoltageDipBenchmarkEventMock[]>(
    () => [
      { id: 'vd-001', groupId: '20250605001_HIGH', meter: 'PQMS_11KV.PGH0377_J11', timestamp: '2025-06-05 00:12:40', location: 'PGH - Peng Chau', durationSec: 0.080, remainingVoltagePct: 52.166 },
      { id: 'vd-002', groupId: '20250924020_HIGH', meter: 'PQMS_11KV.PGH0377_J11', timestamp: '2025-09-24 02:03:12', location: 'PGH - Peng Chau', durationSec: 0.282, remainingVoltagePct: 58.247 },
      { id: 'vd-003', groupId: '20250924038_HIGH', meter: 'PQMS_11KV.NTK0318_J11', timestamp: '2025-09-24 03:44:03', location: 'NTK - Nam Tong Kong', durationSec: 0.080, remainingVoltagePct: 62.374 },
      { id: 'vd-004', groupId: '20250924030_HIGH', meter: 'PQMS_11KV.PGS0241_J11', timestamp: '2025-09-24 03:25:22', location: 'PGS - Peng Chau Sub', durationSec: 0.080, remainingVoltagePct: 62.614 },
      { id: 'vd-005', groupId: '20250908001_HIGH', meter: 'PQMS_11KV.SMR0060_H2', timestamp: '2025-09-08 00:22:10', location: 'SMR - Siu Ma Rd', durationSec: 0.100, remainingVoltagePct: 76.678 },
      { id: 'vd-006', groupId: '20250924013_HIGH', meter: 'PQMS_11KV.HUV0365_J11', timestamp: '2025-09-24 01:15:33', location: 'HUV - Hau Uk Village', durationSec: 0.081, remainingVoltagePct: 83.588 },
      { id: 'vd-007', groupId: '20250924073_HIGH', meter: 'PQMS_11KV.ETN0254_J11', timestamp: '2025-09-24 07:32:54', location: 'ETN - Eastern Tunnel', durationSec: 0.041, remainingVoltagePct: 89.619 },
      { id: 'vd-008', groupId: '20250908001_HIGH', meter: 'PQMS_400KV.BKP0227_SHE1', timestamp: '2025-09-08 00:25:45', location: 'BKP - Bak Ping', durationSec: 0.039, remainingVoltagePct: 84.294 },
      { id: 'vd-009', groupId: '20250924037_HIGH', meter: 'PQMS_400KV.BKP0227_SHE1', timestamp: '2025-09-24 03:42:22', location: 'BKP - Bak Ping', durationSec: 0.071, remainingVoltagePct: 67.42 },
      { id: 'vd-010', groupId: '20250924013_HIGH', meter: 'PQMS_400KV.BKP0227_SHE1', timestamp: '2025-09-24 01:15:33', location: 'BKP - Bak Ping', durationSec: 0.067, remainingVoltagePct: 74.987 },
      { id: 'vd-011', groupId: '20250605001_HIGH', meter: 'PQMS_400KV.BKP0227_SHE1', timestamp: '2025-06-05 00:12:40', location: 'BKP - Bak Ping', durationSec: 10.329, remainingVoltagePct: 0 },
      { id: 'vd-012', groupId: '20250924020_HIGH', meter: 'PQMS_400KV.BKP0227_SHE1', timestamp: '2025-09-24 02:03:12', location: 'BKP - Bak Ping', durationSec: 10.33, remainingVoltagePct: 0 },
      { id: 'vd-013', groupId: '20250924030_HIGH', meter: 'PQMS_400KV.BKP0256_CPK1', timestamp: '2025-09-24 03:25:22', location: 'CPK - Castle Peak', durationSec: 0.09, remainingVoltagePct: 64.817 },
      { id: 'vd-014', groupId: '20250924030_HIGH', meter: 'PQMS_400KV.BKP0256_CPK1', timestamp: '2025-09-24 03:35:10', location: 'CPK - Castle Peak', durationSec: 0.081, remainingVoltagePct: 67.396 }
    ],
    []
  );

  const voltageDipResults = useMemo(() => {
    if (!vdHasResult || !selectedStandard) return [] as Array<VoltageDipBenchmarkEventMock & { requiredPct: number; pass: boolean }>;
    const curve = selectedStandard.curvePoints;
    
    // Filter events based on selection mode
    let filteredEvents = mockVoltageDipEvents;
    if (meterSelectMode === 'voltageLevel' && selectedVoltageLevels.length > 0) {
      filteredEvents = mockVoltageDipEvents;
    } else if (meterSelectMode === 'individual' && selectedMeterIds.size > 0) {
      filteredEvents = mockVoltageDipEvents.filter(e => selectedMeterIds.has(e.meter || ''));
    }
    
    return filteredEvents.map((e) => {
      const requiredPct = getVoltageRequirementAtDuration(curve, e.durationSec);
      const pass = e.remainingVoltagePct >= requiredPct;
      return { ...e, requiredPct, pass };
    });
  }, [vdHasResult, selectedStandard, mockVoltageDipEvents, meterSelectMode, selectedVoltageLevels, selectedMeterIds]);

  const filteredResults = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return voltageDipResults;
    return voltageDipResults.filter(r => 
      r.meter?.toLowerCase().includes(q) || 
      r.groupId?.toLowerCase().includes(q) ||
      r.timestamp.toLowerCase().includes(q)
    );
  }, [voltageDipResults, tableSearch]);

  const vdSummary = useMemo(() => {
    const total = voltageDipResults.length;
    const pass = voltageDipResults.filter((r) => r.pass).length;
    const fail = total - pass;
    const passRate = total > 0 ? Math.round((pass / total) * 1000) / 10 : 0;
    return { total, pass, fail, passRate };
  }, [voltageDipResults]);

  const handleCopyTable = () => {
    const headers = meterSelectMode === 'voltageLevel' 
      ? ['groupid', 'meter', 'Duration (s)', 'Vmin (%)']
      : ['timestamp', 'meter', 'Duration (s)', 'Vmin (%)'];
    
    const rows = filteredResults.map(r => {
      if (meterSelectMode === 'voltageLevel') {
        return [r.groupId, r.meter, r.durationSec.toFixed(3), r.remainingVoltagePct.toFixed(3)];
      } else {
        return [r.timestamp, r.meter, r.durationSec.toFixed(3), r.remainingVoltagePct.toFixed(3)];
      }
    });
    
    const tsv = [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv);
    alert('Table copied to clipboard!');
  };

  const handleExportCSV = () => {
    const headers = meterSelectMode === 'voltageLevel'
      ? ['groupid', 'meter', 'Duration (s)', 'Vmin (%)']
      : ['timestamp', 'meter', 'Duration (s)', 'Vmin (%)'];
    
    const rows = filteredResults.map(r => {
      if (meterSelectMode === 'voltageLevel') {
        return [r.groupId, r.meter, r.durationSec.toFixed(3), r.remainingVoltagePct.toFixed(3)];
      } else {
        return [r.timestamp, r.meter, r.durationSec.toFixed(3), r.remainingVoltagePct.toFixed(3)];
      }
    });
    
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voltage_dip_benchmark_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-slate-700" />
        <div>
          <h2 className="text-xl font-bold text-slate-900">Voltage Dip Benchmarking</h2>
          <p className="text-sm text-slate-600 mt-1">Compare voltage dip events against compliance curves</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-1 bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-5">1. Select meter(s) from the list:</h3>
          
          <div className="space-y-4 mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="vd_meter_select"
                checked={meterSelectMode === 'voltageLevel'}
                onChange={() => setMeterSelectMode('voltageLevel')}
                className="text-blue-600"
              />
              <span className="text-sm font-semibold text-slate-700">By Voltage Level of Mother Event</span>
            </label>
            
            {meterSelectMode === 'voltageLevel' && (
              <div className="ml-6 space-y-2">
                {['400KV', '132KV', '33KV', '11KV', '380V'].map((level) => (
                  <label key={level} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedVoltageLevels.includes(level)}
                      onChange={() => toggleVoltageLevel(level)}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-slate-700">{level}</span>
                  </label>
                ))}
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="vd_meter_select"
                checked={meterSelectMode === 'individual'}
                onChange={() => setMeterSelectMode('individual')}
                className="text-blue-600"
              />
              <span className="text-sm font-semibold text-slate-700">By Individual Meters</span>
            </label>

            {meterSelectMode === 'individual' && (
              <div className="ml-6 space-y-2">
                <input
                  type="text"
                  value={meterSearch}
                  onChange={(e) => setMeterSearch(e.target.value)}
                  placeholder="Search meters..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                  {filteredVdMeters.map((meter) => (
                    <label key={meter.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-blue-50 rounded">
                      <input
                        type="checkbox"
                        checked={selectedMeterIds.has(meter.id)}
                        onChange={() => toggleMeter(meter.id)}
                        className="text-blue-600"
                      />
                      <span className="text-xs text-slate-700">{meter.id}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-4">2. Set time range: (Max. of 1 year)</h3>
          <div className="space-y-3 mb-6">
            <div className="relative vd-start-date-container">
              <label className="block text-sm font-semibold text-slate-700 mb-1">From</label>
              <input
                type="text"
                value={vdStartDate}
                onFocus={() => setVdStartOpen(true)}
                onChange={(e) => setVdStartDate(e.target.value)}
                placeholder="YYYY/MM/DD"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              {vdStartOpen && (
                <DatePickerPopover
                  value={vdStartDate}
                  onChange={setVdStartDate}
                  onClose={() => setVdStartOpen(false)}
                />
              )}
            </div>
            <div className="relative vd-end-date-container">
              <label className="block text-sm font-semibold text-slate-700 mb-1">To</label>
              <input
                type="text"
                value={vdEndDate}
                onFocus={() => setVdEndOpen(true)}
                onChange={(e) => setVdEndDate(e.target.value)}
                placeholder="YYYY/MM/DD"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              {vdEndOpen && (
                <DatePickerPopover
                  value={vdEndDate}
                  onChange={setVdEndDate}
                  onClose={() => setVdEndOpen(false)}
                />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setVdHasResult(true)}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm"
          >
            GET BENCHMARK RESULT
          </button>
        </div>

        <div className="xl:col-span-3 bg-white border border-slate-200 rounded-2xl p-6">
          {!vdHasResult && (
            <div className="flex items-center justify-center py-20">
              <p className="text-slate-500">Select meter(s), set time range, and click "GET BENCHMARK RESULT"</p>
            </div>
          )}

          {vdHasResult && selectedStandard && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Voltage Dip Benchmarking</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Type of Selection:</span>
                  <span className="text-sm font-bold text-slate-900">
                    {meterSelectMode === 'voltageLevel' ? 'Voltage Level' : 'Meter'}
                  </span>
                </div>
              </div>

              {/* Chart Visualization */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 relative">
                <div className="text-center mb-4">
                  <h4 className="text-sm font-bold text-slate-700">Voltage Dip Benchmarking</h4>
                </div>
                
                {/* SVG Chart */}
                <svg viewBox="0 0 800 500" className="w-full h-auto">
                  {/* Grid lines */}
                  <defs>
                    <pattern id="grid" width="80" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 80 0 L 0 0 0 50" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect x="60" y="20" width="720" height="400" fill="url(#grid)" />
                  
                  {/* White background */}
                  <rect x="60" y="20" width="720" height="400" fill="white" />
                  
                  {/* Axes */}
                  <line x1="60" y1="420" x2="780" y2="420" stroke="#1e293b" strokeWidth="2" />
                  <line x1="60" y1="20" x2="60" y2="420" stroke="#1e293b" strokeWidth="2" />
                  
                  {/* Y-axis labels (Voltage %) */}
                  {[0, 20, 40, 60, 80, 100].map((val) => {
                    const y = 420 - (val * 4);
                    return (
                      <g key={val}>
                        <line x1="55" y1={y} x2="60" y2={y} stroke="#1e293b" strokeWidth="2" />
                        <text x="45" y={y + 4} textAnchor="end" fontSize="12" fill="#1e293b">{val}</text>
                      </g>
                    );
                  })}
                  <text x="20" y="220" textAnchor="middle" fontSize="14" fill="#1e293b" fontWeight="bold" transform="rotate(-90 20 220)">
                    Voltage %
                  </text>
                  
                  {/* X-axis labels (Duration) */}
                  {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((val) => {
                    const x = 60 + (val * 720);
                    return (
                      <g key={val}>
                        <line x1={x} y1="420" x2={x} y2="425" stroke="#1e293b" strokeWidth="2" />
                        <text x={x} y="440" textAnchor="middle" fontSize="12" fill="#1e293b">{val.toFixed(1)}</text>
                      </g>
                    );
                  })}
                  <text x="420" y="470" textAnchor="middle" fontSize="14" fill="#1e293b" fontWeight="bold">
                    Duration (s)
                  </text>
                  
                  {/* Render benchmark curves as right-angled step functions */}
                  {voltageDipStandards.filter(std => std.id === selectedStandardForChart).map((std) => {
                    const curvePoints = std.curvePoints.map(pt => ({
                      x: 60 + (Math.min(pt.durationSec, 1.0) * 720),
                      y: 420 - (pt.minVoltagePct * 4)
                    }));
                    
                    // Create right-angled step path (horizontal then vertical)
                    const pathSegments = [];
                    pathSegments.push(`M ${curvePoints[0].x} ${curvePoints[0].y}`);
                    
                    for (let i = 1; i < curvePoints.length; i++) {
                      // Draw horizontal line to next x position
                      pathSegments.push(`L ${curvePoints[i].x} ${curvePoints[i - 1].y}`);
                      // Draw vertical line to next y position
                      pathSegments.push(`L ${curvePoints[i].x} ${curvePoints[i].y}`);
                    }
                    
                    // Extend to right edge
                    pathSegments.push(`L 780 ${curvePoints[curvePoints.length - 1].y}`);
                    
                    const linePath = pathSegments.join(' ');
                    
                    // Create shaded area below curve
                    const areaPath = [
                      `M 60 420`,
                      `L 60 ${curvePoints[0].y}`,
                      ...pathSegments.slice(1),
                      `L 780 420`,
                      'Z'
                    ].join(' ');
                    
                    return (
                      <g key={std.id}>
                        {/* Shaded area */}
                        <path
                          d={areaPath}
                          fill="#10b981"
                          fillOpacity="0.2"
                        />
                        {/* Curve line */}
                        <path
                          d={linePath}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3"
                        />
                      </g>
                    );
                  })}
                  
                  {/* Data points - red dots for all events */}
                  {voltageDipResults.map((result) => {
                    const x = 60 + Math.min(result.durationSec, 1.0) * 720;
                    const y = 420 - (result.remainingVoltagePct * 4);
                    return (
                      <circle
                        key={result.id}
                        cx={x}
                        cy={y}
                        r="4"
                        fill="#dc2626"
                        stroke="#1e293b"
                        strokeWidth="1"
                      />
                    );
                  })}
                  
                  {/* Note at bottom */}
                  <text x="420" y="495" textAnchor="middle" fontSize="11" fill="#64748b" fontStyle="italic">
                    * Each point represents an event group (power system fault). Select point to show voltage dip details
                  </text>
                </svg>

                {/* Legend */}
                <div className="absolute top-8 right-8 bg-white border border-slate-300 rounded-lg p-3 shadow-lg">
                  <div className="space-y-2">
                    {voltageDipStandards.map((std) => (
                      <label key={std.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="voltage-dip-standard"
                          checked={selectedStandardForChart === std.id}
                          onChange={() => setSelectedStandardForChart(std.id)}
                          className="text-blue-600"
                        />
                        <span className="text-xs text-slate-700">{std.name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="text-xs text-slate-500">
                      * Green point represents real 380V PQ meter.<br/>
                      * Red point represents 11kV PQ meter (converted to 380V level).
                    </div>
                  </div>
                </div>

                {/* Summary table in chart */}
                <div className="absolute bottom-8 right-8 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                  <table className="text-xs">
                    <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                      <tr>
                        <th className="px-3 py-1 text-left font-bold">Curve</th>
                        <th className="px-3 py-1 text-center font-bold">Passed</th>
                        <th className="px-3 py-1 text-center font-bold">Failed</th>
                        <th className="px-3 py-1 text-center font-bold">% Fail</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      <tr>
                        <td className="px-3 py-1 text-slate-700">{selectedStandard.name}</td>
                        <td className="px-3 py-1 text-center text-green-600 font-bold">{vdSummary.pass}</td>
                        <td className="px-3 py-1 text-center text-red-600 font-bold">{vdSummary.fail}</td>
                        <td className="px-3 py-1 text-center text-slate-700 font-bold">
                          {vdSummary.total > 0 ? ((vdSummary.fail / vdSummary.total) * 100).toFixed(1) : '0.0'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Results table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Search..."
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-64"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyTable}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold border border-slate-300"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold border border-slate-300"
                    >
                      CSV
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-700 text-white">
                      <tr>
                        {meterSelectMode === 'voltageLevel' && (
                          <th className="px-3 py-2 text-left font-bold">groupid</th>
                        )}
                        {meterSelectMode === 'individual' && (
                          <th className="px-3 py-2 text-left font-bold">timestamp</th>
                        )}
                        <th className="px-3 py-2 text-left font-bold">meter</th>
                        <th className="px-3 py-2 text-right font-bold">Duration (s)</th>
                        <th className="px-3 py-2 text-right font-bold">Vmin (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredResults.map((result) => (
                        <tr key={result.id} className="hover:bg-blue-50">
                          {meterSelectMode === 'voltageLevel' && (
                            <td className="px-3 py-2 text-slate-700">{result.groupId}</td>
                          )}
                          {meterSelectMode === 'individual' && (
                            <td className="px-3 py-2 text-slate-700">{result.timestamp}</td>
                          )}
                          <td className="px-3 py-2 text-slate-700 font-mono text-xs">{result.meter}</td>
                          <td className="px-3 py-2 text-slate-700 text-right">{result.durationSec.toFixed(3)}</td>
                          <td className="px-3 py-2 text-slate-700 text-right">{result.remainingVoltagePct.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-slate-50 px-4 py-2 text-sm text-slate-600 border-t border-slate-200">
                  Showing 1 to {filteredResults.length} of {filteredResults.length} entries
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Individual Harmonic Reports View
function IndividualHarmonicsView() {
  const [selectedMeter, setSelectedMeter] = useState('');
  const [selectedHarmonicType, setSelectedHarmonicType] = useState<HarmonicType>('V1_HD');
  const [dateFrom, setDateFrom] = useState('2025/01/01');
  const [dateTo, setDateTo] = useState('2025/12/31');
  const [hasData, setHasData] = useState(false);

  const harmonicTypes: Array<{ type: HarmonicType; label: string }> = [
    { type: 'V1_HD', label: 'V1 HD' },
    { type: 'V2_HD', label: 'V2 HD' },
    { type: 'V3_HD', label: 'V3 HD' },
    { type: 'I1_HD', label: 'I1 HD' },
    { type: 'I2_HD', label: 'I2 HD' },
    { type: 'I3_HD', label: 'I3 HD' }
  ];

  // Mock harmonic data
  const mockHarmonicData = useMemo<HarmonicDataRecord[]>(() => [
    { timestamp: '2025-01-15 10:00:00', order: 3, magnitude: 2.5, angle: 120.3, thd: 3.2 },
    { timestamp: '2025-01-15 10:15:00', order: 5, magnitude: 1.8, angle: 95.7, thd: 2.9 },
    { timestamp: '2025-01-15 10:30:00', order: 7, magnitude: 1.2, angle: 78.4, thd: 2.5 },
    { timestamp: '2025-01-15 10:45:00', order: 9, magnitude: 0.9, angle: 62.1, thd: 2.3 },
    { timestamp: '2025-01-15 11:00:00', order: 11, magnitude: 0.7, angle: 45.8, thd: 2.1 },
    { timestamp: '2025-01-15 11:15:00', order: 13, magnitude: 0.5, angle: 30.2, thd: 1.9 }
  ], []);

  const handleGenerate = () => {
    if (!selectedMeter) {
      alert('Please select a meter');
      return;
    }
    setHasData(true);
  };

  const handleExportCSV = () => {
    try {
      const exportData = mockHarmonicData.map(d => ({
        'Timestamp': d.timestamp,
        'Harmonic Order': `${d.order}th`,
        'Magnitude': d.magnitude.toFixed(2),
        'Angle (degrees)': d.angle.toFixed(1),
        'THD (%)': d.thd.toFixed(1)
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, selectedHarmonicType);

      const fileName = `Individual_Harmonic_${selectedHarmonicType}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-slate-700" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">Individual Harmonic Reports</h2>
            <p className="text-sm text-slate-600 mt-1">Detailed harmonic analysis for voltage and current</p>
          </div>
        </div>

        {hasData && (
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        )}
      </div>

      {/* Meter Selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Select Meter</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Meter</label>
            <select
              value={selectedMeter}
              onChange={(e) => setSelectedMeter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">Select a meter...</option>
              <option value="PQMS_400KV_BKP0227">PQMS_400KV_BKP0227</option>
              <option value="PQMS_132KV_CPK0256">PQMS_132KV_CPK0256</option>
              <option value="PQMS_11KV_TST0015">PQMS_11KV_TST0015</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Date From</label>
            <input
              type="text"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="YYYY/MM/DD"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Date To</label>
            <input
              type="text"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="YYYY/MM/DD"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
        >
          Generate Report
        </button>
      </div>

      {/* Harmonic Type Selector */}
      {hasData && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Individual Harmonics</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {harmonicTypes.map((ht) => (
                <button
                  key={ht.type}
                  type="button"
                  onClick={() => setSelectedHarmonicType(ht.type)}
                  className={classNames(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                    selectedHarmonicType === ht.type
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-blue-300'
                  )}
                >
                  <BarChart3 className={classNames(
                    'w-8 h-8',
                    selectedHarmonicType === ht.type ? 'text-blue-600' : 'text-slate-400'
                  )} />
                  <span className={classNames(
                    'text-sm font-bold',
                    selectedHarmonicType === ht.type ? 'text-blue-600' : 'text-slate-700'
                  )}>
                    {ht.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Harmonic Data Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                {harmonicTypes.find(ht => ht.type === selectedHarmonicType)?.label} - Harmonic Data
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold">Timestamp</th>
                    <th className="px-4 py-3 text-left font-bold">Harmonic Order</th>
                    <th className="px-4 py-3 text-right font-bold">Magnitude</th>
                    <th className="px-4 py-3 text-right font-bold">Angle (°)</th>
                    <th className="px-4 py-3 text-right font-bold">THD (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mockHarmonicData.map((record, idx) => (
                    <tr key={idx} className="hover:bg-blue-50">
                      <td className="px-4 py-3 text-sm text-slate-700">{record.timestamp}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{record.order}th</td>
                      <td className="px-4 py-3 text-sm text-slate-700 text-right">{record.magnitude.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 text-right">{record.angle.toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 text-right">{record.thd.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// EN50160 Reports View
function EN50160ReportsView() {
  const [selectedMeter, setSelectedMeter] = useState('');
  const [reportPeriod, setReportPeriod] = useState('week');
  const [hasData, setHasData] = useState(false);

  // Mock EN50160 compliance data
  const mockEN50160Data = useMemo<EN50160Parameter[]>(() => [
    { parameter: 'V-Magnitude (Supply Voltage Variations)', limit: '±10%', actualValue: '8.2%', result: 'Pass' },
    { parameter: 'Frequency', limit: '50Hz ±1%', actualValue: '49.95Hz', result: 'Pass' },
    { parameter: 'V-Unbalance (Negative Sequence)', limit: '<2%', actualValue: '0.8%', result: 'Pass' },
    { parameter: 'Flicker (Pst - Short-term)', limit: '<1.0', actualValue: '0.7', result: 'Pass' },
    { parameter: 'Flicker (Plt - Long-term)', limit: '<0.8', actualValue: '0.6', result: 'Pass' },
    { parameter: 'Voltage THD (Total Harmonic Distortion)', limit: '<8%', actualValue: '4.2%', result: 'Pass' },
    { parameter: 'Voltage TEHD (Total Even Harmonic)', limit: '<2%', actualValue: '0.5%', result: 'Pass' },
    { parameter: 'Voltage TOHD (Total Odd Harmonic)', limit: '<5%', actualValue: '3.8%', result: 'Pass' }
  ], []);

  const handleGenerate = () => {
    if (!selectedMeter) {
      alert('Please select a meter');
      return;
    }
    setHasData(true);
  };

  const handleExportCSV = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Summary header
      const summary = [
        ['EN 50160 Compliance Report'],
        ['Meter:', selectedMeter],
        ['Report Period:', reportPeriod],
        ['Generated:', new Date().toLocaleString()],
        [],
        ['Parameter', 'EN 50160 Limit', 'Actual Value', 'Result']
      ];

      const ws = XLSX.utils.aoa_to_sheet(summary);
      const dataRows = mockEN50160Data.map(d => [d.parameter, d.limit, d.actualValue, d.result]);
      XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: -1 });
      
      XLSX.utils.book_append_sheet(wb, ws, 'EN50160 Report');

      const fileName = `EN50160_Compliance_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export report');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-slate-700" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">EN 50160 Reports</h2>
            <p className="text-sm text-slate-600 mt-1">European standard for voltage characteristics compliance</p>
          </div>
        </div>

        {hasData && (
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        )}
      </div>

      {/* Meter and Period Selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Generate EN 50160 Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Select Meter</label>
            <select
              value={selectedMeter}
              onChange={(e) => setSelectedMeter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">Choose a meter...</option>
              <option value="PQMS_400KV_BKP0227">PQMS_400KV_BKP0227</option>
              <option value="PQMS_132KV_CPK0256">PQMS_132KV_CPK0256</option>
              <option value="PQMS_11KV_TST0015">PQMS_11KV_TST0015</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Report Period</label>
            <select
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
        >
          Generate Report
        </button>
      </div>

      {/* EN50160 Compliance Table */}
      {hasData && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">EN 50160 Compliance Summary</h3>
            <p className="text-sm text-slate-600 mt-1">Meter: {selectedMeter} | Period: {reportPeriod}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">Parameter</th>
                  <th className="px-4 py-3 text-left font-bold">EN 50160 Limit</th>
                  <th className="px-4 py-3 text-left font-bold">Actual Value</th>
                  <th className="px-4 py-3 text-center font-bold">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mockEN50160Data.map((record, idx) => (
                  <tr key={idx} className="hover:bg-blue-50">
                    <td className="px-4 py-3 text-sm text-slate-900 font-medium">{record.parameter}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{record.limit}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{record.actualValue}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={classNames(
                        'inline-flex px-3 py-1 rounded-full text-xs font-bold',
                        record.result === 'Pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}>
                        {record.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              <strong>Overall Compliance:</strong> <span className="text-green-700 font-bold">All parameters passed</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function MeterCommunicationTab() {
  type MeterSelectMode = 'all' | 'byMeter' | 'byLevel' | 'bySubstation' | 'others';
  
  const [selectMode, setSelectMode] = useState<MeterSelectMode>('all');
  const [fromDate, setFromDate] = useState('2025/12/15');
  const [toDate, setToDate] = useState('2025/12/16');
  const [fromHour, setFromHour] = useState('00');
  const [toHour, setToHour] = useState('23');
  const [hasResults, setHasResults] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterBelow100, setFilterBelow100] = useState(false);

  type AvailabilityRecord = {
    siteId: string;
    name: string;
    count: number;
    availability: number;
  };

  const mockResults: AvailabilityRecord[] = useMemo(() => [
    { siteId: '00a690f2', name: 'PQM-CLR-398', count: 48, availability: 100.00 },
    { siteId: '027dd41e', name: 'PQM-AWR-188', count: 48, availability: 100.00 },
    { siteId: '03e1b741', name: 'PQM-CTN-066', count: 48, availability: 100.00 },
    { siteId: '063a54c5', name: 'PQM-CPK-072', count: 48, availability: 100.00 },
    { siteId: '09b5f7ad', name: 'PQM-BCH-548', count: 36, availability: 75.00 },
    { siteId: '0a1db52d', name: 'PQM-BOU-383', count: 48, availability: 100.00 },
    { siteId: '0ca5d549', name: 'PQM-APA-153', count: 34, availability: 70.83 },
    { siteId: '0ee3f385', name: 'PQM-CAN-246', count: 36, availability: 75.00 },
    { siteId: '0fbb8572', name: 'PQM-AWR-823', count: 48, availability: 100.00 },
    { siteId: '1248c80d', name: 'PQM-AWR-108', count: 48, availability: 100.00 },
    { siteId: '1580b5be', name: 'PQM-CCS-767', count: 48, availability: 100.00 },
    { siteId: '186120a1', name: 'PQM-AUS-447', count: 48, availability: 100.00 }
  ], []);

  const filteredResults = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return mockResults.filter(r => {
      if (filterBelow100 && r.availability >= 100) return false;
      if (q && !r.siteId.toLowerCase().includes(q) && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [mockResults, searchText, filterBelow100]);

  const totalSites = 90;
  const expectedCount = 48;
  const totalAvailability = 93.33;

  return (
    <div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Meter Communication</h2>
        <p className="text-slate-600 mt-1">Monitor meter availability and communication status.</p>
      </div>

      <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Availability Report Filters</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3">
              <Filter className="w-4 h-4" />
              Select Meter/s:
            </label>
            <div className="space-y-2">
              {([
                { id: 'all', label: 'All' },
                { id: 'byMeter', label: 'By Meter' },
                { id: 'byLevel', label: 'By Level' },
                { id: 'bySubstation', label: 'By Substation' },
                { id: 'others', label: 'Others' }
              ] as const).map(opt => (
                <label key={opt.id} className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="meter_select_mode"
                    checked={selectMode === opt.id}
                    onChange={() => setSelectMode(opt.id)}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3">
              <Calendar className="w-4 h-4" />
              Time Range:
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">From:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={fromDate.replace(/\//g, '-')}
                    onChange={(e) => setFromDate(e.target.value.replace(/-/g, '/'))}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <select value={fromHour} onChange={(e) => setFromHour(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                    {Array.from({ length: 24 }, (_, i) => pad2(i)).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">To:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={toDate.replace(/\//g, '-')}
                    onChange={(e) => setToDate(e.target.value.replace(/-/g, '/'))}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <select value={toHour} onChange={(e) => setToHour(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                    {Array.from({ length: 24 }, (_, i) => pad2(i)).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setHasResults(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
          >
            Get Availability Report
          </button>
          <button
            type="button"
            onClick={() => setHasResults(false)}
            className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold"
          >
            Reset
          </button>
        </div>
      </div>

      {hasResults && (
        <div className="mt-6 grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-1 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-700 uppercase">From:</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{fromDate.replace(/\//g, '-')}</p>
              <p className="text-sm text-slate-600">{fromHour}:00</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-700 uppercase">To:</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{toDate.replace(/\//g, '-')}</p>
              <p className="text-sm text-slate-600">{toHour}:59</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-600 uppercase">Total Sites</p>
              <p className="text-4xl font-extrabold text-slate-900 mt-2">{totalSites}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-600 uppercase">Expected Count</p>
              <p className="text-4xl font-extrabold text-slate-900 mt-2">{expectedCount}</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs font-bold text-green-700 uppercase">Total Availability</p>
              <p className="text-4xl font-extrabold text-green-800 mt-2">{totalAvailability}%</p>
            </div>
          </div>

          <div className="xl:col-span-3 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search by SiteID or Name"
                    className="pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm w-64"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFilterBelow100(!filterBelow100)}
                  className={classNames(
                    'px-3 py-2 rounded-lg text-sm font-semibold border transition-colors',
                    filterBelow100 ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  &lt;100%
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-sm flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                <button
                  type="button"
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="text-left text-xs font-bold px-4 py-3">SiteID ↑</th>
                    <th className="text-left text-xs font-bold px-4 py-3">Name</th>
                    <th className="text-left text-xs font-bold px-4 py-3">Count</th>
                    <th className="text-left text-xs font-bold px-4 py-3">Availability (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResults.map(r => (
                    <tr key={r.siteId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700">{r.siteId}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{r.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{r.count}</td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        <div className="flex items-center gap-2">
                          {r.availability >= 100 ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <X className="w-4 h-4 text-red-600" />
                          )}
                          <span className={r.availability >= 100 ? 'text-green-700' : 'text-red-700'}>
                            {r.availability.toFixed(2)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// @ts-ignore - Old tab function kept for reference
function VoltageCurrentProfileTab() {
  type DataTypeMode = 'voltage' | 'current';
  type SelectDataMode = 'dailyAvg' | 'rawData';
  type MeterSelectMode = 'all' | '400KV' | '132KV' | '33KV' | '11KV' | '380V';

  const [dataType, setDataType] = useState<DataTypeMode>('voltage');
  const [selectDataMode, setSelectDataMode] = useState<SelectDataMode>('dailyAvg');
  const [meterSelectMode, setMeterSelectMode] = useState<MeterSelectMode>('all');
  const [selectedMeterIds, setSelectedMeterIds] = useState<Set<string>>(new Set());
  const [searchMeter, setSearchMeter] = useState('');
  const [fromDate, setFromDate] = useState('2025/01/01');
  const [toDate, setToDate] = useState('2025/12/29');
  const [hasResults, setHasResults] = useState(false);

  const [showV1, setShowV1] = useState(true);
  const [showV2, setShowV2] = useState(true);
  const [showV3, setShowV3] = useState(true);

  const allMeters = useMemo(() => {
    const levels = ['11kV', '33kV', '132kV', '400kV', '380V'] as const;
    const meters: Array<{ id: string; voltageLevel: string }> = [];
    for (let i = 0; i < 547; i++) {
      const level = levels[i % levels.length];
      const code = String(i).padStart(4, '0');
      meters.push({
        id: `PQMS_${level.replace('kV', 'KV').replace('V', 'V')}.CHY${code}_H${(i % 5) + 2}`,
        voltageLevel: level
      });
    }
    return meters;
  }, []);

  const availableMeters = useMemo(() => {
    if (meterSelectMode === 'all') return allMeters;
    const targetLevel = meterSelectMode.replace('KV', 'kV');
    return allMeters.filter(m => m.voltageLevel === targetLevel);
  }, [allMeters, meterSelectMode]);

  const filteredMeters = useMemo(() => {
    const q = searchMeter.trim().toLowerCase();
    if (!q) return availableMeters.slice(0, 100);
    return availableMeters.filter(m => m.id.toLowerCase().includes(q)).slice(0, 100);
  }, [availableMeters, searchMeter]);

  const selectedMeters = useMemo(() => {
    return allMeters.filter(m => selectedMeterIds.has(m.id));
  }, [allMeters, selectedMeterIds]);

  const toggleMeter = (meterId: string) => {
    setSelectedMeterIds(prev => {
      const next = new Set(prev);
      if (next.has(meterId)) {
        next.delete(meterId);
      } else {
        next.add(meterId);
      }
      return next;
    });
  };

  const mockChartData = useMemo(() => {
    const days = 59;
    const data: Array<{ date: string; v1: number; v2: number; v3: number }> = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(2025, 0, 8 + i);
      data.push({
        date: `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`,
        v1: 240119 + Math.random() * 6000 - 3000,
        v2: 240119 + Math.random() * 6000 - 3000,
        v3: 240119 + Math.random() * 6000 - 3000
      });
    }
    return data;
  }, []);

  return (
    <div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Voltage & Current Profile</h2>
        <p className="text-slate-600 mt-1">Analyze historical voltage/current data by meter.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">1. Select data (Raw data will take time):</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="select_data_mode"
                  checked={selectDataMode === 'dailyAvg'}
                  onChange={() => setSelectDataMode('dailyAvg')}
                  className="text-blue-600"
                />
                <span className="text-sm text-slate-700">Daily Average</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="select_data_mode"
                  checked={selectDataMode === 'rawData'}
                  onChange={() => setSelectDataMode('rawData')}
                  className="text-blue-600"
                />
                <span className="text-sm text-slate-700">Raw Data</span>
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">2. Select meter(s) from the list:</h3>
            <div className="space-y-2">
              {(['all', '400KV', '132KV', '33KV', '11KV', '380V'] as const).map(mode => (
                <label key={mode} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="meter_select_mode_profile"
                    checked={meterSelectMode === mode}
                    onChange={() => setMeterSelectMode(mode)}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-slate-700 capitalize">{mode === 'all' ? 'All' : mode}</span>
                </label>
              ))}
            </div>

            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchMeter}
                  onChange={(e) => setSearchMeter(e.target.value)}
                  placeholder="Search"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <p className="text-xs font-bold text-slate-700 mb-2">Total Number of Meter: {allMeters.length}</p>
              <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-slate-100 bg-white">
                {filteredMeters.map(m => (
                  <label key={m.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMeterIds.has(m.id)}
                      onChange={() => toggleMeter(m.id)}
                      className="text-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-700">{m.id}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">3. Set time range:</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">From:</label>
                <input
                  type="date"
                  value={fromDate.replace(/\//g, '-')}
                  onChange={(e) => setFromDate(e.target.value.replace(/-/g, '/'))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">To:</label>
                <input
                  type="date"
                  value={toDate.replace(/\//g, '-')}
                  onChange={(e) => setToDate(e.target.value.replace(/-/g, '/'))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setHasResults(true)}
            disabled={selectedMeterIds.size === 0}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold disabled:opacity-50"
          >
            GET PROFILE RESULT
          </button>
        </div>

        <div className="xl:col-span-3 bg-white border border-slate-200 rounded-2xl">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Type of Data:</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDataType('voltage')}
                  className={classNames(
                    'px-4 py-2 rounded-lg font-semibold text-sm',
                    dataType === 'voltage' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  )}
                >
                  Voltage
                </button>
                <button
                  type="button"
                  onClick={() => setDataType('current')}
                  className={classNames(
                    'px-4 py-2 rounded-lg font-semibold text-sm',
                    dataType === 'current' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  )}
                >
                  Current
                </button>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-slate-700">Selected Meters: {selectedMeterIds.size}</p>
              {selectedMeterIds.size === 0 ? (
                <p className="text-sm text-slate-500 mt-2">No meters selected</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedMeters.slice(0, 5).map(m => (
                    <span key={m.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                      {m.id}
                    </span>
                  ))}
                  {selectedMeters.length > 5 && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                      +{selectedMeters.length - 5} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {!hasResults && (
            <div className="p-10 text-center">
              <p className="text-slate-600 font-medium">No results yet.</p>
              <p className="text-sm text-slate-500 mt-1">Select meters and click "GET PROFILE RESULT".</p>
            </div>
          )}

          {hasResults && selectedMeterIds.size > 0 && (
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-700">
                  <span className="font-bold">Type of Data: {dataType === 'voltage' ? 'Voltage, AVG' : 'Current, AVG'}</span>
                  <span className="ml-4">From: {fromDate.replace(/\//g, '-')}</span>
                  <span className="ml-4">To: {toDate.replace(/\//g, '-')}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">Select parameter:</span>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={showV1} onChange={() => setShowV1(!showV1)} className="text-blue-600 rounded" />
                      <span className="text-sm text-slate-700">V1</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={showV2} onChange={() => setShowV2(!showV2)} className="text-blue-600 rounded" />
                      <span className="text-sm text-slate-700">V2</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={showV3} onChange={() => setShowV3(!showV3)} className="text-blue-600 rounded" />
                      <span className="text-sm text-slate-700">V3</span>
                    </label>
                  </div>
                  <button type="button" className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-sm flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                  <button type="button" className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    CSV
                  </button>
                </div>
              </div>

              {selectedMeters.slice(0, 3).map(meter => (
                <div key={meter.id} className="bg-white border border-slate-200 rounded-xl p-4">
                  <h4 className="font-bold text-slate-900 mb-3">{meter.id}</h4>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mockChartData} margin={{ top: 10, right: 30, bottom: 10, left: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis domain={[234000, 246000]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        {showV1 && <Line type="monotone" dataKey="v1" stroke="#000" strokeWidth={1} dot={false} name="V1" />}
                        {showV2 && <Line type="monotone" dataKey="v2" stroke="#dc2626" strokeWidth={1} dot={false} name="V2" />}
                        {showV3 && <Line type="monotone" dataKey="v3" stroke="#2563eb" strokeWidth={1} dot={false} name="V3" />}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type DataMaintenanceSubTab = 'raw' | 'daily' | 'weekly';

// @ts-ignore - Old tab function kept for reference
function DataMaintenanceTab() {
  type RawRow = {
    name: string;
    parameter: string;
    timestamp: string;
    l1: number;
    l2: number;
    l3: number;
  };

  type DailyRow = {
    name: string;
    parameter: string;
    status: string;
    timestamp: string;
    v1max: number;
    v2max: number;
    v3max: number;
    v1min: number;
    v2min: number;
    v3min: number;
  };

  type WeeklyRow = {
    name: string;
    parameter: string;
    status: string;
    timestamp: string;
    l1: number;
    l2: number;
    l3: number;
  };

  const [subTab, setSubTab] = useState<DataMaintenanceSubTab>('raw');

  const allMeters = useMemo(() => {
    const levels = ['11kV', '33kV', '132kV', '400kV', '380V'] as const;
    const meters: Array<{ id: string; voltageLevel: (typeof levels)[number] }> = [];
    for (let i = 1; i <= 547; i++) {
      const level = levels[i % levels.length];
      const code = String(i).padStart(4, '0');
      meters.push({
        id: `PQMS_${level.replace('kV', 'KV').replace('V', 'V')}.APA${code}_H${(i % 5) + 1}`,
        voltageLevel: level
      });
    }
    return meters;
  }, []);

  const [rawSearch, setRawSearch] = useState('');
  const [selectedRawMeter, setSelectedRawMeter] = useState<string>('');

  const [aggSearch, setAggSearch] = useState('');
  const [selectedAggMeter, setSelectedAggMeter] = useState<string>('');

  const [voltageLevel, setVoltageLevel] = useState<'400KV' | '132KV' | '33KV' | '11KV' | '380V'>('400KV');

  const [parameter, setParameter] = useState<string>('Voltage');
  const parameterOptions = useMemo(() => ['Voltage', 'Current', 'Voltage THD', 'Current THD'], []);

  const [fromDate, setFromDate] = useState<string>('2025/01/01');
  const [toDate, setToDate] = useState<string>('2025/01/23');
  const [fromHour, setFromHour] = useState('00');
  const [fromMinute, setFromMinute] = useState('00');
  const [toHour, setToHour] = useState('23');
  const [toMinute, setToMinute] = useState('59');

  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (fromOpen && !target.closest('.dm-from-date-container')) setFromOpen(false);
      if (toOpen && !target.closest('.dm-to-date-container')) setToOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [fromOpen, toOpen]);

  const clamp2 = (value: string, min: number, max: number) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return pad2(min);
    const clamped = Math.max(min, Math.min(max, Math.trunc(n)));
    return pad2(clamped);
  };

  const parseRange = (): { from: Date; to: Date } | null => {
    const fd = parseYYYYMMDDSlashes(fromDate);
    const td = parseYYYYMMDDSlashes(toDate);
    if (!fd || !td) return null;
    const fh = Number(clamp2(fromHour, 0, 23));
    const fm = Number(clamp2(fromMinute, 0, 59));
    const th = Number(clamp2(toHour, 0, 23));
    const tm = Number(clamp2(toMinute, 0, 59));
    const from = new Date(fd.getFullYear(), fd.getMonth(), fd.getDate(), fh, fm, 0);
    const to = new Date(td.getFullYear(), td.getMonth(), td.getDate(), th, tm, 59);
    return { from, to };
  };

  const voltageLevelLabel = useMemo(() => {
    switch (voltageLevel) {
      case '400KV':
        return '400kV';
      case '132KV':
        return '132kV';
      case '33KV':
        return '33kV';
      case '11KV':
        return '11kV';
      case '380V':
        return '380V';
      default:
        return '132kV';
    }
  }, [voltageLevel]);

  const isRangeValid = (maxDays: number): boolean => {
    const range = parseRange();
    if (!range) return false;
    if (range.to.getTime() < range.from.getTime()) return false;
    const days = (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24);
    return days <= maxDays;
  };

  const rawMeters = useMemo(() => {
    const q = rawSearch.trim().toLowerCase();
    const list = q
      ? allMeters.filter((m) => m.id.toLowerCase().includes(q))
      : allMeters;
    return list.slice(0, 200); // keep list snappy
  }, [allMeters, rawSearch]);

  const aggMeters = useMemo(() => {
    const q = aggSearch.trim().toLowerCase();
    const base = allMeters.filter((m) => m.voltageLevel === voltageLevelLabel);
    const list = q ? base.filter((m) => m.id.toLowerCase().includes(q)) : base;
    return list.slice(0, 200);
  }, [aggSearch, allMeters, voltageLevelLabel]);

  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  const [weeklyRows, setWeeklyRows] = useState<WeeklyRow[]>([]);

  const exportCsv = (filename: string, rows: Array<Record<string, string | number>>) => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => String(r[h] ?? '')).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleGetData = () => {
    if (subTab === 'raw' && !selectedRawMeter) {
      alert('Please select one meter from the list.');
      return;
    }

    if (subTab !== 'raw' && !selectedAggMeter) {
      alert('Please select one meter from the list.');
      return;
    }

    const maxDays = subTab === 'raw' ? 31 : 366;
    if (!isRangeValid(maxDays)) {
      alert(subTab === 'raw' ? 'Time range must be max. 1 month and From <= To.' : 'Time range must be max. 1 year and From <= To.');
      return;
    }

    const range = parseRange();
    if (!range) {
      alert('Please enter a valid date range.');
      return;
    }

    if (subTab === 'raw') {
      const base = new Date(range.to.getTime());
      base.setMinutes(0, 0, 0);
      const rows: RawRow[] = [];
      for (let i = 0; i < 12; i++) {
        const t = new Date(base.getTime() - (11 - i) * 10 * 60 * 1000);
        rows.push({
          name: selectedRawMeter,
          parameter,
          timestamp: `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())} ${pad2(t.getHours())}:${pad2(t.getMinutes())}`,
          l1: 6500 + Math.random() * 250,
          l2: 6500 + Math.random() * 250,
          l3: 6500 + Math.random() * 250
        });
      }
      setRawRows(rows);
      return;
    }

    if (subTab === 'daily') {
      const name = selectedAggMeter;
      const rows: DailyRow[] = [];
      const start = new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate());
      for (let i = 0; i < 12; i++) {
        const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
        rows.push({
          name,
          parameter,
          status: '',
          timestamp: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
          v1max: 230000 + Math.random() * 12000,
          v2max: 230000 + Math.random() * 12000,
          v3max: 230000 + Math.random() * 12000,
          v1min: 230000 + Math.random() * 12000,
          v2min: 230000 + Math.random() * 12000,
          v3min: 230000 + Math.random() * 12000
        });
      }
      setDailyRows(rows);
      return;
    }

    const name = selectedAggMeter;
    const rows: WeeklyRow[] = [];
    const start = new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate());
    for (let i = 0; i < 12; i++) {
      const d = new Date(start.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      rows.push({
        name,
        parameter,
        status: '',
        timestamp: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
        l1: 0.8 + Math.random() * 0.6,
        l2: 0.8 + Math.random() * 0.6,
        l3: 0.8 + Math.random() * 0.6
      });
    }
    setWeeklyRows(rows);
  };

  const handleClear = () => {
    if (subTab === 'raw') setRawRows([]);
    if (subTab === 'daily') setDailyRows([]);
    if (subTab === 'weekly') setWeeklyRows([]);
  };

  useEffect(() => {
    // Match screenshot defaults
    if (subTab === 'weekly') {
      if (parameter !== 'Voltage THD') setParameter('Voltage THD');
    } else {
      if (parameter === 'Voltage THD') setParameter('Voltage');
    }
  }, [subTab]);

  const leftStepHeader = (n: number, text: string) => (
    <div className="bg-blue-50 px-4 py-3 border border-blue-100 rounded-lg">
      <p className="text-sm font-bold text-slate-900">{n}. {text}</p>
    </div>
  );

  const exportDisabled = (subTab === 'raw' ? rawRows.length === 0 : subTab === 'daily' ? dailyRows.length === 0 : weeklyRows.length === 0);

  return (
    <div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Data Maintenance</h2>
        <p className="text-slate-600 mt-1">Verify and manage raw, daily, and weekly power quality data.</p>
      </div>

      <div className="mt-6 bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 pt-5 border-b border-slate-200">
          <div className="flex items-center gap-6">
            {([
              { id: 'raw', label: 'Raw Data' },
              { id: 'daily', label: 'Daily Data' },
              { id: 'weekly', label: 'Weekly Data' }
            ] as const).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={classNames(
                  'pb-3 text-sm font-semibold transition-colors',
                  subTab === t.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-900'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="xl:col-span-1 space-y-4">
              <div>
                {leftStepHeader(
                  1,
                  'Select one meter from the list:'
                )}

                <div className="mt-3 bg-white border border-slate-200 rounded-xl p-4">
                  {subTab === 'raw' ? (
                    <>
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          value={rawSearch}
                          onChange={(e) => setRawSearch(e.target.value)}
                          placeholder="Search"
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                      <div className="mt-3 text-center">
                        <p className="text-xs font-bold text-slate-700 uppercase">Total Number of Meters: {allMeters.length}</p>
                      </div>
                      <div className="mt-3 border border-slate-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {rawMeters.map((m) => (
                          <label key={m.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                            <input
                              type="radio"
                              name="dm_raw_meter"
                              checked={selectedRawMeter === m.id}
                              onChange={() => setSelectedRawMeter(m.id)}
                              className="text-blue-600"
                            />
                            <span className="text-sm text-slate-700">{m.id}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="border border-blue-200 rounded-xl p-4">
                        <p className="text-sm font-bold text-slate-900">Available List</p>
                        <p className="mt-3 text-sm font-semibold text-slate-700">Voltage Level:</p>
                        <div className="mt-2 space-y-2">
                          {([
                            { id: '400KV', label: '400KV' },
                            { id: '132KV', label: '132KV' },
                            { id: '33KV', label: '33KV' },
                            { id: '11KV', label: '11KV' },
                            { id: '380V', label: '380V' }
                          ] as const).map((v) => (
                            <label key={v.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name="dm_voltage_level"
                                checked={voltageLevel === v.id}
                                onChange={() => {
                                  setVoltageLevel(v.id);
                                  setSelectedAggMeter('');
                                }}
                                className="text-blue-600"
                              />
                              {v.label}
                            </label>
                          ))}
                        </div>

                        <div className="mt-4">
                          <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              value={aggSearch}
                              onChange={(e) => setAggSearch(e.target.value)}
                              placeholder="Search"
                              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
                            />
                          </div>

                          <div className="mt-3 border border-slate-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white">
                            {aggMeters.length === 0 ? (
                              <div className="px-3 py-8 text-center text-sm text-slate-500">No meters found.</div>
                            ) : (
                              aggMeters.map((m) => (
                                <label key={m.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="dm_agg_meter"
                                    checked={selectedAggMeter === m.id}
                                    onChange={() => setSelectedAggMeter(m.id)}
                                    className="text-blue-600"
                                  />
                                  <span className="text-sm text-slate-700">{m.id}</span>
                                </label>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                {leftStepHeader(2, 'Select parameter:')}
                <div className="mt-3 bg-white border border-slate-200 rounded-xl p-4">
                  <select
                    value={parameter}
                    onChange={(e) => setParameter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    {parameterOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                {leftStepHeader(3, `Set time range: (Max. of ${subTab === 'raw' ? '1 month' : '1 year'})`)}
                <div className="mt-3 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-700 uppercase mb-1">From:</p>
                      <div className="flex items-center gap-2">
                        <div className="relative dm-from-date-container flex-1">
                          <button
                            type="button"
                            onClick={() => setFromOpen((v) => !v)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white flex items-center justify-between"
                          >
                            <span className="font-semibold text-slate-900">{fromDate}</span>
                            <Calendar className="w-4 h-4 text-slate-500" />
                          </button>
                          {fromOpen && (
                            <div className="absolute z-50 mt-2">
                              <DatePickerPopover
                                value={fromDate}
                                onChange={(next) => {
                                  setFromDate(next);
                                  setFromOpen(false);
                                }}
                                onClose={() => setFromOpen(false)}
                              />
                            </div>
                          )}
                        </div>

                        <input
                          value={fromHour}
                          onChange={(e) => setFromHour(e.target.value)}
                          onBlur={() => setFromHour((v) => clamp2(v, 0, 23))}
                          className="w-12 px-2 py-2 border border-slate-300 rounded-lg text-sm text-center"
                          inputMode="numeric"
                          aria-label="From hour"
                        />
                        <span className="text-slate-400 font-bold">:</span>
                        <input
                          value={fromMinute}
                          onChange={(e) => setFromMinute(e.target.value)}
                          onBlur={() => setFromMinute((v) => clamp2(v, 0, 59))}
                          className="w-12 px-2 py-2 border border-slate-300 rounded-lg text-sm text-center"
                          inputMode="numeric"
                          aria-label="From minute"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-700 uppercase mb-1">To:</p>
                      <div className="flex items-center gap-2">
                        <div className="relative dm-to-date-container flex-1">
                          <button
                            type="button"
                            onClick={() => setToOpen((v) => !v)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white flex items-center justify-between"
                          >
                            <span className="font-semibold text-slate-900">{toDate}</span>
                            <Calendar className="w-4 h-4 text-slate-500" />
                          </button>
                          {toOpen && (
                            <div className="absolute z-50 mt-2">
                              <DatePickerPopover
                                value={toDate}
                                onChange={(next) => {
                                  setToDate(next);
                                  setToOpen(false);
                                }}
                                onClose={() => setToOpen(false)}
                              />
                            </div>
                          )}
                        </div>

                        <input
                          value={toHour}
                          onChange={(e) => setToHour(e.target.value)}
                          onBlur={() => setToHour((v) => clamp2(v, 0, 23))}
                          className="w-12 px-2 py-2 border border-slate-300 rounded-lg text-sm text-center"
                          inputMode="numeric"
                          aria-label="To hour"
                        />
                        <span className="text-slate-400 font-bold">:</span>
                        <input
                          value={toMinute}
                          onChange={(e) => setToMinute(e.target.value)}
                          onBlur={() => setToMinute((v) => clamp2(v, 0, 59))}
                          className="w-12 px-2 py-2 border border-slate-300 rounded-lg text-sm text-center"
                          inputMode="numeric"
                          aria-label="To minute"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGetData}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
              >
                {subTab === 'raw' ? 'Get Raw Data' : subTab === 'daily' ? 'Get Daily Data' : 'Get Weekly Data'}
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="w-full px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold"
              >
                Clear Results
              </button>
            </div>

            <div className="xl:col-span-3">
              <div className="border border-slate-200 rounded-2xl p-5">
                <p className="text-sm font-semibold text-slate-700">Selected Meter:</p>
                <p className="mt-2 text-slate-900 font-medium">{subTab === 'raw' ? (selectedRawMeter || 'None') : (selectedAggMeter || 'None')}</p>
              </div>

              <div className={classNames('border border-slate-200 rounded-2xl mt-4 overflow-hidden', subTab !== 'raw' ? '' : '')}>
                <div className="bg-white p-4 flex items-center justify-end">
                  <button
                    type="button"
                    disabled={exportDisabled}
                    onClick={() => {
                      if (subTab === 'raw') {
                        exportCsv(
                          `raw_data_${new Date().toISOString().slice(0, 10)}.csv`,
                          rawRows.map((r) => ({
                            Name: r.name,
                            Parameter: r.parameter,
                            Timestamp: r.timestamp,
                            L1: r.l1.toFixed(3),
                            L2: r.l2.toFixed(3),
                            L3: r.l3.toFixed(3)
                          }))
                        );
                        return;
                      }

                      if (subTab === 'daily') {
                        exportCsv(
                          `daily_data_${new Date().toISOString().slice(0, 10)}.csv`,
                          dailyRows.map((r) => ({
                            Name: r.name,
                            Parameter: r.parameter,
                            Status: r.status,
                            Timestamp: r.timestamp,
                            V1max: r.v1max.toFixed(3),
                            V2max: r.v2max.toFixed(3),
                            V3max: r.v3max.toFixed(3),
                            V1min: r.v1min.toFixed(3),
                            V2min: r.v2min.toFixed(3),
                            V3min: r.v3min.toFixed(3)
                          }))
                        );
                        return;
                      }

                      exportCsv(
                        `weekly_data_${new Date().toISOString().slice(0, 10)}.csv`,
                        weeklyRows.map((r) => ({
                          Name: r.name,
                          Parameter: r.parameter,
                          Status: r.status,
                          Timestamp: r.timestamp,
                          L1: r.l1.toFixed(3),
                          L2: r.l2.toFixed(3),
                          L3: r.l3.toFixed(3)
                        }))
                      );
                    }}
                    className={classNames(
                      'px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2',
                      exportDisabled
                        ? 'bg-green-600/40 text-white cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    )}
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>

                <div className="overflow-x-auto">
                  {subTab === 'raw' && (
                    <table className="w-full">
                      <thead className="bg-slate-900 text-white">
                        <tr>
                          <th className="text-left text-xs font-bold px-4 py-3">Name</th>
                          <th className="text-left text-xs font-bold px-4 py-3">Parameter</th>
                          <th className="text-left text-xs font-bold px-4 py-3">Timestamp</th>
                          <th className="text-right text-xs font-bold px-4 py-3">L1</th>
                          <th className="text-right text-xs font-bold px-4 py-3">L2</th>
                          <th className="text-right text-xs font-bold px-4 py-3">L3</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rawRows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                              No data. Click “Get Raw Data”.
                            </td>
                          </tr>
                        ) : (
                          rawRows.map((r, idx) => (
                            <tr key={`${r.timestamp}-${idx}`} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm text-slate-700">{r.name}</td>
                              <td className="px-4 py-3 text-sm text-slate-700">{r.parameter}</td>
                              <td className="px-4 py-3 text-sm text-slate-700">{r.timestamp}</td>
                              <td className="px-4 py-3 text-sm text-slate-700 text-right">{r.l1.toFixed(3)}</td>
                              <td className="px-4 py-3 text-sm text-slate-700 text-right">{r.l2.toFixed(3)}</td>
                              <td className="px-4 py-3 text-sm text-slate-700 text-right">{r.l3.toFixed(3)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}

                  {subTab === 'daily' && (
                    <table className="w-full">
                      <thead className="bg-slate-900 text-white">
                        <tr>
                          <th className="text-left text-xs font-bold px-4 py-3">Name</th>
                          <th className="text-left text-xs font-bold px-4 py-3">Parameter</th>
                          <th className="text-left text-xs font-bold px-4 py-3">Status</th>
                          <th className="text-left text-xs font-bold px-4 py-3">Timestamp</th>
                          <th className="text-right text-xs font-bold px-4 py-3">V1max</th>
                          <th className="text-right text-xs font-bold px-4 py-3">V2max</th>
                          <th className="text-right text-xs font-bold px-4 py-3">V3max</th>
                          <th className="text-right text-xs font-bold px-4 py-3">V1min</th>
                          <th className="text-right text-xs font-bold px-4 py-3">V2min</th>
                          <th className="text-right text-xs font-bold px-4 py-3">V3min</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dailyRows.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                              No data. Click “Get Daily Data”.
                            </td>
                          </tr>
                        ) : (
                          dailyRows.map((r, idx) => (
                            <tr key={`${r.timestamp}-${idx}`} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm text-slate-700">{r.name}</td>
                              <td className="px-4 py-3 text-sm text-slate-700">{r.parameter}</td>
                              <td className="px-4 py-3 text-sm text-slate-700">{r.status}</td>
                              <td className="px-4 py-3 text-sm text-slate-700">{r.timestamp}</td>
                              <td className="px-4 py-3 text-sm text-slate-700 text-right">{r.v1max.toFixed(3)}</td>
                              <td className="px-4 py-3 text-sm text-slate-700 text-right">{r.v2max.toFixed(3)}</td>
                              <td className="px-4 py-3 text-sm text-slate-700 text-right">{r.v3max.toFixed(3)}</td>
                              <td className="px-4 py-3 text-sm text-slate-700 text-right">{r.v1min.toFixed(3)}</td>
                              <td className="px-4 py-3 text-sm text-slate-700 text-right">{r.v2min.toFixed(3)}</td>
                              <td className="px-4 py-3 text-sm text-slate-700 text-right">{r.v3min.toFixed(3)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}

                  {subTab === 'weekly' && (
                    <table className="w-full">
                      <thead className="bg-slate-900 text-white">
                        <tr>
                          <th className="text-left text-xs font-bold px-4 py-3">Name</th>
                          <th className="text-left text-xs font-bold px-4 py-3">Parameter</th>
                          <th className="text-left text-xs font-bold px-4 py-3">status</th>
                          <th className="text-left text-xs font-bold px-4 py-3">Timestamp</th>
                          <th className="text-right text-xs font-bold px-4 py-3">L1</th>
                          <th className="text-right text-xs font-bold px-4 py-3">L2</th>
                          <th className="text-right text-xs font-bold px-4 py-3">L3</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {weeklyRows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                              No data. Click “Get Weekly Data”.
                            </td>
                          </tr>
                        ) : (
                          weeklyRows.map((r, idx) => (
                            <tr key={`${r.timestamp}-${idx}`} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm text-slate-700">{r.name}</td>
                              <td className="px-4 py-3 text-sm text-slate-700">{r.parameter}</td>
                              <td className="px-4 py-3 text-sm text-slate-700">{r.status}</td>
                              <td className="px-4 py-3 text-sm text-slate-700">{r.timestamp}</td>
                              <td className="px-4 py-3 text-sm text-slate-700 text-right">{r.l1.toFixed(3)}</td>
                              <td className="px-4 py-3 text-sm text-slate-700 text-right">{r.l2.toFixed(3)}</td>
                              <td className="px-4 py-3 text-sm text-slate-700 text-right">{r.l3.toFixed(3)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type VoltageDipSummaryRecord = {
  idrNo: string;
  date: string; // yyyy/mm/dd
  time: string; // HH:MI
  voltageLevel: string;
  circuit: string;
  faultyPhase: string;
  durationMs: number;
  vl1Pct: number;
  vl2Pct: number;
  vl3Pct: number;
  region: string;
  weather: string;
  equipmentCategory: string;
  equipment: string;
  causeGroup: string;
  cause: string;
  faultyComponent: string;
  remarkCauseReason: string;
  minimum: number;
  interferenceBy: string;
  objectPartGroup: string;
  objectPartCode: string;
  damageGroup: string;
  damageCode: string;
  totalCMI: string;
  manualCreatedIDR: string;
  distributionFault: string;
};

type CPDISParameter = 
  | 'Voltage' 
  | 'Current' 
  | 'Power Factor' 
  | 'Pst' 
  | 'Plt' 
  | 'Current TDD Odd' 
  | 'THD' 
  | 'Voltage Harmonic' 
  | 'Current Harmonic' 
  | 'Frequency' 
  | 'Voltage Unbalance';

type CPDISDataRecord = {
  meter: string;
  time: string;
  vabAvg: number;
  vbcAvg: number;
  vcaAvg: number;
  vaAvg: number;
  vbAvg: number;
  vcAvg: number;
  iaAvg: number;
  ibAvg: number;
  icAvg: number;
  iavgAvg: number;
  pfAvg: number;
  vaPhFt: number;
  vbPhFt: number;
  vcPhFt: number;
  vbPhPu: number;
  vcPhPu: number;
  iaTotal: number;
  ibTotal: number;
  icTotal: number;
};

type PQSummaryReportView = 'voltageDipSummary' | 'customerPowerDisturbance';

function PQSISMaintenanceTab() {
  const [pqsisRecords, setPqsisRecords] = useState<PQSISRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<PQSISRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<{
    total: number;
    newRecords: number;
    updated: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter states
  const [serviceTypeFilter, setServiceTypeFilter] = useState<PQSISServiceType>('All');
  const [idrSearch, setIdrSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Click outside to close date pickers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (dateFromOpen && !target.closest('.pqsis-date-from-container')) setDateFromOpen(false);
      if (dateToOpen && !target.closest('.pqsis-date-to-container')) setDateToOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dateFromOpen, dateToOpen]);

  // Mock initial data
  useEffect(() => {
    const mockData: PQSISRecord[] = [
      {
        caseNo: '5337.2',
        customerName: 'Microelectronics Centre',
        customerGroup: 'BT',
        requestDate: '15/01/2025',
        serviceType: 'Technical Services',
        service: 'PQ Site Investigation',
        serviceCharging: 25.5,
        chargedDepartment: 'AMD',
        serviceCompletionDate: '28/02/2025',
        closedCase: 'Yes',
        inProgressCase: 'No',
        completedBeforeTargetDate: 'Yes',
        businessType: 'Shopping Centre',
        plannedReplyDate: '20/01/2025',
        actualReplyDate: '18/01/2025',
        plannedReportIssueDate: '25/02/2025',
        actualReportIssueDate: '28/02/2025',
        idrNumber: 'IDR-2025-001'
      },
      {
        caseNo: '5338.1',
        customerName: 'Tech Plaza Mall',
        customerGroup: 'Commercial',
        requestDate: '20/01/2025',
        serviceType: 'Harmonics',
        service: 'Harmonic Analysis',
        serviceCharging: 18.0,
        chargedDepartment: 'PQD',
        serviceCompletionDate: '15/03/2025',
        closedCase: 'No',
        inProgressCase: 'Yes',
        completedBeforeTargetDate: 'No',
        businessType: 'Shopping Centre',
        plannedReplyDate: '25/01/2025',
        actualReplyDate: '26/01/2025',
        plannedReportIssueDate: '10/03/2025',
        actualReportIssueDate: '',
        idrNumber: 'IDR-2025-005'
      },
      {
        caseNo: '5339.0',
        customerName: 'Industrial Park Ltd',
        customerGroup: 'Industrial',
        requestDate: '05/02/2025',
        serviceType: 'Supply Enquiry',
        service: 'Voltage Quality Assessment',
        serviceCharging: 12.8,
        chargedDepartment: 'TSO',
        serviceCompletionDate: '20/02/2025',
        closedCase: 'Yes',
        inProgressCase: 'No',
        completedBeforeTargetDate: 'Yes',
        businessType: 'Industrial',
        plannedReplyDate: '10/02/2025',
        actualReplyDate: '09/02/2025',
        plannedReportIssueDate: '18/02/2025',
        actualReportIssueDate: '20/02/2025',
        idrNumber: ''
      }
    ];
    setPqsisRecords(mockData);
    setFilteredRecords(mockData);
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...pqsisRecords];

    if (serviceTypeFilter !== 'All') {
      filtered = filtered.filter(r => r.serviceType === serviceTypeFilter);
    }

    if (idrSearch.trim()) {
      const q = idrSearch.trim().toLowerCase();
      filtered = filtered.filter(r => r.idrNumber?.toLowerCase().includes(q));
    }

    if (customerSearch.trim()) {
      const q = customerSearch.trim().toLowerCase();
      filtered = filtered.filter(r => r.customerName.toLowerCase().includes(q));
    }

    if (dateFrom || dateTo) {
      filtered = filtered.filter(r => {
        // Simple date filtering (dd/mm/yyyy format)
        if (dateFrom && r.requestDate < dateFrom) return false;
        if (dateTo && r.requestDate > dateTo) return false;
        return true;
      });
    }

    setFilteredRecords(filtered);
    setCurrentPage(1);
  }, [serviceTypeFilter, idrSearch, customerSearch, dateFrom, dateTo, pqsisRecords]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadSummary(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('CSV file is empty or invalid');
        setIsUploading(false);
        return;
      }

      // @ts-ignore - headers used for potential future validation
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const newRecords: PQSISRecord[] = [];
      const existingCaseNumbers = new Set(pqsisRecords.map(r => r.caseNo));
      let newCount = 0;
      let updateCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        
        const record: PQSISRecord = {
          caseNo: values[0] || '',
          customerName: values[1] || '',
          customerGroup: values[2] || '',
          requestDate: values[3] || '',
          serviceType: values[4] || '',
          service: values[5] || '',
          serviceCharging: parseFloat(values[6]) || 0,
          chargedDepartment: values[7] || '',
          serviceCompletionDate: values[8] || '',
          closedCase: values[9] || 'No',
          inProgressCase: values[10] || 'No',
          completedBeforeTargetDate: values[11] || 'No',
          businessType: values[12] || '',
          plannedReplyDate: values[13] || '',
          actualReplyDate: values[14] || '',
          plannedReportIssueDate: values[15] || '',
          actualReportIssueDate: values[16] || '',
          idrNumber: values[17] || ''
        };

        if (!record.caseNo) continue;

        if (existingCaseNumbers.has(record.caseNo)) {
          updateCount++;
        } else {
          newCount++;
        }

        newRecords.push(record);
      }

      // Merge records (update existing or add new)
      const mergedRecords = [...pqsisRecords];
      newRecords.forEach(newRec => {
        const existingIndex = mergedRecords.findIndex(r => r.caseNo === newRec.caseNo);
        if (existingIndex >= 0) {
          mergedRecords[existingIndex] = newRec; // Overwrite
        } else {
          mergedRecords.push(newRec); // Add new
        }
      });

      setPqsisRecords(mergedRecords);
      setUploadSummary({
        total: newRecords.length,
        newRecords: newCount,
        updated: updateCount
      });

    } catch (error) {
      console.error('CSV upload error:', error);
      alert('Failed to process CSV file. Please check the format.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExport = () => {
    try {
      const exportData = filteredRecords.map(r => ({
        'Case No.': r.caseNo,
        'Customer Name': r.customerName,
        'Customer Group': r.customerGroup,
        'Request Date': r.requestDate,
        'Service Type': r.serviceType,
        'Service': r.service,
        'Service Charging (k)': r.serviceCharging,
        'Charged Department': r.chargedDepartment,
        'Service Completion Date': r.serviceCompletionDate,
        'Closed Case': r.closedCase,
        'In-Progress Case': r.inProgressCase,
        'Completed before Target Date': r.completedBeforeTargetDate,
        'Business Type': r.businessType,
        'Planned Reply Date': r.plannedReplyDate,
        'Actual Reply Date': r.actualReplyDate,
        'Planned Report Issue Date': r.plannedReportIssueDate,
        'Actual Report Issue Date': r.actualReportIssueDate,
        'IDR Number': r.idrNumber || ''
      }));

      const wb = XLSX.utils.book_new();
      
      // Add filter summary at top
      const summary = [
        ['PQSIS Export Summary'],
        ['Export Date:', new Date().toLocaleDateString()],
        ['Service Type Filter:', serviceTypeFilter],
        ['IDR Search:', idrSearch || 'None'],
        ['Customer Search:', customerSearch || 'None'],
        ['Date Range:', `${dateFrom || 'N/A'} to ${dateTo || 'N/A'}`],
        ['Total Records:', filteredRecords.length.toString()],
        [], // Empty row
      ];

      const ws = XLSX.utils.aoa_to_sheet(summary);
      XLSX.utils.sheet_add_json(ws, exportData, { origin: -1 });
      XLSX.utils.book_append_sheet(wb, ws, 'PQSIS Data');

      const fileName = `PQSIS_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-slate-700" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">PQSIS Maintenance</h2>
            <p className="text-sm text-slate-600 mt-1">Upload, manage and export PQSIS service records</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? 'Uploading...' : 'Upload CSV'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleExport}
            disabled={filteredRecords.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export to Excel
          </button>
        </div>
      </div>

      {/* Upload Summary */}
      {uploadSummary && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-green-900 mb-2">Upload Successful</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Total Processed:</span>
                  <span className="ml-2 font-bold text-slate-900">{uploadSummary.total}</span>
                </div>
                <div>
                  <span className="text-slate-600">New Records:</span>
                  <span className="ml-2 font-bold text-green-700">{uploadSummary.newRecords}</span>
                </div>
                <div>
                  <span className="text-slate-600">Updated Records:</span>
                  <span className="ml-2 font-bold text-blue-700">{uploadSummary.updated}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUploadSummary(null)}
              className="p-1 hover:bg-green-100 rounded"
            >
              <X className="w-4 h-4 text-green-700" />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-700" />
          <h3 className="text-sm font-bold text-slate-900">Advanced Search & Filter</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Service Type</label>
            <select
              value={serviceTypeFilter}
              onChange={(e) => setServiceTypeFilter(e.target.value as PQSISServiceType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="All">All Types</option>
              <option value="Harmonics">Harmonics</option>
              <option value="Supply Enquiry">Supply Enquiry</option>
              <option value="Site Survey">Site Survey</option>
              <option value="Technical Services">Technical Services</option>
              <option value="PQ Site Investigation">PQ Site Investigation</option>
              <option value="Enquiry">Enquiry</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">IDR Number</label>
            <input
              type="text"
              value={idrSearch}
              onChange={(e) => setIdrSearch(e.target.value)}
              placeholder="Search IDR..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name</label>
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search customer..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="pqsis-date-from-container relative">
                <input
                  type="text"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  onFocus={() => setDateFromOpen(true)}
                  placeholder="From"
                  className="w-full px-2 py-2 pr-8 border border-slate-300 rounded-lg text-sm"
                />
                <Calendar
                  className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                {dateFromOpen && (
                  <DatePickerPopover
                    value={dateFrom}
                    onChange={setDateFrom}
                    onClose={() => setDateFromOpen(false)}
                  />
                )}
              </div>
              <div className="pqsis-date-to-container relative">
                <input
                  type="text"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  onFocus={() => setDateToOpen(true)}
                  placeholder="To"
                  className="w-full px-2 py-2 pr-8 border border-slate-300 rounded-lg text-sm"
                />
                <Calendar
                  className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                {dateToOpen && (
                  <DatePickerPopover
                    value={dateTo}
                    onChange={setDateTo}
                    onClose={() => setDateToOpen(false)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing <span className="font-bold text-slate-900">{filteredRecords.length}</span> of{' '}
            <span className="font-bold text-slate-900">{pqsisRecords.length}</span> records
          </p>
          <button
            type="button"
            onClick={() => {
              setServiceTypeFilter('All');
              setIdrSearch('');
              setCustomerSearch('');
              setDateFrom('');
              setDateTo('');
            }}
            className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Case No.</th>
                <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Customer Name</th>
                <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Customer Group</th>
                <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Request Date</th>
                <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Service Type</th>
                <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Service</th>
                <th className="px-3 py-3 text-right font-bold whitespace-nowrap">Service Charging (k)</th>
                <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Charged Dept</th>
                <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Completion Date</th>
                <th className="px-3 py-3 text-center font-bold whitespace-nowrap">Closed Case</th>
                <th className="px-3 py-3 text-center font-bold whitespace-nowrap">In-Progress</th>
                <th className="px-3 py-3 text-center font-bold whitespace-nowrap">Before Target</th>
                <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Business Type</th>
                <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Planned Reply</th>
                <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Actual Reply</th>
                <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Planned Report</th>
                <th className="px-3 py-3 text-left font-bold whitespace-nowrap">Actual Report</th>
                <th className="px-3 py-3 text-left font-bold whitespace-nowrap">IDR Number</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={18} className="px-3 py-8 text-center text-slate-500">
                    <Database className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p>No PQSIS records found. Upload a CSV file to get started.</p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record, idx) => (
                  <tr key={idx} className="hover:bg-blue-50">
                    <td className="px-3 py-2 text-slate-700 font-semibold">{record.caseNo}</td>
                    <td className="px-3 py-2 text-slate-700">{record.customerName}</td>
                    <td className="px-3 py-2 text-slate-700">{record.customerGroup}</td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{record.requestDate}</td>
                    <td className="px-3 py-2 text-slate-700">{record.serviceType}</td>
                    <td className="px-3 py-2 text-slate-700">{record.service}</td>
                    <td className="px-3 py-2 text-slate-700 text-right">{record.serviceCharging.toFixed(1)}</td>
                    <td className="px-3 py-2 text-slate-700">{record.chargedDepartment}</td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{record.serviceCompletionDate}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={classNames(
                        'px-2 py-1 rounded-full text-xs font-semibold',
                        record.closedCase === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                      )}>
                        {record.closedCase}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={classNames(
                        'px-2 py-1 rounded-full text-xs font-semibold',
                        record.inProgressCase === 'Yes' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      )}>
                        {record.inProgressCase}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={classNames(
                        'px-2 py-1 rounded-full text-xs font-semibold',
                        record.completedBeforeTargetDate === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}>
                        {record.completedBeforeTargetDate}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{record.businessType}</td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{record.plannedReplyDate}</td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{record.actualReplyDate}</td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{record.plannedReportIssueDate}</td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{record.actualReportIssueDate}</td>
                    <td className="px-3 py-2 text-slate-700 font-mono text-xs">{record.idrNumber || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CPDISDashboard() {
  const [fromDate, setFromDate] = useState('2021/08/16');
  const [fromTime, setFromTime] = useState('00:00:00');
  const [toDate, setToDate] = useState('2021/08/16');
  const [toTime, setToTime] = useState('12:21:01');
  const [selectedParameters, setSelectedParameters] = useState<Set<CPDISParameter>>(new Set(['Voltage']));
  const [hasResults, setHasResults] = useState(false);
  const [searchText, setSearchText] = useState('');

  const allParameters: CPDISParameter[] = [
    'Voltage',
    'Current',
    'Power Factor',
    'Pst',
    'Plt',
    'Current TDD Odd',
    'THD',
    'Voltage Harmonic',
    'Current Harmonic',
    'Frequency',
    'Voltage Unbalance'
  ];

  const toggleParameter = (param: CPDISParameter) => {
    setSelectedParameters(prev => {
      const next = new Set(prev);
      if (next.has(param)) {
        next.delete(param);
      } else {
        next.add(param);
      }
      return next;
    });
  };

  // Mock CPDIS data
  const mockCPDISData = useMemo<CPDISDataRecord[]>(() => [
    { meter: 'CPDIS_3', time: '2021-08-16 00:04:08', vabAvg: 383.176, vbcAvg: 383.354, vcaAvg: 383.381, vaAvg: 227.096, vbAvg: 226.837, vcAvg: 227.573, iaAvg: 613.628, ibAvg: 615.152, icAvg: 662.034, iavgAvg: 630.271, pfAvg: 0.887, vaPhFt: 0.136, vbPhFt: 0.146, vcPhFt: 0.148, vbPhPu: 0.163, vcPhPu: 0.163, iaTotal: 4.656, ibTotal: 4.652, icTotal: 4.736 },
    { meter: 'CPDIS_3', time: '2021-08-16 00:24:09', vabAvg: 382.917, vbcAvg: 383.354, vcaAvg: 383.336, vaAvg: 226.589, vbAvg: 226.698, vcAvg: 227.426, iaAvg: 612.144, ibAvg: 614.271, icAvg: 661.781, iavgAvg: 629.398, pfAvg: 0.870, vaPhFt: 0.140, vbPhFt: 0.146, vcPhFt: 0.154, vbPhPu: 0.163, vcPhPu: 0.163, iaTotal: 4.728, ibTotal: 4.652, icTotal: 4.736 },
    { meter: 'CPDIS_3', time: '2021-08-16 00:44:02', vabAvg: 382.069, vbcAvg: 382.913, vcaAvg: 383.365, vaAvg: 226.571, vbAvg: 226.495, vcAvg: 227.282, iaAvg: 615.618, ibAvg: 616.641, icAvg: 647.738, iavgAvg: 626.665, pfAvg: 0.880, vaPhFt: 0.114, vbPhFt: 0.117, vcPhFt: 0.122, vbPhPu: 0.163, vcPhPu: 0.163, iaTotal: 4.107, ibTotal: 4.107, icTotal: 4.726 },
    { meter: 'CPDIS_3', time: '2021-08-16 01:04:17', vabAvg: 382.317, vbcAvg: 383.317, vcaAvg: 383.537, vaAvg: 226.685, vbAvg: 226.876, vcAvg: 227.425, iaAvg: 617.144, ibAvg: 617.134, icAvg: 661.821, iavgAvg: 632.033, pfAvg: 0.883, vaPhFt: 0.069, vbPhFt: 0.067, vcPhFt: 0.066, vbPhPu: 0.163, vcPhPu: 0.163, iaTotal: 4.633, ibTotal: 4.633, icTotal: 4.333 },
    { meter: 'CPDIS_3', time: '2021-08-16 01:24:32', vabAvg: 382.753, vbcAvg: 383.551, vcaAvg: 383.753, vaAvg: 226.908, vbAvg: 226.871, vcAvg: 227.535, iaAvg: 462.162, ibAvg: 514.149, icAvg: 422.501, iavgAvg: 466.271, pfAvg: 0.880, vaPhFt: 0.065, vbPhFt: 0.063, vcPhFt: 0.064, vbPhPu: 0.163, vcPhPu: 0.163, iaTotal: 4.726, ibTotal: 4.725, icTotal: 4.478 },
    { meter: 'CPDIS_3', time: '2021-08-16 01:44:01', vabAvg: 382.076, vbcAvg: 382.719, vcaAvg: 383.004, vaAvg: 226.835, vbAvg: 226.382, vcAvg: 227.176, iaAvg: 520.345, ibAvg: 598.331, icAvg: 466.683, iavgAvg: 528.453, pfAvg: 0.886, vaPhFt: 0.086, vbPhFt: 0.065, vcPhFt: 0.063, vbPhPu: 0.163, vcPhPu: 0.163, iaTotal: 4.881, ibTotal: 4.725, icTotal: 4.474 },
    { meter: 'CPDIS_3', time: '2021-08-16 02:04:06', vabAvg: 382.206, vbcAvg: 382.704, vcaAvg: 383.034, vaAvg: 226.535, vbAvg: 226.444, vcAvg: 227.147, iaAvg: 516.693, ibAvg: 595.264, icAvg: 545.757, iavgAvg: 552.571, pfAvg: 0.901, vaPhFt: 0.061, vbPhFt: 0.061, vcPhFt: 0.060, vbPhPu: 0.163, vcPhPu: 0.163, iaTotal: 4.526, ibTotal: 4.526, icTotal: 4.273 },
    { meter: 'CPDIS_3', time: '2021-08-16 02:24:34', vabAvg: 382.784, vbcAvg: 383.100, vcaAvg: 383.460, vaAvg: 226.576, vbAvg: 226.438, vcAvg: 227.344, iaAvg: 500.211, ibAvg: 548.271, icAvg: 516.624, iavgAvg: 521.702, pfAvg: 0.898, vaPhFt: 0.061, vbPhFt: 0.063, vcPhFt: 0.062, vbPhPu: 0.163, vcPhPu: 0.163, iaTotal: 4.506, ibTotal: 4.521, icTotal: 4.506 },
    { meter: 'CPDIS_3', time: '2021-08-16 02:44:43', vabAvg: 382.530, vbcAvg: 383.440, vcaAvg: 383.447, vaAvg: 226.723, vbAvg: 226.750, vcAvg: 227.348, iaAvg: 474.426, ibAvg: 508.963, icAvg: 491.128, iavgAvg: 491.506, pfAvg: 0.894, vaPhFt: 0.062, vbPhFt: 0.063, vcPhFt: 0.060, vbPhPu: 0.163, vcPhPu: 0.163, iaTotal: 4.521, ibTotal: 4.521, icTotal: 4.517 },
    { meter: 'CPDIS_3', time: '2021-08-16 03:04:30', vabAvg: 382.530, vbcAvg: 383.442, vcaAvg: 383.385, vaAvg: 226.724, vbAvg: 226.630, vcAvg: 227.424, iaAvg: 476.258, ibAvg: 491.746, icAvg: 474.264, iavgAvg: 480.756, pfAvg: 0.897, vaPhFt: 0.057, vbPhFt: 0.058, vcPhFt: 0.057, vbPhPu: 0.163, vcPhPu: 0.163, iaTotal: 4.532, ibTotal: 4.351, icTotal: 4.517 }
  ], []);

  const filteredData = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return mockCPDISData;
    return mockCPDISData.filter(d => d.meter.toLowerCase().includes(q));
  }, [mockCPDISData, searchText]);

  const handleQuery = () => {
    setHasResults(true);
  };

  const handleExport = () => {
    try {
      const exportRows = filteredData.map((rec) => ({
        'Meter': rec.meter,
        'Time': rec.time,
        'Vab-Avg': rec.vabAvg,
        'Vbc-Avg': rec.vbcAvg,
        'Vca-Avg': rec.vcaAvg,
        'Va-Avg': rec.vaAvg,
        'Vb-Avg': rec.vbAvg,
        'Vc-Avg': rec.vcAvg,
        'Ia-Avg': rec.iaAvg,
        'Ib-Avg': rec.ibAvg,
        'Ic-Avg': rec.icAvg,
        'Iavg-Avg': rec.iavgAvg,
        'PF-Avg': rec.pfAvg,
        'Va-Ph-Ft': rec.vaPhFt,
        'Vb-Ph-Ft': rec.vbPhFt,
        'Vc-Ph-Ft': rec.vcPhFt,
        'Vb-Ph-Pu': rec.vbPhPu,
        'Vc-Ph-Pu': rec.vcPhPu,
        'Ia Total': rec.iaTotal,
        'Ib Total': rec.ibTotal,
        'Ic Total': rec.icTotal
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportRows);
      XLSX.utils.book_append_sheet(wb, ws, 'CPDIS Data');

      const fileName = `CPDIS_Data_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('CPDIS export error:', error);
      alert('Failed to export data');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-6 py-4 rounded-t-xl">
        <h2 className="text-xl font-bold">Customer Power Disturbance Information System (CPDIS) Dashboard</h2>
      </div>

      {/* Filters Section */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Custom Period */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Custom Period:
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">From:</label>
                  <input
                    type="text"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    placeholder="YYYY/MM/DD"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time:</label>
                  <input
                    type="text"
                    value={fromTime}
                    onChange={(e) => setFromTime(e.target.value)}
                    placeholder="HH:MM:SS"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">To:</label>
                  <input
                    type="text"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    placeholder="YYYY/MM/DD"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time:</label>
                  <input
                    type="text"
                    value={toTime}
                    onChange={(e) => setToTime(e.target.value)}
                    placeholder="HH:MM:SS"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Parameters */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Select Parameters:</h3>
            <div className="grid grid-cols-2 gap-2">
              {allParameters.map((param) => (
                <label
                  key={param}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedParameters.has(param)}
                    onChange={() => toggleParameter(param)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-slate-700">{param}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleQuery}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!hasResults}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Results Table */}
      {hasResults && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gradient-to-r from-blue-600 to-sky-500 text-white">
                <tr>
                  <th className="px-3 py-2 text-center font-bold whitespace-nowrap sticky left-0 bg-blue-600">Meter</th>
                  <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Time</th>
                  {selectedParameters.has('Voltage') && (
                    <>
                      <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Vab-Avg</th>
                      <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Vbc-Avg</th>
                      <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Vca-Avg</th>
                    </>
                  )}
                  {selectedParameters.has('Current') && (
                    <>
                      <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Va-Avg</th>
                      <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Vb-Avg</th>
                      <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Vc-Avg</th>
                    </>
                  )}
                  {selectedParameters.has('Power Factor') && (
                    <>
                      <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Ia-Avg</th>
                      <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Ib-Avg</th>
                      <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Ic-Avg</th>
                    </>
                  )}
                  {selectedParameters.has('Pst') && (
                    <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Iavg-Avg</th>
                  )}
                  {selectedParameters.has('Plt') && (
                    <th className="px-3 py-2 text-center font-bold whitespace-nowrap">PF-Avg</th>
                  )}
                  {selectedParameters.has('Current TDD Odd') && (
                    <>
                      <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Ia Total</th>
                      <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Ib Total</th>
                      <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Ic Total</th>
                    </>
                  )}
                  {selectedParameters.has('THD') && (
                    <>
                      <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Va-Ph-Ft</th>
                      <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Vb-Ph-Ft</th>
                      <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Vc-Ph-Ft</th>
                    </>
                  )}
                  {selectedParameters.has('Voltage Harmonic') && (
                    <>
                      <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Vb-Ph-Pu</th>
                      <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Vc-Ph-Pu</th>
                    </>
                  )}
                  {selectedParameters.has('Current Harmonic') && (
                    <>
                      <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Current H3</th>
                      <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Current H5</th>
                      <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Current H7</th>
                    </>
                  )}
                  {selectedParameters.has('Frequency') && (
                    <th className="px-3 py-2 text-center font-bold whitespace-nowrap">Frequency</th>
                  )}
                  {selectedParameters.has('Voltage Unbalance') && (
                    <th className="px-3 py-2 text-center font-bold whitespace-nowrap">V-Unbalance %</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={20} className="px-3 py-8 text-center text-slate-500">
                      No data found. Please adjust your filters and query again.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((rec, idx) => (
                    <tr key={idx} className="hover:bg-blue-50">
                      <td className="px-3 py-2 text-center text-slate-700 font-semibold whitespace-nowrap sticky left-0 bg-white">{rec.meter}</td>
                      <td className="px-3 py-2 text-center text-slate-700 whitespace-nowrap">{rec.time}</td>
                      {selectedParameters.has('Voltage') && (
                        <>
                          <td className="px-3 py-2 text-slate-700 text-center">{rec.vabAvg.toFixed(3)}</td>
                          <td className="px-3 py-2 text-slate-700 text-center">{rec.vbcAvg.toFixed(3)}</td>
                          <td className="px-3 py-2 text-slate-700 text-center">{rec.vcaAvg.toFixed(3)}</td>
                        </>
                      )}
                      {selectedParameters.has('Current') && (
                        <>
                          <td className="px-3 py-2 text-slate-700 text-center">{rec.vaAvg.toFixed(3)}</td>
                          <td className="px-3 py-2 text-slate-700 text-center">{rec.vbAvg.toFixed(3)}</td>
                          <td className="px-3 py-2 text-slate-700 text-center">{rec.vcAvg.toFixed(3)}</td>
                        </>
                      )}
                      {selectedParameters.has('Power Factor') && (
                        <>
                          <td className="px-3 py-2 text-slate-700 text-center">{rec.iaAvg.toFixed(3)}</td>
                          <td className="px-3 py-2 text-slate-700 text-center">{rec.ibAvg.toFixed(3)}</td>
                          <td className="px-3 py-2 text-slate-700 text-center">{rec.icAvg.toFixed(3)}</td>
                        </>
                      )}
                      {selectedParameters.has('Pst') && (
                        <td className="px-3 py-2 text-slate-700 text-center">{rec.iavgAvg.toFixed(3)}</td>
                      )}
                      {selectedParameters.has('Plt') && (
                        <td className="px-3 py-2 text-slate-700 text-center">{rec.pfAvg.toFixed(3)}</td>
                      )}
                      {selectedParameters.has('Current TDD Odd') && (
                        <>
                          <td className="px-3 py-2 text-slate-700 text-center">{rec.iaTotal.toFixed(3)}</td>
                          <td className="px-3 py-2 text-slate-700 text-center">{rec.ibTotal.toFixed(3)}</td>
                          <td className="px-3 py-2 text-slate-700 text-center">{rec.icTotal.toFixed(3)}</td>
                        </>
                      )}
                      {selectedParameters.has('THD') && (
                        <>
                          <td className="px-3 py-2 text-slate-700 text-center">{rec.vaPhFt.toFixed(3)}</td>
                          <td className="px-3 py-2 text-slate-700 text-center">{rec.vbPhFt.toFixed(3)}</td>
                          <td className="px-3 py-2 text-slate-700 text-center">{rec.vcPhFt.toFixed(3)}</td>
                        </>
                      )}
                      {selectedParameters.has('Voltage Harmonic') && (
                        <>
                          <td className="px-3 py-2 text-slate-700 text-center">{rec.vbPhPu.toFixed(3)}</td>
                          <td className="px-3 py-2 text-slate-700 text-center">{rec.vcPhPu.toFixed(3)}</td>
                        </>
                      )}
                      {selectedParameters.has('Current Harmonic') && (
                        <>
                          <td className="px-3 py-2 text-slate-700 text-center">N/A</td>
                          <td className="px-3 py-2 text-slate-700 text-center">N/A</td>
                          <td className="px-3 py-2 text-slate-700 text-center">N/A</td>
                        </>
                      )}
                      {selectedParameters.has('Frequency') && (
                        <td className="px-3 py-2 text-slate-700 text-center">50.00</td>
                      )}
                      {selectedParameters.has('Voltage Unbalance') && (
                        <td className="px-3 py-2 text-slate-700 text-center">0.15</td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Showing <span className="font-bold text-slate-900">{filteredData.length}</span> records
            </p>
          </div>
        </div>
      )}

      {!hasResults && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <BarChart3 className="w-12 h-12 text-blue-400 mx-auto mb-3" />
          <p className="text-slate-600">Click <strong>Query</strong> button to load CPDIS data</p>
        </div>
      )}
    </div>
  );
}

function PQSummaryTab({ selectedReportView }: { selectedReportView: PQSummaryReportView }) {

  // Voltage Dip Summary Report state
  const [vdIncidentTimeFrom, setVdIncidentTimeFrom] = useState('2025/11/20');
  const [vdIncidentTimeTo, setVdIncidentTimeTo] = useState('2025/12/20');
  const [vdVoltageRemainingFrom, setVdVoltageRemainingFrom] = useState('');
  const [vdVoltageRemainingTo, setVdVoltageRemainingTo] = useState('');
  const [vdDurationFrom, setVdDurationFrom] = useState('');
  const [vdDurationTo, setVdDurationTo] = useState('');
  const [vdRegion, setVdRegion] = useState<string>('All');
  const [vdVoltageLevel, setVdVoltageLevel] = useState<string[]>(['11kV']);
  const [vdFaultTypeTab, setVdFaultTypeTab] = useState<'transmission' | 'distribution'>('transmission');
  const [vdSearchResults, setVdSearchResults] = useState<VoltageDipSummaryRecord[]>([]);
  const [vdShowResults, setVdShowResults] = useState(false);



  // Mock voltage dip summary data
  const mockVoltageDipSummaryData = useMemo<VoltageDipSummaryRecord[]>(() => [
    {
      idrNo: '128329619',
      date: '2025/11/20',
      time: '13:50',
      voltageLevel: '132kV',
      circuit: '(ST10) Yuen Long - Au Tau B\' Pumping Station RMU No.2',
      faultyPhase: 'L3-E',
      durationMs: 80,
      vl1Pct: 9,
      vl2Pct: 91,
      vl3Pct: 91,
      region: 'NR',
      weather: 'FINE',
      equipmentCategory: 'Cable',
      equipment: 'Service fuses/cutouts',
      causeGroup: 'CAUSES OF CPU',
      cause: 'HIGH WIND',
      faultyComponent: 'Jumper',
      remarkCauseReason: 'Cable fault due to external damage',
      minimum: 9,
      interferenceBy: 'External',
      objectPartGroup: 'Fuse/Cutout for low voltage network',
      objectPartCode: 'POWER CONDUCTOR',
      damageGroup: 'DEVIATION IN NORMAL PHYSICAL STATE',
      damageCode: 'Fuse blown',
      totalCMI: '0000000048',
      manualCreatedIDR: 'No',
      distributionFault: 'Yes'
    },
    {
      idrNo: '1606271-1',
      date: '2025/09/08',
      time: '10:38',
      voltageLevel: '400kV',
      circuit: '(T1) Castle Peak - Lei Muk Shue No.1',
      faultyPhase: 'L1',
      durationMs: 90,
      vl1Pct: 49,
      vl2Pct: 96,
      vl3Pct: 96,
      region: 'WER',
      weather: 'TYPHOON NO.08',
      equipmentCategory: 'OHL',
      equipment: 'POWER CONDUCTOR',
      causeGroup: 'ENVIRONMENTAL INFLUENCE',
      cause: 'VEGETATION',
      faultyComponent: 'Conductor',
      remarkCauseReason: 'Tree contact during typhoon',
      minimum: 49,
      interferenceBy: 'External',
      objectPartGroup: 'Overhead Line Equipment',
      objectPartCode: 'CONDUCTOR',
      damageGroup: 'PHYSICAL DAMAGE',
      damageCode: 'Tree contact',
      totalCMI: '0000000048',
      manualCreatedIDR: 'No',
      distributionFault: 'No'
    },
    {
      idrNo: '1545623-2',
      date: '2025/10/15',
      time: '14:22',
      voltageLevel: '132kV',
      circuit: '(PAT HEUNG) 170853 SHEUNG CHE \'E\' S/S',
      faultyPhase: 'L2-E',
      durationMs: 120,
      vl1Pct: 88,
      vl2Pct: 15,
      vl3Pct: 89,
      region: 'NR',
      weather: 'RAIN',
      equipmentCategory: 'Cable',
      equipment: 'Underground cable',
      causeGroup: 'EQUIPMENT FAILURE',
      cause: 'CABLE FAULT',
      faultyComponent: 'Cable joint',
      remarkCauseReason: 'Moisture ingress at cable joint',
      minimum: 15,
      interferenceBy: 'Internal',
      objectPartGroup: 'Cable System',
      objectPartCode: 'CABLE JOINT',
      damageGroup: 'INSULATION FAILURE',
      damageCode: 'Moisture damage',
      totalCMI: '0000000036',
      manualCreatedIDR: 'Yes',
      distributionFault: 'Yes'
    },
    {
      idrNo: '1789456-1',
      date: '2025/11/02',
      time: '08:15',
      voltageLevel: '11kV',
      circuit: '(KLN) Kowloon City Feeder No.3',
      faultyPhase: 'L3',
      durationMs: 65,
      vl1Pct: 92,
      vl2Pct: 93,
      vl3Pct: 22,
      region: 'NR',
      weather: 'FINE',
      equipmentCategory: 'Plant',
      equipment: 'Circuit breaker',
      causeGroup: 'OPERATIONAL',
      cause: 'SWITCHING OPERATION',
      faultyComponent: 'Breaker mechanism',
      remarkCauseReason: 'Planned maintenance switching',
      minimum: 22,
      interferenceBy: 'Internal',
      objectPartGroup: 'Switchgear',
      objectPartCode: 'CIRCUIT BREAKER',
      damageGroup: 'N/A',
      damageCode: 'N/A',
      totalCMI: '0000000012',
      manualCreatedIDR: 'No',
      distributionFault: 'No'
    },
    {
      idrNo: '1823547-3',
      date: '2025/11/18',
      time: '16:45',
      voltageLevel: '400kV',
      circuit: '(T2) Bak Ping - She Shan No.2',
      faultyPhase: 'L1-L2',
      durationMs: 150,
      vl1Pct: 35,
      vl2Pct: 38,
      vl3Pct: 94,
      region: 'WER',
      weather: 'CLOUDY',
      equipmentCategory: 'OHL',
      equipment: 'Transmission tower',
      causeGroup: 'EXTERNAL INTERFERENCE',
      cause: 'BIRD CONTACT',
      faultyComponent: 'Insulator string',
      remarkCauseReason: 'Bird bridging across insulator',
      minimum: 35,
      interferenceBy: 'External',
      objectPartGroup: 'Tower Equipment',
      objectPartCode: 'INSULATOR',
      damageGroup: 'FLASHOVER',
      damageCode: 'Animal contact',
      totalCMI: '0000000085',
      manualCreatedIDR: 'No',
      distributionFault: 'No'
    },
    {
      idrNo: '1945632-1',
      date: '2025/10/28',
      time: '11:30',
      voltageLevel: '132kV',
      circuit: '(NT) New Territories Tuen Mun Feeder',
      faultyPhase: 'L2',
      durationMs: 95,
      vl1Pct: 87,
      vl2Pct: 42,
      vl3Pct: 88,
      region: 'NR',
      weather: 'FINE',
      equipmentCategory: 'Cable',
      equipment: 'Cable termination',
      causeGroup: 'AGEING',
      cause: 'EQUIPMENT DETERIORATION',
      faultyComponent: 'Cable head',
      remarkCauseReason: 'End of life equipment failure',
      minimum: 42,
      interferenceBy: 'Internal',
      objectPartGroup: 'Cable Accessories',
      objectPartCode: 'TERMINATION',
      damageGroup: 'AGEING FAILURE',
      damageCode: 'Insulation breakdown',
      totalCMI: '0000000054',
      manualCreatedIDR: 'Yes',
      distributionFault: 'Yes'
    },
    {
      idrNo: '2034521-2',
      date: '2025/11/25',
      time: '19:05',
      voltageLevel: '11kV',
      circuit: '(TSW) Tsuen Wan Industrial Area',
      faultyPhase: 'L1-E',
      durationMs: 70,
      vl1Pct: 18,
      vl2Pct: 89,
      vl3Pct: 90,
      region: 'WER',
      weather: 'RAIN',
      equipmentCategory: 'CHL',
      equipment: 'Distribution fuse',
      causeGroup: 'OVERLOAD',
      cause: 'EXCESSIVE LOAD',
      faultyComponent: 'Fuse element',
      remarkCauseReason: 'Customer load surge',
      minimum: 18,
      interferenceBy: 'External',
      objectPartGroup: 'Protection Device',
      objectPartCode: 'FUSE',
      damageGroup: 'OVERCURRENT',
      damageCode: 'Fuse operation',
      totalCMI: '0000000028',
      manualCreatedIDR: 'No',
      distributionFault: 'Yes'
    },
    {
      idrNo: '2156789-1',
      date: '2025/12/05',
      time: '03:20',
      voltageLevel: '400kV',
      circuit: '(T3) Castle Peak - Bak Ping No.3',
      faultyPhase: 'L3-E',
      durationMs: 180,
      vl1Pct: 91,
      vl2Pct: 92,
      vl3Pct: 8,
      region: 'WER',
      weather: 'FOG',
      equipmentCategory: 'OHL',
      equipment: 'Overhead line',
      causeGroup: 'WEATHER',
      cause: 'LIGHTNING',
      faultyComponent: 'Lightning arrester',
      remarkCauseReason: 'Lightning strike on transmission line',
      minimum: 8,
      interferenceBy: 'External',
      objectPartGroup: 'Line Protection',
      objectPartCode: 'ARRESTER',
      damageGroup: 'SURGE DAMAGE',
      damageCode: 'Lightning damage',
      totalCMI: '0000000156',
      manualCreatedIDR: 'No',
      distributionFault: 'No'
    }
  ], []);

  const handleVoltageDipSearch = () => {
    // Filter mock data based on criteria
    let filtered = mockVoltageDipSummaryData;
    
    // Filter by date range
    if (vdIncidentTimeFrom && vdIncidentTimeTo) {
      filtered = filtered.filter(rec => {
        const recDate = rec.date.replace(/\//g, '-');
        const fromDate = vdIncidentTimeFrom.replace(/\//g, '-');
        const toDate = vdIncidentTimeTo.replace(/\//g, '-');
        return recDate >= fromDate && recDate <= toDate;
      });
    }

    // Filter by region
    if (vdRegion !== 'All') {
      filtered = filtered.filter(rec => rec.region === vdRegion);
    }

    // Filter by voltage level
    if (vdVoltageLevel.length > 0) {
      filtered = filtered.filter(rec => vdVoltageLevel.includes(rec.voltageLevel));
    }

    setVdSearchResults(filtered);
    setVdShowResults(true);
  };

  const handleVoltageDipExport = () => {
    try {
      const exportRows = vdSearchResults.map((rec) => ({
        'IDR No.': rec.idrNo,
        'Date': rec.date,
        'Time': rec.time,
        'Voltage Level': rec.voltageLevel,
        'Circuit': rec.circuit,
        'Faulty Phase': rec.faultyPhase,
        'Duration (ms)': rec.durationMs,
        'VL1(%)': rec.vl1Pct,
        'VL2(%)': rec.vl2Pct,
        'VL3(%)': rec.vl3Pct,
        'Region': rec.region,
        'Weather': rec.weather,
        'Equipment Category': rec.equipmentCategory,
        'Equipment': rec.equipment,
        'Cause Group': rec.causeGroup,
        'Cause': rec.cause,
        'Faulty Component': rec.faultyComponent,
        'Remark (Cause / Reason)': rec.remarkCauseReason,
        'Minimum': rec.minimum,
        'Interference by': rec.interferenceBy,
        'Object Part Group': rec.objectPartGroup,
        'Object Part Code': rec.objectPartCode,
        'Damage Group': rec.damageGroup,
        'Damage Code': rec.damageCode,
        'Total CMI': rec.totalCMI,
        'Manual Created IDR': rec.manualCreatedIDR,
        'Distribution Fault': rec.distributionFault
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Voltage Dip Summary');

      const fileName = `Voltage_Dip_Summary_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Voltage Dip export error:', error);
      alert('Failed to export report');
    }
  };

  const vdSummaryStats = useMemo(() => {
    const stats = {
      total400kV: vdSearchResults.filter(r => r.voltageLevel === '400kV').length,
      total132kV: vdSearchResults.filter(r => r.voltageLevel === '132kV').length,
      totalNR: vdSearchResults.filter(r => r.region === 'NR').length,
      totalWER: vdSearchResults.filter(r => r.region === 'WER').length,
      totalCHL: vdSearchResults.filter(r => r.equipmentCategory === 'CHL').length,
      totalPlant: vdSearchResults.filter(r => r.equipmentCategory === 'Plant').length,
      totalExternal: vdSearchResults.filter(r => r.faultyComponent === 'External').length,
      totalInternal: vdSearchResults.filter(r => r.faultyComponent === 'Internal').length
    };
    return stats;
  }, [vdSearchResults]);

  const toggleVdVoltageLevel = (level: string) => {
    setVdVoltageLevel(prev => 
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  return (
    <div>

      {/* Voltage Dip Summary Report View */}
      {selectedReportView === 'voltageDipSummary' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-blue-700 mb-5 pb-3 border-b border-blue-200 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Voltage Dip Summary Report
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Incident Time From: <span className="text-slate-500 font-normal">(yyyy/mm/dd hh:mm)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={vdIncidentTimeFrom}
                    onChange={(e) => setVdIncidentTimeFrom(e.target.value)}
                    placeholder="YYYY/MM/DD"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="HH:MM"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Incident Time To: <span className="text-slate-500 font-normal">(yyyy/mm/dd hh:mm)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={vdIncidentTimeTo}
                    onChange={(e) => setVdIncidentTimeTo(e.target.value)}
                    placeholder="YYYY/MM/DD"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="HH:MM"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Voltage Level:</label>
                <div className="flex items-center gap-3 flex-wrap">
                  {['11kV', '132kV', '400kV'].map((level) => (
                    <label key={level} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vdVoltageLevel.includes(level)}
                        onChange={() => toggleVdVoltageLevel(level)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm font-medium text-slate-700">{level}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  % of Voltage Remaining V {"(<->)"}:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={vdVoltageRemainingFrom}
                    onChange={(e) => setVdVoltageRemainingFrom(e.target.value)}
                    placeholder="From"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={vdVoltageRemainingTo}
                    onChange={(e) => setVdVoltageRemainingTo(e.target.value)}
                    placeholder="To"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Duration (ms): <span className="text-slate-500 font-normal">From {"(<->) To (<->)"}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={vdDurationFrom}
                    onChange={(e) => setVdDurationFrom(e.target.value)}
                    placeholder="From"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={vdDurationTo}
                    onChange={(e) => setVdDurationTo(e.target.value)}
                    placeholder="To"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Region:</label>
                <div className="flex items-center gap-3 flex-wrap">
                  {['NR', 'WER', 'All'].map((region) => (
                    <label key={region} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="vd_region"
                        checked={vdRegion === region}
                        onChange={() => setVdRegion(region)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm font-medium text-slate-700">{region}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleVoltageDipSearch}
                className="px-6 py-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-bold text-sm"
              >
                Search
              </button>
              <button
                type="button"
                onClick={handleVoltageDipExport}
                disabled={!vdShowResults}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export
              </button>
            </div>
          </div>

          {/* Fault Type Tabs and Results */}
          {vdShowResults && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex border-b border-slate-300">
                <button
                  type="button"
                  onClick={() => setVdFaultTypeTab('transmission')}
                  className={classNames(
                    'flex-1 px-6 py-3 font-bold text-sm transition-colors',
                    vdFaultTypeTab === 'transmission'
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  )}
                >
                  Transmission Fault
                </button>
                <button
                  type="button"
                  onClick={() => setVdFaultTypeTab('distribution')}
                  className={classNames(
                    'flex-1 px-6 py-3 font-bold text-sm transition-colors',
                    vdFaultTypeTab === 'distribution'
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  )}
                >
                  Distribution Fault
                </button>
              </div>

              {/* Summary Statistics */}
              <div className="p-5 bg-gradient-to-r from-blue-50 to-cyan-50">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                  <div className="bg-blue-600 text-white p-3 rounded-lg">
                    <p className="text-xs font-bold opacity-90">No. of 400kV:</p>
                    <p className="text-2xl font-extrabold mt-1">{vdSummaryStats.total400kV}/{vdSearchResults.length}</p>
                  </div>
                  <div className="bg-blue-500 text-white p-3 rounded-lg">
                    <p className="text-xs font-bold opacity-90">No. of 132kV:</p>
                    <p className="text-2xl font-extrabold mt-1">{vdSummaryStats.total132kV}/{vdSearchResults.length}</p>
                  </div>
                  <div className="bg-cyan-600 text-white p-3 rounded-lg">
                    <p className="text-xs font-bold opacity-90">No. of NR:</p>
                    <p className="text-2xl font-extrabold mt-1">{vdSummaryStats.totalNR}/{vdSearchResults.length}</p>
                  </div>
                  <div className="bg-cyan-500 text-white p-3 rounded-lg">
                    <p className="text-xs font-bold opacity-90">No. of WER:</p>
                    <p className="text-2xl font-extrabold mt-1">{vdSummaryStats.totalWER}/{vdSearchResults.length}</p>
                  </div>
                  <div className="bg-sky-600 text-white p-3 rounded-lg">
                    <p className="text-xs font-bold opacity-90">No. of CHL:</p>
                    <p className="text-2xl font-extrabold mt-1">{vdSummaryStats.totalCHL}/{vdSearchResults.length}</p>
                  </div>
                  <div className="bg-sky-500 text-white p-3 rounded-lg">
                    <p className="text-xs font-bold opacity-90">No. of Plant:</p>
                    <p className="text-2xl font-extrabold mt-1">{vdSummaryStats.totalPlant}/{vdSearchResults.length}</p>
                  </div>
                  <div className="bg-rose-600 text-white p-3 rounded-lg">
                    <p className="text-xs font-bold opacity-90">No. of External Fault:</p>
                    <p className="text-2xl font-extrabold mt-1">{vdSummaryStats.totalExternal}/{vdSearchResults.length}</p>
                  </div>
                  <div className="bg-rose-500 text-white p-3 rounded-lg">
                    <p className="text-xs font-bold opacity-90">No. of Internal Fault:</p>
                    <p className="text-2xl font-extrabold mt-1">{vdSummaryStats.totalInternal}/{vdSearchResults.length}</p>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-sky-600 text-white">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">No</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">IDR No.</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Date (yyyy/mm/dd)</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Time (HH:MI)</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Voltage</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Circuit</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Faulty Phase</th>
                      <th className="px-3 py-2 text-right text-xs font-bold whitespace-nowrap">Duration (ms)</th>
                      <th className="px-3 py-2 text-right text-xs font-bold whitespace-nowrap">VL1(%)</th>
                      <th className="px-3 py-2 text-right text-xs font-bold whitespace-nowrap">VL2(%)</th>
                      <th className="px-3 py-2 text-right text-xs font-bold whitespace-nowrap">VL3(%)</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Region</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Weather</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Equipment Category</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Equipment</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Cause Group</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Cause</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Faulty Component</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Remark (Cause / Reason)</th>
                      <th className="px-3 py-2 text-right text-xs font-bold whitespace-nowrap">Minimum</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Interference by</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Object Part Group</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Object Part Code</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Damage Group</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Damage Code</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Total CMI</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Manual Created IDR</th>
                      <th className="px-3 py-2 text-left text-xs font-bold whitespace-nowrap">Distribution Fault</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vdSearchResults.length === 0 ? (
                      <tr>
                        <td colSpan={28} className="px-3 py-8 text-center text-slate-500">
                          No results found. Please adjust your filters and search again.
                        </td>
                      </tr>
                    ) : (
                      vdSearchResults.map((rec, idx) => (
                        <tr key={idx} className="hover:bg-blue-50">
                          <td className="px-3 py-2 text-slate-700">{idx + 1}</td>
                          <td className="px-3 py-2 text-blue-600 font-semibold">{rec.idrNo}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{rec.date}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{rec.time}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{rec.voltageLevel}</td>
                          <td className="px-3 py-2 text-slate-700 max-w-md truncate" title={rec.circuit}>{rec.circuit}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{rec.faultyPhase}</td>
                          <td className="px-3 py-2 text-slate-700 text-right">{rec.durationMs}</td>
                          <td className="px-3 py-2 text-slate-700 text-right">{rec.vl1Pct}</td>
                          <td className="px-3 py-2 text-slate-700 text-right">{rec.vl2Pct}</td>
                          <td className="px-3 py-2 text-slate-700 text-right">{rec.vl3Pct}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{rec.region}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{rec.weather}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{rec.equipmentCategory}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{rec.equipment}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{rec.causeGroup}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{rec.cause}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{rec.faultyComponent}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{rec.remarkCauseReason}</td>
                          <td className="px-3 py-2 text-slate-700 text-right">{rec.minimum}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{rec.interferenceBy}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{rec.objectPartGroup}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{rec.objectPartCode}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{rec.damageGroup}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{rec.damageCode}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{rec.totalCMI}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{rec.manualCreatedIDR}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{rec.distributionFault}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Customer Power Disturbance Information System Dashboard */}
      {selectedReportView === 'customerPowerDisturbance' && (
        <CPDISDashboard />
      )}
    </div>
  );
}

export default function Reporting() {
  const [activeTab, setActiveTab] = useState<ReportingTab>('pqSummary');
  const [pqSummaryReportView, setPqSummaryReportView] = useState<PQSummaryReportView>('voltageDipSummary');
  const [showPqSummaryDropdown, setShowPqSummaryDropdown] = useState(false);
  const [complianceReportView, setComplianceReportView] = useState<ComplianceSummaryReportView>('pqStandards');
  const [showComplianceDropdown, setShowComplianceDropdown] = useState(false);

  const tabs = useMemo(
    () =>
      [
        { id: 'pqSummary', label: 'PQ Summary' },
        { id: 'complianceSummary', label: 'Compliance Summary' },
        { id: 'meterCommunication', label: 'Meter Communication' },
        { id: 'dynamicReport', label: 'Dynamic Report' },
        { id: 'pqsisMaintenance', label: 'PQSIS Maintenance' }
      ] as const,
    []
  );

  const pqSummaryOptions = [
    { value: 'voltageDipSummary', label: 'Voltage Dip Summary Report' },
    { value: 'customerPowerDisturbance', label: 'Customer Power Disturbance Information System Dashboard' }
  ];

  const complianceOptions = [
    { value: 'pqStandards', label: 'PQ Standards Report' },
    { value: 'voltageDipBenchmarking', label: 'Voltage Dip Benchmarking' },
    { value: 'individualHarmonics', label: 'Individual Harmonic Reports' },
    { value: 'en50160', label: 'EN50160 Reports' }
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-slate-700" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Reporting</h1>
              <p className="text-slate-600 mt-1">Generate and manage power quality reports</p>
            </div>
          </div>

          <NotificationBell />
        </div>

        <div className="mt-4 border-b border-slate-200">
          <div className="flex items-center gap-6">
            {tabs.map((t) => {
              if (t.id === 'pqSummary') {
                return (
                  <div key={t.id} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab(t.id);
                        setShowPqSummaryDropdown(!showPqSummaryDropdown);
                      }}
                      className={classNames(
                        'py-3 px-2 text-sm font-semibold transition-colors flex items-center gap-2',
                        activeTab === t.id
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {t.label}
                      <ChevronRight className={classNames(
                        'w-4 h-4 transition-transform',
                        showPqSummaryDropdown && activeTab === t.id ? 'rotate-90' : ''
                      )} />
                    </button>
                    {showPqSummaryDropdown && activeTab === t.id && (
                      <div className="absolute top-full left-0 mt-1 w-96 bg-white border border-slate-200 rounded-lg shadow-xl z-50">
                        {pqSummaryOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setPqSummaryReportView(opt.value as PQSummaryReportView);
                              setShowPqSummaryDropdown(false);
                            }}
                            className={classNames(
                              'w-full text-left px-4 py-3 text-sm transition-colors hover:bg-blue-50',
                              pqSummaryReportView === opt.value ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-slate-700'
                            )}
                          >
                            {opt.value === pqSummaryReportView && (
                              <Check className="w-4 h-4 inline mr-2" />
                            )}
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              if (t.id === 'complianceSummary') {
                return (
                  <div key={t.id} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab(t.id);
                        setShowComplianceDropdown(!showComplianceDropdown);
                      }}
                      className={classNames(
                        'py-3 px-2 text-sm font-semibold transition-colors flex items-center gap-2',
                        activeTab === t.id
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {t.label}
                      <ChevronRight className={classNames(
                        'w-4 h-4 transition-transform',
                        showComplianceDropdown && activeTab === t.id ? 'rotate-90' : ''
                      )} />
                    </button>
                    {showComplianceDropdown && activeTab === t.id && (
                      <div className="absolute top-full left-0 mt-1 w-96 bg-white border border-slate-200 rounded-lg shadow-xl z-50">
                        {complianceOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setComplianceReportView(opt.value as ComplianceSummaryReportView);
                              setShowComplianceDropdown(false);
                            }}
                            className={classNames(
                              'w-full text-left px-4 py-3 text-sm transition-colors hover:bg-blue-50',
                              complianceReportView === opt.value ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-slate-700'
                            )}
                          >
                            {opt.value === complianceReportView && (
                              <Check className="w-4 h-4 inline mr-2" />
                            )}
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={classNames(
                    'py-3 text-sm font-semibold transition-colors',
                    activeTab === t.id
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        {activeTab === 'pqSummary' && <PQSummaryTab selectedReportView={pqSummaryReportView} />}

        {activeTab === 'complianceSummary' && <ComplianceSummaryTab selectedReportView={complianceReportView} />}

        {activeTab === 'meterCommunication' && <MeterCommunicationTab />}

        {activeTab === 'dynamicReport' && <ReportBuilder events={[]} substations={[]} />}

        {activeTab === 'pqsisMaintenance' && <PQSISMaintenanceTab />}
      </div>
    </div>
  );
}
