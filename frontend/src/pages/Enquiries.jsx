import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
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
  Activity
} from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import LoadingTable from '../components/LoadingTable'
import AddEnquiryModal from '../components/AddEnquiryModal'
import CallLogModal from '../components/CallLogModal'
import AppointmentModal from '../components/AppointmentModal'

export default function Enquiries() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [dateFilter, setDateFilter] = useState('last30days')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedEnquiries, setSelectedEnquiries] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCallLogModal, setShowCallLogModal] = useState(null)
  const [showAppointmentModal, setShowAppointmentModal] = useState(null)
  const [showFitnessLogModal, setShowFitnessLogModal] = useState(null)
  const [showEditModal, setShowEditModal] = useState(null)
  
  // Filter states
  const [filters, setFilters] = useState({
    enquiryStage: '',
    leadSource: '',
    service: '',
    gender: '',
    callTag: '',
    staffId: ''
  })

  // Build query params
  const queryParams = {
    page,
    limit,
    dateFilter,
    ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
  }

  // Fetch enquiries
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['enquiries', queryParams],
    queryFn: () => api.get('/enquiries', { params: queryParams }).then(res => res.data)
  })

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['enquiry-stats', dateFilter],
    queryFn: () => api.get('/enquiries/stats', { params: { dateFilter } }).then(res => res.data)
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

  const convertToMemberMutation = useMutation({
    mutationFn: ({ enquiryId, planId }) => 
      api.post(`/enquiries/${enquiryId}/convert`, { planId }),
    onSuccess: () => {
      toast.success('Enquiry converted to member successfully')
      queryClient.invalidateQueries(['enquiries'])
      queryClient.invalidateQueries(['enquiry-stats'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to convert enquiry')
    }
  })

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

  const addCallLogMutation = useMutation({
    mutationFn: ({ enquiryId, ...data }) => 
      api.post(`/enquiries/${enquiryId}/call-log`, data),
    onSuccess: () => {
      toast.success('Call log added successfully')
      setShowCallLogModal(null)
      queryClient.invalidateQueries(['enquiries'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add call log')
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

  const enquiries = data?.enquiries || []
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 }
  const statsData = stats?.stats || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <nav className="text-sm mb-2">
          <span className="text-gray-600">Home / </span>
          <span className="text-orange-600 font-medium">Enquiries</span>
        </nav>
        <h1 className="text-3xl font-bold text-gray-900">All Enquiries</h1>
      </div>

      {/* Top Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
          >
            <option value="today">Today</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="custom">Custom Date Range</option>
          </select>
          <button
            onClick={() => refetch()}
            className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Go
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Import Enquiry</span>
          </button>
          <button className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
            Enquiry Archive
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4">
        {/* Enquiries Summary Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Enquiries - {statsData.total || 0}
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Open</p>
              <p className="text-3xl font-bold text-red-600">{statsData.opened || 0}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Converted</p>
              <p className="text-3xl font-bold text-green-600">{statsData.converted || 0}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Archived/Lost</p>
              <p className="text-3xl font-bold text-gray-600">{statsData.archived || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            title="Filter"
          >
            <Filter className="w-5 h-5" />
          </button>
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleBulkAction(e.target.value)
                e.target.value = ''
              }
            }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
          >
            <option value="">Action</option>
            <option value="archive">Move to Archive</option>
            <option value="staff-change">Staff Change</option>
          </select>
          <select
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
          >
            <option>Communicate</option>
            <option>Send Email</option>
            <option>Send SMS</option>
          </select>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Export Enquiries</span>
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Service</label>
            <select
              value={filters.service}
              onChange={(e) => setFilters({ ...filters, service: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All Services</option>
              {plansData?.data?.plans?.map((plan) => (
                <option key={plan._id} value={plan._id}>{plan.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Lead Source</label>
            <select
              value={filters.leadSource}
              onChange={(e) => setFilters({ ...filters, leadSource: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
            <label className="block text-sm font-medium mb-2 text-gray-700">Enquiry Stage</label>
            <select
              value={filters.enquiryStage}
              onChange={(e) => setFilters({ ...filters, enquiryStage: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
            <label className="block text-sm font-medium mb-2 text-gray-700">Gender</label>
            <select
              value={filters.gender}
              onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(1)}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="First page"
          >
            <ChevronsLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-700">
            Page {pagination.page} of {pagination.pages}
          </span>
          <form onSubmit={handleGoToPage} className="flex items-center space-x-2">
            <input
              type="number"
              name="page"
              min="1"
              max={pagination.pages}
              defaultValue={page}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
            />
            <button
              type="submit"
              className="px-4 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              Go
            </button>
          </form>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= pagination.pages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => handlePageChange(pagination.pages)}
            disabled={page >= pagination.pages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Last page"
          >
            <ChevronsRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Enquiries Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-12">
            <LoadingPage message="Loading enquiries..." fullScreen={false} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedEnquiries.length === enquiries.length && enquiries.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">S.No</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Enquiry ID</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Service</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Lead Source</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Enquiry Stage</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Call Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Call Tag</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Call log</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Convert to member</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Other Appointment</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Staff</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Fitness Log</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {enquiries.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="px-4 py-8 text-center text-gray-500">
                      No enquiries found
                    </td>
                  </tr>
                ) : (
                  enquiries.map((enquiry, index) => {
                    const serialNumber = (pagination.page - 1) * limit + index + 1
                    const lastCallLog = enquiry.callLogs && enquiry.callLogs.length > 0 
                      ? enquiry.callLogs[enquiry.callLogs.length - 1] 
                      : null
                    const hasAppointments = false // TODO: Fetch appointments count
                    
                    return (
                      <tr key={enquiry._id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedEnquiries.includes(enquiry._id)}
                            onChange={(e) => handleSelectEnquiry(enquiry._id, e.target.checked)}
                            className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">{serialNumber}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{enquiry.enquiryId}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {new Date(enquiry.date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                          {enquiry.name}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">{enquiry.serviceName || 'N/A'}</td>
                        <td className="py-3 px-4 text-sm text-gray-900 capitalize">
                          {enquiry.leadSource?.replace('-', ' ') || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            enquiry.enquiryStage === 'converted' ? 'bg-green-100 text-green-800' :
                            enquiry.enquiryStage === 'lost' || enquiry.enquiryStage === 'archived' ? 'bg-red-100 text-red-800' :
                            enquiry.enquiryStage === 'opened' || enquiry.enquiryStage === 'enquiry' ? 'bg-blue-100 text-blue-800' :
                            enquiry.enquiryStage === 'future-prospect' ? 'bg-purple-100 text-purple-800' :
                            enquiry.enquiryStage === 'not-interested' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {enquiry.enquiryStage?.split('-').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 capitalize">
                          {enquiry.lastCallStatus?.replace('-', ' ') || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          {enquiry.callTag && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              enquiry.callTag === 'hot' ? 'bg-red-100 text-red-800' :
                              enquiry.callTag === 'warm' ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {enquiry.callTag?.charAt(0).toUpperCase() + enquiry.callTag?.slice(1)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => setShowCallLogModal(enquiry._id)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Add call log"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            {lastCallLog && (
                              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                LC
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {!enquiry.convertedToMember ? (
                            <button
                              onClick={() => {
                                const planId = prompt('Enter plan ID (optional)')
                                convertToMemberMutation.mutate({ 
                                  enquiryId: enquiry._id, 
                                  planId: planId || undefined 
                                })
                              }}
                              className="px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-medium hover:bg-orange-600 transition-colors"
                            >
                              Invoice
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500">Converted</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setShowAppointmentModal(enquiry._id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Add appointment"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {enquiry.assignedStaff ? 
                            `${enquiry.assignedStaff.firstName} ${enquiry.assignedStaff.lastName}` : 
                            'N/A'
                          }
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setShowFitnessLogModal(enquiry._id)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Add fitness log"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                              title="View fitness log"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                // Navigate to edit or open edit modal
                                const newName = prompt('Enter new name:', enquiry.name)
                                if (newName && newName !== enquiry.name) {
                                  api.put(`/enquiries/${enquiry._id}`, { name: newName })
                                    .then(() => {
                                      toast.success('Enquiry updated')
                                      queryClient.invalidateQueries(['enquiries'])
                                    })
                                    .catch(() => toast.error('Failed to update enquiry'))
                                }
                              }}
                              className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
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
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
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
        )}
      </div>

      {/* Add Enquiry Modal */}
      {showAddModal && (
        <AddEnquiryModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Call Log Modal */}
      {showCallLogModal && (
        <CallLogModal
          isOpen={!!showCallLogModal}
          onClose={() => setShowCallLogModal(null)}
          enquiryId={showCallLogModal}
        />
      )}

      {/* Appointment Modal */}
      {showAppointmentModal && (
        <AppointmentModal
          isOpen={!!showAppointmentModal}
          onClose={() => setShowAppointmentModal(null)}
          enquiryId={showAppointmentModal}
        />
      )}
    </div>
  )
}
