import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { Download, RotateCcw } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getServiceExpiryReport, exportServiceExpiryReport } from '../api/reports'
import { fetchServices } from '../api/services'
import { getStaff } from '../api/staff'
import toast from 'react-hot-toast'
import DateInput from '../components/DateInput'
import Breadcrumbs from '../components/Breadcrumbs'

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
    search: '',
    memberType: 'all',
    staffId: 'all',
    serviceId: 'all',
    communicate: 'all'
  })
  const [page, setPage] = useState(1)
  // Auto-search if URL params are present, otherwise start with false
  const [hasSearched, setHasSearched] = useState(!!(urlFromDate || urlToDate))
  const [selectedRows, setSelectedRows] = useState(new Set())
  
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

  // Fetch services
  const { data: servicesData } = useQuery({
    queryKey: ['services-list'],
    queryFn: () => fetchServices().then(res => res.data)
  })

  // Fetch staff
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
      // Parse DD-MM-YYYY format
      const parts = expiryDateStr.split('-')
      if (parts.length !== 3) {
        console.warn('Invalid date format:', expiryDateStr)
        return true
      }
      
      const day = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10)
      const year = parseInt(parts[2], 10)
      
      if (isNaN(day) || isNaN(month) || isNaN(year)) {
        console.warn('Invalid date values:', { day, month, year })
        return true
      }
      
      // Create dates in local timezone to avoid UTC conversion issues
      const expiryDate = new Date(year, month - 1, day, 23, 59, 59, 999)
      
      // Get today's date in local timezone
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      
      // Service is expired if expiry date is today or before today
      // Button should be disabled if expired (return true)
      // Button should be enabled only if expiry date is in the future
      const isExpired = expiryDate <= today
      
      // Debug logging
      console.log('Expiry check:', {
        expiryDateStr,
        expiryDateLocal: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        todayLocal: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
        expiryTimestamp: expiryDate.getTime(),
        todayTimestamp: today.getTime(),
        isExpired
      })
      
      return isExpired
    } catch (error) {
      console.error('Error parsing expiry date:', error, expiryDateStr)
      return true // If we can't parse, assume expired for safety
    }
  }

  if (isLoading && hasSearched) return <LoadingPage />

  return (
    <div className="space-y-6 max-w-full w-full overflow-x-hidden px-6 py-4">
      <Breadcrumbs items={[
        { label: 'Home', to: '/' },
        { label: 'Reports', to: '/reports' },
        { label: 'Client Management', to: '/reports/client-management' },
        { label: 'Service Expiry' }
      ]} />

      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Service Expiry</h1>
      </div>

      {/* Paid Amount Summary */}
      {hasSearched && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex justify-end">
          <div className="text-sm">
            <span className="text-gray-600">Paid Amount: </span>
            <span className="text-red-600 font-bold text-lg">{paidAmount.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="space-y-4">
          {/* Search Bar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search by Name/ Mobile Number/ Mail
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Filter Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
              <DateInput
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                containerClassName="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
              <DateInput
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                containerClassName="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">All Member</label>
              <select
                value={filters.memberType}
                onChange={(e) => handleFilterChange('memberType', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Members</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Staff</label>
              <select
                value={filters.staffId}
                onChange={(e) => handleFilterChange('staffId', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Staff</option>
                {staff.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Communicate</label>
              <select
                value={filters.communicate}
                onChange={(e) => handleFilterChange('communicate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">Select</option>
                <option value="contacted">Contacted</option>
                <option value="not-contacted">Not Contacted</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Service</label>
              <select
                value={filters.serviceId}
                onChange={(e) => handleFilterChange('serviceId', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">Select</option>
                {services.map((service) => (
                  <option key={service._id} value={service._id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
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
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Table */}
      {hasSearched && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * 50) + 1} to {Math.min(pagination.page * 50, pagination.total)} of {pagination.total} results
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

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === records.length && records.length > 0}
                      onChange={handleSelectAll}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">S.No</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">Member ID</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">Member Name</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">Mobile</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">Email</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">Status</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">Sales Rep</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">General Trainer</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">Service Name</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">Service Variation</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">Amount</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">Service Duration</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">Expiry Date</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">Last Invoice Date</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">Last Contacted</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">Last Check-In</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">Last Status</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">Call Status</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">Renewal</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="20" className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                      No Results Found.
                    </td>
                  </tr>
                ) : (
                  records.map((record, index) => (
                    <tr 
                      key={record._id} 
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100'}
                    >
                      <td className="border border-gray-300 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(index)}
                          onChange={() => handleSelectRow(index)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap">{((pagination.page - 1) * 50) + index + 1}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap">{record.memberId}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/clients/${record.memberMongoId}`)}
                          className="text-orange-600 hover:underline"
                          title={record.memberName}
                        >
                          {record.memberName}
                        </button>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap">{record.mobile}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap" title={record.email}>{record.email}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap">{record.status}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap" title={record.salesRep}>{record.salesRep}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap" title={record.generalTrainer}>{record.generalTrainer}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap" title={record.serviceName}>{record.serviceName}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap" title={record.serviceVariationName}>{record.serviceVariationName}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap">{record.amount}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap">{record.serviceDuration}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap">{record.expiryDate}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap">{record.lastInvoiceDate}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap">{record.lastContactedDate}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap">{record.lastCheckInDate}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap">{record.lastStatus}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap">{record.lastCallStatus}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap">
                        {(() => {
                          const expired = isServiceExpired(record.expiryDate)
                          // Inverted logic: button enabled when expired, disabled when not expired
                          const isButtonEnabled = expired
                          console.log(`Button state for ${record.memberName} (${record.expiryDate}): expired=${expired}, buttonEnabled=${isButtonEnabled}`)
                          return (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                if (isButtonEnabled) {
                                  handleRebook(record)
                                } else {
                                  console.log('Button clicked but service has not expired yet')
                                }
                              }}
                              disabled={!isButtonEnabled}
                              className={`px-3 py-1 rounded transition-colors text-xs font-medium whitespace-nowrap ${
                                isButtonEnabled
                                  ? 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'
                                  : 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'
                              }`}
                              title={isButtonEnabled ? 'Click to rebook service' : 'Service has not expired yet. Cannot rebook.'}
                            >
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          Please select filters and click "Go" to view the report
        </div>
      )}
    </div>
  )
}

