import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export default function Reports() {
  const { data: financial } = useQuery({
    queryKey: ['financial-report'],
    queryFn: () => api.get('/reports/financial')
  })

  const { data: member } = useQuery({
    queryKey: ['member-report'],
    queryFn: () => api.get('/reports/members')
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">View analytics and reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Financial Report</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt>MRR</dt>
              <dd className="font-semibold">₹{financial?.data?.report?.mrr?.toLocaleString() || 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Collections</dt>
              <dd className="font-semibold">₹{financial?.data?.report?.collections?.total?.toLocaleString() || 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Dues</dt>
              <dd className="font-semibold text-red-600">₹{financial?.data?.report?.dues?.total?.toLocaleString() || 0}</dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Member Report</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt>Total Members</dt>
              <dd className="font-semibold">{member?.data?.report?.totalMembers || 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Active Members</dt>
              <dd className="font-semibold">{member?.data?.report?.activeMembers || 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Churn Rate</dt>
              <dd className="font-semibold">{member?.data?.report?.churnRate || 0}%</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}

