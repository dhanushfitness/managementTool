import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStaffMember, createStaffTarget, getStaff } from '../api/staff'
import LoadingPage from '../components/LoadingPage'
import toast from 'react-hot-toast'
import { Save, Copy } from 'lucide-react'

const months = [
  { key: 'january', label: 'Jan' },
  { key: 'february', label: 'Feb' },
  { key: 'march', label: 'Mar' },
  { key: 'april', label: 'Apr' },
  { key: 'may', label: 'May' },
  { key: 'june', label: 'Jun' },
  { key: 'july', label: 'Jul' },
  { key: 'august', label: 'Aug' },
  { key: 'september', label: 'Sep' },
  { key: 'october', label: 'Oct' },
  { key: 'november', label: 'Nov' },
  { key: 'december', label: 'Dec' }
]

export default function StaffAddTarget() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    staffId: id || '',
    targetType: 'sales',
    salesType: 'call-target',
    year: new Date().getFullYear().toString(),
    monthlyTargets: {
      january: 0,
      february: 0,
      march: 0,
      april: 0,
      may: 0,
      june: 0,
      july: 0,
      august: 0,
      september: 0,
      october: 0,
      november: 0,
      december: 0
    }
  })

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['staff-member', id],
    queryFn: () => getStaffMember(id).then(res => res.data),
    enabled: !!id
  })

  const { data: allStaffData } = useQuery({
    queryKey: ['staff'],
    queryFn: () => getStaff().then(res => res.data)
  })

  const createMutation = useMutation({
    mutationFn: (data) => createStaffTarget(data),
    onSuccess: () => {
      toast.success('Target created successfully')
      queryClient.invalidateQueries(['staff-targets'])
      navigate(`/staff/${id}/targets`)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create target')
    }
  })

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleMonthChange = (month, value) => {
    setFormData(prev => ({
      ...prev,
      monthlyTargets: {
        ...prev.monthlyTargets,
        [month]: parseFloat(value) || 0
      }
    }))
  }

  const handleCopy = () => {
    const firstValue = formData.monthlyTargets.january
    const newTargets = {}
    months.forEach(month => {
      newTargets[month.key] = firstValue
    })
    setFormData(prev => ({
      ...prev,
      monthlyTargets: newTargets
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate({
      ...formData,
      year: parseInt(formData.year)
    })
  }

  if (staffLoading) return <LoadingPage message="Loading..." />

  const staff = staffData?.staff
  const allStaff = allStaffData?.staff || []

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm">
        <Link to="/staff" className="text-gray-600 hover:text-orange-600">Home</Link>
        <span className="text-gray-400 mx-2">/</span>
        <Link to="/staff" className="text-gray-600 hover:text-orange-600">Staff</Link>
        <span className="text-gray-400 mx-2">/</span>
        <span className="text-orange-600 font-medium">Staff Target</span>
      </nav>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Staff <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.staffId}
                onChange={(e) => handleChange('staffId', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option value="">Select</option>
                {allStaff.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Targets</label>
              <select
                value={formData.targetType}
                onChange={(e) => handleChange('targetType', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="sales">Sales</option>
                <option value="calls">Calls</option>
                <option value="appointments">Appointments</option>
                <option value="conversions">Conversions</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sales</label>
              <select
                value={formData.salesType}
                onChange={(e) => handleChange('salesType', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="call-target">Call Target</option>
                <option value="revenue-target">Revenue Target</option>
                <option value="enquiry-target">Enquiry Target</option>
                <option value="conversion-target">Conversion Target</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Year <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.year}
                onChange={(e) => handleChange('year', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map(year => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Monthly Targets */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-semibold text-gray-700">Call Target</label>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm flex items-center space-x-2"
              >
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </button>
            </div>

            {/* Month Headers */}
            <div className="grid grid-cols-12 gap-2 mb-2">
              {months.map((month) => (
                <div
                  key={month.key}
                  className="bg-green-500 text-white text-center py-2 rounded-lg text-xs font-medium"
                >
                  {month.label}
                </div>
              ))}
            </div>

            {/* Month Inputs */}
            <div className="grid grid-cols-12 gap-2">
              {months.map((month) => (
                <input
                  key={month.key}
                  type="number"
                  value={formData.monthlyTargets[month.key]}
                  onChange={(e) => handleMonthChange(month.key, e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  min="0"
                />
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-center pt-4">
            <button
              type="submit"
              disabled={createMutation.isLoading}
              className="px-8 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
            >
              Submit
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

