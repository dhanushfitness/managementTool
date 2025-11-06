import { useState } from 'react'
import { X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import LoadingSpinner from './LoadingSpinner'

export default function CallLogModal({ isOpen, onClose, enquiryId }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    status: 'answered',
    notes: ''
  })

  const queryClient = useQueryClient()

  const addCallLogMutation = useMutation({
    mutationFn: (data) => api.post(`/enquiries/${enquiryId}/call-log`, data),
    onSuccess: () => {
      toast.success('Call log added successfully')
      queryClient.invalidateQueries(['enquiries'])
      onClose()
      setFormData({
        date: new Date().toISOString().split('T')[0],
        status: 'answered',
        notes: ''
      })
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add call log')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    addCallLogMutation.mutate(formData)
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
          className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Add Call Log</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Call Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="answered">Answered</option>
                <option value="missed">Missed</option>
                <option value="no-answer">No Answer</option>
                <option value="busy">Busy</option>
                <option value="enquiry">Enquiry</option>
                <option value="future-prospect">Future Prospect</option>
                <option value="not-interested">Not Interested</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                placeholder="Enter call notes..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
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
                <span>Add Call Log</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

