import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Calendar, ChevronLeft, ChevronRight, Download, X } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getBusinessMISReport, exportBusinessMISReport } from '../api/reports'
import { getBranches } from '../api/organization'
import api from '../api/axios'
import DateInput from '../components/DateInput'

export default function BusinessMISReport() {
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30) // Default to 30 days ago
    return date.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [studioType, setStudioType] = useState('all')
  const [selectedServices, setSelectedServices] = useState([])
  const [selectedSources, setSelectedSources] = useState([])
  const [selectedPublishers, setSelectedPublishers] = useState([])
  const [selectedCampaigns, setSelectedCampaigns] = useState([])
  const [selectedSubCampaigns, setSelectedSubCampaigns] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [showServiceDropdown, setShowServiceDropdown] = useState(false)
  const [showSourceDropdown, setShowSourceDropdown] = useState(false)
  const [showPublisherDropdown, setShowPublisherDropdown] = useState(false)
  const [showCampaignDropdown, setShowCampaignDropdown] = useState(false)
  const [showSubCampaignDropdown, setShowSubCampaignDropdown] = useState(false)

  const [hasSearched, setHasSearched] = useState(false)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setShowServiceDropdown(false)
        setShowSourceDropdown(false)
        setShowPublisherDropdown(false)
        setShowCampaignDropdown(false)
        setShowSubCampaignDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch branches and plans for filters
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await getBranches()
      return { data: { branches: response.branches || [] } }
    }
  })

  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans').then(res => res.data)
  })

  // Fetch Business MIS report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['business-mis-report', fromDate, toDate, studioType, selectedServices, selectedSources, selectedPublishers, selectedCampaigns, selectedSubCampaigns, currentPage],
    queryFn: () => getBusinessMISReport({ 
      startDate: fromDate, 
      endDate: toDate,
      studioType: studioType !== 'all' ? studioType : undefined,
      services: selectedServices.length > 0 ? selectedServices : undefined,
      sources: selectedSources.length > 0 ? selectedSources : undefined,
      publishers: selectedPublishers.length > 0 ? selectedPublishers : undefined,
      campaigns: selectedCampaigns.length > 0 ? selectedCampaigns : undefined,
      subCampaigns: selectedSubCampaigns.length > 0 ? selectedSubCampaigns : undefined,
      page: currentPage,
      limit: 10
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
      const response = await exportBusinessMISReport({
        startDate: fromDate,
        endDate: toDate,
        studioType: studioType !== 'all' ? studioType : undefined,
        services: selectedServices.length > 0 ? selectedServices : undefined,
        sources: selectedSources.length > 0 ? selectedSources : undefined,
        publishers: selectedPublishers.length > 0 ? selectedPublishers : undefined,
        campaigns: selectedCampaigns.length > 0 ? selectedCampaigns : undefined,
        subCampaigns: selectedSubCampaigns.length > 0 ? selectedSubCampaigns : undefined
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `business-mis-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  // Dummy data
  const dummyData = [
    {
      _id: '1',
      studio: 'AIRFIT - Indiranagar',
      leads: 150,
      uniqueLeads: 145,
      trialsBooked: 45,
      trialsAttended: 38,
      conversion: 12,
      sales: 240000,
      leadsToTrialsBookedPercent: 30.0,
      trialsBookedToAttendedPercent: 84.4,
      trialsAttendedToConversionPercent: 31.6,
      leadToConversionPercent: 8.0
    },
    {
      _id: '2',
      studio: 'AIRFIT - Koramangala',
      leads: 200,
      uniqueLeads: 195,
      trialsBooked: 65,
      trialsAttended: 58,
      conversion: 20,
      sales: 400000,
      leadsToTrialsBookedPercent: 32.5,
      trialsBookedToAttendedPercent: 89.2,
      trialsAttendedToConversionPercent: 34.5,
      leadToConversionPercent: 10.3
    },
    {
      _id: '3',
      studio: 'AIRFIT - Whitefield',
      leads: 120,
      uniqueLeads: 118,
      trialsBooked: 35,
      trialsAttended: 30,
      conversion: 10,
      sales: 200000,
      leadsToTrialsBookedPercent: 29.2,
      trialsBookedToAttendedPercent: 85.7,
      trialsAttendedToConversionPercent: 33.3,
      leadToConversionPercent: 8.5
    }
  ]

  const displayData = reportData?.data?.records || (showDummyData ? dummyData : [])
  const pagination = reportData?.data?.pagination || {
    page: 1,
    limit: 10,
    total: showDummyData ? dummyData.length : 0,
    pages: showDummyData ? 1 : 0
  }

  // Calculate totals
  const totals = displayData.reduce((acc, item) => ({
    leads: acc.leads + (item.leads || 0),
    uniqueLeads: acc.uniqueLeads + (item.uniqueLeads || 0),
    trialsBooked: acc.trialsBooked + (item.trialsBooked || 0),
    trialsAttended: acc.trialsAttended + (item.trialsAttended || 0),
    conversion: acc.conversion + (item.conversion || 0),
    sales: acc.sales + (item.sales || 0)
  }), { leads: 0, uniqueLeads: 0, trialsBooked: 0, trialsAttended: 0, conversion: 0, sales: 0 })

  const totalLeadsToTrialsBookedPercent = totals.leads > 0 ? ((totals.trialsBooked / totals.leads) * 100).toFixed(1) : '0.0'
  const totalTrialsBookedToAttendedPercent = totals.trialsBooked > 0 ? ((totals.trialsAttended / totals.trialsBooked) * 100).toFixed(1) : '0.0'
  const totalTrialsAttendedToConversionPercent = totals.trialsAttended > 0 ? ((totals.conversion / totals.trialsAttended) * 100).toFixed(1) : '0.0'
  const totalLeadToConversionPercent = totals.leads > 0 ? ((totals.conversion / totals.leads) * 100).toFixed(1) : '0.0'

  const formatCurrency = (value) => {
    return `₹${value.toLocaleString('en-IN')}`
  }

  const formatPercent = (value) => {
    return `${parseFloat(value).toFixed(1)}%`
  }

  // Multi-select handlers
  const toggleService = (serviceId) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter(id => id !== serviceId))
    } else {
      setSelectedServices([...selectedServices, serviceId])
    }
  }

  const toggleSource = (source) => {
    if (selectedSources.includes(source)) {
      setSelectedSources(selectedSources.filter(s => s !== source))
    } else {
      setSelectedSources([...selectedSources, source])
    }
  }

  const selectAllServices = () => {
    if (selectedServices.length === (plansData?.data?.plans?.length || 0)) {
      setSelectedServices([])
    } else {
      setSelectedServices(plansData?.data?.plans?.map(p => p._id) || [])
    }
  }

  const selectAllSources = () => {
    const allSources = ['None', 'Corporate', 'e-mail', 'Walk-in', 'Referral', 'Online', 'Social Media']
    if (selectedSources.length === allSources.length) {
      setSelectedSources([])
    } else {
      setSelectedSources([...allSources])
    }
  }

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
  }

  const leadSources = ['None', 'Corporate', 'e-mail', 'Walk-in', 'Referral', 'Online', 'Social Media']

  return (
    <div className="space-y-6 max-w-full w-full overflow-x-hidden" style={{ boxSizing: 'border-box' }}>
      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <nav className="text-sm">
          <span className="text-gray-600">Home</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">Reports</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">Marketing</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-orange-600 font-medium">Business MIS Report</span>
        </nav>
      </div>

      {/* Page Title */}
      <div className="text-center w-full max-w-full overflow-hidden">
        <h1 className="text-3xl font-bold text-gray-900">Business MIS Report</h1>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* From Date */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[60px]">From</label>
            <DateInput
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[60px]">To</label>
            <DateInput
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Studio Type */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[100px]">Studio Type</label>
            <div className="relative flex-1">
              <select
                value={studioType}
                onChange={(e) => setStudioType(e.target.value)}
                className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer"
              >
                <option value="all">All Studio Type</option>
                {branchesData?.data?.branches?.map(branch => (
                  <option key={branch._id} value={branch._id}>{branch.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Service Selection */}
          <div className="relative dropdown-container">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select All Service</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowServiceDropdown(!showServiceDropdown)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 text-left flex items-center justify-between"
              >
                <span>{selectedServices.length > 0 ? `${selectedServices.length} selected` : 'Select All Service'}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showServiceDropdown ? 'transform rotate-180' : ''}`} />
              </button>
              {showServiceDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2 border-b border-gray-200">
                    <button
                      type="button"
                      onClick={selectAllServices}
                      className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      {selectedServices.length === (plansData?.data?.plans?.length || 0) ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  {plansData?.data?.plans?.map(plan => (
                    <label key={plan._id} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(plan._id)}
                        onChange={() => toggleService(plan._id)}
                        className="mr-2 text-orange-500 rounded"
                      />
                      <span className="text-sm text-gray-700">{plan.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Source Selection */}
          <div className="relative dropdown-container">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select All Source</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSourceDropdown(!showSourceDropdown)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 text-left flex items-center justify-between"
              >
                <span>{selectedSources.length > 0 ? `${selectedSources.length} selected` : 'Select All Source'}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showSourceDropdown ? 'transform rotate-180' : ''}`} />
              </button>
              {showSourceDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2 border-b border-gray-200">
                    <button
                      type="button"
                      onClick={selectAllSources}
                      className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      {selectedSources.length === leadSources.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  {leadSources.map(source => (
                    <label key={source} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSources.includes(source)}
                        onChange={() => toggleSource(source)}
                        className="mr-2 text-orange-500 rounded"
                      />
                      <span className="text-sm text-gray-700">{source}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Publisher Selection */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select All Publisher</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPublisherDropdown(!showPublisherDropdown)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 text-left flex items-center justify-between"
              >
                <span>None</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Campaign Selection */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select All Campaign</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCampaignDropdown(!showCampaignDropdown)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 text-left flex items-center justify-between"
              >
                <span>None</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Sub Campaign Selection */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select All Sub Campaign</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSubCampaignDropdown(!showSubCampaignDropdown)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 text-left flex items-center justify-between"
              >
                <span>None</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Go
          </button>
          <button
            onClick={handleExportExcel}
            disabled={!hasSearched && !showDummyData}
            className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full max-w-full overflow-hidden">
        {isLoading ? (
          <LoadingPage message="Loading Business MIS report..." fullScreen={false} />
        ) : displayData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No Results Found.</p>
          </div>
        ) : (
          <>
            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.pages}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.page === 1 || isLoading}
                    className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="First page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1 || isLoading}
                    className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages || isLoading}
                    className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.pages)}
                    disabled={pagination.page === pagination.pages || isLoading}
                    className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Last page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto w-full" style={{ maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full" style={{ minWidth: '1200px', width: '100%' }}>
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">S.No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Studio</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Leads</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Unique Leads</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Trials Booked</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Trials Attended</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Conversion</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Sales</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Leads to Trials Booked %</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Trials Booked to Attended %</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Trials Attended to Conversion%</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Lead to Conversion%</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayData.map((item, index) => (
                    <tr key={item._id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{(pagination.page - 1) * pagination.limit + index + 1}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.studio}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{item.leads || 0}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{item.uniqueLeads || 0}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{item.trialsBooked || 0}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{item.trialsAttended || 0}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{item.conversion || 0}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatCurrency(item.sales || 0)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatPercent(item.leadsToTrialsBookedPercent || 0)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatPercent(item.trialsBookedToAttendedPercent || 0)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatPercent(item.trialsAttendedToConversionPercent || 0)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatPercent(item.leadToConversionPercent || 0)}</td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                    <td colSpan="2" className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">Total</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{totals.leads}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{totals.uniqueLeads}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{totals.trialsBooked}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{totals.trialsAttended}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{totals.conversion}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(totals.sales)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatPercent(totalLeadsToTrialsBookedPercent)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatPercent(totalTrialsBookedToAttendedPercent)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatPercent(totalTrialsAttendedToConversionPercent)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatPercent(totalLeadToConversionPercent)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

