import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Download } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import Breadcrumbs from '../components/Breadcrumbs'
import { getRevenueReport, exportRevenueReport } from '../api/reports'

export default function RevenueReport() {
  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString())
  const [hasSearched, setHasSearched] = useState(false)

  // Fetch Revenue report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['revenue-report', selectedYear],
    queryFn: () => getRevenueReport({ 
      year: selectedYear
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
      const response = await exportRevenueReport({
        year: selectedYear
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `revenue-report-${selectedYear}.csv`
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
        months: {
          jan: 255998.00,
          feb: 269250.00,
          mar: 228800.00,
          apr: 141760.00,
          may: 152040.00,
          jun: 264739.00,
          jul: 279365.00,
          aug: 353460.00,
          sep: 208030.00,
          oct: 231255.00,
          nov: 10500.00,
          dec: 0.00
        },
        total: 2395197.00
      }
    ]
  }

  const displayData = reportData?.data?.records || (showDummyData ? generateDummyData() : [])

  // Calculate totals
  const totals = displayData.reduce((acc, item) => {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    months.forEach(month => {
      acc[month] = (acc[month] || 0) + (item.months?.[month] || 0)
    })
    acc.total = (acc.total || 0) + (item.total || 0)
    return acc
  }, {
    jan: 0,
    feb: 0,
    mar: 0,
    apr: 0,
    may: 0,
    jun: 0,
    jul: 0,
    aug: 0,
    sep: 0,
    oct: 0,
    nov: 0,
    dec: 0,
    total: 0
  })

  const formatCurrency = (value) => {
    return (value || 0).toFixed(2)
  }

  // Generate year options (current year and previous 5 years)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i)

  const monthNames = [
    { key: 'jan', label: 'Jan' },
    { key: 'feb', label: 'Feb' },
    { key: 'mar', label: 'Mar' },
    { key: 'apr', label: 'Apr' },
    { key: 'may', label: 'May' },
    { key: 'jun', label: 'Jun' },
    { key: 'jul', label: 'Jul' },
    { key: 'aug', label: 'Aug' },
    { key: 'sep', label: 'Sep' },
    { key: 'oct', label: 'Oct' },
    { key: 'nov', label: 'Nov' },
    { key: 'dec', label: 'Dec' }
  ]

  return (
    <div className="space-y-6 max-w-full w-full overflow-x-hidden" style={{ boxSizing: 'border-box' }}>
      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <Breadcrumbs />
      </div>

      {/* Page Title */}
      <div className="text-center w-full max-w-full overflow-hidden">
        <h1 className="text-3xl font-bold text-gray-900">Revenue Report</h1>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-4">
          {/* Year Dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer min-w-[120px]"
            >
              {yearOptions.map(year => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none top-8">
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
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
          <LoadingPage message="Loading Revenue report..." fullScreen={false} />
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
                  {monthNames.map(month => (
                    <th key={month.key} className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">
                      {month.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayData.map((item, index) => (
                  <tr key={item._id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">{index + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium border border-gray-200">{item.studioName}</td>
                    {monthNames.map(month => (
                      <td key={month.key} className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">
                        {formatCurrency(item.months?.[month.key] || 0)}
                      </td>
                    ))}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold text-right border border-gray-200">
                      {formatCurrency(item.total || 0)}
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-200"></td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-200">Total</td>
                  {monthNames.map(month => (
                    <td key={month.key} className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">
                      {formatCurrency(totals[month.key] || 0)}
                    </td>
                  ))}
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">
                    {formatCurrency(totals.total || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

