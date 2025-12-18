import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import AddEnquiryModal from './AddEnquiryModal'
import AddMemberModal from './AddMemberModal'
import AddStaffModal from './AddStaffModal'
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
  Archive,
  Dumbbell,
  Building2,
  X,
  Mail,
  Phone as PhoneIcon
} from 'lucide-react'
import { setupSections } from '../data/setupSections'
import { getOrganizationDetails } from '../api/organization'
import api from '../api/axios'

const resolveAssetUrl = (path) => {
  if (!path) return null
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) return path

  // Get the backend base URL (without /api prefix for static files)
  const getBackendBaseUrl = () => {
    // Try environment variables first
    const envBase = [
      import.meta.env.VITE_BACKEND_URL,
      import.meta.env.VITE_API_ORIGIN
    ].find((value) => typeof value === 'string' && /^https?:\/\//i.test(value))
    
    if (envBase) {
      // Remove /api suffix if present
      return envBase.replace(/\/api\/?$/, '')
    }

    // Get from API instance and remove /api suffix
    if (typeof window !== 'undefined' && api?.defaults?.baseURL) {
      const apiBase = api.defaults.baseURL
      // If it's a relative path like /api, get the origin
      if (apiBase.startsWith('/')) {
        return window.location.origin
      }
      // If it's a full URL, remove /api suffix
      return apiBase.replace(/\/api\/?$/, '')
    }

    // Default fallback for development
    if (typeof window !== 'undefined') {
      const { origin } = window.location
      if (origin.includes('localhost:5173') || origin.includes('localhost:3000')) {
        return 'http://localhost:5000'
      }
      return origin
    }
    
    return ''
  }

  const backendBase = getBackendBaseUrl()

  try {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    // Static files are served directly from backend root, not under /api
    if (normalizedPath.startsWith('/uploads')) {
      return backendBase ? `${backendBase}${normalizedPath}` : normalizedPath
    }
    return new URL(normalizedPath, backendBase || undefined).href
  } catch (error) {
    console.error('Error resolving asset URL:', error, { path, backendBase })
    // Fallback: return path as-is if it starts with /
    return path.startsWith('/') ? path : `/${path}`
  }
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, hasSubmenu: false },
  { name: 'Enquiries', href: '/enquiries', icon: HelpCircle, hasSubmenu: false },
  // { name: 'Marketing', href: '/marketing', icon: Megaphone, hasSubmenu: true },
  { name: 'Client', href: '/clients', icon: Users, hasSubmenu: true },
  { name: 'Staff', href: '/staff', icon: UserCog, hasSubmenu: false },
  // { name: 'Reports', href: '/reports', icon: BarChart3, hasSubmenu: true },
  { name: 'Setup', href: '/setup', icon: Settings, hasSubmenu: true },
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
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showCheckInMenu, setShowCheckInMenu] = useState(false)
  const [showSendMenu, setShowSendMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showClientMenu, setShowClientMenu] = useState(false)
  const [showReportsMenu, setShowReportsMenu] = useState(false)
  const [showSetupMenu, setShowSetupMenu] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState({})
  const [expandedReportCategories, setExpandedReportCategories] = useState({})
  const [expandedSetupCategories, setExpandedSetupCategories] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [reportsSearchQuery, setReportsSearchQuery] = useState('')
  const [setupSearchQuery, setSetupSearchQuery] = useState('')
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [memberSearchType, setMemberSearchType] = useState('member-name')
  const [memberSearchResults, setMemberSearchResults] = useState([])
  const [showMemberSearchResults, setShowMemberSearchResults] = useState(false)
  const memberSearchRef = useRef(null)
  const [isLogoBroken, setIsLogoBroken] = useState(false)
  const [logoTimestamp, setLogoTimestamp] = useState(Date.now())
  const menuRef = useRef(null)
  const checkInMenuRef = useRef(null)
  const sendMenuRef = useRef(null)
  const profileMenuRef = useRef(null)
  const clientMenuRef = useRef(null)
  const reportsMenuRef = useRef(null)
  const setupMenuRef = useRef(null)

  const { data: organizationResponse, refetch: refetchOrganization } = useQuery({
    queryKey: ['organization-details'],
    queryFn: getOrganizationDetails,
    enabled: Boolean(user?.organizationId),
    staleTime: 0, // Always refetch on mount to get latest logo
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true // Always refetch when component mounts
  })

  const organization = organizationResponse?.organization
  // If logo is already a full URL, use it directly; otherwise resolve it
  const organizationLogoUrl = organization?.logo?.startsWith('http') 
    ? organization.logo 
    : resolveAssetUrl(organization?.logo)
  const organizationDisplayName = organization?.name || user?.organizationName || 'Indiranagar'

  // Debug logging
  useEffect(() => {
    console.log('🔍 Organization Logo Debug:', {
      hasOrganization: !!organization,
      rawLogoPath: organization?.logo,
      resolvedLogoUrl: organizationLogoUrl,
      isLogoBroken,
      organizationName: organizationDisplayName,
      willShowLogo: !!(organizationLogoUrl && !isLogoBroken)
    })
  }, [organization?.logo, organizationLogoUrl, organizationDisplayName, isLogoBroken])

  useEffect(() => {
    // Reset broken state when logo URL changes or organization data loads
    if (organizationLogoUrl) {
      console.log('🔄 Resetting logo broken state, URL:', organizationLogoUrl)
      setIsLogoBroken(false)
      // Update timestamp when logo URL changes to force refresh
      setLogoTimestamp(Date.now())
    } else if (organization && !organization.logo) {
      // If organization exists but no logo, show default icon
      setIsLogoBroken(true)
    }
  }, [organizationLogoUrl, organization])

  // Listen for logo update events and refetch organization details
  useEffect(() => {
    const handleLogoUpdate = () => {
      refetchOrganization()
      // Force logo refresh by updating timestamp
      setLogoTimestamp(Date.now())
      setIsLogoBroken(false)
    }

    window.addEventListener('organization-logo-updated', handleLogoUpdate)
    return () => {
      window.removeEventListener('organization-logo-updated', handleLogoUpdate)
    }
  }, [refetchOrganization])

  // Reports categories data
  const reportsCategories = [
    // {
    //   name: 'General Reports',
    //   icon: FileText,
    //   expandable: true,
    //   subItems: [
    //     { name: 'Biometric Report', path: '/reports/biometric' }
    //   ]
    // },
    // {
    //   name: 'Marketing',
    //   icon: Megaphone,
    //   expandable: true,
    //   subItems: [
    //     { name: 'Offers', path: '/reports/offers' },
    //     { name: 'Lead Source', path: '/reports/lead-source' },
    //     { name: 'Referral', path: '/reports/referral' },
    //     { name: 'SMS Report', path: '/reports/sms' },
    //     { name: 'Business MIS Report', path: '/reports/business-mis' },
    //     { name: 'Marketing MIS Report', path: '/reports/marketing-mis' }
    //   ]
    // },
    // {
    //   name: 'Sales',
    //   icon: DollarSign,
    //   expandable: true,
    //   subItems: [
    //     { name: 'DSR Report', path: '/reports/sales/dsr' },
    //     { name: 'Revenue', path: '/reports/sales/revenue' },
    //     { name: 'Revenue - Month Till Date', path: '/reports/sales/revenue-month-till-date' },
    //     { name: 'Service Sales', path: '/reports/sales/service-sales' },
    //     { name: 'Service Type', path: '/reports/sales/service-type' },
    //     { name: 'Enquiry Conversion Report', path: '/reports/sales/enquiry-conversion' }
    //   ]
    // },
    // {
    //   name: 'Finance',
    //   icon: CreditCard,
    //   expandable: true,
    //   subItems: [
    //     { name: 'All Invoices', path: '/reports/finance/all-invoices' },
    //     { name: 'Paid Invoices', path: '/reports/finance/paid-invoices' },
    //     { name: 'Receipts', path: '/reports/finance/receipts' },
    //     { name: 'Pending Collections', path: '/reports/finance/pending-collections' },
    //     { name: 'Cancelled Invoices', path: '/reports/finance/cancelled-invoices' },
    //     { name: 'Refund Report', path: '/reports/finance/refund-report' },
    //     { name: 'Effective Sales (Accounting)', path: '/reports/finance/effective-sales-accounting' },
    //     { name: 'Revenue Realization', path: '/reports/finance/revenue-realization' },
    //     { name: 'Revenue Realization (Base Value)', path: '/reports/finance/revenue-realization-base-value' },
    //     { name: 'Collection Report', path: '/reports/finance/collection' },
    //     { name: 'Cashflow Statement', path: '/reports/finance/cashflow-statement' },
    //     { name: 'Payment Mode Report', path: '/reports/finance/payment-mode' },
    //     { name: 'Backdated bills-Service Sales', path: '/reports/finance/backdated-bills' },
    //     { name: 'Discount Report', path: '/reports/finance/discount' }
    //   ]
    // },
    // {
    //   name: 'Client Management',
    //   icon: Users,
    //   expandable: true,
    //   subItems: [
    //     { name: 'Upgrade & Cross-Sell', path: '/reports/client-management/upgrade' },
    //     { name: 'Transfer & Extension', path: '/reports/client-management/service-transfer' },
    //     { name: 'Freeze and Date Change', path: '/reports/client-management/freeze-and-date-change' }
    //   ]
    // },
    // {
    //   name: 'Staff',
    //   icon: UserCog,
    //   expandable: true,
    //   subItems: [
    //     { name: 'Staff Check-Ins', path: '/reports/staff/check-ins' },
    //     { name: 'Staff Leave', path: '/reports/staff/leave' },
    //     { name: 'Attendance Register', path: '/reports/staff/attendance-register' },
    //     { name: 'Staff Birthday Report', path: '/reports/staff/birthday' },
    //     { name: 'Call Log Report', path: '/reports/staff/call-log' }
    //   ]
    // },
    // {
    //   name: 'Expense',
    //   icon: Receipt,
    //   expandable: true,
    //   subItems: [
    //     { name: 'Expense Summary', path: '/reports/expense/summary' }
    //   ]
    // }
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
    }
    // {
    //   name: 'Purchase Type Based',
    //   icon: ShoppingBag,
    //   expandable: true,
    //   subItems: [
    //     { name: 'Monthly', path: '/clients?filter=purchase&type=monthly' },
    //     { name: 'Quarterly', path: '/clients?filter=purchase&type=quarterly' },
    //     { name: 'Annual', path: '/clients?filter=purchase&type=annual' },
    //     { name: 'Pay Per Session', path: '/clients?filter=purchase&type=pay-per-session' }
    //   ]
    // },
    // {
    //   name: 'Service Category',
    //   icon: Tag,
    //   expandable: true,
    //   subItems: [
    //     { name: 'Gym Membership', path: '/clients?filter=service&category=gym' },
    //     { name: 'Personal Training', path: '/clients?filter=service&category=pt' },
    //     { name: 'Group Classes', path: '/clients?filter=service&category=group' },
    //     { name: 'Yoga', path: '/clients?filter=service&category=yoga' },
    //     { name: 'Pilates', path: '/clients?filter=service&category=pilates' }
    //   ]
    // },
    // {
    //   name: 'Behaviour Based',
    //   icon: TrendingUp,
    //   expandable: true,
    //   subItems: [
    //     { name: 'Highly Active', path: '/clients?filter=behaviour&type=highly-active' },
    //     { name: 'Regular', path: '/clients?filter=behaviour&type=regular' },
    //     { name: 'Occasional', path: '/clients?filter=behaviour&type=occasional' },
    //     { name: 'Inactive', path: '/clients?filter=behaviour&type=inactive' }
    //   ]
    // },
    // {
    //   name: 'Gender Based',
    //   icon: User,
    //   expandable: true,
    //   subItems: [
    //     { name: 'Male', path: '/clients?filter=gender&type=male' },
    //     { name: 'Female', path: '/clients?filter=gender&type=female' },
    //     { name: 'Other', path: '/clients?filter=gender&type=other' }
    //   ]
    // },
    // {
    //   name: 'Age Group',
    //   icon: Users2,
    //   expandable: false,
    //   path: '/clients?filter=age-group'
    // },
    // {
    //   name: 'Custom Groups',
    //   icon: Users,
    //   expandable: true,
    //   subItems: [
    //     { name: 'VIP Members', path: '/clients?filter=custom&group=vip' },
    //     { name: 'Corporate', path: '/clients?filter=custom&group=corporate' },
    //     { name: 'Referrals', path: '/clients?filter=custom&group=referrals' }
    //   ]
    // },
    // {
    //   name: 'Archived',
    //   icon: Archive,
    //   expandable: true,
    //   subItems: [
    //     { name: 'Cancelled Members', path: '/clients?filter=archived&type=cancelled' },
    //     { name: 'Expired Members', path: '/clients?filter=archived&type=expired' }
    //   ]
    // }
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

  const toggleSetupCategory = (categoryId) => {
    setExpandedSetupCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  const handleSetupItemAction = (section, item) => {
    if (item.comingSoon) return

    if (item.path) {
      navigate(item.path)
    } else if (typeof item.onClick === 'function') {
      item.onClick(navigate)
    } else {
      navigate('/setup', {
        state: {
          sectionId: section.id,
          itemId: item.id
        }
      })
    }

    setShowSetupMenu(false)
    setExpandedSetupCategories({})
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

  const filteredSetupSections = setupSections.filter(section => {
    if (!setupSearchQuery) return true
    const query = setupSearchQuery.toLowerCase()
    const matchesSection = section.title.toLowerCase().includes(query)
    const matchesItem = section.items.some(item => item.title.toLowerCase().includes(query))
    return matchesSection || matchesItem
  })

  // Handle member search
  const handleMemberSearch = async () => {
    if (!memberSearchQuery.trim()) {
      setShowMemberSearchResults(false)
      setMemberSearchResults([])
      return
    }

    try {
      const response = await api.get('/members/search', {
        params: { 
          q: memberSearchQuery.trim(),
          searchType: memberSearchType
        }
      })
      console.log('Search response:', response.data)
      setMemberSearchResults(response.data?.members || [])
      setShowMemberSearchResults(response.data?.members?.length > 0)
    } catch (error) {
      console.error('Search error:', error)
      console.error('Error details:', error.response?.data)
      setMemberSearchResults([])
      setShowMemberSearchResults(false)
      toast.error('Failed to search members')
    }
  }

  const handleMemberResultClick = (member) => {
    navigate(`/clients/${member._id}`)
    setShowMemberSearchResults(false)
    setMemberSearchQuery('')
    setMemberSearchResults([])
  }

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
      if (setupMenuRef.current && !setupMenuRef.current.contains(event.target)) {
        setShowSetupMenu(false)
      }
      if (memberSearchRef.current && !memberSearchRef.current.contains(event.target)) {
        setShowMemberSearchResults(false)
      }
    }

    if (showAddMenu || showCheckInMenu || showSendMenu || showProfileMenu || showClientMenu || showReportsMenu || showSetupMenu || showMemberSearchResults) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAddMenu, showCheckInMenu, showSendMenu, showProfileMenu, showClientMenu, showReportsMenu, showSetupMenu, showMemberSearchResults])

  const addMenuOptions = [
    { name: 'Enquiry', icon: HelpCircle, path: '/enquiries', action: 'create' },
    { name: 'Member', icon: Users, path: '/clients', action: 'create' },
    { name: 'Staff', icon: UserCog, path: '/staff', action: 'create' },
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

          <div className={`p-6 ${isSidebarCollapsed ? 'px-3' : 'pb-4'} border-b border-gray-100`}>
            <div className="mb-3 flex items-center justify-center">
              {organizationLogoUrl && !isLogoBroken ? (
                <img
                  src={organizationLogoUrl}
                  alt={`${organizationDisplayName} logo`}
                  className="max-w-full h-auto object-contain"
                  style={{ maxHeight: isSidebarCollapsed ? '56px' : '96px' }}
                  onError={(e) => {
                    console.error('❌ Logo failed to load:', {
                      src: e.target.src,
                      originalPath: organization?.logo,
                      resolvedUrl: organizationLogoUrl,
                      error: e.type
                    })
                    setIsLogoBroken(true)
                  }}
                  onLoad={(e) => {
                    console.log('✅ Logo loaded successfully:', {
                      src: e.target.src,
                      originalPath: organization?.logo,
                      naturalWidth: e.target.naturalWidth,
                      naturalHeight: e.target.naturalHeight
                    })
                    setIsLogoBroken(false)
                  }}
                />
              ) : (
                <div className={`flex items-center justify-center ${
                  isSidebarCollapsed ? 'h-14 w-14' : 'h-24 w-24'
                } rounded-full bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 text-white shadow-lg hover:shadow-xl transition-all ring-4 ring-orange-100`}>
                  <User 
                    className={`${isSidebarCollapsed ? 'w-7 h-7' : 'w-11 h-11'} text-white drop-shadow-sm`}
                    strokeWidth={2.5}
                  />
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <div className="text-center">
                <p className="text-xs font-bold text-gray-800 uppercase tracking-wide truncate px-2">
                  {organizationDisplayName}
                </p>
              </div>
            )}
          </div>
          <nav className={`${isSidebarCollapsed ? 'px-2' : 'px-3'} py-4 space-y-1 relative`}>
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
              const isClientItem = item.name === 'Client'
              const isReportsItem = item.name === 'Reports'
              const isSetupItem = item.name === 'Setup'
              
              if (isClientItem) {
                return (
                  <div key={item.name} className="relative" ref={clientMenuRef}>
                    <button
                      onClick={() => {
                        setShowClientMenu(!showClientMenu)
                        setSearchQuery('')
                        setShowReportsMenu(false)
                        setShowSetupMenu(false)
                        setShowAddMenu(false)
                        setShowCheckInMenu(false)
                        setShowSendMenu(false)
                        setShowProfileMenu(false)
                      }}
                      className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl transition-all group ${
                        isActive
                          ? 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 font-semibold shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50 hover:translate-x-0.5'
                      }`}
                      title={isSidebarCollapsed ? item.name : ''}
                    >
                      <div className="flex items-center">
                        <Icon className={`w-5 h-5 ${isSidebarCollapsed ? '' : 'mr-3'} ${isActive ? 'text-orange-600' : 'text-gray-500 group-hover:text-orange-500'}`} />
                        {!isSidebarCollapsed && <span className={isActive ? 'text-orange-700' : ''}>{item.name}</span>}
                      </div>
                      {!isSidebarCollapsed && <ChevronRight className="w-4 h-4" />}
                    </button>
                    
                    {/* Client Segments Dropdown */}
                    {showClientMenu && (
                      <div className={`fixed ${isSidebarCollapsed ? 'left-20' : 'left-64'} top-0 ml-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col`} style={{ height: '100vh', maxHeight: '100vh', top: 0 }}>
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

              if (isReportsItem) {
                return (
                  <div key={item.name} className="relative" ref={reportsMenuRef}>
                    <button
                      onClick={() => {
                        setShowReportsMenu(!showReportsMenu)
                        setReportsSearchQuery('')
                        setShowClientMenu(false)
                        setShowSetupMenu(false)
                        setShowAddMenu(false)
                        setShowCheckInMenu(false)
                        setShowSendMenu(false)
                        setShowProfileMenu(false)
                      }}
                      className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl transition-all group ${
                        isActive
                          ? 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 font-semibold shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50 hover:translate-x-0.5'
                      }`}
                      title={isSidebarCollapsed ? item.name : ''}
                    >
                      <div className="flex items-center">
                        <Icon className={`w-5 h-5 ${isSidebarCollapsed ? '' : 'mr-3'} ${isActive ? 'text-orange-600' : 'text-gray-500 group-hover:text-orange-500'}`} />
                        {!isSidebarCollapsed && <span className={isActive ? 'text-orange-700' : ''}>{item.name}</span>}
                      </div>
                      {!isSidebarCollapsed && <ChevronRight className="w-4 h-4" />}
                    </button>
                    
                    {/* Reports Categories Dropdown */}
                    {showReportsMenu && (
                      <div className={`fixed ${isSidebarCollapsed ? 'left-20' : 'left-64'} top-0 ml-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col`} style={{ height: '100vh', maxHeight: '100vh', top: 0 }}>
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

              if (isSetupItem) {
                return (
                  <div key={item.name} className="relative" ref={setupMenuRef}>
                    <button
                      onClick={() => {
                        setShowSetupMenu(!showSetupMenu)
                        setSetupSearchQuery('')
                        setShowClientMenu(false)
                        setShowReportsMenu(false)
                        setShowAddMenu(false)
                        setShowCheckInMenu(false)
                        setShowSendMenu(false)
                        setShowProfileMenu(false)
                      }}
                      className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl transition-all group ${
                        isActive
                          ? 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 font-semibold shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50 hover:translate-x-0.5'
                      }`}
                      title={isSidebarCollapsed ? item.name : ''}
                    >
                      <div className="flex items-center">
                        <Icon className={`w-5 h-5 ${isSidebarCollapsed ? '' : 'mr-3'} ${isActive ? 'text-orange-600' : 'text-gray-500 group-hover:text-orange-500'}`} />
                        {!isSidebarCollapsed && <span className={isActive ? 'text-orange-700' : ''}>{item.name}</span>}
                      </div>
                      {!isSidebarCollapsed && <ChevronRight className="w-4 h-4" />}
                    </button>

                    {showSetupMenu && (
                      <div className={`fixed ${isSidebarCollapsed ? 'left-20' : 'left-64'} top-0 ml-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col`} style={{ height: '100vh', maxHeight: '100vh', top: 0 }}>
                        <div className="p-4 border-b border-gray-200 flex-shrink-0 bg-white sticky top-0 z-10">
                          <h3 className="text-lg font-bold text-gray-900 mb-3">Setup</h3>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search"
                              value={setupSearchQuery}
                              onChange={(e) => setSetupSearchQuery(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-white" style={{ minHeight: 0 }}>
                          {filteredSetupSections.length === 0 ? (
                            <div className="p-6 text-center text-sm text-gray-500">
                              No setup categories match “{setupSearchQuery.trim()}”.
                            </div>
                          ) : (
                            filteredSetupSections.map((section) => {
                              const SectionIcon = section.icon
                              const isExpanded = !!expandedSetupCategories[section.id]

                              return (
                                <div key={section.id} className="border-b border-gray-100">
                                  <button
                                    onClick={() => toggleSetupCategory(section.id)}
                                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                  >
                                    <div className="flex items-center text-left">
                                      {SectionIcon && <SectionIcon className="w-4 h-4 mr-3 text-gray-500" />}
                                      <span className="font-medium text-gray-800">{section.title}</span>
                                    </div>
                                    <ChevronDown
                                      className={`w-4 h-4 text-gray-400 transition-transform ${
                                        isExpanded ? 'transform rotate-180' : ''
                                      }`}
                                    />
                                  </button>
                                  {isExpanded && (
                                    <div className="bg-gray-50">
                                      {section.items.map((itemOption) => (
                                        <button
                                          key={itemOption.id}
                                          onClick={() => handleSetupItemAction(section, itemOption)}
                                          disabled={itemOption.comingSoon}
                                          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                                            itemOption.comingSoon
                                              ? 'text-gray-400 cursor-not-allowed'
                                              : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                                          }`}
                                        >
                                          <span className="font-medium text-left">{itemOption.title}</span>
                                          <ChevronRight className={`h-4 w-4 ${itemOption.comingSoon ? 'text-gray-300' : 'text-orange-400'}`} />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          )}
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
          <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-2xl" ref={memberSearchRef}>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm hover:shadow-md transition-all focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500">
                  <Search className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                  <div className="relative flex-shrink-0">
                    <select
                      value={memberSearchType}
                      onChange={(e) => setMemberSearchType(e.target.value)}
                      className="bg-transparent text-gray-700 text-sm border-none outline-none cursor-pointer appearance-none pr-6 focus:outline-none font-medium"
                    >
                      <option value="member-name">Member Name</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone Number</option>
                      <option value="member-id">Member ID</option>
                    </select>
                    <ChevronDown className="absolute right-0 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="w-px h-6 bg-gray-300 mx-3"></div>
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleMemberSearch()
                      }
                    }}
                    className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 text-sm border-none outline-none"
                  />
                  {memberSearchQuery && (
                    <button
                      onClick={() => {
                        setMemberSearchQuery('')
                        setMemberSearchResults([])
                        setShowMemberSearchResults(false)
                      }}
                      className="ml-2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                  <button
                    onClick={handleMemberSearch}
                    className="ml-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-5 py-1.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                  >
                    Search
                  </button>
                </div>
                
                {/* Search Results Dropdown */}
                {showMemberSearchResults && memberSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-4 py-3 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                        <Users className="w-4 h-4 mr-2 text-orange-600" />
                        Search Results ({memberSearchResults.length})
                      </h3>
                    </div>
                    <div className="py-2">
                      {memberSearchResults.map((member, index) => {
                        const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim()
                        const email = member.email || ''
                        const phone = member.phone || ''
                        
                        return (
                          <button
                            key={member._id || index}
                            onClick={() => handleMemberResultClick(member)}
                            className={`w-full text-left px-4 py-3 text-sm hover:bg-orange-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                              index === 0 ? 'bg-orange-50' : 'bg-white'
                            }`}
                          >
                            <div className="font-medium text-gray-900">{fullName || 'Unnamed Member'}</div>
                            <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                              {email && <div className="flex items-center"><Mail className="w-3 h-3 mr-1" />{email}</div>}
                              {phone && <div className="flex items-center"><PhoneIcon className="w-3 h-3 mr-1" />{phone}</div>}
                              {member.memberId && <div className="flex items-center"><Tag className="w-3 h-3 mr-1" />{member.memberId}</div>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Add Menu */}
              <div className="relative group" ref={menuRef}>
                <button 
                  onClick={() => {
                    setShowAddMenu(!showAddMenu)
                    setShowCheckInMenu(false)
                    setShowSendMenu(false)
                    setShowProfileMenu(false)
                    setShowClientMenu(false)
                    setShowReportsMenu(false)
                    setShowSetupMenu(false)
                  }}
                  className="p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all border border-gray-200 text-gray-700 hover:text-orange-600"
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
                {/* <button 
                  onClick={() => {
                    setShowCheckInMenu(!showCheckInMenu)
                    setShowAddMenu(false)
                    setShowSendMenu(false)
                    setShowProfileMenu(false)
                    setShowClientMenu(false)
                    setShowReportsMenu(false)
                    setShowSetupMenu(false)
                  }}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm border border-white/20"
                >
                  <Clock className="w-5 h-5" />
                </button> */}
                {/* <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  Check-in
                </span> */}
                {/* {showCheckInMenu && (
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
                )} */}
              </div>

              {/* Send Menu */}
              {/* <div className="relative group" ref={sendMenuRef}>
                <button 
                  onClick={() => {
                    setShowSendMenu(!showSendMenu)
                    setShowAddMenu(false)
                    setShowCheckInMenu(false)
                    setShowProfileMenu(false)
                    setShowClientMenu(false)
                    setShowReportsMenu(false)
                    setShowSetupMenu(false)
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
              </div> */}

              {/* Profile Menu */}
              <div className="relative group" ref={profileMenuRef}>
                <button 
                  onClick={() => {
                    setShowProfileMenu(!showProfileMenu)
                    setShowAddMenu(false)
                    setShowCheckInMenu(false)
                    setShowSendMenu(false)
                    setShowClientMenu(false)
                    setShowReportsMenu(false)
                    setShowSetupMenu(false)
                  }}
                  className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center cursor-pointer hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg"
                >
                  <span className="text-white text-sm font-bold uppercase">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </button>
                {showProfileMenu && (
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
                    {/* Profile Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Account</p>
                      <p className="text-sm font-bold text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">{user?.email}</p>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="py-2">
                      <button
                        onClick={() => {
                          navigate('/profile')
                          setShowProfileMenu(false)
                        }}
                        className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <UserCircle className="w-4 h-4 mr-3 text-gray-400" />
                        <span className="uppercase tracking-wide">Profile</span>
                      </button>
                      
                      <div className="border-t border-gray-100 my-2"></div>
                      
                      <button
                        onClick={() => {
                          logout()
                          setShowProfileMenu(false)
                          navigate('/login', { replace: true })
                        }}
                        className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        <span className="uppercase tracking-wide">Log Out</span>
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

      {/* Add Invoice Modal */}
      <AddInvoiceModal 
        isOpen={showInvoiceModal} 
        onClose={() => setShowInvoiceModal(false)} 
      />
    </div>
  )
}

