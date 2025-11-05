import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export default function Staff() {
  const { data, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff')
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff</h1>
          <p className="text-gray-600 mt-1">Manage your staff members</p>
        </div>
        <button className="btn btn-primary">Add Staff</button>
      </div>

      <div className="card">
        {isLoading ? (
          <p className="text-center py-8">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Role</th>
                  <th className="text-left py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.staff?.map((staff) => (
                  <tr key={staff._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{staff.firstName} {staff.lastName}</td>
                    <td className="py-3 px-4">{staff.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {staff.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        staff.employmentStatus === 'active' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {staff.employmentStatus}
                      </span>
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

