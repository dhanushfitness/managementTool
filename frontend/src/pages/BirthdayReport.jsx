import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { Download } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getBirthdayReport, exportBirthdayReport } from '../api/reports'
import toast from 'react-hot-toast'
import DateInput from '../components/DateInput'
import Breadcrumbs from '../components/Breadcrumbs'

export default function BirthdayReport() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const getDefaultFromDate = () => {
    const date = new Date()
    date.setMonth(0)
    date.setDate(1)
    return date.toISOString().split('T')[0]
  }

  const getDefaultToDate = () => {
    const date = new Date()
    date.setMonth(11)
    date.setDate(31)
    return date.toISOString().split('T')[0]
  }

  // Get date from URL params if present (for navigation from dashboard)
  const searchParams = new URLSearchParams(location.search)
  const urlFromDate = searchParams.get('fromDate')
  const urlToDate = searchParams.get('toDate')
  
  const getInitialFromDate = () => {
    if (urlFromDate) return urlFromDate
    return getDefaultFromDate()
  }
  
  const getInitialToDate = () => {
    if (urlToDate) return urlToDate
    return getDefaultToDate()
  }

  const [filters, setFilters] = useState({
    fromDate: getInitialFromDate(),
    toDate: getInitialToDate(),
    birthdayMonth: 'all'
  })
  const [page, setPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)
  
  // Update filters when URL params change
  useEffect(() => {
    if (urlFromDate || urlToDate) {
      setFilters(prev => ({
        ...prev,
        fromDate: urlFromDate || prev.fromDate,
        toDate: urlToDate || prev.toDate
      }))
      setHasSearched(true)
    }
  }, [urlFromDate, urlToDate])

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['birthday-report', filters, page],
    queryFn: () => getBirthdayReport({
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      birthdayMonth: filters.birthdayMonth !== 'all' ? filters.birthdayMonth : undefined,
      page,
      limit: 20
    }).then(res => res.data),
    enabled: hasSearched
  })

  // Auto-search on mount
  useEffect(() => {
    if (!hasSearched) {
      setHasSearched(true)
    }
  }, [])

  const records = reportData?.data?.records || []
  const pagination = reportData?.data?.pagination || { page: 1, pages: 1, total: 0 }

  const monthOptions = [
    { value: 'all', label: 'Birthday' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ]

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
      const response = await exportBirthdayReport({
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        birthdayMonth: filters.birthdayMonth !== 'all' ? filters.birthdayMonth : undefined
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `birthday-report-${new Date().toISOString().split('T')[0]}.csv`
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

  const handleViewServiceCard = (memberId) => {
    navigate(`/clients/${memberId}?tab=service-card`)
  }

  if (isLoading) return <LoadingPage />

  return (
    <div className="space-y-6 max-w-full w-full overflow-x-hidden">
      {/* Breadcrumbs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <Breadcrumbs />
      </div>

      {/* Page Title */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Birthday Report</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
            <DateInput
              value={filters.fromDate}
              onChange={(e) => handleFilterChange('fromDate', e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
            <DateInput
              value={filters.toDate}
              onChange={(e) => handleFilterChange('toDate', e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Birthday</label>
            <select
              value={filters.birthdayMonth}
              onChange={(e) => handleFilterChange('birthdayMonth', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
            >
              {monthOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Go
          </button>
          <button
            onClick={handleExportExcel}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Results Table */}
      {hasSearched && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Pagination Header */}
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-600">
              Page {pagination.page} Of {pagination.pages}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={pagination.page === 1 || pagination.pages === 0}
                className="w-8 h-8 p-0 flex items-center justify-center border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700 font-medium text-sm leading-none box-border"
                style={{ minWidth: '32px', maxWidth: '32px' }}
                title="First page"
              >
                {'<<'}
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page === 1 || pagination.pages === 0}
                className="w-8 h-8 p-0 flex items-center justify-center border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700 font-medium text-sm leading-none box-border"
                style={{ minWidth: '32px', maxWidth: '32px' }}
                title="Previous page"
              >
                {'<'}
              </button>
              <span className="px-4 py-1 text-sm font-medium text-gray-700 whitespace-nowrap">
                Page {pagination.page} Of {pagination.pages || 1}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={pagination.page === pagination.pages || pagination.pages === 0}
                className="w-8 h-8 p-0 flex items-center justify-center border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700 font-medium text-sm leading-none box-border"
                style={{ minWidth: '32px', maxWidth: '32px' }}
                title="Next page"
              >
                {'>'}
              </button>
              <button
                onClick={() => setPage(pagination.pages)}
                disabled={pagination.page === pagination.pages || pagination.pages === 0}
                className="w-8 h-8 p-0 flex items-center justify-center border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700 font-medium text-sm leading-none box-border"
                style={{ minWidth: '32px', maxWidth: '32px' }}
                title="Last page"
              >
                {'>>'}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">S.No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mobile No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mail</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Service Card</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Birthday</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      No Results Found.
                    </td>
                  </tr>
                ) : (
                  records.map((record, index) => (
                    <tr 
                      key={record._id} 
                      className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-700">{((pagination.page - 1) * 20) + index + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{record.mobile}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{record.email}</td>
                      <td className="px-4 py-3 text-sm">
                        {record.serviceCards && record.serviceCards.length > 0 ? (
                          <button
                            onClick={() => handleViewServiceCard(record._id)}
                            className="text-red-600 hover:text-red-700 hover:underline font-medium transition-colors"
                          >
                            View
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{record.birthday}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!hasSearched && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          Please select date range and click "Go" to view the report
        </div>
      )}
    </div>
  )
}
