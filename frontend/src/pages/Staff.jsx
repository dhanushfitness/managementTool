import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getStaff, deleteStaff, updateStaff } from '../api/staff'
import LoadingPage from '../components/LoadingPage'
import toast from 'react-hot-toast'
import {
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Settings,
  Target,
  UserCheck,
} from 'lucide-react'

export default function Staff() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [communicateFilter, setCommunicateFilter] = useState('all')
  const [designationFilter, setDesignationFilter] = useState('all')
  const [adminRightsFilter, setAdminRightsFilter] = useState('all')
  const [selectedStaff, setSelectedStaff] = useState([])

  const { data, isLoading } = useQuery({
    queryKey: ['staff', page, search, communicateFilter, designationFilter, adminRightsFilter],
    queryFn: () => getStaff({
      page,
      limit: 20,
      search,
      employmentStatus: communicateFilter !== 'all' ? communicateFilter : undefined,
      category: designationFilter !== 'all' ? designationFilter : undefined,
      adminRights: adminRightsFilter !== 'all' ? adminRightsFilter : undefined
    }).then(res => res.data)
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteStaff(id),
    onSuccess: () => {
      toast.success('Staff deleted successfully')
      queryClient.invalidateQueries(['staff'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete staff')
    }
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, loginAccess, isActive }) => updateStaff(id, { loginAccess, isActive }),
    onSuccess: () => {
      toast.success('Staff status updated successfully')
      queryClient.invalidateQueries(['staff'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update staff status')
    }
  })

  const handleToggleActive = (member) => {
    const newLoginAccess = !(member.loginAccess !== false)
    const newIsActive = !(member.isActive !== false)
    toggleActiveMutation.mutate({
      id: member._id,
      loginAccess: newLoginAccess,
      isActive: newIsActive
    })
  }

  const handleDelete = (staffId) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      deleteMutation.mutate(staffId)
    }
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedStaff(data?.staff?.map(s => s._id) || [])
    } else {
      setSelectedStaff([])
    }
  }

  const handleSelectStaff = (staffId, checked) => {
    if (checked) {
      setSelectedStaff([...selectedStaff, staffId])
    } else {
      setSelectedStaff(selectedStaff.filter(id => id !== staffId))
    }
  }

  const staff = data?.staff || []
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 }

  const getAdminRightsLabel = (adminRights) => {
    if (adminRights === 'full') return 'Master Admin'
    if (adminRights === 'limited') return 'Limited Admin'
    return 'Sales'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm">
        <span className="text-gray-600">Home</span>
        <span className="text-gray-400 mx-2">/</span>
        <span className="text-orange-600 font-medium">Staff Management</span>
      </nav>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Staff Name / Mail"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <select
            value={communicateFilter}
            onChange={(e) => {
              setCommunicateFilter(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700"
          >
            <option value="all">Communicate</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={designationFilter}
            onChange={(e) => {
              setDesignationFilter(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700"
          >
            <option value="all">Designation</option>
            <option value="trainer">Trainer</option>
            <option value="receptionist">Receptionist</option>
            <option value="manager">Manager</option>
            <option value="accountant">Accountant</option>
            <option value="maintenance">Maintenance</option>
            <option value="other">Other</option>
          </select>

          <select
            value={adminRightsFilter}
            onChange={(e) => {
              setAdminRightsFilter(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700"
          >
            <option value="all">Admin Rights</option>
            <option value="full">Master Admin</option>
            <option value="limited">Limited Admin</option>
            <option value="none">Sales</option>
          </select>

          <button
            onClick={() => {
              setSearch('')
              setCommunicateFilter('all')
              setDesignationFilter('all')
              setAdminRightsFilter('all')
              setPage(1)
            }}
            className="px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm"
          >
            Go
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Pagination - Top */}
        {staff.length > 0 && (
          <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-4 py-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="First page"
              >
                <ChevronsLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="text-sm text-gray-700">
              Page {pagination.page} of {pagination.pages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.pages}
                className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setPage(pagination.pages)}
                disabled={page >= pagination.pages}
                className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Last page"
              >
                <ChevronsRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-12">
            <LoadingPage message="Loading staff..." fullScreen={false} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedStaff.length === staff.length && staff.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">S.No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Staff ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Staff Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Mail</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Active</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Admin Rights</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Target</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Rep Change</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                      No staff members found
                    </td>
                  </tr>
                ) : (
                  staff.map((member, index) => (
                    <tr key={member._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedStaff.includes(member._id)}
                          onChange={(e) => handleSelectStaff(member._id, e.target.checked)}
                          className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(page - 1) * 20 + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member._id.toString().slice(-5)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/staff/${member._id}`)}
                          className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline"
                        >
                          {member.firstName} {member.lastName}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {member.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleToggleActive(member)}
                            disabled={toggleActiveMutation.isLoading}
                            className="relative inline-flex items-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title={member.loginAccess !== false && member.isActive !== false ? 'Click to deactivate' : 'Click to activate'}
                          >
                            <div className={`w-11 h-6 rounded-full transition-colors ${
                              member.loginAccess !== false && member.isActive !== false 
                                ? 'bg-green-500' 
                                : 'bg-gray-300'
                            }`}>
                              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                member.loginAccess !== false && member.isActive !== false 
                                  ? 'transform translate-x-5' 
                                  : 'transform translate-x-0'
                              }`}></div>
                            </div>
                          </button>
                          <span className={`text-xs font-medium ${
                            member.loginAccess !== false && member.isActive !== false 
                              ? 'text-green-600' 
                              : 'text-gray-500'
                          }`}>
                            {member.loginAccess !== false && member.isActive !== false ? 'ON' : 'OFF'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/staff/${member._id}/admin-rights`)}
                          className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline"
                        >
                          {getAdminRightsLabel(member.adminRights)}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/staff/${member._id}/targets`)}
                          className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/staff/${member._id}/rep-change`)}
                          className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline"
                        >
                          Change
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(member._id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete staff"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination - Bottom */}
        {staff.length > 0 && (
          <div className="flex items-center justify-between bg-gray-50 border-t border-gray-200 px-4 py-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="First page"
              >
                <ChevronsLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="text-sm text-gray-700">
              Page {pagination.page} of {pagination.pages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.pages}
                className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setPage(pagination.pages)}
                disabled={page >= pagination.pages}
                className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Last page"
              >
                <ChevronsRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
