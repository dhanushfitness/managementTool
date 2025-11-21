import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { 
  Download, 
  Eye, 
  Trophy,
  TrendingUp,
  Users,
  Phone,
  Target,
  Award,
  Calendar,
  Zap,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingTable from '../components/LoadingTable';

const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
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
      minimumFractionDigits: 0
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

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-lg">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-black text-yellow-600">1st</span>
        </div>
      );
    } else if (rank === 2) {
      return (
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-gray-300 to-gray-500 rounded-lg shadow-lg">
            <Award className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-black text-gray-600">2nd</span>
        </div>
      );
    } else if (rank === 3) {
      return (
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg shadow-lg">
            <Award className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-black text-orange-600">3rd</span>
        </div>
      );
    }
    return <span className="text-sm font-bold text-gray-700">{rank}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Staff Leaderboard</h1>
          <p className="text-gray-600">Track and compare team performance metrics</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden inline-flex">
          <button
            onClick={() => navigate('/')}
            className="px-5 py-3 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            Snapshot
          </button>
          <button
            onClick={() => navigate('/taskboard')}
            className="px-5 py-3 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            Follow-ups
          </button>
          <button className="px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-red-500">
            Leaderboards
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Period:</span>
          </div>
          
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-sm font-medium"
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
            className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 w-32 text-sm font-medium"
            placeholder="Year"
          />

          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-sm font-medium"
          >
            <option value="all">All Staff</option>
            {staffData?.staff?.map((staff) => (
              <option key={staff._id} value={staff._id}>
                {staff.firstName} {staff.lastName}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold shadow-lg hover:shadow-xl"
            >
              Apply Filters
            </button>
            <button
              onClick={() => toast.info('Export functionality coming soon')}
              className="px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. Revenue Leaderboard */}
      <LeaderboardCard
        title="Revenue Leaderboard"
        subtitle="Service & Product Sales Performance"
        icon={DollarSign}
        gradient="from-green-500 to-emerald-500"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Rank</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Staff Name</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Target</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Achieved</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Progress</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">New Sales</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Renewals</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {revenueLoading ? (
                <LoadingTable colSpan={9} message="Loading revenue data..." />
              ) : revenueData?.data?.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <DollarSign className="w-12 h-12 text-gray-300" />
                      <p className="text-gray-500 font-medium">No data available</p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {revenueData?.data?.map((item) => (
                    <>
                      <tr key={`${item.staffId}-S`} className="hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all">
                        <td className="px-4 py-4">{getRankBadge(item.sNo)}</td>
                        <td className="px-4 py-4 text-sm font-bold text-gray-900">{item.staffName}</td>
                        <td className="px-4 py-4 text-sm text-gray-700 font-semibold">{formatCurrency(item.salesTarget)}</td>
                        <td className="px-4 py-4 text-sm text-green-600 font-bold">{formatCurrency(item.salesAchieved)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-3 max-w-[120px]">
                              <div 
                                className={`h-3 rounded-full ${
                                  item.achievedPercent >= 100 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                  item.achievedPercent >= 75 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                                  item.achievedPercent >= 50 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                                  'bg-gradient-to-r from-red-500 to-pink-500'
                                }`}
                                style={{ width: `${Math.min(item.achievedPercent, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-bold text-gray-900 min-w-[45px]">{item.achievedPercent}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">Service</span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 font-semibold">{formatCurrency(item.typeS.newSales)}</td>
                        <td className="px-4 py-4 text-sm text-gray-700 font-semibold">{formatCurrency(item.typeS.renewals)}</td>
                        <td className="px-4 py-4">
                          <button className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-sm">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      {(item.typeM.newSales > 0 || item.typeM.renewals > 0) && (
                        <tr key={`${item.staffId}-M`} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all">
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3">
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold">Product</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 font-semibold">{formatCurrency(item.typeM.newSales)}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 font-semibold">
                            {item.typeM.renewals > 0 ? formatCurrency(item.typeM.renewals) : '-'}
                          </td>
                          <td className="px-4 py-3">-</td>
                        </tr>
                      )}
                    </>
                  ))}
                  {revenueData?.totals && (
                    <tr className="bg-gradient-to-r from-green-50 to-emerald-50 border-t-2 border-green-200">
                      <td className="px-4 py-4 text-sm font-black text-gray-900 uppercase">Total</td>
                      <td className="px-4 py-4"></td>
                      <td className="px-4 py-4 text-sm font-black text-gray-900">{formatCurrency(revenueData.totals.salesTarget)}</td>
                      <td className="px-4 py-4 text-sm font-black text-green-600">{formatCurrency(revenueData.totals.salesAchieved)}</td>
                      <td className="px-4 py-4 text-sm font-black text-gray-900">{revenueData.totals.achievedPercent}%</td>
                      <td className="px-4 py-4"></td>
                      <td className="px-4 py-4 text-sm font-black text-gray-900">{formatCurrency(revenueData.totals.newSales)}</td>
                      <td className="px-4 py-4 text-sm font-black text-gray-900">{formatCurrency(revenueData.totals.renewals)}</td>
                      <td className="px-4 py-4"></td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </LeaderboardCard>

      {/* 2. Closure Count Leaderboard */}
      <LeaderboardCard
        title="Closure Count Leaderboard"
        subtitle="Sales Conversion Performance"
        icon={Target}
        gradient="from-blue-500 to-indigo-500"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Rank</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Staff Name</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Target</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Achieved</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Progress</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">New Sales</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Renewals</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {closureLoading ? (
                <LoadingTable colSpan={8} message="Loading closure data..." />
              ) : closureData?.data?.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Target className="w-12 h-12 text-gray-300" />
                      <p className="text-gray-500 font-medium">No data available</p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {closureData?.data?.map((item) => (
                    <tr key={item.staffId} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all">
                      <td className="px-4 py-4">{getRankBadge(item.sNo)}</td>
                      <td className="px-4 py-4 text-sm font-bold text-gray-900">{item.staffName}</td>
                      <td className="px-4 py-4 text-sm text-gray-700 font-semibold">{item.target}</td>
                      <td className="px-4 py-4 text-sm text-blue-600 font-bold">{item.achieved}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-3 max-w-[120px]">
                            <div 
                              className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                              style={{ width: `${Math.min(item.achievedPercent, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-bold text-gray-900 min-w-[45px]">{item.achievedPercent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 font-semibold">{item.newSales}</td>
                      <td className="px-4 py-4 text-sm text-gray-700 font-semibold">{item.renewals}</td>
                      <td className="px-4 py-4">
                        <button className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all shadow-sm">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {closureData?.totals && (
                    <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-200">
                      <td className="px-4 py-4 text-sm font-black text-gray-900 uppercase">Total</td>
                      <td className="px-4 py-4"></td>
                      <td className="px-4 py-4 text-sm font-black text-gray-900">{closureData.totals.target}</td>
                      <td className="px-4 py-4 text-sm font-black text-blue-600">{closureData.totals.achieved}</td>
                      <td className="px-4 py-4 text-sm font-black text-gray-900">{closureData.totals.achievedPercent}%</td>
                      <td className="px-4 py-4 text-sm font-black text-gray-900">{closureData.totals.newSales}</td>
                      <td className="px-4 py-4 text-sm font-black text-gray-900">{closureData.totals.renewals}</td>
                      <td className="px-4 py-4"></td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </LeaderboardCard>

      {/* 3. Contacts Created Leaderboard */}
      <LeaderboardCard
        title="Contacts Created Leaderboard"
        subtitle="Lead Generation Performance"
        icon={Users}
        gradient="from-purple-500 to-pink-500"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Rank</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Staff Name</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Target</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Achieved</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Progress</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Enquiries</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Spot Conversions</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {contactsLoading ? (
                <LoadingTable colSpan={8} message="Loading contacts data..." />
              ) : contactsData?.data?.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="w-12 h-12 text-gray-300" />
                      <p className="text-gray-500 font-medium">No data available</p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {contactsData?.data?.map((item) => (
                    <tr key={item.staffId} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all">
                      <td className="px-4 py-4">{getRankBadge(item.sNo)}</td>
                      <td className="px-4 py-4 text-sm font-bold text-gray-900">{item.staffName}</td>
                      <td className="px-4 py-4 text-sm text-gray-700 font-semibold">{item.target}</td>
                      <td className="px-4 py-4 text-sm text-purple-600 font-bold">{item.achieved}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-3 max-w-[120px]">
                            <div 
                              className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                              style={{ width: `${Math.min(item.achievedPercent, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-bold text-gray-900 min-w-[45px]">{item.achievedPercent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 font-semibold">{item.enquiries}</td>
                      <td className="px-4 py-4 text-sm text-gray-700 font-semibold">{item.spotConversions}</td>
                      <td className="px-4 py-4">
                        <button className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-sm">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {contactsData?.totals && (
                    <tr className="bg-gradient-to-r from-purple-50 to-pink-50 border-t-2 border-purple-200">
                      <td className="px-4 py-4 text-sm font-black text-gray-900 uppercase">Total</td>
                      <td className="px-4 py-4"></td>
                      <td className="px-4 py-4 text-sm font-black text-gray-900">{contactsData.totals.target}</td>
                      <td className="px-4 py-4 text-sm font-black text-purple-600">{contactsData.totals.achieved}</td>
                      <td className="px-4 py-4 text-sm font-black text-gray-900">{contactsData.totals.achievedPercent}%</td>
                      <td className="px-4 py-4 text-sm font-black text-gray-900">{contactsData.totals.enquiries}</td>
                      <td className="px-4 py-4 text-sm font-black text-gray-900">{contactsData.totals.spotConversions}</td>
                      <td className="px-4 py-4"></td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </LeaderboardCard>

      {/* 4. Call Leaderboard */}
      <LeaderboardCard
        title="Call Leaderboard"
        subtitle="Communication Activity Performance"
        icon={Phone}
        gradient="from-orange-500 to-red-500"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Rank</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Staff Name</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Attempts</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Contacted</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Not Contacted</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Target</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Progress</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Prospecting</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Member Calls</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {callsLoading ? (
                <LoadingTable colSpan={10} message="Loading calls data..." />
              ) : callsData?.data?.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Phone className="w-12 h-12 text-gray-300" />
                      <p className="text-gray-500 font-medium">No data available</p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {callsData?.data?.map((item) => (
                    <tr key={item.staffId} className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all">
                      <td className="px-4 py-4">{getRankBadge(item.sNo)}</td>
                      <td className="px-4 py-4 text-sm font-bold text-gray-900">{item.staffName}</td>
                      <td className="px-4 py-4 text-sm text-gray-700 font-semibold">{item.attempts}</td>
                      <td className="px-4 py-4 text-sm text-green-600 font-bold">{item.contacted}</td>
                      <td className="px-4 py-4 text-sm text-red-600 font-bold">{item.notContacted}</td>
                      <td className="px-4 py-4 text-sm text-gray-700 font-semibold">{item.target}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-3 max-w-[120px]">
                            <div 
                              className="h-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                              style={{ width: `${Math.min(item.achievedPercent, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-bold text-gray-900 min-w-[45px]">{item.achievedPercent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 font-semibold">{item.prospectingCalls}</td>
                      <td className="px-4 py-4 text-sm text-gray-700 font-semibold">{item.memberCalls}</td>
                      <td className="px-4 py-4">
                        <button className="p-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-sm">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {callsData?.totals && (
                    <tr className="bg-gradient-to-r from-orange-50 to-red-50 border-t-2 border-orange-200">
                      <td className="px-4 py-4 text-sm font-black text-gray-900 uppercase">Total</td>
                      <td className="px-4 py-4"></td>
                      <td className="px-4 py-4 text-sm font-black text-gray-900">{callsData.totals.attempts}</td>
                      <td className="px-4 py-4 text-sm font-black text-green-600">{callsData.totals.contacted}</td>
                      <td className="px-4 py-4 text-sm font-black text-red-600">{callsData.totals.notContacted}</td>
                      <td className="px-4 py-4 text-sm font-black text-gray-900">{callsData.totals.target}</td>
                      <td className="px-4 py-4 text-sm font-black text-gray-900">{callsData.totals.achievedPercent}%</td>
                      <td className="px-4 py-4 text-sm font-black text-gray-900">{callsData.totals.prospectingCalls}</td>
                      <td className="px-4 py-4 text-sm font-black text-gray-900">{callsData.totals.memberCalls}</td>
                      <td className="px-4 py-4"></td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </LeaderboardCard>
    </div>
  );
}

function LeaderboardCard({ title, subtitle, icon: Icon, gradient, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden">
      <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
        <div className="flex items-center gap-4">
          <div className={`p-4 bg-gradient-to-br ${gradient} rounded-xl shadow-lg`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
