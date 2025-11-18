import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
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

  const [filters, setFilters] = useState({
    fromDate: getDefaultFromDate(),
    toDate: getDefaultToDate(),
    search: '',
    memberType: 'all',
    staffId: 'all',
    serviceId: 'all',
    communicate: 'all'
  })
  const [page, setPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedRows, setSelectedRows] = useState(new Set())

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
    }),
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
            <table className="w-full border-collapse border border-gray-300">
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
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">S.No</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Member ID</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Member Name</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Mobile</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Email</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Status</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Sales Rep</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">General Trainer</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Service Name</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Service Variation Name</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Amount</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Service Duration</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Expiry Date</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Last Invoice Date</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Total Sessions</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Utilized</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Balance</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Last Contacted Date</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Last Check-In Date</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Last Status</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Last Call Status</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Renewal</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="23" className="border border-gray-300 px-4 py-8 text-center text-gray-500">
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
                      <td className="border border-gray-300 px-3 py-2 text-sm">{((pagination.page - 1) * 50) + index + 1}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{record.memberId}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        <button
                          onClick={() => navigate(`/clients/${record.memberMongoId}`)}
                          className="text-orange-600 hover:underline"
                        >
                          {record.memberName}
                        </button>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{record.mobile}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{record.email}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{record.status}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{record.salesRep}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{record.generalTrainer}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{record.serviceName}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{record.serviceVariationName}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{record.amount}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{record.serviceDuration}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{record.expiryDate}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{record.lastInvoiceDate}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{record.totalSessions}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{record.utilized}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{record.balance}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{record.lastContactedDate}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{record.lastCheckInDate}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{record.lastStatus}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{record.lastCallStatus}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        <button
                          onClick={() => handleRebook(record)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs font-medium"
                        >
                          Rebook
                        </button>
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

