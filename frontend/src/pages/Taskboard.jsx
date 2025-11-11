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
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingTable from '../components/LoadingTable';
import Breadcrumbs from '../components/Breadcrumbs';
import DateInput from '../components/DateInput';
import CallLogModal from '../components/CallLogModal';
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
  const [callLogModalState, setCallLogModalState] = useState({ open: false, enquiryId: null });
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

  const handleUpdateCallAction = (followUp) => {
    if (followUp.entityType !== 'enquiry' && !followUp.isEnquiry) {
      toast.error('Update call is available only for enquiries.');
      return;
    }
    if (!followUp.entityId) {
      toast.error('Enquiry details are not available for this follow-up.');
      return;
    }
    setCallLogModalState({ open: true, enquiryId: followUp.entityId });
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

  const handleCloseCallLogModal = (shouldRefresh = false) => {
    setCallLogModalState({ open: false, enquiryId: null });
    if (shouldRefresh) {
      refetchTaskboard();
      refetchStats();
    }
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
      'assessment-call': 'Assessment call',
      'follow-up-call': 'Follow-up Call',
      'enquiry-call': 'Enquiry Call',
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

      const key =
        followUp.dateLabel ||
        (timeValue !== null
          ? new Date(timeValue).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : 'No Scheduled Date');

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
      {/* Breadcrumbs and Navigation */}
      <div className="flex items-center justify-between">
        <Breadcrumbs />
        <div className="flex border-b border-gray-200 bg-white rounded-lg shadow-sm">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm transition-colors"
          >
            Snapshot
          </button>
          <button className="px-4 py-2 border-b-2 border-orange-500 text-orange-600 font-medium text-sm bg-orange-50">
            Follow-ups
          </button>
          <button
            onClick={() => navigate('/leaderboard')}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm transition-colors"
          >
            Leaderboards
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Taskboard</h1>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date From */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Date From:</label>
            <DateInput
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
              }}
              className="pl-10 pr-4"
            />
          </div>

          {/* Date To */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">To:</label>
            <DateInput
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
              }}
              className="pl-10 pr-4"
            />
          </div>

          {/* Staff Dropdown */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
            >
              <option value="all">All Staffs</option>
              {staffData?.staff?.map((staff) => (
                <option key={staff._id} value={staff._id}>
                  {staff.firstName} {staff.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Call Type Dropdown */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedCallType}
              onChange={(e) => setSelectedCallType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
            >
              <option value="all">All Calls Types</option>
              <option value="renewal-call">Renewal Call</option>
              <option value="assessment-call">Assessment Call</option>
              <option value="follow-up-call">Follow-up Call</option>
              <option value="enquiry-call">Enquiry Call</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Call Status Dropdown */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedCallStatus}
              onChange={(e) => setSelectedCallStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
            >
              <option value="all">All Calls</option>
              <option value="scheduled">Scheduled</option>
              <option value="attempted">Attempted</option>
              <option value="contacted">Contacted</option>
              <option value="not-contacted">Not Contacted</option>
              <option value="missed">Missed</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 ml-auto">
            <button
              onClick={handleApplyFilters}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              Go
            </button>
            <button
              onClick={handleExportExcel}
              className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary/KPI Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-sm font-semibold text-gray-600 mb-1 uppercase">OVERALL</p>
          <p className="text-2xl font-bold text-black">
            ({stats.total || 0}) {stats.total ? '100%' : '0%'}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-sm font-semibold text-gray-600 mb-1 uppercase">SCHEDULED</p>
          <p className="text-2xl font-bold text-orange-600">
            ({stats.scheduled?.count || 0}) {stats.scheduled?.percent || 0}%
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-sm font-semibold text-gray-600 mb-1 uppercase">ATTEMPTED</p>
          <p className="text-2xl font-bold text-blue-600">
            ({stats.attempted?.count || 0}) {stats.attempted?.percent || 0}%
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-sm font-semibold text-gray-600 mb-1 uppercase">CONTACTED</p>
          <p className="text-2xl font-bold text-green-600">
            ({stats.contacted?.count || 0}) {stats.contacted?.percent || 0}%
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-sm font-semibold text-gray-600 mb-1 uppercase">NOT CONTACTED</p>
          <p className="text-2xl font-bold text-gray-600">
            ({stats.notContacted?.count || 0}) {stats.notContacted?.percent || 0}%
          </p>
        </div>
        <div className={`rounded-lg shadow-sm border p-4 text-center ${
          (stats.missed?.count || 0) > 0 
            ? 'bg-red-50 border-red-200' 
            : 'bg-white border-gray-200'
        }`}>
          <p className="text-sm font-semibold text-gray-600 mb-1 uppercase">MISSED</p>
          <p className={`text-2xl font-bold ${
            (stats.missed?.count || 0) > 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            ({stats.missed?.count || 0}) {stats.missed?.percent || 0}%
          </p>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-6 py-3 font-medium text-sm transition-colors ${
            activeTab === 'upcoming'
              ? 'border-b-2 border-orange-500 text-orange-600 bg-orange-50'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab('attempted')}
          className={`px-6 py-3 font-medium text-sm transition-colors ${
            activeTab === 'attempted'
              ? 'border-b-2 border-orange-500 text-orange-600 bg-orange-50'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Attempted
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">S.No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Call Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Member Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Member Mobile</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Call Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Staff Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Info</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <LoadingTable colSpan={9} message="Loading taskboard..." />
              ) : groupedFollowUps.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    No follow-ups found
                  </td>
                </tr>
              ) : (
                groupedFollowUps.map((group) => (
                  <Fragment key={group.key}>
                    <tr>
                      <td
                        colSpan="9"
                        className="px-4 py-2 text-sm font-semibold text-orange-600 bg-orange-50 border-b border-orange-100 uppercase tracking-wide"
                      >
                        {group.label}
                      </td>
                    </tr>
                    {group.items.map((followUp) => (
                      <tr key={followUp._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">{followUp.sNo}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{followUp.time || followUp.timeLabel}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatCallType(followUp.callType)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-orange-600 uppercase">
                          {followUp.memberName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{followUp.memberMobile}</td>
                        <td className="px-4 py-3 text-sm">
                          <StatusBadge status={followUp.callStatus} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{followUp.staffName}</td>
                        <td className="px-4 py-3 text-sm">
                          <button className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors">
                            <Info className="w-3 h-3" />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <ActionDropdown
                            followUp={followUp}
                            onUpdateCall={handleUpdateCallAction}
                            onServiceCard={handleServiceCardAction}
                            onPayments={handlePaymentsAction}
                            onNewInvoice={handleNewInvoiceAction}
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

      {callLogModalState.open && (
        <CallLogModal
          isOpen={callLogModalState.open}
          enquiryId={callLogModalState.enquiryId}
          onClose={(shouldRefresh) => handleCloseCallLogModal(Boolean(shouldRefresh))}
        />
      )}

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

function StatusBadge({ status }) {
  const statusConfig = {
    scheduled: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border border-orange-200',
      label: 'Scheduled'
    },
    attempted: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border border-blue-200',
      label: 'Attempted'
    },
    contacted: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border border-green-200',
      label: 'Contacted'
    },
    'not-contacted': {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border border-gray-200',
      label: 'Not Contacted'
    },
    missed: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      border: 'border border-red-300',
      label: 'Missed'
    }
  };

  const config = statusConfig[status] || statusConfig.scheduled;

  return (
    <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
}

function ActionDropdown({
  followUp,
  onUpdateCall,
  onServiceCard,
  onPayments,
  onNewInvoice
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const quickActions = [
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
        className="px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
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
              className="fixed z-[90] w-56 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="py-2 space-y-1">
                {quickActions.map(({ label, icon: Icon, handler }) => (
                  <button
                    key={label}
                    onClick={() => handleActionClick(handler)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                  >
                    <span className="flex items-center space-x-3">
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                    </span>
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

