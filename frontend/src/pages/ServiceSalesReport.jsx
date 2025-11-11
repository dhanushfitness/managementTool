import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ChevronDown,
  CalendarRange,
  Filter,
  RefreshCcw,
  TrendingUp
} from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getServiceSalesReport, exportServiceSalesReport } from '../api/reports'
import api from '../api/axios'
import toast from 'react-hot-toast'

const DEFAULT_FILTERS = {
  saleType: 'all',
  dateRange: 'last-30-days',
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

export default function ServiceSalesReport() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)

  const { data: plansData } = useQuery({
    queryKey: ['plans-list'],
    queryFn: () => api.get('/plans').then(res => res.data)
  })

  const plans = plansData?.plans || []

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

  const handleSearch = (event) => {
    if (event) event.preventDefault()
    setHasSearched(true)
    setPage(1)
    refetch()
  }

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS)
    setHasSearched(false)
    setPage(1)
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
  }, [filters.dateRange])

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
        helper: `${quantity} total bookings`
      },
      {
        label: 'Gross Sales',
        value: `₹${formatCurrency(grossSales)}`,
        helper: `Discounts: ₹${formatCurrency(discount)}`
      },
      {
        label: 'Average Ticket Size',
        value: quantity ? `₹${formatCurrency(avgTicket)}` : '₹0.00',
        helper: `${discountPct.toFixed(1)}% discount rate`
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <nav className="text-sm text-gray-500">
            <Link to="/dashboard" className="hover:text-orange-600">Home</Link>
            <span className="mx-2 text-gray-300">/</span>
            <Link to="/reports" className="hover:text-orange-600">Reports</Link>
            <span className="mx-2 text-gray-300">/</span>
            <Link to="/reports/sales" className="hover:text-orange-600">Sales</Link>
            <span className="mx-2 text-gray-300">/</span>
            <span className="text-orange-600 font-semibold">Service Sales</span>
          </nav>
          <h1 className="mt-3 text-3xl font-bold text-gray-900">Service Sales Performance</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            <CalendarRange className="h-4 w-4 text-orange-500" />
            Reporting window: <span className="font-medium text-gray-700">{dateRangeLabel}</span>
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          disabled={!hasSearched || bookings.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-orange-500 bg-white px-4 py-2 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {summaryCards.map(card => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-orange-50/40 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-900">{card.value}</p>
            <p className="mt-1 text-xs font-medium text-gray-500">{card.helper}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Filter className="h-4 w-4 text-orange-500" />
            Refine results
          </div>
          <button
            onClick={handleReset}
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>

        <form onSubmit={handleSearch} className="grid gap-4 px-6 py-4 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sale type</label>
            <div className="relative mt-2">
              <select
                value={filters.saleType}
                onChange={(e) => handleFilterChange('saleType', e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              >
                {saleTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Date range</label>
            <div className="relative mt-2">
              <select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              >
                {dateRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Service</label>
            <div className="relative mt-2">
              <select
                value={filters.serviceName}
                onChange={(e) => handleFilterChange('serviceName', e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
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
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Service variation</label>
            <div className="relative mt-2">
              <select
                value={filters.serviceVariation}
                onChange={(e) => handleFilterChange('serviceVariation', e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              >
                <option value="">All variations</option>
                {plans.map(plan => (
                  <option key={plan._id} value={plan.name}>{plan.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div className="lg:col-span-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Gender</label>
            <div className="relative mt-2">
              <select
                value={filters.gender}
                onChange={(e) => handleFilterChange('gender', e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              >
                {genderOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div className="flex items-end justify-end gap-3 lg:col-span-1">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
            >
              Apply
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-12">
            <LoadingPage message="Crunching your sales numbers…" fullScreen={false} />
          </div>
        ) : !hasSearched ? (
          <div className="flex flex-col items-center gap-3 p-16 text-center">
            <Filter className="h-10 w-10 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-800">Refine the view to get started</h3>
            <p className="max-w-sm text-sm text-gray-500">Choose a date range or service above and click Apply to load detailed service sales.</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-16 text-center">
            <RefreshCcw className="h-10 w-10 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-800">No sales found for this view</h3>
            <p className="max-w-sm text-sm text-gray-500">Try widening the date range or resetting filters to see more results.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
              <div className="text-sm font-medium text-gray-600">Showing {bookings.length} of {pagination.total} records</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-gray-700">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPage(prev => Math.min(pagination.pages, prev + 1))}
                  disabled={page >= pagination.pages}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="w-16 px-6 py-3">#</th>
                    <th className="min-w-[160px] px-6 py-3">Booking details</th>
                    <th className="min-w-[140px] px-6 py-3">Service</th>
                    <th className="min-w-[120px] px-6 py-3">Quantity</th>
                    <th className="min-w-[140px] px-6 py-3">List price</th>
                    <th className="min-w-[140px] px-6 py-3">Discount</th>
                    <th className="min-w-[160px] px-6 py-3">Total amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white text-sm text-gray-700">
                  {bookings.map((booking, index) => (
                    <tr key={booking._id} className="transition-colors hover:bg-orange-50/40">
                      <td className="px-6 py-4 font-semibold text-gray-900">{(page - 1) * 20 + index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-900">{booking.proFormaInvoiceNo || booking.invoiceNumber || '—'}</p>
                          <p className="text-xs text-gray-500">{formatDate(booking.createdAt)}</p>
                          <span className="inline-flex w-fit rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-orange-700">
                            {booking.saleType || 'Sale'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-900">{booking.serviceName || '—'}</p>
                          <p className="text-xs text-gray-500">{booking.serviceVariation || 'Standard'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{booking.quantity || 0}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">₹{formatCurrency(booking.listPrice)}</td>
                      <td className="px-6 py-4 font-medium text-rose-600">₹{formatCurrency(booking.discountValue)}</td>
                      <td className="px-6 py-4 font-semibold text-emerald-600">₹{formatCurrency(booking.totalAmount)}</td>
                    </tr>
                  ))}

                  <tr className="bg-gray-50 text-sm font-semibold text-gray-800">
                    <td className="px-6 py-4" colSpan={3}>Totals</td>
                    <td className="px-6 py-4">{totals.quantity}</td>
                    <td className="px-6 py-4">₹{formatCurrency(totals.listPrice)}</td>
                    <td className="px-6 py-4 text-rose-600">₹{formatCurrency(totals.discountValue)}</td>
                    <td className="px-6 py-4 text-emerald-600">₹{formatCurrency(totals.totalAmount)}</td>
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

