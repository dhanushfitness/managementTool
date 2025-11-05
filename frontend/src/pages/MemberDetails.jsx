import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMember } from '../api/members'

export default function MemberDetails() {
  const { id } = useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['member', id],
    queryFn: () => getMember(id)
  })

  if (isLoading) return <p>Loading...</p>

  const member = data?.data?.member

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {member?.firstName} {member?.lastName}
        </h1>
        <p className="text-gray-600 mt-1">Member ID: {member?.memberId}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Member Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="mt-1">{member?.phone}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1">{member?.email || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  member?.membershipStatus === 'active' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {member?.membershipStatus}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Membership Plan</h2>
          {member?.currentPlan ? (
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Plan</dt>
                <dd className="mt-1">{member.currentPlan.planName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                <dd className="mt-1">{new Date(member.currentPlan.startDate).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">End Date</dt>
                <dd className="mt-1">{new Date(member.currentPlan.endDate).toLocaleDateString()}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-gray-500">No active membership</p>
          )}
        </div>
      </div>
    </div>
  )
}

