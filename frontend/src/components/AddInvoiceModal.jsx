import { useEffect, useRef, useState } from 'react'
import { X, Plus, Trash2, Search, CreditCard, FileText, AlertCircle, Loader2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import DateInput from './DateInput'
import RazorpayPayment from './RazorpayPayment'
import { getOrganizationDetails } from '../api/organization'
import { searchMembers as searchMembersApi, getMember as getMemberApi } from '../api/members'
import LoadingSpinner from './LoadingSpinner'

export default function AddInvoiceModal({
  isOpen,
  onClose,
  defaultMemberId,
  defaultMemberName,
  defaultMemberPhone
}) {
  const { user } = useAuthStore()
  const [formData, setFormData] = useState({
    invoiceDate: new Date().toISOString().split('T')[0],
    salesRep: '',
    memberId: '',
    memberName: '',
    memberPhone: '',
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
      numberOfSessions: ''
    }],
    discountReason: '',
    paymentModes: [{
      method: '',
      amount: 0
    }]
  })
  const [memberSearch, setMemberSearch] = useState('')
  const [memberSearchResults, setMemberSearchResults] = useState([])
  const [isMemberSearching, setIsMemberSearching] = useState(false)
  const [memberSearchError, setMemberSearchError] = useState('')
  const [activeInvoiceWarning, setActiveInvoiceWarning] = useState('')
  const [isCheckingActiveInvoice, setIsCheckingActiveInvoice] = useState(false)
  const [selectedMemberIndex, setSelectedMemberIndex] = useState(-1)
  const memberSearchBlurTimeout = useRef(null)
  const memberDropdownRef = useRef(null)
  const memberItemRefs = useRef({})
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
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm"
      >
        <option value="">Select Variation</option>
        {isLoading && <option disabled>Loading...</option>}
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

  const { data: organizationResponse } = useQuery({
    queryKey: ['organization-details'],
    queryFn: getOrganizationDetails,
    enabled: isOpen
  })

  const organization = organizationResponse?.organization

  // Check for active invoices when member is selected
  const checkActiveInvoice = async (memberId) => {
    if (!memberId) {
      setActiveInvoiceWarning('')
      return true
    }

    setIsCheckingActiveInvoice(true)
    setActiveInvoiceWarning('')
    
    try {
      const response = await api.get('/invoices', {
        params: {
          memberId,
          status: 'all'
        }
      })
      
      const invoices = response.data?.invoices || []
      const activeInvoice = invoices.find(inv => 
        inv.status !== 'cancelled' && inv.status !== 'refunded'
      )

      if (activeInvoice) {
        setActiveInvoiceWarning(
          `This member already has an active invoice (${activeInvoice.invoiceNumber}) with status "${activeInvoice.status}". Only one active invoice per client is allowed.`
        )
        setIsCheckingActiveInvoice(false)
        return false
      }
      
      setIsCheckingActiveInvoice(false)
      return true
    } catch (error) {
      console.error('Error checking active invoice:', error)
      setIsCheckingActiveInvoice(false)
      return true // Allow proceeding if check fails
    }
  }

  const handleMemberInputChange = async (value) => {
    if (value !== memberSearch && formData.memberId) {
      setFormData(prev => ({
        ...prev,
        memberId: '',
        memberName: '',
        memberPhone: ''
      }))
      setActiveInvoiceWarning('')
    }
    setMemberSearch(value)
    setMemberSearchError('')
    setSelectedMemberIndex(-1) // Reset selected index when search changes
 
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
    
    const canProceed = await checkActiveInvoice(member._id)
    if (!canProceed) {
      setFormData(prev => ({
        ...prev,
        memberId: '',
        memberName: '',
        memberPhone: ''
      }))
      setMemberSearch('')
      setMemberSearchResults([])
      setSelectedMemberIndex(-1)
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
    setSelectedMemberIndex(-1)
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
      setSelectedMemberIndex(-1)
    }, 150)
  }

  const handleMemberInputKeyDown = (e) => {
    if (!memberSearchResults.length || isMemberSearching) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedMemberIndex(prev => 
        prev < memberSearchResults.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedMemberIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter' && selectedMemberIndex >= 0) {
      e.preventDefault()
      const selectedMember = memberSearchResults[selectedMemberIndex]
      if (selectedMember) {
        handleMemberSelectFromSearch(selectedMember)
      }
    } else if (e.key === 'Escape') {
      setMemberSearchResults([])
      setSelectedMemberIndex(-1)
    }
  }

  const createInvoiceMutation = useMutation({
    mutationFn: (data) => api.post('/invoices', data),
    onSuccess: () => {
      toast.success('Invoice created successfully')
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
        numberOfSessions: ''
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
    setActiveInvoiceWarning('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate member selection
    if (!formData.memberId) {
      toast.error('Please select a member')
      return
    }

    // Check for active invoice before submission
    const canProceed = await checkActiveInvoice(formData.memberId)
    if (!canProceed) {
      toast.error('Cannot create invoice: Member already has an active invoice')
      return
    }

    // Validate items - must have service and variation selected
    const validItems = formData.items.filter(item => 
      item.selectedServiceId && item.serviceId && item.unitPrice > 0
    )
    if (validItems.length === 0) {
      toast.error('Please add at least one service item with a selected variation')
      return
    }

    // Validate payment method
    const validPaymentModes = formData.paymentModes.filter(pm => 
      pm.method && parseFloat(pm.amount) > 0
    )
    if (validPaymentModes.length === 0) {
      toast.error('Please add at least one payment method with amount')
      return
    }

    // Calculate totals
    let subtotal = 0
    let totalTaxAmount = 0
    const processedItems = validItems.map(item => {
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
    
    if (total <= 0) {
      toast.error('Invoice total must be greater than 0')
      return
    }

    const totalPaid = validPaymentModes.reduce((sum, pm) => sum + (parseFloat(pm.amount) || 0), 0)
    const pending = Math.max(0, total - totalPaid)

    const invoiceData = {
      memberId: formData.memberId,
      type: 'pro-forma',
      invoiceType: 'service',
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
      discountReason: formData.discountReason || undefined,
      paymentModes: validPaymentModes,
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
        numberOfSessions: ''
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
  }

  const handleVariationSelect = async (index, variationId) => {
    const selectedServiceId = formData.items[index]?.selectedServiceId
    if (!selectedServiceId || !variationId) {
      handleItemChange(index, 'serviceId', '')
      handleItemChange(index, 'description', '')
      handleItemChange(index, 'unitPrice', 0)
      handleItemChange(index, 'taxRate', 0)
      return
    }

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
    
    return { subtotal, taxAmount, total, pending }
  }

  const totals = calculateTotals()

  // Check if all required fields are filled
  const isFormValid = () => {
    // Check member
    if (!formData.memberId) return false

    // Check items - must have at least one item with service and variation
    const hasValidItem = formData.items.some(item => 
      item.selectedServiceId && item.serviceId && item.unitPrice > 0
    )
    if (!hasValidItem) return false

    // Check payment method - must have at least one payment mode with method and amount
    const hasValidPayment = formData.paymentModes.some(pm => 
      pm.method && parseFloat(pm.amount) > 0
    )
    if (!hasValidPayment) return false

    return true
  }

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
      checkActiveInvoice(defaultMemberId)
    }
  }, [isOpen, defaultMemberId, defaultMemberName, defaultMemberPhone])

  useEffect(() => () => {
    if (memberSearchBlurTimeout.current) {
      clearTimeout(memberSearchBlurTimeout.current)
    }
  }, [])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedMemberIndex >= 0 && memberItemRefs.current[selectedMemberIndex]) {
      memberItemRefs.current[selectedMemberIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
    }
  }, [selectedMemberIndex])

  const handleClose = (shouldRefresh = false) => {
    resetForm()
    if (typeof onClose === 'function') {
      onClose(shouldRefresh)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={() => handleClose(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          margin: 0,
          padding: 0,
          width: '100vw',
          height: '100vh'
        }}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-6 rounded-t-2xl flex items-center justify-between z-10">
            <div>
              <h2 className="text-2xl font-bold">Create Invoice</h2>
              <p className="text-sm text-orange-100 mt-1">Fill in the details to create a new invoice</p>
            </div>
            <button
              onClick={() => handleClose(false)}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Loading Overlay */}
          {createInvoiceMutation.isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center rounded-2xl">
              <div className="flex flex-col items-center space-y-4">
                <LoadingSpinner size="lg" />
                <p className="text-gray-600 font-semibold">Creating invoice...</p>
              </div>
            </div>
          )}

          {/* Form Content */}
          <form id="invoice-create-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
            <div className="space-y-8">
              {/* Member Selection */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-orange-500" />
                  Client Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Search Member <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={(e) => handleMemberInputChange(e.target.value)}
                        onKeyDown={handleMemberInputKeyDown}
                        onFocus={handleMemberInputFocus}
                        onBlur={handleMemberInputBlur}
                        placeholder="Search by name or phone number"
                        className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                      />
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      {(isMemberSearching || memberSearchResults.length > 0 || memberSearchError) && (
                        <div 
                          ref={memberDropdownRef}
                          className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto"
                        >
                          {isMemberSearching && (
                            <div className="px-4 py-3 text-sm text-gray-500 flex items-center">
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Searching...
                            </div>
                          )}
                          {!isMemberSearching && memberSearchResults.map((member, index) => (
                            <button
                              key={member._id}
                              ref={(el) => {
                                if (el) memberItemRefs.current[index] = el
                              }}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                handleMemberSelectFromSearch(member)
                              }}
                              className={`w-full px-4 py-3 text-left transition-colors border-b border-gray-100 last:border-b-0 ${
                                index === selectedMemberIndex 
                                  ? 'bg-orange-100 border-orange-200' 
                                  : 'hover:bg-orange-50 focus:bg-orange-50'
                              }`}
                            >
                              <span className="block text-sm font-medium text-gray-900">
                                {`${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unnamed Member'}
                              </span>
                              <span className="block text-xs text-gray-500 mt-1">{member.phone || 'No phone'}</span>
                            </button>
                          ))}
                          {!isMemberSearching && memberSearchResults.length === 0 && memberSearchError && (
                            <p className="px-4 py-3 text-sm text-gray-500">{memberSearchError}</p>
                          )}
                        </div>
                      )}
                    </div>
                    {isCheckingActiveInvoice && (
                      <div className="mt-2 flex items-center text-sm text-gray-600">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Checking for active invoices...
                      </div>
                    )}
                    {activeInvoiceWarning && (
                      <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{activeInvoiceWarning}</p>
                      </div>
                    )}
                    {formData.memberId && !activeInvoiceWarning && (
                      <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700 font-medium">
                          ✓ Member selected: {formData.memberName} ({formData.memberPhone})
                        </p>
                      </div>
                    )}
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
                      Sales Representative
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
              </div>

              {/* Service Items */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-orange-500" />
                    Service Items
                  </h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all text-sm font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Service</label>
                          <select
                            value={item.selectedServiceId}
                            onChange={(e) => handleServiceSelect(index, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm"
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
                          <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Variation</label>
                            <ServiceVariationsDropdown
                              serviceId={item.selectedServiceId}
                              index={index}
                              value={item.serviceId}
                              onChange={(variationId) => handleVariationSelect(index, variationId)}
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Unit Price (₹)</label>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Discount</label>
                          <div className="flex space-x-2">
                            <input
                              type="number"
                              value={item.discount.value}
                              onChange={(e) => handleItemChange(index, 'discount.value', parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm"
                            />
                            <select
                              value={item.discount.type}
                              onChange={(e) => handleItemChange(index, 'discount.type', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm"
                            >
                              <option value="percentage">%</option>
                              <option value="flat">₹</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Tax</label>
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
                              } else if (taxType === 'GST 12%') {
                                handleItemChange(index, 'taxRate', 12)
                              } else if (taxType === 'GST 28%') {
                                handleItemChange(index, 'taxRate', 28)
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm"
                          >
                            <option value="No tax">No tax</option>
                            <option value="GST 18%">GST 18%</option>
                            <option value="GST 5%">GST 5%</option>
                            <option value="GST 12%">GST 12%</option>
                            <option value="GST 28%">GST 28%</option>
                          </select>
                        </div>

                        <div className="md:col-span-2 grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                            <DateInput
                              value={item.startDate}
                              onChange={(e) => handleItemChange(index, 'startDate', e.target.value)}
                              className="px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Expiry Date</label>
                            <DateInput
                              value={item.expiryDate}
                              onChange={(e) => handleItemChange(index, 'expiryDate', e.target.value)}
                              className="px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {formData.items.length > 1 && (
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:text-red-700 flex items-center space-x-1 text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Remove</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary and Payment */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Summary */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-700">Subtotal</span>
                      <span className="text-sm font-semibold text-gray-900">₹{totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-700">Tax</span>
                      <span className="text-sm font-semibold text-gray-900">₹{totals.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-t-2 border-gray-300">
                      <span className="text-base font-bold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-orange-600">₹{totals.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-medium text-gray-700">Pending</span>
                      <span className="text-sm font-semibold text-gray-900">₹{totals.pending.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Modes */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Payment</h3>
                    <button
                      type="button"
                      onClick={addPaymentMode}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add</span>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.paymentModes.map((pm, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <select
                          value={pm.method}
                          onChange={(e) => handlePaymentModeChange(index, 'method', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm"
                        >
                          <option value="">Select Method</option>
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
                          placeholder="Amount"
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm"
                        />
                        {formData.paymentModes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePaymentMode(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </form>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 px-8 py-5 rounded-b-2xl flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="invoice-create-form"
              disabled={createInvoiceMutation.isLoading || !!activeInvoiceWarning || !isFormValid()}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md flex items-center space-x-2"
            >
              {createInvoiceMutation.isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="text-white" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Invoice</span>
              )}
            </button>
          </div>
        </div>
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
