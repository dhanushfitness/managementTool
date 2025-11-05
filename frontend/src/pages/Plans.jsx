import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export default function Plans() {
  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans')
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Membership Plans</h1>
          <p className="text-gray-600 mt-1">Manage your membership plans</p>
        </div>
        <button className="btn btn-primary">Add Plan</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          data?.data?.plans?.map((plan) => (
            <div key={plan._id} className="card">
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="text-gray-600 mt-2">{plan.description}</p>
              <p className="text-3xl font-bold text-primary-600 mt-4">₹{plan.price}</p>
              <p className="text-sm text-gray-500 mt-2">
                {plan.type === 'duration' && plan.duration && (
                  `${plan.duration.value} ${plan.duration.unit}`
                )}
                {plan.type === 'sessions' && `${plan.sessions} sessions`}
                {plan.type === 'unlimited' && 'Unlimited'}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

