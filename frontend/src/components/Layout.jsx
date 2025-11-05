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
  ChevronLeft
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
  const menuRef = useRef(null)
  const checkInMenuRef = useRef(null)
  const sendMenuRef = useRef(null)
  const profileMenuRef = useRef(null)

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
    }

    if (showAddMenu || showCheckInMenu || showSendMenu || showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAddMenu, showCheckInMenu, showSendMenu, showProfileMenu])

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
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
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
          <nav className={`${isSidebarCollapsed ? 'px-2' : 'px-4'} space-y-1`}>
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
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
        <div className="flex-1 flex flex-col">
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
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
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
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
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
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
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
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
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
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
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
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div className="p-6">
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

