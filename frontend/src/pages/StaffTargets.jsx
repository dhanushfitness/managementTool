import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getStaffTargets, getStaffMember } from '../api/staff'
import LoadingPage from '../components/LoadingPage'
import { Plus } from 'lucide-react'

export default function StaffTargets() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [staffFilter, setStaffFilter] = useState(id || 'all')
  const [targetFilter, setTargetFilter] = useState('all')
  const [saleFilter, setSaleFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())

  const { data: staffData } = useQuery({
    queryKey: ['staff-member', id],
    queryFn: () => getStaffMember(id).then(res => res.data),
    enabled: !!id
  })

  const { data, isLoading } = useQuery({
    queryKey: ['staff-targets', staffFilter, targetFilter, saleFilter, yearFilter],
    queryFn: () => getStaffTargets({
      staffId: staffFilter !== 'all' ? staffFilter : undefined,
      targetType: targetFilter !== 'all' ? targetFilter : undefined,
      salesType: saleFilter !== 'all' ? saleFilter : undefined,
      year: yearFilter !== 'all' ? yearFilter : undefined
    }).then(res => res.data)
  })

  const targets = data?.targets || []
  const staff = staffData?.staff

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm">
        <Link to="/staff" className="text-gray-600 hover:text-orange-600">Home</Link>
        <span className="text-gray-400 mx-2">/</span>
        <Link to="/staff" className="text-gray-600 hover:text-orange-600">Staff</Link>
        <span className="text-gray-400 mx-2">/</span>
        <span className="text-orange-600 font-medium">View Staff Target</span>
      </nav>

      {/* Filters and Add Button */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700"
            >
              <option value="all">Staff</option>
              {staff && (
                <option value={staff._id}>{staff.firstName} {staff.lastName}</option>
              )}
            </select>

            <select
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700"
            >
              <option value="all">Target</option>
              <option value="sales">Sales</option>
              <option value="calls">Calls</option>
              <option value="appointments">Appointments</option>
              <option value="conversions">Conversions</option>
            </select>

            <select
              value={saleFilter}
              onChange={(e) => setSaleFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700"
            >
              <option value="all">Sale</option>
              <option value="call-target">Call Target</option>
              <option value="revenue-target">Revenue Target</option>
              <option value="enquiry-target">Enquiry Target</option>
              <option value="conversion-target">Conversion Target</option>
            </select>

            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700"
            >
              <option value="all">Year</option>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>

            <button
              onClick={() => {
                setStaffFilter(id || 'all')
                setTargetFilter('all')
                setSaleFilter('all')
                setYearFilter(new Date().getFullYear().toString())
              }}
              className="px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm"
            >
              Go
            </button>
          </div>

          <button
            onClick={() => navigate(`/staff/${id}/add-target`)}
            className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Target</span>
          </button>
        </div>
      </div>

      {/* Targets Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-12">
            <LoadingPage message="Loading targets..." fullScreen={false} />
          </div>
        ) : targets.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg">No Results Found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Staff Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Target Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Sales Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Total Target</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {targets.map((target) => {
                  const monthlyValues = Object.values(target.monthlyTargets || {})
                  const totalTarget = monthlyValues.reduce((sum, val) => sum + (val || 0), 0)
                  
                  return (
                    <tr key={target._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {target.staffId ? `${target.staffId.firstName} ${target.staffId.lastName}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                        {target.targetType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {target.salesType || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {target.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {totalTarget.toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

