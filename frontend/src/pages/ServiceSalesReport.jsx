import { useMemo, useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ChevronDown,
  CalendarRange,
  Filter,
  RefreshCcw,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  BarChart3,
  Sparkles,
  Package
} from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getServiceSalesReport, exportServiceSalesReport } from '../api/reports'
import api from '../api/axios'
import toast from 'react-hot-toast'

const DEFAULT_FILTERS = {
  saleType: 'all',
  dateRange: 'last-30-days',
  startDate: '',
  endDate: '',
  serviceName: '',
  serviceVariation: '',
  gender: ''
}

const saleTypeOptions = [
  { value: 'all', label: 'All Sales' },
  { value: 'new-bookings', label: 'New Bookings' },
  { value: 'rebookings', label: 'Rebookings' }
]

const dateRangeOptions = [
  { value: 'last-7-days', label: 'Last 7 days' },
  { value: 'last-30-days', label: 'Last 30 days' },
  { value: 'last-90-days', label: 'Last 90 days' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' }
]

const genderOptions = [
  { value: '', label: 'All Genders' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' }
]

// Helper function to convert dashboard dateFilter to report dateRange
// This matches the dashboard's getDateRange function logic
const convertDashboardDateFilter = (dateFilter, fromDate, toDate) => {
  // Custom range - pass through as-is
  if (dateFilter === 'custom' && fromDate && toDate) {
    return {
      dateRange: 'custom',
      startDate: fromDate,
      endDate: toDate
    }
  }
  
  // Handle "today" - dashboard uses today 00:00:00 to tomorrow 00:00:00
  // To match exactly, we need to pass tomorrow as endDate, but backend will set it to 23:59:59.999
  // Actually, let's pass today for both and let backend handle the time correctly
  // But we need to ensure it matches dashboard's logic: today 00:00:00 to tomorrow 00:00:00 (inclusive of all today)
  if (dateFilter === 'today') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    // For "today", dashboard uses tomorrow 00:00:00 as end, but with $lte it includes all of today
    // We'll pass today as endDate, and backend sets it to 23:59:59.999 which should be equivalent
    // But to be safe, let's calculate tomorrow and pass it, then backend will set it correctly
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    return {
      dateRange: 'custom',
      startDate: todayStr,
      endDate: tomorrowStr // Pass tomorrow, backend will set to 23:59:59.999 of tomorrow, but we want it to be tomorrow 00:00:00
    }
  }
  
  // Map dashboard dateFilter to report dateRange
  // Dashboard's last7days = today - 7 days to end of today
  // Dashboard's last30days = today - 30 days to end of today
  // Reports use same calculation for last-7-days and last-30-days
  const mapping = {
    'last7days': 'last-7-days',
    'last30days': 'last-30-days'
  }
  
  return {
    dateRange: mapping[dateFilter] || 'last-30-days',
    startDate: '',
    endDate: ''
  }
}

export default function ServiceSalesReport() {
  const location = useLocation()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(true) // Start as true to auto-load data
  const [initialParamsApplied, setInitialParamsApplied] = useState(false)

  // Apply date filter from URL params on mount
  useEffect(() => {
    if (initialParamsApplied) return
    
    const params = new URLSearchParams(location.search)
    const dateFilter = params.get('dateFilter')
    const fromDate = params.get('fromDate')
    const toDate = params.get('toDate')
    
    if (dateFilter) {
      const converted = convertDashboardDateFilter(dateFilter, fromDate, toDate)
      setFilters(prev => ({
        ...prev,
        dateRange: converted.dateRange,
        ...(converted.startDate && converted.endDate ? {
          startDate: converted.startDate,
          endDate: converted.endDate
        } : {})
      }))
    }
    // Always enable search immediately, even if no dateFilter in URL (use default filters)
    // This ensures data loads when navigating from dashboard
    setHasSearched(true)
    setInitialParamsApplied(true)
  }, [location.search, initialParamsApplied])

  const { data: plansData } = useQuery({
    queryKey: ['plans-list'],
    queryFn: () => api.get('/plans').then(res => res.data)
  })

  const plans = plansData?.plans || []

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['service-sales-report', filters, page],
    queryFn: () => getServiceSalesReport({
      ...filters,
      page,
      limit: 20
    }).then(res => {
      // Handle response structure: { success: true, data: {...} }
      const responseData = res.data
      if (responseData?.success && responseData?.data) {
        return responseData.data
      }
      // Fallback: if data is directly in response
      return responseData?.data || responseData
    }),
    enabled: hasSearched
  })

  const bookings = reportData?.bookings || []
  const totals = reportData?.totals || { quantity: 0, listPrice: 0, discountValue: 0, totalAmount: 0 }
  const pagination = reportData?.pagination || { page: 1, pages: 1, total: 0 }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleSearch = (event) => {
     if (event) event.preventDefault()
    setPage(1)
    setHasSearched(true)
  }

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS)
    setPage(1)
    setHasSearched(true)
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
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const { startDate, endDate } = useMemo(() => {
    // If custom range with explicit dates, use them
    if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
      return {
        startDate: new Date(filters.startDate),
        endDate: new Date(filters.endDate)
      }
    }

    const end = new Date()
    const start = new Date()

    switch (filters.dateRange) {
      case 'last-7-days':
        start.setDate(start.getDate() - 6)
        break
      case 'last-30-days':
        start.setDate(start.getDate() - 29)
        break
      case 'last-90-days':
        start.setDate(start.getDate() - 89)
        break
      case 'this-month':
        start.setDate(1)
        break
      case 'last-month':
        start.setMonth(start.getMonth() - 1)
        start.setDate(1)
        end.setMonth(end.getMonth() - 1)
        end.setDate(new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate())
        break
      default:
        start.setDate(start.getDate() - 29)
    }

    return { startDate: start, endDate: end }
  }, [filters.dateRange, filters.startDate, filters.endDate])

  const summaryCards = useMemo(() => {
    const grossSales = totals.listPrice || 0
    const discount = totals.discountValue || 0
    const netSales = totals.totalAmount || 0
    const quantity = totals.quantity || 0
    const avgTicket = quantity > 0 ? netSales / quantity : 0
    const discountPct = grossSales > 0 ? (discount / grossSales) * 100 : 0

    return [
      {
        label: 'Net Revenue',
        value: `₹${formatCurrency(netSales)}`,
        helper: `${quantity} total bookings`,
        icon: DollarSign,
        gradient: 'from-green-500 to-emerald-500',
        bgGradient: 'from-green-50 to-emerald-50'
      },
      {
        label: 'Gross Sales',
        value: `₹${formatCurrency(grossSales)}`,
        helper: `Discounts: ₹${formatCurrency(discount)}`,
        icon: BarChart3,
        gradient: 'from-blue-500 to-indigo-500',
        bgGradient: 'from-blue-50 to-indigo-50'
      },
      {
        label: 'Average Ticket',
        value: quantity ? `₹${formatCurrency(avgTicket)}` : '₹0.00',
        helper: `${discountPct.toFixed(1)}% discount rate`,
        icon: ShoppingBag,
        gradient: 'from-purple-500 to-pink-500',
        bgGradient: 'from-purple-50 to-pink-50'
      }
    ]
  }, [totals])

  const dateRangeLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })

    return `${formatter.format(startDate)} – ${formatter.format(endDate)}`
  }, [startDate, endDate])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/dashboard" className="text-gray-500 hover:text-orange-600 transition-colors">Home</Link>
            <span className="text-gray-300">/</span>
            <Link to="/reports" className="text-gray-500 hover:text-orange-600 transition-colors">Reports</Link>
            <span className="text-gray-300">/</span>
            <span className="text-orange-600 font-semibold">Service Sales</span>
          </nav>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Service Sales Performance</h1>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                <CalendarRange className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-semibold text-gray-700">{dateRangeLabel}</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleExportExcel}
          disabled={!hasSearched || bookings.length === 0}
          className="group inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
        >
          <Download className="h-4 w-4 group-hover:animate-bounce" />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {summaryCards.map(card => {
          const Icon = card.icon
          return (
            <div 
              key={card.label} 
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.bgGradient} border-2 border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all group`}
            >
              {/* Decorative circle */}
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/40 rounded-full blur-2xl"></div>
              
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">{card.label}</p>
                  <div className={`p-2.5 bg-gradient-to-br ${card.gradient} rounded-xl shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-black text-gray-900 mb-2">{card.value}</p>
                <p className="text-xs font-medium text-gray-600">{card.helper}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-lg">
              <Filter className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">Advanced Filters</span>
          </div>
          <button
            onClick={handleReset}
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
        </div>

        <form onSubmit={handleSearch} className="p-6">
          <div className="grid gap-4 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Sale Type</label>
              <div className="relative">
                <select
                  value={filters.saleType}
                  onChange={(e) => handleFilterChange('saleType', e.target.value)}
                  className="w-full appearance-none rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                >
                  {saleTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Date Range</label>
              <div className="relative">
                <select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  className="w-full appearance-none rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                >
                  {dateRangeOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Service</label>
              <div className="relative">
                <select
                  value={filters.serviceName}
                  onChange={(e) => handleFilterChange('serviceName', e.target.value)}
                  className="w-full appearance-none rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                >
                  <option value="">All services</option>
                  {plans.map(plan => (
                    <option key={plan._id} value={plan._id}>{plan.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Service Variation</label>
              <div className="relative">
                <select
                  value={filters.serviceVariation}
                  onChange={(e) => handleFilterChange('serviceVariation', e.target.value)}
                  className="w-full appearance-none rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                >
                  <option value="">All variations</option>
                  {plans.map(plan => (
                    <option key={plan._id} value={plan.name}>{plan.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Gender</label>
              <div className="relative">
                <select
                  value={filters.gender}
                  onChange={(e) => handleFilterChange('gender', e.target.value)}
                  className="w-full appearance-none rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                >
                  {genderOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div className="lg:col-span-2 flex items-end">
              <button
                type="submit"
                className="group w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold shadow-lg hover:shadow-xl"
              >
                <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                Apply Filters
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12">
            <LoadingPage message="Crunching your sales numbers…" fullScreen={false} />
          </div>
        ) : !hasSearched ? (
          <div className="flex flex-col items-center gap-4 p-16 text-center">
            <div className="p-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg">
              <Filter className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Apply Filters to Get Started</h3>
            <p className="max-w-md text-sm text-gray-600">Choose a date range or service above and click "Apply Filters" to load detailed service sales data.</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center gap-4 p-16 text-center">
            <div className="p-4 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl shadow-lg">
              <Package className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No Sales Found</h3>
            <p className="max-w-md text-sm text-gray-600">No sales records match your current filters. Try widening the date range or resetting filters.</p>
          </div>
        ) : (
          <>
            {/* Pagination Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="text-sm font-semibold text-gray-700">
                Showing <span className="text-orange-600">{bookings.length}</span> of <span className="text-orange-600">{pagination.total}</span> records
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-4 py-2 text-sm font-bold text-gray-900">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  onClick={() => setPage(prev => Math.min(pagination.pages, prev + 1))}
                  disabled={page >= pagination.pages}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">#</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[180px]">Booking Details</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[160px]">Service</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">List Price</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Discount</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {bookings.map((booking, index) => (
                    <tr key={booking._id} className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all">
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold">
                          {(page - 1) * 20 + index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1.5">
                          <p className="text-sm font-bold text-gray-900">{booking.proFormaInvoiceNo || booking.invoiceNumber || '—'}</p>
                          <p className="text-xs text-gray-500">{formatDate(booking.createdAt)}</p>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold uppercase">
                            {booking.saleType || 'Sale'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-gray-900">{booking.serviceName || '—'}</p>
                          <p className="text-xs text-gray-500">{booking.serviceVariation || 'Standard'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-bold text-gray-900">{booking.quantity || 0}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-semibold text-gray-900">₹{formatCurrency(booking.listPrice)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-semibold text-red-600">₹{formatCurrency(booking.discountValue)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-bold text-green-600">₹{formatCurrency(booking.totalAmount)}</span>
                      </td>
                    </tr>
                  ))}

                  {/* Totals Row */}
                  <tr className="bg-gradient-to-r from-green-50 to-emerald-50 border-t-2 border-green-200">
                    <td className="px-4 py-4" colSpan={3}>
                      <span className="text-sm font-black text-gray-900 uppercase">Total</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-black text-gray-900">{totals.quantity}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-black text-gray-900">₹{formatCurrency(totals.listPrice)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-black text-red-600">₹{formatCurrency(totals.discountValue)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-black text-green-600">₹{formatCurrency(totals.totalAmount)}</span>
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
