import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Download, 
  Calendar,
  Cake,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Eye,
  Gift,
  Filter,
  Sparkles,
  ChevronDown
} from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getBirthdayReport, exportBirthdayReport } from '../api/reports'
import toast from 'react-hot-toast'
import DateInput from '../components/DateInput'

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

  useEffect(() => {
    if (!hasSearched) {
      setHasSearched(true)
    }
  }, [])

  const records = reportData?.data?.records || []
  const pagination = reportData?.data?.pagination || { page: 1, pages: 1, total: 0 }

  const monthOptions = [
    { value: 'all', label: 'All Months' },
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-gray-500 hover:text-orange-600 transition-colors">Home</Link>
            <span className="text-gray-300">/</span>
            <Link to="/reports" className="text-gray-500 hover:text-orange-600 transition-colors">Reports</Link>
            <span className="text-gray-300">/</span>
            <span className="text-orange-600 font-semibold">Client Birthday</span>
          </nav>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Client Birthday Report</h1>
            <p className="text-gray-600 mt-1">Track and celebrate client birthdays</p>
          </div>
        </div>

        <button
          onClick={handleExportExcel}
          className="group inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:from-pink-600 hover:to-purple-600 transition-all font-semibold shadow-lg hover:shadow-xl"
        >
          <Download className="h-4 w-4 group-hover:animate-bounce" />
          Export CSV
        </button>
      </div>

      {/* Summary Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-gray-200 p-8 shadow-sm hover:shadow-lg transition-all">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/40 rounded-full blur-3xl"></div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl shadow-lg">
              <Cake className="h-10 w-10 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">Total Birthdays</p>
              <p className="text-5xl font-black text-pink-600">{pagination.total || 0}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Date Range</p>
              <p className="text-sm font-semibold text-gray-900">
                {filters.fromDate} to {filters.toDate}
              </p>
            </div>
            {filters.birthdayMonth !== 'all' && (
              <>
                <div className="h-16 w-px bg-gray-300"></div>
                <div className="text-center">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Selected Month</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {monthOptions.find(m => m.value === filters.birthdayMonth)?.label}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg shadow-lg">
              <Filter className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">Filter Options</span>
          </div>
        </div>

        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-4">
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

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Birthday Month</label>
              <div className="relative">
                <select
                  value={filters.birthdayMonth}
                  onChange={(e) => handleFilterChange('birthdayMonth', e.target.value)}
                  className="w-full appearance-none rounded-xl border-2 border-gray-200 px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 transition-all"
                >
                  {monthOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSearch}
                className="group w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:from-pink-600 hover:to-purple-600 transition-all font-semibold shadow-lg hover:shadow-xl"
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
              Showing <span className="text-pink-600">{records.length}</span> of <span className="text-pink-600">{pagination.total}</span> birthdays
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={pagination.page === 1 || pagination.pages === 0}
                className="inline-flex h-9 px-3 items-center justify-center rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold"
              >
                First
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page === 1 || pagination.pages === 0}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-4 py-2 text-sm font-bold text-gray-900">
                {pagination.page} / {pagination.pages || 1}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={pagination.page === pagination.pages || pagination.pages === 0}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(pagination.pages)}
                disabled={pagination.page === pagination.pages || pagination.pages === 0}
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
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Mobile</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Birthday</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Service Card</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl shadow-lg">
                          <Cake className="h-10 w-10 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">No Birthdays Found</h3>
                          <p className="text-sm text-gray-600 mt-1">No birthdays match the selected filters.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((record, index) => (
                    <tr key={record._id} className="hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 transition-all">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold">
                          {((pagination.page - 1) * 20) + index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-pink-600" />
                          <span className="text-sm font-bold text-gray-900">{record.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span className="font-mono">{record.mobile}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-3 h-3 text-gray-400" />
                          <span>{record.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-100 text-pink-700 rounded-lg text-xs font-bold">
                          <Cake className="w-3 h-3" />
                          {record.birthday}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {record.serviceCards && record.serviceCards.length > 0 ? (
                          <button
                            onClick={() => handleViewServiceCard(record._id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all shadow-sm text-xs font-bold"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
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
            <div className="p-4 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl shadow-lg">
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


