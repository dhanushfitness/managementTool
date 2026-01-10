import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getMembers, createMember, deleteMember } from '../api/members'
import toast from 'react-hot-toast'
import { Plus, Search, Trash2, Loader2 } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Members() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: 'male'
  })

  const { data, isLoading } = useQuery({
    queryKey: ['members', search],
    queryFn: () => getMembers({ search, page: 1, limit: 20 })
  })

  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: createMember,
    onSuccess: () => {
      queryClient.invalidateQueries(['members'])
      setShowModal(false)
      setFormData({ firstName: '', lastName: '', email: '', phone: '', gender: 'male' })
      toast.success('Member created successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create member')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries(['members'])
      toast.success('Member deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete member')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-600 mt-1">Manage your gym members</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Member
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search members..."
          className="input pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Members Table */}
      <div className="card">
        {isLoading ? (
          <div className="py-12">
            <LoadingPage message="Loading members..." fullScreen={false} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Member ID</th>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Phone</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.members?.map((member) => (
                  <tr key={member._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link to={`/members/${member._id}`} className="text-primary-600 hover:underline">
                        {member.memberId}
                      </Link>
                    </td>
                    <td className="py-3 px-4">{member.firstName} {member.lastName}</td>
                    <td className="py-3 px-4">{member.phone}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        member.membershipStatus === 'active' ? 'bg-green-100 text-green-800' :
                        member.membershipStatus === 'expired' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {member.membershipStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this member?')) {
                            deleteMutation.mutate(member._id)
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data?.data?.members || data.data.members.length === 0) && (
              <p className="text-center py-8 text-gray-500">No members found</p>
            )}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
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
          <div className="bg-white rounded-lg p-6 max-w-md w-full relative">
            {/* Loading Overlay */}
            {createMutation.isPending && (
              <div className="absolute inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center rounded-lg">
                <div className="flex flex-col items-center space-y-4">
                  <LoadingSpinner size="lg" />
                  <p className="text-gray-600 font-semibold">Creating member...</p>
                </div>
              </div>
            )}
            
            <h2 className="text-2xl font-bold mb-4">Add New Member</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    required
                    className="input mt-1"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    required
                    className="input mt-1"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  className="input mt-1"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  required
                  className="input mt-1"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

