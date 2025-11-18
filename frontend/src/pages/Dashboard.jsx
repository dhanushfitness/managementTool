import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getUpcomingRenewals, getPendingPayments } from '../api/dashboard';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { useDateFilterStore } from '../store/dateFilterStore';
import { DollarSign, Users, TrendingUp, UserPlus, RefreshCw, Plus, ChevronRight, ChevronLeft, Calendar, ArrowRight, AlertCircle } from 'lucide-react';
import LoadingPage from '../components/LoadingPage';
import DateInput from '../components/DateInput';
import Breadcrumbs from '../components/Breadcrumbs';

export default function Dashboard() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const {
    dateFilter,
    fromDate,
    toDate,
    setDateFilterValue,
    setFromDateValue,
    setToDateValue
  } = useDateFilterStore();
  const [showCustomDateRange, setShowCustomDateRange] = useState(dateFilter === 'custom');
  
  // State for summary date navigation
  const [summaryDate, setSummaryDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const getRelativeDateString = (offset) => {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + offset);
    return baseDate.toISOString().split('T')[0];
  };

  const todayDateString = getRelativeDateString(0);
  const yesterdayDateString = getRelativeDateString(-1);
  const tomorrowDateString = getRelativeDateString(1);

  // Build query params based on filter
  const getQueryParams = () => {
    if (dateFilter === 'custom' && fromDate && toDate) {
      return { fromDate, toDate };
    }
    return { dateFilter };
  };

  const queryParams = getQueryParams();

  const buildDateSearch = () => {
    const params = new URLSearchParams();
    params.set('dateFilter', dateFilter);
    if (dateFilter === 'custom' && fromDate && toDate) {
      params.set('fromDate', fromDate);
      params.set('toDate', toDate);
    }
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  };

  const navigateWithDateFilter = (path) => {
    navigate(`${path}${buildDateSearch()}`);
  };

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

  // Fetch summary with date parameter
  const { data: summaryData } = useQuery({
    queryKey: ['dashboard-summary', summaryDate],
    queryFn: () => api.get('/dashboard/summary', { params: { date: summaryDate } }).then(res => res.data),
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

  // Format summary date for display
  const formatSummaryDate = (dateStr) => {
    if (!dateStr) return 'Today';
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Handle summary date navigation
  const handleSummaryPreviousDay = () => {
    if (summaryDate === tomorrowDateString) {
      setSummaryDate(todayDateString);
      return;
    }
    if (summaryDate === todayDateString) {
      setSummaryDate(yesterdayDateString);
    }
  };

  const handleSummaryNextDay = () => {
    if (summaryDate === yesterdayDateString) {
      setSummaryDate(todayDateString);
      return;
    }
    if (summaryDate === todayDateString) {
      setSummaryDate(tomorrowDateString);
    }
  };

  const handleSummaryToday = () => {
    const today = new Date();
    setSummaryDate(today.toISOString().split('T')[0]);
  };

  useEffect(() => {
    setShowCustomDateRange(dateFilter === 'custom');
  }, [dateFilter]);

  const handleDateFilterChange = (value) => {
    setDateFilterValue(value);
    if (value === 'custom') {
      setShowCustomDateRange(true);
    } else {
      setShowCustomDateRange(false);
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
    return <LoadingPage message="Loading dashboard..." />;
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
          <Breadcrumbs />
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
                  <DateInput
                    value={fromDate}
                    onChange={(e) => setFromDateValue(e.target.value)}
                    hideIcon
                  />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-700 font-medium">To:</label>
                  <DateInput
                    value={toDate}
                    onChange={(e) => setToDateValue(e.target.value)}
                    hideIcon
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
            onViewMore={() => navigateWithDateFilter('/reports/sales/service-sales')}
          />
          <StatCard
            title="PAYMENTS COLLECTED"
            value={formatCurrency(statsData.paymentsCollected)}
            icon={TrendingUp}
            bgColor="bg-gradient-to-br from-yellow-50 to-yellow-100"
            iconColor="text-yellow-600"
            textColor="text-gray-900"
            borderColor="border-yellow-200"
            onViewMore={() => navigateWithDateFilter('/reports/finance/service-payments-collected')}
          />
          <StatCard
            title="PAYMENTS PENDING"
            value={formatCurrency(statsData.paymentsPending)}
            icon={AlertCircle}
            bgColor="bg-gradient-to-br from-purple-50 to-purple-100"
            iconColor="text-purple-600"
            textColor="text-gray-900"
            borderColor="border-purple-200"
            onViewMore={() => navigateWithDateFilter('/reports/finance/pending-collections')}
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
            onViewMore={() => navigateWithDateFilter('/reports/client-management/new-clients')}
          />
          <StatCard
            title="RENEWALS"
            value={statsData.renewals || 0}
            icon={RefreshCw}
            bgColor="bg-white"
            iconColor="text-green-600"
            textColor="text-green-600"
            borderColor="border-green-200"
            onViewMore={() => navigateWithDateFilter('/reports/client-management/renewals')}
          />
          <StatCard
            title="CHECK-INS"
            value={statsData.checkIns || 0}
            icon={Users}
            bgColor="bg-white"
            iconColor="text-red-600"
            textColor="text-red-600"
            borderColor="border-red-200"
            onViewMore={() => navigateWithDateFilter('/reports/client-management/member-checkins')}
          />
        </div>

        {/* Enquiries Section */}
        <button
          onClick={() => navigateWithDateFilter('/enquiries')}
          className="w-full text-left bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
            <span>Enquiries - {enquiryStats?.stats?.total || 0}</span>
            <span className="text-xs font-semibold text-orange-600">View details</span>
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
        </button>

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
              <button 
                onClick={handleSummaryPreviousDay}
                className={`text-gray-400 transition-colors ${summaryDate === yesterdayDateString ? 'cursor-not-allowed opacity-40' : 'hover:text-gray-600'}`}
                disabled={summaryDate === yesterdayDateString}
                title="Previous day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleSummaryToday}
                className="text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors"
                title="Go to today"
              >
                {formatSummaryDate(summaryDate)}
              </button>
              <button 
                onClick={handleSummaryNextDay}
                className={`text-gray-400 transition-colors ${summaryDate === tomorrowDateString ? 'cursor-not-allowed opacity-40' : 'hover:text-gray-600'}`}
                disabled={summaryDate === tomorrowDateString}
                title="Next day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="space-y-3">
            <SummaryItem 
              title="Follow-ups" 
              count={summaryData?.data?.followUps || 0} 
              total={9} 
              onClick={() => {
                const today = new Date();
                const dateStr = today.toISOString().split('T')[0];
                navigate('/taskboard', { state: { date: dateStr } });
              }}
            />
            <SummaryItem title="Service expiry" count={summaryData?.data?.serviceExpiry || 0} />
            <SummaryItem title="Upgrades" count={summaryData?.data?.upgrades || 0} />
            <SummaryItem title="Client birthdays" count={summaryData?.data?.clientBirthdays || 0} />
            <SummaryItem title="Staff birthdays" count={summaryData?.data?.staffBirthdays || 0} />
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

      </div>
    </div>
  );
}

function SummaryItem({ title, count, total, onClick }) {
  return (
    <div 
      className={`flex items-center justify-between py-2 px-2 rounded transition-colors ${
        onClick ? 'hover:bg-gray-50 cursor-pointer' : 'hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <span className="text-sm text-gray-700">{title}:</span>
      <span className="font-semibold text-gray-900">
        {total !== undefined ? `(${count}/${total})` : count}
      </span>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, bgColor, iconColor, textColor, borderColor, onViewMore }) {
  const isClickable = typeof onViewMore === 'function';

  return (
    <div className={`${bgColor} rounded-xl shadow-sm border-2 ${borderColor} p-6 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">{title}</p>
        {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
      </div>
      <p className={`text-3xl font-bold ${textColor} mb-2`}>{value}</p>
      {isClickable ? (
        <button
          type="button"
          onClick={onViewMore}
          className="text-orange-600 text-xs font-semibold hover:underline flex items-center"
        >
          VIEW MORE
          <ChevronRight className="w-3 h-3 ml-1" />
        </button>
      ) : (
        <span className="text-orange-200 text-xs font-semibold flex items-center cursor-not-allowed">
          VIEW MORE
          <ChevronRight className="w-3 h-3 ml-1" />
        </span>
      )}
    </div>
  );
}
