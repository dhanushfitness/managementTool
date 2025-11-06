import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStaffMember, getRepChangeCounts, bulkRepChange, getStaff } from '../api/staff'
import LoadingPage from '../components/LoadingPage'
import toast from 'react-hot-toast'
import { UserCheck } from 'lucide-react'

const changeCategories = [
  { key: 'memberManager', label: 'New Member Manager' },
  { key: 'salesRep', label: 'New Sales Rep' },
  { key: 'personalTrainer', label: 'New Personal Trainer' },
  { key: 'generalTrainer', label: 'New General Trainer' },
  { key: 'memberAppointments', label: 'Member Appointments' },
  { key: 'memberCallLog', label: 'Member Call Log' },
  { key: 'enquiryFollowUp', label: 'Enquiry Follow-Up' },
  { key: 'enquiryAssigned', label: 'Enquiry Trial Schedule' }
]

export default function StaffRepChange() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [changes, setChanges] = useState({})

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['staff-member', id],
    queryFn: () => getStaffMember(id).then(res => res.data),
    enabled: !!id
  })

  const { data: countsData, isLoading: countsLoading } = useQuery({
    queryKey: ['rep-change-counts', id],
    queryFn: () => getRepChangeCounts(id).then(res => res.data),
    enabled: !!id
  })

  const { data: allStaffData } = useQuery({
    queryKey: ['staff'],
    queryFn: () => getStaff().then(res => res.data)
  })

  const changeMutation = useMutation({
    mutationFn: (data) => bulkRepChange(data),
    onSuccess: () => {
      toast.success('Rep change completed successfully')
      queryClient.invalidateQueries(['rep-change-counts', id])
      queryClient.invalidateQueries(['staff'])
      // Reset form
      setChanges({})
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to change rep')
    }
  })

  const handleChange = (category, field, value) => {
    setChanges(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: field === 'count' ? parseInt(value) || 0 : value
      }
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!id) {
      toast.error('Staff ID is required')
      return
    }

    const toStaffId = Object.values(changes).find(c => c.toStaffId)?.toStaffId
    if (!toStaffId) {
      toast.error('Please select a staff member to transfer to')
      return
    }

    changeMutation.mutate({
      fromStaffId: id,
      toStaffId,
      changes
    })
  }

  if (staffLoading || countsLoading) return <LoadingPage message="Loading..." />

  const staff = staffData?.staff
  const counts = countsData?.counts || {}
  const allStaff = allStaffData?.staff || []

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm">
        <Link to="/staff" className="text-gray-600 hover:text-orange-600">Home</Link>
        <span className="text-gray-400 mx-2">/</span>
        <Link to="/staff" className="text-gray-600 hover:text-orange-600">Staff</Link>
        <span className="text-gray-400 mx-2">/</span>
        <span className="text-orange-600 font-medium">Change Staff</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bulk RepChange</h1>
          <p className="text-gray-600 mt-1">
            Existing Staff: <span className="font-medium">{staff ? `${staff.firstName} ${staff.lastName}` : 'N/A'}</span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium">
            Unassigned List
          </button>
          <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium">
            Super Admin Staff
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Bulk RepChange</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Existing Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Count to be Changed</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {changeCategories.map((category) => {
                  const existingCount = counts[category.key] || 0
                  const changeData = changes[category.key] || { toStaffId: '', count: 0 }
                  
                  return (
                    <tr key={category.key} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-900">{category.label}</p>
                          <select
                            value={changeData.toStaffId || ''}
                            onChange={(e) => handleChange(category.key, 'toStaffId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                          >
                            <option value="">Select</option>
                            {allStaff.filter(s => s._id !== id).map((s) => (
                              <option key={s._id} value={s._id}>
                                {s.firstName} {s.lastName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {existingCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={changeData.count || 0}
                          onChange={(e) => handleChange(category.key, 'count', e.target.value)}
                          min="0"
                          max={existingCount}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex items-center justify-end pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={changeMutation.isLoading}
              className="px-8 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
            >
              Change
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

