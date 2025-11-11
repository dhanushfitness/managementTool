import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Download, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Printer, Trash2 } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getRefundReport, exportRefundReport } from '../api/reports'
import DateInput from '../components/DateInput'
import Breadcrumbs from '../components/Breadcrumbs'

export default function RefundReport() {
  const currentDate = new Date()
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    return `${day}-${month}-${year}`
  })
  const [toDate, setToDate] = useState(() => {
    const date = new Date()
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    return `${day}-${month}-${year}`
  })
  const [customDateRange, setCustomDateRange] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)

  // Fetch Refund report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['refund-report', fromDate, toDate, currentPage],
    queryFn: () => getRefundReport({ 
      fromDate: fromDate,
      toDate: toDate,
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
      const response = await exportRefundReport({
        fromDate: fromDate,
        toDate: toDate
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `refund-report-${fromDate}-${toDate}.csv`
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
        name: 'Harsha Vardhan Reddy',
        mobile: '9880201559',
        emailId: 'harshavardhankreddy10@gmail.com',
        sequence: 'Branch Sequence',
        service: 'Gym Membership',
        serviceVariation: '2 Month Membership',
        proFormaInvoiceNo: 'Jun8-2025',
        type: 'Cancel without refund',
        baseValue: 4130.00,
        tax: 0.00,
        total: 4130.00,
        paid: 4130.00,
        balance: 0.00,
        utilisedValue: 0.00,
        unutilisedValue: 4130.00,
        deduction: 0.00,
        refundAmount: 0.00,
        staffName: 'Dhanush Kumar SK',
        dateTime: '2025-06-13T19:39:00',
        instrument: '',
        transactionId: '',
        creditNoteNo: '',
        note: ''
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
    const year = String(date.getFullYear()).slice(-2)
    return `${day}-${month}-${year}`
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours() % 12 || 12).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM'
    return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`
  }

  const formatCurrency = (value) => {
    return `₹ ${(value || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
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

  const handleFromDateChange = (e) => {
    const inputDate = e.target.value
    if (inputDate) {
      setFromDate(convertToDisplayFormat(inputDate))
    }
  }

  const handleToDateChange = (e) => {
    const inputDate = e.target.value
    if (inputDate) {
      setToDate(convertToDisplayFormat(inputDate))
    }
  }

  const handleCustomDateRangeChange = (value) => {
    setCustomDateRange(value)
    const today = new Date()
    let startDate = new Date()
    let endDate = new Date()

    switch (value) {
      case 'last-7-days':
        startDate.setDate(today.getDate() - 7)
        break
      case 'last-30-days':
        startDate.setDate(today.getDate() - 30)
        break
      case 'last-90-days':
        startDate.setDate(today.getDate() - 90)
        break
      case 'this-month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        break
      case 'last-month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        endDate = new Date(today.getFullYear(), today.getMonth(), 0)
        break
      default:
        return
    }

    setFromDate(convertToDisplayFormat(startDate.toISOString().split('T')[0]))
    setToDate(convertToDisplayFormat(endDate.toISOString().split('T')[0]))
  }

  const dateRangeOptions = [
    { value: '', label: 'Custom Date Range' },
    { value: 'last-7-days', label: 'Last 7 days' },
    { value: 'last-30-days', label: 'Last 30 days' },
    { value: 'last-90-days', label: 'Last 90 days' },
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' }
  ]

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setCurrentPage(newPage)
    }
  }

  // Calculate totals
  const totals = displayData.reduce((acc, item) => {
    acc.baseValue = (acc.baseValue || 0) + (item.baseValue || 0)
    acc.tax = (acc.tax || 0) + (item.tax || 0)
    acc.total = (acc.total || 0) + (item.total || 0)
    acc.paid = (acc.paid || 0) + (item.paid || 0)
    acc.balance = (acc.balance || 0) + (item.balance || 0)
    acc.utilisedValue = (acc.utilisedValue || 0) + (item.utilisedValue || 0)
    acc.unutilisedValue = (acc.unutilisedValue || 0) + (item.unutilisedValue || 0)
    acc.deduction = (acc.deduction || 0) + (item.deduction || 0)
    acc.refundAmount = (acc.refundAmount || 0) + (item.refundAmount || 0)
    return acc
  }, {
    baseValue: 0,
    tax: 0,
    total: 0,
    paid: 0,
    balance: 0,
    utilisedValue: 0,
    unutilisedValue: 0,
    deduction: 0,
    refundAmount: 0
  })

  return (
    <div className="space-y-6 max-w-full w-full overflow-x-hidden" style={{ boxSizing: 'border-box' }}>
      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <Breadcrumbs />
      </div>

      {/* Page Title */}
      <div className="text-center w-full max-w-full overflow-hidden">
        <h1 className="text-3xl font-bold text-gray-900">Refund Report</h1>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-4 flex-wrap">
          {/* From Date */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
            <DateInput
              value={convertToInputFormat(fromDate)}
              onChange={handleFromDateChange}
              className="pr-10"
            />
          </div>

          {/* To Date */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
            <DateInput
              value={convertToInputFormat(toDate)}
              onChange={handleToDateChange}
              className="pr-10"
            />
          </div>

          {/* Custom Date Range Dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Custom Date Range</label>
            <select
              value={customDateRange}
              onChange={(e) => handleCustomDateRangeChange(e.target.value)}
              className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer min-w-[180px]"
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
          <LoadingPage message="Loading Refund report..." fullScreen={false} />
        ) : displayData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No Results Found.</p>
          </div>
        ) : (
          <>
            {/* Pagination Info */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.pages}
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
              <table className="w-full border-collapse" style={{ minWidth: '2400px', width: '100%' }}>
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">S.No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Mobile</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Email id</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Sequence</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Service Variation</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Pro-forma Invoice No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Base value</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Tax</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Balance</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Utilised value</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Unutilised value</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Deduction</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Refund Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Staff Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Date and Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Instrument</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Transaction id</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Credit Note No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Note</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">View</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayData.map((item, index) => (
                    <tr key={item._id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {(pagination.page - 1) * 20 + index + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium border border-gray-200">{item.name || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.mobile || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.emailId || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.sequence || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.service || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.serviceVariation || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.proFormaInvoiceNo || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.type || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">{formatCurrency(item.baseValue)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">{formatCurrency(item.tax)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">{formatCurrency(item.total)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">{formatCurrency(item.paid)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">{formatCurrency(item.balance)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">{formatCurrency(item.utilisedValue)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">{formatCurrency(item.unutilisedValue)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">{formatCurrency(item.deduction)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">{formatCurrency(item.refundAmount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.staffName || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{formatDateTime(item.dateTime)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.instrument || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.transactionId || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.creditNoteNo || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">{item.note || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-200">
                        <div className="flex items-center justify-center gap-2">
                          <button className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors" title="Print">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                    <td colSpan="9" className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-200">Total</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">{formatCurrency(totals.baseValue)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">{formatCurrency(totals.tax)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">{formatCurrency(totals.total)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">{formatCurrency(totals.paid)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">{formatCurrency(totals.balance)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">{formatCurrency(totals.utilisedValue)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">{formatCurrency(totals.unutilisedValue)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">{formatCurrency(totals.deduction)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">{formatCurrency(totals.refundAmount)}</td>
                    <td colSpan="7" className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-200"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

