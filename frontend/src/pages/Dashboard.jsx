import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getUpcomingRenewals, getPendingPayments } from '../api/dashboard';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { useDateFilterStore } from '../store/dateFilterStore';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  UserPlus, 
  RefreshCw, 
  ChevronRight, 
  ChevronLeft, 
  ArrowRight, 
  AlertCircle,
  CalendarDays,
  Sparkles,
  TrendingDown,
  Activity,
  Target,
  Clock,
  CheckCircle2,
  Gift,
  Zap
} from 'lucide-react';
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

  // State for refresh loading
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats', queryParams],
    queryFn: () => api.get('/dashboard/stats', { params: queryParams }).then(res => res.data),
    enabled: !!token
  });

  // Fetch renewals
  const { data: renewals, isLoading: renewalsLoading, refetch: refetchRenewals } = useQuery({
    queryKey: ['upcoming-renewals'],
    queryFn: () => getUpcomingRenewals(7),
    enabled: !!token
  });

  // Fetch pending payments
  const { data: pending, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ['pending-payments'],
    queryFn: getPendingPayments,
    enabled: !!token
  });

  // Fetch enquiry stats
  const { data: enquiryStats, refetch: refetchEnquiryStats } = useQuery({
    queryKey: ['enquiry-stats', queryParams],
    queryFn: () => api.get('/enquiries/stats', { params: queryParams }).then(res => res.data),
    enabled: !!token
  });

  // Fetch client stats
  const { data: clientStatsData, refetch: refetchClientStats } = useQuery({
    queryKey: ['member-stats'],
    queryFn: () => api.get('/members/stats').then(res => res.data),
    enabled: !!token
  });

  // Fetch summary with date parameter
  const { data: summaryData, refetch: refetchSummary } = useQuery({
    queryKey: ['dashboard-summary', summaryDate],
    queryFn: () => api.get('/dashboard/summary', { params: { date: summaryDate } }).then(res => res.data),
    enabled: !!token
  });

  // Fetch payment collected by mode
  const { data: paymentCollected, refetch: refetchPaymentCollected } = useQuery({
    queryKey: ['payment-collected', queryParams],
    queryFn: () => api.get('/dashboard/payment-collected', { params: queryParams }).then(res => res.data),
    enabled: !!token
  });

  // Refresh all dashboard data
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchStats(),
        refetchRenewals(),
        refetchPending(),
        refetchEnquiryStats(),
        refetchClientStats(),
        refetchSummary(),
        refetchPaymentCollected()
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const statsData = stats?.stats || {};
  const clientStats = clientStatsData?.stats || {
    total: 0,
    active: 0,
    inactive: 0
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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Date Filter Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Period:</span>
          </div>
          
          <select
            value={dateFilter}
            onChange={(e) => handleDateFilterChange(e.target.value)}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors"
          >
            <option value="today">Today</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>

          {showCustomDateRange && (
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 font-medium">From:</label>
                <DateInput
                  value={fromDate}
                  onChange={(e) => setFromDateValue(e.target.value)}
                  hideIcon
                />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 font-medium">To:</label>
                <DateInput
                  value={toDate}
                  onChange={(e) => setToDateValue(e.target.value)}
                  hideIcon
                />
              </div>
              <button
                onClick={handleApplyCustomDate}
                className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-medium shadow-lg hover:shadow-xl"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Primary Stats - Revenue Focused */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ModernStatCard
              title="Total Sales"
              value={formatCurrency(statsData.sales)}
              icon={DollarSign}
              gradient="from-orange-500 to-red-500"
              trend="+12.5%"
              onClick={() => navigateWithDateFilter('/reports/sales/service-sales')}
            />
            <ModernStatCard
              title="Collected"
              value={formatCurrency(statsData.paymentsCollected)}
              icon={TrendingUp}
              gradient="from-green-500 to-emerald-500"
              trend="+8.2%"
              onClick={() => navigateWithDateFilter('/reports/finance/service-payments-collected')}
            />
            <ModernStatCard
              title="Pending"
              value={formatCurrency(statsData.paymentsPending)}
              icon={AlertCircle}
              gradient="from-purple-500 to-pink-500"
              alert={true}
              onClick={() => navigateWithDateFilter('/reports/finance/pending-collections')}
            />
          </div>

          {/* Activity Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActivityCard
              title="New Clients"
              value={statsData.newClients || 0}
              icon={UserPlus}
              color="blue"
              onClick={() => navigateWithDateFilter('/reports/client-management/new-clients')}
            />
            <ActivityCard
              title="Renewals"
              value={statsData.renewals || 0}
              icon={RefreshCw}
              color="green"
              onClick={() => navigateWithDateFilter('/reports/client-management/renewals')}
            />
            <ActivityCard
              title="Check-ins"
              value={statsData.checkIns || 0}
              icon={Activity}
              color="orange"
              onClick={() => navigateWithDateFilter('/reports/client-management/member-checkins')}
            />
          </div>

          {/* Enquiries Section - Modern Design */}
          <div 
            onClick={() => navigateWithDateFilter('/enquiries')}
            className="group bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-sm border-2 border-gray-200 p-6 hover:shadow-xl hover:border-orange-300 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Enquiries</h2>
                  <p className="text-sm text-gray-600">Total: {enquiryStats?.stats?.total || 0}</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <EnquiryStatBox 
                label="Open" 
                value={enquiryStats?.stats?.opened || 0} 
                color="red"
              />
              <EnquiryStatBox 
                label="Converted" 
                value={enquiryStats?.stats?.converted || 0} 
                color="green"
              />
              <EnquiryStatBox 
                label="Lost" 
                value={enquiryStats?.stats?.archived || 0} 
                color="gray"
              />
            </div>
          </div>

          {/* Client Overview */}
          <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Client Overview</h2>
                <p className="text-sm text-gray-600">Your membership base</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="relative p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border-2 border-blue-200 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200 rounded-full -mr-16 -mt-16 opacity-20"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-200 rounded-full -ml-12 -mb-12 opacity-20"></div>
                <div className="relative text-center">
                  <p className="text-6xl font-black text-blue-600 mb-2">{clientStats.total}</p>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Clients</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-1">Active</p>
                      <p className="text-3xl font-bold text-green-600">{clientStats.active}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>
                
                <div className="p-5 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-2 border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-1">Inactive</p>
                      <p className="text-3xl font-bold text-red-600">{clientStats.inactive}</p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-lg">
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-5">
          {/* Quick Actions Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden">
            <div className="grid grid-cols-3 border-b-2 border-gray-200">
              <button className="relative px-3 py-4 text-center text-sm font-bold text-orange-600 bg-gradient-to-b from-orange-50 to-white transition-colors">
                <span>Snapshot</span>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-red-500"></div>
              </button>
              <button
                onClick={() => navigate('/taskboard')}
                className="px-3 py-4 text-center text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                Follow-ups
              </button>
              <button
                onClick={() => navigate('/leaderboard')}
                className="px-3 py-4 text-center text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                Leaders
              </button>
            </div>
          </div>

          {/* Summary Section */}
          <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-gray-900 text-lg">Daily Summary</h3>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button 
                  onClick={handleSummaryPreviousDay}
                  className={`p-1.5 rounded transition-colors ${summaryDate === yesterdayDateString ? 'cursor-not-allowed opacity-40' : 'hover:bg-white hover:text-orange-600'}`}
                  disabled={summaryDate === yesterdayDateString}
                  title="Previous day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSummaryToday}
                  className="px-3 py-1.5 text-xs font-bold text-gray-700 hover:text-orange-600 transition-colors"
                  title="Go to today"
                >
                  {formatSummaryDate(summaryDate)}
                </button>
                <button 
                  onClick={handleSummaryNextDay}
                  className={`p-1.5 rounded transition-colors ${summaryDate === tomorrowDateString ? 'cursor-not-allowed opacity-40' : 'hover:bg-white hover:text-orange-600'}`}
                  disabled={summaryDate === tomorrowDateString}
                  title="Next day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <SummaryItem 
                title="Follow-ups" 
                count={summaryData?.data?.followUps || 0}
                icon={Clock}
                onClick={() => navigate('/taskboard', { state: { date: summaryDate } })}
              />
              <SummaryItem 
                title="Service expiry" 
                count={summaryData?.data?.serviceExpiry || 0}
                icon={AlertCircle}
                onClick={() => navigate(`/reports/client-management/service-expiry?fromDate=${summaryDate}&toDate=${summaryDate}`)}
              />
              <SummaryItem 
                title="Upgrades" 
                count={summaryData?.data?.upgrades || 0}
                icon={TrendingUp}
                onClick={() => navigate(`/reports/client-management/upgrade?fromDate=${summaryDate}&toDate=${summaryDate}`)}
              />
              <SummaryItem 
                title="Client birthdays" 
                count={summaryData?.data?.clientBirthdays || 0}
                icon={Gift}
                onClick={() => navigate(`/reports/client-management/birthday?fromDate=${summaryDate}&toDate=${summaryDate}`)}
              />
              <SummaryItem 
                title="Staff birthdays" 
                count={summaryData?.data?.staffBirthdays || 0}
                icon={Gift}
                onClick={() => navigate(`/reports/staff/birthday?fromDate=${summaryDate}&toDate=${summaryDate}`)}
              />
            </div>
          </div>

          {/* Payment Collected */}
          <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-yellow-500" />
              <h3 className="font-bold text-gray-900 text-lg">Payment Modes</h3>
            </div>
            
            <div className="space-y-2">
              {paymentCollected?.data?.payments?.map((payment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center text-orange-600 font-bold text-xs">
                      {payment.sNo}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{payment.payMode}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(payment.amount)}</span>
                </div>
              ))}
              
              {(!paymentCollected?.data?.payments || paymentCollected.data.payments.length === 0) && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No payments collected
                </div>
              )}
              
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border-2 border-orange-200 mt-3">
                <span className="text-sm font-bold text-gray-900">Total Collected</span>
                <span className="text-lg font-black text-orange-600">{formatCurrency(paymentCollected?.data?.total || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModernStatCard({ title, value, icon: Icon, gradient, trend, alert, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="group relative bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-6 hover:shadow-xl hover:scale-105 transition-all cursor-pointer overflow-hidden"
    >
      {/* Gradient Background */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-full -mr-16 -mt-16 group-hover:opacity-20 transition-opacity`}></div>
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 bg-gradient-to-br ${gradient} rounded-xl shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend && !alert && (
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
              {trend}
            </span>
          )}
          {alert && (
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg animate-pulse">
              Action needed
            </span>
          )}
        </div>
        
        <p className="text-sm font-semibold text-gray-600 mb-2">{title}</p>
        <p className="text-3xl font-black text-gray-900 mb-3">{value}</p>
        
        <div className="flex items-center text-orange-600 text-sm font-bold group-hover:translate-x-1 transition-transform">
          <span>View details</span>
          <ChevronRight className="w-4 h-4 ml-1" />
        </div>
      </div>
    </div>
  );
}

function ActivityCard({ title, value, icon: Icon, color, onClick }) {
  const colorClasses = {
    blue: 'from-blue-500 to-indigo-500 text-blue-600 bg-blue-50 border-blue-200',
    green: 'from-green-500 to-emerald-500 text-green-600 bg-green-50 border-green-200',
    orange: 'from-orange-500 to-red-500 text-orange-600 bg-orange-50 border-orange-200'
  };

  const colors = colorClasses[color] || colorClasses.blue;
  const [gradientFrom, gradientTo, textColor, bgColor, borderColor] = colors.split(' ');

  return (
    <div 
      onClick={onClick}
      className={`group bg-white rounded-2xl shadow-sm border-2 ${borderColor} p-5 hover:shadow-lg transition-all cursor-pointer`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
      </div>
      <p className="text-sm font-semibold text-gray-600 mb-1">{title}</p>
      <p className={`text-4xl font-black ${textColor}`}>{value}</p>
    </div>
  );
}

function EnquiryStatBox({ label, value, color }) {
  const colorClasses = {
    red: 'bg-red-50 border-red-200 text-red-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    gray: 'bg-gray-50 border-gray-200 text-gray-600'
  };

  return (
    <div className={`text-center p-4 rounded-xl border-2 ${colorClasses[color]} transition-transform hover:scale-105`}>
      <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-black ${colorClasses[color].split(' ')[2]}`}>{value}</p>
    </div>
  );
}

function SummaryItem({ title, count, icon: Icon, onClick }) {
  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-xl hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all ${
        onClick ? 'cursor-pointer group' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-orange-100 transition-colors">
          <Icon className="w-4 h-4 text-gray-600 group-hover:text-orange-600" />
        </div>
        <span className="text-sm font-medium text-gray-700">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-gray-900">{count}</span>
        {onClick && <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />}
      </div>
    </div>
  );
}
