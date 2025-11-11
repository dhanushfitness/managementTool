import { useMemo, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react'
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
          paymentMethod: PAYMENT_METHOD_LABELS[receipt.paymentMethod] || 'Other'
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
      <div className="flex flex-col gap-2">
        <nav className="text-sm text-gray-500">
          <span className="text-gray-400">Home</span>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-500">Reports</span>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-500">Finance</span>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-orange-500 font-medium">Service Payments Collected</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">Service Payments Collected</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Service Payments Collected
          </h2>
          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">New Non PT Sales</span>
                <span className="font-semibold text-gray-900">{formatCurrency(summary.nonPt.newSales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Due Recovered</span>
                <span className="font-semibold text-gray-900">{formatCurrency(summary.nonPt.dueRecovered)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <span className="font-semibold text-gray-700">Total</span>
                <span className="font-bold text-orange-600">
                  {formatCurrency(summary.nonPt.total || summary.nonPt.newSales + summary.nonPt.dueRecovered)}
                </span>
              </div>
            </div>
            <div className="space-y-2 border-t border-gray-100 pt-4">
              <div className="flex justify-between">
                <span className="text-gray-600">New PT Sales</span>
                <span className="font-semibold text-gray-900">{formatCurrency(summary.pt.newSales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Due Recovered</span>
                <span className="font-semibold text-gray-900">{formatCurrency(summary.pt.dueRecovered)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <span className="font-semibold text-gray-700">Total</span>
                <span className="font-bold text-orange-600">
                  {formatCurrency(summary.pt.total || summary.pt.newSales + summary.pt.dueRecovered)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Product Payments Collected
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">New Sales</span>
              <span className="font-semibold text-gray-900">{formatCurrency(summary.products.newSales)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Due Recovered</span>
              <span className="font-semibold text-gray-900">{formatCurrency(summary.products.dueRecovered)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="font-bold text-orange-600">
                {formatCurrency(summary.products.total || summary.products.newSales + summary.products.dueRecovered)}
              </span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Overall Summary
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Paid</span>
              <span className="font-semibold text-green-600">{formatCurrency(summary.overall.totalPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Pending</span>
              <span className="font-semibold text-red-500">{formatCurrency(summary.overall.totalPending)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2">
              <span className="font-semibold text-gray-700">Receipts</span>
              <span className="font-bold text-gray-900">{pagination.total || receipts.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyFilters()
                  }
                }}
                placeholder="Search by Name / Mobile Number / Bill number"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyFilters}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
            >
              Go
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 rounded-lg border border-orange-500 px-4 py-2 text-sm font-semibold text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Exporting...' : 'Export Excel'}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <select
            value={filters.dateRange}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, dateRange: e.target.value }))
              setPage(1)
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
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
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          >
            <option value="all">Service payments</option>
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
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          >
            <option value="all">All branches</option>
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
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          >
            <option value="all">All sales reps</option>
            {salesRepOptions.map((rep) => (
              <option key={rep.id} value={rep.id}>
                {rep.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          {isFetching && (
            <div className="border-b border-gray-100 bg-orange-50 px-4 py-2 text-sm text-orange-600">
              Updating results...
            </div>
          )}
          <table className="min-w-[1200px] w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                <th className="px-4 py-3">S.No</th>
                <th className="px-4 py-3">Bill No</th>
                <th className="px-4 py-3">Paid Date</th>
                <th className="px-4 py-3">Purchase Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Branch Location</th>
                <th className="px-4 py-3">Member ID</th>
                <th className="px-4 py-3">Member Name</th>
                <th className="px-4 py-3">Contact Number</th>
                <th className="px-4 py-3">Service Name</th>
                <th className="px-4 py-3">Sales Rep Name</th>
                <th className="px-4 py-3">PT Name</th>
                <th className="px-4 py-3">Created By</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Tax Amount</th>
                <th className="px-4 py-3 text-right">Final Amount</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Pending</th>
                <th className="px-4 py-3">Pay Mode</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={19} className="py-12 text-center text-gray-500">
                    No receipts found for the selected filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={`${row.billNo}-${row.sNo}`} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{row.sNo}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{row.billNo}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(row.paidDate)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(row.purchaseDate)}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{row.type}</td>
                    <td className="px-4 py-3 text-gray-700">{row.branch}</td>
                    <td className="px-4 py-3 text-gray-600">{row.memberId}</td>
                    <td className="px-4 py-3 text-gray-800">{row.memberName}</td>
                    <td className="px-4 py-3 text-gray-600">{row.contactNumber}</td>
                    <td className="px-4 py-3 text-gray-800">{row.serviceName}</td>
                    <td className="px-4 py-3 text-gray-600">{row.salesRepName}</td>
                    <td className="px-4 py-3 text-gray-600">{row.ptName}</td>
                    <td className="px-4 py-3 text-gray-600">{row.createdBy}</td>
                    <td className="px-4 py-3 text-right text-gray-800">{formatCurrency(row.amount)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(row.taxAmount)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(row.finalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">
                      {formatCurrency(row.paidAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-500">
                      {formatCurrency(row.pendingAmount)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.paymentMethod}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-600 md:flex-row">
          <div className="text-center md:text-left">
            Showing page {pagination.page} of {Math.max(pagination.pages || 1, 1)} · {rows.length} rows displayed ·{' '}
            {(pagination.total || receipts.length)} receipts total
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <span className="text-sm font-medium text-gray-600">
              Page {pagination.page} of {Math.max(pagination.pages, 1)}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

