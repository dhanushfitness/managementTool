import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { Calendar, Download, ChevronDown, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingTable from '../components/LoadingTable';

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

  // Set default dates to today or use date from navigation state
  useEffect(() => {
    // Check if date was passed via navigation state
    const stateDate = location.state?.date;
    if (stateDate) {
      setFromDate(stateDate);
      setToDate(stateDate);
      // Clear the state to prevent using stale date on re-renders
      window.history.replaceState({}, document.title);
    } else {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      setFromDate(dateStr);
      setToDate(dateStr);
    }
  }, [location.state]);

  // Function to navigate to previous day
  const handlePreviousDay = () => {
    if (fromDate) {
      const currentDate = new Date(fromDate);
      currentDate.setDate(currentDate.getDate() - 1);
      const newDateStr = currentDate.toISOString().split('T')[0];
      setFromDate(newDateStr);
      setToDate(newDateStr);
    }
  };

  // Function to navigate to next day
  const handleNextDay = () => {
    if (fromDate) {
      const currentDate = new Date(fromDate);
      currentDate.setDate(currentDate.getDate() + 1);
      const newDateStr = currentDate.toISOString().split('T')[0];
      setFromDate(newDateStr);
      setToDate(newDateStr);
    }
  };

  // Format date for display
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if it's today, tomorrow, or yesterday
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  // Fetch staff list
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff').then(res => res.data),
    enabled: !!token
  });

  // Fetch taskboard stats
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['taskboard-stats', fromDate, toDate, selectedStaff, selectedCallType],
    queryFn: () =>
      api.get('/followups/taskboard/stats', {
        params: {
          fromDate,
          toDate,
          staffId: selectedStaff,
          callType: selectedCallType
        }
      }).then(res => res.data),
    enabled: !!token && !!fromDate && !!toDate
  });

  // Fetch taskboard data
  const { data: taskboardData, isLoading, refetch: refetchTaskboard } = useQuery({
    queryKey: ['taskboard', fromDate, toDate, selectedStaff, selectedCallType, selectedCallStatus, activeTab],
    queryFn: () =>
      api.get('/followups/taskboard', {
        params: {
          fromDate,
          toDate,
          staffId: selectedStaff,
          callType: selectedCallType,
          callStatus: selectedCallStatus,
          tab: activeTab
        }
      }).then(res => res.data),
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
      const response = await api.get('/followups/taskboard/export', {
        params: {
          fromDate,
          toDate,
          staffId: selectedStaff,
          callType: selectedCallType,
          callStatus: selectedCallStatus
        },
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

  const handleStatusChange = (followUpId, newStatus) => {
    updateStatusMutation.mutate({ followUpId, callStatus: newStatus });
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

  return (
    <div className="space-y-6">
      {/* Breadcrumbs and Navigation */}
      <div className="flex items-center justify-between">
        <nav className="text-sm">
          <span className="text-gray-600">Home / Dashboard / </span>
          <span className="text-orange-600 font-medium">Follow-ups</span>
        </nav>
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
          {/* Date Navigation with Arrows */}
          <div className="flex items-center space-x-3 bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200">
            <button
              onClick={handlePreviousDay}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              title="Previous day"
              disabled={!fromDate}
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex flex-col items-center min-w-[140px]">
              <span className="text-xs text-gray-500 font-medium">Date</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatDisplayDate(fromDate)}
              </span>
              <span className="text-xs text-gray-500">{fromDate || 'Select date'}</span>
            </div>
            <button
              onClick={handleNextDay}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              title="Next day"
              disabled={!fromDate}
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Date From */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Date From:</label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setToDate(e.target.value);
                }}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Date To */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">To:</label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setToDate(e.target.value);
                }}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
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
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-sm font-semibold text-gray-600 mb-1 uppercase">SCHEDULED</p>
          <p className="text-2xl font-bold text-orange-600">({stats.scheduled?.count || 0})</p>
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
              ) : followUps.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    No follow-ups found
                  </td>
                </tr>
              ) : (
                followUps.map((followUp) => (
                  <tr key={followUp._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{followUp.sNo}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{followUp.time}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatCallType(followUp.callType)}</td>
                    <td className="px-4 py-3 text-sm text-red-600 font-medium">{followUp.memberName}</td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <span className="text-red-600 font-medium">{followUp.memberMobile}</span>
                        {followUp.memberMobileDate && (
                          <div className="text-xs text-gray-500 mt-1">{followUp.memberMobileDate}</div>
                        )}
                      </div>
                    </td>
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
                        onStatusChange={handleStatusChange}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusConfig = {
    scheduled: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Scheduled' },
    attempted: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Attempted' },
    contacted: { bg: 'bg-green-100', text: 'text-green-800', label: 'Contacted' },
    'not-contacted': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Not Contacted' },
    missed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Missed' }
  };

  const config = statusConfig[status] || statusConfig.scheduled;

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function ActionDropdown({ followUp, onStatusChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const statusOptions = [
    { value: 'scheduled', label: 'Mark as Scheduled' },
    { value: 'attempted', label: 'Mark as Attempted' },
    { value: 'contacted', label: 'Mark as Contacted' },
    { value: 'not-contacted', label: 'Mark as Not Contacted' },
    { value: 'missed', label: 'Mark as Missed' }
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-1"
      >
        <span>Select</span>
        <ChevronDown className="w-4 h-4" />
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="py-1">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onStatusChange(followUp._id, option.value);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

