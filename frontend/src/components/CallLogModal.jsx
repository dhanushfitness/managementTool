import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, Plus, Edit, Calendar, Clock, User, DollarSign, MessageSquare } from 'lucide-react'
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
  const [showForm, setShowForm] = useState(false)
  const [editingCallLogId, setEditingCallLogId] = useState(null)
  const queryClient = useQueryClient()

  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff').then(res => res.data),
    enabled: isOpen
  })

  const tagOptions = [
    { label: 'Cold', value: 'cold', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700', activeBg: 'bg-blue-100' },
    { label: 'Warm', value: 'warm', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-700', activeBg: 'bg-orange-100' },
    { label: 'Hot', value: 'hot', bgColor: 'bg-red-50', borderColor: 'border-red-200', textColor: 'text-red-700', activeBg: 'bg-red-100' }
  ]

  const fetchEnquiryDetails = useCallback(async () => {
    if (!enquiryId || !isOpen) return
    setIsFetchingEnquiry(true)
    try {
      const response = await api.get(`/enquiries/${enquiryId}`)
      const enquiry = response.data?.enquiry
      if (enquiry) {
        setEnquiryDetails(enquiry)
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
    setShowForm(false)
    setEditingCallLogId(null)
    fetchEnquiryDetails()
  }, [isOpen, enquiryId, fetchEnquiryDetails])

  const addCallLogMutation = useMutation({
    mutationFn: (data) => api.post(`/enquiries/${enquiryId}/call-log`, data)
  })

  const updateEnquiryMutation = useMutation({
    mutationFn: (payload) => api.put(`/enquiries/${enquiryId}`, payload)
  })

  const handleAddNewCall = () => {
    setFormData({
      ...initialFormState(),
      scheduledFor: enquiryDetails?.assignedStaff?._id || '',
      callTag: enquiryDetails?.callTag || '',
      callStatus: enquiryDetails?.lastCallStatus || 'scheduled',
      expectedClosureDate: enquiryDetails?.expectedClosureDate
        ? new Date(enquiryDetails.expectedClosureDate).toISOString().split('T')[0]
        : '',
      expectedAmount: enquiryDetails?.expectedAmount || ''
    })
    setEditingCallLogId(null)
    setShowForm(true)
  }

  const handleUpdateCallLog = (log) => {
    const logDate = new Date(log.date)
    setFormData({
      type: 'enquiry-call',
      scheduledFor: log.staffId?._id || enquiryDetails?.assignedStaff?._id || '',
      callStatus: log.status || 'scheduled',
      callTag: enquiryDetails?.callTag || '',
      notes: log.notes || '',
      scheduleDate: logDate.toISOString().split('T')[0],
      scheduleTime: logDate.toTimeString().slice(0, 5),
      expectedClosureDate: enquiryDetails?.expectedClosureDate
        ? new Date(enquiryDetails.expectedClosureDate).toISOString().split('T')[0]
        : '',
      expectedAmount: enquiryDetails?.expectedAmount || ''
    })
    setEditingCallLogId(log._id)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingCallLogId(null)
    setFormData(initialFormState())
  }

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
      toast.success(editingCallLogId ? 'Call log updated successfully' : 'Call log added successfully')
      queryClient.invalidateQueries(['enquiries'])
      fetchEnquiryDetails()
      handleCancel()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update call')
    }
  }

  const handleClose = (shouldRefresh = false) => {
    if (typeof onClose === 'function') {
      onClose(shouldRefresh)
    }
  }

  const formatDateTime = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
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
      {/* Header */}
      <div className="p-6 border-b-2 border-gray-200 flex items-center justify-between bg-gradient-to-r from-orange-500 to-red-500">
        <div>
          <p className="text-xs uppercase tracking-widest text-orange-100 font-bold mb-1">UPDATE CALL STATUS</p>
          <h2 className="text-2xl font-black text-white">
            {enquiryDetails ? enquiryDetails.name : 'Enquiry'}
            {enquiryDetails?.phone && <span className="text-sm text-orange-100 font-medium ml-2">{enquiryDetails.phone}</span>}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => handleClose(false)}
          className="text-white hover:bg-white/20 transition-colors rounded-full p-2"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className={`p-6 grid ${gridColumnsClass}`}>
        {/* Form Section */}
        <div className="space-y-6">
          {!showForm ? (
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl border-2 border-orange-200 p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white rounded-full shadow-lg">
                  <Plus className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Add New Call</h3>
                  <p className="text-sm text-gray-600 mb-6">Click the button below to add a new call log entry</p>
                </div>
                <button
                  onClick={handleAddNewCall}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add New Call
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-2xl border-2 border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingCallLogId ? 'Update Call Log' : 'Add New Call Log'}
                </h3>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-orange-600" />
                    Schedule for<span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.scheduledFor}
                    onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-sm font-medium"
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
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-orange-600" />
                    Call Status<span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.callStatus}
                    onChange={(e) => setFormData({ ...formData, callStatus: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-sm font-medium"
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

              <div>
                <label className="text-sm font-bold text-gray-700 mb-2 block">Call Tag</label>
                <div className="flex items-center space-x-3">
                  {tagOptions.map((tag) => (
                    <button
                      key={tag.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, callTag: tag.value })}
                      className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                        formData.callTag === tag.value
                          ? `${tag.bgColor} ${tag.borderColor} ${tag.textColor} shadow-md`
                          : `border-gray-200 text-gray-600 hover:${tag.borderColor} hover:${tag.bgColor}`
                      }`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-orange-600" />
                    Expected Date of Closure
                  </label>
                  <DateInput
                    value={formData.expectedClosureDate}
                    onChange={(e) => setFormData({ ...formData, expectedClosureDate: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-orange-600" />
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.expectedAmount}
                    onChange={(e) => setFormData({ ...formData, expectedAmount: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm font-medium"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-600" />
                  Discussion Details<span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={5}
                  maxLength={1800}
                  placeholder="Capture the key points from your discussion..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm resize-none font-medium"
                  required
                />
                <p className="text-xs text-gray-400 text-right font-medium">{formData.notes.length}/1800</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  Next Follow-up Schedule
                </label>
                <div className="grid sm:grid-cols-[1fr,140px] gap-3">
                  <DateInput
                    value={formData.scheduleDate}
                    onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm font-medium"
                  />
                  <TimeInput
                    value={formData.scheduleTime}
                    onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                    className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addCallLogMutation.isLoading || updateEnquiryMutation.isLoading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(addCallLogMutation.isLoading || updateEnquiryMutation.isLoading) && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingCallLogId ? 'Update Call' : 'Add Call'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Contact History Section */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-300">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-1">CONTACT HISTORY</p>
              <h3 className="text-lg font-black text-gray-900">Recent touch points</h3>
            </div>
            <span className="text-sm font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-lg">
              Total: {enquiryDetails?.callLogs?.length || 0}
            </span>
          </div>

          {isFetchingEnquiry ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (enquiryDetails?.callLogs?.length ?? 0) === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-xl border-2 border-dashed border-gray-300">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="font-semibold">No call history yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {enquiryDetails.callLogs
                .slice()
                .sort((a, b) => {
                  const dateA = a.date ? new Date(a.date).getTime() : 0;
                  const dateB = b.date ? new Date(b.date).getTime() : 0;
                  // Sort from highest date (most recent) to lowest date (oldest)
                  return dateB - dateA;
                })
                .map((log) => (
                  <div key={log._id || log.date} className="bg-white rounded-xl border-2 border-gray-200 p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            log.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                            log.status === 'contacted' ? 'bg-green-100 text-green-700' :
                            log.status === 'attempted' ? 'bg-yellow-100 text-yellow-700' :
                            log.status === 'missed' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {log.status?.replace('-', ' ') || 'Update'}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">
                            {formatDateTime(log.date)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 font-medium whitespace-pre-wrap mb-3">
                          {log.notes || 'No notes provided.'}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="font-medium">
                            Scheduled by {log.staffId ? `${log.staffId.firstName || ''} ${log.staffId.lastName || ''}`.trim() : 'N/A'}
                          </span>
                        </div>
                      </div>
                      {log.status !== 'missed' && (
                        <button
                          onClick={() => handleUpdateCallLog(log)}
                          className="ml-4 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow-md"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Update
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
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
