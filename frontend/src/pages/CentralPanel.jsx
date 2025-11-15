import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useDateFilterStore } from '../store/dateFilterStore';
import toast from 'react-hot-toast';
import { Search, Plus, UserCircle, LogOut, Building2, Settings, UserCog, MapPin } from 'lucide-react';
import LoadingPage from '../components/LoadingPage';
import {
  getRevenueData,
  getLeadManagementData,
  getClientsData,
  getCheckInsData,
  getFilterOptions
} from '../api/centralPanel';

export default function CentralPanel() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { dateFilter, setDateFilterValue } = useDateFilterStore();
  const [activeTab, setActiveTab] = useState('revenue');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [filters, setFilters] = useState({
    dateFilter,
    cityFilter: 'all',
    locationFilter: 'all'
  });
  useEffect(() => {
    setFilters((prev) => ({ ...prev, dateFilter }));
  }, [dateFilter]);


  const profileMenuRef = useRef(null);
  const addMenuRef = useRef(null);

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['centralPanelFilterOptions'],
    queryFn: getFilterOptions,
  });

  // Fetch data based on active tab
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['centralPanelRevenue', filters],
    queryFn: () => getRevenueData(filters),
    enabled: activeTab === 'revenue',
  });

  const { data: leadData, isLoading: leadLoading } = useQuery({
    queryKey: ['centralPanelLeads', filters],
    queryFn: () => getLeadManagementData(filters),
    enabled: activeTab === 'lead-management',
  });

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['centralPanelClients', filters],
    queryFn: () => getClientsData(filters),
    enabled: activeTab === 'clients',
  });

  const { data: checkInsData, isLoading: checkInsLoading } = useQuery({
    queryKey: ['centralPanelCheckIns', filters],
    queryFn: () => getCheckInsData(filters),
    enabled: activeTab === 'check-ins',
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) {
        setShowAddMenu(false);
      }
    };

    if (showProfileMenu || showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu, showAddMenu]);

  const handleFilterChange = (key, value) => {
    if (key === 'dateFilter') {
      setDateFilterValue(value);
      setFilters(prev => ({ ...prev, dateFilter: value }));
      return;
    }
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    // Filters are automatically applied via query keys
    toast.success('Filters applied');
  };

  const handleExportExcel = () => {
    toast.success('Export functionality will be implemented');
    // TODO: Implement Excel export
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '₹0';
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const tabs = [
    { id: 'revenue', label: 'Revenue' },
    { id: 'lead-management', label: 'Lead Management' },
    { id: 'clients', label: 'Clients' },
    { id: 'check-ins', label: 'Check-Ins' },
    { id: 'support', label: 'Support' },
    { id: 'feedback', label: 'Feedback' },
  ];

  const renderRevenueTable = () => {
    if (revenueLoading) return <LoadingPage message="Loading revenue data..." fullScreen={false} />;
    if (!revenueData?.success || !revenueData?.data) return <div className="text-center py-8">No data available</div>;

    const data = Array.isArray(revenueData.data) ? revenueData.data : [];
    const totals = revenueData.totals || { sales: 0, collected: 0, pending: 0 };

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-50">
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">S.No</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Business Name</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">City</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Branch</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Sales</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Collected</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Pending</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.businessName || 'N/A'}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.city || 'N/A'}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.branch || 'N/A'}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{formatCurrency(row.sales || 0)}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{formatCurrency(row.collected || 0)}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{formatCurrency(row.pending || 0)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold">
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Total</td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700"></td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700"></td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700"></td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{formatCurrency(totals.sales || 0)}</td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{formatCurrency(totals.collected || 0)}</td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{formatCurrency(totals.pending || 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderLeadManagementTable = () => {
    if (leadLoading) return <LoadingPage message="Loading lead data..." fullScreen={false} />;
    if (!leadData?.success || !leadData?.data) return <div className="text-center py-8">No data available</div>;

    const data = Array.isArray(leadData.data) ? leadData.data : [];
    const totals = leadData.totals || {};

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-50">
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">S.No</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Business Name</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">City</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Branch</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Enquiries Received</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Open</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Converted</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Lost</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Trials Scheduled</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Completed</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Not Attended</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.businessName || 'N/A'}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.city || 'N/A'}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.branch || 'N/A'}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.enquiriesReceived || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.open || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.converted || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.lost || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.trialsScheduled || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.completed || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.notAttended || 0}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold">
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Total</td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700"></td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700"></td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700"></td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{totals.enquiriesReceived || 0}</td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{totals.open || 0}</td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{totals.converted || 0}</td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{totals.lost || 0}</td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{totals.trialsScheduled || 0}</td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{totals.completed || 0}</td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{totals.notAttended || 0}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderClientsTable = () => {
    if (clientsLoading) return <LoadingPage message="Loading clients data..." fullScreen={false} />;
    if (!clientsData?.success || !clientsData?.data) return <div className="text-center py-8">No data available</div>;

    const data = Array.isArray(clientsData.data) ? clientsData.data : [];
    const totals = clientsData.totals || {};

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-50">
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">S.No</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Business Name</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">City</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Branch</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">New Clients</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Value</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Renewals</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Value</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.businessName || 'N/A'}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.city || 'N/A'}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.branch || 'N/A'}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.newClients || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{formatCurrency(row.newClientsValue || 0)}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.renewals || 0}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{formatCurrency(row.renewalsValue || 0)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold">
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Total</td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700"></td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700"></td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700"></td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{totals.newClients || 0}</td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{formatCurrency(totals.newClientsValue || 0)}</td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{totals.renewals || 0}</td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{formatCurrency(totals.renewalsValue || 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderCheckInsTable = () => {
    if (checkInsLoading) return <LoadingPage message="Loading check-ins data..." fullScreen={false} />;
    if (!checkInsData?.success || !checkInsData?.data) return <div className="text-center py-8">No data available</div>;

    const data = Array.isArray(checkInsData.data) ? checkInsData.data : [];
    const totals = checkInsData.totals || { checkIns: 0 };

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-50">
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">S.No</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Business Name</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">City</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Branch</th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Checkins</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.businessName || 'N/A'}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.city || 'N/A'}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.branch || 'N/A'}</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{row.checkIns || 0}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold">
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700"></td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700"></td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700"></td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700"></td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Total {totals.checkIns}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'revenue':
        return renderRevenueTable();
      case 'lead-management':
        return renderLeadManagementTable();
      case 'clients':
        return renderClientsTable();
      case 'check-ins':
        return renderCheckInsTable();
      case 'support':
        return <div className="text-center py-8 text-gray-500">Support section coming soon</div>;
      case 'feedback':
        return <div className="text-center py-8 text-gray-500">Feedback section coming soon</div>;
      default:
        return renderRevenueTable();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Central Panel</h1>
            <div className="flex items-center space-x-3">
              {/* QS Button */}
              <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium text-gray-700 transition-colors">
                QS
              </button>
              
              {/* Search Icon */}
              <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                <Search className="w-5 h-5 text-gray-600" />
              </button>

              {/* Plus Icon Dropdown */}
              <div className="relative" ref={addMenuRef}>
                <button
                  onClick={() => {
                    setShowAddMenu(!showAddMenu);
                    setShowProfileMenu(false);
                  }}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                >
                  <Plus className="w-5 h-5 text-gray-600" />
                </button>
                {showAddMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          navigate('/staff');
                          setShowAddMenu(false);
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <UserCog className="w-4 h-4 mr-3 text-gray-500" />
                        Staff
                      </button>
                      <button
                        onClick={() => {
                          navigate('/branches?action=add');
                          setShowAddMenu(false);
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <MapPin className="w-4 h-4 mr-3 text-gray-500" />
                        Destination
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Icon Dropdown */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => {
                    setShowProfileMenu(!showProfileMenu);
                    setShowAddMenu(false);
                  }}
                  className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center cursor-pointer hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg"
                >
                  <span className="text-white text-sm font-bold">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </button>
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          navigate('/profile');
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <UserCircle className="w-4 h-4 mr-3 text-gray-500" />
                        Admin Profile
                      </button>
                      <button
                        onClick={() => {
                          navigate('/branches');
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Building2 className="w-4 h-4 mr-3 text-gray-500" />
                        Branch Management
                      </button>
                      <button
                        onClick={() => {
                          navigate('/branches?action=add');
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Settings className="w-4 h-4 mr-3 text-gray-500" />
                        Add a Branch
                      </button>
                      <div className="border-t border-gray-200 my-1"></div>
                      <button
                        onClick={() => {
                          logout();
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Breadcrumbs */}
        <div className="mb-4">
          <nav className="text-sm">
            <span className="text-gray-600">Home / </span>
            <span className="text-orange-600 font-medium">Dashboard</span>
          </nav>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center space-x-4">
            <select
              value={filters.dateFilter}
              onChange={(e) => handleFilterChange('dateFilter', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
            </select>

            <select
              value={filters.cityFilter}
              onChange={(e) => handleFilterChange('cityFilter', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Cities</option>
              {filterOptions?.cities && Array.isArray(filterOptions.cities) && filterOptions.cities.map((city, index) => (
                <option key={index} value={city}>{city}</option>
              ))}
            </select>

            <select
              value={filters.locationFilter}
              onChange={(e) => handleFilterChange('locationFilter', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Locations</option>
              {filterOptions?.locations && Array.isArray(filterOptions.locations) && filterOptions.locations.map((location, index) => (
                <option key={index} value={location.id}>{location.name}</option>
              ))}
            </select>

            <button
              onClick={handleApplyFilters}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
            >
              Go
            </button>

            <button
              onClick={handleExportExcel}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Export Excel
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

