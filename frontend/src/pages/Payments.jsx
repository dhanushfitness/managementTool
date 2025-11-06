import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'
import LoadingPage from '../components/LoadingPage'

export default function Payments() {
  const { data, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api.get('/payments')
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-600 mt-1">View and manage payments</p>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="py-12">
            <LoadingPage message="Loading payments..." fullScreen={false} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Receipt #</th>
                  <th className="text-left py-3 px-4">Member</th>
                  <th className="text-left py-3 px-4">Amount</th>
                  <th className="text-left py-3 px-4">Method</th>
                  <th className="text-left py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.payments?.map((payment) => (
                  <tr key={payment._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{payment.receiptNumber}</td>
                    <td className="py-3 px-4">
                      {payment.memberId?.firstName} {payment.memberId?.lastName}
                    </td>
                    <td className="py-3 px-4">₹{payment.amount?.toLocaleString()}</td>
                    <td className="py-3 px-4">{payment.paymentMethod}</td>
                    <td className="py-3 px-4">
                      {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

