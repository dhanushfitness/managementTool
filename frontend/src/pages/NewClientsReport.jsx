import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Calendar, ChevronDown } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getNewClientsReport, exportNewClientsReport } from '../api/reports'
import api from '../api/axios'
import toast from 'react-hot-toast'
import DateInput from '../components/DateInput'

export default function NewClientsReport() {
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
    serviceId: 'all',
    serviceVariationId: 'all',
    gender: 'all'
  })
  const [page, setPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(true)

  const { data: plansData } = useQuery({
    queryKey: ['plans-list'],
    queryFn: () => api.get('/plans').then(res => res.data).catch(() => ({ plans: [] }))
  })

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['new-clients-report', filters, page],
    queryFn: () => getNewClientsReport({
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      serviceId: filters.serviceId !== 'all' ? filters.serviceId : undefined,
      serviceVariationId: filters.serviceVariationId !== 'all' ? filters.serviceVariationId : undefined,
      gender: filters.gender !== 'all' ? filters.gender : undefined,
      page,
      limit: 20
    }),
    enabled: hasSearched
  })

  const records = reportData?.data?.records || []
  const pagination = reportData?.data?.pagination || { page: 1, pages: 1, total: 0 }
  const plans = plansData?.plans || []
  const totalNewClients = pagination.total || records.length

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
      const response = await exportNewClientsReport({
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        serviceId: filters.serviceId !== 'all' ? filters.serviceId : undefined,
        serviceVariationId: filters.serviceVariationId !== 'all' ? filters.serviceVariationId : undefined,
        gender: filters.gender !== 'all' ? filters.gender : undefined
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `new-clients-report-${new Date().toISOString().split('T')[0]}.csv`
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <nav className="text-sm">
          <span className="text-gray-600">Home</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">Reports</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">Client Management</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-orange-600 font-medium">New Clients</span>
        </nav>
      </div>

      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold text-gray-900">New Clients</h1>
        <div className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-3 shadow-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Total clients in range</p>
            <p className="text-3xl font-semibold text-orange-600">{totalNewClients}</p>
          </div>
          <div className="h-10 w-px bg-gray-200" />
          <div className="text-left">
            <p className="text-xs text-gray-500">Filters applied</p>
            <p className="text-sm font-medium text-gray-800">
              {filters.serviceId !== 'all' ? 'Specific service' : 'All services'} · {filters.gender !== 'all' ? filters.gender : 'All genders'}
            </p>
          </div>
        </div>
      </div>

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
            <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
            <select
              value={filters.serviceId}
              onChange={(e) => handleFilterChange('serviceId', e.target.value)}
              className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All</option>
              {plans.map(plan => (
                <option key={plan._id} value={plan._id}>{plan.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Gender</label>
            <select
              value={filters.gender}
              onChange={(e) => handleFilterChange('gender', e.target.value)}
              className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
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
                  <th className="border border-gray-300 px-4 py-2 text-left">Member ID</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Member Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Mobile</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Service</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Join Date</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Lead Source</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Sales Rep</th>
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
                      <td className="border border-gray-300 px-4 py-2">{record.memberId}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="text-red-600">{record.memberName}</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">{record.mobile}</td>
                      <td className="border border-gray-300 px-4 py-2">{record.email}</td>
                      <td className="border border-gray-300 px-4 py-2">{record.serviceName}</td>
                      <td className="border border-gray-300 px-4 py-2">{formatDate(record.joinDate)}</td>
                      <td className="border border-gray-300 px-4 py-2">{record.leadSource}</td>
                      <td className="border border-gray-300 px-4 py-2">{record.salesRepName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!hasSearched && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          Please select date range and click "Go" to view the report
        </div>
      )}
    </div>
  )
}

