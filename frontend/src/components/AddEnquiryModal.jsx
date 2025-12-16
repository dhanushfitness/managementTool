import { useState } from 'react'
import { X, Calendar } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import DateInput from './DateInput'
 import TimeInput from './TimeInput'

export default function AddEnquiryModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('personal')
  const [formData, setFormData] = useState({
    name: '',
    countryCode: '+91',
    phone: '',
    email: '',
    gender: '',
    enquiryDate: new Date().toISOString().split('T')[0],
    service: '',
    leadSource: '',
    staffId: '',
    followUpDate: '',
    followUpTime: '',
    callTag: 'hot',
    message: ''
  })

  const queryClient = useQueryClient()

  // Fetch staff list
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff').then(res => res.data),
    enabled: isOpen
  })

  // Fetch services (not plans/variations)
  const { data: servicesData } = useQuery({
    queryKey: ['services-list'],
    queryFn: () => api.get('/services').then(res => res.data),
    enabled: isOpen
  })

  const createEnquiryMutation = useMutation({
    mutationFn: (data) => api.post('/enquiries', data),
    onSuccess: () => {
      toast.success('Enquiry created successfully')
      queryClient.invalidateQueries(['enquiries'])
      queryClient.invalidateQueries(['enquiry-stats'])
      onClose()
      // Reset form
      setFormData({
        name: '',
        countryCode: '+91',
        phone: '',
        email: '',
        gender: '',
        enquiryDate: new Date().toISOString().split('T')[0],
        service: '',
        leadSource: '',
        staffId: '',
        followUpDate: '',
        followUpTime: '',
        callTag: 'hot',
        message: ''
      })
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create enquiry')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const enquiryData = {
      name: formData.name,
      phone: `${formData.countryCode}${formData.phone}`,
      email: formData.email || '',
      gender: formData.gender,
      date: formData.enquiryDate,
      service: formData.service,
      leadSource: formData.leadSource,
      assignedStaff: formData.staffId,
      callTag: formData.callTag,
      lastCallStatus: 'not-called',
      enquiryStage: 'opened',
      notes: formData.message,
      isLead: true,
      isMember: false
    }

    if (formData.followUpDate && formData.followUpTime) {
      enquiryData.followUpDate = `${formData.followUpDate}T${formData.followUpTime}`
    }

    createEnquiryMutation.mutate(enquiryData)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${
          isOpen ? 'bg-opacity-50 opacity-100' : 'bg-opacity-0 opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          margin: 0,
          padding: 0,
          width: '100vw',
          height: '100vh'
        }}
      />
      
      {/* Slide-in Form */}
      <div className={`fixed right-0 top-0 h-full w-3/4 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } overflow-y-auto ${!isOpen ? 'pointer-events-none' : ''}`}>
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-8 py-5 flex items-center justify-between z-10 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Add Enquiry</h2>
            <p className="text-sm text-gray-500 mt-1">Fill in the details to create a new enquiry</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-white px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('personal')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm transition-all relative ${
                activeTab === 'personal'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Personal Information
              {activeTab === 'personal' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('additional')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm transition-all relative ${
                activeTab === 'additional'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Additional Information
              {activeTab === 'additional' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"></span>
              )}
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {activeTab === 'personal' && (
            <>
              {/* Personal Details */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                  <span className="w-1 h-6 bg-orange-500 rounded-full mr-3"></span>
                  Personal Details
                </h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="First Name and Last Name"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Country Code
                      </label>
                      <select
                        name="countryCode"
                        value={formData.countryCode}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                      >
                        <option value="+91">India (+91)</option>
                        <option value="+1">USA (+1)</option>
                        <option value="+44">UK (+44)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Contact Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center cursor-pointer group">
                        <input
                          type="radio"
                          name="gender"
                          value="male"
                          checked={formData.gender === 'male'}
                          onChange={handleChange}
                          className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">Male</span>
                      </label>
                      <label className="flex items-center cursor-pointer group">
                        <input
                          type="radio"
                          name="gender"
                          value="female"
                          checked={formData.gender === 'female'}
                          onChange={handleChange}
                          className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">Female</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Field */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                  <span className="w-1 h-6 bg-orange-500 rounded-full mr-3"></span>
                  Contact Information
                </h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                  />
                </div>
              </div>

              {/* Lead Information */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                  <span className="w-1 h-6 bg-orange-500 rounded-full mr-3"></span>
                  Lead Information
                </h3>
                <div className="grid grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Enquiry Date <span className="text-red-500">*</span>
                    </label>
                  <DateInput
                    name="enquiryDate"
                    value={formData.enquiryDate}
                    onChange={handleChange}
                    required
                    className="px-4 py-3"
                  />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Service Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="service"
                      value={formData.service}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                    >
                      <option value="">Select</option>
                      {servicesData?.services?.map((service) => (
                        <option key={service._id} value={service._id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Lead source
                    </label>
                    <select
                      name="leadSource"
                      value={formData.leadSource}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                    >
                      <option value="">Select</option>
                      <option value="walk-in">Walk-in</option>
                      <option value="referral">Referral</option>
                      <option value="online">Online</option>
                      <option value="social-media">Social Media</option>
                      <option value="phone-call">Phone Call</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Schedule enquiry follow-up */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                  <span className="w-1 h-6 bg-orange-500 rounded-full mr-3"></span>
                  Schedule enquiry follow-up
                </h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Staff Name
                    </label>
                    <select
                      name="staffId"
                      value={formData.staffId}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                    >
                      <option value="">Select Staff</option>
                      {staffData?.staff?.map((staff) => (
                        <option key={staff._id} value={staff._id}>
                          {staff.firstName} {staff.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Date & Time
                      </label>
                      <DateInput
                        name="followUpDate"
                        value={formData.followUpDate}
                        onChange={handleChange}
                        className="px-4 py-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Time
                      </label>
                      <TimeInput
                        value={formData.followUpTime}
                        onChange={(e) => setFormData({ ...formData, followUpTime: e.target.value })}
                        className="w-full px-4 py-3"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Call Tag</label>
                    <div className="flex space-x-3">
                      <label className={`flex-1 flex items-center justify-center px-4 py-3 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.callTag === 'cold' 
                          ? 'border-red-500 bg-red-50 text-red-700 shadow-sm' 
                          : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
                      }`}>
                        <input
                          type="radio"
                          name="callTag"
                          value="cold"
                          checked={formData.callTag === 'cold'}
                          onChange={handleChange}
                          className="w-4 h-4 text-red-500 border-gray-300 focus:ring-red-500 mr-2"
                        />
                        <span className="text-sm font-medium">Cold</span>
                      </label>
                      <label className={`flex-1 flex items-center justify-center px-4 py-3 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.callTag === 'warm' 
                          ? 'border-yellow-500 bg-yellow-50 text-yellow-700 shadow-sm' 
                          : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-50'
                      }`}>
                        <input
                          type="radio"
                          name="callTag"
                          value="warm"
                          checked={formData.callTag === 'warm'}
                          onChange={handleChange}
                          className="w-4 h-4 text-yellow-500 border-gray-300 focus:ring-yellow-500 mr-2"
                        />
                        <span className="text-sm font-medium">Warm</span>
                      </label>
                      <label className={`flex-1 flex items-center justify-center px-4 py-3 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.callTag === 'hot' 
                          ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm' 
                          : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                      }`}>
                        <input
                          type="radio"
                          name="callTag"
                          value="hot"
                          checked={formData.callTag === 'hot'}
                          onChange={handleChange}
                          className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500 mr-2"
                        />
                        <span className="text-sm font-medium">Hot</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows="4"
                      maxLength={250}
                      placeholder="Maximum 250 characters"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white resize-none"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-500">Maximum 250 characters</p>
                      <p className={`text-xs font-medium ${
                        formData.message.length > 200 ? 'text-orange-600' : 'text-gray-500'
                      }`}>
                        {formData.message.length}/250
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'additional' && (
            <div>
              <p className="text-gray-500">Additional information fields coming soon...</p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 px-8 py-5 -mx-8 -mb-8 shadow-lg flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createEnquiryMutation.isLoading}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md flex items-center space-x-2"
            >
              {createEnquiryMutation.isLoading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Enquiry</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

