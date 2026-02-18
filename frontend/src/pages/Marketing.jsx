import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Mail, MessageSquare, Phone, Tag, Send, Users, Megaphone, Sparkles, Upload, Loader2, CheckCircle, AlertCircle, Filter, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { getFilteredRecipients, sendEmail, sendSMS, sendWhatsApp } from '../api/marketing'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Chip,
  Box,
  Typography,
  IconButton,
  Tooltip
} from '@mui/material'

export default function Marketing() {
  const [activeTab, setActiveTab] = useState('communication')
  const [communicationType, setCommunicationType] = useState('email')
  const [module, setModule] = useState('member')
  const [filters, setFilters] = useState({
    validity: 'all',
    gender: 'all',
    ageGroup: '',
    leadSource: '',
    serviceCategory: '',
    service: '',
    serviceVariation: '',
    behaviour: false,
    avgLifetimeValue: false,
    membershipExpiryFrom: '',
    membershipExpiryTo: ''
  })
  const [recipients, setRecipients] = useState([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [sending, setSending] = useState(false)
  
  // Collapsible filter sections
  const [openSections, setOpenSections] = useState({
    validity: true,
    gender: true,
    ageGroup: false,
    leadSource: false,
    serviceCategory: false,
    service: false,
    membershipExpiry: false
  })
  
  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Form states
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [smsMessage, setSmsMessage] = useState('')
  const [whatsappMessage, setWhatsappMessage] = useState('')
  const [sendCopyToMe, setSendCopyToMe] = useState(false)

  // Fetch recipients when filters change
  const fetchRecipients = async () => {
    try {
      setLoadingRecipients(true)
      const response = await getFilteredRecipients({ module, filters })
      setRecipients(response.data.recipients || [])
      toast.success(`Found ${response.data.total} recipients`)
    } catch (error) {
      console.error('Error fetching recipients:', error)
      toast.error('Failed to fetch recipients')
      setRecipients([])
    } finally {
      setLoadingRecipients(false)
    }
  }

  const handleSendEmail = async () => {
    if (!emailSubject || !emailMessage) {
      toast.error('Please fill in subject and message')
      return
    }

    if (recipients.length === 0) {
      toast.error('No recipients selected. Please apply filters first.')
      return
    }

    try {
      setSending(true)
      const response = await sendEmail({
        module,
        filters,
        subject: emailSubject,
        message: emailMessage,
        sendCopyToMe
      })
      
      if (response.data.success) {
        const summary = response.data.summary
        toast.success(`Email sent successfully! ${summary.successful} sent, ${summary.failed} failed`)
        setEmailSubject('')
        setEmailMessage('')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      toast.error(error.response?.data?.message || 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const handleSendSMS = async () => {
    if (!smsMessage) {
      toast.error('Please enter a message')
      return
    }

    if (recipients.length === 0) {
      toast.error('No recipients selected. Please apply filters first.')
      return
    }

    try {
      setSending(true)
      const response = await sendSMS({
        module,
        filters,
        customMessage: smsMessage
      })
      
      if (response.data.success) {
        const summary = response.data.summary
        toast.success(`SMS sent successfully! ${summary.successful} sent`)
        setSmsMessage('')
      }
    } catch (error) {
      console.error('Error sending SMS:', error)
      toast.error(error.response?.data?.message || 'Failed to send SMS')
    } finally {
      setSending(false)
    }
  }

  const handleSendWhatsApp = async () => {
    if (!whatsappMessage) {
      toast.error('Please enter a message')
      return
    }

    if (recipients.length === 0) {
      toast.error('No recipients selected. Please apply filters first.')
      return
    }

    try {
      setSending(true)
      const response = await sendWhatsApp({
        module,
        filters,
        message: whatsappMessage
      })
      
      if (response.data.success) {
        const summary = response.data.summary
        toast.success(`WhatsApp sent successfully! ${summary.successful} sent, ${summary.failed} failed`)
        setWhatsappMessage('')
      }
    } catch (error) {
      console.error('Error sending WhatsApp:', error)
      toast.error(error.response?.data?.message || 'Failed to send WhatsApp message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/" className="text-gray-500 hover:text-orange-600 transition-colors">Home</Link>
          <span className="text-gray-300">/</span>
          <span className="text-orange-600 font-semibold">Marketing</span>
        </nav>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marketing Center</h1>
          <p className="text-gray-600 mt-1">Manage communications and member engagement</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-2">
        <button
          onClick={() => setActiveTab('communication')}
          className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
            activeTab === 'communication'
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Megaphone className="w-4 h-4" />
            Communication
          </div>
        </button>
        <button
          onClick={() => setActiveTab('engagement')}
          className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
            activeTab === 'engagement'
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            Engagement
          </div>
        </button>
      </div>

      {activeTab === 'communication' && (
        <div className="space-y-6">
          {/* Communication Type Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-lg">
                <Users className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold text-gray-900">Select Communication Channel</span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setCommunicationType('email')}
                className={`px-6 py-3 rounded-xl flex items-center font-semibold transition-all ${
                  communicationType === 'email'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </button>
              <button
                onClick={() => setCommunicationType('sms')}
                className={`px-6 py-3 rounded-xl flex items-center font-semibold transition-all ${
                  communicationType === 'sms'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                SMS
              </button>
              <button
                onClick={() => setCommunicationType('whatsapp')}
                className={`px-6 py-3 rounded-xl flex items-center font-semibold transition-all ${
                  communicationType === 'whatsapp'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Phone className="w-4 h-4 mr-2" />
                WhatsApp
              </button>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg shadow-lg">
                <Filter className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold text-gray-900">Select Recipients</span>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Select Module</label>
                <select 
                  value={module}
                  onChange={(e) => setModule(e.target.value)}
                  className="w-full appearance-none rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                >
                  <option value="member">Member</option>
                  <option value="enquiry">Enquiry</option>
                  <option value="suspect">Suspect List</option>
                </select>
              </div>

              {/* Validity */}
              <div>
                <div 
                  className="flex items-center gap-2 mb-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  onClick={() => toggleSection('validity')}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg 
                      className={`w-4 h-4 text-gray-700 transition-transform ${openSections.validity ? 'rotate-90' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <label className="text-sm font-bold text-gray-900">Validity</label>
                </div>
                {openSections.validity && (
                  <div className="flex flex-wrap gap-4 pl-8 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="validity"
                      value="all"
                      checked={filters.validity === 'all'}
                      onChange={(e) => setFilters({...filters, validity: e.target.value})}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">All Members</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="validity"
                      value="active"
                      checked={filters.validity === 'active'}
                      onChange={(e) => setFilters({...filters, validity: e.target.value})}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Active Members</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="validity"
                      value="inactive"
                      checked={filters.validity === 'inactive'}
                      onChange={(e) => setFilters({...filters, validity: e.target.value})}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Inactive Members</span>
                  </label>
                </div>
                )}
              </div>

              {/* Gender */}
              <div>
                <div 
                  className="flex items-center gap-2 mb-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  onClick={() => toggleSection('gender')}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg 
                      className={`w-4 h-4 text-gray-700 transition-transform ${openSections.gender ? 'rotate-90' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <label className="text-sm font-bold text-gray-900">Gender</label>
                </div>
                {openSections.gender && (
                  <div className="flex flex-wrap gap-4 pl-8 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="all"
                      checked={filters.gender === 'all'}
                      onChange={(e) => setFilters({...filters, gender: e.target.value})}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">All Clients</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={filters.gender === 'male'}
                      onChange={(e) => setFilters({...filters, gender: e.target.value})}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Male</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={filters.gender === 'female'}
                      onChange={(e) => setFilters({...filters, gender: e.target.value})}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Female</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="other"
                      checked={filters.gender === 'other'}
                      onChange={(e) => setFilters({...filters, gender: e.target.value})}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Not-specified</span>
                  </label>
                </div>
                )}
              </div>

              {/* Age Group */}
              <div>
                <div 
                  className="flex items-center gap-2 mb-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  onClick={() => toggleSection('ageGroup')}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg 
                      className={`w-4 h-4 text-gray-700 transition-transform ${openSections.ageGroup ? 'rotate-90' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <label className="text-sm font-bold text-gray-900">Age group</label>
                </div>
                {openSections.ageGroup && (
                  <div className="pl-8 mb-2">
                  <select 
                    value={filters.ageGroup}
                    onChange={(e) => setFilters({...filters, ageGroup: e.target.value})}
                    className="w-full max-w-xs appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  >
                    <option value="">All Age Group</option>
                    <option value="18-25">18-25 years</option>
                    <option value="26-35">26-35 years</option>
                    <option value="36-45">36-45 years</option>
                    <option value="46-60">46-60 years</option>
                    <option value="60+">60+ years</option>
                  </select>
                </div>
                )}
              </div>

              {/* Lead Source */}
              <div>
                <div 
                  className="flex items-center gap-2 mb-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  onClick={() => toggleSection('leadSource')}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg 
                      className={`w-4 h-4 text-gray-700 transition-transform ${openSections.leadSource ? 'rotate-90' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <label className="text-sm font-bold text-gray-900">Lead Source</label>
                </div>
                {openSections.leadSource && (
                  <div className="pl-8 mb-2">
                  <select 
                    value={filters.leadSource}
                    onChange={(e) => setFilters({...filters, leadSource: e.target.value})}
                    className="w-full max-w-xs appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  >
                    <option value="">All Lead Source</option>
                    <option value="walk-in">Walk-in</option>
                    <option value="referral">Referral</option>
                    <option value="social-media">Social Media</option>
                    <option value="website">Website</option>
                    <option value="advertisement">Advertisement</option>
                  </select>
                </div>
                )}
              </div>

              {/* Service Category */}
              <div>
                <div 
                  className="flex items-center gap-2 mb-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  onClick={() => toggleSection('serviceCategory')}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg 
                      className={`w-4 h-4 text-gray-700 transition-transform ${openSections.serviceCategory ? 'rotate-90' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <label className="text-sm font-bold text-gray-900">Service category</label>
                </div>
                {openSections.serviceCategory && (
                  <div className="pl-8 mb-2">
                  <select 
                    value={filters.serviceCategory}
                    onChange={(e) => setFilters({...filters, serviceCategory: e.target.value})}
                    className="w-full max-w-xs appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  >
                    <option value="">All Service Category</option>
                    <option value="gym">Gym</option>
                    <option value="personal-training">Personal Training</option>
                    <option value="group-classes">Group Classes</option>
                    <option value="nutrition">Nutrition</option>
                  </select>
                </div>
                )}
              </div>

              {/* Service */}
              <div>
                <div 
                  className="flex items-center gap-2 mb-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  onClick={() => toggleSection('service')}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg 
                      className={`w-4 h-4 text-gray-700 transition-transform ${openSections.service ? 'rotate-90' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <label className="text-sm font-bold text-gray-900">Service</label>
                </div>
                {openSections.service && (
                  <div className="pl-8 flex gap-4 mb-2">
                  <select 
                    value={filters.service}
                    onChange={(e) => setFilters({...filters, service: e.target.value})}
                    className="flex-1 max-w-xs appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  >
                    <option value="">All Service</option>
                    <option value="monthly">Monthly Membership</option>
                    <option value="quarterly">Quarterly Membership</option>
                    <option value="annual">Annual Membership</option>
                  </select>
                  <select 
                    value={filters.serviceVariation}
                    onChange={(e) => setFilters({...filters, serviceVariation: e.target.value})}
                    className="flex-1 max-w-xs appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  >
                    <option value="">All Service Variation</option>
                    <option value="basic">Basic</option>
                    <option value="premium">Premium</option>
                    <option value="elite">Elite</option>
                  </select>
                </div>
                )}
              </div>

              {/* Behaviour Checkbox */}
              {openSections.service && (
                <div className="pl-8 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.behaviour}
                      onChange={(e) => setFilters({...filters, behaviour: e.target.checked})}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Behaviour</span>
                  </label>
                </div>
              )}

              {/* Average Lifetime Value Checkbox */}
              {openSections.service && (
                <div className="pl-8 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.avgLifetimeValue}
                      onChange={(e) => setFilters({...filters, avgLifetimeValue: e.target.checked})}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Average lifetime value</span>
                  </label>
                </div>
              )}

              {/* Membership Expiry */}
              <div>
                <div 
                  className="flex items-center gap-2 mb-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  onClick={() => toggleSection('membershipExpiry')}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg 
                      className={`w-4 h-4 text-gray-700 transition-transform ${openSections.membershipExpiry ? 'rotate-90' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <label className="text-sm font-bold text-gray-900">Membership expiry</label>
                </div>
                {openSections.membershipExpiry && (
                  <div className="pl-8 flex items-center gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">From</label>
                    <input
                      type="date"
                      value={filters.membershipExpiryFrom}
                      onChange={(e) => setFilters({...filters, membershipExpiryFrom: e.target.value})}
                      className="appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">To</label>
                    <input
                      type="date"
                      value={filters.membershipExpiryTo}
                      onChange={(e) => setFilters({...filters, membershipExpiryTo: e.target.value})}
                      className="appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>
                )}
              </div>

              {/* Apply Filters Button */}
              <div className="pt-4">
                <button
                  onClick={fetchRecipients}
                  disabled={loadingRecipients}
                  className="w-full group inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {loadingRecipients ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Apply Filters
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Recipients List */}
          {recipients.length > 0 && (
            <Paper 
              elevation={0} 
              sx={{ 
                borderRadius: 4, 
                border: '2px solid #E5E7EB',
                overflow: 'hidden'
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 3, 
                py: 2,
                borderBottom: '2px solid #E5E7EB',
                background: 'linear-gradient(to right, #F9FAFB, #F3F4F6)'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                    Found <span style={{ color: '#F97316', fontWeight: 700 }}>{recipients.length}</span> recipients
                  </Typography>
                </Box>
              </Box>

              <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#374151', textTransform: 'uppercase', bgcolor: '#F9FAFB' }}>#</TableCell>
                      {module === 'member' && (
                        <>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#374151', textTransform: 'uppercase', bgcolor: '#F9FAFB' }}>Member ID</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#374151', textTransform: 'uppercase', bgcolor: '#F9FAFB' }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#374151', textTransform: 'uppercase', bgcolor: '#F9FAFB' }}>Email</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#374151', textTransform: 'uppercase', bgcolor: '#F9FAFB' }}>Phone</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#374151', textTransform: 'uppercase', bgcolor: '#F9FAFB' }}>Status</TableCell>
                        </>
                      )}
                      {module !== 'member' && (
                        <>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#374151', textTransform: 'uppercase', bgcolor: '#F9FAFB' }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#374151', textTransform: 'uppercase', bgcolor: '#F9FAFB' }}>Email</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#374151', textTransform: 'uppercase', bgcolor: '#F9FAFB' }}>Phone</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#374151', textTransform: 'uppercase', bgcolor: '#F9FAFB' }}>Stage</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recipients.map((recipient, index) => (
                      <TableRow 
                        key={recipient._id}
                        sx={{
                          '&:hover': {
                            background: 'linear-gradient(to right, #FFF7ED, #FEF2F2)',
                          }
                        }}
                      >
                        <TableCell>
                          <Chip 
                            label={index + 1} 
                            size="small"
                            sx={{ bgcolor: '#F3F4F6', color: '#374151', fontWeight: 700 }} 
                          />
                        </TableCell>
                        {module === 'member' && (
                          <>
                            <TableCell sx={{ fontSize: '0.875rem', color: '#4B5563', fontFamily: 'monospace' }}>{recipient.memberId || '—'}</TableCell>
                            <TableCell sx={{ fontSize: '0.875rem', color: '#111827', fontWeight: 600 }}>
                              {recipient.firstName} {recipient.lastName}
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.875rem', color: '#4B5563' }}>{recipient.email || '—'}</TableCell>
                            <TableCell sx={{ fontSize: '0.875rem', color: '#4B5563', fontFamily: 'monospace' }}>{recipient.phone || '—'}</TableCell>
                            <TableCell>
                              <Chip 
                                label={recipient.membershipStatus || 'N/A'} 
                                size="small"
                                sx={{ 
                                  bgcolor: recipient.membershipStatus === 'active' ? '#D1FAE5' : '#FEE2E2',
                                  color: recipient.membershipStatus === 'active' ? '#059669' : '#DC2626',
                                  fontWeight: 700,
                                  textTransform: 'capitalize'
                                }} 
                              />
                            </TableCell>
                          </>
                        )}
                        {module !== 'member' && (
                          <>
                            <TableCell sx={{ fontSize: '0.875rem', color: '#111827', fontWeight: 600 }}>{recipient.name}</TableCell>
                            <TableCell sx={{ fontSize: '0.875rem', color: '#4B5563' }}>{recipient.email || '—'}</TableCell>
                            <TableCell sx={{ fontSize: '0.875rem', color: '#4B5563', fontFamily: 'monospace' }}>{recipient.phone || '—'}</TableCell>
                            <TableCell>
                              <Chip 
                                label={recipient.enquiryStage || 'N/A'} 
                                size="small"
                                sx={{ 
                                  bgcolor: '#DBEAFE',
                                  color: '#1D4ED8',
                                  fontWeight: 700,
                                  textTransform: 'capitalize'
                                }} 
                              />
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {/* Email Composition Dashboard */}
          {communicationType === 'email' && (
            <Paper 
              elevation={0} 
              sx={{ 
                borderRadius: 4, 
                border: '2px solid #E5E7EB',
                overflow: 'hidden'
              }}
            >
              {/* Email Dashboard Header */}
              <Box sx={{ 
                background: 'linear-gradient(135deg, #F97316 0%, #DC2626 100%)',
                px: 3,
                py: 2.5,
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}>
                <Mail className="w-6 h-6 text-white" />
                <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '1.125rem' }}>
                  Email Composition Dashboard
                </Typography>
              </Box>

              {/* Email Form */}
              <Box sx={{ p: 3 }}>
                <div className="space-y-4">
                  {/* Recipients Count */}
                  <Box sx={{ 
                    bgcolor: '#F0F9FF',
                    border: '2px solid #BFDBFE',
                    borderRadius: 2,
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}>
                    <Users className="w-5 h-5 text-blue-600" />
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1E40AF' }}>
                      Recipients: <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>{recipients.length}</span> members selected
                    </Typography>
                  </Box>

                  {/* Email Template Selector */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
                      <Tag className="w-4 h-4 text-orange-600" />
                      Email Template
                    </label>
                    <select className="w-full appearance-none rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all">
                      <option value="">None - Compose Custom Email</option>
                      <option value="welcome">Welcome Email</option>
                      <option value="renewal">Renewal Reminder</option>
                      <option value="promotion">Promotion Announcement</option>
                      <option value="event">Event Invitation</option>
                    </select>
                  </div>

                  {/* Subject Line */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
                      <Mail className="w-4 h-4 text-orange-600" />
                      Subject Line <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all placeholder:text-gray-400" 
                      placeholder="e.g., Exclusive Offer Just For You! 🎉"
                      required 
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ✨ Tip: Use emojis and personalization for better open rates
                    </p>
                  </div>

                  {/* Message Body */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
                      <MessageSquare className="w-4 h-4 text-orange-600" />
                      Message Body <span className="text-red-500">*</span>
                    </label>

                    <textarea 
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all placeholder:text-gray-400"
                      style={{ minHeight: '200px', fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '1.6' }}
                      placeholder="Dear Member,&#10;&#10;We're excited to share...&#10;&#10;Best regards,&#10;Team"
                      required
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                      <p className="text-xs text-gray-500">
                        💡 Personalization tags: {'{name}'}, {'{memberId}'}, {'{expiryDate}'}
                      </p>
                      <p className="text-xs font-medium text-gray-600">
                        {emailMessage.length} characters
                      </p>
                    </Box>
                  </div>

                  {/* Attachment Section */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
                      <Upload className="w-4 h-4 text-orange-600" />
                      Attachments (Optional)
                    </label>
                    <Box sx={{ 
                      border: '2px dashed #E5E7EB',
                      borderRadius: 3,
                      p: 3,
                      textAlign: 'center',
                      bgcolor: '#FAFAFA',
                      '&:hover': {
                        bgcolor: '#F9FAFB',
                        borderColor: '#F97316'
                      },
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}>
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', mb: 0.5 }}>
                        Click to upload or drag and drop
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                        PDF, JPG, PNG up to 10MB
                      </Typography>
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" multiple />
                    </Box>
                  </div>

                  {/* Options */}
                  <Box sx={{ 
                    bgcolor: '#F9FAFB',
                    borderRadius: 2,
                    p: 2,
                    border: '1px solid #E5E7EB'
                  }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', mb: 1.5, letterSpacing: '0.05em' }}>
                      Email Options
                    </Typography>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={sendCopyToMe}
                          onChange={(e) => setSendCopyToMe(e.target.checked)}
                          className="w-4 h-4 rounded border-2 border-gray-300 text-orange-500 focus:ring-orange-500 focus:ring-2" 
                        />
                        <span className="text-sm font-medium text-gray-700">Send a copy to my email</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-2 border-gray-300 text-orange-500 focus:ring-orange-500 focus:ring-2" 
                        />
                        <span className="text-sm font-medium text-gray-700">Track email opens</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-2 border-gray-300 text-orange-500 focus:ring-orange-500 focus:ring-2" 
                        />
                        <span className="text-sm font-medium text-gray-700">Track link clicks</span>
                      </label>
                    </div>
                  </Box>

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
                    <button 
                      onClick={handleSendEmail}
                      disabled={sending || recipients.length === 0 || !emailSubject || !emailMessage}
                      className="flex-1 group inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-base"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Sending to {recipients.length} recipients...
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                          Send Email to {recipients.length} Recipients
                        </>
                      )}
                    </button>
                    <button 
                      className="px-6 py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                    >
                      Save Draft
                    </button>
                  </Box>
                </div>
              </Box>
            </Paper>
          )}

          {/* SMS Form */}
          {communicationType === 'sms' && (
            <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-6 space-y-6">

              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all" 
                    rows="4" 
                    placeholder="Enter SMS message (max 160 characters)"
                    maxLength={160}
                  />
                  <div className="text-xs text-gray-500 mt-1">{smsMessage.length}/160 characters</div>
                </div>
                <button 
                  onClick={handleSendSMS}
                  disabled={sending || recipients.length === 0}
                  className="group w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-5 w-5" />
                      Send SMS to {recipients.length} Recipients
                    </>
                  )}
                </button>
              </>
            </div>
          )}

          {/* WhatsApp Form */}
          {communicationType === 'whatsapp' && (
            <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-6 space-y-6">
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all" 
                    rows="4" 
                    placeholder="Enter WhatsApp message"
                  />
                </div>
                <button 
                  onClick={handleSendWhatsApp}
                  disabled={sending || recipients.length === 0}
                  className="group w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Phone className="h-5 w-5" />
                      Send WhatsApp to {recipients.length} Recipients
                    </>
                  )}
                </button>
              </>
            </div>
          )}
        </div>
      )}

      {activeTab === 'engagement' && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-lg">
                <Tag className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Offers & Promotions</h2>
            </div>
            <button className="group inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold shadow-lg hover:shadow-xl">
              <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
              Create Offer
            </button>
          </div>
          <div className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl shadow-lg mb-4">
              <Tag className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Offers Yet</h3>
            <p className="text-gray-500 text-center max-w-md">Create engaging offers and promotions to boost member engagement and drive sales.</p>
          </div>
        </div>
      )}
    </div>
  )
}

