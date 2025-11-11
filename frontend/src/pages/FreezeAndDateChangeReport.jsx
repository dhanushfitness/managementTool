import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Calendar } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getFreezeAndDateChangeReport, exportFreezeAndDateChangeReport } from '../api/reports'
import toast from 'react-hot-toast'
import DateInput from '../components/DateInput'
import Breadcrumbs from '../components/Breadcrumbs'

export default function FreezeAndDateChangeReport() {
  const getDefaultFromDate = () => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().split('T')[0]
  }

  const getDefaultToDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  const [filters, setFilters] = useState({
    fromDate: getDefaultFromDate(),
    toDate: getDefaultToDate(),
    search: ''
  })
  const [page, setPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['freeze-and-date-change-report', filters, page],
    queryFn: () => getFreezeAndDateChangeReport({
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      search: filters.search || undefined,
      page,
      limit: 20
    }),
    enabled: hasSearched
  })

  const records = reportData?.data?.records || []
  const pagination = reportData?.data?.pagination || { page: 1, pages: 1, total: 0 }

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
      const response = await exportFreezeAndDateChangeReport({
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        search: filters.search || undefined
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `freeze-and-date-change-report-${new Date().toISOString().split('T')[0]}.csv`
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

  if (isLoading) return <LoadingPage />

  return (
    <div className="space-y-6 max-w-full w-full overflow-x-hidden">
      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <Breadcrumbs />
      </div>

      {/* Page Title */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Freeze & Date Change</h1>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
            <DateInput
              value={filters.fromDate}
              onChange={(e) => handleFilterChange('fromDate', e.target.value)}
              containerClassName="w-40"
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
            <DateInput
              value={filters.toDate}
              onChange={(e) => handleFilterChange('toDate', e.target.value)}
              containerClassName="w-40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Member Name/Mobile</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search by name or mobile"
              className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
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

      {/* Data Table */}
      {hasSearched && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Pagination Controls */}
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * 20) + 1} to {Math.min(pagination.page * 20, pagination.total)} of {pagination.total} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                {'<<'}
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                {'<'}
              </button>
              <span className="px-4 py-1 text-sm font-medium">
                Page {pagination.page} Of {pagination.pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                {'>'}
              </button>
              <button
                onClick={() => setPage(pagination.pages)}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
                  <th className="border border-gray-300 px-4 py-2 text-left">Member Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Mobile</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Service Variation</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Freezed Duration</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Change Date Duration</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Staff Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Reason</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                      No Results Found.
                    </td>
                  </tr>
                ) : (
                  records.map((record, index) => (
                    <tr key={record._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-4 py-2">{((pagination.page - 1) * 20) + index + 1}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="text-red-600">{record.memberName}</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">{record.mobile}</td>
                      <td className="border border-gray-300 px-4 py-2">{record.serviceVariation}</td>
                      <td className="border border-gray-300 px-4 py-2">{record.freezedDuration}</td>
                      <td className="border border-gray-300 px-4 py-2">{record.changeDateDuration}</td>
                      <td className="border border-gray-300 px-4 py-2">{record.staffName}</td>
                      <td className="border border-gray-300 px-4 py-2">{record.reason}</td>
                      <td className="border border-gray-300 px-4 py-2">{record.dateTime}</td>
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

