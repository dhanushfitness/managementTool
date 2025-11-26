import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { 
  Search, 
  Download, 
  Mail, 
  Users,
  Filter, 
  Plus, 
  Eye, 
  Info, 
  Calendar,
  Dumbbell,
  Archive,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  User,
  X,
  AlertTriangle
} from 'lucide-react'
import LoadingTable from '../components/LoadingTable'
import LoadingPage from '../components/LoadingPage'
import ClientFilterModal from '../components/ClientFilterModal'
import Breadcrumbs from '../components/Breadcrumbs'
import { deleteMember } from '../api/members'

// Info Popup Component using Portal
function InfoPopup({ member }) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!isOpen || !buttonRef.current) return

    const updatePosition = () => {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.top - 8, // Position above the button
        left: rect.left + rect.width / 2 - 144 // Center the 288px (w-72) popup
      })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen])

  return (
    <>
      <div className="relative inline-flex">
        <button
          ref={buttonRef}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          className="w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
          title="Member information"
        >
          <Info className="w-3 h-3" />
        </button>
      </div>

      {isOpen &&
        createPortal(
          <div
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: `${position.top}px`,
              left: `${position.left}px`,
              transform: 'translateY(-100%)',
              zIndex: 9999,
              pointerEvents: 'auto'
            }}
            className="bg-white text-gray-800 text-xs rounded-lg shadow-2xl px-4 py-3 w-72 space-y-1 border border-gray-200"
          >
            <div className="flex justify-between font-semibold text-sm mb-2">
              <span>Status</span>
              <span className={`${member.membershipStatus === 'active' ? 'text-green-600' : 'text-gray-600'}`}>
                {member.membershipStatus ? member.membershipStatus.replace(/^\w/, c => c.toUpperCase()) : 'Unknown'}
              </span>
            </div>
            {member.currentPlan?.planName && (
              <p className="flex justify-between"><span className="text-gray-500">Current Plan</span> <span className="font-medium">{member.currentPlan.planName}</span></p>
            )}
            {member.currentPlan?.endDate && (
              <p className="flex justify-between"><span className="text-gray-500">Plan Expiry</span> <span>{new Date(member.currentPlan.endDate).toLocaleDateString('en-GB')}</span></p>
            )}
            {member.attendanceStats?.lastCheckIn && (
              <p className="flex justify-between"><span className="text-gray-500">Last Check-in</span> <span>{new Date(member.attendanceStats.lastCheckIn).toLocaleDateString('en-GB')}</span></p>
            )}
            <p className="flex justify-between"><span className="text-gray-500">Total Check-ins</span> <span>{member.attendanceStats?.totalCheckIns ?? 0}</span></p>
            {member.phone && (
              <p className="flex justify-between"><span className="text-gray-500">Phone</span> <span>{member.phone}</span></p>
            )}
            {member.email && (
              <p className="flex justify-between"><span className="text-gray-500">Email</span> <span className="truncate ml-2">{member.email}</span></p>
            )}
          </div>,
          document.body
        )}
    </>
  )
}

export default function Clients() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [selectedMembers, setSelectedMembers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null) // { member: {...}, show: true }
  const [filters, setFilters] = useState({
    service: '',
    ageGroup: '',
    memberManager: '',
    leadSource: '',
    serviceCategory: '',
    salesRep: '',
    generalTrainer: '',
    invoice: '',
    gender: []
  })
  
  // Get filter from URL params
  const searchParams = new URLSearchParams(location.search)
  const validityFilter = searchParams.get('type') || 'all'
  const filterType = searchParams.get('filter') || 'all'
  
  // Build breadcrumb based on filter
  const getBreadcrumbItems = () => {
    const baseItems = [
      { label: 'Home', to: '/' },
      { label: 'Clients', to: '/clients' }
    ]

    if (filterType === 'validity') {
      const validityBase = { label: 'Validity Based', to: '/clients?filter=validity&type=all' }
      if (validityFilter === 'active') {
        return [...baseItems, validityBase, { label: 'Active Clients' }]
      }
      if (validityFilter === 'inactive') {
        return [...baseItems, validityBase, { label: 'Inactive Clients' }]
      }
      return [...baseItems, validityBase, { label: 'All Clients' }]
    }

    return [...baseItems, { label: 'All Members' }]
  }

  const breadcrumbItems = getBreadcrumbItems()
  
  // Build query params
  const queryParams = {
    page,
    limit,
    search: searchQuery || undefined
  }
  
  // Add status filter based on validity type
  if (filterType === 'validity' && validityFilter !== 'all') {
    if (validityFilter === 'active') {
      queryParams.membershipStatus = 'active'
    } else if (validityFilter === 'inactive') {
      queryParams.membershipStatus = 'inactive'
    }
  }

  // Add advanced filters
  if (filters.service) queryParams.service = filters.service
  if (filters.ageGroup) queryParams.ageGroup = filters.ageGroup
  if (filters.memberManager) queryParams.memberManager = filters.memberManager
  if (filters.leadSource) queryParams.leadSource = filters.leadSource
  if (filters.serviceCategory) queryParams.serviceCategory = filters.serviceCategory
  if (filters.salesRep) queryParams.salesRep = filters.salesRep
  if (filters.generalTrainer) queryParams.generalTrainer = filters.generalTrainer
  if (filters.invoice) queryParams.invoice = filters.invoice
  if (filters.gender && filters.gender.length > 0) {
    queryParams.gender = filters.gender.join(',')
  }

  // Fetch members
  const { data, isLoading } = useQuery({
    queryKey: ['members', queryParams],
    queryFn: () => api.get('/members', { params: queryParams }).then(res => res.data)
  })

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['member-stats'],
    queryFn: () => api.get('/members/stats').then(res => res.data),
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  })

  // Fetch plans for filter dropdown
  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans').then(res => res.data),
    enabled: true
  })

  // Fetch staff for filter dropdowns
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff').then(res => res.data),
    enabled: true
  })

  const members = data?.members || []
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 }
  const stats = statsData?.stats || {}

  // Calculate stats based on current filter
  const getDisplayStats = () => {
    if (filterType === 'validity' && validityFilter === 'active') {
      return {
        total: stats.active || 0,
        active: stats.active || 0,
        inactive: 0
      }
    } else if (filterType === 'validity' && validityFilter === 'inactive') {
      return {
        total: stats.inactive || 0,
        active: 0,
        inactive: stats.inactive || 0
      }
    }
    return {
      total: stats.total || 0,
      active: stats.active || 0,
      inactive: stats.inactive || 0
    }
  }

  const displayStats = getDisplayStats()

  // Delete member mutation
  const deleteMemberMutation = useMutation({
    mutationFn: (memberId) => deleteMember(memberId),
    onSuccess: (response) => {
      const deletedRecords = response.data?.deletedRecords || {}
      const recordCount = Object.values(deletedRecords).reduce((sum, count) => sum + count, 0)
      
      toast.success(
        `Member and ${recordCount} related records deleted successfully`,
        { duration: 5000 }
      )
      
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries(['members'])
      queryClient.invalidateQueries(['member-stats'])
      
      setDeleteConfirmModal(null)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete member')
    }
  })

  const memberHasActivePlan = (member) => {
    if (member.membershipStatus !== 'active') return false
    if (!member.currentPlan?.endDate) return true
    return new Date(member.currentPlan.endDate) >= new Date()
  }

  const handleDeleteClick = (member) => {
    if (memberHasActivePlan(member)) {
      toast.error('Cannot delete member while an active membership is running')
      return
    }
    setDeleteConfirmModal({ member, show: true })
  }

  const handleDeleteConfirm = () => {
    if (deleteConfirmModal?.member?._id) {
      deleteMemberMutation.mutate(deleteConfirmModal.member._id)
    }
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedMembers(members.map(m => m._id))
    } else {
      setSelectedMembers([])
    }
  }

  const handleSelectMember = (memberId, checked) => {
    if (checked) {
      setSelectedMembers([...selectedMembers, memberId])
    } else {
      setSelectedMembers(selectedMembers.filter(id => id !== memberId))
    }
  }

  const handlePageChange = (newPage) => {
    setPage(newPage)
  }

  const handleGoToPage = (e) => {
    e.preventDefault()
    const pageInput = e.target.elements.page.value
    const pageNum = parseInt(pageInput)
    if (pageNum >= 1 && pageNum <= pagination.pages) {
      setPage(pageNum)
    }
  }

  const handleExport = async () => {
    try {
      toast.success('Export functionality coming soon')
    } catch (error) {
      toast.error('Failed to export clients')
    }
  }

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    setPage(1) // Reset to first page when filters change
  }

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters)
    setPage(1)
    queryClient.invalidateQueries(['members'])
  }

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(value => {
    if (Array.isArray(value)) return value.length > 0
    return value !== ''
  })

  return (
    <div className="space-y-6">
      {/* Top Section - Improved Structure */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-6">
        {/* Breadcrumb and Title */}
        <div className="mb-6">
          <Breadcrumbs items={breadcrumbItems} className="mb-2" />
          <h1 className="text-3xl font-bold text-gray-900">All Members</h1>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border-2 border-orange-200 p-6 shadow-sm hover:shadow-lg transition-all group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/40 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Total Members</p>
                <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Users className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-4xl font-black text-orange-600">{displayStats.total}</p>
            </div>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border-2 border-green-200 p-6 shadow-sm hover:shadow-lg transition-all group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/40 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Active Members</p>
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <User className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-4xl font-black text-green-600">{displayStats.active}</p>
            </div>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border-2 border-red-200 p-6 shadow-sm hover:shadow-lg transition-all group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/40 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Inactive Members</p>
                <div className="p-2 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Archive className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-4xl font-black text-red-600">{displayStats.inactive}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end">
          <button className="px-5 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all font-semibold border-2 border-gray-300 shadow-sm">
            Import Member Details
          </button>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-4">
        <div className="flex items-center justify-between">
          {/* Left Side - Filters and Controls */}
          <div className="flex items-center space-x-3">
            <select 
              value={validityFilter === 'all' ? 'all-clients' : validityFilter}
              onChange={(e) => {
                const value = e.target.value === 'all-clients' ? 'all' : e.target.value
                navigate(`/clients?filter=validity&type=${value}`)
                setPage(1)
              }}
              className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-sm font-semibold text-gray-700 transition-all"
            >
              <option value="all-clients">All Clients</option>
              <option value="active">Active Clients</option>
              <option value="inactive">Inactive Clients</option>
            </select>
            
            <select className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-sm font-semibold text-gray-700 transition-all">
              <option>Mailer list</option>
            </select>

            <button 
              onClick={() => setShowFilterModal(true)}
              className={`p-2.5 rounded-xl transition-all relative ${
                hasActiveFilters 
                  ? 'bg-orange-100 text-orange-700 border-2 border-orange-300 shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-200'
              }`}
              title="Filter clients"
            >
              <Filter className="w-5 h-5" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white"></span>
              )}
            </button>

            <select className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-sm font-semibold text-gray-700 transition-all">
              <option>Communicate</option>
              <option>Send Email</option>
              <option>Send SMS</option>
            </select>
          </div>

          {/* Right Side - Action Buttons */}
          <div className="flex items-center space-x-3">
            <button className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold shadow-lg hover:shadow-xl text-sm flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Add to Mailer
            </button>
            <button
              onClick={handleExport}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold shadow-lg hover:shadow-xl flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export Clients</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pagination Bar - Top */}
      <div className="flex items-center justify-between bg-white rounded-2xl border-2 border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(1)}
            disabled={page === 1}
            className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-2 border-transparent hover:border-gray-200"
            title="First page"
          >
            <ChevronsLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-2 border-transparent hover:border-gray-200"
            title="Previous page"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm font-semibold text-gray-900">
            Page {pagination.page} of {pagination.pages}
          </span>
          <form onSubmit={handleGoToPage} className="flex items-center space-x-2">
            <input
              type="number"
              name="page"
              min="1"
              max={pagination.pages}
              defaultValue={page}
              className="w-16 px-2 py-1.5 border-2 border-gray-200 rounded-lg text-center text-sm font-semibold focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all text-sm font-semibold shadow-md"
            >
              Go
            </button>
          </form>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= pagination.pages}
            className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-2 border-transparent hover:border-gray-200"
            title="Next page"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => handlePageChange(pagination.pages)}
            disabled={page >= pagination.pages}
            className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-2 border-transparent hover:border-gray-200"
            title="Last page"
          >
            <ChevronsRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-12">
            <LoadingPage message="Loading members..." fullScreen={false} />
          </div>
        ) : (
          <div className="overflow-x-auto" style={{ overflowY: 'visible' }}>
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left py-4 px-4">
                    <input
                      type="checkbox"
                      checked={selectedMembers.length === members.length && members.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-2 border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                  </th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Profile</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Billing</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Service Card</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Attendance ID/Checkin</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Call Log</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Info</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Training</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Archive</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Delete</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      No members found
                    </td>
                  </tr>
                ) : (
                  members.map((member) => {
                    const hasCallLog = member.callLogs && member.callLogs.length > 0
                    const hasMeeting = false // TODO: Implement meeting tracking
                    
                    // Check if member is expired with no active membership plan
                    const isExpiredNoActivePlan = () => {
                      // Check if membership status is expired
                      if (member.membershipStatus === 'expired') {
                        return true
                      }
                      
                      // Check if currentPlan exists and endDate is in the past
                      if (member.currentPlan?.endDate) {
                        const endDate = new Date(member.currentPlan.endDate)
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        endDate.setHours(0, 0, 0, 0)
                        
                        // If endDate is in the past and membership is not active
                        if (endDate < today && member.membershipStatus !== 'active') {
                          return true
                        }
                      }
                      
                      // If no currentPlan exists and membership is not active
                      if (!member.currentPlan && member.membershipStatus !== 'active') {
                        return true
                      }
                      
                      return false
                    }
                    
                    const isExpired = isExpiredNoActivePlan()
                    
                    return (
                      <tr 
                        key={member._id} 
                        className={`transition-all ${isExpired ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50'}`}
                      >
                        <td className="py-4 px-4">
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member._id)}
                            onChange={(e) => handleSelectMember(member._id, e.target.checked)}
                            className="rounded border-2 border-gray-300 text-orange-500 focus:ring-orange-500"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            {member.profilePicture ? (
                              <img 
                                src={member.profilePicture} 
                                alt={`${member.firstName} ${member.lastName}`}
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-2 border-gray-200">
                                <User className="w-6 h-6 text-gray-500" />
                              </div>
                            )}
                            <Link 
                              to={`/clients/${member._id}`}
                              className="font-bold text-orange-600 hover:text-orange-700 hover:underline"
                            >
                              {member.firstName?.toUpperCase()} {member.lastName?.toUpperCase()}
                            </Link>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <button className="text-orange-600 hover:text-orange-700 font-semibold hover:underline">
                            Payments
                          </button>
                        </td>
                        <td className="py-4 px-4">
                          <Link
                            to={`/clients/${member._id}?tab=service-card`}
                            className="text-orange-600 hover:text-orange-700 font-semibold hover:underline"
                          >
                            View
                          </Link>
                        </td>
                        <td className="py-4 px-4 text-sm font-medium text-gray-600">
                          {member.memberId || '-'}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-1.5">
                            <button
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-all border border-transparent hover:border-orange-200"
                              title="Add call log"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            {hasCallLog && (
                              <span className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                                LC
                              </span>
                            )}
                            {hasMeeting && (
                              <span className="w-6 h-6 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                                M
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <InfoPopup member={member} />
                        </td>
                        <td className="py-4 px-4">
                          <button className="text-orange-600 hover:text-orange-700 font-semibold hover:underline">
                            View
                          </button>
                        </td>
                        <td className="py-4 px-4">
                          <button className="text-orange-600 hover:text-orange-700 font-semibold hover:underline">
                            Archive
                          </button>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => handleDeleteClick(member)}
                            disabled={memberHasActivePlan(member)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-transparent hover:border-red-200"
                            title={memberHasActivePlan(member) ? 'Active membership in progress. End the plan before deleting.' : 'Delete member and all records'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Pagination Bar - Bottom */}
      <div className="flex items-center justify-between bg-white rounded-2xl border-2 border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(1)}
            disabled={page === 1}
            className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-2 border-transparent hover:border-gray-200"
            title="First page"
          >
            <ChevronsLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-2 border-transparent hover:border-gray-200"
            title="Previous page"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm font-semibold text-gray-900">
            Page {pagination.page} of {pagination.pages}
          </span>
          <form onSubmit={handleGoToPage} className="flex items-center space-x-2">
            <input
              type="number"
              name="page"
              min="1"
              max={pagination.pages}
              defaultValue={page}
              className="w-16 px-2 py-1.5 border-2 border-gray-200 rounded-lg text-center text-sm font-semibold focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all text-sm font-semibold shadow-md"
            >
              Go
            </button>
          </form>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= pagination.pages}
            className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-2 border-transparent hover:border-gray-200"
            title="Next page"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => handlePageChange(pagination.pages)}
            disabled={page >= pagination.pages}
            className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-2 border-transparent hover:border-gray-200"
            title="Last page"
          >
            <ChevronsRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Filter Modal */}
      <ClientFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        onApply={handleApplyFilters}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal?.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-gray-200">
            <div className="p-6">
              <div className="flex items-start space-x-4 mb-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center border-2 border-red-300">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-gray-900 mb-2">
                    Delete Member Permanently?
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    This will permanently delete <strong>{deleteConfirmModal.member?.firstName} {deleteConfirmModal.member?.lastName}</strong> and <strong>ALL</strong> their related records including:
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1 mb-4 list-disc list-inside">
                    <li>All Invoices</li>
                    <li>All Payments</li>
                    <li>All Attendance Records</li>
                    <li>All Call Logs</li>
                    <li>All Follow-ups</li>
                    <li>All Appointments</li>
                    <li>All Referrals</li>
                    <li>And other related data</li>
                  </ul>
                  <p className="text-sm font-bold text-red-600">
                    This action cannot be undone!
                  </p>
                </div>
                <button
                  onClick={() => setDeleteConfirmModal(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setDeleteConfirmModal(null)}
                  disabled={deleteMemberMutation.isPending}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteMemberMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold shadow-lg"
                >
                  {deleteMemberMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Permanently</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
