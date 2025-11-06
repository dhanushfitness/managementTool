import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Calendar, Eye } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getBirthdayReport, exportBirthdayReport } from '../api/reports'
import toast from 'react-hot-toast'

export default function BirthdayReport() {
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

  const [filters, setFilters] = useState({
    fromDate: getDefaultFromDate(),
    toDate: getDefaultToDate(),
    birthdayMonth: 'all'
  })
  const [page, setPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)
  const [viewModal, setViewModal] = useState({ open: false, serviceCards: [] })

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['birthday-report', filters, page],
    queryFn: () => getBirthdayReport({
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      birthdayMonth: filters.birthdayMonth !== 'all' ? filters.birthdayMonth : undefined,
      page,
      limit: 20
    }),
    enabled: hasSearched
  })

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

  const handleViewServiceCard = (serviceCards) => {
    setViewModal({ open: true, serviceCards })
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
          <span className="text-orange-600 font-medium">Birthday Report</span>
        </nav>
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Birthday Report</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => handleFilterChange('fromDate', e.target.value)}
              className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => handleFilterChange('toDate', e.target.value)}
              className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Birthday</label>
            <select
              value={filters.birthdayMonth}
              onChange={(e) => handleFilterChange('birthdayMonth', e.target.value)}
              className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              {monthOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
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
                  <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Mobile No</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Mail</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Service Card</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Birthday</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                      No Results Found.
                    </td>
                  </tr>
                ) : (
                  records.map((record, index) => (
                    <tr key={record._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-4 py-2">{((pagination.page - 1) * 20) + index + 1}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="text-red-600">{record.name}</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">{record.mobile}</td>
                      <td className="border border-gray-300 px-4 py-2">{record.email}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        {record.serviceCards && record.serviceCards.length > 0 ? (
                          <button
                            onClick={() => handleViewServiceCard(record.serviceCards)}
                            className="text-red-600 hover:underline"
                          >
                            View
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">{record.birthday}</td>
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

      {/* Service Card Modal */}
      {viewModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Service Cards</h3>
              <button
                onClick={() => setViewModal({ open: false, serviceCards: [] })}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {viewModal.serviceCards.length === 0 ? (
                <p className="text-gray-500">No service cards available</p>
              ) : (
                viewModal.serviceCards.map((card, index) => (
                  <div key={index} className="border border-gray-300 p-3 rounded">
                    <p className="font-medium">{card.serviceName}</p>
                    <p className="text-sm text-gray-600">Expiry: {new Date(card.expiryDate).toLocaleDateString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

