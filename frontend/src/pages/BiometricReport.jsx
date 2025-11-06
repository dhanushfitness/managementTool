import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Download, Users, Building2, Smartphone } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getBiometricReport, exportBiometricReport, getBiometricStaffReport, getBiometricMulticlubReport, getBiometricDevices } from '../api/reports'
import { getMembers } from '../api/members'
import api from '../api/axios'

export default function BiometricReport() {
  const [filters, setFilters] = useState({
    memberId: '',
    search: '',
    serviceId: ''
  })
  const [reportType, setReportType] = useState('member') // member, staff, multiclub, devices

  // Fetch members for name dropdown
  const { data: membersData } = useQuery({
    queryKey: ['members', 'all'],
    queryFn: () => getMembers({ limit: 1000 }),
    enabled: true
  })

  // Fetch plans for service dropdown
  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans').then(res => res.data),
    enabled: true
  })

  // Fetch biometric report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['biometric-report', filters, reportType],
    queryFn: () => {
      if (reportType === 'member') {
        return getBiometricReport(filters)
      } else if (reportType === 'staff') {
        return getBiometricStaffReport(filters)
      } else if (reportType === 'multiclub') {
        return getBiometricMulticlubReport(filters)
      } else if (reportType === 'devices') {
        return getBiometricDevices()
      }
    },
    enabled: false // Only fetch when "Go" is clicked
  })

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleSearch = () => {
    refetch()
  }

  const handleExportExcel = async () => {
    try {
      const response = await exportBiometricReport({ ...filters, reportType })
      // Create a blob and download
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `biometric-report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const handleReportTypeChange = (type) => {
    setReportType(type)
    setFilters({ memberId: '', search: '', serviceId: '' })
  }

  // Dummy data for visualization when no data is available
  const dummyData = [
    {
      _id: '1',
      member: { firstName: 'John', lastName: 'Doe', memberId: 'MEM001', phone: '9876543210', attendanceId: 'ATT001' },
      checkInTime: new Date('2024-01-15T08:30:00'),
      checkOutTime: new Date('2024-01-15T18:45:00'),
      method: 'biometric',
      deviceName: 'Device 1 - Main Entrance',
      service: { name: 'Premium Gym Membership' },
      status: 'success',
      branch: { name: 'Main Branch' }
    },
    {
      _id: '2',
      member: { firstName: 'Jane', lastName: 'Smith', memberId: 'MEM002', phone: '9876543211', attendanceId: 'ATT002' },
      checkInTime: new Date('2024-01-15T09:15:00'),
      checkOutTime: new Date('2024-01-15T19:30:00'),
      method: 'biometric',
      deviceName: 'Device 2 - Side Entrance',
      service: { name: 'Standard Gym Membership' },
      status: 'success',
      branch: { name: 'Main Branch' }
    },
    {
      _id: '3',
      member: { firstName: 'Mike', lastName: 'Johnson', memberId: 'MEM003', phone: '9876543212', attendanceId: 'ATT003' },
      checkInTime: new Date('2024-01-15T07:00:00'),
      checkOutTime: null,
      method: 'biometric',
      deviceName: 'Device 1 - Main Entrance',
      service: { name: 'Premium Gym Membership' },
      status: 'success',
      branch: { name: 'Downtown Branch' }
    },
    {
      _id: '4',
      member: { firstName: 'Sarah', lastName: 'Williams', memberId: 'MEM004', phone: '9876543213', attendanceId: 'ATT004' },
      checkInTime: new Date('2024-01-15T10:00:00'),
      checkOutTime: new Date('2024-01-15T20:00:00'),
      method: 'biometric',
      deviceName: 'Device 3 - VIP Entrance',
      service: { name: 'VIP Membership' },
      status: 'success',
      branch: { name: 'Main Branch' }
    },
    {
      _id: '5',
      member: { firstName: 'David', lastName: 'Brown', memberId: 'MEM005', phone: '9876543214', attendanceId: 'ATT005' },
      checkInTime: new Date('2024-01-15T06:30:00'),
      checkOutTime: new Date('2024-01-15T17:00:00'),
      method: 'biometric',
      deviceName: 'Device 1 - Main Entrance',
      service: { name: 'Standard Gym Membership' },
      status: 'blocked',
      blockedReason: 'Membership expired',
      branch: { name: 'Main Branch' }
    }
  ]

  // Use dummy data if no data is loaded yet or if explicitly showing dummy data
  const showDummyData = !reportData && !isLoading
  let displayData = []
  if (reportData?.data) {
    if (reportType === 'devices') {
      displayData = reportData.data || []
    } else {
      displayData = reportData.data.attendance || []
    }
  } else if (showDummyData) {
    displayData = dummyData
  }
  const hasData = displayData && displayData.length > 0

  return (
    <div className="space-y-6 max-w-full w-full overflow-x-hidden" style={{ boxSizing: 'border-box' }}>
      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <nav className="text-sm">
          <span className="text-gray-600">Home</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">Reports</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">General Reports</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-orange-600 font-medium">
            {reportType === 'member' ? 'Biometric Report - Member' : 
             reportType === 'staff' ? 'Biometric Report - Staff' :
             reportType === 'multiclub' ? 'Biometric Report - Multiclub Member' :
             'Biometric Report - Device List'}
          </span>
        </nav>
      </div>

      {/* Page Title */}
      <div className="text-center w-full max-w-full overflow-hidden">
        <h1 className="text-3xl font-bold text-gray-900">Biometric Report</h1>
      </div>

      {/* Filter and Action Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 w-full">
          {/* Left Side - Filters */}
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0 max-w-full">
            {reportType === 'member' && (
              <>
                <div className="relative">
                  <select
                    value={filters.memberId}
                    onChange={(e) => handleFilterChange('memberId', e.target.value)}
                    className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer min-w-[150px]"
                  >
                    <option value="">Name</option>
                    {membersData?.data?.members?.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.firstName} {member.lastName}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div className="relative flex-1 min-w-[150px] max-w-full" style={{ minWidth: '150px', maxWidth: '100%' }}>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by Attendance Id/ Mobile Number"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    style={{ maxWidth: '100%' }}
                  />
                </div>

                <div className="relative">
                  <select
                    value={filters.serviceId}
                    onChange={(e) => handleFilterChange('serviceId', e.target.value)}
                    className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer min-w-[150px]"
                  >
                    <option value="">Select Service</option>
                    {plansData?.data?.plans?.map((plan) => (
                      <option key={plan._id} value={plan._id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Go
                </button>
              </>
            )}

            {reportType !== 'member' && (
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Go
              </button>
            )}
          </div>

          {/* Right Side - Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 min-w-0 max-w-full">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={() => handleReportTypeChange('staff')}
              className={`px-4 py-2.5 rounded-lg transition-colors font-medium text-sm flex items-center space-x-2 ${
                reportType === 'staff' 
                  ? 'bg-orange-100 text-orange-700 border-2 border-orange-300' 
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Staff Report</span>
            </button>
            <button
              onClick={() => handleReportTypeChange('multiclub')}
              className={`px-4 py-2.5 rounded-lg transition-colors font-medium text-sm flex items-center space-x-2 ${
                reportType === 'multiclub' 
                  ? 'bg-orange-100 text-orange-700 border-2 border-orange-300' 
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Multiclub Member Report</span>
            </button>
            <button
              onClick={() => handleReportTypeChange('devices')}
              className={`px-4 py-2.5 rounded-lg transition-colors font-medium text-sm flex items-center space-x-2 ${
                reportType === 'devices' 
                  ? 'bg-orange-100 text-orange-700 border-2 border-orange-300' 
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Device List</span>
            </button>
            {reportType !== 'member' && (
              <button
                onClick={() => handleReportTypeChange('member')}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
              >
                Back to Member Report
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full max-w-full overflow-hidden">
        {isLoading ? (
          <LoadingPage message="Loading biometric report..." fullScreen={false} />
        ) : !hasData ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No Results Found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full" style={{ maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full" style={{ minWidth: '800px', width: '100%' }}>
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">S.No</th>
                  {reportType === 'member' && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Member Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Member ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Attendance ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Mobile</th>
                    </>
                  )}
                  {reportType === 'staff' && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Staff Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Staff ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                    </>
                  )}
                  {reportType === 'multiclub' && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Member Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Member ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Home Branch</th>
                    </>
                  )}
                    {reportType === 'devices' && (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Device Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Device ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Location</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Check In</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Check Ins</th>
                      </>
                    )}
                    {reportType !== 'devices' && (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Check In Time</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Check Out Time</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Device</th>
                      </>
                    )}
                  {reportType === 'member' && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Service</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Branch</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayData.map((record, index) => (
                  <tr key={record._id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                    {reportType === 'member' && (
                      <>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.member?.firstName} {record.member?.lastName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{record.member?.memberId}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{record.member?.attendanceId}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{record.member?.phone}</td>
                      </>
                    )}
                    {reportType === 'staff' && (
                      <>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.staff?.firstName} {record.staff?.lastName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{record.staff?.staffId || 'N/A'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{record.staff?.email}</td>
                      </>
                    )}
                    {reportType === 'multiclub' && (
                      <>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.member?.firstName} {record.member?.lastName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{record.member?.memberId}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{record.homeBranch?.name || 'N/A'}</td>
                      </>
                    )}
                    {reportType === 'devices' && (
                      <>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.deviceName || 'N/A'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{record.deviceId || 'N/A'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{record.location || 'N/A'}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            record.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {record.status || 'active'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.lastCheckIn 
                            ? new Date(record.lastCheckIn).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{record.totalCheckIns || 0}</td>
                      </>
                    )}
                    {reportType !== 'devices' && (
                      <>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.checkInTime 
                            ? new Date(record.checkInTime).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.checkOutTime 
                            ? new Date(record.checkOutTime).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{record.deviceName || 'N/A'}</td>
                      </>
                    )}
                    {reportType === 'member' && (
                      <>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{record.serviceId?.name || record.service?.name || 'N/A'}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            record.status === 'success' 
                              ? 'bg-green-100 text-green-800' 
                              : record.status === 'blocked'
                              ? 'bg-red-100 text-red-800'
                              : record.status === 'expired'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {record.status || 'success'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{record.branch?.name || 'N/A'}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

