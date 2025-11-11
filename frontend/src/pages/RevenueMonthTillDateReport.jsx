import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Download } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getRevenueMonthTillDateReport, exportRevenueMonthTillDateReport } from '../api/reports'
import DateInput from '../components/DateInput'
import Breadcrumbs from '../components/Breadcrumbs'

export default function RevenueMonthTillDateReport() {
  const currentDate = new Date()
  const [tillDate, setTillDate] = useState(() => {
    const date = new Date()
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    return `${day}-${month}-${year}`
  })
  const [hasSearched, setHasSearched] = useState(false)

  // Fetch Revenue Month Till Date report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['revenue-month-till-date-report', tillDate],
    queryFn: () => getRevenueMonthTillDateReport({ 
      tillDate: tillDate
    }),
    enabled: hasSearched
  })

  // Show dummy data by default
  const showDummyData = !hasSearched || (!reportData && !isLoading)

  const handleSearch = () => {
    setHasSearched(true)
  }

  const handleExportExcel = async () => {
    try {
      const response = await exportRevenueMonthTillDateReport({
        tillDate: tillDate
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `revenue-month-till-date-report-${tillDate}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  // Generate dummy data
  const generateDummyData = () => {
    return [
      {
        _id: '1',
        studioName: 'AIRFIT - Indiranagar',
        monthlyRevenueTarget: 0.00,
        proRataRevenueTarget: 0.00,
        monthlyRevenueAchieved: 10500.00,
        proRataRevenueAchievedPercent: null,
        dailyRevenueAchieved: 0.00,
        monthlyRevenueAchievedPercent: null
      }
    ]
  }

  const displayData = reportData?.data?.records || (showDummyData ? generateDummyData() : [])

  // Calculate totals
  const totals = displayData.reduce((acc, item) => {
    acc.monthlyRevenueTarget = (acc.monthlyRevenueTarget || 0) + (item.monthlyRevenueTarget || 0)
    acc.proRataRevenueTarget = (acc.proRataRevenueTarget || 0) + (item.proRataRevenueTarget || 0)
    acc.monthlyRevenueAchieved = (acc.monthlyRevenueAchieved || 0) + (item.monthlyRevenueAchieved || 0)
    acc.dailyRevenueAchieved = (acc.dailyRevenueAchieved || 0) + (item.dailyRevenueAchieved || 0)
    return acc
  }, {
    monthlyRevenueTarget: 0,
    proRataRevenueTarget: 0,
    monthlyRevenueAchieved: 0,
    dailyRevenueAchieved: 0
  })

  const formatCurrency = (value) => {
    return `₹ ${(value || 0).toFixed(2)}`
  }

  const formatPercent = (value) => {
    if (value === null || value === undefined) return '-'
    return `${value.toFixed(2)}%`
  }

  // Convert DD-MM-YY to YYYY-MM-DD for date input
  const convertToInputFormat = (ddmmyy) => {
    const [day, month, year] = ddmmyy.split('-')
    const fullYear = '20' + year
    return `${fullYear}-${month}-${day}`
  }

  // Convert YYYY-MM-DD to DD-MM-YY
  const convertToDisplayFormat = (yyyymmdd) => {
    const date = new Date(yyyymmdd)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    return `${day}-${month}-${year}`
  }

  const handleDateChange = (e) => {
    const inputDate = e.target.value
    if (inputDate) {
      setTillDate(convertToDisplayFormat(inputDate))
    }
  }

  return (
    <div className="space-y-6 max-w-full w-full overflow-x-hidden" style={{ boxSizing: 'border-box' }}>
      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <Breadcrumbs />
      </div>

      {/* Page Title */}
      <div className="text-center w-full max-w-full overflow-hidden">
        <h1 className="text-3xl font-bold text-gray-900">Revenue - Month till date Report</h1>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-4">
          {/* Date Input */}
          <div className="relative flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-2">Till Date</label>
            <DateInput
              value={convertToInputFormat(tillDate)}
              onChange={handleDateChange}
              className="pr-10"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-end gap-3 ml-auto">
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Go
            </button>
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
          <LoadingPage message="Loading Revenue Month Till Date report..." fullScreen={false} />
        ) : displayData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No Results Found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full" style={{ maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full border-collapse" style={{ minWidth: '1200px', width: '100%' }}>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">S.No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Studio Name</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Monthly Revenue Target (INR)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Pro-Rata Revenue Target (INR)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Monthly Revenue Achieved (INR)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Pro-Rata Revenue Achieved (%)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Daily Revenue Achieved (INR)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Monthly Revenue Achieved (%)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayData.map((item, index) => (
                  <tr key={item._id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">{index + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium border border-gray-200">{item.studioName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">
                      {formatCurrency(item.monthlyRevenueTarget || 0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">
                      {formatCurrency(item.proRataRevenueTarget || 0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">
                      {formatCurrency(item.monthlyRevenueAchieved || 0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">
                      {formatPercent(item.proRataRevenueAchievedPercent)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">
                      {formatCurrency(item.dailyRevenueAchieved || 0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">
                      {formatPercent(item.monthlyRevenueAchievedPercent)}
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-200"></td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-200">Total</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">
                    {formatCurrency(totals.monthlyRevenueTarget || 0)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">
                    {formatCurrency(totals.proRataRevenueTarget || 0)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">
                    {formatCurrency(totals.monthlyRevenueAchieved || 0)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">-</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">
                    {formatCurrency(totals.dailyRevenueAchieved || 0)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

