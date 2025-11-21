import { Fragment, useEffect, useMemo, useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import {
  Download,
  ChevronDown,
  Info,
  PhoneCall as PhoneCallIcon,
  CreditCard as CreditCardIcon,
  Wallet,
  FileText,
  UserPlus,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Target,
  TrendingUp,
  ArrowRight,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingTable from '../components/LoadingTable';
import Breadcrumbs from '../components/Breadcrumbs';
import DateInput from '../components/DateInput';
import AddInvoiceModal from '../components/AddInvoiceModal';

export default function Taskboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedCallType, setSelectedCallType] = useState('all');
  const [selectedCallStatus, setSelectedCallStatus] = useState('all');
  const [invoiceModalState, setInvoiceModalState] = useState({ open: false, member: null });

  // Set default dates to today or use date from navigation state
  useEffect(() => {
    const stateDate = location.state?.date;
    if (stateDate) {
      setFromDate(stateDate);
      setToDate(stateDate);
      window.history.replaceState({}, document.title);
    } else {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      setFromDate(dateStr);
      setToDate(dateStr);
    }
  }, [location.state]);

  // Fetch staff list
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff').then(res => res.data),
    enabled: !!token
  });

  // Fetch taskboard stats
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['taskboard-stats', fromDate, toDate, selectedStaff, selectedCallType],
    queryFn: () => {
      const params = {
        fromDate,
        toDate,
      };

      if (selectedStaff && selectedStaff !== 'all') {
        params.staffId = selectedStaff;
      }
      if (selectedCallType && selectedCallType !== 'all') {
        params.callType = selectedCallType;
      }

      return api
        .get('/followups/taskboard/stats', { params })
        .then(res => res.data);
    },
    enabled: !!token && !!fromDate && !!toDate
  });

  // Fetch taskboard data
  const { data: taskboardData, isLoading, refetch: refetchTaskboard } = useQuery({
    queryKey: ['taskboard', fromDate, toDate, selectedStaff, selectedCallType, selectedCallStatus, activeTab],
    queryFn: () => {
      const params = {
        fromDate,
        toDate,
        tab: activeTab
      };

      if (selectedStaff && selectedStaff !== 'all') {
        params.staffId = selectedStaff;
      }
      if (selectedCallType && selectedCallType !== 'all') {
        params.callType = selectedCallType;
      }
      if (selectedCallStatus && selectedCallStatus !== 'all') {
        params.callStatus = selectedCallStatus;
      }

      return api
        .get('/followups/taskboard', { params })
        .then(res => res.data);
    },
    enabled: !!token && !!fromDate && !!toDate
  });

  // Update follow-up status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ followUpId, callStatus }) =>
      api.put(`/followups/taskboard/${followUpId}/status`, { callStatus }).then(res => res.data),
    onSuccess: () => {
      toast.success('Status updated successfully');
      refetchTaskboard();
      refetchStats();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  });

  const handleApplyFilters = () => {
    if (!fromDate || !toDate) {
      toast.error('Please select both from and to dates');
      return;
    }
    if (new Date(fromDate) > new Date(toDate)) {
      toast.error('From date cannot be greater than To date');
      return;
    }
    refetchTaskboard();
    refetchStats();
  };

  const handleExportExcel = async () => {
    try {
      const params = {
        fromDate,
        toDate
      };

      if (selectedStaff && selectedStaff !== 'all') {
        params.staffId = selectedStaff;
      }
      if (selectedCallType && selectedCallType !== 'all') {
        params.callType = selectedCallType;
      }
      if (selectedCallStatus && selectedCallStatus !== 'all') {
        params.callStatus = selectedCallStatus;
      }

      const response = await api.get('/followups/taskboard/export', {
        params,
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `taskboard-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Export successful');
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  const convertEnquiryMutation = useMutation({
    mutationFn: ({ enquiryId, planId }) =>
      api.post(`/enquiries/${enquiryId}/convert`, planId ? { planId } : {}),
    onSuccess: () => {
      toast.success('Enquiry converted to member successfully');
      refetchTaskboard();
      refetchStats();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to convert enquiry');
    }
  });

  const handleUpdateCallAction = (followUp) => {
    if (followUp.entityType !== 'enquiry' && !followUp.isEnquiry) {
      toast.error('Update call is available only for enquiries.');
      return;
    }
    if (!followUp.entityId) {
      toast.error('Enquiry details are not available for this follow-up.');
      return;
    }
    navigate(`/enquiries/${followUp.entityId}/update-call`, {
      state: { from: `${location.pathname}${location.search}` || '/taskboard' }
    });
  };

  const handleConvertToMember = (followUp) => {
    if (followUp.entityType !== 'enquiry' && !followUp.isEnquiry) {
      toast.error('Convert to member is available only for enquiries.');
      return;
    }
    if (!followUp.entityId) {
      toast.error('Enquiry details are not available for this follow-up.');
      return;
    }

    const planId = window.prompt('Enter plan ID (optional)');
    convertEnquiryMutation.mutate({
      enquiryId: followUp.entityId,
      planId: planId || undefined
    });
  };

  const handleServiceCardAction = (followUp) => {
    if (followUp.entityType !== 'member') {
      toast.error('Service card is available only for members.');
      return;
    }
    navigate(`/clients/${followUp.entityId}?tab=service-card`);
  };

  const handlePaymentsAction = (followUp) => {
    if (followUp.entityType !== 'member') {
      toast.error('Payments are available only for members.');
      return;
    }
    navigate(`/clients/${followUp.entityId}?tab=payments`);
  };

  const handleNewInvoiceAction = (followUp) => {
    if (followUp.entityType !== 'member') {
      toast.error('Invoices can be created only for members.');
      return;
    }
    if (!followUp.entityId) {
      toast.error('Member details are not available for this follow-up.');
      return;
    }
    setInvoiceModalState({
      open: true,
      member: {
        id: followUp.entityId,
        name: followUp.memberName,
        phone: followUp.memberMobile
      }
    });
  };

  const handleCloseInvoiceModal = (shouldRefresh = false) => {
    setInvoiceModalState({ open: false, member: null });
    if (shouldRefresh) {
      refetchTaskboard();
      refetchStats();
    }
  };

  const formatCallType = (type) => {
    const types = {
      'renewal-call': 'Renewal Call',
      'assessment-call': 'Assessment Call',
      'follow-up-call': 'Follow-up Call',
      'enquiry-call': 'Enquiry Call',
      'welcome-call': 'Welcome Call',
      'upgrade-call': 'Upgrade Call',
      'other': 'Other'
    };
    return types[type] || type;
  };

  const stats = statsData?.stats || {};
  const followUps = taskboardData?.followUps || [];

  const groupedFollowUps = useMemo(() => {
    if (!followUps || followUps.length === 0) return [];

    const groupsMap = followUps.reduce((acc, followUp) => {
      let timeValue = null;
      let dateForGrouping = null;

      // Prefer dateLabel from backend if available
      if (followUp.dateLabel) {
        const key = followUp.dateLabel;
        
        if (followUp.effectiveScheduledTime) {
          const date = new Date(followUp.effectiveScheduledTime);
          timeValue = !Number.isNaN(date.getTime()) ? date.getTime() : null;
        } else if (followUp.scheduledTime) {
          const date = new Date(followUp.scheduledTime);
          timeValue = !Number.isNaN(date.getTime()) ? date.getTime() : null;
        } else if (followUp.dueDate) {
          const date = new Date(followUp.dueDate);
          timeValue = !Number.isNaN(date.getTime()) ? date.getTime() : null;
        }

        if (!acc[key]) {
          acc[key] = {
            key,
            sortValue: timeValue ?? Number.MAX_SAFE_INTEGER,
            label: key,
            items: []
          };
        }

        acc[key].items.push({
          ...followUp,
          effectiveScheduledTime: timeValue
        });

        return acc;
      }

      // Fallback: calculate date from effectiveScheduledTime or other date fields
      if (followUp.effectiveScheduledTime) {
        const date = new Date(followUp.effectiveScheduledTime);
        timeValue = !Number.isNaN(date.getTime()) ? date.getTime() : null;
        if (timeValue !== null) {
          const year = date.getFullYear();
          const month = date.getMonth();
          const day = date.getDate();
          dateForGrouping = new Date(year, month, day, 0, 0, 0, 0);
        }
      } else if (followUp.scheduledTime) {
        const date = new Date(followUp.scheduledTime);
        timeValue = !Number.isNaN(date.getTime()) ? date.getTime() : null;
        if (timeValue !== null) {
          const year = date.getFullYear();
          const month = date.getMonth();
          const day = date.getDate();
          dateForGrouping = new Date(year, month, day, 0, 0, 0, 0);
        }
      } else if (followUp.dueDate) {
        const date = new Date(followUp.dueDate);
        timeValue = !Number.isNaN(date.getTime()) ? date.getTime() : null;
        if (timeValue !== null) {
          const year = date.getFullYear();
          const month = date.getMonth();
          const day = date.getDate();
          dateForGrouping = new Date(year, month, day, 0, 0, 0, 0);
        }
      }

      const formattedScheduledDate =
        dateForGrouping !== null
          ? dateForGrouping.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })
          : null;

      const key = formattedScheduledDate || 'No Scheduled Date';

      if (!acc[key]) {
        acc[key] = {
          key,
          sortValue: dateForGrouping ? dateForGrouping.getTime() : (timeValue ?? Number.MAX_SAFE_INTEGER),
          label: key,
          items: []
        };
      }

      acc[key].items.push({
        ...followUp,
        effectiveScheduledTime: timeValue
      });

      return acc;
    }, {});

    return Object.keys(groupsMap)
      .map(key => groupsMap[key])
      .map(group => ({
        ...group,
        items: group.items.sort((a, b) => (a.effectiveScheduledTime ?? Number.MAX_SAFE_INTEGER) - (b.effectiveScheduledTime ?? Number.MAX_SAFE_INTEGER))
      }))
      .sort((a, b) => a.sortValue - b.sortValue);
  }, [followUps]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Follow-ups Taskboard</h1>
          <p className="text-gray-600">Manage and track all your scheduled follow-ups</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden inline-flex">
          <button
            onClick={() => navigate('/')}
            className="px-5 py-3 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            Snapshot
          </button>
          <button className="px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-red-500">
            Follow-ups
          </button>
          <button
            onClick={() => navigate('/leaderboard')}
            className="px-5 py-3 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            Leaderboards
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Date:</span>
          </div>
          
          <DateInput
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="pl-10 pr-4"
          />
          
          <ArrowRight className="w-4 h-4 text-gray-400" />
          
          <DateInput
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="pl-10 pr-4"
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

          <select
            value={selectedCallType}
            onChange={(e) => setSelectedCallType(e.target.value)}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-sm font-medium"
          >
            <option value="all">All Call Types</option>
            <option value="welcome-call">Welcome Call</option>
            <option value="assessment-call">Assessment Call</option>
            <option value="upgrade-call">Upgrade Call</option>
            <option value="renewal-call">Renewal Call</option>
            <option value="follow-up-call">Follow-up Call</option>
            <option value="enquiry-call">Enquiry Call</option>
            <option value="other">Other</option>
          </select>

          <select
            value={selectedCallStatus}
            onChange={(e) => setSelectedCallStatus(e.target.value)}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-sm font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="attempted">Attempted</option>
            <option value="contacted">Contacted</option>
            <option value="not-contacted">Not Contacted</option>
            <option value="missed">Missed</option>
          </select>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleApplyFilters}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold shadow-lg hover:shadow-xl"
            >
              Apply Filters
            </button>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <TaskStatCard
          title="Overall"
          count={stats.total || 0}
          percent="100"
          icon={Target}
          gradient="from-gray-500 to-gray-600"
        />
        <TaskStatCard
          title="Scheduled"
          count={stats.scheduled?.count || 0}
          percent={stats.scheduled?.percent || 0}
          icon={Clock}
          gradient="from-orange-500 to-red-500"
        />
        <TaskStatCard
          title="Attempted"
          count={stats.attempted?.count || 0}
          percent={stats.attempted?.percent || 0}
          icon={PhoneCallIcon}
          gradient="from-blue-500 to-indigo-500"
        />
        <TaskStatCard
          title="Contacted"
          count={stats.contacted?.count || 0}
          percent={stats.contacted?.percent || 0}
          icon={CheckCircle2}
          gradient="from-green-500 to-emerald-500"
        />
        <TaskStatCard
          title="Not Contacted"
          count={stats.notContacted?.count || 0}
          percent={stats.notContacted?.percent || 0}
          icon={XCircle}
          gradient="from-gray-400 to-gray-500"
        />
        <TaskStatCard
          title="Missed"
          count={stats.missed?.count || 0}
          percent={stats.missed?.percent || 0}
          icon={AlertCircle}
          gradient="from-red-500 to-pink-500"
          alert={(stats.missed?.count || 0) > 0}
        />
      </div>

      {/* Sub-navigation Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden">
        <div className="flex border-b-2 border-gray-200">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 px-6 py-4 font-bold text-sm transition-all ${
              activeTab === 'upcoming'
                ? 'text-white bg-gradient-to-r from-orange-500 to-red-500'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>Upcoming</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('attempted')}
            className={`flex-1 px-6 py-4 font-bold text-sm transition-all ${
              activeTab === 'attempted'
                ? 'text-white bg-gradient-to-r from-orange-500 to-red-500'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" />
              <span>Attempted</span>
            </div>
          </button>
        </div>
      </div>

      {/* Follow-ups Table */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">S.No</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Time</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Call Type</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Member Name</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Mobile</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Staff</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Info</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {isLoading ? (
                <LoadingTable colSpan={9} message="Loading taskboard..." />
              ) : groupedFollowUps.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-100 rounded-full">
                        <Calendar className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">No follow-ups found</p>
                      <p className="text-sm text-gray-400">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                groupedFollowUps.map((group) => (
                  <Fragment key={group.key}>
                    <tr>
                      <td
                        colSpan="9"
                        className="px-5 py-3 text-sm font-bold text-orange-700 bg-gradient-to-r from-orange-50 to-red-50 border-b-2 border-orange-200 uppercase tracking-wide"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{group.label}</span>
                        </div>
                      </td>
                    </tr>
                    {group.items.map((followUp) => (
                      <tr key={followUp._id} className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all">
                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">{followUp.sNo}</td>
                        <td className="px-4 py-4 text-sm text-gray-700 font-medium">{followUp.time || followUp.timeLabel}</td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">
                            {formatCallType(followUp.callType)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-orange-600 uppercase">
                          {followUp.memberName}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 font-mono">{followUp.memberMobile}</td>
                        <td className="px-4 py-4 text-sm">
                          <StatusBadge status={followUp.callStatus} />
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">{followUp.staffName}</td>
                        <td className="px-4 py-4 text-sm">
                          <button className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 text-white flex items-center justify-center hover:from-gray-800 hover:to-black transition-all shadow-sm">
                            <Info className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <ActionDropdown
                            followUp={followUp}
                            onUpdateCall={handleUpdateCallAction}
                            onServiceCard={handleServiceCardAction}
                            onPayments={handlePaymentsAction}
                            onNewInvoice={handleNewInvoiceAction}
                            onConvertToMember={handleConvertToMember}
                          />
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {invoiceModalState.open && (
        <AddInvoiceModal
          isOpen={invoiceModalState.open}
          onClose={(shouldRefresh) => handleCloseInvoiceModal(Boolean(shouldRefresh))}
          defaultMemberId={invoiceModalState.member?.id}
          defaultMemberName={invoiceModalState.member?.name}
          defaultMemberPhone={invoiceModalState.member?.phone}
        />
      )}
    </div>
  );
}

function TaskStatCard({ title, count, percent, icon: Icon, gradient, alert }) {
  return (
    <div className={`group relative rounded-2xl shadow-sm border-2 p-5 transition-all overflow-hidden ${
      alert 
        ? 'bg-red-50 border-red-300 animate-pulse' 
        : 'bg-white border-gray-200 hover:shadow-lg'
    }`}>
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} opacity-10 rounded-full -mr-12 -mt-12 group-hover:opacity-20 transition-opacity`}></div>
      
      <div className="relative">
        <div className={`p-3 bg-gradient-to-br ${gradient} rounded-xl inline-block mb-3 shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">{title}</p>
        <div className="flex items-baseline gap-2">
          <p className={`text-3xl font-black ${alert ? 'text-red-600' : 'text-gray-900'}`}>
            {count}
          </p>
          <p className={`text-lg font-bold ${alert ? 'text-red-600' : 'text-gray-600'}`}>
            ({percent}%)
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusConfig = {
    scheduled: {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      label: 'Scheduled'
    },
    attempted: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      label: 'Attempted'
    },
    contacted: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      label: 'Contacted'
    },
    'not-contacted': {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      label: 'Not Contacted'
    },
    missed: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      label: 'Missed'
    }
  };

  const config = statusConfig[status] || statusConfig.scheduled;

  return (
    <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function ActionDropdown({
  followUp,
  onUpdateCall,
  onServiceCard,
  onPayments,
  onNewInvoice,
  onConvertToMember
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const isEnquiryFollowUp = followUp?.isEnquiry || followUp?.entityType === 'enquiry';

  const quickActions = isEnquiryFollowUp
    ? [
        { label: 'Update Call', icon: PhoneCallIcon, handler: onUpdateCall },
        { label: 'Convert to Member', icon: UserPlus, handler: onConvertToMember }
      ]
    : [
        { label: 'Update Call', icon: PhoneCallIcon, handler: onUpdateCall },
        { label: 'Service Card', icon: CreditCardIcon, handler: onServiceCard },
        { label: 'Payments', icon: Wallet, handler: onPayments },
        { label: 'New Invoice', icon: FileText, handler: onNewInvoice }
      ];

  const closeMenu = () => setIsOpen(false);

  const handleActionClick = (handler) => {
    closeMenu();
    if (typeof handler === 'function') {
      handler(followUp);
    }
  };

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      const menuRect = menuRef.current?.getBoundingClientRect();
      if (!triggerRect || !menuRect) return;

      let top = triggerRect.bottom + 8;
      if (top + menuRect.height > window.innerHeight - 16) {
        top = triggerRect.top - menuRect.height - 8;
        if (top < 16) {
          top = Math.min(triggerRect.bottom + 8, window.innerHeight - menuRect.height - 16);
        }
      }

      let left = triggerRect.right - menuRect.width;
      if (left < 16) left = 16;
      if (left + menuRect.width > window.innerWidth - 16) {
        left = window.innerWidth - menuRect.width - 16;
      }

      setMenuPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 flex items-center gap-2 transition-all"
      >
        <span>Actions</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[80]" onClick={closeMenu} />
            <div
              ref={menuRef}
              style={{ top: menuPosition.top, left: menuPosition.left }}
              className="fixed z-[90] w-56 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="py-2">
                {quickActions.map(({ label, icon: Icon, handler }) => (
                  <button
                    key={label}
                    onClick={() => handleActionClick(handler)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 hover:text-orange-600 transition-all"
                  >
                    <div className="p-1.5 bg-gray-100 rounded-lg group-hover:bg-orange-100">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
