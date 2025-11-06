import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export default function ClientFilterModal({ isOpen, onClose, filters, onFilterChange, onApply }) {
  const [localFilters, setLocalFilters] = useState(filters)

  // Sync local filters with props when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters)
    }
  }, [isOpen, filters])

  // Fetch plans for service dropdown
  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans').then(res => res.data),
    enabled: isOpen
  })

  // Fetch staff for dropdowns
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff').then(res => res.data),
    enabled: isOpen
  })

  const handleChange = (field, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleGenderChange = (gender, checked) => {
    setLocalFilters(prev => {
      const genders = prev.gender || []
      if (checked) {
        return { ...prev, gender: [...genders, gender] }
      } else {
        return { ...prev, gender: genders.filter(g => g !== gender) }
      }
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onFilterChange(localFilters)
    onApply(localFilters)
    onClose()
  }

  const handleReset = () => {
    const resetFilters = {
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
    }
    setLocalFilters(resetFilters)
    onFilterChange(resetFilters)
    onApply(resetFilters)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Filter Clients</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service
                  </label>
                  <select
                    value={localFilters.service || ''}
                    onChange={(e) => handleChange('service', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    {plansData?.data?.plans?.map((plan) => (
                      <option key={plan._id} value={plan._id}>{plan.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age Group
                  </label>
                  <select
                    value={localFilters.ageGroup || ''}
                    onChange={(e) => handleChange('ageGroup', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    <option value="18-25">18-25</option>
                    <option value="26-35">26-35</option>
                    <option value="36-45">36-45</option>
                    <option value="46-55">46-55</option>
                    <option value="56-65">56-65</option>
                    <option value="65+">65+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Member Manager
                  </label>
                  <select
                    value={localFilters.memberManager || ''}
                    onChange={(e) => handleChange('memberManager', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    {staffData?.staff?.map((staff) => (
                      <option key={staff._id} value={staff._id}>
                        {staff.firstName} {staff.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lead Source
                  </label>
                  <select
                    value={localFilters.leadSource || ''}
                    onChange={(e) => handleChange('leadSource', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    <option value="walk-in">Walk-in</option>
                    <option value="referral">Referral</option>
                    <option value="online">Online</option>
                    <option value="social-media">Social Media</option>
                    <option value="phone-call">Phone Call</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Category
                  </label>
                  <select
                    value={localFilters.serviceCategory || ''}
                    onChange={(e) => handleChange('serviceCategory', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    <option value="gym">Gym Membership</option>
                    <option value="personal-training">Personal Training</option>
                    <option value="group-classes">Group Classes</option>
                    <option value="yoga">Yoga</option>
                    <option value="pilates">Pilates</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Behaviour Based
                  </label>
                  <select
                    value={localFilters.behaviourBased || ''}
                    onChange={(e) => handleChange('behaviourBased', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    <option value="highly-active">Highly Active</option>
                    <option value="regular">Regular</option>
                    <option value="occasional">Occasional</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fitness Goal
                  </label>
                  <select
                    value={localFilters.fitnessGoal || ''}
                    onChange={(e) => handleChange('fitnessGoal', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    <option value="weight-loss">Weight Loss</option>
                    <option value="muscle-gain">Muscle Gain</option>
                    <option value="general-fitness">General Fitness</option>
                    <option value="endurance">Endurance</option>
                    <option value="flexibility">Flexibility</option>
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Variation
                  </label>
                  <select
                    value={localFilters.serviceVariation || ''}
                    onChange={(e) => handleChange('serviceVariation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    {/* Service variations can be added based on plan variants */}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sales Rep
                  </label>
                  <select
                    value={localFilters.salesRep || ''}
                    onChange={(e) => handleChange('salesRep', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    {staffData?.staff?.filter(s => s.category === 'trainer' || s.role === 'staff').map((staff) => (
                      <option key={staff._id} value={staff._id}>
                        {staff.firstName} {staff.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    General Trainer
                  </label>
                  <select
                    value={localFilters.generalTrainer || ''}
                    onChange={(e) => handleChange('generalTrainer', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    {staffData?.staff?.filter(s => s.category === 'trainer').map((staff) => (
                      <option key={staff._id} value={staff._id}>
                        {staff.firstName} {staff.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice
                  </label>
                  <select
                    value={localFilters.invoice || ''}
                    onChange={(e) => handleChange('invoice', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                    <option value="sent">Sent</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purchase Type
                  </label>
                  <select
                    value={localFilters.purchaseType || ''}
                    onChange={(e) => handleChange('purchaseType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                    <option value="pay-per-session">Pay Per Session</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Groups
                  </label>
                  <select
                    value={localFilters.customGroups || ''}
                    onChange={(e) => handleChange('customGroups', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    <option value="vip">VIP Members</option>
                    <option value="corporate">Corporate</option>
                    <option value="referrals">Referrals</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={(localFilters.gender || []).includes('male')}
                        onChange={(e) => handleGenderChange('male', e.target.checked)}
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Male</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={(localFilters.gender || []).includes('female')}
                        onChange={(e) => handleGenderChange('female', e.target.checked)}
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Female</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={(localFilters.gender || []).includes('other')}
                        onChange={(e) => handleGenderChange('other', e.target.checked)}
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Not Specified</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Reset
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

