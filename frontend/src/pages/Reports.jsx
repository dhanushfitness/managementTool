import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { DollarSign, Users, TrendingUp, BarChart3, FileText } from 'lucide-react'
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
      {/* Header */}
      <div className="space-y-3">
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/dashboard" className="text-gray-500 hover:text-orange-600 transition-colors">Home</Link>
          <span className="text-gray-300">/</span>
          <span className="text-orange-600 font-semibold">Reports</span>
        </nav>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">View comprehensive analytics and business reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Report Card */}
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-6">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-100/40 rounded-full blur-2xl"></div>
          
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-gray-900">Financial Report</h2>
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
            
            <dl className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 uppercase tracking-wider">MRR</dt>
                <dd className="text-lg font-black text-gray-900">₹{financial?.data?.report?.mrr?.toLocaleString() || 0}</dd>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 uppercase tracking-wider">Collections</dt>
                <dd className="text-lg font-black text-green-600">₹{financial?.data?.report?.collections?.total?.toLocaleString() || 0}</dd>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 uppercase tracking-wider">Dues</dt>
                <dd className="text-lg font-black text-red-600">₹{financial?.data?.report?.dues?.total?.toLocaleString() || 0}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Member Report Card */}
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-6">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-100/40 rounded-full blur-2xl"></div>
          
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-gray-900">Member Report</h2>
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
            
            <dl className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 uppercase tracking-wider">Total Members</dt>
                <dd className="text-lg font-black text-orange-600">{member?.data?.report?.totalMembers || 0}</dd>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 uppercase tracking-wider">Active Members</dt>
                <dd className="text-lg font-black text-green-600">{member?.data?.report?.activeMembers || 0}</dd>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 uppercase tracking-wider">Churn Rate</dt>
                <dd className="text-lg font-black text-purple-600">{member?.data?.report?.churnRate || 0}%</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

