import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Download } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getDSRReport, exportDSRReport } from '../api/reports'
import Breadcrumbs from '../components/Breadcrumbs'

export default function DSRReport() {
  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString())

  const [hasSearched, setHasSearched] = useState(false)

  // Fetch DSR report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['dsr-report', selectedYear, selectedMonth],
    queryFn: () => getDSRReport({ 
      year: selectedYear,
      month: selectedMonth
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
      const response = await exportDSRReport({
        year: selectedYear,
        month: selectedMonth
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `dsr-report-${selectedYear}-${selectedMonth}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  // Generate dummy data for the selected month
  const generateDummyData = () => {
    const year = parseInt(selectedYear)
    const month = parseInt(selectedMonth) - 1
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const data = []
    let runningLeads = 89 // Start with existing leads

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
      
      // Generate some sample data for visualization (matching the image examples)
      const addedToday = day <= 6 ? [2, 1, 2, 0, 0, 0][day - 1] || 0 : Math.floor(Math.random() * 3)
      const existingLeads = runningLeads
      runningLeads = runningLeads + addedToday
      const referralGenerated = 0
      const leadConverted = 0
      const spotConversion = day === 3 ? 1 : day === 4 ? 1 : day === 5 ? 1 : 0
      const spotConversionValue = day === 3 ? 4500 : day === 4 ? 0 : day === 5 ? 6000 : 0
      const totalClosures = spotConversion
      const todaySale = spotConversionValue
      const newClientsNonPT = spotConversion
      const newClientsPT = 0
      const existingClientsNonPT = 0
      const existingClientsPT = 0
      const todayCollection = todaySale
      const newSalesCollection = todaySale
      const dueRecovered = 0

      data.push({
        _id: `day-${day}`,
        date: date.toISOString().split('T')[0],
        day: dayName,
        existingLeads,
        addedToday,
        referralGenerated,
        leadConverted: { count: leadConverted, value: 0 },
        spotConversion: { count: spotConversion, value: spotConversionValue },
        totalClosures: { count: totalClosures, value: spotConversionValue },
        todaySale,
        newClientsNonPT: { count: newClientsNonPT, revenue: todaySale },
        newClientsPT: { count: newClientsPT, revenue: 0 },
        existingClientsNonPT: { count: existingClientsNonPT, revenue: 0 },
        existingClientsPT: { count: existingClientsPT, revenue: 0 },
        todayCollection,
        newSalesCollection,
        dueRecovered
      })
    }

    return data
  }

  const displayData = reportData?.data?.records || (showDummyData ? generateDummyData() : [])

  // Calculate totals
  const totals = displayData.reduce((acc, item) => ({
    existingLeads: item.existingLeads || 0,
    addedToday: acc.addedToday + (item.addedToday || 0),
    referralGenerated: acc.referralGenerated + (item.referralGenerated || 0),
    leadConvertedCount: acc.leadConvertedCount + (item.leadConverted?.count || 0),
    leadConvertedValue: acc.leadConvertedValue + (item.leadConverted?.value || 0),
    spotConversionCount: acc.spotConversionCount + (item.spotConversion?.count || 0),
    spotConversionValue: acc.spotConversionValue + (item.spotConversion?.value || 0),
    totalClosuresCount: acc.totalClosuresCount + (item.totalClosures?.count || 0),
    totalClosuresValue: acc.totalClosuresValue + (item.totalClosures?.value || 0),
    todaySale: acc.todaySale + (item.todaySale || 0),
    newClientsNonPTCount: acc.newClientsNonPTCount + (item.newClientsNonPT?.count || 0),
    newClientsNonPTRevenue: acc.newClientsNonPTRevenue + (item.newClientsNonPT?.revenue || 0),
    newClientsPTCount: acc.newClientsPTCount + (item.newClientsPT?.count || 0),
    newClientsPTRevenue: acc.newClientsPTRevenue + (item.newClientsPT?.revenue || 0),
    existingClientsNonPTCount: acc.existingClientsNonPTCount + (item.existingClientsNonPT?.count || 0),
    existingClientsNonPTRevenue: acc.existingClientsNonPTRevenue + (item.existingClientsNonPT?.revenue || 0),
    existingClientsPTCount: acc.existingClientsPTCount + (item.existingClientsPT?.count || 0),
    existingClientsPTRevenue: acc.existingClientsPTRevenue + (item.existingClientsPT?.revenue || 0),
    todayCollection: acc.todayCollection + (item.todayCollection || 0),
    newSalesCollection: acc.newSalesCollection + (item.newSalesCollection || 0),
    dueRecovered: acc.dueRecovered + (item.dueRecovered || 0)
  }), {
    existingLeads: 0,
    addedToday: 0,
    referralGenerated: 0,
    leadConvertedCount: 0,
    leadConvertedValue: 0,
    spotConversionCount: 0,
    spotConversionValue: 0,
    totalClosuresCount: 0,
    totalClosuresValue: 0,
    todaySale: 0,
    newClientsNonPTCount: 0,
    newClientsNonPTRevenue: 0,
    newClientsPTCount: 0,
    newClientsPTRevenue: 0,
    existingClientsNonPTCount: 0,
    existingClientsNonPTRevenue: 0,
    existingClientsPTCount: 0,
    existingClientsPTRevenue: 0,
    todayCollection: 0,
    newSalesCollection: 0,
    dueRecovered: 0
  })

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  const formatCurrency = (value) => {
    return value.toFixed(2)
  }

  const formatDay = (dayName) => {
    return dayName.substring(0, 3) // Show first 3 letters (Sat, Sun, Mon, etc.)
  }

  // Generate year options (current year and previous 5 years)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i)

  // Month options
  const monthOptions = [
    { value: '1', label: 'Jan' },
    { value: '2', label: 'Feb' },
    { value: '3', label: 'Mar' },
    { value: '4', label: 'Apr' },
    { value: '5', label: 'May' },
    { value: '6', label: 'Jun' },
    { value: '7', label: 'Jul' },
    { value: '8', label: 'Aug' },
    { value: '9', label: 'Sep' },
    { value: '10', label: 'Oct' },
    { value: '11', label: 'Nov' },
    { value: '12', label: 'Dec' }
  ]

  return (
    <div className="space-y-6 max-w-full w-full overflow-x-hidden" style={{ boxSizing: 'border-box' }}>
      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <Breadcrumbs />
      </div>

      {/* Page Title */}
      <div className="text-center w-full max-w-full overflow-hidden">
        <h1 className="text-3xl font-bold text-gray-900">DSR Report</h1>
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

          {/* Month Dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer min-w-[120px]"
            >
              {monthOptions.map(month => (
                <option key={month.value} value={month.value}>{month.label}</option>
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
          <LoadingPage message="Loading DSR report..." fullScreen={false} />
        ) : displayData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No Results Found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full" style={{ maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full border-collapse" style={{ minWidth: '1600px', width: '100%' }}>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th rowSpan="3" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Date</th>
                  <th rowSpan="3" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Day</th>
                  <th colSpan="6" className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 bg-gray-100">Lead Analysis</th>
                  <th rowSpan="3" className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Today's SALE</th>
                  <th colSpan="4" className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 bg-gray-100">New Clients</th>
                  <th colSpan="4" className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 bg-gray-100">Existing Clients</th>
                  <th rowSpan="3" className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Today's COLLECTION</th>
                  <th colSpan="2" className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 bg-gray-100">Collection</th>
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {/* Lead Analysis sub-headers */}
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Existing Leads</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Added Today</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Referral Generated</th>
                  <th colSpan="2" className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Lead Converted</th>
                  <th colSpan="2" className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Spot Conversion</th>
                  <th colSpan="2" className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Total Closures</th>
                  {/* New Clients sub-headers */}
                  <th colSpan="2" className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Services Non-PT</th>
                  <th colSpan="2" className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">PT</th>
                  {/* Existing Clients sub-headers */}
                  <th colSpan="2" className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Services Non-PT</th>
                  <th colSpan="2" className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">PT</th>
                  {/* Collection sub-headers */}
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">New Sales</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Due Recovered</th>
                </tr>
                <tr className="border-b-2 border-gray-300 bg-gray-100">
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Count</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Count</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Count</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Count</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Value</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Count</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Value</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Count</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Value</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Count</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Revenue</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Count</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Revenue</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Count</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Revenue</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Count</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Revenue</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Revenue</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayData.map((item, index) => (
                  <tr key={item._id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">{formatDate(item.date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{formatDay(item.day)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{item.existingLeads || 0}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{item.addedToday || 0}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{item.referralGenerated || 0}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{item.leadConverted?.count || 0}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{formatCurrency(item.leadConverted?.value || 0)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{item.spotConversion?.count || 0}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{formatCurrency(item.spotConversion?.value || 0)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{item.totalClosures?.count || 0}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{formatCurrency(item.totalClosures?.value || 0)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{formatCurrency(item.todaySale || 0)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{item.newClientsNonPT?.count || 0}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{formatCurrency(item.newClientsNonPT?.revenue || 0)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{item.newClientsPT?.count || 0}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{formatCurrency(item.newClientsPT?.revenue || 0)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{item.existingClientsNonPT?.count || 0}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{formatCurrency(item.existingClientsNonPT?.revenue || 0)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{item.existingClientsPT?.count || 0}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{formatCurrency(item.existingClientsPT?.revenue || 0)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{formatCurrency(item.todayCollection || 0)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{formatCurrency(item.newSalesCollection || 0)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center border border-gray-200">{formatCurrency(item.dueRecovered || 0)}</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                  <td colSpan="2" className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-200">Total</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">-</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">{totals.addedToday}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">{totals.referralGenerated}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">{totals.leadConvertedCount}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">{formatCurrency(totals.leadConvertedValue)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">{totals.spotConversionCount}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">{formatCurrency(totals.spotConversionValue)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">{totals.totalClosuresCount}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">{formatCurrency(totals.totalClosuresValue)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">{formatCurrency(totals.todaySale)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">{totals.newClientsNonPTCount}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">{formatCurrency(totals.newClientsNonPTRevenue)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">{totals.newClientsPTCount}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">{formatCurrency(totals.newClientsPTRevenue)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">{totals.existingClientsNonPTCount}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">{formatCurrency(totals.existingClientsNonPTRevenue)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">{totals.existingClientsPTCount}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">{formatCurrency(totals.existingClientsPTRevenue)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">{formatCurrency(totals.todayCollection)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">{formatCurrency(totals.newSalesCollection)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center border border-gray-200">{formatCurrency(totals.dueRecovered)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

