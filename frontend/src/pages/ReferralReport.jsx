import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getReferralReport, getMemberReferralReport } from '../api/reports'

export default function ReferralReport() {
  const [dateFilter, setDateFilter] = useState('today')
  const [activeTab, setActiveTab] = useState('referral-report') // 'referral-report' or 'member-referral'

  // Fetch referral report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['referral-report', dateFilter, activeTab],
    queryFn: () => {
      if (activeTab === 'referral-report') {
        return getReferralReport({ dateFilter })
      } else {
        return getMemberReferralReport({ dateFilter })
      }
    },
    enabled: false // Only fetch when "Go" is clicked
  })

  // Reset data when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab)
  }

  // Show dummy data by default
  const showDummyData = !reportData && !isLoading

  const handleSearch = () => {
    refetch()
  }

  // Dummy data for Referral Report tab
  const dummyReferralData = [
    {
      _id: '1',
      member: { firstName: 'John', lastName: 'Doe', memberId: 'MEM001' },
      referredBy: { firstName: 'Jane', lastName: 'Smith', memberId: 'MEM002' },
      status: 'converted',
      convertedAt: new Date('2024-01-15'),
      createdAt: new Date('2024-01-10')
    },
    {
      _id: '2',
      member: { firstName: 'Mike', lastName: 'Johnson', memberId: 'MEM003' },
      referredBy: { firstName: 'Sarah', lastName: 'Williams', memberId: 'MEM004' },
      status: 'pending',
      createdAt: new Date('2024-01-20')
    },
    {
      _id: '3',
      member: { firstName: 'David', lastName: 'Brown', memberId: 'MEM005' },
      referredBy: { firstName: 'John', lastName: 'Doe', memberId: 'MEM001' },
      status: 'contacted',
      createdAt: new Date('2024-01-18')
    },
    {
      _id: '4',
      member: { firstName: 'Emily', lastName: 'Davis', memberId: 'MEM006' },
      referredBy: { firstName: 'Mike', lastName: 'Johnson', memberId: 'MEM003' },
      status: 'converted',
      convertedAt: new Date('2024-01-22'),
      createdAt: new Date('2024-01-19')
    },
    {
      _id: '5',
      member: { firstName: 'Robert', lastName: 'Wilson', memberId: 'MEM007' },
      referredBy: { firstName: 'Sarah', lastName: 'Williams', memberId: 'MEM004' },
      status: 'declined',
      createdAt: new Date('2024-01-21')
    }
  ]

  // Dummy data for Member Referral tab
  const dummyMemberReferralData = [
    {
      _id: '1',
      member: { firstName: 'John', lastName: 'Doe', memberId: 'MEM001' },
      totalReferrals: 5,
      convertedReferrals: 3,
      pendingReferrals: 1,
      declinedReferrals: 1,
      totalValue: 45000,
      createdAt: new Date('2024-01-01')
    },
    {
      _id: '2',
      member: { firstName: 'Jane', lastName: 'Smith', memberId: 'MEM002' },
      totalReferrals: 8,
      convertedReferrals: 5,
      pendingReferrals: 2,
      declinedReferrals: 1,
      totalValue: 75000,
      createdAt: new Date('2024-01-05')
    },
    {
      _id: '3',
      member: { firstName: 'Mike', lastName: 'Johnson', memberId: 'MEM003' },
      totalReferrals: 3,
      convertedReferrals: 2,
      pendingReferrals: 1,
      declinedReferrals: 0,
      totalValue: 30000,
      createdAt: new Date('2024-01-10')
    },
    {
      _id: '4',
      member: { firstName: 'Sarah', lastName: 'Williams', memberId: 'MEM004' },
      totalReferrals: 12,
      convertedReferrals: 8,
      pendingReferrals: 3,
      declinedReferrals: 1,
      totalValue: 120000,
      createdAt: new Date('2024-01-08')
    },
    {
      _id: '5',
      member: { firstName: 'David', lastName: 'Brown', memberId: 'MEM005' },
      totalReferrals: 2,
      convertedReferrals: 1,
      pendingReferrals: 1,
      declinedReferrals: 0,
      totalValue: 15000,
      createdAt: new Date('2024-01-15')
    }
  ]

  // Use dummy data if no data is loaded yet
  let displayData = []
  if (reportData?.data) {
    if (activeTab === 'referral-report') {
      displayData = reportData.data.referrals || []
    } else {
      displayData = reportData.data.memberReferrals || []
    }
  } else if (showDummyData) {
    displayData = activeTab === 'referral-report' ? dummyReferralData : dummyMemberReferralData
  }
  const hasData = displayData && displayData.length > 0

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (value) => {
    return `₹${value.toLocaleString('en-IN')}`
  }

  return (
    <div className="space-y-6 max-w-full w-full overflow-x-hidden" style={{ boxSizing: 'border-box' }}>
      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <nav className="text-sm">
          <span className="text-gray-600">Home</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">Reports</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">Marketing</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-orange-600 font-medium">Referral Report</span>
        </nav>
      </div>

      {/* Page Title */}
      <div className="text-center w-full max-w-full overflow-hidden">
        <h1 className="text-3xl font-bold text-gray-900">Referral Report</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 w-full max-w-full overflow-hidden">
        <div className="flex space-x-1">
          <button
            onClick={() => handleTabChange('referral-report')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'referral-report'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Referral Report
          </button>
          <button
            onClick={() => handleTabChange('member-referral')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'member-referral'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Member Referral
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="relative">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer min-w-[150px]"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this-week">This Week</option>
              <option value="last-week">Last Week</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="this-year">This Year</option>
              <option value="last-year">Last Year</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Go
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full max-w-full overflow-hidden">
        {isLoading ? (
          <LoadingPage message="Loading referral report..." fullScreen={false} />
        ) : !hasData ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No Results Found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full" style={{ maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
            {activeTab === 'referral-report' ? (
              <table className="w-full" style={{ minWidth: '800px', width: '100%' }}>
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">S.No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Member Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Member ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Referred By</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Referrer ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Converted Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Referral Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayData.map((item, index) => (
                    <tr key={item._id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.member?.firstName} {item.member?.lastName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.member?.memberId}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.referredBy?.firstName} {item.referredBy?.lastName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.referredBy?.memberId}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.status === 'converted' 
                            ? 'bg-green-100 text-green-800' 
                            : item.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : item.status === 'contacted'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(item.convertedAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full" style={{ minWidth: '800px', width: '100%' }}>
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">S.No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Member Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Member ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Referrals</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Converted</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Pending</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Declined</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Value</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Conversion %</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayData.map((item, index) => {
                    const conversionPercent = item.totalReferrals > 0 
                      ? ((item.convertedReferrals || 0) / item.totalReferrals * 100).toFixed(2)
                      : '0.00'
                    return (
                      <tr key={item._id || index} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.member?.firstName} {item.member?.lastName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.member?.memberId}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{item.totalReferrals || 0}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{item.convertedReferrals || 0}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">{item.pendingReferrals || 0}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{item.declinedReferrals || 0}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{formatCurrency(item.totalValue || 0)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{conversionPercent}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

