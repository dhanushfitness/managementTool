import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Download, ChevronDown, Plus, Eye, Printer, Trash2 } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getCancelledInvoices, exportCancelledInvoices } from '../api/invoices'
import { getBranches } from '../api/organization'
import api from '../api/axios'
import toast from 'react-hot-toast'
import AddInvoiceModal from '../components/AddInvoiceModal'

export default function CancelledInvoicesReport() {
  const navigate = useNavigate()
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
  const [hasSearched, setHasSearched] = useState(false)

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

  // Fetch cancelled invoices
  const { data: invoicesData, isLoading, refetch } = useQuery({
    queryKey: ['cancelled-invoices', filters, search, page],
    queryFn: () => getCancelledInvoices({ 
      ...filters,
      search: search || undefined,
      page,
      limit: 20
    }).then(res => res.data),
    enabled: hasSearched
  })

  const invoices = invoicesData?.data?.invoices || []
  const summary = invoicesData?.data?.summary || { 
    serviceNonPTSales: 0, 
    servicePTSales: 0, 
    productSales: 0 
  }
  const pagination = invoicesData?.data?.pagination || { page: 1, pages: 1, total: 0 }

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
      const response = await exportCancelledInvoices({ ...filters, search: search || undefined })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `cancelled-invoices-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Cancelled invoices exported successfully')
    } catch (error) {
      toast.error('Failed to export cancelled invoices')
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

  const formatDateTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM'
    const displayHours = date.getHours() % 12 || 12
    return `${day}-${month}-${year} ${displayHours}:${minutes} ${ampm}`
  }

  const getBillTypeLabel = (type) => {
    switch (type) {
      case 'pro-forma':
        return 'Pro Forma'
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

  if (isLoading && hasSearched) {
    return <LoadingPage />
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm">
        <Link to="/dashboard" className="text-gray-600 hover:text-orange-600">Home</Link>
        <span className="text-gray-400 mx-2">/</span>
        <Link to="/reports" className="text-gray-600 hover:text-orange-600">Reports</Link>
        <span className="text-gray-400 mx-2">/</span>
        <Link to="/reports" className="text-gray-600 hover:text-orange-600">Finance</Link>
        <span className="text-gray-400 mx-2">/</span>
        <span className="text-orange-600 font-medium">Cancelled Invoices</span>
      </nav>

      {/* Page Title */}
      <h1 className="text-3xl font-bold text-gray-900 text-center">Cancelled Service Sales</h1>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by Name/ Member ID/ Mobile Number/ Bill numb"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Go
            </button>
          </div>

          {/* Filter Row 1 */}
          <div className="flex items-center gap-4">
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Service Sales</option>
              <option value="service">Service</option>
              <option value="package">Package</option>
              <option value="deal">Deal</option>
            </select>

            <select
              value={filters.billType}
              onChange={(e) => handleFilterChange('billType', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All</option>
              <option value="new-booking">New Booking</option>
              <option value="rebooking">Rebooking</option>
            </select>

            <select
              value={filters.branchId}
              onChange={(e) => handleFilterChange('branchId', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Branches</option>
              {branches.map(branch => (
                <option key={branch._id} value={branch._id}>{branch.name}</option>
              ))}
            </select>

            <select
              value={filters.salesRepId}
              onChange={(e) => handleFilterChange('salesRepId', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select Sales Rep</option>
              {staff.map(s => (
                <option key={s._id} value={s._id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Row 2 */}
          <div className="flex items-center gap-4">
            <select
              value={filters.ptId}
              onChange={(e) => handleFilterChange('ptId', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select PT</option>
              {staff.map(s => (
                <option key={s._id} value={s._id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>

            <select
              value={filters.generalTrainerId}
              onChange={(e) => handleFilterChange('generalTrainerId', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select General</option>
              {staff.map(s => (
                <option key={s._id} value={s._id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>

            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Go
            </button>

            <button
              onClick={handleExportExcel}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="ml-auto px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-center gap-8">
          <div>
            <span className="text-gray-600">Service Non-PT Sales: </span>
            <span className="text-orange-600 font-semibold">{formatCurrency(summary.serviceNonPTSales)}</span>
          </div>
          <div>
            <span className="text-gray-600">Service PT Sales: </span>
            <span className="text-orange-600 font-semibold">{formatCurrency(summary.servicePTSales)}</span>
          </div>
          <div>
            <span className="text-gray-600">Product Sales: </span>
            <span className="text-orange-600 font-semibold">{formatCurrency(summary.productSales)}</span>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {!hasSearched ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">Enter search criteria and click "Go" to view cancelled invoices</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">No cancelled invoices found for the selected filters</p>
          </div>
        ) : (
          <>
            {/* Pagination Controls */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  title="First Page"
                >
                  K&lt;
                </button>
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
                <button
                  onClick={() => setPage(pagination.pages)}
                  disabled={page >= pagination.pages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  title="Last Page"
                >
                  &gt;K
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">S.No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Purchase Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Bill Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Branch Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Member ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Member Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Contact Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">GST No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Pro Forma Invoice No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Yoactiv Ref No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Sequence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Cancelled Paid Invoice</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Description Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">End Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">PT Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Sales Rep Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">General Trainer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Created By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Tax Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Final Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">TDS Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Pending</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Pay Mode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Pro Forma Invoice Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Cancelled By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Delete</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice, invoiceIndex) => 
                    (invoice.items || []).map((item, itemIndex) => (
                      <tr key={`${invoice._id}-${itemIndex}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(page - 1) * 20 + invoiceIndex + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(invoice.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getBillTypeLabel(invoice.type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.branchId?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.memberId?.memberId || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => navigate(`/members/${invoice.memberId?._id}`)}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {invoice.memberId ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim() : '-'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.memberId?.phone || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.sacCode || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {invoice.isProForma ? (
                            <span className="text-red-600">{invoice.invoiceNumber || '-'}</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          -
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          Branch Sequence
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.status === 'cancelled' ? 'Yes' : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.startDate ? formatDate(item.startDate) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.expiryDate ? formatDate(item.expiryDate) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          -
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.createdBy ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim() || '-' : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          -
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.createdBy ? `${invoice.createdBy.firstName || ''} ${invoice.createdBy.lastName || ''}`.trim() || '-' : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹ {formatCurrency(invoice.total || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(invoice.tax?.amount || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹ {formatCurrency(invoice.total || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          ₹ {formatCurrency(invoice.paidAmount || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹ 0.00
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹ {formatCurrency(invoice.pendingAmount || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.paymentMethod === 'razorpay' ? 'Online Payment' :
                           invoice.paymentMethod === 'cash' ? 'Cash' :
                           invoice.paymentMethod === 'card' ? 'Card' :
                           invoice.paymentMethod === 'upi' ? 'UPI' :
                           invoice.paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
                           invoice.paymentMethod || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/invoices/${invoice._id}`)}
                              className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => window.print()}
                              className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                              title="Print"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.cancelledBy ? (
                            <span>
                              {invoice.cancelledBy.firstName} {invoice.cancelledBy.lastName} ({formatDateTime(invoice.cancelledAt)})
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.cancellationReason || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            className="p-1 text-red-600 hover:text-red-800 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

