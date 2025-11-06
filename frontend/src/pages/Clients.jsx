import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { 
  Search, 
  Download, 
  Mail, 
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
  User
} from 'lucide-react'
import LoadingTable from '../components/LoadingTable'
import LoadingPage from '../components/LoadingPage'
import ClientFilterModal from '../components/ClientFilterModal'

export default function Clients() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [selectedMembers, setSelectedMembers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [filters, setFilters] = useState({
    service: '',
    ageGroup: '',
    memberManager: '',
    leadSource: '',
    serviceCategory: '',
    behaviourBased: '',
    fitnessGoal: '',
    serviceVariation: '',
    salesRep: '',
    generalTrainer: '',
    invoice: '',
    purchaseType: '',
    customGroups: '',
    gender: []
  })
  
  // Get filter from URL params
  const searchParams = new URLSearchParams(location.search)
  const validityFilter = searchParams.get('type') || 'all'
  const filterType = searchParams.get('filter') || 'all'
  
  // Build breadcrumb based on filter
  const getBreadcrumb = () => {
    if (filterType === 'validity') {
      if (validityFilter === 'active') {
        return { path: 'Home / Clients / Validity Based / Active Clients', active: 'Active Clients' }
      } else if (validityFilter === 'inactive') {
        return { path: 'Home / Clients / Validity Based / Inactive Clients', active: 'Inactive Clients' }
      }
      return { path: 'Home / Clients / Validity Based / All Clients', active: 'All Clients' }
    }
    return { path: 'Home / Clients / All Members', active: 'All Members' }
  }

  const breadcrumb = getBreadcrumb()
  
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
  if (filters.behaviourBased) queryParams.behaviourBased = filters.behaviourBased
  if (filters.fitnessGoal) queryParams.fitnessGoal = filters.fitnessGoal
  if (filters.serviceVariation) queryParams.serviceVariation = filters.serviceVariation
  if (filters.salesRep) queryParams.salesRep = filters.salesRep
  if (filters.generalTrainer) queryParams.generalTrainer = filters.generalTrainer
  if (filters.invoice) queryParams.invoice = filters.invoice
  if (filters.purchaseType) queryParams.purchaseType = filters.purchaseType
  if (filters.customGroups) queryParams.customGroups = filters.customGroups
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Breadcrumb and Title */}
        <div className="mb-6">
          <nav className="text-sm mb-2">
            {breadcrumb.path.split(' / ').map((segment, index, array) => (
              <span key={index}>
                {index === array.length - 1 ? (
                  <span className="text-orange-600 font-medium">{segment}</span>
                ) : (
                  <>
                    <span className="text-gray-600">{segment}</span>
                    <span className="text-gray-400 mx-2">/</span>
                  </>
                )}
              </span>
            ))}
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">All Members</h1>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 p-6">
            <p className="text-sm text-gray-600 mb-2 font-medium">Total Members</p>
            <p className="text-4xl font-bold text-orange-600">{displayStats.total}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-6">
            <p className="text-sm text-gray-600 mb-2 font-medium">Active Members</p>
            <p className="text-4xl font-bold text-green-600">{displayStats.active}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 p-6">
            <p className="text-sm text-gray-600 mb-2 font-medium">Inactive Members</p>
            <p className="text-4xl font-bold text-red-600">{displayStats.inactive}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end">
          <button className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
            Import Member Details
          </button>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
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
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700"
            >
              <option value="all-clients">All Clients</option>
              <option value="active">Active Clients</option>
              <option value="inactive">Inactive Clients</option>
            </select>
            
            <select className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700">
              <option>Mailer list</option>
            </select>

            <button 
              onClick={() => setShowFilterModal(true)}
              className={`p-2.5 rounded-lg transition-colors relative ${
                hasActiveFilters 
                  ? 'bg-orange-100 text-orange-700 border-2 border-orange-300' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
              title="Filter clients"
            >
              <Filter className="w-5 h-5" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white"></span>
              )}
            </button>

            <select className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700">
              <option>Communicate</option>
              <option>Send Email</option>
              <option>Send SMS</option>
            </select>
          </div>

          {/* Right Side - Action Buttons */}
          <div className="flex items-center space-x-3">
            <button className="px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm">
              Add to Mailer
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center space-x-2 text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export Clients</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pagination Bar - Top */}
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

      {/* Members Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-12">
            <LoadingPage message="Loading members..." fullScreen={false} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedMembers.length === members.length && members.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Profile</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Billing</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Service Card</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Attendance ID/Checkin</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Call Log</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Info</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Appointment</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Training</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Archive</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Delete</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                      No members found
                    </td>
                  </tr>
                ) : (
                  members.map((member) => {
                    const hasCallLog = member.callLogs && member.callLogs.length > 0
                    const hasMeeting = false // TODO: Implement meeting tracking
                    
                    return (
                      <tr key={member._id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member._id)}
                            onChange={(e) => handleSelectMember(member._id, e.target.checked)}
                            className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            {member.profilePicture ? (
                              <img 
                                src={member.profilePicture} 
                                alt={`${member.firstName} ${member.lastName}`}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <Link 
                              to={`/clients/${member._id}`}
                              className="font-medium text-orange-600 hover:text-orange-700 hover:underline"
                            >
                              {member.firstName?.toUpperCase()} {member.lastName?.toUpperCase()}
                            </Link>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <button className="text-orange-600 hover:text-orange-700 font-medium">
                            Payments
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            to={`/clients/${member._id}?tab=service-card`}
                            className="text-orange-600 hover:text-orange-700 font-medium hover:underline"
                          >
                            View
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {member.memberId || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1.5">
                            <button
                              className="p-1 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                              title="Add call log"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            {hasCallLog && (
                              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                LC
                              </span>
                            )}
                            {hasMeeting && (
                              <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                M
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            className="w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
                            title="Member information"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <button className="text-orange-600 hover:text-orange-700 font-medium">
                            View
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <button className="text-orange-600 hover:text-orange-700 font-medium">
                            View
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <button className="text-orange-600 hover:text-orange-700 font-medium">
                            Archive
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete member"
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

      {/* Filter Modal */}
      <ClientFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        onApply={handleApplyFilters}
      />
    </div>
  )
}
