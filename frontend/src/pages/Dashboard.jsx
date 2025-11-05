import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getUpcomingRenewals, getPendingPayments } from '../api/dashboard';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { DollarSign, Users, TrendingUp, UserPlus, RefreshCw, Plus, ChevronRight, Calendar, ArrowRight, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [dateFilter, setDateFilter] = useState('today');
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Build query params based on filter
  const getQueryParams = () => {
    if (dateFilter === 'custom' && fromDate && toDate) {
      return { fromDate, toDate };
    }
    return { dateFilter };
  };

  const queryParams = getQueryParams();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats', queryParams],
    queryFn: () => api.get('/dashboard/stats', { params: queryParams }).then(res => res.data),
    enabled: !!token
  });

  // Fetch renewals
  const { data: renewals, isLoading: renewalsLoading } = useQuery({
    queryKey: ['upcoming-renewals'],
    queryFn: () => getUpcomingRenewals(7),
    enabled: !!token
  });

  // Fetch pending payments
  const { data: pending, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-payments'],
    queryFn: getPendingPayments,
    enabled: !!token
  });

  // Fetch enquiry stats
  const { data: enquiryStats } = useQuery({
    queryKey: ['enquiry-stats', queryParams],
    queryFn: () => api.get('/enquiries/stats', { params: queryParams }).then(res => res.data),
    enabled: !!token
  });

  // Fetch client stats
  const { data: clientData } = useQuery({
    queryKey: ['members', 'stats'],
    queryFn: () => api.get('/members', { params: { page: 1, limit: 1000 } }).then(res => res.data),
    enabled: !!token
  });

  // Fetch summary
  const { data: summaryData } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/dashboard/summary').then(res => res.data),
    enabled: !!token
  });

  // Fetch payment collected by mode
  const { data: paymentCollected } = useQuery({
    queryKey: ['payment-collected', queryParams],
    queryFn: () => api.get('/dashboard/payment-collected', { params: queryParams }).then(res => res.data),
    enabled: !!token
  });

  // Fetch advance payments
  const { data: advancePayments } = useQuery({
    queryKey: ['advance-payments'],
    queryFn: () => api.get('/dashboard/advance-payments').then(res => res.data),
    enabled: !!token
  });

  const statsData = stats?.stats || {};
  const clientStats = {
    total: clientData?.pagination?.total || 0,
    active: clientData?.members?.filter(m => m.membershipStatus === 'active').length || 0,
    inactive: clientData?.members?.filter(m => m.membershipStatus !== 'active').length || 0
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const handleDateFilterChange = (value) => {
    setDateFilter(value);
    if (value === 'custom') {
      setShowCustomDateRange(true);
    } else {
      setShowCustomDateRange(false);
      setFromDate('');
      setToDate('');
    }
  };

  const handleApplyCustomDate = () => {
    if (!fromDate || !toDate) {
      alert('Please select both from and to dates');
      return;
    }
    if (new Date(fromDate) > new Date(toDate)) {
      alert('From date cannot be greater than To date');
      return;
    }
    setShowCustomDateRange(false);
  };

  if (statsLoading || renewalsLoading || pendingLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error loading dashboard data</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Breadcrumbs */}
        <div className="flex items-center justify-between">
          <nav className="text-sm">
            <span className="text-gray-600">Home / </span>
            <span className="text-orange-600 font-medium">Dashboard</span>
          </nav>
        </div>

        {/* Update Message */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-4 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>Update:</strong> For users in India: New GST rate is implemented
          </p>
        </div>

        {/* Date Filter Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-4">
            <select
              value={dateFilter}
              onChange={(e) => handleDateFilterChange(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
            >
              <option value="today">Today</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="custom">Custom</option>
            </select>

            {showCustomDateRange && (
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-700 font-medium">From:</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-700 font-medium">To:</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleApplyCustomDate}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                >
                  Apply
                </button>
              </div>
            )}

            {!showCustomDateRange && (
              <button
                onClick={() => refetchStats()}
                className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Go</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Stats Cards - Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="SALES"
            value={formatCurrency(statsData.sales)}
            icon={DollarSign}
            bgColor="bg-gradient-to-br from-orange-50 to-orange-100"
            iconColor="text-orange-600"
            textColor="text-gray-900"
            borderColor="border-orange-200"
          />
          <StatCard
            title="PAYMENTS COLLECTED"
            value={formatCurrency(statsData.paymentsCollected)}
            icon={TrendingUp}
            bgColor="bg-gradient-to-br from-yellow-50 to-yellow-100"
            iconColor="text-yellow-600"
            textColor="text-gray-900"
            borderColor="border-yellow-200"
          />
          <StatCard
            title="PAYMENTS PENDING"
            value={formatCurrency(statsData.paymentsPending)}
            icon={AlertCircle}
            bgColor="bg-gradient-to-br from-purple-50 to-purple-100"
            iconColor="text-purple-600"
            textColor="text-gray-900"
            borderColor="border-purple-200"
          />
        </div>

        {/* Main Stats Cards - Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="NEW CLIENT(S)"
            value={statsData.newClients || 0}
            icon={UserPlus}
            bgColor="bg-white"
            iconColor="text-blue-600"
            textColor="text-blue-600"
            borderColor="border-blue-200"
          />
          <StatCard
            title="RENEWALS"
            value={statsData.renewals || 0}
            icon={RefreshCw}
            bgColor="bg-white"
            iconColor="text-green-600"
            textColor="text-green-600"
            borderColor="border-green-200"
          />
          <StatCard
            title="CHECK-INS"
            value={statsData.checkIns || 0}
            icon={Users}
            bgColor="bg-white"
            iconColor="text-red-600"
            textColor="text-red-600"
            borderColor="border-red-200"
          />
        </div>

        {/* Enquiries Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Enquiries - {enquiryStats?.stats?.total || 0}
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">OPEN</p>
              <p className="text-3xl font-bold text-red-600">{enquiryStats?.stats?.opened || 0}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">CONVERTED</p>
              <p className="text-3xl font-bold text-green-600">{enquiryStats?.stats?.converted || 0}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">LOST</p>
              <p className="text-3xl font-bold text-gray-600">{enquiryStats?.stats?.archived || 0}</p>
            </div>
          </div>
        </div>

        {/* Total Clients Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Total Clients</h2>
          <div className="space-y-4">
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <p className="text-4xl font-bold text-blue-600 mb-2">{clientStats.total}</p>
              <p className="text-sm text-gray-600">Total Clients</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">ACTIVE:</span>
                  <span className="text-xl font-bold text-green-600">{clientStats.active}</span>
                </div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">INACTIVE:</span>
                  <span className="text-xl font-bold text-red-600">{clientStats.inactive}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center space-x-4 pt-2">
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium underline">
                VIEW ALL
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="space-y-4">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex border-b border-gray-200">
            <button className="flex-1 px-4 py-3 border-b-2 border-orange-500 text-orange-600 font-medium text-sm bg-orange-50">
              Snapshot
            </button>
            <button
              onClick={() => navigate('/taskboard')}
              className="flex-1 px-4 py-3 text-gray-600 hover:text-gray-900 text-sm hover:bg-gray-50 transition-colors"
            >
              Follow-ups
            </button>
            <button
              onClick={() => navigate('/leaderboard')}
              className="flex-1 px-4 py-3 text-gray-600 hover:text-gray-900 text-sm hover:bg-gray-50 transition-colors"
            >
              Leaderboards
            </button>
          </div>
        </div>


        {/* Summary Section - Below Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 text-lg">Summary</h3>
            <div className="flex items-center space-x-2">
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
              <span className="text-sm font-medium text-gray-700">Today</span>
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="space-y-3">
            <SummaryItem title="Follow-ups" count={summaryData?.data?.followUps || 0} total={9} />
            <SummaryItem title="Appointments" count={summaryData?.data?.appointments || 0} total={0} />
            <SummaryItem title="Service expiry" count={summaryData?.data?.serviceExpiry || 0} />
            <SummaryItem title="PT expiry" count={0} />
            <SummaryItem title="Upgrades" count={summaryData?.data?.upgrades || 0} />
            <SummaryItem title="Client birthdays" count={summaryData?.data?.clientBirthdays || 0} />
            <SummaryItem title="Client Anniversaries" count={0} />
            <SummaryItem title="Staff birthdays" count={summaryData?.data?.staffBirthdays || 0} />
            <SummaryItem title="Staff Anniversaries" count={0} />
          </div>
        </div>

        {/* Payment Collected */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-4 text-lg">Payment Collected</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-semibold text-gray-700">S.No</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-700">Pay Mode</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {paymentCollected?.data?.payments?.map((payment, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2 text-gray-700">{payment.sNo}</td>
                    <td className="py-2 px-2 text-gray-700">{payment.payMode}</td>
                    <td className="text-right py-2 px-2 text-gray-700 font-medium">{formatCurrency(payment.amount)}</td>
                  </tr>
                ))}
                {(!paymentCollected?.data?.payments || paymentCollected.data.payments.length === 0) && (
                  <tr>
                    <td colSpan="3" className="text-center py-6 text-gray-500">No payments</td>
                  </tr>
                )}
                <tr className="font-bold bg-gray-50">
                  <td colSpan="2" className="py-2 px-2 text-gray-900">Total</td>
                  <td className="text-right py-2 px-2 text-gray-900">{formatCurrency(paymentCollected?.data?.total || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Advance Payment */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-4 text-lg">Advance Payment</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
              <span className="text-sm font-semibold text-gray-700">COLLECTED:</span>
              <span className="text-lg font-bold text-green-600">{formatCurrency(advancePayments?.data?.collected || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
              <span className="text-sm font-semibold text-gray-700">UTILISED:</span>
              <span className="text-lg font-bold text-red-600">{formatCurrency(advancePayments?.data?.utilized || 0)}</span>
            </div>
          </div>
        </div>

        {/* End of shift/day button */}
        <button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3 rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg">
          End of shift/day
        </button>

        {/* Expenses */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-3 text-lg">Expenses</h3>
          <p className="text-gray-500 text-sm text-center py-6">No result found</p>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ title, count, total }) {
  return (
    <div className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded transition-colors">
      <span className="text-sm text-gray-700">{title}:</span>
      <span className="font-semibold text-gray-900">
        {total !== undefined ? `(${count}/${total})` : count}
      </span>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, bgColor, iconColor, textColor, borderColor }) {
  return (
    <div className={`${bgColor} rounded-xl shadow-sm border-2 ${borderColor} p-6 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">{title}</p>
        {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
      </div>
      <p className={`text-3xl font-bold ${textColor} mb-2`}>{value}</p>
      <a href="#" className="text-orange-600 text-xs font-semibold hover:underline flex items-center">
        VIEW MORE
        <ChevronRight className="w-3 h-3 ml-1" />
      </a>
    </div>
  );
}
