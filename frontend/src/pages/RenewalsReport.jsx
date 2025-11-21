import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Download, 
  Calendar,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  User,
  TrendingUp,
  Filter,
  Sparkles
} from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getRenewalsReport, exportRenewalsReport } from '../api/reports'
import toast from 'react-hot-toast'
import DateInput from '../components/DateInput'

export default function RenewalsReport() {
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
    toDate: getDefaultToDate()
  })
  const [page, setPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['renewals-report', filters, page],
    queryFn: () => getRenewalsReport({
      fromDate: filters.fromDate,
      toDate: filters.toDate,
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
      const response = await exportRenewalsReport({
        fromDate: filters.fromDate,
        toDate: filters.toDate
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `renewals-report-${new Date().toISOString().split('T')[0]}.csv`
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/dashboard" className="text-gray-500 hover:text-orange-600 transition-colors">Home</Link>
            <span className="text-gray-300">/</span>
            <Link to="/reports" className="text-gray-500 hover:text-orange-600 transition-colors">Reports</Link>
            <span className="text-gray-300">/</span>
            <span className="text-orange-600 font-semibold">Renewals</span>
          </nav>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Renewals Report</h1>
            <p className="text-gray-600 mt-1">Track membership renewals and retention</p>
          </div>
        </div>

        <button
          onClick={handleExportExcel}
          className="group inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all font-semibold shadow-lg hover:shadow-xl"
        >
          <Download className="h-4 w-4 group-hover:animate-bounce" />
          Export CSV
        </button>
      </div>

      {/* Summary Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-gray-200 p-8 shadow-sm hover:shadow-lg transition-all">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/40 rounded-full blur-3xl"></div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg">
              <RefreshCcw className="h-10 w-10 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">Total Renewals</p>
              <p className="text-5xl font-black text-green-600">{pagination.total || 0}</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Date Range</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatDate(filters.fromDate)} - {formatDate(filters.toDate)}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg shadow-lg">
              <Filter className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">Filter Options</span>
          </div>
        </div>

        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">From Date</label>
              <DateInput
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                containerClassName="w-full"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">To Date</label>
              <DateInput
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                containerClassName="w-full"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSearch}
                className="group w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all font-semibold shadow-lg hover:shadow-xl"
              >
                <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {hasSearched && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden">
          {/* Pagination Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="text-sm font-semibold text-gray-700">
              Showing <span className="text-green-600">{((pagination.page - 1) * 20) + 1}</span> to <span className="text-green-600">{Math.min(pagination.page * 20, pagination.total)}</span> of <span className="text-green-600">{pagination.total}</span> renewals
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={pagination.page === 1}
                className="inline-flex h-9 px-3 items-center justify-center rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold"
              >
                First
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page === 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-4 py-2 text-sm font-bold text-gray-900">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={pagination.page === pagination.pages}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(pagination.pages)}
                disabled={pagination.page === pagination.pages}
                className="inline-flex h-9 px-3 items-center justify-center rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold"
              >
                Last
              </button>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">#</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Member ID</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Member Name</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Mobile</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Service</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Previous Expiry</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Renewal Date</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">New Expiry</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Sales Rep</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl shadow-lg">
                          <RefreshCcw className="h-10 w-10 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">No Renewals Found</h3>
                          <p className="text-sm text-gray-600 mt-1">No renewals match the selected date range.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((record, index) => (
                    <tr key={record._id} className="hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold">
                          {((pagination.page - 1) * 20) + index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600 font-semibold">{record.memberId}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-bold text-green-600">{record.memberName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span className="font-mono">{record.mobile}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">
                          {record.serviceName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-medium">{formatDate(record.previousExpiry)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3 h-3 text-green-600" />
                          <span className="text-sm font-bold text-green-600">{formatDate(record.renewalDate)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{formatDate(record.newExpiry)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium">{record.salesRepName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!hasSearched && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-16 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg">
              <Calendar className="h-10 w-10 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Select Date Range</h3>
              <p className="text-sm text-gray-600 mt-1">Please select a date range and click "Apply Filters" to view the report.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
