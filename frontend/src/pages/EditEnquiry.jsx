import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import Breadcrumbs from '../components/Breadcrumbs'
import DateInput from '../components/DateInput'
import { Loader2, ArrowLeft } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'

export default function EditEnquiry() {
  const navigate = useNavigate()
  const { enquiryId } = useParams()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    name: '',
    countryCode: '+91',
    phone: '',
    gender: '',
    dateOfBirth: '',
    enquiryDate: '',
    service: '',
    leadSource: ''
  })

  // Fetch enquiry details
  const { data: enquiryData, isLoading: isLoadingEnquiry } = useQuery({
    queryKey: ['enquiry', enquiryId],
    queryFn: () => api.get(`/enquiries/${enquiryId}`).then(res => res.data),
    enabled: !!enquiryId
  })


  // Fetch services
  const { data: servicesData } = useQuery({
    queryKey: ['services-list'],
    queryFn: () => api.get('/services').then(res => res.data)
  })

  // Populate form when enquiry data is loaded
  useEffect(() => {
    if (enquiryData?.enquiry) {
      const enquiry = enquiryData.enquiry
      
      // Extract country code and phone
      let countryCode = '+91'
      let phone = enquiry.phone || ''
      if (phone.startsWith('+91')) {
        countryCode = '+91'
        phone = phone.substring(3)
      } else if (phone.startsWith('+1')) {
        countryCode = '+1'
        phone = phone.substring(2)
      } else if (phone.startsWith('+44')) {
        countryCode = '+44'
        phone = phone.substring(3)
      }

      // Extract date of birth if available (may not be in model yet)
      let dateOfBirth = ''
      if (enquiry.dateOfBirth) {
        dateOfBirth = new Date(enquiry.dateOfBirth).toISOString().split('T')[0]
      }

      setFormData({
        name: enquiry.name || '',
        countryCode,
        phone,
        gender: enquiry.gender || '',
        dateOfBirth,
        enquiryDate: enquiry.date ? new Date(enquiry.date).toISOString().split('T')[0] : '',
        service: enquiry.service?._id || enquiry.service || '',
        leadSource: enquiry.leadSource || ''
      })
    }
  }, [enquiryData])

  const updateEnquiryMutation = useMutation({
    mutationFn: (data) => api.put(`/enquiries/${enquiryId}`, data),
    onSuccess: () => {
      toast.success('Enquiry updated successfully')
      queryClient.invalidateQueries(['enquiries'])
      queryClient.invalidateQueries(['enquiry-stats'])
      queryClient.invalidateQueries(['enquiry', enquiryId])
      navigate('/enquiries')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update enquiry')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const enquiryData = {
      name: formData.name,
      phone: `${formData.countryCode}${formData.phone}`,
      gender: formData.gender,
      service: formData.service,
      leadSource: formData.leadSource
    }

    updateEnquiryMutation.mutate(enquiryData)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (isLoadingEnquiry) {
    return <LoadingPage />
  }

  if (!enquiryData?.enquiry) {
    return (
      <div className="space-y-6 w-full">
        <div className="flex items-center justify-between">
          <Breadcrumbs />
          <button
            onClick={() => navigate('/enquiries')}
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-semibold flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Enquiry not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <Breadcrumbs />
        <button
          onClick={() => navigate('/enquiries')}
          className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-semibold flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-8 py-5">
          <h2 className="text-2xl font-bold text-gray-900">Edit Enquiry</h2>
          <p className="text-sm text-gray-500 mt-1">Update the enquiry details</p>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-2 gap-8">
            {/* Personal Details - Left Side */}
            <div className="space-y-5">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Personal Details</h3>
              
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
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                    />
                    <button
                      type="button"
                      className="text-orange-600 hover:text-orange-700 text-sm font-semibold whitespace-nowrap"
                    >
                      Change
                    </button>
                  </div>
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

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date of Birth
                </label>
                <DateInput
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="px-4 py-3"
                />
              </div>
            </div>

            {/* Lead Information - Right Side */}
            <div className="space-y-5">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Lead Information</h3>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Enquiry Date <span className="text-red-500">*</span>
                </label>
                <DateInput
                  name="enquiryDate"
                  value={formData.enquiryDate}
                  onChange={handleChange}
                  required
                  disabled
                  className="px-4 py-3 bg-gray-100 cursor-not-allowed"
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
                  <option value="passing-by">Passing By</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 px-8 py-5 -mx-8 -mb-8 shadow-lg flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/enquiries')}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateEnquiryMutation.isLoading}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md flex items-center space-x-2"
            >
              {updateEnquiryMutation.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save enquiry</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

