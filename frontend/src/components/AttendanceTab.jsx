import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  searchMemberByAttendanceId, 
  getMemberActiveServices, 
  checkIn,
  checkOut,
  getMemberAttendanceHistory
} from '../api/attendance'
import { getMemberTimeSlots } from '../api/members'
import { Clock, Calendar, User, CheckCircle2, XCircle, LogOut, AlertTriangle, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from './LoadingSpinner'
import DateInput from './DateInput'
import TimeInput from './TimeInput'
import MemberTimeSlots from './MemberTimeSlots'

export default function AttendanceTab({ member }) {
  const queryClient = useQueryClient()
  const [attendanceId, setAttendanceId] = useState('')
  const [selectedMember, setSelectedMember] = useState(member || null)
  const [checkInType, setCheckInType] = useState('current-branch')
  const [selectedService, setSelectedService] = useState('')
  const [checkInDate, setCheckInDate] = useState('')
  const [checkInTime, setCheckInTime] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [showTimeSlotsModal, setShowTimeSlotsModal] = useState(false)

  // Format date for input
  const formatDateForInput = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Format time for input
  const formatTimeForInput = (date) => {
    if (!date) {
      const now = new Date()
      return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    }
    const d = new Date(date)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  // Initialize date and time
  useEffect(() => {
    if (!checkInDate) {
      setCheckInDate(formatDateForInput(new Date()))
    }
    if (!checkInTime) {
      setCheckInTime(formatTimeForInput(new Date()))
    }
  }, [])

  // Set initial member if provided
  useEffect(() => {
    if (member && !selectedMember) {
      setSelectedMember(member)
    }
  }, [member])

  // Fetch active services when member is selected
  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['member-active-services', selectedMember?._id],
    queryFn: () => getMemberActiveServices(selectedMember._id).then(res => res.data),
    enabled: !!selectedMember?._id
  })

  // Fetch time slots for expired members
  const { data: timeSlotsData } = useQuery({
    queryKey: ['member-time-slots', selectedMember?._id],
    queryFn: () => getMemberTimeSlots(selectedMember._id).then(res => res.data),
    enabled: !!selectedMember?._id && selectedMember?.membershipStatus === 'expired'
  })

  // Fetch current check-in status
  const { data: attendanceHistory } = useQuery({
    queryKey: ['member-attendance-history', selectedMember?._id],
    queryFn: () => getMemberAttendanceHistory(selectedMember._id, { limit: 1 }).then(res => res.data),
    enabled: !!selectedMember?._id
  })

  const activeServices = servicesData?.services || []
  const timeSlots = timeSlotsData?.timeSlots || []
  const currentCheckIn = attendanceHistory?.attendance?.[0]?.checkOutTime ? null : attendanceHistory?.attendance?.[0]

  // Set default service when services load
  useEffect(() => {
    if (activeServices.length > 0 && !selectedService) {
      setSelectedService(activeServices[0].serviceId)
    }
  }, [activeServices])

  // Search member by attendance ID
  const handleSearch = async () => {
    if (!attendanceId.trim()) {
      toast.error('Please enter an attendance ID')
      return
    }

    setIsSearching(true)
    try {
      const response = await searchMemberByAttendanceId(attendanceId)
      if (response.data.success) {
        setSelectedMember(response.data.member)
        toast.success('Member found')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Member not found')
      setSelectedMember(null)
    } finally {
      setIsSearching(false)
    }
  }

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: (data) => checkIn(data).then(res => res.data),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Check-in successful!')
        setAttendanceId('')
        queryClient.invalidateQueries(['member', member?._id])
        queryClient.invalidateQueries(['member-active-services', selectedMember?._id])
      } else {
        toast.error(data.message || 'Check-in failed')
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Check-in failed')
    }
  })

  // Check if current time is within allowed time slot
  const checkTimeSlotAccess = () => {
    if (selectedMember?.membershipStatus !== 'expired' || timeSlots.length === 0) {
      return { allowed: true }
    }

    const checkInDateTime = new Date(`${checkInDate}T${checkInTime}`)
    const dayOfWeek = checkInDateTime.getDay()
    const currentTime = checkInTime

    const daySlots = timeSlots.filter(slot => slot.dayOfWeek === dayOfWeek && slot.enabled)
    
    if (daySlots.length === 0) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      return { 
        allowed: false, 
        message: `No access allowed on ${dayNames[dayOfWeek]}` 
      }
    }

    const isWithinSlot = daySlots.some(slot => {
      const [startHour, startMin] = slot.startTime.split(':').map(Number)
      const [endHour, endMin] = slot.endTime.split(':').map(Number)
      const [currentHour, currentMin] = currentTime.split(':').map(Number)
      
      const startMinutes = startHour * 60 + startMin
      const endMinutes = endHour * 60 + endMin
      const currentMinutes = currentHour * 60 + currentMin
      
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes
    })

    if (!isWithinSlot) {
      const allowedSlots = daySlots.map(slot => `${slot.startTime} - ${slot.endTime}`).join(', ')
      return { 
        allowed: false, 
        message: `Access denied. Allowed times: ${allowedSlots}` 
      }
    }

    return { allowed: true }
  }

  const handleCheckIn = () => {
    if (!selectedMember) {
      toast.error('Please search and select a member first')
      return
    }

    if (!selectedService) {
      toast.error('Please select an active service')
      return
    }

    if (!checkInDate || !checkInTime) {
      toast.error('Please select date and time')
      return
    }

    // Check time slot access for expired members
    const timeSlotCheck = checkTimeSlotAccess()
    if (!timeSlotCheck.allowed) {
      toast.error(timeSlotCheck.message)
      return
    }

    checkInMutation.mutate({
      memberId: selectedMember._id,
      checkInType,
      serviceId: selectedService,
      checkInDate,
      checkInTime,
      method: 'manual'
    })
  }

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: (attendanceId) => checkOut(attendanceId).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['member-attendance-history', selectedMember?._id])
      queryClient.invalidateQueries(['member', member?._id])
      toast.success('Check-out successful!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Check-out failed')
    }
  })

  const handleCheckOut = () => {
    if (currentCheckIn?._id) {
      checkOutMutation.mutate(currentCheckIn._id)
    }
  }

  // Calculate membership details
  const getMembershipDetails = () => {
    if (!selectedMember || !selectedMember.currentPlan) return null

    const plan = selectedMember.currentPlan
    const now = new Date()
    const startDate = plan.startDate ? new Date(plan.startDate) : null
    const endDate = plan.endDate ? new Date(plan.endDate) : null

    let daysRemaining = 0
    if (endDate) {
      const diff = endDate - now
      daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24))
    }

    const formatDateDisplay = (date) => {
      if (!date) return null
      const d = new Date(date)
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 
                     'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
      return {
        day: String(d.getDate()).padStart(2, '0'),
        month: months[d.getMonth()],
        year: String(d.getFullYear()).slice(-2),
        weekday: days[d.getDay()]
      }
    }

    const selectedServiceData = activeServices.find(s => s.serviceId === selectedService)
    const serviceName = selectedServiceData?.serviceName || plan.planName || 'N/A'
    const serviceVariationName = selectedServiceData?.serviceVariationName || plan.planName || 'N/A'
    const duration = selectedServiceData?.duration || (plan.planId?.duration ? 
      `${plan.planId.duration.value} ${plan.planId.duration.unit}` : null)

    return {
      serviceName,
      serviceVariationName,
      serviceId: selectedServiceData?.serviceId || plan.planId?._id || plan.planId,
      startDate: formatDateDisplay(startDate),
      expiryDate: formatDateDisplay(endDate),
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      duration,
      sessions: selectedServiceData?.sessions || plan.sessions,
      status: selectedMember.membershipStatus,
      lastVisited: selectedMember.attendanceStats?.lastCheckIn
    }
  }

  const membershipDetails = getMembershipDetails()
  const isActive = selectedMember?.membershipStatus === 'active' && 
                   membershipDetails?.daysRemaining > 0

  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Attendance - {selectedMember ? `${selectedMember.firstName} ${selectedMember.lastName}` : 'Member'}
        </h1>
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {selectedMember?.membershipStatus === 'expired' && (
            <button
              onClick={() => setShowTimeSlotsModal(true)}
              className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>Manage Time Slots</span>
            </button>
          )}
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
            Inter branch transfer
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>Print profile</span>
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
            Add Advance Payment
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
            New Invoice
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
            New Call
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
            New appointment
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Section - Check-in Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Check-in Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-900">
              Scan Membership Card Or Enter Attendance Id
            </h2>

            {/* Check-in Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Check in Type
              </label>
              <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="checkInType"
                    value="current-branch"
                    checked={checkInType === 'current-branch'}
                    onChange={(e) => setCheckInType(e.target.value)}
                    className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Current Branch</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="checkInType"
                    value="multiclub"
                    checked={checkInType === 'multiclub'}
                    onChange={(e) => setCheckInType(e.target.value)}
                    className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Multiclub</span>
                </label>
              </div>
            </div>

            {/* Attendance ID */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Attendance id
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={attendanceId}
                  onChange={(e) => setAttendanceId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter attendance ID, member ID, or phone"
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !attendanceId.trim()}
                  className="px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
              {selectedMember && (
                <p className="mt-2 text-sm text-gray-600">
                  {selectedMember.firstName} {selectedMember.lastName} - {selectedMember.phone}
                </p>
              )}
            </div>

            {/* Active Service */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Active service(s)*
              </label>
              {servicesLoading ? (
                <LoadingSpinner />
              ) : (
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                  required
                >
                  {activeServices.length === 0 ? (
                    <option value="">No active services</option>
                  ) : (
                    activeServices.map((service) => (
                      <option key={service.serviceId} value={service.serviceId}>
                        {service.serviceVariationName || service.serviceName}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date*
                </label>
              <DateInput
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="px-4 py-2.5"
                required
              />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Clock In*
                </label>
                <div className="relative flex items-center space-x-2">
                  <TimeInput
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className="flex-1"
                    required
                  />
                  <Clock className="w-5 h-5 text-gray-400" />
                  <button
                    onClick={handleCheckIn}
                    disabled={checkInMutation.isLoading || !selectedMember || !selectedService || !!currentCheckIn}
                    className="px-6 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {checkInMutation.isLoading ? (
                      <LoadingSpinner />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Clock in</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Time Slot Warning for Expired Members */}
            {selectedMember?.membershipStatus === 'expired' && timeSlots.length > 0 && checkInDate && checkInTime && (() => {
              const timeSlotCheck = checkTimeSlotAccess()
              if (!timeSlotCheck.allowed) {
                return (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-800">Time Slot Restriction</p>
                      <p className="text-sm text-yellow-700 mt-1">{timeSlotCheck.message}</p>
                    </div>
                  </div>
                )
              }
              return null
            })()}

            {/* Current Check-in Status */}
            {currentCheckIn && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">Currently Checked In</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Checked in at: {new Date(currentCheckIn.checkInTime).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={handleCheckOut}
                    disabled={checkOutMutation.isPending}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2 disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{checkOutMutation.isPending ? 'Processing...' : 'Check Out'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Membership Details */}
          {membershipDetails && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Service Information</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Service Name: </span>
                  <span className="text-gray-900">{membershipDetails.serviceName}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Service Variation Name: </span>
                  <span className="text-gray-900">{membershipDetails.serviceVariationName}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Service Id: </span>
                  <span className="text-gray-900">{membershipDetails.serviceId || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Duration: </span>
                  <span className="text-gray-900">
                    {membershipDetails.duration || 'N/A'}
                    {membershipDetails.duration && membershipDetails.sessions && ' '}
                    {membershipDetails.sessions && `Sessions: ${membershipDetails.sessions.remaining || membershipDetails.sessions.total || 'N/A'}`}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Sessions: </span>
                  <span className="text-gray-900">
                    {membershipDetails.sessions 
                      ? `${membershipDetails.sessions.used || 0} / ${membershipDetails.sessions.total || 'N/A'}`
                      : 'Not Applicable'}
                  </span>
                </div>
                <div className="flex items-center space-x-4 pt-3 border-t border-gray-200">
                  <div>
                    <span className="font-medium text-gray-600">Status: </span>
                    <span className={`font-semibold ${
                      isActive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isActive ? 'Active' : 'Expired'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Last visited on: </span>
                    <span className="text-gray-900">
                      {membershipDetails.lastVisited 
                        ? new Date(membershipDetails.lastVisited).toLocaleDateString('en-GB')
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Time Slots Display for Expired Members */}
              {selectedMember?.membershipStatus === 'expired' && timeSlots.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                  <h3 className="text-lg font-bold text-gray-900">Time Slot Access</h3>
                  <p className="text-sm text-gray-600">
                    This member can only access the gym during the following times:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((dayName, index) => {
                      const daySlots = timeSlots.filter(slot => slot.dayOfWeek === index && slot.enabled)
                      if (daySlots.length === 0) return null
                      return (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <p className="font-semibold text-gray-900 text-sm">{dayName}</p>
                          {daySlots.map((slot, idx) => (
                            <p key={idx} className="text-sm text-gray-600 mt-1">
                              {slot.startTime} - {slot.endTime}
                            </p>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Date Boxes */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-200">
                {membershipDetails.daysRemaining > 0 && (
                  <div className="text-center bg-orange-50 rounded-lg p-4">
                    <p className="text-3xl font-bold text-orange-600">{membershipDetails.daysRemaining}</p>
                    <p className="text-xs text-gray-600 uppercase mt-1">Day(s)</p>
                  </div>
                )}
                {membershipDetails.startDate && (
                  <div className="text-center bg-gray-50 rounded-lg p-4">
                    <p className="text-3xl font-bold text-gray-900">{membershipDetails.startDate.day}</p>
                    <p className="text-xs text-gray-600 uppercase mt-1">
                      {membershipDetails.startDate.month} '{membershipDetails.startDate.year}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{membershipDetails.startDate.weekday}</p>
                    <p className="text-xs text-gray-600 uppercase mt-2">START DATE</p>
                  </div>
                )}
                {membershipDetails.expiryDate && (
                  <div className="text-center bg-gray-50 rounded-lg p-4">
                    <p className="text-3xl font-bold text-gray-900">{membershipDetails.expiryDate.day}</p>
                    <p className="text-xs text-gray-600 uppercase mt-1">
                      {membershipDetails.expiryDate.month} '{membershipDetails.expiryDate.year}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{membershipDetails.expiryDate.weekday}</p>
                    <p className="text-xs text-gray-600 uppercase mt-2">EXPIRY DATE</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Section - Member Profile */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {selectedMember ? `${selectedMember.firstName} ${selectedMember.lastName}` : 'No Member Selected'}
            </h3>
            <div className="w-32 h-32 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-4">
              {selectedMember?.profilePicture ? (
                <img 
                  src={selectedMember.profilePicture} 
                  alt={selectedMember.firstName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-16 h-16 text-gray-400" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Time Slots Management Modal */}
      {showTimeSlotsModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <MemberTimeSlots 
              memberId={selectedMember._id} 
              onClose={() => setShowTimeSlotsModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

