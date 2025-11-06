import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Download, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getRevenueRealizationBaseValueReport, exportRevenueRealizationBaseValueReport } from '../api/reports'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function RevenueRealizationBaseValueReport() {
  // Get default date range (last 3 months)
  const getDefaultFromDate = () => {
    const date = new Date()
    date.setMonth(date.getMonth() - 3)
    return date.toISOString().split('T')[0]
  }

  const getDefaultToDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  const [filters, setFilters] = useState({
    fromDate: getDefaultFromDate(),
    toDate: getDefaultToDate(),
    billNumber: '',
    salesRepId: 'all',
    ptId: 'all',
    serviceId: 'all'
  })
  const [page, setPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)

  // Fetch staff for dropdowns
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff').then(res => res.data).catch(() => ({ staff: [] }))
  })

  // Fetch services/plans for dropdown
  const { data: plansData } = useQuery({
    queryKey: ['plans-list'],
    queryFn: () => api.get('/plans').then(res => res.data).catch(() => ({ plans: [] }))
  })

  // Fetch Revenue Realization (Base Value) report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['revenue-realization-base-value-report', filters, page],
    queryFn: () => getRevenueRealizationBaseValueReport({
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      billNumber: filters.billNumber || undefined,
      salesRepId: filters.salesRepId !== 'all' ? filters.salesRepId : undefined,
      ptId: filters.ptId !== 'all' ? filters.ptId : undefined,
      serviceId: filters.serviceId !== 'all' ? filters.serviceId : undefined,
      page,
      limit: 20
    }),
    enabled: hasSearched
  })

  const records = reportData?.data?.records || []
  const months = reportData?.data?.months || []
  const pagination = reportData?.data?.pagination || { page: 1, pages: 1, total: 0 }

  const staff = staffData?.staff || []
  const plans = plansData?.plans || []

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
      const response = await exportRevenueRealizationBaseValueReport({
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        billNumber: filters.billNumber || undefined,
        salesRepId: filters.salesRepId !== 'all' ? filters.salesRepId : undefined,
        ptId: filters.ptId !== 'all' ? filters.ptId : undefined,
        serviceId: filters.serviceId !== 'all' ? filters.serviceId : undefined
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `revenue-realization-base-value-report-${new Date().toISOString().split('T')[0]}.csv`
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

  const getMonthLabel = (monthKey) => {
    if (!monthKey) return ''
    const [year, month] = monthKey.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6 max-w-full w-full overflow-x-hidden" style={{ boxSizing: 'border-box' }}>
      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <nav className="text-sm">
          <span className="text-gray-600">Home</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">Reports</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">Finance</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-orange-600 font-medium">Revenue Realization (Base value)</span>
        </nav>
      </div>

      {/* Page Title */}
      <div className="text-center w-full max-w-full overflow-hidden">
        <h1 className="text-3xl font-bold text-gray-900">Revenue Realization (Base value)</h1>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <div className="flex flex-wrap items-end gap-4">
          {/* From Date */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
            <div className="relative">
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 min-w-[150px]"
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* To Date */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
            <div className="relative">
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 min-w-[150px]"
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Bill Number */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Bill Number</label>
            <input
              type="text"
              value={filters.billNumber}
              onChange={(e) => handleFilterChange('billNumber', e.target.value)}
              placeholder="Bill Number"
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 min-w-[150px]"
            />
          </div>

          {/* Sales Rep Dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">All Sales Rep</label>
            <select
              value={filters.salesRepId}
              onChange={(e) => handleFilterChange('salesRepId', e.target.value)}
              className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer min-w-[180px]"
            >
              <option value="all">All Sales Rep</option>
              {staff.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none top-8" />
          </div>

          {/* Personal Trainer Dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">All Personal Trainer</label>
            <select
              value={filters.ptId}
              onChange={(e) => handleFilterChange('ptId', e.target.value)}
              className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer min-w-[180px]"
            >
              <option value="all">All Personal Trainer</option>
              {staff.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none top-8" />
          </div>

          {/* Service Dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">All Service</label>
            <select
              value={filters.serviceId}
              onChange={(e) => handleFilterChange('serviceId', e.target.value)}
              className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer min-w-[180px]"
            >
              <option value="all">All Service</option>
              {plans.map((plan) => (
                <option key={plan._id} value={plan._id}>
                  {plan.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none top-8" />
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
          <LoadingPage message="Loading Revenue Realization (Base Value) report..." fullScreen={false} />
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
              <table className="w-full border-collapse" style={{ minWidth: '1600px', width: '100%' }}>
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">S.No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Member ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Member Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Mobile</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Sequence</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Club ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Bill Number</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Service Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Start Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">End Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Sales Rep Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">PT Name</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Sale Amount</th>
                    {months.map(monthKey => (
                      <th key={monthKey} className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">
                        {getMonthLabel(monthKey)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record, index) => (
                    <tr key={record._id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {(pagination.page - 1) * 20 + index + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {record.memberId || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {record.memberName || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {record.mobile || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {record.sequence || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {record.clubId || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {record.billNumber || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {record.serviceName || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {formatDate(record.startDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {formatDate(record.endDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {record.salesRepName || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                        {record.ptName || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-200">
                        {formatCurrency(record.saleAmount)}
                      </td>
                      {months.map(monthKey => {
                        const revenue = record.monthlyRevenue?.[monthKey]
                        return (
                          <td key={monthKey} className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right border border-gray-200">
                            {revenue ? formatCurrency(revenue.amount) : '0.00'}
                          </td>
                        )
                      })}
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

