import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getServiceTypeReport, exportServiceTypeReport } from '../api/reports'
import api from '../api/axios'
import Breadcrumbs from '../components/Breadcrumbs'

export default function ServiceTypeReport() {
  const [dateRange, setDateRange] = useState('last-30-days')
  const [serviceType, setServiceType] = useState('all')
  const [serviceName, setServiceName] = useState('all')
  const [serviceVariation, setServiceVariation] = useState('all')
  const [staff, setStaff] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)
  const recordsPerPage = 10

  // Fetch plans for service dropdowns
  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans').then(res => res.data),
    enabled: true
  })

  // Fetch staff for dropdown
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff').then(res => res.data),
    enabled: true
  })

  // Fetch Service Type report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['service-type-report', dateRange, serviceType, serviceName, serviceVariation, staff, currentPage],
    queryFn: () => getServiceTypeReport({ 
      dateRange,
      serviceType: serviceType !== 'all' ? serviceType : undefined,
      serviceName: serviceName !== 'all' ? serviceName : undefined,
      serviceVariation: serviceVariation !== 'all' ? serviceVariation : undefined,
      staff: staff !== 'all' ? staff : undefined,
      page: currentPage,
      limit: recordsPerPage
    }),
    enabled: hasSearched
  })

  // Show dummy data by default
  const showDummyData = !hasSearched || (!reportData && !isLoading)

  const handleSearch = () => {
    setCurrentPage(1)
    setHasSearched(true)
  }

  const handleExportExcel = async () => {
    try {
      const response = await exportServiceTypeReport({
        dateRange,
        serviceType: serviceType !== 'all' ? serviceType : undefined,
        serviceName: serviceName !== 'all' ? serviceName : undefined,
        serviceVariation: serviceVariation !== 'all' ? serviceVariation : undefined,
        staff: staff !== 'all' ? staff : undefined
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `service-type-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  // Generate dummy data based on image description
  const generateDummyData = () => {
    return [
      {
        _id: '1',
        serviceType: 'Membership',
        serviceName: 'Gym Membership',
        serviceVariation: '6 Month Membership',
        count: 8
      },
      {
        _id: '2',
        serviceType: 'Membership',
        serviceName: 'Gym Membership',
        serviceVariation: '1 Year Membership',
        count: 9
      },
      {
        _id: '3',
        serviceType: 'Membership',
        serviceName: 'Gym Membership',
        serviceVariation: '1 Month Membership',
        count: 9
      },
      {
        _id: '4',
        serviceType: 'Membership',
        serviceName: 'Gym Membership',
        serviceVariation: '3 Month Membership',
        count: 8
      },
      {
        _id: '5',
        serviceType: 'Membership',
        serviceName: 'Gym Membership',
        serviceVariation: '2 Month Membership',
        count: 1
      }
    ]
  }

  const displayData = reportData?.data?.records || (showDummyData ? generateDummyData() : [])
  const totalRecords = reportData?.data?.total || (showDummyData ? generateDummyData().length : 0)
  const totalPages = Math.ceil(totalRecords / recordsPerPage)

  // Get unique service types from plans
  const serviceTypes = plansData?.plans 
    ? [...new Set(plansData.plans.map(plan => plan.type).filter(Boolean))]
    : ['Membership', 'Personal Training', 'Group Classes']

  // Get service names based on selected service type
  const serviceNames = plansData?.plans
    ? plansData.plans
        .filter(plan => serviceType === 'all' || plan.type === serviceType)
        .map(plan => plan.name)
        .filter((name, index, self) => self.indexOf(name) === index)
    : ['Gym Membership', 'Personal Training', 'Yoga Classes']

  // Get service variations based on selected service name
  const serviceVariations = plansData?.plans
    ? plansData.plans
        .filter(plan => {
          if (serviceName !== 'all' && plan.name !== serviceName) return false
          if (serviceType !== 'all' && plan.type !== serviceType) return false
          return true
        })
        .map(plan => plan.name)
        .filter((name, index, self) => self.indexOf(name) === index)
    : ['6 Month Membership', '1 Year Membership', '1 Month Membership', '3 Month Membership', '2 Month Membership']

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  return (
    <div className="space-y-6 max-w-full w-full overflow-x-hidden" style={{ boxSizing: 'border-box' }}>
      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <nav className="text-sm">
          <span className="text-gray-600">Home</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">Reports</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">Sales</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-orange-600 font-medium">Service Type</span>
        </nav>
      </div>

      {/* Page Title */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Service Type</h1>
        <p className="text-gray-600 mt-2">Analyze service type performance and sales data</p>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* Date Range Dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer transition-all hover:border-gray-400"
            >
              <option value="last-30-days">Last 30 days</option>
              <option value="last-7-days">Last 7 days</option>
              <option value="last-90-days">Last 90 days</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="this-year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none top-8">
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Service Type Dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
            <select
              value={serviceType}
              onChange={(e) => {
                setServiceType(e.target.value)
                setServiceName('all')
                setServiceVariation('all')
              }}
              className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer transition-all hover:border-gray-400"
            >
              <option value="all">All Service Types</option>
              {serviceTypes.map((type, index) => (
                <option key={index} value={type}>{type}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none top-8">
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Service Name Dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Name</label>
            <select
              value={serviceName}
              onChange={(e) => {
                setServiceName(e.target.value)
                setServiceVariation('all')
              }}
              className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer transition-all hover:border-gray-400"
            >
              <option value="all">All Services</option>
              {serviceNames.map((name, index) => (
                <option key={index} value={name}>{name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none top-8">
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Service Variation Dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Variation</label>
            <select
              value={serviceVariation}
              onChange={(e) => setServiceVariation(e.target.value)}
              className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer transition-all hover:border-gray-400"
            >
              <option value="all">All Variations</option>
              {serviceVariations.map((variation, index) => (
                <option key={index} value={variation}>{variation}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none top-8">
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Staff Dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Staff</label>
            <select
              value={staff}
              onChange={(e) => setStaff(e.target.value)}
              className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer transition-all hover:border-gray-400"
            >
              <option value="all">All Staff</option>
              {staffData?.staff?.map((staffMember) => (
                <option key={staffMember._id} value={staffMember._id}>
                  {staffMember.firstName} {staffMember.lastName}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none top-8">
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center gap-2"
          >
            <span>Go</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={!hasSearched && !showDummyData}
            className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {isLoading ? (
          <LoadingPage message="Loading Service Type report..." fullScreen={false} />
        ) : displayData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No Results Found.</p>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your filters and click "Go" to search.</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto w-full mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      S.No
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Service Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Service Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Service Variations
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayData.map((item, index) => (
                    <tr 
                      key={item._id || index} 
                      className="hover:bg-orange-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {(currentPage - 1) * recordsPerPage + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.serviceType || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                        {item.serviceName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.serviceVariation || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-right">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 text-orange-800">
                          {item.count || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                <div className="flex items-center text-sm text-gray-700">
                  <span>
                    Page <span className="font-semibold">{currentPage}</span> of{' '}
                    <span className="font-semibold">{totalPages}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="First page"
                  >
                    <ChevronsLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Last page"
                  >
                    <ChevronsRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

