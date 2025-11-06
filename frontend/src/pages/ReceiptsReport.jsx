import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Download, ChevronDown } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getReceipts, exportReceipts } from '../api/payments'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function ReceiptsReport() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({
    dateRange: 'last-30-days',
    invoiceType: 'all',
    salesRepId: ''
  })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)

  // Fetch staff for sales rep
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff').then(res => res.data).catch(() => ({ staff: [] }))
  })

  // Fetch receipts
  const { data: receiptsData, isLoading, refetch } = useQuery({
    queryKey: ['receipts', filters, search, page],
    queryFn: () => getReceipts({ 
      ...filters,
      search: search || undefined,
      page,
      limit: 20
    }).then(res => res.data),
    enabled: hasSearched
  })

  const receipts = receiptsData?.data?.receipts || []
  const pagination = receiptsData?.data?.pagination || { page: 1, pages: 1, total: 0 }

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
      const response = await exportReceipts({ ...filters, search: search || undefined })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `receipts-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Receipts exported successfully')
    } catch (error) {
      toast.error('Failed to export receipts')
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

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'razorpay':
        return 'Online Payment'
      case 'cash':
        return 'Cash'
      case 'card':
        return 'Card'
      case 'upi':
        return 'UPI'
      case 'bank_transfer':
        return 'Bank Transfer'
      default:
        return method || 'Other'
    }
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
        <span className="text-orange-600 font-medium">Service Receipts</span>
      </nav>

      {/* Page Title */}
      <h1 className="text-3xl font-bold text-gray-900 text-center">Service Receipts</h1>

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

          {/* Filter Row */}
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
                value={filters.invoiceType}
                onChange={(e) => handleFilterChange('invoiceType', e.target.value)}
                className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 cursor-pointer"
              >
                <option value="all">Service Receipts</option>
                <option value="service">Service</option>
                <option value="package">Package</option>
                <option value="deal">Deal</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={filters.salesRepId}
                onChange={(e) => handleFilterChange('salesRepId', e.target.value)}
                className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 cursor-pointer min-w-[180px]"
              >
                <option value="">All</option>
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
              disabled={!hasSearched || receipts.length === 0}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12">
            <LoadingPage message="Loading receipts..." fullScreen={false} />
          </div>
        ) : !hasSearched ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">Enter search criteria and click "Go" to view receipts</p>
          </div>
        ) : receipts.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">No receipts found for the selected filters</p>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">S.No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Sequence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Receipt No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Pro Forma Invoice No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Invoice No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Member ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Member Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Sales Rep Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">PT Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Created By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Paid Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Pay Mode</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {receipts.flatMap((receipt, receiptIndex) => 
                    (receipt.invoice?.items || []).map((item, itemIndex) => (
                      <tr key={`${receipt._id}-${itemIndex}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(page - 1) * 20 + receiptIndex + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          Branch Sequence
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {receipt.receiptNumber || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {receipt.invoice?.isProForma ? (
                            <span className="text-red-600">{receipt.invoice.invoiceNumber || '-'}</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {receipt.invoice?.invoiceNumber ? (
                            <span className="text-red-600">{receipt.invoice.invoiceNumber}</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {receipt.memberId?.memberId || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => navigate(`/members/${receipt.memberId?._id}`)}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {receipt.memberId ? `${receipt.memberId.firstName || ''} ${receipt.memberId.lastName || ''}`.trim() : '-'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(receipt.paidAt || receipt.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {receipt.createdBy ? `${receipt.createdBy.firstName || ''} ${receipt.createdBy.lastName || ''}`.trim() || '-' : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          -
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {receipt.invoice?.createdBy ? `${receipt.invoice.createdBy.firstName || ''} ${receipt.invoice.createdBy.lastName || ''}`.trim() || '-' : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          ₹{formatCurrency(receipt.amount || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getPaymentMethodLabel(receipt.paymentMethod)}
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
    </div>
  )
}

