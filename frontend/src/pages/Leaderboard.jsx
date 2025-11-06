import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { Download, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const months = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' }
];

export default function Leaderboard() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [selectedStaff, setSelectedStaff] = useState('all');

  // Fetch staff list
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff').then(res => res.data),
    enabled: !!token
  });

  // Fetch leaderboard data
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['leaderboard-revenue', month, year, selectedStaff],
    queryFn: () =>
      api.get('/leaderboard/revenue', {
        params: { month, year, staffId: selectedStaff }
      }).then(res => res.data),
    enabled: !!token
  });

  const { data: closureData, isLoading: closureLoading } = useQuery({
    queryKey: ['leaderboard-closure', month, year, selectedStaff],
    queryFn: () =>
      api.get('/leaderboard/closure-count', {
        params: { month, year, staffId: selectedStaff }
      }).then(res => res.data),
    enabled: !!token
  });

  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ['leaderboard-contacts', month, year, selectedStaff],
    queryFn: () =>
      api.get('/leaderboard/contacts-created', {
        params: { month, year, staffId: selectedStaff }
      }).then(res => res.data),
    enabled: !!token
  });

  const { data: callsData, isLoading: callsLoading } = useQuery({
    queryKey: ['leaderboard-calls', month, year, selectedStaff],
    queryFn: () =>
      api.get('/leaderboard/calls', {
        params: { month, year, staffId: selectedStaff }
      }).then(res => res.data),
    enabled: !!token
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const handleExport = async (type) => {
    try {
      const response = await api.get('/leaderboard/export', {
        params: { month, year, staffId: selectedStaff, type },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leaderboard-${type}-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Export successful');
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs and Navigation */}
      <div className="flex items-center justify-between">
        <nav className="text-sm">
          <span className="text-gray-600">Home / Dashboard / </span>
          <span className="text-orange-600 font-medium">Leaderboards</span>
        </nav>
        <div className="flex border-b border-gray-200 bg-white rounded-lg shadow-sm">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm transition-colors"
          >
            Snapshot
          </button>
          <button
            onClick={() => navigate('/taskboard')}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm transition-colors"
          >
            Follow-ups
          </button>
          <button className="px-4 py-2 border-b-2 border-orange-500 text-orange-600 font-medium text-sm bg-orange-50">
            Leaderboards
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">General Sales Leaderboard</h1>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent w-24"
            placeholder="Year"
          />

          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
          >
            <option value="all">Staff Name</option>
            {staffData?.staff?.map((staff) => (
              <option key={staff._id} value={staff._id}>
                {staff.firstName} {staff.lastName}
              </option>
            ))}
          </select>

          <div className="flex items-center space-x-2 ml-auto">
            <button
              onClick={() => {
                // Refetch all queries
                window.location.reload();
              }}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              Go
            </button>
            <button
              onClick={() => toast.info('Export functionality coming soon')}
              className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. Service(S) & Product(M) Revenue Leaderboard */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Service(S) & Product(M) Revenue Leaderboard
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">S.No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Staff Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Sales Target</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Sales Achieved</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Achieved(%)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">New Sales</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Renewals</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">View</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {revenueLoading ? (
                <LoadingTable colSpan={9} message="Loading revenue data..." />
              ) : revenueData?.data?.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">No data found</td>
                </tr>
              ) : (
                <>
                  {revenueData?.data?.map((item) => (
                    <>
                      <tr key={`${item.staffId}-S`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{item.sNo}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.staffName}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.salesTarget)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.salesAchieved)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.achievedPercent}%</td>
                        <td className="px-4 py-3 text-sm text-gray-900">S</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.typeS.newSales)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.typeS.renewals)}</td>
                        <td className="px-4 py-3 text-sm">
                          <button className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-xs font-medium">
                            View
                          </button>
                        </td>
                      </tr>
                      {(item.typeM.newSales > 0 || item.typeM.renewals > 0) && (
                        <tr key={`${item.staffId}-M`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900"></td>
                          <td className="px-4 py-3 text-sm text-gray-900"></td>
                          <td className="px-4 py-3 text-sm text-gray-900"></td>
                          <td className="px-4 py-3 text-sm text-gray-900"></td>
                          <td className="px-4 py-3 text-sm text-gray-900"></td>
                          <td className="px-4 py-3 text-sm text-gray-900">M</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.typeM.newSales)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {item.typeM.renewals > 0 ? formatCurrency(item.typeM.renewals) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">-</td>
                        </tr>
                      )}
                    </>
                  ))}
                  {revenueData?.totals && (
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-4 py-3 text-sm text-gray-900">Total</td>
                      <td className="px-4 py-3 text-sm text-gray-900"></td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(revenueData.totals.salesTarget)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(revenueData.totals.salesAchieved)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{revenueData.totals.achievedPercent}%</td>
                      <td className="px-4 py-3 text-sm text-gray-900"></td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(revenueData.totals.newSales)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(revenueData.totals.renewals)}</td>
                      <td className="px-4 py-3 text-sm"></td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Closure Count Leaderboard */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Closure Count Leaderboard</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">S.No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Staff Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Target</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Achieved</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Achieved(%)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">New Sales</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Renewals</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">View</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {closureLoading ? (
                <LoadingTable colSpan={8} message="Loading closure data..." />
              ) : closureData?.data?.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">No data found</td>
                </tr>
              ) : (
                <>
                  {closureData?.data?.map((item) => (
                    <tr key={item.staffId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{item.sNo}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.staffName}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.target}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.achieved}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.achievedPercent}%</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.newSales}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.renewals}</td>
                      <td className="px-4 py-3 text-sm">
                        <button className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-xs font-medium">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {closureData?.totals && (
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-4 py-3 text-sm text-gray-900">Total</td>
                      <td className="px-4 py-3 text-sm text-gray-900"></td>
                      <td className="px-4 py-3 text-sm text-gray-900">{closureData.totals.target}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{closureData.totals.achieved}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{closureData.totals.achievedPercent}%</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{closureData.totals.newSales}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{closureData.totals.renewals}</td>
                      <td className="px-4 py-3 text-sm"></td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Contacts Created Leaderboard */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Contacts Created Leaderboard</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">S.No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Target</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Achieved</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Achieved(%)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Enquiries</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Spot Conversions</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">View</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contactsLoading ? (
                <LoadingTable colSpan={7} message="Loading contacts data..." />
              ) : contactsData?.data?.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">No data found</td>
                </tr>
              ) : (
                <>
                  {contactsData?.data?.map((item) => (
                    <tr key={item.staffId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{item.sNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.target}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.achieved}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.achievedPercent}%</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.enquiries}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.spotConversions}</td>
                      <td className="px-4 py-3 text-sm">
                        <button className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-xs font-medium">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {contactsData?.totals && (
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-4 py-3 text-sm text-gray-900">Total</td>
                      <td className="px-4 py-3 text-sm text-gray-900"></td>
                      <td className="px-4 py-3 text-sm text-gray-900">{contactsData.totals.target}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{contactsData.totals.achieved}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{contactsData.totals.achievedPercent}%</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{contactsData.totals.enquiries}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{contactsData.totals.spotConversions}</td>
                      <td className="px-4 py-3 text-sm"></td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Call Leaderboard */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Call Leaderboard</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">S.No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Staff Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Attempts</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Contacted</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Not-contacted</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Target</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Achieved(%)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Prospecting calls</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Member calls</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">View</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {callsLoading ? (
                <LoadingTable colSpan={10} message="Loading calls data..." />
              ) : callsData?.data?.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-gray-500">No data found</td>
                </tr>
              ) : (
                <>
                  {callsData?.data?.map((item) => (
                    <tr key={item.staffId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{item.sNo}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.staffName}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.attempts}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.contacted}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.notContacted}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.target}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.achievedPercent}%</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.prospectingCalls}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.memberCalls}</td>
                      <td className="px-4 py-3 text-sm">
                        <button className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-xs font-medium">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {callsData?.totals && (
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-4 py-3 text-sm text-gray-900">Total</td>
                      <td className="px-4 py-3 text-sm text-gray-900"></td>
                      <td className="px-4 py-3 text-sm text-gray-900">{callsData.totals.attempts}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{callsData.totals.contacted}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{callsData.totals.notContacted}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{callsData.totals.target}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{callsData.totals.achievedPercent}%</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{callsData.totals.prospectingCalls}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{callsData.totals.memberCalls}</td>
                      <td className="px-4 py-3 text-sm"></td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

