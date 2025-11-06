import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, ChevronDown } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getProfileChangeReport, exportProfileChangeReport } from '../api/reports'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function ProfileChangeReport() {
  const [filters, setFilters] = useState({
    dateRange: 'last-30-days',
    staffId: 'all'
  })
  const [page, setPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)

  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff').then(res => res.data).catch(() => ({ staff: [] }))
  })

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['profile-change-report', filters, page],
    queryFn: () => getProfileChangeReport({
      dateRange: filters.dateRange,
      staffId: filters.staffId !== 'all' ? filters.staffId : undefined,
      page,
      limit: 20
    }),
    enabled: hasSearched
  })

  const records = reportData?.data?.records || []
  const pagination = reportData?.data?.pagination || { page: 1, pages: 1, total: 0 }
  const staff = staffData?.staff || []

  const dateRangeOptions = [
    { value: 'last-30-days', label: 'Last 30 days' },
    { value: 'last-60-days', label: 'Last 60 days' },
    { value: 'last-90-days', label: 'Last 90 days' }
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
      const response = await exportProfileChangeReport({
        dateRange: filters.dateRange,
        staffId: filters.staffId !== 'all' ? filters.staffId : undefined
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `profile-change-report-${new Date().toISOString().split('T')[0]}.csv`
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

  if (isLoading) return <LoadingPage />

  return (
    <div className="space-y-6 max-w-full w-full overflow-x-hidden">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <nav className="text-sm">
          <span className="text-gray-600">Home</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">Reports</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">Client Management</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-orange-600 font-medium">Profile Change Report</span>
        </nav>
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Profile Change Report</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              {dateRangeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Staff</label>
            <select
              value={filters.staffId}
              onChange={(e) => handleFilterChange('staffId', e.target.value)}
              className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Staff</option>
              {staff.map(s => (
                <option key={s._id} value={s._id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Go
          </button>
          <button
            onClick={handleExportExcel}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {hasSearched && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * 20) + 1} to {Math.min(pagination.page * 20, pagination.total)} of {pagination.total} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
              >
                {'<<'}
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
              >
                {'<'}
              </button>
              <span className="px-4 py-1 text-sm font-medium">
                Page {pagination.page} Of {pagination.pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
              >
                {'>'}
              </button>
              <button
                onClick={() => setPage(pagination.pages)}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
              >
                {'>>'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">S.No</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">DateTime</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Change Type</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">From Member ID</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">From (Name/Contact Number)</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Change To</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">To Member ID</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Staff</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                      No Results Found.
                    </td>
                  </tr>
                ) : (
                  records.map((record, index) => (
                    <tr key={record._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-4 py-2">{((pagination.page - 1) * 20) + index + 1}</td>
                      <td className="border border-gray-300 px-4 py-2">{record.dateTime}</td>
                      <td className="border border-gray-300 px-4 py-2">{record.changeType}</td>
                      <td className="border border-gray-300 px-4 py-2">{record.fromMemberId}</td>
                      <td className="border border-gray-300 px-4 py-2">{record.from}</td>
                      <td className="border border-gray-300 px-4 py-2">{record.changeTo}</td>
                      <td className="border border-gray-300 px-4 py-2">{record.toMemberId}</td>
                      <td className="border border-gray-300 px-4 py-2">{record.staff}</td>
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
          Please select filters and click "Go" to view the report
        </div>
      )}
    </div>
  )
}

