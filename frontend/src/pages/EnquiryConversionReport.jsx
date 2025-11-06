import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getEnquiryConversionReport, exportEnquiryConversionReport } from '../api/reports'

export default function EnquiryConversionReport() {
  const [dateRange, setDateRange] = useState('last-30-days')
  const [currentPage, setCurrentPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)

  // Fetch Enquiry Conversion report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['enquiry-conversion-report', dateRange, currentPage],
    queryFn: () => getEnquiryConversionReport({ 
      dateRange: dateRange,
      page: currentPage,
      limit: 20
    }),
    enabled: hasSearched
  })

  // Show dummy data by default
  const showDummyData = !hasSearched || (!reportData && !isLoading)

  const handleSearch = () => {
    setCurrentPage(1)
    setHasSearched(true)
  }

  const handleExportExcel = async () => {
    try {
      const response = await exportEnquiryConversionReport({
        dateRange: dateRange
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `enquiry-conversion-report-${dateRange}.csv`
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
        enquiryDate: '2025-10-18',
        conversionTimeDays: 2,
        name: 'Haritha',
        contactNo: '7907594071',
        emailId: '',
        leadSource: 'Passing By',
        enquiryType: '-',
        serviceName: 'Gym Membership',
        trialTaken: 'No',
        otherAppointment: 'No',
        invoiceDate: '2025-10-20',
        service: 'Gym Membership',
        serviceVariation: '3 Month Membership',
        startDate: '2025-10-20',
        endDate: '2026-01-19',
        totalValue: 6000,
        paidAmount: 6000,
        salesRep: 'Dhanush Kumar SK'
      },
      {
        _id: '2',
        enquiryDate: '2025-10-16',
        conversionTimeDays: 1,
        name: 'Abbas',
        contactNo: '9688847389',
        emailId: '',
        leadSource: 'Passing By',
        enquiryType: '-',
        serviceName: 'Gym Membership',
        trialTaken: 'No',
        otherAppointment: 'No',
        invoiceDate: '2025-10-17',
        service: 'Gym Membership',
        serviceVariation: '1 Month Membership',
        startDate: '2025-10-17',
        endDate: '2025-11-16',
        totalValue: 1904.76,
        paidAmount: 2000,
        salesRep: 'Vishva.S'
      }
    ]
  }

  const displayData = reportData?.data?.records || (showDummyData ? generateDummyData() : [])
  const pagination = reportData?.data?.pagination || { page: 1, pages: 1, total: displayData.length }

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
    { value: 'last-month', label: 'Last Month' },
    { value: 'this-year', label: 'This Year' }
  ]

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setCurrentPage(newPage)
    }
  }

  return (
    <div className="space-y-6 max-w-full w-full overflow-x-hidden" style={{ boxSizing: 'border-box' }}>
      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <nav className="text-sm">
          <span className="text-gray-600">Home</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">Reports</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">Sales</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-orange-600 font-medium">Enquiry Conversion Report</span>
        </nav>
      </div>

      {/* Page Title */}
      <div className="text-center w-full max-w-full overflow-hidden">
        <h1 className="text-3xl font-bold text-gray-900">Enquiry Conversion Report</h1>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-4">
          {/* Date Range Dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer min-w-[150px]"
            >
              {dateRangeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
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
          <LoadingPage message="Loading Enquiry Conversion report..." fullScreen={false} />
        ) : displayData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No Results Found.</p>
          </div>
        ) : (
          <>
            {/* Pagination Info */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">
                Page {pagination.page} Of {pagination.pages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.pages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePageChange(pagination.pages)}
                  disabled={currentPage === pagination.pages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto w-full" style={{ maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full border-collapse" style={{ minWidth: '1800px', width: '100%' }}>
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">S.No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Enquiry Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Conversion Time (In Days)</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Contact No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Email Id</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Lead Source</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Enquiry Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Service Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Trial Taken</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Other Appointment</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Invoice Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Service Variation</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Start Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">End Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Total Value</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Paid Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Sales Rep</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayData.map((item, index) => (
                    <tr key={item._id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {(pagination.page - 1) * 20 + index + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{formatDate(item.enquiryDate)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.conversionTimeDays || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium border border-gray-200">{item.name || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.contactNo || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.emailId || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.leadSource || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.enquiryType || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.serviceName || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.trialTaken || 'No'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.otherAppointment || 'No'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{formatDate(item.invoiceDate)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.service || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.serviceVariation || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{formatDate(item.startDate)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{formatDate(item.endDate)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">{formatCurrency(item.totalValue)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">{formatCurrency(item.paidAmount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.salesRep || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

