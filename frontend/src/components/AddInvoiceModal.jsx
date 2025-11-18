import { useEffect, useRef, useState } from 'react'
import { X, Calendar, Plus, Trash2, Search, CreditCard } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import DateInput from './DateInput'
import RazorpayPayment from './RazorpayPayment'
import { getOrganizationDetails } from '../api/organization'
import { searchMembers as searchMembersApi, getMember as getMemberApi } from '../api/members'

export default function AddInvoiceModal({
  isOpen,
  onClose,
  defaultMemberId,
  defaultMemberName,
  defaultMemberPhone
}) {
  const { user } = useAuthStore()
  const [invoiceType, setInvoiceType] = useState('service')
  const [formData, setFormData] = useState({
    invoiceDate: new Date().toISOString().split('T')[0],
    salesRep: '',
    memberId: '',
    memberName: '',
    memberPhone: '',
    sacCode: '',
    items: [{
      selectedServiceId: '',
      serviceId: '',
      description: '',
      duration: '',
      quantity: 1,
      unitPrice: 0,
      discount: { type: 'percentage', value: 0 },
      taxRate: 0,
      taxType: 'No tax',
      startDate: '',
      expiryDate: '',
      numberOfSessions: '',
      sacCode: ''
    }],
    discountReason: '',
    customerNotes: '',
    internalNotes: '',
    termsAndConditions: '',
    paymentModes: [{
      method: '',
      amount: 0
    }]
  })
  const [memberSearch, setMemberSearch] = useState('')
  const [memberSearchResults, setMemberSearchResults] = useState([])
  const [isMemberSearching, setIsMemberSearching] = useState(false)
  const [memberSearchError, setMemberSearchError] = useState('')
  const [planWarning, setPlanWarning] = useState('')
  const [planInfo, setPlanInfo] = useState(null)
  const memberSearchBlurTimeout = useRef(null)
  const [showRazorpayModal, setShowRazorpayModal] = useState(false)
  const [razorpayInvoiceData, setRazorpayInvoiceData] = useState(null)

  const queryClient = useQueryClient()

  // Fetch services
  const { data: servicesData } = useQuery({
    queryKey: ['services-list'],
    queryFn: () => api.get('/services').then(res => res.data),
    enabled: isOpen
  })

  // Component to fetch variations for a specific service
  const ServiceVariationsDropdown = ({ serviceId, index, value, onChange }) => {
    const { data: variationsData, isLoading } = useQuery({
      queryKey: ['service-variations', serviceId],
      queryFn: () => api.get('/plans', { params: { serviceId, isActive: 'true' } }).then(res => res.data),
      enabled: !!serviceId
    })

    if (!serviceId) return null

    const variations = variationsData?.plans || []

    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm"
      >
        <option value="">Select Variation</option>
        {isLoading && <option disabled>Loading variations...</option>}
        {!isLoading && variations.map(variation => (
          <option key={variation._id} value={variation._id}>
            {variation.name} {variation.duration?.value && variation.duration?.unit 
              ? `(${variation.duration.value} ${variation.duration.unit})` 
              : ''} - ₹{variation.price}
          </option>
        ))}
        {!isLoading && variations.length === 0 && (
          <option disabled>No variations available</option>
        )}
      </select>
    )
  }

  // Fetch staff for sales rep
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff').then(res => res.data),
    enabled: isOpen
  })

  // Fetch members
  const { data: membersData } = useQuery({
    queryKey: ['members-list'],
    queryFn: () => api.get('/members').then(res => res.data),
    enabled: isOpen
  })

  const { data: organizationResponse } = useQuery({
    queryKey: ['organization-details'],
    queryFn: getOrganizationDetails,
    enabled: isOpen
  })

  const organization = organizationResponse?.organization
  const organizationName = organization?.name || user?.organizationName || 'AIRFIT'
  const organizationPhone = organization?.phone || user?.organizationPhone || 'N/A'
  const organizationAddress = [
    organization?.address?.street,
    organization?.address?.city,
    organization?.address?.state,
    organization?.address?.zipCode,
    organization?.address?.country
  ]
    .filter(Boolean)
    .join(', ')

  const handleMemberInputChange = async (value) => {
    if (value !== memberSearch && formData.memberId) {
      setFormData(prev => ({
        ...prev,
        memberId: '',
        memberName: '',
        memberPhone: ''
      }))
      setPlanWarning('')
      setPlanInfo(null)
    }
    setMemberSearch(value)
    setMemberSearchError('')
 
     const trimmed = value.trim()
     if (trimmed.length < 2) {
       setMemberSearchResults([])
       setIsMemberSearching(false)
       return
     }
 
     setIsMemberSearching(true)
     try {
       const response = await searchMembersApi(trimmed)
       const members = response?.data?.members || response?.members || []
       setMemberSearchResults(members)
       if (members.length === 0) {
         setMemberSearchError('No members found')
       }
     } catch (error) {
       console.error('Member search failed', error)
       setMemberSearchError('Failed to search members')
       setMemberSearchResults([])
     } finally {
       setIsMemberSearching(false)
     }
   }

  const handleMemberSelectFromSearch = async (member) => {
    if (!member) return
    if (memberSearchBlurTimeout.current) {
      clearTimeout(memberSearchBlurTimeout.current)
      memberSearchBlurTimeout.current = null
    }
    await attemptMemberSelection(member)
  }

  const handleMemberInputFocus = () => {
    if (memberSearchBlurTimeout.current) {
      clearTimeout(memberSearchBlurTimeout.current)
      memberSearchBlurTimeout.current = null
    }
    if (memberSearch.trim().length >= 2 && memberSearchResults.length === 0 && !isMemberSearching) {
      handleMemberInputChange(memberSearch)
    }
  }

  const handleMemberInputBlur = () => {
    memberSearchBlurTimeout.current = setTimeout(() => {
      setMemberSearchResults([])
      setIsMemberSearching(false)
    }, 150)
  }

  const createInvoiceMutation = useMutation({
    mutationFn: (data) => api.post('/invoices', data),
    onSuccess: () => {
      toast.success('Pro Forma Invoice created successfully')
      queryClient.invalidateQueries(['invoices'])
      queryClient.invalidateQueries(['dashboard-stats'])
      handleClose(true)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create invoice')
    }
  })

  const resetForm = () => {
    setFormData({
      invoiceDate: new Date().toISOString().split('T')[0],
      salesRep: '',
      memberId: '',
      memberName: '',
      memberPhone: '',
      sacCode: '',
    items: [{
      selectedServiceId: '',
      serviceId: '',
      description: '',
      duration: '',
      quantity: 1,
      unitPrice: 0,
      discount: { type: 'percentage', value: 0 },
      taxRate: 0,
      taxType: 'No tax',
      startDate: '',
      expiryDate: '',
      numberOfSessions: '',
      sacCode: ''
    }],
      discountReason: '',
      customerNotes: '',
      internalNotes: '',
      termsAndConditions: '',
      paymentModes: [{
        method: '',
        amount: 0
      }]
    })
    setMemberSearch('')
    setMemberSearchResults([])
    setMemberSearchError('')
    setIsMemberSearching(false)
    setPlanWarning('')
    setPlanInfo(null)
  }

  const fetchMemberPlanStatus = async (memberId) => {
    setPlanWarning('')
    try {
      const response = await getMemberApi(memberId)
      const status = response?.data?.currentPlanStatus || null
      setPlanInfo(status)
      if (status && (status.isActive || status.hasSessionsRemaining)) {
        const endDate = status.endDate ? new Date(status.endDate).toLocaleDateString() : 'unknown end date'
        setPlanWarning(`Member already has an active plan (${status.planName || 'Membership'}) valid until ${endDate}. Please wait for expiry before creating a new invoice.`)
        const error = new Error('ACTIVE_PLAN')
        throw error
      }
      return status
    } catch (error) {
      if (error.message !== 'ACTIVE_PLAN') {
        setPlanInfo(null)
      }
      throw error
    }
  }

  const attemptMemberSelection = async (member) => {
    if (!member) return
    try {
      await fetchMemberPlanStatus(member._id)
    } catch (error) {
      if (error.message === 'ACTIVE_PLAN') {
        setFormData(prev => ({
          ...prev,
          memberId: '',
          memberName: '',
          memberPhone: ''
        }))
        setMemberSearch('')
        setMemberSearchResults([])
        return
      }
      toast.error('Unable to fetch member status. Please try again.')
      return
    }

    setFormData(prev => ({
      ...prev,
      memberId: member._id,
      memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
      memberPhone: member.phone || ''
    }))

    const displayText = [`${member.firstName || ''} ${member.lastName || ''}`.trim(), member.phone]
      .filter(Boolean)
      .join(' - ')
    setMemberSearch(displayText)
    setMemberSearchResults([])
    setMemberSearchError('')
    setPlanWarning('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Validate member selection
    if (!formData.memberId) {
      toast.error('Please select a member')
      return
    }

    // Validate items - must have at least one item with serviceId and unitPrice
    const validItems = formData.items.filter(item => item.serviceId && item.unitPrice > 0)
    if (validItems.length === 0) {
      toast.error('Please add at least one service with a selected variation and price')
      return
    }

    // Check for items with missing serviceId
    const itemsWithoutService = formData.items.filter(item => !item.serviceId && (item.unitPrice > 0 || item.description))
    if (itemsWithoutService.length > 0) {
      toast.error('Please select a service variation for all items')
      return
    }

    // Validate payment modes - if amount is entered, method must be selected
    const invalidPaymentModes = formData.paymentModes.filter(pm => {
      const amount = parseFloat(pm.amount) || 0
      return amount > 0 && !pm.method
    })
    if (invalidPaymentModes.length > 0) {
      toast.error('Please select a payment method for all payment entries with amount')
      return
    }

    // Calculate totals - only process items with serviceId
    let subtotal = 0
    let totalTaxAmount = 0
    const processedItems = formData.items
      .filter(item => item.serviceId && item.unitPrice > 0)
      .map(item => {
      const amount = (item.unitPrice || 0) * (item.quantity || 1)
      let discountAmount = 0
      if (item.discount && item.discount.value > 0) {
        if (item.discount.type === 'percentage') {
          discountAmount = (amount * item.discount.value) / 100
        } else {
          discountAmount = item.discount.value
        }
      }
      const itemAmount = amount - discountAmount
      const taxAmount = itemAmount * (item.taxRate || 0) / 100
      subtotal += itemAmount
      totalTaxAmount += taxAmount
      
      return {
        ...item,
        amount: itemAmount,
        taxAmount,
        total: itemAmount + taxAmount,
        discount: item.discount && item.discount.value > 0 ? item.discount : undefined
      }
    })

    const total = subtotal + totalTaxAmount
    
    // Validate total amount
    if (total <= 0) {
      toast.error('Invoice total must be greater than 0. Please add valid items with prices.')
      return
    }

    const totalPaid = formData.paymentModes.reduce((sum, pm) => sum + (parseFloat(pm.amount) || 0), 0)
    const pending = Math.max(0, total - totalPaid)

    const invoiceData = {
      memberId: formData.memberId,
      type: 'pro-forma',
      invoiceType,
      isProForma: true,
      items: processedItems,
      subtotal,
      tax: {
        rate: formData.items[0]?.taxRate || 0,
        amount: totalTaxAmount
      },
      total,
      pending,
      rounding: 0,
      sacCode: formData.sacCode || undefined,
      discountReason: formData.discountReason || undefined,
      customerNotes: formData.customerNotes || undefined,
      internalNotes: formData.internalNotes || undefined,
      paymentModes: formData.paymentModes.filter(pm => pm.method && pm.amount > 0),
      terms: formData.termsAndConditions || undefined,
      status: totalPaid >= total ? 'paid' : (totalPaid > 0 ? 'partial' : 'draft')
    }

    createInvoiceMutation.mutate(invoiceData)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items]
      if (field.includes('.')) {
        const [parent, child] = field.split('.')
        newItems[index][parent] = { ...newItems[index][parent], [child]: value }
      } else {
        newItems[index][field] = value
      }
      return { ...prev, items: newItems }
    })
  }

  const handlePaymentModeChange = (index, field, value) => {
    setFormData(prev => {
      const newModes = [...prev.paymentModes]
      newModes[index][field] = value
      return { ...prev, paymentModes: newModes }
    })
  }

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        selectedServiceId: '',
        serviceId: '',
        description: '',
        duration: '',
        quantity: 1,
        unitPrice: 0,
        discount: { type: 'percentage', value: 0 },
        taxRate: 0,
        taxType: 'No tax',
        startDate: '',
        expiryDate: '',
        numberOfSessions: '',
        sacCode: ''
      }]
    }))
  }

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }))
    }
  }

  const addPaymentMode = () => {
    setFormData(prev => ({
      ...prev,
      paymentModes: [...prev.paymentModes, { method: '', amount: 0 }]
    }))
  }

  const removePaymentMode = (index) => {
    if (formData.paymentModes.length > 1) {
      setFormData(prev => ({
        ...prev,
        paymentModes: prev.paymentModes.filter((_, i) => i !== index)
      }))
    }
  }

  const handleMemberSelect = async (memberId) => {
    const member = membersData?.members?.find(m => m._id === memberId)
    if (!member) return
    await attemptMemberSelection(member)
  }

  // Fetch variations for a specific service
  const fetchVariationsForService = async (serviceId) => {
    if (!serviceId) return []
    try {
      const response = await api.get('/plans', { params: { serviceId, isActive: 'true' } })
      return response.data?.plans || []
    } catch (error) {
      console.error('Failed to fetch variations', error)
      return []
    }
  }

  const handleServiceSelect = async (index, selectedServiceId) => {
    if (!selectedServiceId) {
      handleItemChange(index, 'selectedServiceId', '')
      handleItemChange(index, 'serviceId', '')
      handleItemChange(index, 'description', '')
      handleItemChange(index, 'unitPrice', 0)
      handleItemChange(index, 'taxRate', 0)
      return
    }

    handleItemChange(index, 'selectedServiceId', selectedServiceId)
    handleItemChange(index, 'serviceId', '')
    handleItemChange(index, 'description', '')
    handleItemChange(index, 'unitPrice', 0)
    handleItemChange(index, 'taxRate', 0)

    // Fetch variations for this service
    const variations = await fetchVariationsForService(selectedServiceId)
    // Store variations in a way we can access them later
    // We'll use a query for each selected service
  }

  const handleVariationSelect = async (index, variationId) => {
    // Get the selected service ID for this item
    const selectedServiceId = formData.items[index]?.selectedServiceId
    if (!selectedServiceId || !variationId) {
      handleItemChange(index, 'serviceId', '')
      handleItemChange(index, 'description', '')
      handleItemChange(index, 'unitPrice', 0)
      handleItemChange(index, 'taxRate', 0)
      return
    }

    // Fetch variations and find the selected one
    const variations = await fetchVariationsForService(selectedServiceId)
    const variation = variations.find(v => v._id === variationId)
    
    if (variation) {
      handleItemChange(index, 'serviceId', variationId)
      handleItemChange(index, 'description', variation.name)
      handleItemChange(index, 'unitPrice', variation.price)
      handleItemChange(index, 'taxRate', variation.taxRate || 0)

      const baseDate = formData.items[index]?.startDate
        ? new Date(formData.items[index].startDate)
        : new Date(formData.invoiceDate || new Date())

      if (variation.duration?.value && variation.duration?.unit) {
        const startDate = new Date(baseDate)
        let endDate = new Date(startDate)

        switch (variation.duration.unit) {
          case 'days':
            endDate.setDate(endDate.getDate() + variation.duration.value)
            break
          case 'weeks':
            endDate.setDate(endDate.getDate() + variation.duration.value * 7)
            break
          case 'months':
            endDate.setMonth(endDate.getMonth() + variation.duration.value)
            break
          case 'years':
            endDate.setFullYear(endDate.getFullYear() + variation.duration.value)
            break
          default:
            endDate = null
        }

        if (!Number.isNaN(startDate.getTime())) {
          handleItemChange(index, 'startDate', startDate.toISOString().split('T')[0])
        }
        if (endDate && !Number.isNaN(endDate.getTime())) {
          handleItemChange(index, 'expiryDate', endDate.toISOString().split('T')[0])
        }
      }

      if (variation.sessions) {
        handleItemChange(index, 'numberOfSessions', variation.sessions)
      }

      if (variation.duration?.value && variation.duration?.unit) {
        const durationLabel = `${variation.duration.value} ${variation.duration.unit}`
        handleItemChange(index, 'duration', durationLabel)
      }
    }
  }

  // Calculate totals
  const calculateTotals = () => {
    // Helper function to safely parse numbers
    const safeParseFloat = (value, defaultValue = 0) => {
      if (value === null || value === undefined || value === '') return defaultValue
      const parsed = parseFloat(value)
      return isNaN(parsed) ? defaultValue : parsed
    }
    
    let subtotal = 0
    let taxAmount = 0
    
    formData.items.forEach(item => {
      const unitPrice = safeParseFloat(item.unitPrice, 0)
      const quantity = safeParseFloat(item.quantity, 1)
      const amount = unitPrice * quantity
      
      let discountAmount = 0
      if (item.discount && item.discount.value) {
        const discountValue = safeParseFloat(item.discount.value, 0)
        if (discountValue > 0) {
          if (item.discount.type === 'percentage') {
            discountAmount = (amount * discountValue) / 100
          } else {
            discountAmount = discountValue
          }
        }
      }
      
      const itemAmount = Math.max(0, amount - discountAmount)
      const taxRate = safeParseFloat(item.taxRate, 0)
      const itemTax = (itemAmount * taxRate) / 100
      subtotal += itemAmount
      taxAmount += itemTax
    })
    
    subtotal = Number(subtotal.toFixed(2))
    taxAmount = Number(taxAmount.toFixed(2))
    const total = Number((subtotal + taxAmount).toFixed(2))
    const totalPaid = formData.paymentModes.reduce((sum, pm) => {
      const amount = safeParseFloat(pm.amount, 0)
      return sum + amount
    }, 0)
    const pending = Math.max(0, Number((total - totalPaid).toFixed(2)))
    
    // Ensure no NaN values
    if (isNaN(subtotal) || isNaN(taxAmount) || isNaN(total) || isNaN(pending)) {
      return { subtotal: 0, taxAmount: 0, total: 0, pending: 0 }
    }
    
    return { subtotal, taxAmount, total, pending }
  }

  const totals = calculateTotals()

  useEffect(() => {
     if (isOpen && defaultMemberId) {
       setFormData(prev => ({
         ...prev,
         memberId: defaultMemberId,
         memberName: defaultMemberName || prev.memberName,
         memberPhone: defaultMemberPhone || prev.memberPhone
       }))
      const displayText = [defaultMemberName, defaultMemberPhone].filter(Boolean).join(' - ')
      setMemberSearch(displayText)
      setMemberSearchResults([])
      setMemberSearchError('')
     }
   }, [isOpen, defaultMemberId, defaultMemberName, defaultMemberPhone])

  useEffect(() => () => {
    if (memberSearchBlurTimeout.current) {
      clearTimeout(memberSearchBlurTimeout.current)
    }
  }, [])

  const handleClose = (shouldRefresh = false) => {
    resetForm()
    if (typeof onClose === 'function') {
      onClose(shouldRefresh)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${
          isOpen ? 'bg-opacity-50 opacity-100' : 'bg-opacity-0 opacity-0 pointer-events-none'
        }`}
        onClick={() => handleClose(false)}
      />
      
      {/* Full Width Modal */}
      <div className={`fixed inset-0 bg-white z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } overflow-y-auto ${!isOpen ? 'pointer-events-none' : ''}`}>
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-8 py-5 flex items-center justify-between z-10 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Add Pro Forma Invoice</h2>
          <button
            onClick={() => handleClose(false)}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Type Selection */}
        <div className="px-8 py-4 border-b border-gray-200">
          <div className="flex space-x-4">
            <label className="flex items-center cursor-pointer group">
              <input
                type="radio"
                name="invoiceType"
                value="service"
                checked={invoiceType === 'service'}
                onChange={(e) => setInvoiceType(e.target.value)}
                className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-orange-600">Service</span>
            </label>
            <label className="flex items-center cursor-pointer group">
              {/* <input
                type="radio"
                name="invoiceType"
                value="package"
                checked={invoiceType === 'package'}
                onChange={(e) => setInvoiceType(e.target.value)}
                className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-orange-600">Package</span> */}
            </label>
            <label className="flex items-center cursor-pointer group">
              {/* <input
                type="radio"
                name="invoiceType"
                value="deal"
                checked={invoiceType === 'deal'}
                onChange={(e) => setInvoiceType(e.target.value)}
                className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-orange-600">Deal</span> */}
            </label>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-3 gap-8">
            {/* Left Column - Company/Client Info */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2">{organizationName}</h3>
                <p className="text-sm text-gray-600 whitespace-pre-line">
                  {organizationAddress || 'Organization address not available'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone
                </label>
                <p className="text-sm text-gray-600">{organizationPhone}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Name/Mobile Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => handleMemberInputChange(e.target.value)}
                    onFocus={handleMemberInputFocus}
                    onBlur={handleMemberInputBlur}
                    placeholder="Search by name or mobile"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  {(isMemberSearching || memberSearchResults.length > 0 || memberSearchError) && (
                    <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                      {isMemberSearching && (
                        <p className="px-4 py-3 text-sm text-gray-500">Searching...</p>
                      )}
                      {!isMemberSearching && memberSearchResults.map(member => (
                        <button
                          key={member._id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            handleMemberSelectFromSearch(member)
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-orange-50 focus:bg-orange-50 transition-colors"
                        >
                          <span className="block text-sm font-medium text-gray-900">
                            {`${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unnamed Member'}
                          </span>
                          <span className="block text-xs text-gray-500">{member.phone || 'No phone available'}</span>
                        </button>
                      ))}
                      {!isMemberSearching && memberSearchResults.length === 0 && memberSearchError && (
                        <p className="px-4 py-3 text-sm text-gray-500">{memberSearchError}</p>
                      )}
                    </div>
                  )}
                </div>
                {membersData?.members && (
                  <select
                    value={formData.memberId}
                    onChange={(e) => handleMemberSelect(e.target.value)}
                    className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  >
                    <option value="">Select Member</option>
                    {membersData.members.map(member => {
                      const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unnamed Member'
                      const email = member.email || 'No email'
                      const phone = member.phone || 'No phone'
                      return (
                        <option key={member._id} value={member._id}>
                          {`${fullName} - ${email} - ${phone}`}
                        </option>
                      )
                    })}
                  </select>
                )}
                {planInfo && (
                  <div className="mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 px-3 py-2 rounded">
                    <p><span className="font-semibold text-gray-900">Current Plan:</span> {planInfo.planName || 'N/A'}</p>
                    <p className="mt-1">Validity: {planInfo.startDate ? new Date(planInfo.startDate).toLocaleDateString() : 'N/A'} — {planInfo.endDate ? new Date(planInfo.endDate).toLocaleDateString() : 'N/A'}</p>
                    <p className={`mt-1 font-semibold ${planInfo.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                      Status: {planInfo.isActive ? 'Active' : 'Inactive / Expired'}
                    </p>
                  </div>
                )}
                {planWarning && (
                  <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
                    {planWarning}
                  </p>
                )}
              </div>
            </div>

            {/* Middle Column - Invoice Details */}
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Pro Forma Invoice</h3>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Invoice Date
                </label>
                <DateInput
                  name="invoiceDate"
                  value={formData.invoiceDate}
                  onChange={handleChange}
                  className="px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sales Rep
                </label>
                <select
                  name="salesRep"
                  value={formData.salesRep}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                >
                  <option value="">Select Sales Rep</option>
                  {staffData?.staff?.map((staff) => (
                    <option key={staff._id} value={staff._id}>
                      {staff.firstName} {staff.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Column - SAC Code */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                SAC Code:
              </label>
              <input
                type="text"
                name="sacCode"
                value={formData.sacCode}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
              />
            </div>
          </div>

          {/* Service Details Table */}
          <div className="mt-8 bg-gray-50 rounded-xl p-6 border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-4 font-bold text-gray-900">S.NO</th>
                    <th className="text-left py-3 px-4 font-bold text-gray-900">DESCRIPTION</th>
                    <th className="text-left py-3 px-4 font-bold text-gray-900">DURATION</th>
                    <th className="text-left py-3 px-4 font-bold text-gray-900">QUANTITY</th>
                    <th className="text-left py-3 px-4 font-bold text-gray-900 flex items-center justify-between">
                      SERVICE FEE
                      <button
                        type="button"
                        onClick={addItem}
                        className="ml-2 p-1 hover:bg-orange-100 rounded transition-all"
                      >
                        <Plus className="w-4 h-4 text-orange-500" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-4 px-4">{index + 1}</td>
                      <td className="py-4 px-4">
                        <div className="space-y-2 min-w-[300px]">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Select Service</label>
                            <select
                              value={item.selectedServiceId}
                              onChange={(e) => handleServiceSelect(index, e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm"
                            >
                              <option value="">Select Service</option>
                              {servicesData?.services?.map(service => (
                                <option key={service._id} value={service._id}>
                                  {service.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          {item.selectedServiceId && (
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Select Variation</label>
                              <ServiceVariationsDropdown
                                serviceId={item.selectedServiceId}
                                index={index}
                                value={item.serviceId}
                                onChange={(variationId) => handleVariationSelect(index, variationId)}
                              />
                            </div>
                          )}
                          {item.description && (
                            <div className="mt-2">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                placeholder="Description"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm"
                              />
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-gray-600">Start date:</label>
                            <DateInput
                              value={item.startDate}
                              onChange={(e) => handleItemChange(index, 'startDate', e.target.value)}
                              className="px-2 py-1"
                            />
                            </div>
                            <div>
                              <label className="text-gray-600">Expiry date:</label>
                            <DateInput
                              value={item.expiryDate}
                              onChange={(e) => handleItemChange(index, 'expiryDate', e.target.value)}
                              className="px-2 py-1"
                            />
                            </div>
                            <div>
                              <label className="text-gray-600">Number of sessions:</label>
                              <input
                                type="number"
                                value={item.numberOfSessions}
                                onChange={(e) => handleItemChange(index, 'numberOfSessions', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-gray-600">SAC Code:</label>
                              <input
                                type="text"
                                value={item.sacCode}
                                onChange={(e) => handleItemChange(index, 'sacCode', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <input
                          type="text"
                          value={item.duration}
                          onChange={(e) => handleItemChange(index, 'duration', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-2 min-w-[250px]">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                          />
                          <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-600">Discount:</label>
                            <input
                              type="number"
                              value={item.discount.value}
                              onChange={(e) => handleItemChange(index, 'discount.value', parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <select
                              value={item.discount.type}
                              onChange={(e) => handleItemChange(index, 'discount.type', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="percentage">%</option>
                              <option value="flat">₹</option>
                            </select>
                          </div>
                          <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-600">Tax:</label>
                            <select
                              value={item.taxType}
                              onChange={(e) => {
                                const taxType = e.target.value
                                handleItemChange(index, 'taxType', taxType)
                                if (taxType === 'No tax') {
                                  handleItemChange(index, 'taxRate', 0)
                                } else if (taxType === 'GST 18%') {
                                  handleItemChange(index, 'taxRate', 18)
                                } else if (taxType === 'GST 5%') {
                                  handleItemChange(index, 'taxRate', 5)
                                }
                              }}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="No tax">No tax</option>
                              <option value="GST 18%">GST 18%</option>
                              <option value="GST 5%">GST 5%</option>
                              <option value="GST 12%">GST 12%</option>
                              <option value="GST 28%">GST 28%</option>
                            </select>
                          </div>
                          <input
                            type="number"
                            value={((item.unitPrice || 0) * (item.quantity || 1) * (1 - (item.discount.type === 'percentage' ? (item.discount.value || 0) / 100 : 0)) - (item.discount.type === 'flat' ? (item.discount.value || 0) : 0)).toFixed(2)}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
                          />
                          {formData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="mt-1 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary and Payment Section */}
          <div className="mt-8 grid grid-cols-2 gap-8">
            {/* Left - Summary */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Summary of Charges</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-gray-700">Sub Total</label>
                    <input
                      type="number"
                      value={totals.subtotal.toFixed(2)}
                      readOnly
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 text-right"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-gray-700">Tax due</label>
                    <input
                      type="number"
                      value={totals.taxAmount.toFixed(2)}
                      readOnly
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 text-right"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-gray-700">Total Due</label>
                    <input
                      type="number"
                      value={totals.total.toFixed(2)}
                      readOnly
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 text-right font-bold"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-gray-700">Rounding</label>
                    <input
                      type="number"
                      value="0"
                      readOnly
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 text-right"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Payment and Notes */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">MODE OF PAYMENT</h3>
                <div className="space-y-3">
                  {formData.paymentModes.map((pm, index) => {
                    const hasAmount = parseFloat(pm.amount) > 0
                    const isMethodRequired = hasAmount && !pm.method
                    return (
                    <div key={index} className="flex items-center space-x-2">
                      <select
                        value={pm.method}
                        onChange={(e) => handlePaymentModeChange(index, 'method', e.target.value)}
                        className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white ${
                          isMethodRequired ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select Payment Method{isMethodRequired ? ' *' : ''}</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="upi">UPI</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                        <option value="razorpay">Razorpay</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        type="number"
                        value={pm.amount}
                        onChange={(e) => handlePaymentModeChange(index, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                      />
                      {pm.method === 'razorpay' && pm.amount > 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            // First create the invoice, then process payment
                            if (!formData.memberId) {
                              toast.error('Please select a member first')
                              return
                            }
                            
                            // Validate items
                            const validItems = formData.items.filter(item => item.serviceId && item.unitPrice > 0)
                            if (validItems.length === 0) {
                              toast.error('Please add at least one service with price')
                              return
                            }
                            
                            try {
                              // Calculate totals (same logic as handleSubmit)
                              let subtotal = 0
                              let totalTaxAmount = 0
                              
                              // Helper function to safely parse numbers
                              const safeParseFloat = (value, defaultValue = 0) => {
                                if (value === null || value === undefined || value === '') return defaultValue
                                const parsed = parseFloat(value)
                                return isNaN(parsed) ? defaultValue : parsed
                              }
                              
                              const processedItems = validItems.map(item => {
                                // Get original unitPrice (before any calculations)
                                const unitPrice = safeParseFloat(item.unitPrice, 0)
                                const quantity = safeParseFloat(item.quantity, 1)
                                
                                // Backend will recalculate, but we need to provide unitPrice
                                // Calculate for validation only
                                const amount = unitPrice * quantity
                                
                                let discountAmount = 0
                                if (item.discount && item.discount.value) {
                                  const discountValue = safeParseFloat(item.discount.value, 0)
                                  if (discountValue > 0) {
                                    if (item.discount.type === 'percentage') {
                                      discountAmount = (amount * discountValue) / 100
                                    } else {
                                      discountAmount = discountValue
                                    }
                                  }
                                }
                                
                                const itemAmount = Math.max(0, amount - discountAmount)
                                const taxRate = safeParseFloat(item.taxRate, 0)
                                const taxAmount = (itemAmount * taxRate) / 100
                                
                                // Validate before using toFixed
                                if (isNaN(unitPrice) || isNaN(quantity) || isNaN(itemAmount) || isNaN(taxAmount)) {
                                  throw new Error(`Invalid calculation for item: ${item.description || 'Unknown'}. Please check unit price, quantity, and tax rate.`)
                                }
                                
                                subtotal += itemAmount
                                totalTaxAmount += taxAmount
                                
                                // Ensure all values are valid numbers
                                const finalAmount = Number(itemAmount.toFixed(2))
                                const finalTaxAmount = Number(taxAmount.toFixed(2))
                                const finalTotal = Number((itemAmount + taxAmount).toFixed(2))
                                
                                if (isNaN(finalAmount) || isNaN(finalTaxAmount) || isNaN(finalTotal)) {
                                  throw new Error(`Invalid calculation result for item: ${item.description || 'Unknown'}`)
                                }
                                
                                return {
                                  serviceId: item.selectedServiceId || item.serviceId,
                                  description: item.description || '',
                                  quantity: Number(quantity),
                                  unitPrice: Number(unitPrice), // Backend needs original unitPrice to recalculate
                                  amount: finalAmount,
                                  taxAmount: finalTaxAmount,
                                  total: finalTotal,
                                  taxRate: Number(taxRate),
                                  taxType: item.taxType || 'No tax',
                                  startDate: item.startDate || undefined,
                                  expiryDate: item.expiryDate || undefined,
                                  numberOfSessions: item.numberOfSessions || undefined,
                                  sacCode: item.sacCode || undefined,
                                  discount: item.discount && safeParseFloat(item.discount.value, 0) > 0 ? item.discount : undefined
                                }
                              })
                              
                              // Ensure totals are valid numbers
                              subtotal = Number(subtotal.toFixed(2))
                              totalTaxAmount = Number(totalTaxAmount.toFixed(2))
                              const total = Number((subtotal + totalTaxAmount).toFixed(2))
                              
                              const otherPayments = formData.paymentModes
                                .filter(p => p.method && p.amount > 0 && p.method !== 'razorpay')
                                .reduce((sum, p) => {
                                  const amount = safeParseFloat(p.amount, 0)
                                  return sum + amount
                                }, 0)
                              const pending = Math.max(0, Number((total - otherPayments).toFixed(2)))
                              
                              // Validate all numeric values before sending
                              if (isNaN(subtotal) || isNaN(totalTaxAmount) || isNaN(total) || isNaN(pending)) {
                                console.error('Validation failed:', { subtotal, totalTaxAmount, total, pending })
                                throw new Error('Invalid calculation values. Please check your invoice items.')
                              }
                              
                              // Validate processed items
                              processedItems.forEach((item, index) => {
                                if (isNaN(item.amount) || isNaN(item.taxAmount) || isNaN(item.total)) {
                                  console.error(`Invalid item at index ${index}:`, item)
                                  throw new Error(`Invalid values in item ${index + 1}. Please check the item details.`)
                                }
                              })
                              
                              // Create invoice first (without Razorpay payment)
                              const taxRate = safeParseFloat(formData.items[0]?.taxRate, 0)
                              const invoiceData = {
                                memberId: formData.memberId,
                                type: 'pro-forma',
                                invoiceType,
                                isProForma: true,
                                items: processedItems,
                                subtotal: subtotal,
                                tax: {
                                  rate: taxRate,
                                  amount: totalTaxAmount
                                },
                                total: total,
                                pending: pending,
                                rounding: 0,
                                sacCode: formData.sacCode || undefined,
                                discountReason: formData.discountReason || undefined,
                                customerNotes: formData.customerNotes || undefined,
                                internalNotes: formData.internalNotes || undefined,
                                paymentModes: formData.paymentModes
                                  .filter(p => p.method && p.amount > 0 && p.method !== 'razorpay')
                                  .map(p => ({
                                    method: p.method,
                                    amount: safeParseFloat(p.amount, 0)
                                  })),
                                terms: formData.termsAndConditions || undefined,
                                status: 'draft'
                              }
                              
                              // Final validation before API call - ensure no NaN values
                              const validateInvoiceData = (data) => {
                                const checkValue = (value, path) => {
                                  if (typeof value === 'number' && isNaN(value)) {
                                    throw new Error(`NaN value found at ${path}`)
                                  }
                                  if (typeof value === 'object' && value !== null) {
                                    Object.keys(value).forEach(key => {
                                      checkValue(value[key], `${path}.${key}`)
                                    })
                                  }
                                  if (Array.isArray(value)) {
                                    value.forEach((item, index) => {
                                      checkValue(item, `${path}[${index}]`)
                                    })
                                  }
                                }
                                checkValue(data, 'invoiceData')
                              }
                              
                              try {
                                validateInvoiceData(invoiceData)
                              } catch (validationError) {
                                console.error('Invoice validation error:', validationError)
                                console.error('Invoice data:', invoiceData)
                                throw new Error(`Invalid invoice data: ${validationError.message}`)
                              }
                              
                              console.log('Invoice data being sent:', JSON.stringify(invoiceData, null, 2))
                              
                              // Create invoice via API
                              const createRes = await api.post('/invoices', invoiceData)
                              const createdInvoice = createRes.data.invoice
                              
                              // Get member data for payment modal
                              const memberRes = await getMemberApi(formData.memberId)
                              const member = memberRes.data.member
                              
                              // Prepare invoice data for payment modal with populated member
                              const invoiceForPayment = {
                                ...createdInvoice,
                                memberId: {
                                  _id: member._id,
                                  firstName: member.firstName,
                                  lastName: member.lastName,
                                  phone: member.phone,
                                  email: member.email
                                }
                              }
                              
                              setRazorpayInvoiceData(invoiceForPayment)
                              setShowRazorpayModal(true)
                            } catch (error) {
                              console.error('Error creating invoice:', error)
                              toast.error(error.response?.data?.message || 'Failed to create invoice. Please try again.')
                            }
                          }}
                          className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-1 text-sm font-medium"
                          title="Pay with Razorpay"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>Pay Now</span>
                        </button>
                      )}
                      {formData.paymentModes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePaymentMode(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {index === formData.paymentModes.length - 1 && (
                        <button
                          type="button"
                          onClick={addPaymentMode}
                          className="p-2 hover:bg-orange-100 rounded transition-all"
                        >
                          <Plus className="w-4 h-4 text-orange-500" />
                        </button>
                      )}
                    </div>
                    )
                  })}
                  <div className="flex justify-between items-center mt-4">
                    <label className="text-sm font-semibold text-gray-700">Pending</label>
                    <input
                      type="number"
                      value={totals.pending.toFixed(2)}
                      readOnly
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 text-right"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Discount Reason
                </label>
                <input
                  type="text"
                  name="discountReason"
                  value={formData.discountReason}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes for Customer: <span className="text-xs text-gray-500">(This will appear in the invoice copy)</span>
                </label>
                <textarea
                  name="customerNotes"
                  value={formData.customerNotes}
                  onChange={handleChange}
                  maxLength={240}
                  placeholder="Maximum 240 characters"
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">{formData.customerNotes.length}/240 characters</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Internal Notes:
                </label>
                <textarea
                  name="internalNotes"
                  value={formData.internalNotes}
                  onChange={handleChange}
                  maxLength={240}
                  placeholder="Maximum 240 characters"
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">{formData.internalNotes.length}/240 characters</p>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">TERMS AND CONDITIONS</h3>
            <textarea
              name="termsAndConditions"
              value={formData.termsAndConditions}
              onChange={handleChange}
              placeholder="Membership Privileges, Notices, Disclosure & Agreement..."
              rows="6"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none bg-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 px-8 py-5 -mx-8 -mb-8 shadow-lg flex justify-end space-x-3 mt-8">
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createInvoiceMutation.isLoading}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md flex items-center space-x-2"
            >
              {createInvoiceMutation.isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="text-white" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Razorpay Payment Modal */}
      {showRazorpayModal && razorpayInvoiceData && (
        <RazorpayPayment
          invoice={razorpayInvoiceData}
          onClose={() => {
            setShowRazorpayModal(false)
            setRazorpayInvoiceData(null)
          }}
          onSuccess={(payment) => {
            // Payment is already processed and invoice is created
            // Just close the modal and refresh
            setShowRazorpayModal(false)
            setRazorpayInvoiceData(null)
            queryClient.invalidateQueries(['invoices'])
            queryClient.invalidateQueries(['member-invoices'])
            onClose()
            toast.success('Payment processed successfully!')
          }}
        />
      )}
    </>
  )
}

