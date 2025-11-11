import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Download, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getDiscountReport, exportDiscountReport } from '../api/reports'
import api from '../api/axios'
import toast from 'react-hot-toast'
import Breadcrumbs from '../components/Breadcrumbs'

export default function DiscountReport() {
  const [filters, setFilters] = useState({
    dateRange: 'last-30-days',
    branchId: 'all',
    salesRepId: 'all',
    ptId: 'all',
    generalTrainerId: 'all'
  })
  const [page, setPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)

  // Fetch branches
  const { data: branchesData } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      try {
        const response = await api.get('/branches')
        return { branches: response.data.branches || [] }
      } catch {
        return { branches: [] }
      }
    }
  })

  // Fetch staff for dropdowns
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff').then(res => res.data).catch(() => ({ staff: [] }))
  })

  // Fetch Discount report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['discount-report', filters, page],
    queryFn: () => getDiscountReport({
      dateRange: filters.dateRange,
      branchId: filters.branchId !== 'all' ? filters.branchId : undefined,
      salesRepId: filters.salesRepId !== 'all' ? filters.salesRepId : undefined,
      ptId: filters.ptId !== 'all' ? filters.ptId : undefined,
      generalTrainerId: filters.generalTrainerId !== 'all' ? filters.generalTrainerId : undefined,
      page,
      limit: 20
    }),
    enabled: hasSearched
  })

  const records = reportData?.data?.records || []
  const pagination = reportData?.data?.pagination || { page: 1, pages: 1, total: 0 }

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
      const response = await exportDiscountReport({
        dateRange: filters.dateRange,
        branchId: filters.branchId !== 'all' ? filters.branchId : undefined,
        salesRepId: filters.salesRepId !== 'all' ? filters.salesRepId : undefined,
        ptId: filters.ptId !== 'all' ? filters.ptId : undefined,
        generalTrainerId: filters.generalTrainerId !== 'all' ? filters.generalTrainerId : undefined
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `discount-report-${new Date().toISOString().split('T')[0]}.csv`
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  const formatCurrency = (value) => {
    return (value || 0).toFixed(2)
  }

  return (
    <div className="space-y-6 max-w-full w-full overflow-x-hidden" style={{ boxSizing: 'border-box' }}>
      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <Breadcrumbs />
      </div>

      {/* Page Title */}
      <div className="text-center w-full max-w-full overflow-hidden">
        <h1 className="text-3xl font-bold text-gray-900">Discount Report</h1>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <div className="flex flex-wrap items-end gap-4">
          {/* Date Range */}
          <div className="relative">
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer min-w-[150px]"
            >
              <option value="last-7-days">Last 7 days</option>
              <option value="last-30-days">Last 30 days</option>
              <option value="last-90-days">Last 90 days</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Branch */}
          <div className="relative">
            <select
              value={filters.branchId}
              onChange={(e) => handleFilterChange('branchId', e.target.value)}
              className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer min-w-[150px]"
            >
              <option value="all">All</option>
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Branch 2 */}
          <div className="relative">
            <select
              value={filters.branchId}
              onChange={(e) => handleFilterChange('branchId', e.target.value)}
              className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer min-w-[150px]"
            >
              <option value="all">All</option>
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Sales Rep */}
          <div className="relative">
            <select
              value={filters.salesRepId}
              onChange={(e) => handleFilterChange('salesRepId', e.target.value)}
              className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer min-w-[150px]"
            >
              <option value="all">Select Sales Rep</option>
              {staff.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* PT */}
          <div className="relative">
            <select
              value={filters.ptId}
              onChange={(e) => handleFilterChange('ptId', e.target.value)}
              className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer min-w-[150px]"
            >
              <option value="all">Select PT</option>
              {staff.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* General Trainer */}
          <div className="relative">
            <select
              value={filters.generalTrainerId}
              onChange={(e) => handleFilterChange('generalTrainerId', e.target.value)}
              className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer min-w-[150px]"
            >
              <option value="all">Select General</option>
              {staff.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
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
              disabled={!hasSearched || records.length === 0}
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
          <LoadingPage message="Loading Discount report..." fullScreen={false} />
        ) : !hasSearched ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">Enter search criteria and click "Go" to view report</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No Results Found.</p>
          </div>
        ) : (
          <>
            {/* Pagination Controls */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-center mb-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-600"
                  title="First page"
                >
                  K
                </button>
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600 px-4">
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
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-600"
                  title="Last page"
                >
                  H
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto w-full" style={{ maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full border-collapse" style={{ minWidth: '2000px', width: '100%' }}>
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">S.No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Purchase Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Member ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Member Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Contact Number</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Sequence</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">GST No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Pro Forma Invoice No.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Sales Rep Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">GT</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Service Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Start Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">End Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Created By</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Discount Reason</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Discount</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record, index) => (
                    <tr key={record._id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {(pagination.page - 1) * 20 + index + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {formatDate(record.purchaseDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {record.memberId || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 border border-gray-200">
                        <Link to={`/members/${record.memberId}`} className="hover:underline">
                          {record.memberName || '-'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {record.contactNumber || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {record.sequence || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {record.gstNo || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-orange-600 border border-gray-200">
                        {record.proFormaInvoiceNo || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {record.salesRepName || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {record.gt || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {record.serviceDescription || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {formatDate(record.startDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {formatDate(record.endDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {record.createdBy || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {record.discountReason || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">
                        {formatCurrency(record.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">
                        {formatCurrency(record.discount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">
                        {formatCurrency(record.netAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

