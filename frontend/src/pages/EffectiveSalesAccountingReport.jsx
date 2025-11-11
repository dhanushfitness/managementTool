import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Calendar } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getEffectiveSalesAccountingReport, exportEffectiveSalesAccountingReport } from '../api/reports'
import DateInput from '../components/DateInput'
import Breadcrumbs from '../components/Breadcrumbs'

export default function EffectiveSalesAccountingReport() {
  // Set default dates - from 3 years ago to current date
  const getDefaultFromDate = () => {
    const date = new Date()
    date.setFullYear(date.getFullYear() - 3)
    return date.toISOString().split('T')[0]
  }

  const getDefaultToDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  const [fromDate, setFromDate] = useState(getDefaultFromDate())
  const [toDate, setToDate] = useState(getDefaultToDate())
  const [hasSearched, setHasSearched] = useState(false)

  // Fetch Effective Sales Accounting report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['effective-sales-accounting', fromDate, toDate],
    queryFn: () => getEffectiveSalesAccountingReport({ 
      startDate: fromDate,
      endDate: toDate
    }),
    enabled: hasSearched
  })

  // Show dummy data by default
  const showDummyData = !hasSearched || (!reportData && !isLoading)

  const handleSearch = () => {
    if (fromDate && toDate) {
      setHasSearched(true)
      refetch()
    }
  }

  const handleExportExcel = async () => {
    try {
      const response = await exportEffectiveSalesAccountingReport({
        startDate: fromDate,
        endDate: toDate
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `effective-sales-accounting-${fromDate}-to-${toDate}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  // Generate dummy data for visualization
  const generateDummyData = () => {
    const months = []
    const currentDate = new Date()
    const startDate = new Date(fromDate)
    const endDate = new Date(toDate)
    
    // Generate months between start and end date
    let date = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    let serialNo = 1
    
    while (date <= endDate) {
      const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      const totalWithTax = Math.floor(Math.random() * 300000) + 50000
      const totalWithoutTax = Math.floor(totalWithTax * 0.95)
      const refundAmount = Math.random() > 0.8 ? Math.floor(Math.random() * 10000) : 0
      const effectiveSales = totalWithoutTax - refundAmount
      
      months.push({
        serialNo: serialNo++,
        monthYear,
        totalWithTax,
        totalWithoutTax,
        refundAmount,
        effectiveSales
      })
      
      // Move to next month
      date.setMonth(date.getMonth() + 1)
    }
    
    return months
  }

  const displayData = reportData?.data?.records || (showDummyData ? generateDummyData() : [])
  const hasData = displayData && displayData.length > 0

  const formatCurrency = (value) => {
    return (value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  const formatDateForInput = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toISOString().split('T')[0]
  }

  return (
    <div className="space-y-6 max-w-full w-full overflow-x-hidden" style={{ boxSizing: 'border-box' }}>
      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <Breadcrumbs />
      </div>

      {/* Page Title */}
      <div className="text-center w-full max-w-full overflow-hidden">
        <h1 className="text-3xl font-bold text-gray-900">Effective sales (Accounting)</h1>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            {/* From Date */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
              <DateInput
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                containerClassName="min-w-[150px]"
                className="pr-10"
              />
            </div>

            {/* To Date */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
              <DateInput
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                containerClassName="min-w-[150px]"
                className="pr-10"
              />
            </div>

            {/* Go Button */}
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={isLoading || !fromDate || !toDate}
                className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Go
              </button>
            </div>
          </div>

          {/* Export Excel Button */}
          <div className="flex items-end">
            <button
              onClick={handleExportExcel}
              disabled={!hasSearched && !showDummyData}
              className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full max-w-full overflow-hidden">
        {isLoading ? (
          <LoadingPage message="Loading effective sales report..." fullScreen={false} />
        ) : !hasData ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No Results Found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full" style={{ maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full border-collapse" style={{ minWidth: '800px', width: '100%' }}>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">S.No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Month-Year</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Total With Tax</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Total Without Tax</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Refund(Sales Return) Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Effective Sales</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayData.map((item, index) => (
                  <tr key={item.serialNo || index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                      {item.serialNo || index + 1}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium border border-gray-200">
                      {item.monthYear}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">
                      {formatCurrency(item.totalWithTax || 0)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">
                      {formatCurrency(item.totalWithoutTax || 0)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">
                      {formatCurrency(item.refundAmount || 0)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-right border border-gray-200">
                      {formatCurrency(item.effectiveSales || 0)}
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

