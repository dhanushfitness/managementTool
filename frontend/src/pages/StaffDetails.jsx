import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStaffMember, updateStaff } from '../api/staff'
import LoadingPage from '../components/LoadingPage'
import toast from 'react-hot-toast'
import DateInput from '../components/DateInput'
import {
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Camera,
  Upload,
  Save,
  X,
  Printer,
  FileText,
  CreditCard,
  PhoneCall,
  Users,
  Activity,
  FileCheck,
  Edit2,
  Eye,
  ChevronLeft
} from 'lucide-react'

const countryCodes = [
  { code: '+91', country: 'India' },
  { code: '+1', country: 'USA' },
  { code: '+45', country: 'Denmark' },
  { code: '+44', country: 'UK' },
  { code: '+971', country: 'UAE' }
]

export default function StaffDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['staff-member', id],
    queryFn: async () => {
      const response = await getStaffMember(id)
      return response.data
    },
    enabled: !!id,
    retry: 1
  })

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    gender: '',
    dateOfBirth: '',
    anniversary: '',
    countryCode: '+91',
    vaccinated: '',
    vaccinationStatus: '',
    loginAccess: true,
    password: '',
    employeeType: '',
    category: '',
    payoutType: '',
    grade: '',
    salary: '',
    jobDesignation: '',
    adminRights: '',
    dateOfJoining: '',
    attendanceId: '',
    rfidCard: '',
    panCard: '',
    gstNumber: '',
    accountNumber: '',
    ifsc: '',
    hrmsId: '',
    leaveStaff: ''
  })

  useEffect(() => {
    if (data?.staff) {
      const staff = data.staff
      // Extract phone number without country code
      let phoneNumber = staff.phone || ''
      const countryCode = staff.countryCode || '+91'
      if (phoneNumber && phoneNumber.startsWith(countryCode)) {
        phoneNumber = phoneNumber.replace(countryCode, '')
      }
      
      setFormData({
        firstName: staff.firstName || '',
        lastName: staff.lastName || '',
        phone: phoneNumber,
        email: staff.email || '',
        gender: staff.gender || '',
        dateOfBirth: staff.dateOfBirth ? new Date(staff.dateOfBirth).toISOString().split('T')[0] : '',
        anniversary: staff.anniversary ? new Date(staff.anniversary).toISOString().split('T')[0] : '',
        countryCode: countryCode,
        vaccinated: staff.vaccinated || '',
        vaccinationStatus: staff.vaccinationStatus || '',
        loginAccess: staff.loginAccess !== false,
        password: '',
        employeeType: staff.employeeType || '',
        category: staff.category || '',
        payoutType: staff.payoutType || '',
        grade: staff.grade || '',
        salary: staff.salary || '',
        jobDesignation: staff.jobDesignation || '',
        adminRights: staff.adminRights || 'none',
        dateOfJoining: staff.dateOfJoining ? new Date(staff.dateOfJoining).toISOString().split('T')[0] : '',
        attendanceId: staff.attendanceId || '',
        rfidCard: staff.rfidCard || '',
        panCard: staff.panCard || '',
        gstNumber: staff.gstNumber || '',
        accountNumber: staff.bankAccount?.accountNumber || '',
        ifsc: staff.bankAccount?.ifsc || '',
        hrmsId: staff.hrmsId || '',
        leaveStaff: ''
      })
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: (data) => updateStaff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['staff-member', id])
      queryClient.invalidateQueries(['staff'])
      toast.success('Staff updated successfully')
      setIsEditing(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update staff')
    }
  })

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const updateData = {
      ...formData,
      phone: formData.countryCode + formData.phone,
      dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
      anniversary: formData.anniversary ? new Date(formData.anniversary) : undefined,
      dateOfJoining: formData.dateOfJoining ? new Date(formData.dateOfJoining) : undefined,
      salary: formData.salary ? parseFloat(formData.salary) : undefined,
      bankAccount: {
        accountNumber: formData.accountNumber,
        ifsc: formData.ifsc
      }
    }
    if (!formData.password) delete updateData.password
    updateMutation.mutate(updateData)
  }

  if (isLoading) return <LoadingPage message="Loading staff details..." />

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error loading staff details</p>
          <p className="text-red-600 text-sm mt-1">
            {error.response?.data?.message || error.message || 'Failed to load staff member'}
          </p>
          <button
            onClick={() => navigate('/staff')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Staff List
          </button>
        </div>
      </div>
    )
  }

  const staff = data?.staff
  if (!staff) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-medium">Staff not found</p>
          <p className="text-yellow-600 text-sm mt-1">The staff member you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/staff')}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Back to Staff List
          </button>
        </div>
      </div>
    )
  }

  // Removed tabs - only Profile section remains

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm">
        <Link to="/staff" className="text-gray-600 hover:text-orange-600">Home</Link>
        <span className="text-gray-400 mx-2">/</span>
        <Link to="/staff" className="text-gray-600 hover:text-orange-600">Staff</Link>
        <span className="text-gray-400 mx-2">/</span>
        <span className="text-orange-600 font-medium">Edit Staff Details</span>
      </nav>

      {/* Profile Section */}
      <div>
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Profile Picture */}
                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0">
                    {staff.profilePicture ? (
                      <img
                        src={staff.profilePicture}
                        alt={`${staff.firstName} ${staff.lastName}`}
                        className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-200">
                        <User className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                    <div className="mt-4 space-y-2">
                      <button type="button" className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium flex items-center justify-center space-x-2">
                        <Upload className="w-4 h-4" />
                        <span>Upload Image</span>
                      </button>
                      <button type="button" className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium flex items-center justify-center space-x-2">
                        <Camera className="w-4 h-4" />
                        <span>Capture Image</span>
                      </button>
                    </div>
                  </div>

                  {/* Personal Details */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => handleChange('firstName', e.target.value)}
                          disabled={!isEditing}
                          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                          placeholder="First Name"
                          required
                        />
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => handleChange('lastName', e.target.value)}
                          disabled={!isEditing}
                          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                          placeholder="Last Name"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Country Code
                      </label>
                      <select
                        value={formData.countryCode}
                        onChange={(e) => handleChange('countryCode', e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                      >
                        {countryCodes.map((cc) => (
                          <option key={cc.code} value={cc.code}>
                            {cc.country} ({cc.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Contact Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                        placeholder="1234567891"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                        placeholder="email@example.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="gender"
                            value="male"
                            checked={formData.gender === 'male'}
                            onChange={(e) => handleChange('gender', e.target.value)}
                            disabled={!isEditing}
                            className="text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">Male</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="gender"
                            value="female"
                            checked={formData.gender === 'female'}
                            onChange={(e) => handleChange('gender', e.target.value)}
                            disabled={!isEditing}
                            className="text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">Female</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Vaccinated</label>
                      <div className="space-y-2">
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="vaccinated"
                              value="yes"
                              checked={formData.vaccinated === 'yes'}
                              onChange={(e) => handleChange('vaccinated', e.target.value)}
                              disabled={!isEditing}
                              className="text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700">Yes</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="vaccinated"
                              value="no"
                              checked={formData.vaccinated === 'no'}
                              onChange={(e) => handleChange('vaccinated', e.target.value)}
                              disabled={!isEditing}
                              className="text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700">No</span>
                          </label>
                        </div>
                        {formData.vaccinated === 'yes' && (
                          <div className="flex space-x-4">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="vaccinationStatus"
                                value="partial"
                                checked={formData.vaccinationStatus === 'partial'}
                                onChange={(e) => handleChange('vaccinationStatus', e.target.value)}
                                disabled={!isEditing}
                                className="text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                              />
                              <span className="ml-2 text-sm text-gray-700">Partial</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="vaccinationStatus"
                                value="full"
                                checked={formData.vaccinationStatus === 'full'}
                                onChange={(e) => handleChange('vaccinationStatus', e.target.value)}
                                disabled={!isEditing}
                                className="text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                              />
                              <span className="ml-2 text-sm text-gray-700">Full</span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Login Access</label>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-700">{formData.loginAccess ? 'Yes' : 'No'}</span>
                        {isEditing && (
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.loginAccess}
                              onChange={(e) => handleChange('loginAccess', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                          </label>
                        )}
                      </div>
                    </div>

                    {isEditing && formData.loginAccess && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => handleChange('password', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="8 to 12 characters"
                          minLength={8}
                          maxLength={12}
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Resume</label>
                      <div className="flex items-center space-x-2">
                        <button type="button" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                          Choose file
                        </button>
                        <span className="text-sm text-gray-500">No file chosen</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Employee</label>
                      <select
                        value={formData.employeeType}
                        onChange={(e) => handleChange('employeeType', e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                      >
                        <option value="">Select</option>
                        <option value="full-time">Full-time</option>
                        <option value="part-time">Part-time</option>
                        <option value="contract">Contract</option>
                        <option value="intern">Intern</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => handleChange('category', e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                      >
                        <option value="">Select</option>
                        <option value="trainer">Trainer</option>
                        <option value="receptionist">Receptionist</option>
                        <option value="manager">Manager</option>
                        <option value="accountant">Accountant</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Payout type</label>
                      <select
                        value={formData.payoutType}
                        onChange={(e) => handleChange('payoutType', e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                      >
                        <option value="">Select</option>
                        <option value="fixed">Fixed</option>
                        <option value="commission">Commission</option>
                        <option value="hourly">Hourly</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Grade</label>
                      <select
                        value={formData.grade}
                        onChange={(e) => handleChange('grade', e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                      >
                        <option value="">Select</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
                  <DateInput
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                    disabled={!isEditing}
                    className="px-4 py-2.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Anniversary</label>
                  <DateInput
                    value={formData.anniversary}
                    onChange={(e) => handleChange('anniversary', e.target.value)}
                    disabled={!isEditing}
                    className="px-4 py-2.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Salary</label>
                  <input
                    type="number"
                    value={formData.salary}
                    onChange={(e) => handleChange('salary', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                    placeholder="Salary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Job Designation <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.jobDesignation}
                    onChange={(e) => handleChange('jobDesignation', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                    required
                  >
                    <option value="">Select</option>
                    <option value="Business Partner">Business Partner</option>
                    <option value="Manager">Manager</option>
                    <option value="Trainer">Trainer</option>
                    <option value="Sales Rep">Sales Rep</option>
                    <option value="Receptionist">Receptionist</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Admin Rights <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.adminRights}
                    onChange={(e) => handleChange('adminRights', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                    required
                  >
                    <option value="none">Sales</option>
                    <option value="limited">Limited Admin</option>
                    <option value="full">Master Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Joining</label>
                  <DateInput
                    value={formData.dateOfJoining}
                    onChange={(e) => handleChange('dateOfJoining', e.target.value)}
                    disabled={!isEditing}
                    className="px-4 py-2.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Attendance ID</label>
                  <input
                    type="text"
                    value={formData.attendanceId}
                    onChange={(e) => handleChange('attendanceId', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">RF ID Card</label>
                  <input
                    type="text"
                    value={formData.rfidCard}
                    onChange={(e) => handleChange('rfidCard', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">PAN Card</label>
                  <input
                    type="text"
                    value={formData.panCard}
                    onChange={(e) => handleChange('panCard', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">GST number</label>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) => handleChange('gstNumber', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Account No</label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => handleChange('accountNumber', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">IFSC</label>
                  <input
                    type="text"
                    value={formData.ifsc}
                    onChange={(e) => handleChange('ifsc', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">HRMS ID</label>
                  <input
                    type="text"
                    value={formData.hrmsId}
                    onChange={(e) => handleChange('hrmsId', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Leave Staff <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.leaveStaff}
                    onChange={(e) => handleChange('leaveStaff', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                    required
                  >
                    <option value="">Select</option>
                    <option value={staff._id}>{staff.firstName} {staff.lastName}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center space-x-2"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false)
                      // Reset form data
                      if (data?.staff) {
                        const staff = data.staff
                        // Extract phone number without country code
                        let phoneNumber = staff.phone || ''
                        const countryCode = staff.countryCode || '+91'
                        if (phoneNumber && phoneNumber.startsWith(countryCode)) {
                          phoneNumber = phoneNumber.replace(countryCode, '')
                        }
                        
                        setFormData({
                          firstName: staff.firstName || '',
                          lastName: staff.lastName || '',
                          phone: phoneNumber,
                          email: staff.email || '',
                          gender: staff.gender || '',
                          dateOfBirth: staff.dateOfBirth ? new Date(staff.dateOfBirth).toISOString().split('T')[0] : '',
                          anniversary: staff.anniversary ? new Date(staff.anniversary).toISOString().split('T')[0] : '',
                          countryCode: countryCode,
                          vaccinated: staff.vaccinated || '',
                          vaccinationStatus: staff.vaccinationStatus || '',
                          loginAccess: staff.loginAccess !== false,
                          password: '',
                          employeeType: staff.employeeType || '',
                          category: staff.category || '',
                          payoutType: staff.payoutType || '',
                          grade: staff.grade || '',
                          salary: staff.salary || '',
                          jobDesignation: staff.jobDesignation || '',
                          adminRights: staff.adminRights || 'none',
                          dateOfJoining: staff.dateOfJoining ? new Date(staff.dateOfJoining).toISOString().split('T')[0] : '',
                          attendanceId: staff.attendanceId || '',
                          rfidCard: staff.rfidCard || '',
                          panCard: staff.panCard || '',
                          gstNumber: staff.gstNumber || '',
                          accountNumber: staff.bankAccount?.accountNumber || '',
                          ifsc: staff.bankAccount?.ifsc || '',
                          hrmsId: staff.hrmsId || '',
                          leaveStaff: ''
                        })
                      }
                    }}
                    className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isLoading}
                    className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>Update</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

