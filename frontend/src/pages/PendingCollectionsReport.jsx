import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  AlertCircle,
  DollarSign,
  Package,
  Target,
  Search,
  Filter,
  Sparkles,
  CreditCard,
  User
} from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getPendingCollections, exportPendingCollections } from '../api/invoices'
import { getBranches } from '../api/organization'
import api from '../api/axios'
import toast from 'react-hot-toast'
import AddInvoiceModal from '../components/AddInvoiceModal'

export default function PendingCollectionsReport() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showAddModal, setShowAddModal] = useState(false)
  const [filters, setFilters] = useState({
    dateRange: 'last-30-days',
    billType: 'all',
    invoiceType: 'all',
    branchId: '',
    salesRepId: '',
    ptId: '',
    generalTrainerId: ''
  })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(true)

  // Fetch branches
  const { data: branchesData } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      try {
        const response = await getBranches()
        return { branches: response.branches || [] }
      } catch {
        return { branches: [] }
      }
    }
  })

  // Fetch staff for sales rep
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff').then(res => res.data).catch(() => ({ staff: [] }))
  })

  // Fetch pending collections
  const { data: collectionsData, isLoading, refetch } = useQuery({
    queryKey: ['pending-collections', filters, search, page],
    queryFn: () => getPendingCollections({
      ...filters,
      search: search || undefined,
      page,
      limit: 20
    }).then(res => res.data),
    enabled: hasSearched
  })

  const invoices = collectionsData?.data?.invoices || []
  const summary = collectionsData?.data?.summary || {
    serviceNonPTPending: 0,
    servicePTPending: 0,
    productPending: 0
  }
  const pagination = collectionsData?.data?.pagination || { page: 1, pages: 1, total: 0 }

  const branches = branchesData?.branches || []
  const staff = staffData?.staff || []

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
      const response = await exportPendingCollections({ ...filters, search: search || undefined })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `pending-collections-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Pending collections exported successfully')
    } catch (error) {
      toast.error('Failed to export pending collections')
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
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  const getBillTypeLabel = (type) => {
    switch (type) {
      case 'pro-forma':
        return 'Tax Invoice'
      case 'membership':
      case 'other':
        return 'New Booking'
      case 'renewal':
      case 'upgrade':
      case 'downgrade':
        return 'Rebooking'
      default:
        return type || '-'
    }
  }

  useEffect(() => {
    if (location.state?.auto) {
      handleSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  if (isLoading && hasSearched) {
    return <LoadingPage />
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
            <span className="text-orange-600 font-semibold">Pending Collections</span>
          </nav>

          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pending Collections</h1>
            <p className="text-gray-600 mt-1">Track and manage outstanding payment collections</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="group inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold shadow-lg hover:shadow-xl"
          >
            <Download className="h-4 w-4 group-hover:animate-bounce" />
            Export CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-semibold shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Service Non-PT Pending */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 border-2 border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/40 rounded-full blur-2xl"></div>

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Service Non-PT</h2>
              <div className="p-2.5 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-medium">Payments Pending</p>
              <p className="text-3xl font-black text-red-600">₹{formatCurrency(summary.serviceNonPTPending)}</p>
            </div>
          </div>
        </div>

        {/* Service PT Pending */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/40 rounded-full blur-2xl"></div>

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Service PT</h2>
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Target className="h-5 w-5 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-medium">Payments Pending</p>
              <p className="text-3xl font-black text-blue-600">₹{formatCurrency(summary.servicePTPending)}</p>
            </div>
          </div>
        </div>

        {/* Product Pending */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/40 rounded-full blur-2xl"></div>

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Products</h2>
              <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Package className="h-5 w-5 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-medium">Payments Pending</p>
              <p className="text-3xl font-black text-purple-600">₹{formatCurrency(summary.productPending)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
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
                placeholder="Search by Name, Member ID, Mobile Number, or Bill Number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full rounded-xl border-2 border-gray-200 py-3 pl-12 pr-4 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold shadow-lg hover:shadow-xl lg:w-auto w-full"
            >
              <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
              Search
            </button>
          </div>

          {/* Filter Row 1 */}
          <div className="grid gap-3 md:grid-cols-5">
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
            >
              <option value="last-7-days">Last 7 days</option>
              <option value="last-30-days">Last 30 days</option>
              <option value="last-90-days">Last 90 days</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
            </select>

            <select
              value={filters.invoiceType}
              onChange={(e) => handleFilterChange('invoiceType', e.target.value)}
              className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
            >
              <option value="all">All Types</option>
              <option value="service">Service</option>
              <option value="package">Package</option>
              <option value="deal">Deal</option>
            </select>

            <select
              value={filters.billType}
              onChange={(e) => handleFilterChange('billType', e.target.value)}
              className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
            >
              <option value="all">All Bills</option>
              <option value="new-booking">New Booking</option>
              <option value="rebooking">Rebooking</option>
            </select>

            <select
              value={filters.branchId}
              onChange={(e) => handleFilterChange('branchId', e.target.value)}
              className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
            >
              <option value="">All Branches</option>
              {branches.map(branch => (
                <option key={branch._id} value={branch._id}>{branch.name}</option>
              ))}
            </select>

            <select
              value={filters.salesRepId}
              onChange={(e) => handleFilterChange('salesRepId', e.target.value)}
              className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
            >
              <option value="">All Sales Reps</option>
              {staff.map(s => (
                <option key={s._id} value={s._id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Row 2 */}
          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={filters.ptId}
              onChange={(e) => handleFilterChange('ptId', e.target.value)}
              className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
            >
              <option value="">All PT Trainers</option>
              {staff.map(s => (
                <option key={s._id} value={s._id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>

            <select
              value={filters.generalTrainerId}
              onChange={(e) => handleFilterChange('generalTrainerId', e.target.value)}
              className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
            >
              <option value="">All General Trainers</option>
              {staff.map(s => (
                <option key={s._id} value={s._id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>

            <button
              onClick={handleSearch}
              className="group inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold shadow-lg hover:shadow-xl"
            >
              <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden">
        {invoices.length === 0 ? (
          <div className="py-16 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl shadow-lg">
                <CreditCard className="h-10 w-10 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">No Pending Collections</h3>
                <p className="text-sm text-gray-600 mt-1">No pending collections found for the selected filters.</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Pagination Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="text-sm font-semibold text-gray-700">
                Showing <span className="text-orange-600">{invoices.length}</span> of <span className="text-orange-600">{pagination.total}</span> invoices
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="inline-flex h-9 px-3 items-center justify-center rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold"
                  title="First Page"
                >
                  First
                </button>
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
                <button
                  onClick={() => setPage(pagination.pages)}
                  disabled={page >= pagination.pages}
                  className="inline-flex h-9 px-3 items-center justify-center rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold"
                  title="Last Page"
                >
                  Last
                </button>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1800px]">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">#</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Purchase Date</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Bill Type</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Due Date</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Branch</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Member ID</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Member Name</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Contact</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">GST No</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Tax Invoice</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Sequence</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Cancelled</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Service</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Start Date</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">End Date</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">PT Name</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Sales Rep</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">General Trainer</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {invoices.map((invoice, invoiceIndex) =>
                    (invoice.items || []).map((item, itemIndex) => (
                      <tr key={`${invoice._id}-${itemIndex}`} className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold">
                            {(page - 1) * 20 + invoiceIndex + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-medium">
                          {formatDate(invoice.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">
                            {getBillTypeLabel(invoice.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-medium">
                          {formatDate(invoice.dueDate)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          {invoice.branchId?.name || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">
                          {invoice.memberId?.memberId || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <button
                            onClick={() => navigate(`/members/${invoice.memberId?._id}`)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-semibold"
                          >
                            <User className="w-3 h-3" />
                            {invoice.memberId ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim() : '-'}
                          </button>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">
                          {invoice.memberId?.phone || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">
                          {invoice.sacCode || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {invoice.isProForma ? (
                            <span className="inline-flex px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                              {invoice.invoiceNumber || '-'}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          Branch Sequence
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {invoice.status === 'cancelled' ? (
                            <span className="inline-flex px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                              Yes
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {item.description || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {item.startDate ? formatDate(item.startDate) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {item.expiryDate ? formatDate(item.expiryDate) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          -
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-medium">
                          {invoice.createdBy ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim() || '-' : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          -
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showAddModal && (
        <AddInvoiceModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            refetch()
          }}
        />
      )}
    </div>
  )
}
