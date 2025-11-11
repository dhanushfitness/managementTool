import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import LoadingSpinner from './LoadingSpinner'
import DateInput from './DateInput'

const initialFormState = () => ({
  type: 'renewal-call',
  calledBy: '',
  callStatus: 'scheduled',
  notes: '',
  scheduleDate: new Date().toISOString().split('T')[0],
  scheduleTime: ''
})

export default function CallLogModal({ isOpen, onClose, enquiryId }) {
  const [formData, setFormData] = useState(initialFormState())
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isOpen) return

    const fetchEnquiry = async () => {
      try {
        const response = await api.get(`/enquiries/${enquiryId}`)
        const enquiry = response.data?.enquiry
        if (enquiry) {
          setFormData(prev => ({
            ...initialFormState(),
            type: enquiry.callType || 'renewal-call',
            calledBy: enquiry.assignedStaff || '',
            callStatus: enquiry.lastCallStatus || 'scheduled'
          }))
        }
      } catch (error) {
        // silently ignore, use defaults
      }
    }

    fetchEnquiry()
  }, [isOpen, enquiryId])

  const addCallLogMutation = useMutation({
    mutationFn: (data) => api.post(`/enquiries/${enquiryId}/call-log`, data),
    onSuccess: () => {
      toast.success('Call log added successfully')
      queryClient.invalidateQueries(['enquiries'])
      if (typeof onClose === 'function') {
        onClose(true)
      }
      setFormData(initialFormState())
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add call log')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()

    const payload = {
      type: formData.type,
      calledBy: formData.calledBy || undefined,
      callStatus: formData.callStatus,
      notes: formData.notes || undefined,
      scheduleAt: formData.scheduleDate
        ? new Date(`${formData.scheduleDate}T${formData.scheduleTime || '00:00'}`)
        : undefined
    }

    addCallLogMutation.mutate(payload)
  }

  if (!isOpen) return null

  const handleClose = (shouldRefresh = false) => {
    if (typeof onClose === 'function') {
      onClose(shouldRefresh)
    }
  }

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={() => handleClose(false)}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Update Call</h2>
            <button
              onClick={() => handleClose(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Call Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                >
                  <option value="renewal-call">Renewal Call</option>
                  <option value="assessment-call">Assessment Call</option>
                  <option value="follow-up-call">Follow-up Call</option>
                  <option value="enquiry-call">Enquiry Call</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Called by
                </label>
                <input
                  type="text"
                  value={formData.calledBy}
                  onChange={(e) => setFormData({ ...formData, calledBy: e.target.value })}
                  placeholder="Staff name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Call Status
                </label>
                <select
                  value={formData.callStatus}
                  onChange={(e) => setFormData({ ...formData, callStatus: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="attempted">Attempted</option>
                  <option value="contacted">Contacted</option>
                  <option value="not-contacted">Not Contacted</option>
                  <option value="missed">Missed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule
                </label>
                <div className="flex space-x-2">
                  <DateInput
                    value={formData.scheduleDate}
                    onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                    className="px-3 py-2 flex-1"
                  />
                  <input
                    type="time"
                    value={formData.scheduleTime}
                    onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discussion Details
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                placeholder="Enter discussion details..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addCallLogMutation.isLoading}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {addCallLogMutation.isLoading && <LoadingSpinner size="sm" />}
                <span>Submit</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
 
