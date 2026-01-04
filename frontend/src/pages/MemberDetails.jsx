import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
// import toast from 'react-hot-toast'
import { getMember, updateMember, getMemberInvoices, getMemberInvoicesWithPayments, getMemberCalls, createMemberCall, updateMemberCall, getMemberReferrals, createMemberReferral } from '../api/members'
import api from '../api/axios'
import LoadingPage from '../components/LoadingPage'
import AttendanceTab from '../components/AttendanceTab'
import DateInput from '../components/DateInput'
import Breadcrumbs from '../components/Breadcrumbs'
import RazorpayPayment from '../components/RazorpayPayment'
import RecordPaymentModal from '../components/RecordPaymentModal'
import UpgradeMembershipModal from '../components/UpgradeMembershipModal'
import AddInvoiceModal from '../components/AddInvoiceModal'
import toast from 'react-hot-toast'
import {
  User,
  Calendar,
  TrendingUp,
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
  Calendar as CalendarIcon,
  Users,
  FolderOpen,
  Activity,
  FileCheck,
  Edit2,
  DollarSign,
  Eye,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Dumbbell,
  Play,
  CheckCircle,
  Clock,
  Trash2,
  QrCode,
  X as XIcon
} from 'lucide-react'

const countryCodes = [
  { code: '+91', country: 'India' },
  { code: '+1', country: 'USA' },
  { code: '+45', country: 'Denmark' },
  { code: '+44', country: 'UK' },
  { code: '+971', country: 'UAE' }
]

export default function MemberDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  
  // Check URL params for tab
  const searchParams = new URLSearchParams(location.search)
  const initialTab = searchParams.get('tab') || 'profile'
  
  const [activeTab, setActiveTab] = useState(initialTab)
  const [activeSubTab, setActiveSubTab] = useState('personal')
  const [activeServiceTab, setActiveServiceTab] = useState('individual')
  const [activeServiceStatus, setActiveServiceStatus] = useState('active')
  const [isEditing, setIsEditing] = useState(false)
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [paymentPage, setPaymentPage] = useState(1)
  const [showCallModal, setShowCallModal] = useState(false)
  const [showReferralModal, setShowReferralModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  
  // Image upload and camera states
  const [showCamera, setShowCamera] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [cameraError, setCameraError] = useState('')
  const [cameraLoading, setCameraLoading] = useState(false)
  const [facingMode, setFacingMode] = useState('user') // 'user' for front, 'environment' for back
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  const { data, isLoading } = useQuery({
    queryKey: ['member', id],
    queryFn: () => getMember(id).then(res => res.data)
  })

  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff').then(res => res.data),
    enabled: isEditing
  })

  // Fetch member invoices for service card
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['member-invoices', id],
    queryFn: () => getMemberInvoices(id).then(res => res.data),
    enabled: activeTab === 'service-card'
  })

  // Fetch member invoices with payments for payments tab
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['member-invoices-payments', id, paymentFilter, paymentPage],
    queryFn: () => getMemberInvoicesWithPayments(id, { 
      filter: paymentFilter, 
      page: paymentPage, 
      limit: 20 
    }).then(res => res.data),
    enabled: activeTab === 'payments'
  })

  // Update active tab when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
  }, [location.search])

  const updateMutation = useMutation({
    mutationFn: (data) => updateMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['member', id])
      toast.success('Member updated successfully')
      setIsEditing(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update member')
    }
  })

  const member = data?.member

  const buildFitnessFormState = (memberData) => ({
    age: memberData?.fitnessProfile?.age !== undefined ? memberData.fitnessProfile.age.toString() : '',
    height: memberData?.fitnessProfile?.height !== undefined ? memberData.fitnessProfile.height.toString() : '',
    bodyWeight: memberData?.fitnessProfile?.bodyWeight !== undefined ? memberData.fitnessProfile.bodyWeight.toString() : '',
    bmi: memberData?.fitnessProfile?.bmi !== undefined ? memberData.fitnessProfile.bmi.toString() : '',
    fatPercentage: memberData?.fitnessProfile?.fatPercentage !== undefined ? memberData.fitnessProfile.fatPercentage.toString() : '',
    visualFatPercentage: memberData?.fitnessProfile?.visualFatPercentage !== undefined ? memberData.fitnessProfile.visualFatPercentage.toString() : '',
    bodyAge: memberData?.fitnessProfile?.bodyAge !== undefined ? memberData.fitnessProfile.bodyAge.toString() : '',
    musclePercentage: memberData?.fitnessProfile?.musclePercentage !== undefined ? memberData.fitnessProfile.musclePercentage.toString() : '',
    cardiovascularTestReport: memberData?.fitnessProfile?.cardiovascularTestReport || '',
    muscleStrengthReport: memberData?.fitnessProfile?.muscleStrengthReport || '',
    muscleEndurance: memberData?.fitnessProfile?.muscleEndurance !== undefined ? memberData.fitnessProfile.muscleEndurance.toString() : '',
    coreStrength: memberData?.fitnessProfile?.coreStrength !== undefined ? memberData.fitnessProfile.coreStrength.toString() : '',
    flexibility: memberData?.fitnessProfile?.flexibility !== undefined ? memberData.fitnessProfile.flexibility.toString() : '',
    leftHandGripStrength: memberData?.fitnessProfile?.leftHandGripStrength !== undefined ? memberData.fitnessProfile.leftHandGripStrength.toString() : '',
    rightHandGripStrength: memberData?.fitnessProfile?.rightHandGripStrength !== undefined ? memberData.fitnessProfile.rightHandGripStrength.toString() : '',
    measuredAt: memberData?.fitnessProfile?.measuredAt
      ? new Date(memberData.fitnessProfile.measuredAt).toISOString().split('T')[0]
      : ''
  })

  const [formData, setFormData] = useState({
    firstName: member?.firstName || '',
    lastName: member?.lastName || '',
    phone: member?.phone || '',
    email: member?.email || '',
    gender: member?.gender || '',
    dateOfBirth: member?.dateOfBirth ? new Date(member.dateOfBirth).toISOString().split('T')[0] : '',
    address: member?.address?.street || '',
    city: member?.address?.city || '',
    state: member?.address?.state || '',
    zipCode: member?.address?.zipCode || '',
    country: member?.address?.country || 'India',
    countryCode: '+91',
    emergencyContact: {
      name: member?.emergencyContact?.name || '',
      countryCode: member?.emergencyContact?.countryCode || '+91',
      phone: member?.emergencyContact?.phone || '',
      relationship: member?.emergencyContact?.relationship || ''
    },
    salesRep: member?.salesRep?._id || '',
    memberManager: member?.memberManager?._id || '',
    generalTrainer: member?.generalTrainer?._id || '',
    attendanceId: member?.attendanceId || '',
    clubId: member?.clubId || '',
    gstNo: member?.gstNo || '',
    communicationPreferences: {
      sms: member?.communicationPreferences?.sms ?? true,
      mail: member?.communicationPreferences?.mail ?? true,
      pushNotification: member?.communicationPreferences?.pushNotification ?? true,
      whatsapp: member?.communicationPreferences?.whatsapp ?? true
    },
    customerType: member?.customerType || 'individual',
    source: member?.source || 'walk-in'
  })

  const [fitnessForm, setFitnessForm] = useState(buildFitnessFormState(member))

  // Update form data when member data loads
  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleFitnessChange = (field, value) => {
    setFitnessForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Image upload handler
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        const imageData = reader.result
        // Save profile picture immediately
        updateMutation.mutate({ profilePicture: imageData })
      }
      reader.onerror = () => {
        toast.error('Failed to read image file')
      }
      reader.readAsDataURL(file)
    }
  }

  // Camera cleanup function
  const cleanupCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  // Open camera modal
  const openCameraModal = async (mode = facingMode) => {
    setShowCamera(true)
    setCapturedImage(null)
    setCameraError('')
    setCameraLoading(true)

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported on this browser/device.')
      setCameraLoading(false)
      return
    }

    try {
      cleanupCameraStream()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false
      })

      streamRef.current = stream
      
      // Wait for video element to be available
      setTimeout(() => {
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream
          videoRef.current.play().then(() => {
            setCameraLoading(false)
          }).catch((err) => {
            console.error('Error playing video:', err)
            setCameraError('Failed to start camera preview.')
            setCameraLoading(false)
          })
        }
      }, 100)
    } catch (error) {
      console.error('Error accessing camera:', error)
      setCameraError('Unable to access camera. Please check permissions and try again.')
      setCameraLoading(false)
    }
  }

  // Stop camera
  const stopCamera = () => {
    cleanupCameraStream()
    setShowCamera(false)
    setCapturedImage(null)
    setCameraError('')
    setCameraLoading(false)
  }

  // Capture photo from camera
  const capturePhoto = () => {
    const video = videoRef.current
    if (!video) {
      toast.error('Video element not found.')
      return
    }

    if (video.readyState < 2) {
      toast.error('Camera not ready. Please wait a moment.')
      return
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('Video dimensions not available. Please try again.')
      return
    }

    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = canvas.toDataURL('image/jpeg', 0.85)
      setCapturedImage(imageData)
      toast.success('Photo captured! Review and confirm below.')
    } catch (error) {
      console.error('Error capturing photo:', error)
      toast.error('Failed to capture photo. Please try again.')
    }
  }

  // Confirm captured photo and save
  const confirmCapturedPhoto = () => {
    if (!capturedImage) return
    updateMutation.mutate({ profilePicture: capturedImage })
    stopCamera()
    toast.success('Profile picture updated successfully!')
  }

  // Switch camera (front/back)
  const switchCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newMode)
    cleanupCameraStream()
    await openCameraModal(newMode)
  }

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      cleanupCameraStream()
    }
  }, [])

  // Handle video stream when camera modal opens
  useEffect(() => {
    if (showCamera && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(console.error)
    }
  }, [showCamera])

  const calculateAgeFromDOB = (dobString) => {
    if (!dobString) return undefined
    const dob = new Date(dobString)
    if (Number.isNaN(dob.getTime())) return undefined
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age -= 1
    }
    return age >= 0 ? age : undefined
  }

  useEffect(() => {
    const autoAge = calculateAgeFromDOB(formData.dateOfBirth)
    if (autoAge !== undefined) {
      setFitnessForm(prev => {
        const ageString = autoAge.toString()
        if (prev.age === ageString) return prev
        return { ...prev, age: ageString }
      })
    }
  }, [formData.dateOfBirth])

  useEffect(() => {
    const height = parseFloat(fitnessForm.height)
    const weight = parseFloat(fitnessForm.bodyWeight)
    if (height > 0 && weight > 0) {
      const bmiValue = weight / Math.pow(height / 100, 2)
      const formatted = bmiValue ? bmiValue.toFixed(1) : ''
      setFitnessForm(prev => (prev.bmi === formatted ? prev : { ...prev, bmi: formatted }))
    }
  }, [fitnessForm.height, fitnessForm.bodyWeight])

  useEffect(() => {
    if (member) {
      setFormData({
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        phone: member.phone || '',
        email: member.email || '',
        gender: member.gender || '',
        dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth).toISOString().split('T')[0] : '',
        address: member.address?.street || '',
        city: member.address?.city || '',
        state: member.address?.state || '',
        zipCode: member.address?.zipCode || '',
        country: member.address?.country || 'India',
        countryCode: '+91',
        emergencyContact: {
          name: member.emergencyContact?.name || '',
          countryCode: member.emergencyContact?.countryCode || '+91',
          phone: member.emergencyContact?.phone || '',
          relationship: member.emergencyContact?.relationship || ''
        },
        salesRep: member.salesRep?._id || '',
        memberManager: member.memberManager?._id || '',
        generalTrainer: member.generalTrainer?._id || '',
        attendanceId: member.attendanceId || '',
        clubId: member.clubId || '',
        gstNo: member.gstNo || '',
        communicationPreferences: {
          sms: member.communicationPreferences?.sms ?? true,
          mail: member.communicationPreferences?.mail ?? true,
          pushNotification: member.communicationPreferences?.pushNotification ?? true,
          whatsapp: member.communicationPreferences?.whatsapp ?? true
        },
        customerType: member.customerType || 'individual',
        source: member.source || 'walk-in'
      })
      setFitnessForm(buildFitnessFormState(member))
    }
  }, [member])

  if (isLoading) return <LoadingPage message="Loading member details..." />

  if (!member) return <div className="text-center py-12">Member not found</div>

  const parseFitnessNumber = (value) => {
    if (value === '' || value === null || value === undefined) return undefined
    const parsed = parseFloat(value)
    return Number.isNaN(parsed) ? undefined : parsed
  }

  const handleSubmit = () => {
    const measuredAtValue = fitnessForm.measuredAt
      ? new Date(fitnessForm.measuredAt)
      : member?.fitnessProfile?.measuredAt || undefined
    const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || undefined

    const updateData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      email: formData.email,
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth,
      address: {
        street: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country
      },
      emergencyContact: formData.emergencyContact,
      salesRep: formData.salesRep || null,
      memberManager: formData.memberManager || null,
      generalTrainer: formData.generalTrainer || null,
      clubId: formData.clubId,
      gstNo: formData.gstNo,
      communicationPreferences: formData.communicationPreferences,
      fitnessProfile: {
        age: parseFitnessNumber(fitnessForm.age),
        height: parseFitnessNumber(fitnessForm.height),
        bodyWeight: parseFitnessNumber(fitnessForm.bodyWeight),
        bmi: parseFitnessNumber(fitnessForm.bmi),
        fatPercentage: parseFitnessNumber(fitnessForm.fatPercentage),
        visualFatPercentage: parseFitnessNumber(fitnessForm.visualFatPercentage),
        bodyAge: parseFitnessNumber(fitnessForm.bodyAge),
        musclePercentage: parseFitnessNumber(fitnessForm.musclePercentage),
        cardiovascularTestReport: fitnessForm.cardiovascularTestReport || undefined,
        muscleStrengthReport: fitnessForm.muscleStrengthReport || undefined,
        muscleEndurance: parseFitnessNumber(fitnessForm.muscleEndurance),
        coreStrength: parseFitnessNumber(fitnessForm.coreStrength),
        flexibility: parseFitnessNumber(fitnessForm.flexibility),
        leftHandGripStrength: parseFitnessNumber(fitnessForm.leftHandGripStrength),
        rightHandGripStrength: parseFitnessNumber(fitnessForm.rightHandGripStrength),
        gender: formData.gender || member?.gender || undefined,
        name: fullName,
        measuredAt: measuredAtValue
      },
      customerType: formData.customerType,
      source: formData.source
    }
    updateMutation.mutate(updateData)
  }

  const calculateAge = () => {
    if (!member?.dateOfBirth) return ''
    const today = new Date()
    const birthDate = new Date(member.dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const hasAutoAge = Boolean(formData.dateOfBirth)
  const heightNumeric = parseFloat(fitnessForm?.height)
  const weightNumeric = parseFloat(fitnessForm?.bodyWeight)
  const hasAutoBmi = heightNumeric > 0 && weightNumeric > 0

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'workout', label: 'Workout', icon: Dumbbell },
    { id: 'service-card', label: 'Service Card', icon: CreditCard },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'call-log', label: 'Call Log', icon: PhoneCall },
    // { id: 'referrals', label: 'Referrals', icon: Users },
    // { id: 'attendance', label: 'Attendance', icon: Activity },
    // { id: 'terms', label: 'Terms & Conditions', icon: FileCheck }
  ]

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Clients', to: '/clients' },
          { label: `Profile - ${member.firstName?.toUpperCase()} ${member.lastName?.toUpperCase()}`.trim() }
        ]}
      />

      {/* Main Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex space-x-1 overflow-x-auto px-4">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <div className="p-6">
            {/* Page Title and Action Buttons */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900">
                Profile - {member.firstName?.toUpperCase()} {member.lastName?.toUpperCase()}
              </h1>
            </div>

            {/* Sub Tabs */}
            <div className="flex space-x-4 mb-6 border-b border-gray-200">
              <button
                onClick={() => setActiveSubTab('personal')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeSubTab === 'personal'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Personal Information
              </button>
              <button
                onClick={() => setActiveSubTab('fitness')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeSubTab === 'fitness'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Fitness Profile
              </button>
            </div>

            {activeSubTab === 'personal' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Profile Picture Section */}
                  <div className="flex items-start space-x-6">
                    <div className="flex-shrink-0">
                      {member.profilePicture ? (
                        <img
                          src={member.profilePicture}
                          alt={`${member.firstName} ${member.lastName}`}
                          className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-200">
                          <User className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                      <div className="mt-4 space-y-2">
                        <label className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium flex items-center justify-center space-x-2 cursor-pointer">
                          <Upload className="w-4 h-4" />
                          <span>Upload Image</span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => openCameraModal()}
                          className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Capture Image</span>
                        </button>
                      </div>
                    </div>

                    {/* Personal Details Form */}
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
                          />
                          <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => handleChange('lastName', e.target.value)}
                            disabled={!isEditing}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                            placeholder="Last Name"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Contact Number <span className="text-red-500">*</span>
                        </label>
                        <div className="flex space-x-2">
                          <select
                            value={formData.countryCode}
                            onChange={(e) => handleChange('countryCode', e.target.value)}
                            disabled={!isEditing}
                            className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                          >
                            {countryCodes.map(cc => (
                              <option key={cc.code} value={cc.code}>{cc.country} ({cc.code})</option>
                            ))}
                          </select>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            disabled={!isEditing}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                          />
                          {!isEditing && (
                            <button className="px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium">
                              Change
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          disabled={!isEditing}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
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
                              className="w-4 h-4 text-orange-500 focus:ring-orange-500 disabled:opacity-50"
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
                              className="w-4 h-4 text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700">Female</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="gender"
                              value="other"
                              checked={formData.gender === 'other'}
                              onChange={(e) => handleChange('gender', e.target.value)}
                              disabled={!isEditing}
                              className="w-4 h-4 text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700">Other</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Date of Birth
                        </label>
                        <DateInput
                          value={formData.dateOfBirth}
                          onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Membership Number
                        </label>
                        <p className="px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                          {member.memberId}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Age
                        </label>
                        <p className="px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                          {calculateAge() || 'N/A'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Attendance Card Number
                        </label>
                        <p className="px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                          {member.attendanceId || formData.attendanceId || 'N/A'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Address
                        </label>
                        <textarea
                          value={formData.address}
                          onChange={(e) => handleChange('address', e.target.value)}
                          disabled={!isEditing}
                          rows={3}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                          placeholder="Enter address"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Created By
                        </label>
                        <p className="px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                          {member.createdBy ? `${member.createdBy.firstName} ${member.createdBy.lastName}` : 'N/A'}
                        </p>
                      </div>

                      {/* Emergency Contact */}
                      <div className="pt-4 border-t border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Emergency Contact</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                            <input
                              type="text"
                              value={formData.emergencyContact.name}
                              onChange={(e) => handleChange('emergencyContact.name', e.target.value)}
                              disabled={!isEditing}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Country Code</label>
                            <select
                              value={formData.emergencyContact.countryCode}
                              onChange={(e) => handleChange('emergencyContact.countryCode', e.target.value)}
                              disabled={!isEditing}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                            >
                              {countryCodes.map(cc => (
                                <option key={cc.code} value={cc.code}>{cc.country} ({cc.code})</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Number</label>
                            <input
                              type="tel"
                              value={formData.emergencyContact.phone}
                              onChange={(e) => handleChange('emergencyContact.phone', e.target.value)}
                              disabled={!isEditing}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Relationship</label>
                            <input
                              type="text"
                              value={formData.emergencyContact.relationship}
                              onChange={(e) => handleChange('emergencyContact.relationship', e.target.value)}
                              disabled={!isEditing}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Lead Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Lead Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Customer type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.customerType}
                          onChange={(e) => handleChange('customerType', e.target.value)}
                          disabled={!isEditing}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                        >
                          <option value="individual">Self</option>
                          <option value="corporate">Corporate</option>
                          <option value="group">Group</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Lead source <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.source}
                          onChange={(e) => handleChange('source', e.target.value)}
                          disabled={!isEditing}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                        >
                          <option value="walk-in">Passing By</option>
                          <option value="referral">Referral</option>
                          <option value="online">Online</option>
                          <option value="social-media">Social Media</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Member Manager */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Member Manager</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Sales Rep</label>
                        <select
                          value={formData.salesRep}
                          onChange={(e) => handleChange('salesRep', e.target.value)}
                          disabled={!isEditing}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                        >
                          <option value="">Select</option>
                          {staffData?.staff?.map((staff) => (
                            <option key={staff._id} value={staff._id}>
                              {staff.firstName} {staff.lastName}
                            </option>
                          ))}
                        </select>
                        {member.salesRep && (
                          <p className="mt-1 text-sm text-gray-600">
                            Current: {member.salesRep.firstName} {member.salesRep.lastName}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Member Manager</label>
                        <select
                          value={formData.memberManager}
                          onChange={(e) => handleChange('memberManager', e.target.value)}
                          disabled={!isEditing}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                        >
                          <option value="">Select</option>
                          {staffData?.staff?.map((staff) => (
                            <option key={staff._id} value={staff._id}>
                              {staff.firstName} {staff.lastName}
                            </option>
                          ))}
                        </select>
                        {member.memberManager && (
                          <p className="mt-1 text-sm text-gray-600">
                            Current: {member.memberManager.firstName} {member.memberManager.lastName}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">General Trainer</label>
                        <select
                          value={formData.generalTrainer}
                          onChange={(e) => handleChange('generalTrainer', e.target.value)}
                          disabled={!isEditing}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                        >
                          <option value="">Select</option>
                          {staffData?.staff?.filter(s => s.category === 'trainer').map((staff) => (
                            <option key={staff._id} value={staff._id}>
                              {staff.firstName} {staff.lastName}
                            </option>
                          ))}
                        </select>
                        {member.generalTrainer && (
                          <p className="mt-1 text-sm text-gray-600">
                            Current: {member.generalTrainer.firstName} {member.generalTrainer.lastName}
                          </p>
                        )}
                      </div>
                      {/* <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Personal Trainer</label>
                        <input
                          type="text"
                          value="-"
                          disabled
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                        />
                      </div> */}
                    </div>
                  </div>

                  {/* IDs Section */}
                  {/* <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">IDs</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Attendance ID</label>
                        <p className="px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                          {member.attendanceId || formData.attendanceId || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">RF ID Card</label>
                        <input
                          type="text"
                          value=""
                          disabled
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Club ID</label>
                        <input
                          type="text"
                          value={formData.clubId}
                          onChange={(e) => handleChange('clubId', e.target.value)}
                          disabled={!isEditing}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">GST No</label>
                        <input
                          type="text"
                          value={formData.gstNo}
                          onChange={(e) => handleChange('gstNo', e.target.value)}
                          disabled={!isEditing}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
                        />
                      </div>
                    </div>
                  </div> */}

                  {/* Communication Preferences */}
                  {/* <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Communication Preference Settings</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'sms', label: 'SMS' },
                        { key: 'mail', label: 'Mail' },
                        { key: 'pushNotification', label: 'Push Notification' },
                        { key: 'whatsapp', label: 'WhatsApp' }
                      ].map((pref) => (
                        <div key={pref.key} className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">{pref.label}</label>
                          <button
                            onClick={() => {
                              if (isEditing) {
                                handleChange(`communicationPreferences.${pref.key}`, !formData.communicationPreferences[pref.key])
                              }
                            }}
                            disabled={!isEditing}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              formData.communicationPreferences[pref.key]
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            } ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {formData.communicationPreferences[pref.key] ? 'Yes' : 'No'}
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-xs text-gray-500">
                      I do not have any objection to receive communication from AIRFIT, Indiranagar. {new Date().toLocaleString()}
                    </p>
                  </div> */}
                </div>
              </div>
            )}

            {activeSubTab === 'fitness' && (
              <div className="space-y-6">
                {!Object.values(fitnessForm || {}).some(value => value && value !== '') && !isEditing && (
                  <div className="bg-orange-50 border border-orange-100 text-orange-700 px-4 py-3 rounded-lg text-sm">
                    No fitness metrics recorded yet. Click edit to start capturing this member&apos;s fitness profile.
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Fitness Profile</h3>
                      <p className="text-sm text-gray-500">
                        Last measured on{' '}
                        {fitnessForm.measuredAt
                          ? new Date(fitnessForm.measuredAt).toLocaleDateString()
                          : member?.fitnessProfile?.measuredAt
                            ? new Date(member.fitnessProfile.measuredAt).toLocaleDateString()
                            : 'not recorded'}
                      </p>
                    </div>
                    <div className="w-full md:w-64">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Measurement Date</label>
                      <input
                        type="date"
                        value={fitnessForm.measuredAt}
                        onChange={(e) => handleFitnessChange('measuredAt', e.target.value)}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          !isEditing ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : 'bg-white'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Member Name</label>
                      <input
                        type="text"
                        value={`${formData.firstName} ${formData.lastName}`.trim()}
                        disabled
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                      <input
                        type="text"
                        value={formData.gender || member?.gender || ''}
                        disabled
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[
                      { label: 'Age (yrs)', field: 'age', step: '1', auto: hasAutoAge, helper: hasAutoAge ? 'Calculated from Date of Birth' : null },
                      { label: 'Height (cm)', field: 'height', step: '0.1' },
                      { label: 'Body Weight (kg)', field: 'bodyWeight', step: '0.1' },
                      { label: 'BMI', field: 'bmi', step: '0.1', auto: hasAutoBmi, helper: hasAutoBmi ? 'Automatically calculated from height & weight' : null },
                      { label: 'Fat Percentage (%)', field: 'fatPercentage', step: '0.1' },
                      { label: 'Visceral Fat (%)', field: 'visualFatPercentage', step: '0.1' },
                      { label: 'Body Age', field: 'bodyAge', step: '0.1' },
                      { label: 'Muscle Percentage (%)', field: 'musclePercentage', step: '0.1' },
                      { label: 'Muscle Endurance', field: 'muscleEndurance', step: '0.1' },
                      { label: 'Core Strength', field: 'coreStrength', step: '0.1' },
                      { label: 'Flexibility', field: 'flexibility', step: '0.1' }
                    ].map(({ label, field, step, auto, helper }) => {
                      const fieldDisabled = !isEditing || auto
                      return (
                        <div key={field}>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
                          <input
                            type="number"
                            step={step}
                            value={fitnessForm[field] ?? ''}
                            onChange={(e) => handleFitnessChange(field, e.target.value)}
                            disabled={fieldDisabled}
                            className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                              fieldDisabled ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : 'bg-white'
                            }`}
                          />
                          {helper && (
                            <p className="text-xs text-gray-500 mt-1">{helper}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Grip Strength Section */}
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-md font-bold text-gray-900 mb-4">Grip Strength</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Left Hand Grip Strength (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={fitnessForm.leftHandGripStrength ?? ''}
                          onChange={(e) => handleFitnessChange('leftHandGripStrength', e.target.value)}
                          disabled={!isEditing}
                          className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                            !isEditing ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : 'bg-white'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Right Hand Grip Strength (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={fitnessForm.rightHandGripStrength ?? ''}
                          onChange={(e) => handleFitnessChange('rightHandGripStrength', e.target.value)}
                          disabled={!isEditing}
                          className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                            !isEditing ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : 'bg-white'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cardiovascular Test Report</label>
                      <textarea
                        rows={4}
                        value={fitnessForm.cardiovascularTestReport}
                        onChange={(e) => handleFitnessChange('cardiovascularTestReport', e.target.value)}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none ${
                          !isEditing ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : 'bg-white'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Muscle Strength Report</label>
                      <textarea
                        rows={4}
                        value={fitnessForm.muscleStrengthReport}
                        onChange={(e) => handleFitnessChange('muscleStrengthReport', e.target.value)}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none ${
                          !isEditing ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : 'bg-white'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      // Reset form data
                      if (member) {
                        setFormData({
                          firstName: member.firstName || '',
                          lastName: member.lastName || '',
                          phone: member.phone || '',
                          email: member.email || '',
                          gender: member.gender || '',
                          dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth).toISOString().split('T')[0] : '',
                          address: member.address?.street || '',
                          city: member.address?.city || '',
                          state: member.address?.state || '',
                          zipCode: member.address?.zipCode || '',
                          country: member.address?.country || 'India',
                          countryCode: '+91',
                          emergencyContact: {
                            name: member.emergencyContact?.name || '',
                            countryCode: member.emergencyContact?.countryCode || '+91',
                            phone: member.emergencyContact?.phone || '',
                            relationship: member.emergencyContact?.relationship || ''
                          },
                          salesRep: member.salesRep?._id || '',
                          memberManager: member.memberManager?._id || '',
                          generalTrainer: member.generalTrainer?._id || '',
                          attendanceId: member.attendanceId || '',
                          clubId: member.clubId || '',
                          gstNo: member.gstNo || '',
                          communicationPreferences: {
                            sms: member.communicationPreferences?.sms ?? true,
                            mail: member.communicationPreferences?.mail ?? true,
                            pushNotification: member.communicationPreferences?.pushNotification ?? true,
                            whatsapp: member.communicationPreferences?.whatsapp ?? true
                          },
                          customerType: member.customerType || 'individual',
                          source: member.source || 'walk-in'
                        })
                      }
                      setFitnessForm(buildFitnessFormState(member))
                    }}
                    className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={updateMutation.isLoading}
                    className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Update</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center space-x-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  {(member?.currentPlan?.planId?._id || member?.currentPlan?.planId) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setShowUpgradeModal(true)
                      }}
                      className="px-6 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center space-x-2"
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>Upgrade Membership</span>
                    </button>
                  )}
                  {/* <button className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium">
                    Sell Product
                  </button> */}
                  <button
                    onClick={() => navigate('/clients')}
                    className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'service-card' && (
          <ServiceCardTab 
            member={member} 
            invoices={invoicesData?.invoices || []}
            isLoading={invoicesLoading}
            activeServiceTab={activeServiceTab}
            setActiveServiceTab={setActiveServiceTab}
            activeServiceStatus={activeServiceStatus}
            setActiveServiceStatus={setActiveServiceStatus}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsTab
            member={member}
            invoices={paymentsData?.invoices || []}
            pagination={paymentsData?.pagination || { page: 1, pages: 1, total: 0 }}
            isLoading={paymentsLoading}
            filter={paymentFilter}
            setFilter={setPaymentFilter}
            page={paymentPage}
            setPage={setPaymentPage}
            navigate={navigate}
          />
        )}

        {activeTab === 'call-log' && (
          <CallLogTab
            member={member}
            showCallModal={showCallModal}
            setShowCallModal={setShowCallModal}
          />
        )}

        {activeTab === 'referrals' && (
          <ReferralsTab
            member={member}
            showReferralModal={showReferralModal}
            setShowReferralModal={setShowReferralModal}
          />
        )}

        {activeTab === 'workout' && (
          <WorkoutTab member={member} />
        )}

        {activeTab === 'attendance' && (
          <AttendanceTab member={member} />
        )}

        {activeTab === 'terms' && (
          <TermsConditionsTab member={member} />
        )}

        {activeTab !== 'profile' && activeTab !== 'workout' && activeTab !== 'service-card' && activeTab !== 'payments' && activeTab !== 'call-log' && activeTab !== 'referrals' && activeTab !== 'attendance' && activeTab !== 'terms' && (
          <div className="p-6 text-center py-12 text-gray-500">
            {tabs.find(t => t.id === activeTab)?.label} section coming soon
          </div>
        )}
      </div>

      {/* Upgrade Membership Modal */}
      {showUpgradeModal && member && (
        <UpgradeMembershipModal
          isOpen={true}
          onClose={() => setShowUpgradeModal(false)}
          member={member}
        />
      )}
    </div>
  )
}

// Service Card Tab Component
function ServiceCardTab({ member, invoices, isLoading, activeServiceTab, setActiveServiceTab, activeServiceStatus, setActiveServiceStatus }) {
  const [dateChangeModal, setDateChangeModal] = useState({ isOpen: false, invoice: null, itemIndex: 0 })
  const [freezeModal, setFreezeModal] = useState({ isOpen: false, invoice: null, itemIndex: 0 })
  const queryClient = useQueryClient()

  // Date change mutation
  const changeDateMutation = useMutation({
    mutationFn: async ({ invoiceId, itemIndex, startDate, expiryDate }) => {
      const res = await api.post('/invoices/change-date', {
        invoiceId,
        itemIndex,
        startDate,
        expiryDate
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['member-invoices', member?._id])
      toast.success('Date changed successfully')
      setDateChangeModal({ isOpen: false, invoice: null, itemIndex: 0 })
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to change date')
    }
  })

  // Freeze mutation
  const freezeMutation = useMutation({
    mutationFn: async ({ invoiceId, itemIndex, startDate, endDate, reason }) => {
      const res = await api.post('/invoices/freeze', {
        invoiceId,
        itemIndex,
        startDate,
        endDate,
        reason
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['member-invoices', member?._id])
      queryClient.invalidateQueries(['member', member?._id]) // Invalidate member query to update totalFreezeDaysUsed
      toast.success('Service frozen successfully')
      setFreezeModal({ isOpen: false, invoice: null, itemIndex: 0 })
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to freeze service')
    }
  })
  const calculateDaysRemaining = (endDate) => {
    if (!endDate) return 0
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to start of day
    const expiry = new Date(endDate)
    expiry.setHours(0, 0, 0, 0) // Set to start of day
    const diffTime = expiry - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  const formatDate = (date) => {
    if (!date) return null
    const d = new Date(date)
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return {
      day: d.getDate().toString().padStart(2, '0'),
      month: months[d.getMonth()],
      year: d.getFullYear().toString().slice(2),
      weekday: weekdays[d.getDay()]
    }
  }

  // Calculate statistics - count all invoices except cancelled ones
  const totalBookings = invoices.filter(inv => inv.status !== 'cancelled' && inv.status !== 'refunded').length
  const totalBookingValue = invoices
    .filter(inv => inv.status !== 'cancelled' && inv.status !== 'refunded')
    .reduce((sum, inv) => sum + (inv.total || 0), 0)
  const totalReferrals = 0
  const totalReferralValue = 0
  const totalPending = invoices
    .filter(inv => inv.status === 'partial' || inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + (inv.pending || 0), 0)

  // Get relationship since date (with dummy data if missing)
  const relationshipSince = member?.createdAt 
    ? new Date(member.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
    : invoices.length === 0 ? '05-11-2025' : '-'

  // Filter active/expired services from REAL invoices only (not dummy data)
  const activeServices = invoices.filter(inv => {
    if (!inv.items || inv.items.length === 0) return false
    const item = inv.items[0]
    if (!item.expiryDate) return inv.status === 'paid' || inv.status === 'partial'
    const expiry = new Date(item.expiryDate)
    return expiry >= new Date() && (inv.status === 'paid' || inv.status === 'partial')
  })

  const expiredServices = invoices.filter(inv => {
    if (!inv.items || inv.items.length === 0) return false
    const item = inv.items[0]
    if (!item.expiryDate) return false
    const expiry = new Date(item.expiryDate)
    return expiry < new Date()
  })

  const displayedServices = activeServiceStatus === 'active' ? activeServices : expiredServices

  // Calculate actual membership status based on active services
  // If member has active services, status should be "Active", otherwise use member's stored status
  const actualMembershipStatus = activeServices.length > 0 ? 'active' : (member?.membershipStatus || 'pending')

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingPage message="Loading service card..." fullScreen={false} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {member?.profilePicture ? (
            <img
              src={member.profilePicture}
              alt={member.firstName}
              className="w-16 h-16 rounded-full object-cover border-4 border-orange-200 shadow-lg"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center border-4 border-orange-200 shadow-lg">
              <User className="w-8 h-8 text-gray-500" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900">
            Service Card - {member?.firstName?.toUpperCase()} {member?.lastName?.toUpperCase()}
          </h1>
        </div>
      </div>

      {/* Service Overview Section - Modern Design */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Member Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Current Membership Status */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <p className="text-xs font-medium text-green-700 mb-2">Current Membership Status</p>
              <p className={`text-xl font-bold ${
                actualMembershipStatus === 'active' ? 'text-green-700' : 
                actualMembershipStatus === 'pending' ? 'text-red-600' : 
                'text-gray-900'
              }`}>
                {actualMembershipStatus ? actualMembershipStatus.charAt(0).toUpperCase() + actualMembershipStatus.slice(1) : 'Pending'}
              </p>
            </div>

            {/* Total Bookings */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <p className="text-xs font-medium text-blue-700 mb-2">Total Bookings</p>
              <p className="text-xl font-bold text-blue-900">{totalBookings}</p>
              <p className="text-xs text-blue-600 mt-1">₹{totalBookingValue.toLocaleString()}</p>
            </div>

            {/* Relationship Since */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <p className="text-xs font-medium text-purple-700 mb-2">Relationship Since</p>
              <p className="text-xl font-bold text-purple-900">{relationshipSince}</p>
            </div>

            {/* Total Referrals */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
              <p className="text-xs font-medium text-indigo-700 mb-2">Total Referrals</p>
              <p className="text-xl font-bold text-indigo-900">{totalReferrals}</p>
              <p className="text-xs text-indigo-600 mt-1">₹{totalReferralValue.toLocaleString()}</p>
            </div>

            {/* Member ID */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-medium text-gray-600 mb-2">Member ID</p>
              <p className="text-lg font-bold text-gray-900">{member?.memberId || 'N/A'}</p>
            </div>

            {/* Attendance ID */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-medium text-gray-600 mb-2">Attendance ID</p>
              <p className="text-lg font-bold text-gray-900">{member?.attendanceId || 'N/A'}</p>
            </div>

            {/* Total Pending Payment */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
              <p className="text-xs font-medium text-red-700 mb-2">Total Pending Payment</p>
              <p className="text-xl font-bold text-red-900">₹{totalPending.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>


      {/* Recent Purchased Services */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent purchased services</h2>
        
        {/* Active/Expired Tabs */}
        <div className="flex space-x-4 mb-4 border-b border-gray-200">
          {['active', 'expired'].map((status) => (
            <button
              key={status}
              onClick={() => setActiveServiceStatus(status)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeServiceStatus === status
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Service Cards */}
        <div className="space-y-4">
          {displayedServices.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                {activeServiceStatus === 'active' ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                      <Calendar className="w-8 h-8 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No Active Memberships
                      </h3>
                      <p className="text-sm text-gray-500 max-w-md">
                        This member does not have any active memberships at the moment. 
                        {expiredServices.length > 0 && ' You can check expired services in the Expired tab.'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-gray-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No Expired Services
                      </h3>
                      <p className="text-sm text-gray-500 max-w-md">
                        This member does not have any expired services.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            displayedServices.map((invoice) => {
              const item = invoice.items?.[0]
              if (!item) return null

              const startDate = item.startDate ? formatDate(item.startDate) : null
              const expiryDate = item.expiryDate ? formatDate(item.expiryDate) : null
              const daysRemaining = item.expiryDate ? calculateDaysRemaining(item.expiryDate) : 0
              const isActive = item.expiryDate ? new Date(item.expiryDate) >= new Date() : true

              // Get service name and variation from member's currentPlan if available, otherwise from invoice
              const serviceName = member?.currentPlan?.planId?.serviceName || 
                                 invoice.planId?.serviceName || 
                                 'Gym Membership'
              const serviceVariationName = member?.currentPlan?.planId?.name || 
                                          invoice.planId?.name || 
                                          item.serviceId?.name || 
                                          item.description || 
                                          'N/A'

              // Format duration display
              const formatDurationDisplay = (duration) => {
                if (!duration) return '7 Days Per week. Valid for 3 month(s).'
                if (duration.includes('Month') || duration.includes('month')) {
                  const match = duration.match(/(\d+)\s*month/i)
                  if (match) {
                    return `7 Days Per week. Valid for ${match[1]} month(s).`
                  }
                }
                return duration
              }

              return (
                <div key={invoice._id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Service Details */}
                    <div className="lg:col-span-2 space-y-5">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1.5">Service Name</p>
                          <p className="text-base font-bold text-gray-900">
                            {serviceName}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1.5">Service Variation Name</p>
                          <p className="text-base font-bold text-gray-900">
                            {serviceVariationName}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1.5">Service Id</p>
                        <p className="text-base font-bold text-gray-900">{invoice.invoiceNumber || 'N/A'}</p>
                      </div>

                      <div className="pt-4 border-t border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Duration</p>
                          <p className="text-sm font-medium text-gray-900">{formatDurationDisplay(item.duration)}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6 pt-4 border-t border-gray-200">
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1.5">Status</p>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {isActive ? 'Active' : 'Expired'}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1.5">Last visited on</p>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900">-</p>
                            <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium">
                              Attendance
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Date Information */}
                    <div className="border-l border-gray-200 pl-6">
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {item.expiryDate && (
                          <div className="text-center bg-orange-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600  font-bold   uppercase mb-1">Days Remaining</p>
                            <p className="text-2xl font-bold text-orange-600">{daysRemaining}</p>
                            <p className="text-xs text-gray-600 uppercase mt-1">Day(s)</p>
                          </div>
                        )}
                        {startDate && (
                          <div className="text-center bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600  font-bold   uppercase mb-1">Start Date</p>
                            <p className="text-2xl font-bold text-gray-900">{startDate.day}</p>
                            <p className="text-xs text-gray-600 uppercase mt-1">{startDate.month} '{startDate.year}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{startDate.weekday}</p>
                          </div>
                        )}
                        {expiryDate && (
                          <div className="text-center bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-bold text-gray-600 uppercase mb-1">End Date</p>
                            <p className="text-2xl font-bold text-gray-900">{expiryDate.day}</p>
                            <p className="text-xs font-bold text-gray-600 uppercase mt-1">{expiryDate.month} '{expiryDate.year}</p>
                            <p className="text-xs font-bold text-gray-500 mt-0.5">{expiryDate.weekday}</p>
                          </div>
                        )}
                        {!daysRemaining && !startDate && !expiryDate && (
                          <>
                            <div className="text-center bg-orange-50 rounded-lg p-3">
                              <p className="text-2xl font-bold text-orange-600">24</p>
                              <p className="text-xs text-gray-600 uppercase mt-1">Day(s)</p>
                            </div>
                            <div className="text-center bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-600 uppercase mb-1">Start Date</p>
                              <p className="text-2xl font-bold text-gray-900">01</p>
                              <p className="text-xs text-gray-600 uppercase mt-1">SEPTEMBER '25</p>
                              <p className="text-xs text-gray-500 mt-0.5">Monday</p>
                            </div>
                            <div className="text-center bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-600 uppercase mb-1">End Date</p>
                              <p className="text-2xl font-bold text-gray-900">30</p>
                              <p className="text-xs text-gray-600 uppercase mt-1">NOVEMBER '25</p>
                              <p className="text-xs text-gray-500 mt-0.5">Sunday</p>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="space-y-2">
                        {(startDate || expiryDate || (!startDate && !expiryDate)) && (
                          <button 
                            onClick={() => setDateChangeModal({ isOpen: true, invoice, itemIndex: 0 })}
                            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium"
                          >
                            Change Date
                          </button>
                        )}
                        {item.expiryDate && (() => {
                          const usedFreezeDays = member?.totalFreezeDaysUsed || 0
                          const remainingFreezeDays = 30 - usedFreezeDays
                          return (
                            <button 
                              onClick={() => setFreezeModal({ isOpen: true, invoice, itemIndex: 0 })}
                              className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium flex items-center justify-between"
                            >
                              <span>Freeze</span>
                              <span className="text-xs font-semibold">
                                ({remainingFreezeDays} days left)
                              </span>
                            </button>
                          )
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
                    <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium">
                      Suspend
                    </button>
                    <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium">
                      Staff Update
                    </button>
                    <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium">
                      Cancel/Refund
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {displayedServices.length > 0 && (
          <button className="mt-4 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium">                              
            Load More
          </button>
        )}
      </div>

      {/* Date Change Modal */}
      {dateChangeModal.isOpen && dateChangeModal.invoice && (
        <DateChangeModal
          invoice={dateChangeModal.invoice}
          itemIndex={dateChangeModal.itemIndex}
          onClose={() => setDateChangeModal({ isOpen: false, invoice: null, itemIndex: 0 })}
          onSave={(startDate, expiryDate) => {
            changeDateMutation.mutate({
              invoiceId: dateChangeModal.invoice._id,
              itemIndex: dateChangeModal.itemIndex,
              startDate,
              expiryDate
            })
          }}
          isLoading={changeDateMutation.isLoading}
        />
      )}

      {/* Freeze Modal */}
      {freezeModal.isOpen && freezeModal.invoice && (
        <FreezeModal
          invoice={freezeModal.invoice}
          itemIndex={freezeModal.itemIndex}
          member={member}
          onClose={() => setFreezeModal({ isOpen: false, invoice: null, itemIndex: 0 })}
          onSave={(startDate, endDate, reason) => {
            freezeMutation.mutate({
              invoiceId: freezeModal.invoice._id,
              itemIndex: freezeModal.itemIndex,
              startDate,
              endDate,
              reason
            })
          }}
          isLoading={freezeMutation.isLoading}
        />
      )}
    </div>
  )
}

// Date Change Modal Component
function DateChangeModal({ invoice, itemIndex, onClose, onSave, isLoading }) {
  const item = invoice.items?.[itemIndex]
  const [startDate, setStartDate] = useState(item?.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '')
  const [expiryDate, setExpiryDate] = useState(item?.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!startDate && !expiryDate) {
      toast.error('Please select at least one date')
      return
    }
    if (startDate && expiryDate && new Date(startDate) >= new Date(expiryDate)) {
      toast.error('Start date must be before expiry date')
      return
    }
    onSave(startDate || null, expiryDate || null)
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
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
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Change Date</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Freeze Modal Component
function FreezeModal({ invoice, itemIndex, member, onClose, onSave, isLoading }) {
  const item = invoice.items?.[itemIndex]
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const maxFreezeDays = 30
  const usedFreezeDays = member?.totalFreezeDaysUsed || 0
  const remainingFreezeDays = maxFreezeDays - usedFreezeDays

  // Calculate freeze days from date range
  const calculateFreezeDays = (start, end) => {
    if (!start || !end) return 0
    const startDateObj = new Date(start)
    const endDateObj = new Date(end)
    const diffTime = endDateObj - startDateObj
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end days
    return diffDays > 0 ? diffDays : 0
  }

  const currentFreezeDays = calculateFreezeDays(startDate, endDate)

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates')
      return
    }

    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)

    if (startDateObj >= endDateObj) {
      toast.error('End date must be after start date')
      return
    }

    const days = calculateFreezeDays(startDate, endDate)
    
    if (days <= 0) {
      toast.error('Invalid date range')
      return
    }

    if (days > remainingFreezeDays) {
      toast.error(`Cannot freeze. The selected period (${days} days) exceeds your remaining freeze days (${remainingFreezeDays} days).`)
      return
    }

    onSave(startDate, endDate, reason)
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
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
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Freeze Service (with Extension)</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Freeze Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Freeze End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
            {startDate && endDate && currentFreezeDays > 0 && (
              <p className={`text-xs mt-1 ${currentFreezeDays > remainingFreezeDays ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                Selected period: <span className="font-semibold">{currentFreezeDays} days</span>
                {currentFreezeDays > remainingFreezeDays && (
                  <span className="block mt-1">⚠️ Exceeds remaining freeze days ({remainingFreezeDays} days)</span>
                )}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Available freeze days: <span className="font-semibold text-blue-600">{remainingFreezeDays}</span> out of {maxFreezeDays} days
              {usedFreezeDays > 0 && (
                <span className="text-gray-400"> (Used: {usedFreezeDays} days)</span>
              )}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              rows="3"
              placeholder="Enter reason for freeze"
            />
          </div>
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Freezing...' : 'Freeze Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Payments Tab Component
function PaymentsTab({ member, invoices, pagination, isLoading, filter, setFilter, page, setPage, navigate }) {
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(null)
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(null)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0)
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
  }

  const getPaymentModeDisplay = (invoice) => {
    if (invoice.payments && invoice.payments.length > 0) {
      const payment = invoice.payments[0]
      const modeMap = {
        'razorpay': 'Online Payment',
        'cash': 'Cash',
        'card': 'Card',
        'upi': 'UPI',
        'bank_transfer': 'Bank Transfer',
        'other': 'Other'
      }
      return modeMap[payment.paymentMethod] || payment.paymentMethod
    }
    if (invoice.paymentMethod) {
      const modeMap = {
        'razorpay': 'Online Payment',
        'cash': 'Cash',
        'card': 'Card',
        'upi': 'UPI',
        'bank_transfer': 'Bank Transfer',
        'other': 'Other'
      }
      return modeMap[invoice.paymentMethod] || invoice.paymentMethod
    }
    return '-'
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingPage message="Loading payments..." fullScreen={false} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Title and Action Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Payments - {member?.firstName?.toUpperCase()} {member?.lastName?.toUpperCase()}
        </h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowInvoiceModal(true)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>New Invoice</span>
          </button>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Filter by</label>
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value)
                  setPage(1)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm"
              >
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="pro-forma">Pro Forma</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination - Top */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="First page"
          >
            <ChevronsLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setPage(page - 1)}
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
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= pagination.pages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setPage(pagination.pages)}
            disabled={page >= pagination.pages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Last page"
          >
            <ChevronsRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Purchased</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Pro Forma Invoice No.</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Tax</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Net</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Paid</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">TDS Amount</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Pending</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Mode</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Write Off</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Pro Forma Invoice Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => {
                  const taxAmount = invoice.tax?.amount || 0
                  const netAmount = invoice.subtotal || (invoice.total - taxAmount)
                  const paidAmount = invoice.totalPaid || 0
                  const pendingAmount = invoice.pending || Math.max(0, invoice.total - paidAmount)
                  const isPaid = paidAmount >= invoice.total
                  
                  return (
                    <tr key={invoice._id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {formatDate(invoice.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {member?.firstName?.toUpperCase()} {member?.lastName?.toUpperCase()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {invoice.isProForma ? invoice.invoiceNumber : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {formatCurrency(taxAmount)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {formatCurrency(netAmount)}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-green-600">
                        {formatCurrency(paidAmount)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {formatCurrency(invoice.tdsAmount || 0)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {pendingAmount > 0 ? formatCurrency(pendingAmount) : '0'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {getPaymentModeDisplay(invoice)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {invoice.writeOff ? 'Yes' : 'No'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {pendingAmount > 0 && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setShowRecordPaymentModal(invoice)
                              }}
                              className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs font-medium"
                              title="Record Payment"
                            >
                              Pay
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (invoice._id) {
                                navigate(`/invoices/${invoice._id}`)
                              } else {
                                toast.error('Invoice ID not available')
                              }
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (invoice._id) {
                                // Open invoice print page in new window
                                const printUrl = `/invoices/${invoice._id}/print`
                                window.open(printUrl, '_blank')
                              } else {
                                toast.error('Invoice ID not available')
                              }
                            }}
                            className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                            title="Print Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Send"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination - Bottom */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="First page"
          >
            <ChevronsLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setPage(page - 1)}
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
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= pagination.pages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setPage(pagination.pages)}
            disabled={page >= pagination.pages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Last page"
          >
            <ChevronsRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Razorpay Payment Modal */}
      {showPaymentModal && (
        <RazorpayPayment
          invoice={showPaymentModal}
          onClose={() => setShowPaymentModal(null)}
          onSuccess={() => {
            setShowPaymentModal(null)
            // The query will auto-refresh due to invalidation in RazorpayPayment component
          }}
        />
      )}

      {/* Record Payment Modal */}
      {showRecordPaymentModal && (
        <RecordPaymentModal
          invoice={showRecordPaymentModal}
          isOpen={!!showRecordPaymentModal}
          onClose={() => setShowRecordPaymentModal(null)}
          onSuccess={() => {
            setShowRecordPaymentModal(null)
            // The query will auto-refresh due to invalidation in RecordPaymentModal component
          }}
        />
      )}

      {/* Add Invoice Modal */}
      <AddInvoiceModal
        isOpen={showInvoiceModal}
        onClose={(shouldRefresh) => {
          setShowInvoiceModal(false)
          if (shouldRefresh) {
            // The query will auto-refresh due to invalidation in AddInvoiceModal component
          }
        }}
        defaultMemberId={member?._id}
        defaultMemberName={member ? `${member.firstName} ${member.lastName}`.trim() : ''}
        defaultMemberPhone={member?.phone || ''}
      />
    </div>
  )
}

// Call Log Tab Component
function CallLogTab({ member, showCallModal, setShowCallModal }) {
  const [callTypeFilter, setCallTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [expandedCall, setExpandedCall] = useState(null)
  const [editingCall, setEditingCall] = useState(null)
  const [updateForm, setUpdateForm] = useState({})
  
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff').then(res => res.data)
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['member-calls', member._id, callTypeFilter, statusFilter, startDate, endDate],
    queryFn: () => getMemberCalls(member._id, { 
      callType: callTypeFilter !== 'all' ? callTypeFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      startDate,
      endDate
    }).then(res => res.data)
  })

  const callTypes = [
    { value: 'welcome', label: 'Welcome Call' },
    { value: 'induction', label: 'Induction Call' },
    { value: 'assessment', label: 'Assessment call' },
    { value: 'upgrade', label: 'Upgrade Call' },
    { value: 'renewal', label: 'Renewal Call' },
    { value: 'courtesy', label: 'Courtesy Call' },
    { value: 'feedback', label: 'Feedback Call' },
    { value: 'birthday', label: 'Birthday Call' },
    { value: 'payment', label: 'Payment Call' },
    { value: 'cross-sell', label: 'Cross-sell Call' },
    { value: 'other', label: 'Irregular Member' }
  ]

  const statuses = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'completed', label: 'Completed' },
    { value: 'missed', label: 'Missed' },
    { value: 'no-answer', label: 'No Answer' },
    { value: 'busy', label: 'Busy' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'contacted', label: 'Contacted' }
  ]

  const [form, setForm] = useState({
    callType: '',
    calledBy: '',
    status: 'scheduled',
    scheduledAt: '',
    notes: ''
  })

  // Calculate call statistics
  const calls = data?.calls || []
  const stats = {
    welcome: calls.filter(c => c.callType === 'welcome').length,
    induction: calls.filter(c => c.callType === 'induction').length,
    upgrade: calls.filter(c => c.callType === 'upgrade').length,
    courtesy: calls.filter(c => c.callType === 'courtesy').length,
    renewal: calls.filter(c => c.callType === 'renewal').length,
    birthday: calls.filter(c => c.callType === 'birthday').length,
    payment: calls.filter(c => c.callType === 'payment').length,
    crossSell: calls.filter(c => c.callType === 'cross-sell').length,
    feedback: calls.filter(c => c.callType === 'feedback').length,
    inbound: 0,
    anniversary: 0,
    irregular: calls.filter(c => c.callType === 'other').length,
    total: calls.length,
    upcoming: calls.filter(c => c.status === 'scheduled').length,
    missed: calls.filter(c => c.status === 'missed').length,
    contacted: calls.filter(c => c.status === 'contacted' || c.status === 'completed').length,
    noContact: calls.filter(c => c.status === 'no-answer').length
  }

  const createMutation = useMutation({
    mutationFn: () => createMemberCall(member._id, form),
    onSuccess: () => {
      toast.success('Call logged successfully')
      setShowCallModal(false)
      setForm({ callType: '', calledBy: '', status: 'scheduled', scheduledAt: '', notes: '' })
      refetch()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to log call')
  })

  const updateMutation = useMutation({
    mutationFn: (callId) => updateMemberCall(member._id, callId, updateForm),
    onSuccess: () => {
      toast.success('Call updated successfully')
      setEditingCall(null)
      setUpdateForm({})
      refetch()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update call')
  })

  const formatDateTime = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/\//g, '-')
  }

  const handleUpdateCall = (call) => {
    setEditingCall(call._id)
    setUpdateForm({
      callType: call.callType,
      status: call.status,
      notes: call.notes || '',
      scheduledAt: call.scheduledAt ? new Date(call.scheduledAt).toISOString().slice(0, 16) : ''
    })
  }

  const handleSaveUpdate = () => {
    if (editingCall) {
      updateMutation.mutate(editingCall)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          Member Call log - {member?.firstName?.toUpperCase()} {member?.lastName?.toUpperCase()}
        </h1>
      </div>

      {/* Call Statistics Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div>
            <p className="text-xs text-gray-600 mb-1">Welcome call</p>
            <p className={`text-lg font-bold ${stats.welcome > 0 ? 'text-green-600' : 'text-gray-900'}`}>{stats.welcome}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Induction call</p>
            <p className={`text-lg font-bold ${stats.induction > 0 ? 'text-green-600' : 'text-gray-900'}`}>{stats.induction}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Upgrade call</p>
            <p className={`text-lg font-bold ${stats.upgrade > 0 ? 'text-green-600' : 'text-gray-900'}`}>{stats.upgrade}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Courtesy call</p>
            <p className={`text-lg font-bold ${stats.courtesy > 0 ? 'text-green-600' : 'text-gray-900'}`}>{stats.courtesy}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Renewal call</p>
            <p className={`text-lg font-bold ${stats.renewal > 0 ? 'text-green-600' : 'text-gray-900'}`}>{stats.renewal}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Birthday call</p>
            <p className={`text-lg font-bold ${stats.birthday > 0 ? 'text-green-600' : 'text-gray-900'}`}>{stats.birthday}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Payment call</p>
            <p className={`text-lg font-bold ${stats.payment > 0 ? 'text-green-600' : 'text-gray-900'}`}>{stats.payment}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Cross-sell call</p>
            <p className={`text-lg font-bold ${stats.crossSell > 0 ? 'text-green-600' : 'text-gray-900'}`}>{stats.crossSell}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Feedback call</p>
            <p className={`text-lg font-bold ${stats.feedback > 0 ? 'text-green-600' : 'text-gray-900'}`}>{stats.feedback}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Inbound Call</p>
            <p className={`text-lg font-bold ${stats.inbound > 0 ? 'text-green-600' : 'text-gray-900'}`}>{stats.inbound}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Anniversary Call</p>
            <p className={`text-lg font-bold ${stats.anniversary > 0 ? 'text-green-600' : 'text-gray-900'}`}>{stats.anniversary}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Irregular Member</p>
            <p className={`text-lg font-bold ${stats.irregular > 0 ? 'text-green-600' : 'text-gray-900'}`}>{stats.irregular}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Total call</p>
            <p className={`text-lg font-bold text-green-600`}>{stats.total}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Upcoming</p>
            <p className={`text-lg font-bold text-green-600`}>{stats.upcoming}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Missed</p>
            <p className={`text-lg font-bold ${stats.missed > 0 ? 'text-red-600' : 'text-gray-900'}`}>{stats.missed}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Contacted</p>
            <p className={`text-lg font-bold ${stats.contacted > 0 ? 'text-green-600' : 'text-gray-900'}`}>{stats.contacted}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">No Contact</p>
            <p className={`text-lg font-bold ${stats.noContact > 0 ? 'text-red-600' : 'text-gray-900'}`}>{stats.noContact}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Total</p>
            <p className={`text-lg font-bold text-green-600`}>{stats.total}</p>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-4">
          <button className="px-4 py-3 text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900 transition-colors">
            Enquiry Call log
          </button>
          <button className="px-4 py-3 text-sm font-medium border-b-2 border-orange-500 text-orange-600 transition-colors">
            Member call log
          </button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Member Info and Add Call */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-blue-600 mb-2">
                {member?.firstName?.toUpperCase()} {member?.lastName?.toUpperCase()} - {member?.phone}
              </h3>
            </div>
            
            <div className="flex flex-col items-center justify-center py-8">
              <button
                onClick={() => setShowCallModal(true)}
                className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-base"
              >
                Add new call
              </button>
              <p className="mt-3 text-xs text-gray-500 text-center">
                (On adding new call, scheduled calls will not be updated)
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Contact History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Contact History Header */}
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Contact History</h2>
              
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={callTypeFilter}
                  onChange={(e) => setCallTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                >
                  <option value="all">All Call Type</option>
                  {callTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                >
                  <option value="all">All</option>
                  {statuses.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>

                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">From:</label>
                  <DateInput
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    containerClassName="w-[170px]"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">To:</label>
                  <DateInput
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    containerClassName="w-[170px]"
                  />
                </div>

                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm"
                >
                  Go
                </button>
              </div>
            </div>

            {/* Call Logs List */}
            {isLoading ? (
              <div className="p-6"><LoadingPage message="Loading call logs..." fullScreen={false} /></div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {calls.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">No call logs found</div>
                ) : (
                  calls.map((call) => {
                    const isExpanded = expandedCall === call._id
                    const isEditing = editingCall === call._id
                    const scheduledBy = call.createdBy ? `${call.createdBy.firstName} ${call.createdBy.lastName}` : 'Auto'
                    const calledByStaff = call.calledBy ? `${call.calledBy.firstName} ${call.calledBy.lastName}` : 'N/A'
                    const callTypeLabel = callTypes.find(t => t.value === call.callType)?.label || 'Call'
                    const statusLabel = statuses.find(s => s.value === call.status)?.label || call.status

                    return (
                      <div key={call._id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="flex-shrink-0">
                              {scheduledBy === 'Auto' ? (
                                <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center">
                                  <span className="text-xs font-bold text-blue-600">A</span>
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-600">
                                    {scheduledBy.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <p className="text-xs text-gray-600">Scheduled by: {scheduledBy}</p>
                              </div>
                              
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium border border-gray-200">
                                  {callTypeLabel}
                                </span>
                                <span className="text-xs text-gray-600">for: {calledByStaff}</span>
                              </div>

                              <div className="text-xs text-gray-600 mb-2">
                                Schedule: {formatDateTime(call.scheduledAt)}
                              </div>

                              {isExpanded && !isEditing && (
                                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                                  {call.notes && (
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Notes:</p>
                                      <p className="text-sm text-gray-700">{call.notes}</p>
                                    </div>
                                  )}
                                  {call.updatedAt && (
                                    <div>
                                      <p className="text-xs text-gray-500">Updated Date & Time: {formatDateTime(call.updatedAt)}</p>
                                    </div>
                                  )}
                                  {(call.status === 'contacted' || call.status === 'completed') && (
                                    <div>
                                      <p className="text-xs text-gray-500">Call Status: {statusLabel} - Successful</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {isEditing && (
                                <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Call Type</label>
                                    <select
                                      value={updateForm.callType}
                                      onChange={(e) => setUpdateForm({ ...updateForm, callType: e.target.value })}
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                                    >
                                      {callTypes.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                      value={updateForm.status}
                                      onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                                    >
                                      {statuses.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                                    <textarea
                                      value={updateForm.notes}
                                      onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                                      rows={3}
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Schedule</label>
                                    <input
                                      type="datetime-local"
                                      value={updateForm.scheduledAt}
                                      onChange={(e) => setUpdateForm({ ...updateForm, scheduledAt: e.target.value })}
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                                    />
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={handleSaveUpdate}
                                      disabled={updateMutation.isLoading}
                                      className="px-4 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-xs font-medium"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingCall(null)
                                        setUpdateForm({})
                                      }}
                                      className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-xs font-medium"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            {!isEditing && (
                              <>
                                {call.notes && (
                                  <button
                                    onClick={() => setExpandedCall(isExpanded ? null : call._id)}
                                    className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                                  >
                                    {isExpanded ? 'View Less' : 'View More'}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleUpdateCall(call)}
                                  className="px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-xs font-medium"
                                >
                                  Update
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Call Modal */}
      {showCallModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" 
          onClick={(e) => e.target === e.currentTarget && setShowCallModal(false)}
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
        >
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl border border-gray-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-blue-50">
              <h3 className="text-lg font-bold text-blue-600">{member.firstName} {member.lastName} - {member.phone}</h3>
              <button onClick={() => setShowCallModal(false)} className="p-2 hover:bg-gray-100 rounded transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Call Type<span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.callType}
                      onChange={(e) => setForm({ ...form, callType: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Select</option>
                      {callTypes.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Called by<span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.calledBy}
                      onChange={(e) => setForm({ ...form, calledBy: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Select</option>
                      {staffData?.staff?.map(s => (
                        <option key={s._id} value={s._id}>{s.firstName} {s.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Call Status<span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      {statuses.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discussion Details<span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={10}
                    maxLength={1800}
                    placeholder="Maximum 1800 characters"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  />
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
                    <input
                      type="datetime-local"
                      value={form.scheduledAt}
                      onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCallModal(false)
                  setForm({ callType: '', calledBy: '', status: 'scheduled', scheduledAt: '', notes: '' })
                }}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!form.callType || !form.calledBy || !form.notes.trim() || createMutation.isLoading}
                className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Referrals Tab Component
function ReferralsTab({ member, showReferralModal, setShowReferralModal }) {
  const [activeSubTab, setActiveSubTab] = useState('referred-by')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    countryCode: '+91',
    phone: ''
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['member-referrals', member._id, activeSubTab],
    queryFn: () => getMemberReferrals(member._id, { referralType: activeSubTab }).then(res => res.data)
  })

  const createMutation = useMutation({
    mutationFn: () => createMemberReferral(member._id, {
      referralType: activeSubTab,
      ...formData
    }),
    onSuccess: () => {
      toast.success('Referral added successfully')
      setShowReferralModal(false)
      setFormData({ name: '', email: '', countryCode: '+91', phone: '' })
      refetch()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to add referral')
  })

  const referrals = data?.referrals || []
  const memberName = `${member?.firstName} ${member?.lastName}`

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.phone) {
      toast.error('Name and Phone are required')
      return
    }
    createMutation.mutate()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          Referral - {memberName}
        </h1>
      </div>

      {/* Sub Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveSubTab('referred-by')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === 'referred-by'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Referred By {memberName}
            </button>
            <button
              onClick={() => setActiveSubTab('referrer')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === 'referrer'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {memberName}'s Referrer
            </button>
          </div>
          <button
            onClick={() => setShowReferralModal(true)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Referral</span>
          </button>
        </div>
      </div>

      {/* Referrals List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-6"><LoadingPage message="Loading referrals..." fullScreen={false} /></div>
        ) : referrals.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg">No Results Found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">S.No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Mail</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Country Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Mobile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {referrals.map((referral, index) => {
                  const referralName = referral.referredMemberId 
                    ? `${referral.referredMemberId.firstName} ${referral.referredMemberId.lastName}`
                    : referral.name || 'N/A'
                  const referralEmail = referral.referredMemberId?.email || referral.email || '-'
                  const referralPhone = referral.referredMemberId?.phone || referral.phone || '-'
                  
                  return (
                    <tr key={referral._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{referralName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{referralEmail}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{referral.countryCode || '+91'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{referralPhone}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          referral.status === 'converted' ? 'bg-green-100 text-green-700' :
                          referral.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                          referral.status === 'declined' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {referral.status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Referral Modal */}
      {showReferralModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" 
          onClick={(e) => e.target === e.currentTarget && setShowReferralModal(false)}
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
        >
          <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl border border-gray-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-orange-50">
              <h3 className="text-lg font-bold text-gray-900">Add Referral - {memberName}</h3>
              <button onClick={() => setShowReferralModal(false)} className="p-2 hover:bg-gray-100 rounded transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">S.No</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Mail</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Country Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Mobile</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">1</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                            placeholder="Enter name"
                            required
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                            placeholder="Enter email"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={formData.countryCode}
                            onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                          >
                            {countryCodes.map((cc) => (
                              <option key={cc.code} value={cc.code}>
                                {cc.country} ({cc.code})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <input
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                              placeholder="Enter mobile"
                              required
                            />
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowReferralModal(false)
                    setFormData({ name: '', email: '', countryCode: '+91', phone: '' })
                  }}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formData.name || !formData.phone || createMutation.isLoading}
                  className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// Terms & Conditions Tab Component
// Helper function to get exercise image URL from frontend public/exercises folder
const getExerciseImageUrl = (exerciseName) => {
  if (!exerciseName) return null
  
  // Normalize exercise name for matching
  const normalizeName = (name) => {
    return name.toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim()
  }
  
  const normalizedName = normalizeName(exerciseName)
  
  // Map exercise names to image files in public/exercises folder
  const exerciseImageMap = {
    'PUSH-UPS': 'Push Ups.jpg',
    'BENCH-PRESS': 'flat dumbell press.jpg',
    'CHEST-PRESS': 'chest pres.jpg',
    'FLAT DB-PRESS': 'flat dumbell press.jpg',
    'INCLINE DB-PRESS': 'Incline Dumbbell Press.jpg',
    'DECLINE DB-PRESS': 'Dumbbell Decline Fly.jpg',
    'DB-FLY': 'pec fly.jpg',
    'CABLE-CROSS': 'Cable Crossover.jpg',
    'PEC-DECK': 'pec fly.jpg',
    'BENT-OVER-ROW': 'Bent Over Row.jpg',
    'DB-BENT-OVER-ROW': 'Dumbbell Bent Over Row.jpg',
    'ONE-ARM-DB-ROW': 'Dumbbell One Arm Bent Over Row.jpg',
    'LAT-PULLDOWN': 'Lat pull-down.jpg',
    'PULL-UPS': 'Lat pull-down.jpg',
    'T-BAR-ROW': 'Bent Over Row.jpg',
    'SEATED-ROW': 'seated back row.jpg',
    'DEAD-LIFT': 'ROMANIAN DEADLIFT.jpg',
    'ROMANIAN-DEADLIFT': 'ROMANIAN DEADLIFT.jpg',
    'HYPEREXTENSION': 'Hyperextension.jpg',
    'BACK-EXTENSION': 'Back Extension.jpg',
    'SHOULDER-PRESS': 'Overhead Dumbbell Press.jpg',
    'DB-SHOULDER-PRESS': 'seated dumbell press.jpg',
    'LATERAL-RAISE': 'Dumbbell Lateral Raise.jpg',
    'FRONT-RAISE': 'Dumbbell Lateral Raise.jpg',
    'UPRIGHT-ROW': 'upright row.jpg',
    'SHRUGS': 'Dumbbell Shrug.jpg',
    'REAR-DELT-FLY': 'bend over lateral raise.jpg',
    'SQUATS': 'free squats.jpg',
    'LEG-PRESS': 'leg press.jpg',
    'LEG-EXTENSION': 'leg press.jpg',
    'LEG-CURL': 'seated leg curl.jpg',
    'LUNGES': 'Lunge With.jpg',
    'BULGARIAN-SPLIT-SQUAT': 'Bulgarian Split Squat.jpg',
    'CALF-RAISE': 'calf raises.jpg',
    'STEP-UPS': 'Dumbbell Step Up.jpg',
    'BICEP-CURL': 'dumbell curl.jpg',
    'HAMMER-CURL': 'Dumbbell Close Grip Curl.jpg',
    'PREACHER-CURL': 'Preacher Curl.jpg',
    'CABLE-CURL': 'Biceps cable curl.jpg',
    'CONCENTRATION-CURL': 'Dumbbell Incline Biceps Curl.jpg',
    'TRICEP-EXTENSION': 'Dumbbell Standing Triceps Extension.jpg',
    'OVERHEAD-TRICEP': 'Dumbbell Seated Triceps Extension.jpg',
    'TRICEP-PUSHDOWN': 'Cable Tricep Pushdown.jpg',
    'CLOSE-GRIP-BENCH': 'Barbell Close Grip Bench Press.jpg',
    'SKULL-CRUSHERS': 'skull crusher.jpg',
    'CRUNCHES': 'crunches.jpg',
    'SIT-UPS': 'crunches.jpg',
    'PLANK': 'plank.jpg',
    'SIDE-PLANK': 'Side Plank Oblique Crunch.jpg',
    'RUSSIAN-TWIST': 'Russian Twist.jpg',
    'MOUNTAIN-CLIMBER': 'Mountain Climber.jpg',
    'LEG-RAISE': 'abs leg raises.jpg',
    'TREADMILL': 'Treadmill.jpg',
    'RUNNING': 'Treadmill.jpg',
    'BIKE': 'recumbent bike.jpg',
    'CYCLE': 'recumbent bike.jpg',
    'ROWING': 'seated rowing.jpg',
    'ELLIPTICAL': 'elliptical.jpg',
  }
  
  // Try to find exact match first
  if (exerciseImageMap[normalizedName]) {
    return `/exercises/${exerciseImageMap[normalizedName]}`
  }
  
  // Try partial matching - check if any key is contained in the normalized name or vice versa
  for (const [key, imageFile] of Object.entries(exerciseImageMap)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return `/exercises/${imageFile}`
    }
  }
  
  // Try word-based matching - check if significant words match
  const exerciseWords = normalizedName.split('-').filter(w => w.length > 3)
  for (const [key, imageFile] of Object.entries(exerciseImageMap)) {
    const keyWords = key.split('-').filter(w => w.length > 3)
    const matchingWords = exerciseWords.filter(word => 
      keyWords.some(keyWord => keyWord.includes(word) || word.includes(keyWord))
    )
    if (matchingWords.length >= 1) {
      return `/exercises/${imageFile}`
    }
  }
  
  // Final fallback: try to match by first significant word in image filename
  if (exerciseWords.length > 0) {
    const firstWord = exerciseWords[0]
    for (const [key, imageFile] of Object.entries(exerciseImageMap)) {
      const imageNameUpper = imageFile.toUpperCase().replace('.JPG', '').replace(/[^A-Z0-9]/g, '')
      if (imageNameUpper.includes(firstWord) && firstWord.length > 4) {
        return `/exercises/${imageFile}`
      }
    }
  }
  
  // Ultimate fallback: return a default image that should always exist
  return `/exercises/Push Ups.jpg`
}

// Workout Tab Component
function WorkoutTab({ member }) {
  const [exercises, setExercises] = useState([])
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignments, setAssignments] = useState([])
  const [weekDay, setWeekDay] = useState(new Date().getDay())
  const [selectedAssignmentDay, setSelectedAssignmentDay] = useState(null)
  const [activeExerciseTab, setActiveExerciseTab] = useState('all')
  const queryClient = useQueryClient()

  const { data: exercisesData, isLoading: exercisesLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => api.get('/exercises').then(res => res.data)
  })

  const { data: assignmentsData, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['member-exercises', member._id, weekDay],
    queryFn: () => api.get(`/exercises/member/${member._id}`, {
      params: { weekDay }
    }).then(res => res.data),
    enabled: !!member._id
  })

  useEffect(() => {
    if (exercisesData?.exercises) {
      filterExercisesByTab(exercisesData.exercises, activeExerciseTab)
    }
  }, [exercisesData, activeExerciseTab])

  const filterExercisesByTab = (allExercises, tab, returnArray = false) => {
    if (!allExercises) return returnArray ? [] : null
    
    let filtered = []
    if (tab === 'all') {
      filtered = allExercises
    } else if (tab === 'cardio') {
      filtered = allExercises.filter(ex => ex.category === 'cardio')
    } else if (tab === 'chest') {
      filtered = allExercises.filter(ex => ex.muscleGroups?.includes('chest'))
    } else if (tab === 'back') {
      filtered = allExercises.filter(ex => ex.muscleGroups?.includes('back'))
    } else if (tab === 'shoulder') {
      filtered = allExercises.filter(ex => ex.muscleGroups?.includes('shoulders'))
    } else if (tab === 'lower body') {
      filtered = allExercises.filter(ex => ex.muscleGroups?.includes('legs'))
    } else if (tab === 'biceps') {
      filtered = allExercises.filter(ex => ex.muscleGroups?.includes('biceps'))
    } else if (tab === 'triceps') {
      filtered = allExercises.filter(ex => ex.muscleGroups?.includes('triceps'))
    } else if (tab === 'abs') {
      filtered = allExercises.filter(ex => ex.muscleGroups?.includes('abs'))
    }
    
    if (returnArray) {
      return filtered
    } else {
      setExercises(filtered)
    }
  }

  useEffect(() => {
    if (assignmentsData?.assignments) {
      setAssignments(assignmentsData.assignments)
    }
  }, [assignmentsData])

  const assignExerciseMutation = useMutation({
    mutationFn: (data) => api.post('/exercises/assign', {
      ...data,
      memberId: member._id
    }),
    onSuccess: () => {
      toast.success('Exercise assigned successfully')
      queryClient.invalidateQueries(['member-exercises', member._id])
      // Return to exercise selection instead of closing modal
      setSelectedExercise(null)
      setSelectedVariation(null)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to assign exercise')
    }
  })

  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId) => api.delete(`/exercises/assignment/${assignmentId}`),
    onSuccess: () => {
      toast.success('Exercise removed successfully')
      queryClient.invalidateQueries(['member-exercises', member._id])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to remove exercise')
    }
  })

  const handleAssign = (exercise) => {
    if (typeof selectedAssignmentDay !== 'number') {
      toast.error('Please select a day first')
      return
    }
    setSelectedExercise(exercise)
    setSelectedVariation(null)
  }

  const handleOpenAssignModal = () => {
    setSelectedAssignmentDay(weekDay)
    setSelectedExercise(null)
    setSelectedVariation(null)
    setShowAssignModal(true)
  }

  const [selectedVariation, setSelectedVariation] = useState(null)

  const handleSubmitAssignment = (e) => {
    e.preventDefault()
    if (typeof selectedAssignmentDay !== 'number') {
      toast.error('Pick a day to assign this exercise')
      return
    }
    
    // Check for duplicate assignment - same exercise on same day
    const isDuplicate = assignments.some(assignment => 
      assignment.exerciseId?._id === selectedExercise._id && 
      assignment.weekDay === selectedAssignmentDay
    )
    
    if (isDuplicate) {
      toast.error('This exercise is already assigned for this day')
      return
    }
    
    const formData = new FormData(e.target)
    const variationId = formData.get('variationId')
    const variation = selectedExercise.variations?.find(v => v._id === variationId)
    
    // Check if this is a cardio exercise
    const isCardio = selectedExercise.category === 'cardio'
    
    const assignmentData = {
      exerciseId: selectedExercise._id,
      weekDay: selectedAssignmentDay,
      weekNumber: null, // null means repeats every week
      isRecurring: true, // Always recurring
      variationId: variationId || null,
      order: 0,
      notes: null
    }
    
    if (isCardio) {
      // For cardio exercises, use duration and distance
      const duration = formData.get('duration')
      const distance = formData.get('distance')
      assignmentData.duration = duration ? parseFloat(duration) : null
      assignmentData.distance = distance ? parseFloat(distance) : null
      // Set sets/reps to null for cardio
      assignmentData.sets = null
      assignmentData.reps = null
      assignmentData.weight = null
      assignmentData.restTime = null
    } else {
      // For non-cardio exercises, use sets/reps/weight
      assignmentData.sets = formData.get('sets') ? parseInt(formData.get('sets')) : (variation?.sets || selectedExercise.sets) || null
      assignmentData.reps = formData.get('reps') || (variation?.reps || selectedExercise.reps) || null
      assignmentData.weight = formData.get('weight') || (variation?.weight || null)
      assignmentData.restTime = formData.get('restTime') || (variation?.restTime || selectedExercise.restTime) || null
      // Set duration/distance to null for non-cardio
      assignmentData.duration = null
      assignmentData.distance = null
    }
    
    assignExerciseMutation.mutate(assignmentData)
  }

  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const [showQRModal, setShowQRModal] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  // Generate QR code URL for member login
  useEffect(() => {
    if (showQRModal && member?.email) {
      // Create a login URL with email parameter for auto-login
      const baseUrl = window.location.origin
      const loginUrl = `${baseUrl}/member/login?email=${encodeURIComponent(member.email)}&auto=true`
      setQrCodeUrl(loginUrl)
    }
  }, [showQRModal, member?.email])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Workout Plan</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowQRModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            QR Code
          </button>
          <button
            onClick={handleOpenAssignModal}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Assign Exercise
          </button>
        </div>
      </div>

      {/* Week Day Selector - Exercises repeat every week */}
      <div className="flex items-center gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Week Day</label>
          <select
            value={weekDay}
            onChange={(e) => setWeekDay(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {weekDays.map((day, index) => (
              <option key={index} value={index}>{day}</option>
            ))}
          </select>
        </div>
        <div className="mt-6">
          <span className="text-sm text-gray-600 italic">Exercises repeat every week</span>
        </div>
      </div>

      {/* Assigned Exercises */}
      {assignmentsLoading ? (
        <div className="text-center py-12 text-gray-500">Loading exercises...</div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No exercises assigned for {weekDays[weekDay]}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((assignment) => {
            const exercise = assignment.exerciseId
            if (!exercise) return null

            // Get image from public/exercises folder first, then fallback to database imageUrl
            let exerciseImageUrl = getExerciseImageUrl(exercise.name)
            
            // If no match found in local folder, try database imageUrl (but skip Unsplash URLs)
            if (!exerciseImageUrl && exercise.imageUrl && !exercise.imageUrl.includes('unsplash.com')) {
              exerciseImageUrl = exercise.imageUrl?.startsWith('http') 
                ? exercise.imageUrl 
                : `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${exercise.imageUrl}`
            }

            return (
              <div key={assignment._id} className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex gap-4">
                  {/* Image on Left */}
                  {exerciseImageUrl && (
                    <div className="flex-shrink-0 w-40 h-40 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                      <img
                        src={exerciseImageUrl}
                        alt={exercise.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>'
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Details on Right */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{exercise.name}</h3>
                        {exercise.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{exercise.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm('Remove this exercise from the workout plan?')) {
                            deleteAssignmentMutation.mutate(assignment._id)
                          }
                        }}
                        className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2 p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {exercise.category === 'cardio' ? (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700">Duration:</span>
                            <span className="text-gray-900">{assignment.duration ? `${assignment.duration} min` : (exercise.duration ? `${exercise.duration} min` : 'N/A')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700">Distance:</span>
                            <span className="text-gray-900">{assignment.distance ? `${assignment.distance} km` : (exercise.distance ? `${exercise.distance} km` : 'N/A')}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700">Sets:</span>
                            <span className="text-gray-900">{assignment.sets || exercise.sets || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700">Reps:</span>
                            <span className="text-gray-900">{assignment.reps || exercise.reps || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700">Weight:</span>
                            <span className="text-orange-600 font-medium">
                              {assignment.weight || exercise.weight || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700">Rest:</span>
                            <span className="text-gray-900">{assignment.restTime || exercise.restTime || 'N/A'}</span>
                          </div>
                        </div>
                      )}
                      {assignment.variationId && exercise.variations && (
                        <div className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md inline-block">
                          Variation: {exercise.variations.find(v => v._id === assignment.variationId)?.name || 'Custom'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
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
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Member Login QR Code</h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                Scan this QR code with your phone to automatically log in and view your workout plan
              </p>
              
              {qrCodeUrl ? (
                <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                    <QRCodeSVG
                      value={qrCodeUrl}
                      size={256}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex justify-center p-8">
                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800 font-semibold mb-1">Member Email:</p>
                <p className="text-sm text-blue-900">{member?.email || 'N/A'}</p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(qrCodeUrl)
                    toast.success('Login link copied to clipboard!')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Copy Link
                </button>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Exercise Modal */}
      {showAssignModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
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
        >
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedExercise ? `Assign: ${selectedExercise.name}` : 'Select Exercise'}
              </h3>
              <button
                onClick={() => {
                  setShowAssignModal(false)
                  setSelectedExercise(null)
                  setSelectedVariation(null)
                  setSelectedAssignmentDay(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!selectedExercise ? (
              <div className="p-6">
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Choose the day for this workout *</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {weekDays.map((day, index) => {
                      const isSelected = selectedAssignmentDay === index
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setSelectedAssignmentDay(index)}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                              : 'border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600'
                          }`}
                        >
                          <span className="block">{day}</span>
                        </button>
                      )
                    })}
                  </div>
                  {typeof selectedAssignmentDay !== 'number' && (
                    <p className="mt-2 text-xs text-red-500">Select a day to see available exercises.</p>
                  )}
                </div>

                {/* Search/Filter */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search exercises..."
                    onChange={(e) => {
                      const searchTerm = e.target.value.toLowerCase()
                      let baseExercises = exercisesData?.exercises || []
                      
                      // First filter by active tab
                      if (activeExerciseTab !== 'all') {
                        baseExercises = filterExercisesByTab(baseExercises, activeExerciseTab, true)
                      }
                      
                      // Then filter by search term
                      if (searchTerm) {
                        setExercises(baseExercises.filter(ex => 
                          ex.name.toLowerCase().includes(searchTerm) ||
                          ex.category?.toLowerCase().includes(searchTerm) ||
                          ex.muscleGroups?.some(mg => mg.toLowerCase().includes(searchTerm))
                        ))
                      } else {
                        setExercises(baseExercises)
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                {/* Exercise Tabs */}
                <div className="mb-4 border-b border-gray-200">
                  <div className="flex space-x-1 overflow-x-auto">
                    {['all', 'cardio', 'chest', 'back', 'shoulder', 'lower body', 'biceps', 'triceps', 'abs'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => {
                          setActiveExerciseTab(tab)
                          filterExercisesByTab(exercisesData?.exercises || [], tab)
                        }}
                        className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors capitalize ${
                          activeExerciseTab === tab
                            ? 'border-orange-500 text-orange-600'
                            : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                        }`}
                      >
                        {tab === 'lower body' ? 'Lower Body' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-2">
                  {typeof selectedAssignmentDay !== 'number' ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      Pick a week day to start assigning exercises.
                    </div>
                  ) : exercisesLoading ? (
                    <div className="col-span-full text-center py-12 text-gray-500">Loading exercises...</div>
                  ) : exercises.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      <p className="mb-2">No exercises available</p>
                      <p className="text-xs text-gray-400">Run the seed script to add exercises: npm run seed:exercises</p>
                    </div>
                  ) : (
                    exercises.map((exercise) => {
                      // Get image from public/exercises folder first, then fallback to database imageUrl
                      let imageUrl = getExerciseImageUrl(exercise.name)
                      
                      // If no match found in local folder, try database imageUrl (but skip Unsplash URLs)
                      if (!imageUrl && exercise.imageUrl && !exercise.imageUrl.includes('unsplash.com')) {
                        if (exercise.imageUrl.startsWith('http://') || exercise.imageUrl.startsWith('https://')) {
                          imageUrl = exercise.imageUrl
                        } else {
                          // Relative path - prepend backend URL
                          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
                          imageUrl = `${backendUrl}${exercise.imageUrl.startsWith('/') ? '' : '/'}${exercise.imageUrl}`
                        }
                      }
                      
                      // Final fallback to default image
                      if (!imageUrl) {
                        imageUrl = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80'
                      }
                      
                      return (
                        <button
                          key={exercise._id}
                          onClick={() => handleAssign(exercise)}
                          className="group relative bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-orange-500 hover:shadow-lg transition-all duration-300 flex flex-col"
                        >
                          <div className="w-full rounded-t-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                            <img
                              src={imageUrl}
                              alt={exercise.name}
                              className="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-300"
                              style={{ maxHeight: '600px', minHeight: '300px' }}
                              onError={(e) => {
                                // Fallback to a default image if the original fails
                                e.target.src = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80'
                              }}
                            />
                          </div>
                          <div className="p-4 bg-gradient-to-b from-white to-gray-50">
                            <h4 className="font-semibold text-gray-900 text-center text-sm leading-tight line-clamp-2 group-hover:text-orange-600 transition-colors">
                              {exercise.name}
                            </h4>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitAssignment} className="p-6 space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-orange-600 font-semibold">Assigning for</p>
                    <p className="text-lg font-bold text-orange-900">
                      {weekDays[selectedAssignmentDay] || 'Select day'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedExercise(null)
                      setSelectedVariation(null)
                    }}
                    className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                  >
                    Change exercise
                  </button>
                </div>

                {/* Show different fields based on exercise category */}
                {selectedExercise.category === 'cardio' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (minutes) *</label>
                      <input
                        type="number"
                        name="duration"
                        placeholder={selectedExercise.duration ? `${selectedExercise.duration} min` : 'e.g., 20'}
                        min="1"
                        step="1"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Distance (km) *</label>
                      <input
                        type="number"
                        name="distance"
                        placeholder={selectedExercise.distance ? `${selectedExercise.distance} km` : 'e.g., 3.5'}
                        min="0"
                        step="0.1"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Sets</label>
                        <input
                          type="number"
                          name="sets"
                          placeholder={selectedExercise.sets || 'Default'}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Reps</label>
                        <input
                          type="text"
                          name="reps"
                          placeholder={selectedExercise.reps || 'Default'}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Weight</label>
                        <input
                          type="text"
                          name="weight"
                          placeholder={selectedExercise.weight || 'e.g., 20 kg or 45 lbs'}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Rest Time</label>
                      <input
                        type="text"
                        name="restTime"
                        placeholder={selectedExercise.restTime || 'Default'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedExercise(null)
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={assignExerciseMutation.isLoading}
                    className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                  >
                    {assignExerciseMutation.isLoading ? 'Assigning...' : 'Assign Exercise'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TermsConditionsTab({ member }) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    agreementDate: member?.termsAndConditions?.agreementDate 
      ? new Date(member.termsAndConditions.agreementDate).toISOString().split('T')[0] 
      : '',
    terms: member?.termsAndConditions?.terms || '',
    conditions: member?.termsAndConditions?.conditions || '',
    specialNotes: member?.termsAndConditions?.specialNotes || ''
  })

  const updateMutation = useMutation({
    mutationFn: (data) => updateMember(member._id, {
      termsAndConditions: {
        ...data,
        agreementDate: data.agreementDate ? new Date(data.agreementDate) : undefined,
        lastUpdated: new Date(),
        lastUpdatedBy: 'current-user' // This should be set from auth context
      }
    }),
    onSuccess: () => {
      toast.success('Terms & Conditions updated successfully')
      setIsEditing(false)
      queryClient.invalidateQueries(['member', member._id])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update Terms & Conditions')
    }
  })

  // Update form data when member data changes
  useEffect(() => {
    if (member?.termsAndConditions) {
      setFormData({
        agreementDate: member.termsAndConditions.agreementDate 
          ? new Date(member.termsAndConditions.agreementDate).toISOString().split('T')[0] 
          : '',
        terms: member.termsAndConditions.terms || '',
        conditions: member.termsAndConditions.conditions || '',
        specialNotes: member.termsAndConditions.specialNotes || ''
      })
    }
  }, [member])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  const handleCancel = () => {
    setFormData({
      agreementDate: member?.termsAndConditions?.agreementDate 
        ? new Date(member.termsAndConditions.agreementDate).toISOString().split('T')[0] 
        : '',
      terms: member?.termsAndConditions?.terms || '',
      conditions: member?.termsAndConditions?.conditions || '',
      specialNotes: member?.termsAndConditions?.specialNotes || ''
    })
    setIsEditing(false)
  }

  const termsData = member?.termsAndConditions || {}

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Terms & Conditions</h1>
        <div className="flex items-center space-x-3">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center space-x-2"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={updateMutation.isLoading}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Terms & Conditions Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Agreement Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Agreement Date
          </label>
          {isEditing ? (
            <DateInput
              value={formData.agreementDate}
              onChange={(e) => handleChange('agreementDate', e.target.value)}
              containerClassName="max-w-md"
            />
          ) : (
            <p className="text-gray-900">
              {termsData.agreementDate 
                ? new Date(termsData.agreementDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })
                : 'Not set'}
            </p>
          )}
        </div>

        {/* Terms Section */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Terms <span className="text-gray-500 font-normal">(General terms of service)</span>
          </label>
          {isEditing ? (
            <textarea
              value={formData.terms}
              onChange={(e) => handleChange('terms', e.target.value)}
              rows={8}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              placeholder="Enter general terms of service..."
            />
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-h-[150px]">
              <p className="text-gray-700 whitespace-pre-wrap">
                {termsData.terms || 'No terms specified'}
              </p>
            </div>
          )}
        </div>

        {/* Conditions Section */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Conditions <span className="text-gray-500 font-normal">(Specific conditions and rules)</span>
          </label>
          {isEditing ? (
            <textarea
              value={formData.conditions}
              onChange={(e) => handleChange('conditions', e.target.value)}
              rows={8}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              placeholder="Enter specific conditions and rules..."
            />
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-h-[150px]">
              <p className="text-gray-700 whitespace-pre-wrap">
                {termsData.conditions || 'No conditions specified'}
              </p>
            </div>
          )}
        </div>

        {/* Special Notes Section */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Special Notes <span className="text-gray-500 font-normal">(Additional notes or special agreements)</span>
          </label>
          {isEditing ? (
            <textarea
              value={formData.specialNotes}
              onChange={(e) => handleChange('specialNotes', e.target.value)}
              rows={6}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              placeholder="Enter any special notes or additional agreements..."
            />
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-h-[120px]">
              <p className="text-gray-700 whitespace-pre-wrap">
                {termsData.specialNotes || 'No special notes'}
              </p>
            </div>
          )}
        </div>

        {/* Metadata */}
        {!isEditing && (termsData.lastUpdated || termsData.acceptedBy) && (
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              {termsData.lastUpdated && (
                <div>
                  <span className="font-medium">Last Updated:</span>{' '}
                  {new Date(termsData.lastUpdated).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
              {termsData.acceptedBy && (
                <div>
                  <span className="font-medium">Accepted By:</span>{' '}
                  {typeof termsData.acceptedBy === 'object' 
                    ? `${termsData.acceptedBy.firstName} ${termsData.acceptedBy.lastName}`
                    : 'N/A'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[10002] flex items-center justify-center" 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              stopCamera()
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden border border-gray-200 relative" 
            style={{ zIndex: 10003, pointerEvents: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title Bar */}
            <div className="bg-gray-100 px-4 py-3 flex items-center justify-between border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Capture Member Photo</h3>
                <p className="text-xs text-gray-500">Grant camera permissions to click a quick photo from this device.</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); stopCamera(); }}
                className="text-gray-600 hover:text-gray-900 transition-colors p-1 hover:bg-gray-200 rounded z-10"
                style={{ position: 'relative', zIndex: 10 }}
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            
            {/* Camera Preview Area */}
            <div className="bg-white p-4">
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '320px' }}>
                {capturedImage ? (
                  <img
                    src={capturedImage}
                    alt="Captured preview"
                    className="w-full h-full object-cover"
                  />
                ) : cameraError ? (
                  <div className="flex items-center justify-center h-full text-center px-6">
                    <p className="text-sm text-gray-200">{cameraError}</p>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    onLoadedMetadata={() => {
                      if (videoRef.current) {
                        videoRef.current.play().catch(console.error)
                      }
                    }}
                    onCanPlay={() => {
                      setCameraLoading(false)
                    }}
                  />
                )}
                {cameraLoading && !capturedImage && !cameraError && (
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                    <p className="text-white text-sm">Requesting camera access…</p>
                  </div>
                )}
                {!capturedImage && !cameraError && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="bg-white rounded-full p-4 shadow-lg hover:bg-gray-100 transition-colors"
                      disabled={cameraLoading}
                    >
                      <Camera className="w-6 h-6 text-gray-900" />
                    </button>
                    <button
                      type="button"
                      onClick={switchCamera}
                      className="bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition-colors"
                      disabled={cameraLoading}
                      title="Switch camera"
                    >
                      <Camera className="w-5 h-5 text-gray-900" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-end gap-3 border-t border-gray-200">
              {capturedImage ? (
                <>
                  <button
                    type="button"
                    onClick={() => setCapturedImage(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={confirmCapturedPhoto}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Confirm & Save
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
