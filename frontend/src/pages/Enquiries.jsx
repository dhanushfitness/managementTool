import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { 
  Download, 
  Upload, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Plus,
  Eye,
  Edit,
  Trash2,
  Phone,
  Calendar,
  MessageSquare,
  Mail,
  Activity,
  X,
  Search,
  Users,
  Target,
  Archive,
  UserCheck,
  UserX,
  Zap,
  TrendingUp,
  ArrowRight,
  Loader2
} from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import LoadingTable from '../components/LoadingTable'
import AddEnquiryModal from '../components/AddEnquiryModal'
import AppointmentModal from '../components/AppointmentModal'
import DateInput from '../components/DateInput'
import { useDateFilterStore } from '../store/dateFilterStore'

export default function Enquiries() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const {
    dateFilter,
    fromDate,
    toDate,
    setDateFilterValue,
    setFromDateValue,
    setToDateValue,
    applyFilterParams
  } = useDateFilterStore()
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedEnquiries, setSelectedEnquiries] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAppointmentModal, setShowAppointmentModal] = useState(null)
  const [showFitnessLogModal, setShowFitnessLogModal] = useState(null)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [isDetailsLoading, setIsDetailsLoading] = useState(false)
  const [selectedEnquiryDetails, setSelectedEnquiryDetails] = useState(null)
  // Filter states
  const [filters, setFilters] = useState({
    enquiryStage: '',
    leadSource: '',
    service: '',
    gender: '',
    callTag: '',
    staffId: ''
  })

  const [initialQueryApplied, setInitialQueryApplied] = useState(false)

  useEffect(() => {
    if (initialQueryApplied) return
    const params = new URLSearchParams(location.search)
    const incomingFilter = params.get('dateFilter')
    const incomingFrom = params.get('fromDate')
    const incomingTo = params.get('toDate')
    if (incomingFilter) {
      applyFilterParams({
        dateFilter: incomingFilter,
        fromDate: incomingFrom || '',
        toDate: incomingTo || ''
      })
    }
    setInitialQueryApplied(true)
  }, [location.search, initialQueryApplied, applyFilterParams])

  const buildDateParams = () => {
    if (dateFilter === 'custom' && fromDate && toDate) {
      return { dateFilter, fromDate, toDate }
    }
    return { dateFilter }
  }

  // Build query params
  const queryParams = {
    page,
    limit,
    ...buildDateParams(),
    ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
  }

  // Fetch enquiries
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['enquiries', queryParams],
    queryFn: () => api.get('/enquiries', { params: queryParams }).then(res => res.data)
  })

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['enquiry-stats', dateFilter, fromDate, toDate],
    queryFn: () => api.get('/enquiries/stats', { params: buildDateParams() }).then(res => res.data)
  })

  // Fetch staff for filters
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff').then(res => res.data),
    enabled: true
  })

  // Fetch plans for filters
  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans').then(res => res.data),
    enabled: true
  })

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (enquiryId) => api.delete(`/enquiries/${enquiryId}`),
    onSuccess: () => {
      toast.success('Enquiry deleted successfully')
      queryClient.invalidateQueries(['enquiries'])
      queryClient.invalidateQueries(['enquiry-stats'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete enquiry')
    }
  })

  const initialConvertState = {
    open: false,
    enquiry: null,
    status: 'negotiation',
    comments: ''
  }
  const [convertConfirm, setConvertConfirm] = useState(initialConvertState)

  const convertToMemberMutation = useMutation({
    mutationFn: ({ enquiryId, status, comments }) => 
      api.post(`/enquiries/${enquiryId}/convert`, { status, comments }),
    onSuccess: (response) => {
      toast.success('Enquiry converted to member successfully')
      queryClient.invalidateQueries(['enquiries'])
      queryClient.invalidateQueries(['enquiry-stats'])
      // Redirect to member profile page
      const memberId = response?.data?.member?._id
      if (memberId) {
        navigate(`/clients/${memberId}`)
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to convert enquiry')
    }
  })

  const handleConvertClick = (enquiry) => {
    if (!enquiry || !enquiry._id) {
      toast.error('Invalid enquiry data')
      return
    }
    // Map 'sale' to 'negotiation' if needed, or use existing stage
    const statusMap = {
      'sale': 'negotiation',
      'opened': 'opened',
      'qualified': 'qualified',
      'demo': 'demo',
      'negotiation': 'negotiation',
      'converted': 'converted',
      'lost': 'lost',
      'enquiry': 'enquiry',
      'future-prospect': 'future-prospect',
      'not-interested': 'not-interested'
    }
    const defaultStatus = enquiry.enquiryStage || 'negotiation'
    const newState = { 
      open: true, 
      enquiry,
      status: statusMap[defaultStatus] || defaultStatus,
      comments: ''
    }
    setConvertConfirm(newState)
  }

  const handleConvertConfirm = () => {
    if (convertConfirm.enquiry) {
      convertToMemberMutation.mutate({ 
        enquiryId: convertConfirm.enquiry._id, 
        status: convertConfirm.status,
        comments: convertConfirm.comments
      })
      setConvertConfirm(initialConvertState)
    }
  }

  const bulkArchiveMutation = useMutation({
    mutationFn: (enquiryIds) => api.post('/enquiries/bulk/archive', { enquiryIds }),
    onSuccess: () => {
      toast.success('Enquiries archived successfully')
      setSelectedEnquiries([])
      queryClient.invalidateQueries(['enquiries'])
      queryClient.invalidateQueries(['enquiry-stats'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to archive enquiries')
    }
  })

  const bulkChangeStaffMutation = useMutation({
    mutationFn: ({ enquiryIds, staffId }) => 
      api.post('/enquiries/bulk/staff-change', { enquiryIds, staffId }),
    onSuccess: () => {
      toast.success('Staff changed successfully')
      setSelectedEnquiries([])
      queryClient.invalidateQueries(['enquiries'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to change staff')
    }
  })

  // Handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedEnquiries(data?.enquiries?.map(e => e._id) || [])
    } else {
      setSelectedEnquiries([])
    }
  }

  const handleSelectEnquiry = (enquiryId, checked) => {
    if (checked) {
      setSelectedEnquiries([...selectedEnquiries, enquiryId])
    } else {
      setSelectedEnquiries(selectedEnquiries.filter(id => id !== enquiryId))
    }
  }

  const handleBulkAction = (action) => {
    if (selectedEnquiries.length === 0) {
      toast.error('Please select at least one enquiry')
      return
    }

    if (action === 'archive') {
      bulkArchiveMutation.mutate(selectedEnquiries)
    } else if (action === 'staff-change') {
      const staffId = prompt('Enter staff ID or select from list')
      if (staffId) {
        bulkChangeStaffMutation.mutate({ enquiryIds: selectedEnquiries, staffId })
      }
    }
  }

  const handleExport = async () => {
    try {
      const response = await api.get('/enquiries/export', {
        params: queryParams,
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `enquiries-${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Enquiries exported successfully')
    } catch (error) {
      toast.error('Failed to export enquiries')
    }
  }

  const handlePageChange = (newPage) => {
    setPage(newPage)
  }

  const handleGoToPage = (e) => {
    e.preventDefault()
    const pageInput = e.target.elements.page.value
    const pageNum = parseInt(pageInput)
    if (pageNum >= 1 && pageNum <= data?.pagination?.pages) {
      setPage(pageNum)
    }
  }

  const handleClearFilters = () => {
    setFilters({
      enquiryStage: '',
      leadSource: '',
      service: '',
      gender: '',
      callTag: '',
      staffId: ''
    })
    setPage(1)
  }

  const enquiries = data?.enquiries || []
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 }
  const statsData = stats?.stats || {}

  const handleShowDetails = async (enquiryId) => {
    try {
      setShowDetailsModal(true)
      setIsDetailsLoading(true)
      const response = await api.get(`/enquiries/${enquiryId}`)
      setSelectedEnquiryDetails(response.data?.enquiry || null)
    } catch (error) {
      setSelectedEnquiryDetails(null)
      setShowDetailsModal(false)
      toast.error(error.response?.data?.message || 'Unable to load enquiry details')
    } finally {
      setIsDetailsLoading(false)
    }
  }

  const closeDetailsModal = () => {
    setShowDetailsModal(false)
    setSelectedEnquiryDetails(null)
  }

  const activeFilterCount = Object.values(filters).filter(v => v).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Enquiries</h1>
          <p className="text-gray-600">Manage and track all your leads in one place</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-5 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          <span>Add Enquiry</span>
        </button>
      </div>

      {/* Date Filter Section */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Period:</span>
          </div>
          
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilterValue(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors"
          >
            <option value="today">Today</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateFilter === 'custom' && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 font-medium">From</label>
                <DateInput
                  value={fromDate}
                  onChange={(e) => setFromDateValue(e.target.value)}
                  hideIcon
                />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 font-medium">To</label>
                <DateInput
                  value={toDate}
                  onChange={(e) => setToDateValue(e.target.value)}
                  hideIcon
                />
              </div>
              <button
                onClick={() => {
                  if (!fromDate || !toDate) {
                    toast.error('Select both from and to dates')
                    return
                  }
                  if (new Date(fromDate) > new Date(toDate)) {
                    toast.error('From date cannot be after To date')
                    return
                  }
                  setPage(1)
                  refetch()
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-medium shadow-lg hover:shadow-xl"
              >
                Apply
              </button>
            </>
          )}

          {dateFilter !== 'custom' && (
            <button
              onClick={() => refetch()}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-medium shadow-lg hover:shadow-xl"
            >
              Apply Filter
            </button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <EnquiryStatCard
          title="Total Enquiries"
          value={statsData.total || 0}
          icon={Target}
          gradient="from-blue-500 to-indigo-500"
        />
        <EnquiryStatCard
          title="Open"
          value={statsData.opened || 0}
          icon={Activity}
          gradient="from-red-500 to-orange-500"
        />
        <EnquiryStatCard
          title="Converted"
          value={statsData.converted || 0}
          icon={UserCheck}
          gradient="from-green-500 to-emerald-500"
        />
        <EnquiryStatCard
          title="Lost/Archived"
          value={statsData.archived || 0}
          icon={UserX}
          gradient="from-gray-500 to-gray-600"
        />
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`group px-4 py-2.5 rounded-xl transition-all font-medium flex items-center gap-2 ${
              showFilters || activeFilterCount > 0
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            <Filter className="w-5 h-5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 bg-white text-orange-600 rounded-full text-xs font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
          
          {selectedEnquiries.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <span className="text-sm font-semibold text-blue-700">
                {selectedEnquiries.length} selected
              </span>
              <button
                onClick={() => setSelectedEnquiries([])}
                className="p-1 hover:bg-blue-200 rounded transition-colors"
              >
                <X className="w-4 h-4 text-blue-600" />
              </button>
            </div>
          )}

          {selectedEnquiries.length > 0 && (
            <>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkAction(e.target.value)
                    e.target.value = ''
                  }
                }}
                className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white font-medium text-gray-700"
              >
                <option value="">Bulk Actions</option>
                <option value="archive">Archive Selected</option>
                <option value="staff-change">Change Staff</option>
              </select>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button className="px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button className="px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium flex items-center gap-2">
            <Archive className="w-4 h-4" />
            <span>Archive</span>
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Filter Enquiries</h3>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="text-sm text-orange-600 hover:text-orange-700 font-semibold"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setShowFilters(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Service</label>
              <select
                value={filters.service}
                onChange={(e) => setFilters({ ...filters, service: e.target.value })}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              >
                <option value="">All Services</option>
                {plansData?.data?.plans?.map((plan) => (
                  <option key={plan._id} value={plan._id}>{plan.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Lead Source</label>
              <select
                value={filters.leadSource}
                onChange={(e) => setFilters({ ...filters, leadSource: e.target.value })}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              >
                <option value="">All Sources</option>
                <option value="walk-in">Walk-in</option>
                <option value="referral">Referral</option>
                <option value="online">Online</option>
                <option value="social-media">Social Media</option>
                <option value="phone-call">Phone Call</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Enquiry Stage</label>
              <select
                value={filters.enquiryStage}
                onChange={(e) => setFilters({ ...filters, enquiryStage: e.target.value })}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              >
                <option value="">All Stages</option>
                <option value="opened">Opened</option>
                <option value="qualified">Qualified</option>
                <option value="demo">Demo</option>
                <option value="negotiation">Negotiation</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Call Tag</label>
              <select
                value={filters.callTag}
                onChange={(e) => setFilters({ ...filters, callTag: e.target.value })}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              >
                <option value="">All Tags</option>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Gender</label>
              <select
                value={filters.gender}
                onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              >
                <option value="">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Assigned Staff</label>
              <select
                value={filters.staffId}
                onChange={(e) => setFilters({ ...filters, staffId: e.target.value })}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              >
                <option value="">All Staff</option>
                {staffData?.data?.staff?.map((staff) => (
                  <option key={staff._id} value={staff._id}>
                    {staff.firstName} {staff.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Enquiries Table */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-12">
            <LoadingPage message="Loading enquiries..." fullScreen={false} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectedEnquiries.length === enquiries.length && enquiries.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">S.No</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Enquiry ID</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Service</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Lead Source</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Stage</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Call Status</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Call Tag</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Call Log</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Convert</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Staff</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Fitness</th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {enquiries.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 bg-gray-100 rounded-full">
                            <Search className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-gray-500 font-medium">No enquiries found</p>
                          <p className="text-sm text-gray-400">Try adjusting your filters or add a new enquiry</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    enquiries.map((enquiry, index) => {
                      const serialNumber = (pagination.page - 1) * limit + index + 1
                      const lastCallLog = enquiry.callLogs && enquiry.callLogs.length > 0 
                        ? enquiry.callLogs[enquiry.callLogs.length - 1] 
                        : null
                      
                      return (
                        <tr key={enquiry._id} className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all">
                          <td className="py-4 px-4">
                            <input
                              type="checkbox"
                              checked={selectedEnquiries.includes(enquiry._id)}
                              onChange={(e) => handleSelectEnquiry(enquiry._id, e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                            />
                          </td>
                          <td className="py-4 px-4 text-sm font-semibold text-gray-900">{serialNumber}</td>
                          <td className="py-4 px-4 text-sm text-gray-700 font-mono">{enquiry.enquiryId}</td>
                          <td className="py-4 px-4 text-sm text-gray-700">
                            {new Date(enquiry.date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-900 font-semibold">
                            <button
                              type="button"
                              className="text-orange-600 hover:text-orange-700 hover:underline"
                              onClick={() => handleShowDetails(enquiry._id)}
                            >
                              {enquiry.name}
                            </button>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700">{enquiry.serviceName || enquiry.service?.name || 'N/A'}</td>
                          <td className="py-4 px-4 text-sm text-gray-700 capitalize">
                            {enquiry.leadSource?.replace('-', ' ') || 'N/A'}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                              enquiry.enquiryStage === 'converted' ? 'bg-green-100 text-green-700' :
                              enquiry.enquiryStage === 'lost' || enquiry.enquiryStage === 'archived' ? 'bg-red-100 text-red-700' :
                              enquiry.enquiryStage === 'opened' || enquiry.enquiryStage === 'enquiry' ? 'bg-blue-100 text-blue-700' :
                              enquiry.enquiryStage === 'future-prospect' ? 'bg-purple-100 text-purple-700' :
                              enquiry.enquiryStage === 'not-interested' ? 'bg-gray-100 text-gray-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {enquiry.enquiryStage?.split('-').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700 capitalize">
                            {enquiry.lastCallStatus?.replace('-', ' ') || 'N/A'}
                          </td>
                          <td className="py-4 px-4">
                            {enquiry.callTag && (
                              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                                enquiry.callTag === 'hot' ? 'bg-red-100 text-red-700' :
                                enquiry.callTag === 'warm' ? 'bg-orange-100 text-orange-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {enquiry.callTag?.charAt(0).toUpperCase() + enquiry.callTag?.slice(1)}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => navigate(`/enquiries/${enquiry._id}/update-call`, { state: { from: location.pathname + location.search } })}
                                className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Add call log"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              {lastCallLog && (
                                <span className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-sm">
                                  LC
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {!enquiry.convertedToMember ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleConvertClick(enquiry)
                                }}
                                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-xs font-bold hover:from-orange-600 hover:to-red-600 transition-all shadow-sm hover:shadow-md cursor-pointer"
                              >
                                Invoice
                              </button>
                            ) : (
                              <span className="text-xs text-green-600 font-semibold">✓ Converted</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700">
                            {enquiry.assignedStaff ? 
                              `${enquiry.assignedStaff.firstName} ${enquiry.assignedStaff.lastName}` : 
                              'N/A'
                            }
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setShowFitnessLogModal(enquiry._id)}
                                className="p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                                title="Add fitness log"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button
                                className="p-2 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                                title="View fitness log"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => navigate(`/enquiries/${enquiry._id}/edit`)}
                                className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete this enquiry?')) {
                                    deleteMutation.mutate(enquiry._id)
                                  }
                                }}
                                className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {enquiries.length > 0 && (
              <div className="flex items-center justify-between border-t-2 border-gray-200 px-6 py-4 bg-gray-50">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="First page"
                  >
                    <ChevronsLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-gray-700">
                    Page <span className="text-orange-600">{pagination.page}</span> of <span className="text-orange-600">{pagination.pages}</span>
                  </span>
                  <form onSubmit={handleGoToPage} className="flex items-center gap-2">
                    <input
                      type="number"
                      name="page"
                      min="1"
                      max={pagination.pages}
                      defaultValue={page}
                      className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg text-center text-sm font-semibold focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Page"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all text-sm font-semibold shadow-sm"
                    >
                      Go
                    </button>
                  </form>
                  <span className="text-sm text-gray-600">
                    Total: <span className="font-semibold text-gray-900">{pagination.total}</span>
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= pagination.pages}
                    className="p-2 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Next page"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.pages)}
                    disabled={page >= pagination.pages}
                    className="p-2 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Last page"
                  >
                    <ChevronsRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddEnquiryModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showAppointmentModal && (
        <AppointmentModal
          isOpen={!!showAppointmentModal}
          onClose={() => setShowAppointmentModal(null)}
          enquiryId={showAppointmentModal}
        />
      )}

      {showDetailsModal && (
        <EnquiryDetailsModal
          enquiry={selectedEnquiryDetails}
          isLoading={isDetailsLoading}
          onClose={closeDetailsModal}
        />
      )}

      {/* Convert to Member Confirmation Modal */}
      {convertConfirm.open && createPortal(
        <div 
          id="convert-confirm-modal"
          className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConvertConfirm(initialConvertState)
            }
          }}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full mx-4 border border-gray-200 overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', zIndex: 100000, pointerEvents: 'auto' }}
          >
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-8 py-6 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-2xl font-black text-white leading-tight">
                  Add this person as a member?
                </h3>
              </div>
              <button
                onClick={() => setConvertConfirm(initialConvertState)}
                className="text-white hover:bg-white/20 transition-colors rounded-full p-2 flex-shrink-0 ml-4"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6 bg-gradient-to-br from-gray-50 to-white">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  Status:
                </label>
                <select
                  value={convertConfirm.status}
                  onChange={(e) => setConvertConfirm({ ...convertConfirm, status: e.target.value })}
                  className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-sm font-semibold shadow-sm hover:border-orange-300 transition-colors"
                >
                  <option value="opened">Opened</option>
                  <option value="qualified">Qualified</option>
                  <option value="demo">Demo</option>
                  <option value="negotiation">Sale</option>
                  <option value="converted">Converted</option>
                  <option value="lost">Lost</option>
                  <option value="enquiry">Enquiry</option>
                  <option value="future-prospect">Future Prospect</option>
                  <option value="not-interested">Not Interested</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  Comments:
                </label>
                <textarea
                  value={convertConfirm.comments}
                  onChange={(e) => setConvertConfirm({ ...convertConfirm, comments: e.target.value })}
                  rows={5}
                  maxLength={540}
                  placeholder="Enter your comments here (maximum 540 characters)..."
                  className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm resize-none font-medium shadow-sm hover:border-orange-300 transition-colors"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500 italic">(Comments will be saved in call log)</p>
                  <p className="text-xs font-semibold text-gray-400">{convertConfirm.comments.length}/540</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-gray-50 border-t-2 border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => setConvertConfirm(initialConvertState)}
                className="px-8 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-all shadow-sm hover:shadow-md"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertConfirm}
                disabled={convertToMemberMutation.isLoading}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              >
                {convertToMemberMutation.isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                <span>Yes</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function EnquiryStatCard({ title, value, icon: Icon, gradient }) {
  return (
    <div className="group relative bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-5 hover:shadow-lg transition-all overflow-hidden">
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} opacity-10 rounded-full -mr-12 -mt-12 group-hover:opacity-20 transition-opacity`}></div>
      
      <div className="relative">
        <div className={`p-3 bg-gradient-to-br ${gradient} rounded-xl inline-block mb-3 shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm font-semibold text-gray-600 mb-1">{title}</p>
        <p className="text-4xl font-black text-gray-900">{value}</p>
      </div>
    </div>
  )
}

function EnquiryDetailsModal({ enquiry, isLoading, onClose }) {
  const lastCallLog = enquiry?.callLogs?.length
    ? enquiry.callLogs[enquiry.callLogs.length - 1]
    : null

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatDateTime = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateWithTime = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const DetailRow = ({ label, value }) => (
    <div className="grid grid-cols-[160px_1fr] items-start">
      <span className="text-sm font-semibold text-gray-500">{label}</span>
      <span className="text-sm font-bold text-gray-900">{value || '-'}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Enquiry Snapshot</p>
            <h3 className="text-2xl font-black text-gray-900">
              {enquiry?.name || 'Loading...'}
            </h3>
            <p className="text-sm font-semibold text-orange-600 mt-1">
              {enquiry?.enquiryId || ''}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full border border-gray-200 p-2 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <div className="grid gap-4">
                  <DetailRow label="Member/Lead" value={enquiry?.isLead ? 'Lead' : 'Member'} />
                  <DetailRow label="E-mail" value={enquiry?.email || 'Not provided'} />
                  <DetailRow label="Customer type" value={enquiry?.customerType || 'Individual'} />
                  <DetailRow label="Enquiry type" value={(enquiry?.enquiryType || 'New').replace('-', ' ')} />
                  <DetailRow label="Contact Number" value={enquiry?.phone} />
                  <DetailRow label="Follow-up date" value={formatDateWithTime(enquiry?.expectedClosureDate)} />
                  <DetailRow
                    label="Created by"
                    value={
                      enquiry?.createdBy
                        ? `${enquiry.createdBy.firstName || ''} ${enquiry.createdBy.lastName || ''}`.trim()
                        : '-'
                    }
                  />
                  <DetailRow
                    label="Last Call Update"
                    value={
                      lastCallLog
                        ? `${lastCallLog.status || 'Update'} • ${formatDateTime(lastCallLog.date)}`
                        : 'No call logs yet'
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                    Lead Details
                  </p>
                  <DetailRow label="Service" value={enquiry?.serviceName || enquiry?.service?.name || 'N/A'} />
                  <DetailRow label="Lead Source" value={enquiry?.leadSource?.replace('-', ' ') || 'N/A'} />
                  <DetailRow label="Stage" value={enquiry?.enquiryStage?.replace('-', ' ') || 'N/A'} />
                </div>
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                    Owner
                  </p>
                  <DetailRow
                    label="Assigned Staff"
                    value={
                      enquiry?.assignedStaff
                        ? `${enquiry.assignedStaff.firstName || ''} ${enquiry.assignedStaff.lastName || ''}`.trim()
                        : 'Not assigned'
                    }
                  />
                  <DetailRow label="Status" value={enquiry?.lastCallStatus?.replace('-', ' ') || 'Not Called'} />
                  <DetailRow
                    label="Call Tag"
                    value={enquiry?.callTag ? enquiry.callTag.charAt(0).toUpperCase() + enquiry.callTag.slice(1) : 'N/A'}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )

  if (!isOpen) return null

  return createPortal(modalContent, document.body)
}
