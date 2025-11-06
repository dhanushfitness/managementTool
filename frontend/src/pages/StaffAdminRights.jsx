import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStaffMember, updateStaffPermissions } from '../api/staff'
import LoadingPage from '../components/LoadingPage'
import toast from 'react-hot-toast'
import { ChevronLeft, Save, RotateCcw } from 'lucide-react'

// Simplified permissions structure - only essential ones
const permissionCategories = [
  {
    name: 'Dashboard',
    permissions: [
      { key: 'dashboard.search', label: 'Search' },
      { key: 'dashboard.summary', label: 'Summary' },
      { key: 'dashboard.followups', label: 'View all follow-ups' }
    ]
  },
  {
    name: 'Sales',
    permissions: [
      { key: 'sales.enquiries', label: 'Add enquiry, manage enquiries, enquiry archive' },
      { key: 'sales.convert', label: 'Convert Enquiry & Add member' },
      { key: 'sales.print', label: 'Print all enquiries' }
    ]
  },
  {
    name: 'Clients',
    permissions: [
      { key: 'clients.manage', label: 'Manage all members list' },
      { key: 'clients.update', label: 'Update client profile' },
      { key: 'clients.memberships', label: 'Transfer memberships' },
      { key: 'clients.checkins', label: 'Update Checkins' }
    ]
  },
  {
    name: 'Bookings',
    permissions: [
      { key: 'bookings.manage', label: 'Manage Booking & Reservations' },
      { key: 'bookings.create', label: 'Create classes' },
      { key: 'bookings.cancel', label: 'Cancel classes' }
    ]
  },
  {
    name: 'Staff',
    permissions: [
      { key: 'staff.manage', label: 'Manage Staff List' },
      { key: 'staff.add', label: 'Add/ Delete staff' },
      { key: 'staff.admin', label: 'Admin Rights' },
      { key: 'staff.target', label: 'Update Staff Target' }
    ]
  },
  {
    name: 'Bills',
    permissions: [
      { key: 'bills.generate', label: 'Generate Bills' },
      { key: 'bills.cancel', label: 'Cancel Bills' },
      { key: 'bills.discount', label: 'Allow discounts' }
    ]
  },
  {
    name: 'Reports',
    permissions: [
      { key: 'reports.sales', label: 'Daily sales (DSR)' },
      { key: 'reports.revenue', label: 'Revenue, Sales Accounting' },
      { key: 'reports.client', label: 'New clients' }
    ]
  },
  {
    name: 'Setup',
    permissions: [
      { key: 'setup.branch', label: 'View branch profile' },
      { key: 'setup.services', label: 'Add, edit and delete services, offers and packages' },
      { key: 'setup.tax', label: 'Define Tax' }
    ]
  }
]

export default function StaffAdminRights() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [permissions, setPermissions] = useState({})

  const { data, isLoading } = useQuery({
    queryKey: ['staff-member', id],
    queryFn: () => getStaffMember(id).then(res => res.data)
  })

  useEffect(() => {
    if (data?.staff?.permissions) {
      const perms = {}
      data.staff.permissions.forEach(perm => {
        perms[perm] = true
      })
      setPermissions(perms)
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: (perms) => updateStaffPermissions(id, { permissions: perms }),
    onSuccess: () => {
      queryClient.invalidateQueries(['staff-member', id])
      toast.success('Admin rights updated successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update admin rights')
    }
  })

  const handleToggle = (key) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleSave = () => {
    const permsArray = Object.keys(permissions).filter(key => permissions[key])
    updateMutation.mutate(permsArray)
  }

  const handleReset = () => {
    if (data?.staff?.permissions) {
      const perms = {}
      data.staff.permissions.forEach(perm => {
        perms[perm] = true
      })
      setPermissions(perms)
    } else {
      setPermissions({})
    }
  }

  if (isLoading) return <LoadingPage message="Loading admin rights..." />

  const staff = data?.staff
  if (!staff) return <div className="text-center py-12">Staff not found</div>

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm">
        <Link to="/staff" className="text-gray-600 hover:text-orange-600">Home</Link>
        <span className="text-gray-400 mx-2">/</span>
        <Link to="/staff" className="text-gray-600 hover:text-orange-600">Staff</Link>
        <span className="text-gray-400 mx-2">/</span>
        <span className="text-orange-600 font-medium">Admin Rights - {staff.firstName} {staff.lastName}</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Admin Rights - {staff.firstName} {staff.lastName}</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
          <button
            onClick={handleSave}
            disabled={updateMutation.isLoading}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Permissions Grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {permissionCategories.map((category) => (
            <div key={category.name} className="space-y-3">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{category.name}</h3>
              {category.permissions.map((permission) => (
                <div key={permission.key} className="flex items-center justify-between py-2">
                  <label className="text-sm text-gray-700 flex-1 cursor-pointer" htmlFor={permission.key}>
                    {permission.label}
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id={permission.key}
                      checked={permissions[permission.key] || false}
                      onChange={() => handleToggle(permission.key)}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 rounded-full peer ${
                      permissions[permission.key] 
                        ? 'bg-green-500' 
                        : 'bg-yellow-400'
                    } peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                  </label>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

