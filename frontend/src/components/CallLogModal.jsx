import { useState, useEffect, useCallback } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import LoadingSpinner from './LoadingSpinner'
import DateInput from './DateInput'
import TimeInput from './TimeInput'

const initialFormState = () => ({
  type: 'enquiry-call',
  scheduledFor: '',
  callStatus: 'scheduled',
  callTag: '',
  notes: '',
  scheduleDate: new Date().toISOString().split('T')[0],
  scheduleTime: '',
  expectedClosureDate: '',
  expectedAmount: ''
})

export default function CallLogModal({ isOpen = true, onClose, enquiryId, mode = 'modal' }) {
  const [formData, setFormData] = useState(initialFormState())
  const [enquiryDetails, setEnquiryDetails] = useState(null)
  const [isFetchingEnquiry, setIsFetchingEnquiry] = useState(false)
  const queryClient = useQueryClient()

  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff').then(res => res.data),
    enabled: isOpen
  })

  const tagOptions = [
    { label: 'Cold', value: 'cold', color: 'text-blue-600 border-blue-200 hover:bg-blue-50' },
    { label: 'Warm', value: 'warm', color: 'text-orange-600 border-orange-200 hover:bg-orange-50' },
    { label: 'Hot', value: 'hot', color: 'text-red-600 border-red-200 hover:bg-red-50' }
  ]

  const fetchEnquiryDetails = useCallback(async () => {
    if (!enquiryId || !isOpen) return
    setIsFetchingEnquiry(true)
      try {
        const response = await api.get(`/enquiries/${enquiryId}`)
        const enquiry = response.data?.enquiry
        if (enquiry) {
        setEnquiryDetails(enquiry)
          setFormData(prev => ({
          ...prev,
          scheduledFor: enquiry.assignedStaff?._id || '',
          callTag: enquiry.callTag || '',
          callStatus: enquiry.lastCallStatus || 'scheduled',
          expectedClosureDate: enquiry.expectedClosureDate
            ? enquiry.expectedClosureDate.split('T')[0]
            : '',
          expectedAmount: enquiry.expectedAmount || '',
          scheduleDate: enquiry.followUpDate
            ? enquiry.followUpDate.split('T')[0]
            : prev.scheduleDate
          }))
        }
      } catch (error) {
      toast.error('Failed to load enquiry details')
    } finally {
      setIsFetchingEnquiry(false)
      }
  }, [enquiryId, isOpen])

  useEffect(() => {
    if (!isOpen) return
    setFormData(initialFormState())
    fetchEnquiryDetails()
  }, [isOpen, enquiryId, fetchEnquiryDetails])

  const addCallLogMutation = useMutation({
    mutationFn: (data) => api.post(`/enquiries/${enquiryId}/call-log`, data)
  })

  const updateEnquiryMutation = useMutation({
    mutationFn: (payload) => api.put(`/enquiries/${enquiryId}`, payload)
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    const scheduleAt = formData.scheduleDate
      ? new Date(`${formData.scheduleDate}T${formData.scheduleTime || '00:00'}`)
      : null

    const logPayload = {
      type: formData.type,
      calledBy: formData.scheduledFor || undefined,
      callStatus: formData.callStatus,
      notes: formData.notes || undefined,
      scheduleAt: scheduleAt || undefined
    }

    const updates = {}
    if (formData.callTag) updates.callTag = formData.callTag
    if (formData.expectedClosureDate) updates.expectedClosureDate = formData.expectedClosureDate
    if (formData.expectedAmount !== '' && formData.expectedAmount !== null) {
      updates.expectedAmount = Number(formData.expectedAmount)
    }
    if (formData.scheduledFor) updates.assignedStaff = formData.scheduledFor

    try {
      await addCallLogMutation.mutateAsync(logPayload)
      if (Object.keys(updates).length > 0) {
        await updateEnquiryMutation.mutateAsync(updates)
      }
      toast.success('Call updated successfully')
      queryClient.invalidateQueries(['enquiries'])
      fetchEnquiryDetails()
      if (typeof onClose === 'function') {
        onClose(true)
      }
      setFormData(initialFormState())
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update call')
    }
  }

  const handleClose = (shouldRefresh = false) => {
    if (typeof onClose === 'function') {
      onClose(shouldRefresh)
    }
  }

  if (mode === 'modal' && !isOpen) return null

  const containerWidthClass = mode === 'page' ? 'w-full' : 'w-full max-w-5xl mx-auto'
  const gridColumnsClass =
    mode === 'page'
      ? 'grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)] gap-8'
      : 'grid-cols-1 lg:grid-cols-2 gap-6'

  const content = (
    <div
      className={`bg-white rounded-2xl shadow-2xl ${containerWidthClass} pointer-events-auto overflow-hidden`}
      onClick={(e) => mode === 'modal' && e.stopPropagation()}
    >
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50 to-white">
        <div>
          <p className="text-xs uppercase tracking-widest text-orange-500 font-semibold mb-1">Update Call Status</p>
          <h2 className="text-2xl font-bold text-gray-900">
            {enquiryDetails ? enquiryDetails.name : 'Enquiry'}
            {enquiryDetails?.phone && <span className="text-sm text-gray-500 font-medium ml-2">{enquiryDetails.phone}</span>}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => handleClose(false)}
          className="text-gray-500 hover:text-gray-700 transition-colors rounded-full p-2 hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className={`p-6 grid ${gridColumnsClass}`}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Schedule for<span className="text-red-500">*</span>
              </label>
              <select
                value={formData.scheduledFor}
                onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm"
                required
              >
                <option value="">Select staff</option>
                {staffData?.staff?.map((staff) => (
                  <option key={staff._id} value={staff._id}>
                    {staff.firstName} {staff.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Call Status<span className="text-red-500">*</span>
              </label>
              <select
                value={formData.callStatus}
                onChange={(e) => setFormData({ ...formData, callStatus: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm"
                required
              >
                <option value="scheduled">Scheduled</option>
                <option value="attempted">Attempted</option>
                <option value="contacted">Contacted</option>
                <option value="not-contacted">Not Contacted</option>
                <option value="missed">Missed</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {tagOptions.map((tag) => (
              <button
                key={tag.value}
                type="button"
                onClick={() => setFormData({ ...formData, callTag: tag.value })}
                className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-colors ${tag.color} ${
                  formData.callTag === tag.value ? 'bg-opacity-10 bg-current' : ''
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Expected Date of Closure</label>
              <DateInput
                value={formData.expectedClosureDate}
                onChange={(e) => setFormData({ ...formData, expectedClosureDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Amount (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.expectedAmount}
                onChange={(e) => setFormData({ ...formData, expectedAmount: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Discussion Details<span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={5}
              maxLength={1800}
              placeholder="Capture the key points from your discussion..."
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm resize-none"
              required
            />
            <p className="text-xs text-gray-400 text-right">{formData.notes.length}/1800</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Next Follow-up Schedule</label>
            <div className="grid sm:grid-cols-[1fr,120px] gap-3">
              <DateInput
                value={formData.scheduleDate}
                onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
              <TimeInput
                value={formData.scheduleTime}
                onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addCallLogMutation.isLoading || updateEnquiryMutation.isLoading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(addCallLogMutation.isLoading || updateEnquiryMutation.isLoading) && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Update Call</span>
            </button>
          </div>
        </form>

        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Contact history</p>
              <h3 className="text-lg font-bold text-gray-900">Recent touch points</h3>
            </div>
            <span className="text-sm text-gray-500">Total: {enquiryDetails?.callLogs?.length || 0}</span>
          </div>

          {isFetchingEnquiry ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (enquiryDetails?.callLogs?.length ?? 0) === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
              No call history yet
            </div>
          ) : (
            enquiryDetails.callLogs
              .slice()
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((log) => (
                <div key={log._id || log.date} className="bg-white rounded-xl border border-gray-100 p-4 mb-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{log.status?.replace('-', ' ') || 'Update'}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(log.date).toLocaleDateString('en-GB')} {new Date(log.date).toLocaleTimeString('en-GB')}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{log.notes || 'No notes provided.'}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>Scheduled by {log.staffId ? `${log.staffId.firstName || ''} ${log.staffId.lastName || ''}`.trim() : 'N/A'}</span>
                    {log.status && <span className="capitalize">Call status: {log.status.replace('-', ' ')}</span>}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      <div className="px-6 pb-4">
        <p className="text-xs text-gray-400 text-center">
          Need to change additional enquiry details? Head over to the enquiry profile for full edit access.
        </p>
      </div>
    </div>
  )

  if (mode === 'page') {
    return (
      <div className="w-full">
        {content}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
        onClick={() => handleClose(false)}
      />
      <div className="absolute inset-0 flex items-center justify-center px-4 pointer-events-auto">
        {content}
      </div>
    </div>
  )
}
 
