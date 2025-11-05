import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { Search } from 'lucide-react'

export default function Attendance() {
  const [search, setSearch] = useState('')
  const [memberId, setMemberId] = useState('')

  const { data: members } = useQuery({
    queryKey: ['members-search', search],
    queryFn: () => api.get('/members/search', { params: { q: search } }),
    enabled: search.length > 2
  })

  const { data: attendance } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => api.get('/attendance')
  })

  const queryClient = useQueryClient()

  const checkInMutation = useMutation({
    mutationFn: (data) => api.post('/attendance/checkin', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance'])
      toast.success('Check-in successful')
      setMemberId('')
      setSearch('')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Check-in failed')
    }
  })

  const handleCheckIn = () => {
    if (!memberId) {
      toast.error('Please select a member')
      return
    }
    checkInMutation.mutate({ memberId, method: 'manual' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-600 mt-1">Manage member check-ins</p>
      </div>

      {/* Check-in Form */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Check In</h2>
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search member by name, phone, or ID..."
              className="input pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search.length > 2 && members?.data?.members && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {members.data.members.map((member) => (
                  <button
                    key={member._id}
                    onClick={() => {
                      setMemberId(member._id)
                      setSearch(`${member.firstName} ${member.lastName} - ${member.memberId}`)
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    {member.firstName} {member.lastName} ({member.memberId})
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleCheckIn}
            disabled={checkInMutation.isPending}
            className="btn btn-primary"
          >
            {checkInMutation.isPending ? 'Processing...' : 'Check In'}
          </button>
        </div>
      </div>

      {/* Today's Attendance */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Today's Attendance</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Member</th>
                <th className="text-left py-3 px-4">Check-in Time</th>
                <th className="text-left py-3 px-4">Method</th>
                <th className="text-left py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendance?.data?.attendance?.map((record) => (
                <tr key={record._id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {record.memberId?.firstName} {record.memberId?.lastName}
                  </td>
                  <td className="py-3 px-4">
                    {new Date(record.checkInTime).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">{record.method}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      record.status === 'success' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

