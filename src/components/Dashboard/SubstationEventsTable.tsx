import { useState, useEffect } from 'react';
import { Download, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { Substation, PQEvent, SubstationMapFilters } from '../../types/database';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface SubstationEventsTableProps {
  substation: Substation | undefined;
  events: PQEvent[];
  filters: SubstationMapFilters;
}

interface TableRow {
  no: number;
  substationCode: string;
  customerName: string;
  services: string;
  eventId: string;
}

type SortField = 'no' | 'substationCode' | 'customerName' | 'services';
type SortDirection = 'asc' | 'desc';

export default function SubstationEventsTable({ substation, events, filters }: SubstationEventsTableProps) {
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('no');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    if (!substation) {
      setTableData([]);
      setCurrentPage(1);
      return;
    }

    loadTableData();
  }, [substation, events, filters]);

  const loadTableData = async () => {
    if (!substation) return;

    setIsLoading(true);
    try {
      // Get events for this substation
      const substationEvents = events.filter(e => e.substation_id === substation.id);

      // Get customers for this substation
      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('id, name')
        .eq('substation_id', substation.id);

      if (customerError) throw customerError;

      // Get service records for these customers
      const customerIds = customers?.map(c => c.id) || [];
      
      let servicesMap: Record<string, string[]> = {};
      
      if (customerIds.length > 0) {
        const { data: serviceRecords, error: serviceError } = await supabase
          .from('pq_service_records')
          .select('customer_id, service_type')
          .in('customer_id', customerIds);

        if (serviceError) throw serviceError;

        // Group services by customer
        serviceRecords?.forEach(record => {
          if (!servicesMap[record.customer_id]) {
            servicesMap[record.customer_id] = [];
          }
          if (!servicesMap[record.customer_id].includes(record.service_type)) {
            servicesMap[record.customer_id].push(record.service_type);
          }
        });
      }

      // Build table rows
      const rows: TableRow[] = substationEvents.map((event, index) => ({
        no: index + 1,
        substationCode: substation.code,
        customerName: '', // Leave blank as per requirements
        services: customerIds.length > 0 
          ? Object.values(servicesMap).flat().join(', ') 
          : 'N/A',
        eventId: event.id
      }));

      setTableData(rows);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error loading table data:', error);
      setTableData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = [...tableData].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = (bVal as string).toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = sortedData.slice(startIndex, endIndex);

  const getAllData = () => {
    return sortedData;
  };

  const exportToExcel = () => {
    const allData = getAllData();
    const ws = XLSX.utils.json_to_sheet(
      allData.map(row => ({
        'No': row.no,
        'S/S': row.substationCode,
        'Customer Name': row.customerName,
        'PQ Service(s) Provided': row.services
      }))
    );
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Substation Events');
    XLSX.writeFile(wb, `substation-events-${substation?.code || 'export'}-${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportDropdown(false);
  };

  const exportToCSV = () => {
    const allData = getAllData();
    const ws = XLSX.utils.json_to_sheet(
      allData.map(row => ({
        'No': row.no,
        'S/S': row.substationCode,
        'Customer Name': row.customerName,
        'PQ Service(s) Provided': row.services
      }))
    );
    
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `substation-events-${substation?.code || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setShowExportDropdown(false);
  };

  const exportToPDF = () => {
    const allData = getAllData();
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(`Substation Events - ${substation?.name || 'All'}`, 14, 15);
    
    if (filters.startDate || filters.endDate) {
      doc.setFontSize(10);
      const dateRange = `Date Range: ${filters.startDate || 'Start'} to ${filters.endDate || 'End'}`;
      doc.text(dateRange, 14, 22);
    }

    (doc as any).autoTable({
      startY: filters.startDate || filters.endDate ? 28 : 22,
      head: [['No', 'S/S', 'Customer Name', 'PQ Service(s) Provided']],
      body: allData.map(row => [
        row.no,
        row.substationCode,
        row.customerName,
        row.services
      ]),
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`substation-events-${substation?.code || 'export'}-${new Date().toISOString().split('T')[0]}.pdf`);
    setShowExportDropdown(false);
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {substation ? `Events for ${substation.name}` : 'Select a substation'}
          </h3>
          {substation && (
            <p className="text-sm text-slate-600 mt-1">
              {tableData.length} event{tableData.length !== 1 ? 's' : ''} found
            </p>
          )}
        </div>
        {substation && tableData.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            {showExportDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                <button
                  onClick={exportToExcel}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm border-b border-slate-100"
                >
                  Export as Excel
                </button>
                <button
                  onClick={exportToCSV}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm border-b border-slate-100"
                >
                  Export as CSV
                </button>
                <button
                  onClick={exportToPDF}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm"
                >
                  Export as PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {!substation ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <p className="text-lg font-medium">No substation selected</p>
            <p className="text-sm mt-1">Click a bubble on the map to view events</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-600">Loading...</div>
        </div>
      ) : tableData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <p className="text-lg font-medium">No events found</p>
            <p className="text-sm mt-1">Try adjusting your date filters</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
            <table className="w-full">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('no')}
                      className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
                    >
                      No
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('substationCode')}
                      className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
                    >
                      S/S
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('customerName')}
                      className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
                    >
                      Customer Name
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('services')}
                      className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
                    >
                      PQ Service(s) Provided
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((row, index) => (
                  <tr
                    key={row.eventId}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                  >
                    <td className="px-4 py-3 text-sm text-slate-900">{row.no}</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{row.substationCode}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{row.customerName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{row.services}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-slate-600">
                Showing {startIndex + 1}-{Math.min(endIndex, sortedData.length)} of {sortedData.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-slate-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
