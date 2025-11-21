import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Download, 
  RotateCcw,
  Calendar,
  AlertTriangle,
  Search,
  Filter,
  Sparkles,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  Mail,
  Phone,
  User
} from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getServiceExpiryReport, exportServiceExpiryReport } from '../api/reports'
import { fetchServices } from '../api/services'
import { getStaff } from '../api/staff'
import toast from 'react-hot-toast'
import DateInput from '../components/DateInput'

export default function ServiceExpiry() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const getDefaultFromDate = () => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  }

  const getDefaultToDate = () => {
    const date = new Date()
    date.setMonth(date.getMonth() + 1)
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
    search: '',
    memberType: 'all',
    staffId: 'all',
    serviceId: 'all',
    communicate: 'all'
  })
  const [page, setPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(!!(urlFromDate || urlToDate))
  const [selectedRows, setSelectedRows] = useState(new Set())
  
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

  const { data: servicesData } = useQuery({
    queryKey: ['services-list'],
    queryFn: () => fetchServices().then(res => res.data)
  })

  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => getStaff({ limit: 1000 }).then(res => res.data)
  })

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['service-expiry-report', filters, page],
    queryFn: () => getServiceExpiryReport({
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      search: filters.search || undefined,
      memberType: filters.memberType !== 'all' ? filters.memberType : undefined,
      staffId: filters.staffId !== 'all' ? filters.staffId : undefined,
      serviceId: filters.serviceId !== 'all' ? filters.serviceId : undefined,
      page,
      limit: 50
    }).then(res => res.data),
    enabled: hasSearched
  })

  const records = reportData?.data?.records || []
  const pagination = reportData?.data?.pagination || { page: 1, pages: 1, total: 0 }
  const paidAmount = reportData?.data?.paidAmount || 0

  const services = servicesData?.services || []
  const staff = staffData?.staff || []

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleSearch = () => {
    setHasSearched(true)
    setPage(1)
    setSelectedRows(new Set())
    refetch()
  }

  const handleExportExcel = async () => {
    try {
      const response = await exportServiceExpiryReport({
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        search: filters.search || undefined,
        memberType: filters.memberType !== 'all' ? filters.memberType : undefined,
        staffId: filters.staffId !== 'all' ? filters.staffId : undefined,
        serviceId: filters.serviceId !== 'all' ? filters.serviceId : undefined
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `service-expiry-report-${new Date().toISOString().split('T')[0]}.csv`
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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(new Set(records.map((_, idx) => idx)))
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleSelectRow = (idx) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(idx)) {
      newSelected.delete(idx)
    } else {
      newSelected.add(idx)
    }
    setSelectedRows(newSelected)
  }

  const handleRebook = (record) => {
    navigate(`/clients/${record.memberMongoId}`, { state: { action: 'renew' } })
  }

  const isServiceExpired = (expiryDateStr) => {
    if (!expiryDateStr || expiryDateStr === '-') return true
    
    try {
      const parts = expiryDateStr.split('-')
      if (parts.length !== 3) return true
      
      const day = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10)
      const year = parseInt(parts[2], 10)
      
      if (isNaN(day) || isNaN(month) || isNaN(year)) return true
      
      const expiryDate = new Date(year, month - 1, day, 23, 59, 59, 999)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      
      return expiryDate <= today
    } catch (error) {
      console.error('Error parsing expiry date:', error, expiryDateStr)
      return true
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0)
  }

  if (isLoading && hasSearched) return <LoadingPage />

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
            <span className="text-orange-600 font-semibold">Service Expiry</span>
          </nav>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Service Expiry Report</h1>
            <p className="text-gray-600 mt-1">Track and manage expiring service memberships</p>
          </div>
        </div>

        <button
          onClick={handleExportExcel}
          className="group inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold shadow-lg hover:shadow-xl"
        >
          <Download className="h-4 w-4 group-hover:animate-bounce" />
          Export CSV
        </button>
      </div>

      {/* Summary Card */}
      {hasSearched && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 border-2 border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/40 rounded-full blur-3xl"></div>
          
          <div className="relative flex items-center gap-6">
            <div className="p-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-lg">
              <DollarSign className="h-10 w-10 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-1">Total Paid Amount</p>
              <p className="text-4xl font-black text-red-600">₹{formatCurrency(paidAmount)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-lg">
              <Filter className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">Search & Filter Options</span>
          </div>
          {hasSearched && (
            <button
              onClick={() => {
                setHasSearched(false)
                setFilters({
                  fromDate: getDefaultFromDate(),
                  toDate: getDefaultToDate(),
                  search: '',
                  memberType: 'all',
                  staffId: 'all',
                  serviceId: 'all',
                  communicate: 'all'
                })
                setPage(1)
                setSelectedRows(new Set())
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-semibold"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {/* Search Bar */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
              Search by Name, Mobile Number, or Email
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search..."
                className="w-full rounded-xl border-2 border-gray-200 py-3 pl-12 pr-4 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
              />
            </div>
          </div>

          {/* Filter Grid */}
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
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Member Type</label>
              <select
                value={filters.memberType}
                onChange={(e) => handleFilterChange('memberType', e.target.value)}
                className="w-full appearance-none rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
              >
                <option value="all">All Members</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Staff</label>
              <select
                value={filters.staffId}
                onChange={(e) => handleFilterChange('staffId', e.target.value)}
                className="w-full appearance-none rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
              >
                <option value="all">All Staff</option>
                {staff.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Communicate</label>
              <select
                value={filters.communicate}
                onChange={(e) => handleFilterChange('communicate', e.target.value)}
                className="w-full appearance-none rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
              >
                <option value="all">All</option>
                <option value="contacted">Contacted</option>
                <option value="not-contacted">Not Contacted</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Service</label>
              <select
                value={filters.serviceId}
                onChange={(e) => handleFilterChange('serviceId', e.target.value)}
                className="w-full appearance-none rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
              >
                <option value="all">All Services</option>
                {services.map((service) => (
                  <option key={service._id} value={service._id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex items-end">
              <button
                onClick={handleSearch}
                className="group w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold shadow-lg hover:shadow-xl"
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
              Showing <span className="text-orange-600">{((pagination.page - 1) * 50) + 1}</span> to <span className="text-orange-600">{Math.min(pagination.page * 50, pagination.total)}</span> of <span className="text-orange-600">{pagination.total}</span> records
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
            <table className="w-full min-w-[2000px]">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === records.length && records.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">#</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Member ID</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Member Name</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Mobile</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Email</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Sales Rep</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">General Trainer</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Service Name</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Service Variation</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Amount</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Duration</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Expiry Date</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Last Invoice</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Last Contacted</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Last Check-In</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Last Status</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Call Status</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Renewal</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="20" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl shadow-lg">
                          <AlertTriangle className="h-10 w-10 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">No Expiring Services Found</h3>
                          <p className="text-sm text-gray-600 mt-1">No services match the selected filters.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((record, index) => (
                    <tr key={record._id} className="hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 transition-all">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(index)}
                          onChange={() => handleSelectRow(index)}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold">
                          {((pagination.page - 1) * 50) + index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600 font-semibold whitespace-nowrap">{record.memberId}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/clients/${record.memberMongoId}`)}
                          className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 hover:text-orange-800 hover:underline"
                        >
                          <User className="w-3 h-3" />
                          {record.memberName}
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span className="font-mono">{record.mobile}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-3 h-3 text-gray-400" />
                          <span className="max-w-[200px] truncate" title={record.email}>{record.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                          record.status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium whitespace-nowrap">{record.salesRep}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium whitespace-nowrap">{record.generalTrainer}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-semibold whitespace-nowrap">{record.serviceName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{record.serviceVariationName}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-bold whitespace-nowrap">₹{record.amount}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{record.serviceDuration}</td>
                      <td className="px-4 py-3 text-sm font-bold text-red-600 whitespace-nowrap">{record.expiryDate}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{record.lastInvoiceDate}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{record.lastContactedDate}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{record.lastCheckInDate}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{record.lastStatus}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{record.lastCallStatus}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {(() => {
                          const expired = isServiceExpired(record.expiryDate)
                          const isButtonEnabled = expired
                          return (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                if (isButtonEnabled) {
                                  handleRebook(record)
                                }
                              }}
                              disabled={!isButtonEnabled}
                              className={`px-4 py-2 rounded-lg transition-all text-xs font-bold whitespace-nowrap ${
                                isButtonEnabled
                                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 shadow-sm cursor-pointer'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                              title={isButtonEnabled ? 'Click to rebook service' : 'Service has not expired yet'}
                            >
                              <RefreshCcw className="w-3 h-3 inline mr-1" />
                              Rebook
                            </button>
                          )
                        })()}
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
            <div className="p-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg">
              <Calendar className="h-10 w-10 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Select Filters</h3>
              <p className="text-sm text-gray-600 mt-1">Please select filters and click "Apply Filters" to view the report.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
