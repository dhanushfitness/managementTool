import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, ChevronDown } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getAverageLifetimeValueReport, exportAverageLifetimeValueReport } from '../api/reports'
import toast from 'react-hot-toast'

export default function AverageLifetimeValueReport() {
  const [filters, setFilters] = useState({
    status: 'all'
  })
  const [page, setPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['average-lifetime-value-report', filters, page],
    queryFn: () => getAverageLifetimeValueReport({
      status: filters.status !== 'all' ? filters.status : undefined,
      page,
      limit: 20
    }),
    enabled: hasSearched
  })

  const records = reportData?.data?.records || []
  const pagination = reportData?.data?.pagination || { page: 1, pages: 1, total: 0 }
  const summary = reportData?.data?.summary || {
    averageLifetimeValue: 0
  }

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
      const response = await exportAverageLifetimeValueReport({
        status: filters.status !== 'all' ? filters.status : undefined
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `average-lifetime-value-report-${new Date().toISOString().split('T')[0]}.csv`
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
          <span className="text-gray-600">Clients</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">Behaviour Based</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-orange-600 font-medium">Average lifetime value</span>
        </nav>
      </div>

      {/* Summary */}
      {hasSearched && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-left">
            <div className="text-2xl font-bold text-orange-600">
              Average lifetime value: ₹ {summary.averageLifetimeValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Average lifetime value</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Load Report
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
                  <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Mobile number</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">e-mail id</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Total services</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Total products</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Total events</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Total turfs</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Total LT value</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">No of purchases</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Average ticket size</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                      No Results Found.
                    </td>
                  </tr>
                ) : (
                  records.map((record, index) => (
                    <tr key={record._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-4 py-2">{((pagination.page - 1) * 20) + index + 1}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="text-orange-600">{record.name}</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">{record.mobile}</td>
                      <td className="border border-gray-300 px-4 py-2">{record.emailId}</td>
                      <td className="border border-gray-300 px-4 py-2">{record.status}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{record.totalServices}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{record.totalProducts}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{record.totalEvents}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{record.totalTurfs}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{record.totalLTValue}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{record.numberOfPurchases}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{record.averageTicketSize}</td>
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
          Please click "Load Report" to view the report
        </div>
      )}
    </div>
  )
}

