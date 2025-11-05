import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export default function Invoices() {
  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get('/invoices')
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">Manage invoices and billing</p>
        </div>
        <button className="btn btn-primary">Create Invoice</button>
      </div>

      <div className="card">
        {isLoading ? (
          <p className="text-center py-8">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Invoice #</th>
                  <th className="text-left py-3 px-4">Member</th>
                  <th className="text-left py-3 px-4">Amount</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.invoices?.map((invoice) => (
                  <tr key={invoice._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{invoice.invoiceNumber}</td>
                    <td className="py-3 px-4">
                      {invoice.memberId?.firstName} {invoice.memberId?.lastName}
                    </td>
                    <td className="py-3 px-4">₹{invoice.total?.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {new Date(invoice.createdAt).toLocaleDateString()}
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

