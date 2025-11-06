import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Download, ChevronDown } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getServiceSalesReport, exportServiceSalesReport } from '../api/reports'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function ServiceSalesReport() {
  const [filters, setFilters] = useState({
    saleType: 'all',
    dateRange: 'last-30-days',
    serviceName: '',
    serviceVariation: '',
    gender: ''
  })
  const [page, setPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)

  // Fetch services/plans for dropdown
  const { data: plansData } = useQuery({
    queryKey: ['plans-list'],
    queryFn: () => api.get('/plans').then(res => res.data)
  })

  const plans = plansData?.plans || []

  // Fetch service sales report
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['service-sales-report', filters, page],
    queryFn: () => getServiceSalesReport({ 
      ...filters,
      page,
      limit: 20
    }).then(res => res.data),
    enabled: hasSearched
  })

  const bookings = reportData?.data?.bookings || []
  const totals = reportData?.data?.totals || { quantity: 0, listPrice: 0, discountValue: 0, totalAmount: 0 }
  const pagination = reportData?.data?.pagination || { page: 1, pages: 1, total: 0 }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleSearch = () => {
    setHasSearched(true)
    setPage(1)
    refetch()
  }

  const handleExportExcel = async () => {
    try {
      const response = await exportServiceSalesReport(filters)
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `service-sales-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Report exported successfully')
    } catch (error) {
      toast.error('Failed to export report')
      console.error('Export error:', error)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.toLocaleString('en-US', { month: 'short' })
    const year = date.getFullYear()
    return `${month}${day}-${year}`
  }

  // Get date range options
  const getDateRangeDates = () => {
    const end = new Date()
    const start = new Date()
    
    switch (filters.dateRange) {
      case 'last-7-days':
        start.setDate(start.getDate() - 7)
        break
      case 'last-30-days':
        start.setDate(start.getDate() - 30)
        break
      case 'last-90-days':
        start.setDate(start.getDate() - 90)
        break
      case 'this-month':
        start.setDate(1)
        break
      case 'last-month':
        start.setMonth(start.getMonth() - 1)
        start.setDate(1)
        end.setDate(0)
        break
      default:
        start.setDate(start.getDate() - 30)
    }
    
    return { start, end }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm">
        <Link to="/dashboard" className="text-gray-600 hover:text-orange-600">Home</Link>
        <span className="text-gray-400 mx-2">/</span>
        <Link to="/reports" className="text-gray-600 hover:text-orange-600">Reports</Link>
        <span className="text-gray-400 mx-2">/</span>
        <Link to="/reports/sales" className="text-gray-600 hover:text-orange-600">Sales</Link>
        <span className="text-gray-400 mx-2">/</span>
        <span className="text-orange-600 font-medium">Service Sales All Bookings</span>
      </nav>

      {/* Page Title */}
      <h1 className="text-3xl font-bold text-gray-900 text-center">Service Sales All Bookings</h1>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Sale Type Filter */}
          <div className="relative">
            <select
              value={filters.saleType}
              onChange={(e) => handleFilterChange('saleType', e.target.value)}
              className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 cursor-pointer"
            >
              <option value="all">All Sale</option>
              <option value="new-bookings">New Bookings</option>
              <option value="rebookings">Rebookings</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Date Range Filter */}
          <div className="relative">
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 cursor-pointer"
            >
              <option value="last-7-days">Last 7 days</option>
              <option value="last-30-days">Last 30 days</option>
              <option value="last-90-days">Last 90 days</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Service Name Filter */}
          <div className="relative">
            <select
              value={filters.serviceName}
              onChange={(e) => handleFilterChange('serviceName', e.target.value)}
              className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 cursor-pointer min-w-[180px]"
            >
              <option value="">Gym Membership</option>
              {plans.map(plan => (
                <option key={plan._id} value={plan._id}>{plan.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Service Variation Filter */}
          <div className="relative">
            <select
              value={filters.serviceVariation}
              onChange={(e) => handleFilterChange('serviceVariation', e.target.value)}
              className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 cursor-pointer min-w-[180px]"
            >
              <option value="">Select Service variation</option>
              {plans.map(plan => (
                <option key={plan._id} value={plan.name}>{plan.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Gender Filter */}
          <div className="relative">
            <select
              value={filters.gender}
              onChange={(e) => handleFilterChange('gender', e.target.value)}
              className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 cursor-pointer"
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Go Button */}
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm"
          >
            Go
          </button>

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            disabled={!hasSearched || bookings.length === 0}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12">
            <LoadingPage message="Loading service sales data..." fullScreen={false} />
          </div>
        ) : !hasSearched ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">Select filters and click "Go" to view service sales report</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">No bookings found for the selected filters</p>
          </div>
        ) : (
          <>
            {/* Pagination Controls */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600">
                  Page {pagination.page} Of {pagination.pages}
                </span>
                <button
                  onClick={() => setPage(prev => Math.min(pagination.pages, prev + 1))}
                  disabled={page >= pagination.pages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">S.No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Pro Forma Invoice No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Sale Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Service Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Service Variations</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">List Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Discount Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.map((booking, index) => (
                    <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(page - 1) * 20 + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(booking.createdAt) || booking.proFormaInvoiceNo || booking.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.saleType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.serviceName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.serviceVariation}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(booking.listPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(booking.discountValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(booking.totalAmount)}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Total Row */}
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan="5" className="px-6 py-4 text-sm text-gray-900">
                      Total
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {totals.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(totals.listPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(totals.discountValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(totals.totalAmount)}
                    </td>
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

