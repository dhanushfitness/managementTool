import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Download, ChevronDown, Plus } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getInvoices, exportInvoices } from '../api/invoices'
import { getBranches } from '../api/organization'
import api from '../api/axios'
import toast from 'react-hot-toast'
import Breadcrumbs from '../components/Breadcrumbs'
import AddInvoiceModal from '../components/AddInvoiceModal'

export default function AllInvoicesReport() {
  const navigate = useNavigate()
  const [showAddModal, setShowAddModal] = useState(false)
  const [filters, setFilters] = useState({
    dateRange: 'last-30-days',
    billType: 'all',
    invoiceType: 'all',
    status: 'all',
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

  // Fetch invoices
  const { data: invoicesData, isLoading, refetch } = useQuery({
    queryKey: ['invoices', filters, search, page],
    queryFn: () => getInvoices({ 
      ...filters,
      search: search || undefined,
      page,
      limit: 20
    }).then(res => res.data),
    enabled: hasSearched
  })

  const invoices = invoicesData?.data?.invoices || []
  const summary = invoicesData?.data?.summary || { serviceNonPTSales: 0, servicePTSales: 0, productSales: 0 }
  const pagination = invoicesData?.data?.pagination || { page: 1, pages: 1, total: 0 }

  const branches = branchesData?.branches || []
  const staff = staffData?.staff || []

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleSearch = () => {
    setPage(1)
    setHasSearched(true)
  }

  const handleExportExcel = async () => {
    try {
      const response = await exportInvoices({ ...filters, search: search || undefined })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Invoices exported successfully')
    } catch (error) {
      toast.error('Failed to export invoices')
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

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumbs />

      {/* Page Title */}
      <h1 className="text-3xl font-bold text-gray-900 text-center">All Invoices</h1>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by Name/ Member ID/ Mobile Number/ Bill number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm"
            >
              Go
            </button>
          </div>

          {/* Filter Rows */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column - Filters */}
            <div className="space-y-4">
              {/* Filter Row 1 */}
              <div className="flex flex-wrap items-center gap-4">
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

                <div className="relative">
                  <select
                    value={filters.billType}
                    onChange={(e) => handleFilterChange('billType', e.target.value)}
                    className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    <option value="all">All</option>
                    <option value="new-booking">New Booking</option>
                    <option value="rebooking">Rebooking</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={filters.invoiceType}
                    onChange={(e) => handleFilterChange('invoiceType', e.target.value)}
                    className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    <option value="all">All</option>
                    <option value="service">Service</option>
                    <option value="package">Package</option>
                    <option value="deal">Deal</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    <option value="all">All</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                    <option value="overdue">Overdue</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={filters.salesRepId}
                    onChange={(e) => handleFilterChange('salesRepId', e.target.value)}
                    className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 cursor-pointer min-w-[180px]"
                  >
                    <option value="">Select Sales Rep</option>
                    {staff.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.firstName} {s.lastName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Filter Row 2 */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative">
                  <select
                    value={filters.ptId}
                    onChange={(e) => handleFilterChange('ptId', e.target.value)}
                    className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 cursor-pointer min-w-[180px]"
                  >
                    <option value="">Select PT</option>
                    {staff.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.firstName} {s.lastName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={filters.generalTrainerId}
                    onChange={(e) => handleFilterChange('generalTrainerId', e.target.value)}
                    className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 cursor-pointer min-w-[180px]"
                  >
                    <option value="">Select General</option>
                    {staff.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.firstName} {s.lastName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                <button
                  onClick={handleSearch}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm"
                >
                  Go
                </button>

                <button
                  onClick={handleExportExcel}
                  disabled={!hasSearched || invoices.length === 0}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Excel</span>
                </button>
              </div>
            </div>

            {/* Right Column - Summary Statistics */}
            <div className="flex flex-col justify-center gap-4 pl-4 border-l border-gray-200">
              <div>
                <span className="text-sm text-gray-600">Service Non-PT Sales: </span>
                <span className="text-sm font-semibold text-orange-600">{formatCurrency(summary.serviceNonPTSales)}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Service PT Sales: </span>
                <span className="text-sm font-semibold text-orange-600">{formatCurrency(summary.servicePTSales)}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Product Sales: </span>
                <span className="text-sm font-semibold text-orange-600">{formatCurrency(summary.productSales)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Invoice Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium text-sm flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Invoice</span>
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12">
            <LoadingPage message="Loading invoices..." fullScreen={false} />
          </div>
        ) : !hasSearched ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">Enter search criteria and click "Go" to view invoices</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">No invoices found for the selected filters</p>
          </div>
        ) : (
          <>
            {/* Pagination Controls */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-center">
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Purchase Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Bill Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Branch Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Member ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Member Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Contact Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">GST No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Pro Forma Invoice No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Yoactiv Ref No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Sequence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Cancelled Paid Invoice</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Description Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">End Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">PT Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Sales Rep Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">General Trainer</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.flatMap((invoice, invoiceIndex) => 
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.invoiceNumber || '-'}
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add Invoice Modal */}
      {showAddModal && (
        <AddInvoiceModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false)
            refetch()
          }}
        />
      )}
    </div>
  )
}

