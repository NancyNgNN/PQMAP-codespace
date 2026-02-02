import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Filter,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X
} from 'lucide-react';
import ReportBuilder from './Dashboard/ReportBuilder/ReportBuilder';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
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

type PQSummaryEvent = {
  eventId: string;
  date: string; // YYYY-MM-DD
  eventType: PQSummaryEventType;
  severity: PQSummarySeverity;
  duration: string;
  locationCode: string;
  locationName: string;
  voltageLevel: string;
  timestamp: string; // YYYY-MM-DD HH:mm:ss
  magnitudePercent: number;
  durationSeconds: number;
  cause: string;
  affectedCustomers: PQSummaryCustomer[];
  serviceLogs: PQSummaryServiceLog[];
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

type PQSummaryModal = 'customers' | 'serviceLogs' | 'eventDetails' | null;

type ReportingTab = 'pqSummary' | 'benchmarking' | 'voltageCurrentProfile' | 'dataMaintenance' | 'meterCommunication' | 'dynamicReport';

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

const parseYYYYMMDDDashed = (value: string): Date | null => {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
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

function BenchmarkingTab() {
  const [subTab, setSubTab] = useState<'pqStandards' | 'voltageDip'>('pqStandards');

  const [standards, setStandards] = useState<PQBenchmarkStandardMock[]>(() => [
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

  const [searchText, setSearchText] = useState('');
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
        const hay = `${s.name} ${s.family} ${s.parameter} ${s.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [standards, searchText, filterFamily, filterParameter]);

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

  // Voltage Dip Benchmarking flow
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

  // Pagination for PQ Standards
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
      { id: 'vd-001', groupId: '20250605001_HIGH', meter: 'PQMS_400KVBKP0227_SHE1', timestamp: '2025-06-05 00:12:40', location: 'BKP - Bak Ping', durationSec: 10.329, remainingVoltagePct: 0 },
      { id: 'vd-002', groupId: '20250924020_HIGH', meter: 'PQMS_400KVBKP0227_SHE1', timestamp: '2025-09-24 02:03:12', location: 'BKP - Bak Ping', durationSec: 10.33, remainingVoltagePct: 0 },
      { id: 'vd-003', groupId: '20250924038_HIGH', meter: 'PQMS_400KVBKP0227_SHE1', timestamp: '2025-09-24 03:44:03', location: 'BKP - Bak Ping', durationSec: 0.078, remainingVoltagePct: 50.605 },
      { id: 'vd-004', groupId: '20250924030_HIGH', meter: 'PQMS_400KVBKP0256_CPK1', timestamp: '2025-09-24 03:25:22', location: 'CPK - Castle Peak', durationSec: 0.09, remainingVoltagePct: 64.817 },
      { id: 'vd-005', groupId: '20250924030_HIGH', meter: 'PQMS_400KVBKP0227_SHE1', timestamp: '2025-09-24 03:31:54', location: 'BKP - Bak Ping', durationSec: 0.09, remainingVoltagePct: 64.819 },
      { id: 'vd-006', groupId: '20250924030_HIGH', meter: 'PQMS_400KVBKP0256_CPK1', timestamp: '2025-09-24 03:35:10', location: 'CPK - Castle Peak', durationSec: 0.081, remainingVoltagePct: 67.396 },
      { id: 'vd-007', groupId: '20250924037_HIGH', meter: 'PQMS_400KVBKP0227_SHE1', timestamp: '2025-09-24 03:42:22', location: 'BKP - Bak Ping', durationSec: 0.071, remainingVoltagePct: 67.42 },
      { id: 'vd-008', groupId: '20250924013_HIGH', meter: 'PQMS_400KVBKP0227_SHE1', timestamp: '2025-09-24 01:15:33', location: 'BKP - Bak Ping', durationSec: 0.067, remainingVoltagePct: 74.987 },
      { id: 'vd-009', groupId: '20250908001_HIGH', meter: 'PQMS_400KVBKP0227_SHE1', timestamp: '2025-09-08 00:22:10', location: 'BKP - Bak Ping', durationSec: 0.03, remainingVoltagePct: 83.955 },
      { id: 'vd-010', groupId: '20250908001_HIGH', meter: 'PQMS_400KVBKP0227_SHE1', timestamp: '2025-09-08 00:25:45', location: 'BKP - Bak Ping', durationSec: 0.039, remainingVoltagePct: 84.294 }
    ],
    []
  );

  const voltageDipResults = useMemo(() => {
    if (!vdHasResult || !selectedStandard) return [] as Array<VoltageDipBenchmarkEventMock & { requiredPct: number; pass: boolean }>;
    const curve = selectedStandard.curvePoints;
    return mockVoltageDipEvents.map((e) => {
      const requiredPct = getVoltageRequirementAtDuration(curve, e.durationSec);
      const pass = e.remainingVoltagePct >= requiredPct;
      return { ...e, requiredPct, pass };
    });
  }, [vdHasResult, selectedStandard, mockVoltageDipEvents]);

  const vdSummary = useMemo(() => {
    const total = voltageDipResults.length;
    const pass = voltageDipResults.filter((r) => r.pass).length;
    const fail = total - pass;
    const passRate = total > 0 ? Math.round((pass / total) * 1000) / 10 : 0;
    return { total, pass, fail, passRate };
  }, [voltageDipResults]);

  const chartData = useMemo(() => {
    const curve = selectedStandard?.curvePoints ?? [];
    const curveSorted = [...curve].sort((a, b) => a.durationSec - b.durationSec);
    const curveSeries = curveSorted.map((p) => ({ durationSec: p.durationSec, minVoltagePct: p.minVoltagePct }));
    const eventSeries = voltageDipResults.map((e) => ({
      durationSec: e.durationSec,
      remainingVoltagePct: e.remainingVoltagePct,
      pass: e.pass
    }));
    return { curveSeries, eventSeries };
  }, [selectedStandard, voltageDipResults]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-slate-700" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">Benchmarking</h2>
            <p className="text-sm text-slate-600 mt-1">PQ standards and benchmarking preview workflow</p>
          </div>
        </div>

        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setSubTab('pqStandards')}
            className={classNames(
              'px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
              subTab === 'pqStandards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white'
            )}
          >
            PQ Standards
          </button>
          <button
            type="button"
            onClick={() => setSubTab('voltageDip')}
            className={classNames(
              'px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
              subTab === 'voltageDip' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white'
            )}
          >
            Voltage Dip Benchmarking
          </button>
        </div>
      </div>

      {subTab === 'pqStandards' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative w-full max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search standard..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                      <option key={f} value={f}>
                        {f}
                      </option>
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
                  <th className="text-left text-xs font-bold px-4 py-3">Standard</th>
                  <th className="text-left text-xs font-bold px-4 py-3">Version</th>
                  <th className="text-left text-xs font-bold px-4 py-3">Category</th>
                  <th className="text-left text-xs font-bold px-4 py-3">Parameter</th>
                  <th className="text-left text-xs font-bold px-4 py-3">Level</th>
                  <th className="text-left text-xs font-bold px-4 py-3">Min</th>
                  <th className="text-left text-xs font-bold px-4 py-3">Max</th>
                  <th className="text-left text-xs font-bold px-4 py-3">Unit</th>
                  <th className="text-left text-xs font-bold px-4 py-3">Remarks</th>
                  <th className="text-right text-xs font-bold px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedStandards.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                      No standards match your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedStandards.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{s.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{s.version || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{s.category || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{s.parameter}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{s.level || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{s.min || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{s.max || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{s.unit || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{s.remarks || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditStandard(s)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteStandard(s.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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
            
            {/* Pagination */}
            {filteredStandards.length > 0 && (
              <div className="px-4 py-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600">
                <div>
                  Page {currentPage} of {totalPages} • {itemsPerPage} items per page
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'voltageDip' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mt-6">
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
                <span className="text-sm text-slate-700 font-medium">By Voltage Level of Mother Event</span>
              </label>
              
              {meterSelectMode === 'voltageLevel' && (
                <div className="ml-6 space-y-2">
                  <p className="text-xs font-bold text-slate-700 mb-2">Available list:</p>
                  {(['400KV', '132KV', '33KV', '11KV', '380V'] as const).map(level => (
                    <label key={level} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedVoltageLevels.includes(level)}
                        onChange={() => toggleVoltageLevel(level)}
                        className="text-blue-600 rounded"
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
                <span className="text-sm text-slate-700 font-medium">By Individual Meters</span>
              </label>

              {meterSelectMode === 'individual' && (
                <div className="ml-6">
                  <div className="relative mb-3">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={meterSearch}
                      onChange={(e) => setMeterSearch(e.target.value)}
                      placeholder="Search meters"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white">
                    {filteredVdMeters.map(m => (
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
              )}
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-4">2. Set time range: (Max. of 1 year)</h3>
            <div className="space-y-3 mb-6">
              <div className="vd-start-date-container relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">From:</label>
                <input
                  type="text"
                  value={vdStartDate}
                  onClick={() => setVdStartOpen(true)}
                  readOnly
                  placeholder="YYYY/MM/DD"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg cursor-pointer bg-white"
                />
                {vdStartOpen && (
                  <div className="absolute z-50 mt-1">
                    <DatePickerPopover
                      value={vdStartDate}
                      onChange={(next) => {
                        setVdStartDate(next);
                        setVdStartOpen(false);
                      }}
                      onClose={() => setVdStartOpen(false)}
                    />
                  </div>
                )}
              </div>

              <div className="vd-end-date-container relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">To:</label>
                <input
                  type="text"
                  value={vdEndDate}
                  onClick={() => setVdEndOpen(true)}
                  readOnly
                  placeholder="YYYY/MM/DD"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg cursor-pointer bg-white"
                />
                {vdEndOpen && (
                  <div className="absolute z-50 mt-1">
                    <DatePickerPopover
                      value={vdEndDate}
                      onChange={(next) => {
                        setVdEndDate(next);
                        setVdEndOpen(false);
                      }}
                      onClose={() => setVdEndOpen(false)}
                    />
                  </div>
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
              <div className="py-20 text-center">
                <p className="text-slate-600 font-medium">No results yet</p>
                <p className="text-sm text-slate-500 mt-2">Select meter(s), set time range, and click "GET BENCHMARK RESULT"</p>
              </div>
            )}


            {vdHasResult && selectedStandard && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-600 uppercase">Standard</p>
                  <p className="mt-1 font-bold text-slate-900">{selectedStandard.family}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-700 uppercase">Total Events</p>
                  <p className="mt-1 text-2xl font-extrabold text-blue-800">{vdSummary.total}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-green-700 uppercase">Pass</p>
                  <p className="mt-1 text-2xl font-extrabold text-green-800">{vdSummary.pass}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-red-700 uppercase">Fail</p>
                  <p className="mt-1 text-2xl font-extrabold text-red-800">{vdSummary.fail}</p>
                  <p className="mt-1 text-xs font-semibold text-red-700">Pass Rate: {vdSummary.passRate}%</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-slate-900">Benchmark Curve & Events</p>
                  <p className="text-xs text-slate-500">X: Duration (s), Y: Remaining Voltage (%)</p>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        dataKey="durationSec"
                        domain={[0, 1]}
                        tick={{ fontSize: 12 }}
                        label={{ value: 'Duration (s)', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fontSize: 12 }}
                        label={{ value: 'Remaining Voltage (%)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip />
                      <Line
                        data={chartData.curveSeries}
                        type="monotone"
                        dataKey="minVoltagePct"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        name="Min Requirement"
                      />
                      <Scatter
                        data={chartData.eventSeries.filter((e) => e.pass)}
                        name="Pass"
                        fill="#16a34a"
                        line={false}
                        shape="circle"
                        dataKey="remainingVoltagePct"
                      />
                      <Scatter
                        data={chartData.eventSeries.filter((e) => !e.pass)}
                        name="Fail"
                        fill="#dc2626"
                        line={false}
                        shape="circle"
                        dataKey="remainingVoltagePct"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Results Table */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Benchmark Results</h3>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-sm flex items-center gap-2">
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                      <button className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        CSV
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-900 text-white">
                        <tr>
                          <th className="text-left text-xs font-bold px-4 py-3">Group ID</th>
                          <th className="text-left text-xs font-bold px-4 py-3">Meter</th>
                          <th className="text-left text-xs font-bold px-4 py-3">Timestamp</th>
                          <th className="text-left text-xs font-bold px-4 py-3">Location</th>
                          <th className="text-left text-xs font-bold px-4 py-3">Duration (s)</th>
                          <th className="text-left text-xs font-bold px-4 py-3">Remaining Voltage (%)</th>
                          <th className="text-left text-xs font-bold px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {voltageDipResults.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm text-slate-700">{r.groupId || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{r.meter || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{r.timestamp}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{r.location}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{r.durationSec.toFixed(3)}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{r.remainingVoltagePct.toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <span className={classNames(
                                'px-3 py-1 rounded-full text-xs font-bold',
                                r.pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              )}>
                                {r.pass ? 'Compliant' : 'Non-Compliant'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="hidden bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <p className="font-bold text-slate-900">Detailed Results</p>
                  <span className="text-xs text-slate-500">Preview dataset</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left text-xs font-bold text-slate-700 uppercase tracking-wider px-4 py-3">Timestamp</th>
                        <th className="text-left text-xs font-bold text-slate-700 uppercase tracking-wider px-4 py-3">Location</th>
                        <th className="text-right text-xs font-bold text-slate-700 uppercase tracking-wider px-4 py-3">Duration (s)</th>
                        <th className="text-right text-xs font-bold text-slate-700 uppercase tracking-wider px-4 py-3">Remaining (%)</th>
                        <th className="text-right text-xs font-bold text-slate-700 uppercase tracking-wider px-4 py-3">Requirement (%)</th>
                        <th className="text-left text-xs font-bold text-slate-700 uppercase tracking-wider px-4 py-3">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {voltageDipResults.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-700">{r.timestamp}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{r.location}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 text-right font-semibold">{r.durationSec.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 text-right font-semibold">{r.remainingVoltagePct.toFixed(0)}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 text-right font-semibold">{r.requiredPct.toFixed(0)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={classNames(
                                'text-xs font-bold px-2.5 py-1 rounded-full border',
                                r.pass
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              )}
                            >
                              {r.pass ? 'PASS' : 'FAIL'}
                            </span>
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
        </div>
      )}

      {standardModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {standardModalMode === 'create' ? 'Add New Standard' : 'Edit Standard'}
                </h3>
                <p className="text-sm text-slate-600 mt-1">Preview only (stored in memory)</p>
              </div>
              <button
                type="button"
                onClick={() => setStandardModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
                title="Close"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Standard Name</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="e.g. SEMI F47"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Family</label>
                  <select
                    value={formFamily}
                    onChange={(e) => setFormFamily(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="IEC">IEC</option>
                    <option value="SEMI">SEMI</option>
                    <option value="ITIC">ITIC</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Parameter</label>
                  <select
                    value={formParameter}
                    onChange={(e) => setFormParameter(e.target.value as BenchmarkParameter)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="Voltage Dip">Voltage Dip</option>
                    <option value="Voltage Swell">Voltage Swell</option>
                    <option value="Interruption">Interruption</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="Optional"
                />
              </div>

              {formParameter === 'Voltage Dip' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-sm font-bold text-slate-900">Voltage Dip Curve (Preview)</p>
                  <p className="text-xs text-slate-600 mt-1">
                    New standards default to a basic curve; editing curve points will be added later.
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStandardModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveStandard}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Delete Standard</h3>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
                title="Close"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-700">
                Are you sure you want to delete this PQ Standard? This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold"
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

function PQSummaryTab() {
  const pqSummaryDefaults = useMemo(
    () => ({
      searchText: '',
      startDate: '2025/01/01',
      endDate: '2025/12/29',
      includeHarmonic: true,
      includeVoltage: true,
      includeInterruptions: true
    }),
    []
  );

  const [pqSummaryFilterForm, setPQSummaryFilterForm] = useState(pqSummaryDefaults);
  const [pqSummaryFilters, setPQSummaryFilters] = useState(pqSummaryDefaults);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [isExporting, setIsExporting] = useState(false);

  const [pqModal, setPQModal] = useState<PQSummaryModal>(null);
  const [pqSelectedEventId, setPQSelectedEventId] = useState<string | null>(null);
  const [pqEventStatus, setPQEventStatus] = useState<'New' | 'Acknowledged' | 'Investigating' | 'Resolved'>('Acknowledged');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showStartPicker && !target.closest('.pq-start-picker-container')) {
        setShowStartPicker(false);
      }
      if (showEndPicker && !target.closest('.pq-end-picker-container')) {
        setShowEndPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStartPicker, showEndPicker]);

  const pqSummaryMockEvents = useMemo<PQSummaryEvent[]>(() => {
    const affectedCustomersBase: PQSummaryCustomer[] = [
      {
        customerId: 'CUST-001',
        customerName: 'ABC Corp',
        accountNumber: 'AC-12345',
        address: '123 Business St, Kowloon',
        contactPerson: 'John Chan',
        phone: '2345-6789',
        impactLevel: 'High'
      },
      {
        customerId: 'CUST-002',
        customerName: 'ABC Corp - Building B',
        accountNumber: 'AC-12346',
        address: '125 Business St, Kowloon',
        contactPerson: 'Mary Wong',
        phone: '2345-6790',
        impactLevel: 'Medium'
      },
      {
        customerId: 'CUST-003',
        customerName: 'Retail Shop A',
        accountNumber: 'AC-12347',
        address: '127 Business St, Kowloon',
        contactPerson: 'David Lee',
        phone: '2345-6791',
        impactLevel: 'Low'
      },
      {
        customerId: 'CUST-004',
        customerName: 'Office Tower C',
        accountNumber: 'AC-12348',
        address: '129 Business St, Kowloon',
        contactPerson: 'Sarah Ng',
        phone: '2345-6792',
        impactLevel: 'Medium'
      },
      {
        customerId: 'CUST-005',
        customerName: 'Restaurant D',
        accountNumber: 'AC-12349',
        address: '131 Business St, Kowloon',
        contactPerson: 'Tom Cheung',
        phone: '2345-6793',
        impactLevel: 'High'
      },
      {
        customerId: 'CUST-006',
        customerName: 'Factory E',
        accountNumber: 'AC-12350',
        address: '133 Business St, Kowloon',
        contactPerson: 'Linda Lam',
        phone: '2345-6794',
        impactLevel: 'Critical'
      },
      {
        customerId: 'CUST-007',
        customerName: 'Mall F',
        accountNumber: 'AC-12351',
        address: '135 Business St, Kowloon',
        contactPerson: 'Peter Ho',
        phone: '2345-6795',
        impactLevel: 'Medium'
      },
      {
        customerId: 'CUST-008',
        customerName: 'Hospital G',
        accountNumber: 'AC-12352',
        address: '137 Business St, Kowloon',
        contactPerson: 'Dr. Wang',
        phone: '2345-6796',
        impactLevel: 'Critical'
      },
      {
        customerId: 'CUST-009',
        customerName: 'School H',
        accountNumber: 'AC-12353',
        address: '139 Business St, Kowloon',
        contactPerson: 'Principal Chen',
        phone: '2345-6797',
        impactLevel: 'High'
      },
      {
        customerId: 'CUST-010',
        customerName: 'Hotel I',
        accountNumber: 'AC-12354',
        address: '141 Business St, Kowloon',
        contactPerson: 'Manager Liu',
        phone: '2345-6798',
        impactLevel: 'Medium'
      },
      {
        customerId: 'CUST-011',
        customerName: 'Bank J',
        accountNumber: 'AC-12355',
        address: '143 Business St, Kowloon',
        contactPerson: 'Director Tsang',
        phone: '2345-6799',
        impactLevel: 'Critical'
      },
      {
        customerId: 'CUST-012',
        customerName: 'Gym K',
        accountNumber: 'AC-12356',
        address: '145 Business St, Kowloon',
        contactPerson: 'Owner Ko',
        phone: '2345-6800',
        impactLevel: 'Low'
      }
    ];

    const baseLogs: PQSummaryServiceLog[] = [
      {
        logId: 'LOG-001',
        status: 'In Progress',
        customerName: 'ABC Corp',
        date: '2025-12-28 10:30',
        technician: 'John Doe',
        action: 'Site inspection performed',
        description: 'Initial investigation completed'
      },
      {
        logId: 'LOG-002',
        status: 'Completed',
        customerName: 'ABC Corp - Building B',
        date: '2025-12-28 14:20',
        technician: 'Jane Smith',
        action: 'Equipment maintenance',
        description: 'Voltage regulator adjusted'
      }
    ];

    return [
      {
        eventId: 'EVT-2025-001',
        date: '2025-12-28',
        eventType: 'Voltage Dip',
        severity: 'High',
        duration: '0.5s',
        locationCode: 'SS-001',
        locationName: 'Airport West Third Runway',
        voltageLevel: '132kV',
        timestamp: '2025-12-28 10:17:00',
        magnitudePercent: 62.59,
        durationSeconds: 3.6,
        cause: 'Tree Contact',
        affectedCustomers: affectedCustomersBase,
        serviceLogs: baseLogs
      },
      {
        eventId: 'EVT-2025-002',
        date: '2025-12-27',
        eventType: 'Harmonic',
        severity: 'Medium',
        duration: '2.3h',
        locationCode: 'SS-003',
        locationName: 'Central Feeder A',
        voltageLevel: '33kV',
        timestamp: '2025-12-27 09:10:00',
        magnitudePercent: 18.2,
        durationSeconds: 0.9,
        cause: 'Load switching',
        affectedCustomers: affectedCustomersBase.slice(0, 5),
        serviceLogs: [baseLogs[1]]
      },
      {
        eventId: 'EVT-2025-003',
        date: '2025-12-26',
        eventType: 'Interruption',
        severity: 'Critical',
        duration: '15m',
        locationCode: 'SS-002',
        locationName: 'Harbour Industrial',
        voltageLevel: '132kV',
        timestamp: '2025-12-26 21:05:00',
        magnitudePercent: 0,
        durationSeconds: 900,
        cause: 'Breaker trip',
        affectedCustomers: affectedCustomersBase.slice(0, 8),
        serviceLogs: baseLogs
      },
      {
        eventId: 'EVT-2025-004',
        date: '2025-12-25',
        eventType: 'Voltage Swell',
        severity: 'Low',
        duration: '1.2s',
        locationCode: 'SS-005',
        locationName: 'New Town Substation',
        voltageLevel: '11kV',
        timestamp: '2025-12-25 13:45:00',
        magnitudePercent: 8.5,
        durationSeconds: 1.2,
        cause: 'Capacitor switching',
        affectedCustomers: [],
        serviceLogs: []
      },
      {
        eventId: 'EVT-2025-005',
        date: '2025-12-24',
        eventType: 'Harmonic',
        severity: 'Medium',
        duration: '4.1h',
        locationCode: 'SS-001',
        locationName: 'Airport West Third Runway',
        voltageLevel: '132kV',
        timestamp: '2025-12-24 08:20:00',
        magnitudePercent: 22.4,
        durationSeconds: 2.1,
        cause: 'Non-linear load',
        affectedCustomers: affectedCustomersBase.slice(0, 6),
        serviceLogs: [baseLogs[0]]
      }
    ];
  }, []);

  const pqSummarySelectedEvent = useMemo(() => {
    if (!pqSelectedEventId) return null;
    return pqSummaryMockEvents.find((e) => e.eventId === pqSelectedEventId) ?? null;
  }, [pqSelectedEventId, pqSummaryMockEvents]);

  const pqFilteredEvents = useMemo(() => {
    const start = parseYYYYMMDDSlashes(pqSummaryFilters.startDate);
    const end = parseYYYYMMDDSlashes(pqSummaryFilters.endDate);
    const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0).getTime() : null;
    const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime() : null;

    const searchLower = pqSummaryFilters.searchText.trim().toLowerCase();

    return pqSummaryMockEvents.filter((ev) => {
      const eventDate = parseYYYYMMDDDashed(ev.date);
      const eventTime = eventDate ? eventDate.getTime() : null;

      if (startTime !== null && eventTime !== null && eventTime < startTime) return false;
      if (endTime !== null && eventTime !== null && eventTime > endTime) return false;

      const isHarmonic = ev.eventType === 'Harmonic';
      const isInterruption = ev.eventType === 'Interruption';
      const isVoltage = ev.eventType === 'Voltage Dip' || ev.eventType === 'Voltage Swell';

      if (!pqSummaryFilters.includeHarmonic && isHarmonic) return false;
      if (!pqSummaryFilters.includeInterruptions && isInterruption) return false;
      if (!pqSummaryFilters.includeVoltage && isVoltage) return false;

      if (searchLower) {
        const matchEventId = ev.eventId.toLowerCase().includes(searchLower);
        const matchCustomer = ev.affectedCustomers.some((c) => {
          return (
            c.customerId.toLowerCase().includes(searchLower) ||
            c.customerName.toLowerCase().includes(searchLower) ||
            c.accountNumber.toLowerCase().includes(searchLower)
          );
        });
        if (!matchEventId && !matchCustomer) return false;
      }

      return true;
    });
  }, [pqSummaryFilters, pqSummaryMockEvents]);

  const handleOpenPQModal = (modal: Exclude<PQSummaryModal, null>, eventId: string) => {
    setPQModal(modal);
    setPQSelectedEventId(eventId);
  };

  const handleClosePQModal = () => {
    setPQModal(null);
    setPQSelectedEventId(null);
  };

  const handleExportPQSummaryReport = async () => {
    setIsExporting(true);
    try {
      const exportRows = pqFilteredEvents.map((ev) => ({
        'Event ID': ev.eventId,
        Date: ev.date,
        'Event Type': ev.eventType,
        Severity: ev.severity,
        Duration: ev.duration,
        Location: ev.locationCode,
        'Affected Customer': ev.affectedCustomers.length,
        'PQ Service Log': ev.serviceLogs.length
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportRows);
      ws['!cols'] = [
        { wch: 14 },
        { wch: 12 },
        { wch: 14 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 18 },
        { wch: 16 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'PQ Summary');

      const fileName = `PQ_Summary_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('PQ Summary export error:', error);
      alert('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">PQ Summary</h2>
          <p className="text-slate-600 mt-1">Power Quality summary reports and analytics.</p>
        </div>
        <button
          onClick={() => alert('Save Filter Profile (preview)')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
          title="Save Filter Profile"
          type="button"
        >
          <Save className="w-4 h-4" />
          Save Filter Profile
        </button>
      </div>

      <div className="mt-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <Search className="w-5 h-5 text-slate-600" />
          <h3 className="text-base font-bold text-slate-900">Filter Parameters</h3>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Search by Event ID or Customer</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={pqSummaryFilterForm.searchText}
                  onChange={(e) => setPQSummaryFilterForm((prev) => ({ ...prev, searchText: e.target.value }))}
                  placeholder="Enter event ID or customer name..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Time Range</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative pq-start-picker-container">
                  <button
                    type="button"
                    onClick={() => {
                      setShowStartPicker((v) => !v);
                      setShowEndPicker(false);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-sm"
                    title="Select start date"
                  >
                    <span className={classNames('font-medium', pqSummaryFilterForm.startDate ? 'text-slate-900' : 'text-slate-400')}>
                      {pqSummaryFilterForm.startDate || 'YYYY/MM/DD'}
                    </span>
                    <Calendar className="w-4 h-4 text-slate-500" />
                  </button>
                  {showStartPicker && (
                    <DatePickerPopover
                      value={pqSummaryFilterForm.startDate}
                      onChange={(next) => setPQSummaryFilterForm((prev) => ({ ...prev, startDate: next }))}
                      onClose={() => setShowStartPicker(false)}
                    />
                  )}
                </div>

                <div className="relative pq-end-picker-container">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEndPicker((v) => !v);
                      setShowStartPicker(false);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-sm"
                    title="Select end date"
                  >
                    <span className={classNames('font-medium', pqSummaryFilterForm.endDate ? 'text-slate-900' : 'text-slate-400')}>
                      {pqSummaryFilterForm.endDate || 'YYYY/MM/DD'}
                    </span>
                    <Calendar className="w-4 h-4 text-slate-500" />
                  </button>
                  {showEndPicker && (
                    <DatePickerPopover
                      value={pqSummaryFilterForm.endDate}
                      onChange={(next) => setPQSummaryFilterForm((prev) => ({ ...prev, endDate: next }))}
                      onClose={() => setShowEndPicker(false)}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Event Types</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 rounded-lg bg-white cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={pqSummaryFilterForm.includeHarmonic}
                  onChange={(e) => setPQSummaryFilterForm((prev) => ({ ...prev, includeHarmonic: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-slate-700">Harmonic Events</span>
              </label>
              <label className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 rounded-lg bg-white cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={pqSummaryFilterForm.includeVoltage}
                  onChange={(e) => setPQSummaryFilterForm((prev) => ({ ...prev, includeVoltage: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-slate-700">Voltage Events</span>
              </label>
              <label className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 rounded-lg bg-white cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={pqSummaryFilterForm.includeInterruptions}
                  onChange={(e) =>
                    setPQSummaryFilterForm((prev) => ({ ...prev, includeInterruptions: e.target.checked }))
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-slate-700">Interruptions</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPQSummaryFilters(pqSummaryFilterForm)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={() => {
                  setPQSummaryFilterForm(pqSummaryDefaults);
                  setPQSummaryFilters(pqSummaryDefaults);
                }}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-all"
              >
                Reset
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportPQSummaryReport}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full">
          <thead className="bg-slate-900">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">Event ID</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">Date</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">Event Type</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">Severity</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">Duration</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">Location</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">Affected Customer</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">PQ Service Log</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pqFilteredEvents.map((ev) => {
              const eventTypeBadge =
                ev.eventType === 'Harmonic'
                  ? 'bg-purple-100 text-purple-700'
                  : ev.eventType === 'Interruption'
                    ? 'bg-red-100 text-red-700'
                    : ev.eventType === 'Voltage Dip'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-orange-100 text-orange-700';

              const severityBadge =
                ev.severity === 'Critical'
                  ? 'bg-red-100 text-red-700'
                  : ev.severity === 'High'
                    ? 'bg-orange-100 text-orange-700'
                    : ev.severity === 'Medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700';

              return (
                <tr key={ev.eventId} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4 text-sm">
                    <button
                      type="button"
                      onClick={() => handleOpenPQModal('eventDetails', ev.eventId)}
                      className="text-blue-600 hover:text-blue-700 font-semibold"
                      title="View event details"
                    >
                      {ev.eventId}
                    </button>
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-700">{ev.date}</td>
                  <td className="py-4 px-4">
                    <span className={classNames('inline-flex px-3 py-1 rounded-full text-xs font-bold', eventTypeBadge)}>
                      {ev.eventType}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={classNames('inline-flex px-3 py-1 rounded-full text-xs font-bold', severityBadge)}>
                      {ev.severity}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-700">{ev.duration}</td>
                  <td className="py-4 px-4 text-sm text-slate-700">{ev.locationCode}</td>
                  <td className="py-4 px-4">
                    <button
                      type="button"
                      onClick={() => handleOpenPQModal('customers', ev.eventId)}
                      className="inline-flex items-center justify-center min-w-10 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 font-bold hover:bg-blue-200 transition-colors"
                      title="View affected customers"
                    >
                      {ev.affectedCustomers.length}
                    </button>
                  </td>
                  <td className="py-4 px-4">
                    <button
                      type="button"
                      onClick={() => handleOpenPQModal('serviceLogs', ev.eventId)}
                      className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                      title="View PQ service logs"
                    >
                      <FileText className="w-5 h-5" />
                      <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                        {ev.serviceLogs.length}
                      </span>
                    </button>
                  </td>
                  <td className="py-4 px-4 text-sm">
                    <button
                      type="button"
                      onClick={() => handleOpenPQModal('eventDetails', ev.eventId)}
                      className="text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}

            {pqFilteredEvents.length === 0 && (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500 font-medium">
                  No events match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Affected Customers Modal */}
      {pqModal === 'customers' && pqSummarySelectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-700 to-sky-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Affected Customers</h3>
                <p className="text-blue-100 text-sm mt-1">
                  Event ID: {pqSummarySelectedEvent.eventId} • {pqSummarySelectedEvent.affectedCustomers.length} Customer(s)
                </p>
              </div>
              <button onClick={handleClosePQModal} className="p-2 hover:bg-white/15 rounded-lg" title="Close" type="button">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Customer ID</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Customer Name</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Account Number</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Address</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Contact Person</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Phone</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Impact Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pqSummarySelectedEvent.affectedCustomers.map((c) => {
                      const impactBadge =
                        c.impactLevel === 'Critical'
                          ? 'bg-red-100 text-red-700'
                          : c.impactLevel === 'High'
                            ? 'bg-orange-100 text-orange-700'
                            : c.impactLevel === 'Medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700';

                      return (
                        <tr key={c.customerId} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm font-semibold text-blue-600">{c.customerId}</td>
                          <td className="py-3 px-4 text-sm text-slate-900 font-medium">{c.customerName}</td>
                          <td className="py-3 px-4 text-sm text-slate-700">{c.accountNumber}</td>
                          <td className="py-3 px-4 text-sm text-slate-700">{c.address}</td>
                          <td className="py-3 px-4 text-sm text-slate-700">{c.contactPerson}</td>
                          <td className="py-3 px-4 text-sm text-slate-700">{c.phone}</td>
                          <td className="py-3 px-4">
                            <span className={classNames('inline-flex px-3 py-1 rounded-full text-xs font-bold', impactBadge)}>
                              {c.impactLevel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {pqSummarySelectedEvent.affectedCustomers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                          No affected customers for this event.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={handleClosePQModal}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-semibold"
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PQ Service Logs Modal */}
      {pqModal === 'serviceLogs' && pqSummarySelectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-sky-700 to-cyan-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-7 h-7" />
                <div>
                  <h3 className="text-xl font-bold">PQ Service Logs</h3>
                  <p className="text-blue-100 text-sm mt-1">Event ID: {pqSummarySelectedEvent.eventId}</p>
                </div>
              </div>
              <button onClick={handleClosePQModal} className="p-2 hover:bg-white/15 rounded-lg" title="Close" type="button">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {pqSummarySelectedEvent.serviceLogs.map((log) => {
                const statusBadge = log.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';

                return (
                  <div key={log.logId} className="border border-slate-200 rounded-xl p-5 bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-700">{log.logId}</span>
                        <span className={classNames('inline-flex px-3 py-1 rounded-full text-xs font-bold', statusBadge)}>
                          {log.status}
                        </span>
                      </div>
                      <button className="p-2 hover:bg-white rounded-lg" title="Edit (preview)" type="button">
                        <Pencil className="w-5 h-5 text-blue-600" />
                      </button>
                    </div>

                    <div className="mt-3 space-y-1 text-sm">
                      <div className="font-semibold text-blue-700">Customer: {log.customerName}</div>
                      <div className="text-slate-700">
                        <span className="font-semibold">Date:</span> {log.date}
                      </div>
                      <div className="text-slate-700">
                        <span className="font-semibold">Technician:</span> {log.technician}
                      </div>
                      <div className="text-slate-700">
                        <span className="font-semibold">Action:</span> {log.action}
                      </div>
                      <div className="text-slate-700">
                        <span className="font-semibold">Description:</span> {log.description}
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                className="w-full border-2 border-dashed border-slate-300 rounded-xl py-4 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                title="Add new service log (preview)"
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add New Service Log
                </span>
              </button>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={handleClosePQModal}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-semibold"
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {pqModal === 'eventDetails' && pqSummarySelectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-slate-900">Event Details</h3>
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">Mother</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">ID: {pqSummarySelectedEvent.eventId}</p>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Download (preview)" type="button">
                  <Download className="w-5 h-5" />
                </button>
                <button className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg" title="Copy (preview)" type="button">
                  <Copy className="w-5 h-5" />
                </button>
                <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Delete (preview)" type="button">
                  <Trash2 className="w-5 h-5" />
                </button>
                <button onClick={handleClosePQModal} className="p-2 hover:bg-slate-100 rounded-lg" title="Close" type="button">
                  <X className="w-6 h-6 text-slate-600" />
                </button>
              </div>
            </div>

            <div className="px-6 pt-4">
              <div className="flex items-center gap-6 border-b border-slate-200">
                {['Overview', 'Technical', 'Customer Impact', 'Child Events (0)', 'Timeline', 'IDR'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={classNames(
                      'py-3 text-sm font-semibold',
                      tab === 'Overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-slate-700">Location</p>
                  <p className="text-lg font-medium text-slate-900 mt-2">{pqSummarySelectedEvent.locationName}</p>
                  <p className="text-sm text-slate-600">{pqSummarySelectedEvent.voltageLevel}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-slate-700">Timestamp</p>
                  <p className="text-lg font-medium text-slate-900 mt-2">{pqSummarySelectedEvent.timestamp.split(' ')[0].replace(/-/g, '/')}</p>
                  <p className="text-sm text-slate-600">{pqSummarySelectedEvent.timestamp.split(' ')[1]}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-slate-700">Magnitude</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{pqSummarySelectedEvent.magnitudePercent.toFixed(2)}%</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-slate-700">Duration</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{pqSummarySelectedEvent.durationSeconds.toFixed(2)}s</p>
                </div>
              </div>

              <div className="mt-6 bg-slate-50 rounded-xl p-5 border border-slate-200">
                <div className="flex items-center justify-between">
                  <p className="text-base font-bold text-slate-900">Event Information</p>
                  <p className="text-sm text-slate-700">
                    Severity: <span className="font-bold text-orange-600">{pqSummarySelectedEvent.severity}</span>
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
                  <div>
                    <span className="text-slate-500">Type:</span> <span className="font-semibold text-slate-900">{pqSummarySelectedEvent.eventType}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Affected Phases:</span> <span className="font-semibold text-slate-900">A, B, C</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-slate-500 text-sm">Cause:</p>
                  <p className="text-lg font-bold text-slate-900">{pqSummarySelectedEvent.cause}</p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-base font-bold text-slate-900 mb-3">Status Management</p>
                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                  {(['New', 'Acknowledged', 'Investigating', 'Resolved'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPQEventStatus(s)}
                      className={classNames(
                        'px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
                        pqEventStatus === s ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-white'
                      )}
                      title="Preview (local UI only)"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={handleClosePQModal}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-semibold"
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Reporting() {
  const [activeTab, setActiveTab] = useState<ReportingTab>('pqSummary');

  const tabs = useMemo(
    () =>
      [
        { id: 'pqSummary', label: 'PQ Summary' },
        { id: 'benchmarking', label: 'Benchmarking' },
        { id: 'dataMaintenance', label: 'Data Maintenance' },
        { id: 'meterCommunication', label: 'Meter Communication' },
        { id: 'dynamicReport', label: 'Dynamic Report' }
      ] as const,
    []
  );

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
            {tabs.map((t) => (
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
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        {activeTab === 'pqSummary' && <PQSummaryTab />}

        {activeTab === 'benchmarking' && <BenchmarkingTab />}

        {activeTab === 'dataMaintenance' && <DataMaintenanceTab />}

        {activeTab === 'meterCommunication' && <MeterCommunicationTab />}

        {activeTab === 'dynamicReport' && <ReportBuilder />}
      </div>
    </div>
  );
}
