import { useState, useRef, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import AddEnquiryModal from './AddEnquiryModal'
import AddMemberModal from './AddMemberModal'
import AddStaffModal from './AddStaffModal'
import AddExpenseModal from './AddExpenseModal'
import AddInvoiceModal from './AddInvoiceModal'
import toast from 'react-hot-toast'
import {
  LayoutDashboard,
  Users,
  FileText,
  UserCog,
  BarChart3,
  Settings,
  LogOut,
  HelpCircle,
  Megaphone,
  Search,
  Plus,
  Send,
  Briefcase,
  DollarSign,
  Receipt,
  Clock,
  UserCircle,
  CreditCard,
  PlusCircle,
  Link as LinkIcon,
  Star,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Calendar,
  ShoppingBag,
  Tag,
  TrendingUp,
  User,
  Users2,
  Archive
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, hasSubmenu: false },
  { name: 'Enquiries', href: '/enquiries', icon: HelpCircle, hasSubmenu: false },
  { name: 'Marketing', href: '/marketing', icon: Megaphone, hasSubmenu: true },
  { name: 'Client', href: '/clients', icon: Users, hasSubmenu: true },
  { name: 'Staff', href: '/staff', icon: UserCog, hasSubmenu: false },
  { name: 'Reports', href: '/reports', icon: BarChart3, hasSubmenu: true },
  { name: 'Setup', href: '/setup', icon: Settings, hasSubmenu: true },
  { name: 'Corporates', href: '/corporates', icon: Briefcase, hasSubmenu: false },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showEnquiryModal, setShowEnquiryModal] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showCheckInMenu, setShowCheckInMenu] = useState(false)
  const [showSendMenu, setShowSendMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showClientMenu, setShowClientMenu] = useState(false)
  const [showReportsMenu, setShowReportsMenu] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState({})
  const [expandedReportCategories, setExpandedReportCategories] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [reportsSearchQuery, setReportsSearchQuery] = useState('')
  const menuRef = useRef(null)
  const checkInMenuRef = useRef(null)
  const sendMenuRef = useRef(null)
  const profileMenuRef = useRef(null)
  const clientMenuRef = useRef(null)
  const reportsMenuRef = useRef(null)

  // Reports categories data
  const reportsCategories = [
    {
      name: 'General Reports',
      icon: FileText,
      expandable: true,
      subItems: [
        { name: 'Biometric Report', path: '/reports/biometric' }
      ]
    },
    {
      name: 'Marketing',
      icon: Megaphone,
      expandable: true,
      subItems: [
        { name: 'Offers', path: '/reports/offers' },
        { name: 'Lead Source', path: '/reports/lead-source' },
        { name: 'Referral', path: '/reports/referral' },
        { name: 'SMS Report', path: '/reports?category=marketing&type=sms-report' },
        { name: 'Business MIS Report', path: '/reports?category=marketing&type=business-mis' },
        { name: 'Marketing MIS Report', path: '/reports?category=marketing&type=marketing-mis' }
      ]
    },
    {
      name: 'Sales',
      icon: DollarSign,
      expandable: true,
      subItems: [
        { name: 'Daily sales (DSR)', path: '/reports?category=sales&type=daily-sales' },
        { name: 'Revenue, Sales Accounting, Effectiv Sale', path: '/reports?category=sales&type=revenue' },
        { name: 'Expected Revenue', path: '/reports?category=sales&type=expected-revenue' },
        { name: 'Revenue vs target', path: '/reports?category=sales&type=revenue-vs-target' },
        { name: 'Revenue month till date', path: '/reports?category=sales&type=revenue-month-till-date' },
        { name: 'Service sale, service type', path: '/reports?category=sales&type=service-sale' },
        { name: 'Registration fee', path: '/reports?category=sales&type=registration-fee' },
        { name: 'Upgrade and cross-sell (3 reports)', path: '/reports?category=sales&type=upgrade-cross-sell' },
        { name: 'Not interested', path: '/reports?category=sales&type=not-interested' },
        { name: 'PT Sales Report', path: '/reports?category=sales&type=pt-sales' },
        { name: 'Corporate sales', path: '/reports?category=sales&type=corporate-sales' }
      ]
    },
    {
      name: 'Finance',
      icon: CreditCard,
      expandable: true,
      subItems: [
        { name: 'View all Invoices', path: '/reports?category=finance&type=invoices' },
        { name: 'Cancellation and refund (3 reports)', path: '/reports?category=finance&type=cancellation-refund' },
        { name: 'Revenue realisation (4 reports)', path: '/reports?category=finance&type=revenue-realisation' },
        { name: 'Revenue VS utilisation (2 reports)', path: '/reports?category=finance&type=revenue-utilisation' },
        { name: 'Collection, POS Payment, Payment', path: '/reports?category=finance&type=collection' },
        { name: 'Reconciliation', path: '/reports?category=finance&type=reconciliation' },
        { name: 'Payment mode', path: '/reports?category=finance&type=payment-mode' },
        { name: 'Advance Payment Received & Utilized', path: '/reports?category=finance&type=advance-payment' }
      ]
    },
    {
      name: 'Client Management',
      icon: Users,
      expandable: true,
      subItems: [
        { name: 'Renewal vs attrition', path: '/reports?category=client&type=renewal-attrition' },
        { name: 'New clients', path: '/reports?category=client&type=new-clients' },
        { name: 'Renewals', path: '/reports?category=client&type=renewals' },
        { name: 'Membership', path: '/reports?category=client&type=membership' },
        { name: 'Membeship & PT expiry', path: '/reports?category=client&type=membership-pt-expiry' },
        { name: 'Members not called', path: '/reports?category=client&type=members-not-called' },
        { name: 'Irregular members', path: '/reports?category=client&type=irregular-members' },
        { name: 'Active/Inactive clients Summary(2 reports)', path: '/reports?category=client&type=active-inactive' },
        { name: 'Multiclub Clients & Multiclub Passport', path: '/reports?category=client&type=multiclub' },
        { name: 'Archived Clients', path: '/reports?category=client&type=archived' },
        { name: 'Freeze & Change Date', path: '/reports?category=client&type=freeze-change-date' },
        { name: 'Attendance heat map', path: '/reports?category=client&type=attendance-heatmap' },
        { name: 'Service transfer', path: '/reports?category=client&type=service-transfer' },
        { name: 'Birthdays & Anniversaries', path: '/reports?category=client&type=birthdays-anniversaries' },
        { name: 'Feedback (2 reports)', path: '/reports?category=client&type=feedback' },
        { name: 'Client Attendance', path: '/reports?category=client&type=attendance' },
        { name: 'Data Hygiene/Additional Information', path: '/reports?category=client&type=data-hygiene' },
        { name: 'Membership retention', path: '/reports?category=client&type=membership-retention' },
        { name: 'View Member checkins', path: '/reports?category=client&type=member-checkins' },
        { name: 'Attendance Register', path: '/reports?category=client&type=attendance-register' }
      ]
    },
    {
      name: 'Staff',
      icon: UserCog,
      expandable: true,
      subItems: [
        { name: 'No Show and usage (2 reports)', path: '/reports?category=staff&type=no-show-usage' },
        { name: 'Class & Session utilisation', path: '/reports?category=staff&type=class-session-utilisation' },
        { name: 'Staff Substitution', path: '/reports?category=staff&type=staff-substitution' },
        { name: 'View & Update staff Checkins', path: '/reports?category=staff&type=staff-checkins' },
        { name: 'Staff Birthday & Anniversaries', path: '/reports?category=staff&type=staff-birthdays' },
        { name: 'Attendance Register', path: '/reports?category=staff&type=attendance-register' }
      ]
    },
    {
      name: 'Expense',
      icon: Receipt,
      expandable: true,
      subItems: [
        { name: 'Expenses (2 reports)', path: '/reports?category=expense&type=expenses' }
      ]
    }
  ]

  // Client segments data
  const clientSegments = [
    {
      name: 'Validity Based',
      icon: Calendar,
      expandable: true,
      subItems: [
        { name: 'All Clients', path: '/clients?filter=validity&type=all' },
        { name: 'Active Clients', path: '/clients?filter=validity&type=active' },
        { name: 'Inactive Clients', path: '/clients?filter=validity&type=inactive' }
      ]
    },
    {
      name: 'Purchase Type Based',
      icon: ShoppingBag,
      expandable: true,
      subItems: [
        { name: 'Monthly', path: '/clients?filter=purchase&type=monthly' },
        { name: 'Quarterly', path: '/clients?filter=purchase&type=quarterly' },
        { name: 'Annual', path: '/clients?filter=purchase&type=annual' },
        { name: 'Pay Per Session', path: '/clients?filter=purchase&type=pay-per-session' }
      ]
    },
    {
      name: 'Service Category',
      icon: Tag,
      expandable: true,
      subItems: [
        { name: 'Gym Membership', path: '/clients?filter=service&category=gym' },
        { name: 'Personal Training', path: '/clients?filter=service&category=pt' },
        { name: 'Group Classes', path: '/clients?filter=service&category=group' },
        { name: 'Yoga', path: '/clients?filter=service&category=yoga' },
        { name: 'Pilates', path: '/clients?filter=service&category=pilates' }
      ]
    },
    {
      name: 'Behaviour Based',
      icon: TrendingUp,
      expandable: true,
      subItems: [
        { name: 'Highly Active', path: '/clients?filter=behaviour&type=highly-active' },
        { name: 'Regular', path: '/clients?filter=behaviour&type=regular' },
        { name: 'Occasional', path: '/clients?filter=behaviour&type=occasional' },
        { name: 'Inactive', path: '/clients?filter=behaviour&type=inactive' }
      ]
    },
    {
      name: 'Gender Based',
      icon: User,
      expandable: true,
      subItems: [
        { name: 'Male', path: '/clients?filter=gender&type=male' },
        { name: 'Female', path: '/clients?filter=gender&type=female' },
        { name: 'Other', path: '/clients?filter=gender&type=other' }
      ]
    },
    {
      name: 'Age Group',
      icon: Users2,
      expandable: false,
      path: '/clients?filter=age-group'
    },
    {
      name: 'Custom Groups',
      icon: Users,
      expandable: true,
      subItems: [
        { name: 'VIP Members', path: '/clients?filter=custom&group=vip' },
        { name: 'Corporate', path: '/clients?filter=custom&group=corporate' },
        { name: 'Referrals', path: '/clients?filter=custom&group=referrals' }
      ]
    },
    {
      name: 'Archived',
      icon: Archive,
      expandable: true,
      subItems: [
        { name: 'Cancelled Members', path: '/clients?filter=archived&type=cancelled' },
        { name: 'Expired Members', path: '/clients?filter=archived&type=expired' }
      ]
    }
  ]

  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev => {
      // Close all other categories and toggle the clicked one
      const newState = {}
      // If the clicked category is already open, close it
      if (prev[categoryName]) {
        return {}
      }
      // Otherwise, open only the clicked category
      newState[categoryName] = true
      return newState
    })
  }

  const toggleReportCategory = (categoryName) => {
    setExpandedReportCategories(prev => {
      // Close all other categories and toggle the clicked one
      const newState = {}
      // If the clicked category is already open, close it
      if (prev[categoryName]) {
        return {}
      }
      // Otherwise, open only the clicked category
      newState[categoryName] = true
      return newState
    })
  }

  const filteredSegments = clientSegments.filter(segment => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return segment.name.toLowerCase().includes(query) ||
           (segment.subItems && segment.subItems.some(item => item.name.toLowerCase().includes(query)))
  })

  const filteredReports = reportsCategories.filter(category => {
    if (!reportsSearchQuery) return true
    const query = reportsSearchQuery.toLowerCase()
    return category.name.toLowerCase().includes(query) ||
           (category.subItems && category.subItems.some(item => item.name.toLowerCase().includes(query)))
  })

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowAddMenu(false)
      }
      if (checkInMenuRef.current && !checkInMenuRef.current.contains(event.target)) {
        setShowCheckInMenu(false)
      }
      if (sendMenuRef.current && !sendMenuRef.current.contains(event.target)) {
        setShowSendMenu(false)
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false)
      }
      if (clientMenuRef.current && !clientMenuRef.current.contains(event.target)) {
        setShowClientMenu(false)
      }
      if (reportsMenuRef.current && !reportsMenuRef.current.contains(event.target)) {
        setShowReportsMenu(false)
      }
    }

    if (showAddMenu || showCheckInMenu || showSendMenu || showProfileMenu || showClientMenu || showReportsMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAddMenu, showCheckInMenu, showSendMenu, showProfileMenu, showClientMenu, showReportsMenu])

  const addMenuOptions = [
    { name: 'Enquiry', icon: HelpCircle, path: '/enquiries', action: 'create' },
    { name: 'Member', icon: Users, path: '/clients', action: 'create' },
    { name: 'Staff', icon: UserCog, path: '/staff', action: 'create' },
    { name: 'Expense', icon: DollarSign, path: '/expenses', action: 'create' },
    { name: 'Invoice', icon: Receipt, path: '/invoices', action: 'create' },
  ]

  const handleAddOption = (option) => {
    setShowAddMenu(false)
    
    // Special handling for modals
    if (option.name === 'Enquiry') {
      setShowEnquiryModal(true)
    } else if (option.name === 'Member') {
      setShowMemberModal(true)
    } else if (option.name === 'Staff') {
      setShowStaffModal(true)
    } else if (option.name === 'Expense') {
      setShowExpenseModal(true)
    } else if (option.name === 'Invoice') {
      setShowInvoiceModal(true)
    } else {
      // Navigate to the page - you can add query params or state for "create" mode
      navigate(option.path)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden max-w-full w-full">
      <div className="flex h-screen overflow-x-hidden max-w-full w-full">
        {/* Sidebar */}
        <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white shadow-lg transition-all duration-300 relative`}>
          {/* Toggle Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-6 bg-white border border-gray-200 rounded-full p-1.5 shadow-md hover:bg-gray-50 transition-colors z-10"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            )}
          </button>

          <div className={`p-6 ${isSidebarCollapsed ? 'px-4' : ''}`}>
            <div className="bg-red-600 text-white p-3 rounded mb-2">
              {isSidebarCollapsed ? (
                <h1 className="text-lg font-bold text-center">A</h1>
              ) : (
                <h1 className="text-xl font-bold">AIRFIT</h1>
              )}
            </div>
            {!isSidebarCollapsed && (
              <p className="text-sm text-gray-600">{user?.organizationName || 'Indiranagar'}</p>
            )}
          </div>
          <nav className={`${isSidebarCollapsed ? 'px-2' : 'px-4'} space-y-1 relative`}>
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
              const isClientItem = item.name === 'Client'
              const isReportsItem = item.name === 'Reports'
              
              if (isClientItem && !isSidebarCollapsed) {
                return (
                  <div key={item.name} className="relative" ref={clientMenuRef}>
                    <button
                      onClick={() => {
                        setShowClientMenu(!showClientMenu)
                        setSearchQuery('')
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-orange-100 text-orange-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center">
                        <Icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    
                    {/* Client Segments Dropdown */}
                    {showClientMenu && (
                      <div className="fixed left-64 top-0 ml-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col" style={{ height: '100vh', maxHeight: '100vh', top: 0 }}>
                        <div className="p-4 border-b border-gray-200 flex-shrink-0 bg-white sticky top-0 z-10">
                          <h3 className="text-lg font-bold text-gray-900 mb-3">Client Segments</h3>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-white" style={{ minHeight: 0 }}>
                          {filteredSegments.map((segment) => {
                            const SegmentIcon = segment.icon
                            const isExpanded = expandedCategories[segment.name]
                            
                            if (!segment.expandable) {
                              return (
                                <button
                                  key={segment.name}
                                  onClick={() => {
                                    navigate(segment.path)
                                    setShowClientMenu(false)
                                  }}
                                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors border-b border-gray-100"
                                >
                                  <div className="flex items-center">
                                    <SegmentIcon className="w-4 h-4 mr-3 text-gray-500" />
                                    {segment.name}
                                  </div>
                                </button>
                              )
                            }
                            
                            return (
                              <div key={segment.name} className="border-b border-gray-100">
                                <button
                                  onClick={() => toggleCategory(segment.name)}
                                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-center">
                                    <SegmentIcon className="w-4 h-4 mr-3 text-gray-500" />
                                    {segment.name}
                                  </div>
                                  <ChevronDown 
                                    className={`w-4 h-4 text-gray-400 transition-transform ${
                                      isExpanded ? 'transform rotate-180' : ''
                                    }`} 
                                  />
                                </button>
                                {isExpanded && segment.subItems && (
                                  <div className="bg-gray-50">
                                    {segment.subItems.map((subItem) => (
                                      <button
                                        key={subItem.name}
                                        onClick={() => {
                                          navigate(subItem.path)
                                          setShowClientMenu(false)
                                        }}
                                        className="w-full flex items-center px-4 py-2.5 pl-12 text-sm text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                                      >
                                        {subItem.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              }

              if (isReportsItem && !isSidebarCollapsed) {
                return (
                  <div key={item.name} className="relative" ref={reportsMenuRef}>
                    <button
                      onClick={() => {
                        setShowReportsMenu(!showReportsMenu)
                        setReportsSearchQuery('')
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-orange-100 text-orange-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center">
                        <Icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    
                    {/* Reports Categories Dropdown */}
                    {showReportsMenu && (
                      <div className="fixed left-64 top-0 ml-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col" style={{ height: '100vh', maxHeight: '100vh', top: 0 }}>
                        <div className="p-4 border-b border-gray-200 flex-shrink-0 bg-white sticky top-0 z-10">
                          <h3 className="text-lg font-bold text-gray-900 mb-3">Reports</h3>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search"
                              value={reportsSearchQuery}
                              onChange={(e) => setReportsSearchQuery(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-white" style={{ minHeight: 0 }}>
                          {filteredReports.map((category) => {
                            const CategoryIcon = category.icon
                            const isExpanded = expandedReportCategories[category.name]
                            
                            if (!category.expandable) {
                              return (
                                <button
                                  key={category.name}
                                  onClick={() => {
                                    navigate(category.path)
                                    setShowReportsMenu(false)
                                  }}
                                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors border-b border-gray-100"
                                >
                                  <div className="flex items-center">
                                    <CategoryIcon className="w-4 h-4 mr-3 text-gray-500" />
                                    {category.name}
                                  </div>
                                </button>
                              )
                            }
                            
                            return (
                              <div key={category.name} className="border-b border-gray-100">
                                <button
                                  onClick={() => toggleReportCategory(category.name)}
                                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-center">
                                    <CategoryIcon className="w-4 h-4 mr-3 text-gray-500" />
                                    {category.name}
                                  </div>
                                  <ChevronDown 
                                    className={`w-4 h-4 text-gray-400 transition-transform ${
                                      isExpanded ? 'transform rotate-180' : ''
                                    }`} 
                                  />
                                </button>
                                {isExpanded && category.subItems && (
                                  <div className="bg-gray-50">
                                    {category.subItems.map((subItem) => (
                                      <button
                                        key={subItem.name}
                                        onClick={() => {
                                          navigate(subItem.path)
                                          setShowReportsMenu(false)
                                        }}
                                        className="w-full flex items-center px-4 py-2.5 pl-12 text-sm text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                                      >
                                        {subItem.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              }
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'} py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-orange-100 text-orange-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title={isSidebarCollapsed ? item.name : ''}
                >
                  <div className="flex items-center">
                    <Icon className={`w-5 h-5 ${isSidebarCollapsed ? '' : 'mr-3'}`} />
                    {!isSidebarCollapsed && item.name}
                  </div>
                  {!isSidebarCollapsed && item.hasSubmenu && (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-x-hidden max-w-full">
          {/* Header Bar */}
          <header className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-8 py-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-6">
              <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-md">
                <span className="font-bold text-lg">AIRFIT</span>
              </div>
              <span className="text-sm font-medium text-gray-300">{user?.organizationName || 'Indiranagar'}</span>
              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                <input
                  type="text"
                  placeholder="Search..."
                  className="bg-transparent text-white placeholder-white/60 text-sm border-none outline-none w-48"
                />
                <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-md text-sm font-semibold transition-all shadow-md hover:shadow-lg">
                  Go
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Search Icon */}
              <div className="relative group">
                <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm border border-white/20">
                  <Search className="w-5 h-5" />
                </button>
                <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  Search
                </span>
              </div>

              {/* Add Menu */}
              <div className="relative group" ref={menuRef}>
                <button 
                  onClick={() => {
                    setShowAddMenu(!showAddMenu)
                    setShowCheckInMenu(false)
                    setShowSendMenu(false)
                    setShowProfileMenu(false)
                  }}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm border border-white/20"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  Add
                </span>
                {showAddMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                    <div className="py-1">
                      {addMenuOptions.map((option) => {
                        const Icon = option.icon
                        return (
                          <button
                            key={option.name}
                            onClick={() => handleAddOption(option)}
                            className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                          >
                            <Icon className="w-4 h-4 mr-3 text-gray-500" />
                            {option.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Check-in Menu */}
              <div className="relative group" ref={checkInMenuRef}>
                <button 
                  onClick={() => {
                    setShowCheckInMenu(!showCheckInMenu)
                    setShowAddMenu(false)
                    setShowSendMenu(false)
                    setShowProfileMenu(false)
                  }}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm border border-white/20"
                >
                  <Clock className="w-5 h-5" />
                </button>
                <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  Check-in
                </span>
                {showCheckInMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          navigate('/attendance?type=staff')
                          setShowCheckInMenu(false)
                        }}
                        className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <UserCog className="w-4 h-4 mr-3 text-gray-500" />
                        Staff Check-in
                      </button>
                      <button
                        onClick={() => {
                          navigate('/attendance?type=client')
                          setShowCheckInMenu(false)
                        }}
                        className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <Users className="w-4 h-4 mr-3 text-gray-500" />
                        Client Check-in
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Send Menu */}
              <div className="relative group" ref={sendMenuRef}>
                <button 
                  onClick={() => {
                    setShowSendMenu(!showSendMenu)
                    setShowAddMenu(false)
                    setShowCheckInMenu(false)
                    setShowProfileMenu(false)
                  }}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm border border-white/20"
                >
                  <Send className="w-5 h-5" />
                </button>
                <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  Send
                </span>
                {showSendMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          // Handle send feedback link
                          navigator.clipboard.writeText(`${window.location.origin}/feedback`)
                          toast.success('Feedback link copied to clipboard')
                          setShowSendMenu(false)
                        }}
                        className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <LinkIcon className="w-4 h-4 mr-3 text-gray-500" />
                        Send Feedback Link
                      </button>
                      <button
                        onClick={() => {
                          // Handle send referral link
                          navigator.clipboard.writeText(`${window.location.origin}/referral`)
                          toast.success('Referral link copied to clipboard')
                          setShowSendMenu(false)
                        }}
                        className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <LinkIcon className="w-4 h-4 mr-3 text-gray-500" />
                        Send Referral Link
                      </button>
                      <button
                        onClick={() => {
                          // Handle send review link
                          navigator.clipboard.writeText(`${window.location.origin}/review`)
                          toast.success('Review link copied to clipboard')
                          setShowSendMenu(false)
                        }}
                        className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <Star className="w-4 h-4 mr-3 text-gray-500" />
                        Send Review Link
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Menu */}
              <div className="relative group" ref={profileMenuRef}>
                <button 
                  onClick={() => {
                    setShowProfileMenu(!showProfileMenu)
                    setShowAddMenu(false)
                    setShowCheckInMenu(false)
                    setShowSendMenu(false)
                  }}
                  className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center cursor-pointer hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg border-2 border-white/20"
                >
                  <span className="text-white text-sm font-bold">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </button>
                <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  Profile
                </span>
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          navigate('/profile')
                          setShowProfileMenu(false)
                        }}
                        className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <UserCircle className="w-4 h-4 mr-3 text-gray-500" />
                        Super Admin Profile
                      </button>
                      <button
                        onClick={() => {
                          navigate('/account-plan')
                          setShowProfileMenu(false)
                        }}
                        className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <CreditCard className="w-4 h-4 mr-3 text-gray-500" />
                        Account Plan
                      </button>
                      <button
                        onClick={() => {
                          navigate('/central-panel')
                          setShowProfileMenu(false)
                        }}
                        className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <Settings className="w-4 h-4 mr-3 text-gray-500" />
                        Central Panel
                      </button>
                      <button
                        onClick={() => {
                          navigate('/branches?action=add')
                          setShowProfileMenu(false)
                        }}
                        className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <PlusCircle className="w-4 h-4 mr-3 text-gray-500" />
                        Add a Branch
                      </button>
                      <div className="border-t border-gray-200 my-1"></div>
                      <button
                        onClick={() => {
                          logout()
                          setShowProfileMenu(false)
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
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 w-full max-w-full">
            <div className="p-6 max-w-full w-full overflow-x-hidden">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* Add Enquiry Modal */}
      <AddEnquiryModal 
        isOpen={showEnquiryModal} 
        onClose={() => setShowEnquiryModal(false)} 
      />

      {/* Add Member Modal */}
      <AddMemberModal 
        isOpen={showMemberModal} 
        onClose={() => setShowMemberModal(false)} 
      />

      {/* Add Staff Modal */}
      <AddStaffModal 
        isOpen={showStaffModal} 
        onClose={() => setShowStaffModal(false)} 
      />

      {/* Add Expense Modal */}
      <AddExpenseModal 
        isOpen={showExpenseModal} 
        onClose={() => setShowExpenseModal(false)} 
      />

      {/* Add Invoice Modal */}
      <AddInvoiceModal 
        isOpen={showInvoiceModal} 
        onClose={() => setShowInvoiceModal(false)} 
      />
    </div>
  )
}

