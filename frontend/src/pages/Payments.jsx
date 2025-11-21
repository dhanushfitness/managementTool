import { useMemo, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Search, 
  Printer,
  DollarSign,
  TrendingUp,
  Package,
  CheckCircle2,
  AlertCircle,
  Filter,
  Sparkles,
  CreditCard
} from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getReceipts, exportReceipts } from '../api/payments'
import LoadingPage from '../components/LoadingPage'

const PAGE_SIZE = 20
const PAYMENT_METHOD_LABELS = {
  razorpay: 'Online Payment',
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  other: 'Other'
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(value || 0)

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Payments() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState({
    dateRange: 'last-7-days',
    invoiceType: 'all',
    branchId: 'all',
    salesRepId: 'all',
    search: ''
  })
  const [exporting, setExporting] = useState(false)

  const queryParams = useMemo(() => {
    const params = {
      page,
      limit: PAGE_SIZE,
      dateRange: filters.dateRange
    }

    if (filters.search) params.search = filters.search
    if (filters.invoiceType !== 'all') params.invoiceType = filters.invoiceType
    if (filters.branchId !== 'all') params.branchId = filters.branchId
    if (filters.salesRepId !== 'all') params.salesRepId = filters.salesRepId

    return params
  }, [page, filters])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['payments', 'receipts', queryParams],
    queryFn: () =>
      getReceipts(queryParams).then((res) => res.data?.data || { receipts: [], pagination: {} }),
    keepPreviousData: true
  })

  const receipts = data?.receipts || []
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 }

  const rows = useMemo(() => {
    let counter = (pagination.page - 1) * PAGE_SIZE + 1

    return receipts.flatMap((receipt) => {
      const items = receipt.invoice?.items?.length ? receipt.invoice.items : [null]

      return items.map((item) => {
        const serviceName = item?.description || 'Service'
        const isPtService = /pt|personal\s*training/i.test(serviceName)
        const invoiceTotal = item?.total ?? receipt.invoice?.total ?? receipt.amount ?? 0
        const taxAmount = item?.taxAmount ?? 0
        const itemAmount = item?.amount ?? receipt.amount ?? 0
        const paidAmount = receipt.amount ?? itemAmount
        const pendingAmount = Math.max((receipt.invoice?.pending ?? 0), 0)

        const row = {
          sNo: counter++,
          billNo: receipt.invoice?.invoiceNumber || '-',
          paidDate: receipt.paidAt || receipt.createdAt,
          purchaseDate: receipt.invoice?.createdAt,
          type: receipt.invoice?.type ? receipt.invoice.type.replace(/_/g, ' ') : 'Sale',
          branch: receipt.branchId?.name || receipt.invoice?.branchId?.name || '—',
          memberId: receipt.memberId?.memberId || '—',
          memberName: `${receipt.memberId?.firstName || ''} ${receipt.memberId?.lastName || ''}`.trim() || '—',
          contactNumber: receipt.memberId?.phone || '—',
          serviceName,
          isPtService,
          invoiceType: receipt.invoice?.invoiceType || 'service',
          salesRepName: receipt.createdBy
            ? `${receipt.createdBy.firstName || ''} ${receipt.createdBy.lastName || ''}`.trim() || '—'
            : '—',
          ptName: receipt.invoice?.createdBy
            ? `${receipt.invoice.createdBy.firstName || ''} ${receipt.invoice.createdBy.lastName || ''}`.trim() || '—'
            : '—',
          createdBy: receipt.invoice?.createdBy
            ? `${receipt.invoice.createdBy.firstName || ''} ${receipt.invoice.createdBy.lastName || ''}`.trim() || '—'
            : '—',
          amount: itemAmount,
          taxAmount,
          finalAmount: invoiceTotal,
          paidAmount,
          pendingAmount: pendingAmount > 0 ? pendingAmount : Math.max(invoiceTotal - paidAmount, 0),
          paymentMethod: PAYMENT_METHOD_LABELS[receipt.paymentMethod] || 'Other',
          invoiceId: receipt.invoice?._id || null
        }

        return row
      })
    })
  }, [receipts, pagination.page])

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const dueRecovered = Math.max(row.paidAmount - row.amount, 0)

        if (row.isPtService) {
          acc.pt.newSales += row.paidAmount
          acc.pt.total += row.finalAmount
          acc.pt.dueRecovered += dueRecovered
        } else if (['deal', 'package'].includes(row.invoiceType)) {
          acc.products.newSales += row.paidAmount
          acc.products.total += row.finalAmount
          acc.products.dueRecovered += dueRecovered
        } else {
          acc.nonPt.newSales += row.paidAmount
          acc.nonPt.total += row.finalAmount
          acc.nonPt.dueRecovered += dueRecovered
        }

        acc.overall.totalPaid += row.paidAmount
        acc.overall.totalPending += row.pendingAmount

        return acc
      },
      {
        nonPt: { newSales: 0, dueRecovered: 0, total: 0 },
        pt: { newSales: 0, dueRecovered: 0, total: 0 },
        products: { newSales: 0, dueRecovered: 0, total: 0 },
        overall: { totalPaid: 0, totalPending: 0 }
      }
    )
  }, [rows])

  const invoiceTypeOptions = useMemo(() => {
    const set = new Set()
    receipts.forEach((receipt) => {
      if (receipt.invoice?.invoiceType) {
        set.add(receipt.invoice.invoiceType)
      }
    })
    return Array.from(set)
  }, [receipts])

  const branchOptions = useMemo(() => {
    const map = new Map()
    receipts.forEach((receipt) => {
      const branch = receipt.branchId || receipt.invoice?.branchId
      if (branch) {
        const id = branch._id || branch.id || branch
        const name = branch.name || 'Branch'
        if (id && !map.has(id)) {
          map.set(id, name)
        }
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [receipts])

  const salesRepOptions = useMemo(() => {
    const map = new Map()
    receipts.forEach((receipt) => {
      if (receipt.createdBy) {
        const id = receipt.createdBy._id || receipt.createdBy.id
        const name = `${receipt.createdBy.firstName || ''} ${receipt.createdBy.lastName || ''}`.trim() || 'Sales Rep'
        if (id && !map.has(id)) {
          map.set(id, name)
        }
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [receipts])

  const handleApplyFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      search: searchInput.trim()
    }))
    setPage(1)
  }, [searchInput])

  const handleExport = useCallback(async () => {
    try {
      setExporting(true)
      const exportParams = { ...queryParams }
      delete exportParams.page
      delete exportParams.limit

      const response = await exportReceipts(exportParams)
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `service-payments-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Export successful')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Unable to export payments right now. Please try again.')
    } finally {
      setExporting(false)
    }
  }, [queryParams])

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return
    setPage(newPage)
  }

  if (isLoading) {
    return <LoadingPage message="Loading payments..." />
  }

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
            <span className="text-orange-600 font-semibold">Service Payments Collected</span>
          </nav>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Service Payments Collected</h1>
            <p className="text-gray-600 mt-1">Track and analyze payment collections</p>
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="group inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4 group-hover:animate-bounce" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Service Payments Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/40 rounded-full blur-2xl"></div>
          
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Service Payments</h2>
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">New Non PT Sales</span>
                <span className="font-bold text-gray-900">{formatCurrency(summary.nonPt.newSales)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Due Recovered</span>
                <span className="font-bold text-gray-900">{formatCurrency(summary.nonPt.dueRecovered)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t-2 border-gray-200">
                <span className="font-bold text-gray-700">Total</span>
                <span className="font-black text-blue-600 text-lg">
                  {formatCurrency(summary.nonPt.total || summary.nonPt.newSales + summary.nonPt.dueRecovered)}
                </span>
              </div>
              
              <div className="pt-3 border-t-2 border-gray-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">New PT Sales</span>
                  <span className="font-bold text-gray-900">{formatCurrency(summary.pt.newSales)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Due Recovered</span>
                  <span className="font-bold text-gray-900">{formatCurrency(summary.pt.dueRecovered)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t-2 border-gray-200">
                  <span className="font-bold text-gray-700">PT Total</span>
                  <span className="font-black text-indigo-600 text-lg">
                    {formatCurrency(summary.pt.total || summary.pt.newSales + summary.pt.dueRecovered)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Payments Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/40 rounded-full blur-2xl"></div>
          
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Product Payments</h2>
              <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Package className="h-5 w-5 text-white" />
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">New Sales</span>
                <span className="font-bold text-gray-900">{formatCurrency(summary.products.newSales)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Due Recovered</span>
                <span className="font-bold text-gray-900">{formatCurrency(summary.products.dueRecovered)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t-2 border-gray-200">
                <span className="font-bold text-gray-700">Total</span>
                <span className="font-black text-purple-600 text-lg">
                  {formatCurrency(summary.products.total || summary.products.newSales + summary.products.dueRecovered)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Summary Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/40 rounded-full blur-2xl"></div>
          
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Overall Summary</h2>
              <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-gray-600 font-medium">Total Paid</span>
                </div>
                <span className="font-bold text-green-600">{formatCurrency(summary.overall.totalPaid)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-gray-600 font-medium">Total Pending</span>
                </div>
                <span className="font-bold text-red-600">{formatCurrency(summary.overall.totalPending)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t-2 border-gray-200">
                <span className="font-bold text-gray-700">Total Receipts</span>
                <span className="font-black text-gray-900 text-lg">{pagination.total || receipts.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-lg">
              <Filter className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">Search & Filter</span>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Search Bar */}
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyFilters()
                  }
                }}
                placeholder="Search by Name, Mobile Number, or Bill Number..."
                className="w-full rounded-xl border-2 border-gray-200 py-3 pl-12 pr-4 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyFilters}
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold shadow-lg hover:shadow-xl lg:w-auto w-full"
            >
              <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
              Search
            </button>
          </div>

          {/* Filter Dropdowns */}
          <div className="grid gap-3 md:grid-cols-4">
            <select
              value={filters.dateRange}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, dateRange: e.target.value }))
                setPage(1)
              }}
              className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
            >
              <option value="last-7-days">Last 7 days</option>
              <option value="last-30-days">Last 30 days</option>
              <option value="last-90-days">Last 90 days</option>
              <option value="this-month">This month</option>
              <option value="last-month">Last month</option>
            </select>

            <select
              value={filters.invoiceType}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, invoiceType: e.target.value }))
                setPage(1)
              }}
              className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
            >
              <option value="all">All Types</option>
              {invoiceTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={filters.branchId}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, branchId: e.target.value }))
                setPage(1)
              }}
              className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
            >
              <option value="all">All Branches</option>
              {branchOptions.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>

            <select
              value={filters.salesRepId}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, salesRepId: e.target.value }))
                setPage(1)
              }}
              className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
            >
              <option value="all">All Sales Reps</option>
              {salesRepOptions.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden">
        {isFetching && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 px-6 py-3 border-b-2 border-orange-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
              <span className="text-sm font-semibold text-orange-700">Updating results...</span>
            </div>
          </div>
        )}

        {/* Pagination Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="text-sm font-semibold text-gray-700">
            Showing <span className="text-orange-600">{rows.length}</span> of <span className="text-orange-600">{pagination.total || receipts.length}</span> receipts
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-4 py-2 text-sm font-bold text-gray-900">
              {pagination.page} / {Math.max(pagination.pages, 1)}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="min-w-[1400px] w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">#</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Bill No</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Paid Date</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Purchase Date</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Branch</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Member ID</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Member Name</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Service</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Sales Rep</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">PT Name</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Created By</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Tax</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Final</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Paid</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Pending</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Pay Mode</th>
                <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={20} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl shadow-lg">
                        <CreditCard className="h-10 w-10 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">No Receipts Found</h3>
                        <p className="text-sm text-gray-600 mt-1">No payment receipts match your current filters.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={`${row.billNo}-${row.sNo}`} className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold">
                        {row.sNo}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.billNo}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(row.paidDate)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(row.purchaseDate)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold capitalize">
                        {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{row.branch}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{row.memberId}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{row.memberName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{row.contactNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{row.serviceName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.salesRepName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.ptName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.createdBy}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatCurrency(row.amount)}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-600">{formatCurrency(row.taxAmount)}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">{formatCurrency(row.finalAmount)}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-green-600">{formatCurrency(row.paidAmount)}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-red-600">{formatCurrency(row.pendingAmount)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold">
                        {row.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.invoiceId && (
                        <button
                          onClick={() => {
                            window.open(`/invoices/${row.invoiceId}/print`, '_blank')
                          }}
                          className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all shadow-sm"
                          title="Print Invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
