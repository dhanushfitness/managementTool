import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Download } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getCashFlowStatementReport, exportCashFlowStatementReport } from '../api/reports'
import Breadcrumbs from '../components/Breadcrumbs'

export default function CashFlowStatementReport() {
  const [dateRange, setDateRange] = useState('last-30-days')
  const [hasSearched, setHasSearched] = useState(false)

  // Fetch Cash Flow Statement report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['cashflow-statement-report', dateRange],
    queryFn: () => getCashFlowStatementReport({ dateRange }),
    enabled: hasSearched
  })

  const records = reportData?.data?.records || []
  const summary = reportData?.data?.summary || { totalCollection: 0, totalExpenses: 0, netBalance: 0 }

  const handleSearch = () => {
    setHasSearched(true)
    refetch()
  }

  const handleExportExcel = async () => {
    try {
      const response = await exportCashFlowStatementReport({ dateRange })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `cashflow-statement-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  const formatCurrency = (value) => {
    return (value || 0).toFixed(2)
  }

  const dateRangeOptions = [
    { value: 'last-7-days', label: 'Last 7 days' },
    { value: 'last-30-days', label: 'Last 30 days' },
    { value: 'last-90-days', label: 'Last 90 days' },
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' }
  ]

  return (
    <div className="space-y-6 max-w-full w-full overflow-x-hidden" style={{ boxSizing: 'border-box' }}>
      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <Breadcrumbs />
      </div>

      {/* Page Title */}
      <div className="text-center w-full max-w-full overflow-hidden">
        <h1 className="text-3xl font-bold text-gray-900">Cashflow Statement</h1>
      </div>

      {/* Filter and Summary Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Filter */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer min-w-[150px]"
              >
                {dateRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Go
            </button>
            <button
              onClick={handleExportExcel}
              disabled={!hasSearched || records.length === 0}
              className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>

          {/* Summary Metrics */}
          {hasSearched && (
            <div className="flex items-center gap-6">
              <div>
                <span className="text-sm text-gray-600">Total Collection: </span>
                <span className="text-lg font-bold text-orange-600">{formatCurrency(summary.totalCollection)}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Total Expense: </span>
                <span className="text-lg font-bold text-green-600">{formatCurrency(summary.totalExpenses)}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Net Balance: </span>
                <span className={`text-lg font-bold ${summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.netBalance)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full max-w-full overflow-hidden">
        {isLoading ? (
          <LoadingPage message="Loading Cash Flow Statement..." fullScreen={false} />
        ) : !hasSearched ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">Select date range and click "Go" to view report</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No Results Found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Collected</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Expenses</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Net Balance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((record, index) => (
                  <tr key={record.date || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">
                      {formatCurrency(record.collected)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">
                      {formatCurrency(record.expenses)}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm text-right border border-gray-200 font-medium ${
                      record.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(record.netBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

