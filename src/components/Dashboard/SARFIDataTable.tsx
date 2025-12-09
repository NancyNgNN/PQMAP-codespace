import { SARFIDataPoint } from '../../types/database';

interface SARFIDataTableProps {
  data: SARFIDataPoint[];
}

export default function SARFIDataTable({ data }: SARFIDataTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-slate-500">No data available for the selected filters</p>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
        <h3 className="text-lg font-bold text-slate-900">SARFI Data by Meter</h3>
        <p className="text-sm text-slate-600 mt-1">
          Incident counts per SARFI index with weighting factors
        </p>
      </div>
      
      {/* Scrollable table container */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider sticky left-0 bg-slate-50 z-20">
                    Meter No.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    SARFI-10
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    SARFI-30
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    SARFI-50
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    SARFI-70
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    SARFI-80
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    SARFI-90
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider bg-blue-50">
                    Weight Factor
                  </th>
                </tr>
              </thead>
            </table>
            
            {/* Scrollable tbody - max 10 rows visible (~440px) */}
            <div className="overflow-y-auto max-h-[440px] scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
              <table className="min-w-full">
                <tbody className="bg-white divide-y divide-slate-100">
                  {data.map((row) => (
                    <tr 
                      key={row.meter_id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 sticky left-0 bg-white hover:bg-slate-50">
                        {row.meter_no}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {row.location}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-900">
                        {row.sarfi_10}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-900">
                        {row.sarfi_30}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-900">
                        {row.sarfi_50}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-900">
                        {row.sarfi_70}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-900">
                        {row.sarfi_80}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-900">
                        {row.sarfi_90}
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-semibold text-blue-600 bg-blue-50/50">
                        {row.weight_factor.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Footer with totals - always visible */}
            <table className="min-w-full border-t border-slate-200">
              <tfoot className="bg-slate-50">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-sm font-bold text-slate-900">
                    Total / Average
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-slate-900">
                    {data.reduce((sum, row) => sum + row.sarfi_10, 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-slate-900">
                    {data.reduce((sum, row) => sum + row.sarfi_30, 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-slate-900">
                    {data.reduce((sum, row) => sum + row.sarfi_50, 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-slate-900">
                    {data.reduce((sum, row) => sum + row.sarfi_70, 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-slate-900">
                    {data.reduce((sum, row) => sum + row.sarfi_80, 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-slate-900">
                    {data.reduce((sum, row) => sum + row.sarfi_90, 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-blue-600 bg-blue-50">
                    {(data.reduce((sum, row) => sum + row.weight_factor, 0) / data.length).toFixed(4)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
        Showing {data.length} meters · Scroll to view all · Weight factors used for SARFI calculations
      </div>
    </div>
  );
}
