import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMemberTimeSlots, setMemberTimeSlots } from '../api/members'
import toast from 'react-hot-toast'
import { Clock, Save, X } from 'lucide-react'

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function MemberTimeSlots({ memberId, onClose }) {
  const queryClient = useQueryClient()
  const [timeSlots, setTimeSlots] = useState([])

  // Fetch existing time slots
  const { data: timeSlotsData, isLoading } = useQuery({
    queryKey: ['member-time-slots', memberId],
    queryFn: () => getMemberTimeSlots(memberId).then(res => res.data),
    enabled: !!memberId
  })

  // Initialize time slots
  useEffect(() => {
    if (timeSlotsData?.timeSlots) {
      setTimeSlots(timeSlotsData.timeSlots)
    } else {
      // Initialize with all days disabled
      const initialSlots = dayNames.map((day, index) => ({
        dayOfWeek: index,
        startTime: '06:00',
        endTime: '09:00',
        enabled: false
      }))
      setTimeSlots(initialSlots)
    }
  }, [timeSlotsData])

  // Save time slots mutation
  const saveMutation = useMutation({
    mutationFn: (slots) => setMemberTimeSlots(memberId, slots).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['member-time-slots', memberId])
      queryClient.invalidateQueries(['member', memberId])
      toast.success('Time slots saved successfully')
      if (onClose) onClose()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save time slots')
    }
  })

  const handleToggleDay = (dayIndex) => {
    const updated = timeSlots.map((slot, index) => 
      index === dayIndex ? { ...slot, enabled: !slot.enabled } : slot
    )
    setTimeSlots(updated)
  }

  const handleTimeChange = (dayIndex, field, value) => {
    const updated = timeSlots.map((slot, index) => 
      index === dayIndex ? { ...slot, [field]: value } : slot
    )
    setTimeSlots(updated)
  }

  const handleSave = () => {
    // Only save enabled slots
    const enabledSlots = timeSlots.filter(slot => slot.enabled)
    saveMutation.mutate(enabledSlots)
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-gray-500">Loading time slots...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Time Slot Management</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> Time slots only apply to expired members. Active members can access the gym at any time.
          Configure time slots below to allow expired members access during specific hours.
        </p>
      </div>

      <div className="space-y-4">
        {dayNames.map((dayName, index) => {
          const slot = timeSlots[index] || {
            dayOfWeek: index,
            startTime: '06:00',
            endTime: '09:00',
            enabled: false
          }

          return (
            <div
              key={index}
              className={`border rounded-lg p-4 transition-colors ${
                slot.enabled
                  ? 'border-orange-300 bg-orange-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slot.enabled}
                    onChange={() => handleToggleDay(index)}
                    className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                  />
                  <span className="font-semibold text-gray-900">{dayName}</span>
                </label>
              </div>

              {slot.enabled && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => handleTimeChange(index, 'startTime', e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => handleTimeChange(index, 'endTime', e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-end space-x-3 pt-4 border-t">
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          <span>{saveMutation.isPending ? 'Saving...' : 'Save Time Slots'}</span>
        </button>
      </div>
    </div>
  )
}

