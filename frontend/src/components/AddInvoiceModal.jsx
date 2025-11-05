import { useState } from 'react'
import { X, Calendar, Plus, Trash2, Search } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

export default function AddInvoiceModal({ isOpen, onClose }) {
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

  const queryClient = useQueryClient()

  // Fetch plans/services
  const { data: plansData } = useQuery({
    queryKey: ['plans-list'],
    queryFn: () => api.get('/plans').then(res => res.data),
    enabled: isOpen
  })

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

  const createInvoiceMutation = useMutation({
    mutationFn: (data) => api.post('/invoices', data),
    onSuccess: () => {
      toast.success('Pro Forma Invoice created successfully')
      queryClient.invalidateQueries(['invoices'])
      queryClient.invalidateQueries(['dashboard-stats'])
      onClose()
      resetForm()
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
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.memberId) {
      toast.error('Please select a member')
      return
    }

    if (formData.items.length === 0 || formData.items.some(item => !item.description || !item.unitPrice)) {
      toast.error('Please add at least one service with description and price')
      return
    }

    // Calculate totals
    let subtotal = 0
    let totalTaxAmount = 0
    const processedItems = formData.items.map(item => {
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

  const handleMemberSelect = (memberId) => {
    const member = membersData?.members?.find(m => m._id === memberId)
    if (member) {
      setFormData(prev => ({
        ...prev,
        memberId: member._id,
        memberName: `${member.firstName} ${member.lastName}`,
        memberPhone: member.phone
      }))
    }
  }

  const handleServiceSelect = (index, serviceId) => {
    const service = plansData?.plans?.find(p => p._id === serviceId)
    if (service) {
      handleItemChange(index, 'serviceId', serviceId)
      handleItemChange(index, 'description', service.name)
      handleItemChange(index, 'unitPrice', service.price)
      handleItemChange(index, 'taxRate', service.taxRate || 0)
    }
  }

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0
    let taxAmount = 0
    
    formData.items.forEach(item => {
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
      const itemTax = itemAmount * (item.taxRate || 0) / 100
      subtotal += itemAmount
      taxAmount += itemTax
    })
    
    const total = subtotal + taxAmount
    const totalPaid = formData.paymentModes.reduce((sum, pm) => sum + (parseFloat(pm.amount) || 0), 0)
    const pending = total - totalPaid
    
    return { subtotal, taxAmount, total, pending }
  }

  const totals = calculateTotals()

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${
          isOpen ? 'bg-opacity-50 opacity-100' : 'bg-opacity-0 opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Full Width Modal */}
      <div className={`fixed inset-0 bg-white z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } overflow-y-auto ${!isOpen ? 'pointer-events-none' : ''}`}>
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-8 py-5 flex items-center justify-between z-10 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Add Pro Forma Invoice</h2>
          <button
            onClick={onClose}
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
              <input
                type="radio"
                name="invoiceType"
                value="package"
                checked={invoiceType === 'package'}
                onChange={(e) => setInvoiceType(e.target.value)}
                className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-orange-600">Package</span>
            </label>
            <label className="flex items-center cursor-pointer group">
              <input
                type="radio"
                name="invoiceType"
                value="deal"
                checked={invoiceType === 'deal'}
                onChange={(e) => setInvoiceType(e.target.value)}
                className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-orange-600">Deal</span>
            </label>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-3 gap-8">
            {/* Left Column - Company/Client Info */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2">AIRFIT</h3>
                <p className="text-sm text-gray-600">
                  2nd floor, 1886, 5th main, 8th cross, HAL 3rd Stage, 3rd stage, New Tippasandra, Bengaluru, Karnataka 560075
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone
                </label>
                <p className="text-sm text-gray-600">{user?.organizationPhone || 'N/A'}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Name/Mobile Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.memberName || formData.memberPhone}
                    onChange={(e) => {
                      const value = e.target.value
                      setFormData(prev => ({
                        ...prev,
                        memberName: value,
                        memberPhone: value
                      }))
                    }}
                    placeholder="Name/Mobile Number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                </div>
                {membersData?.members && (
                  <select
                    value={formData.memberId}
                    onChange={(e) => handleMemberSelect(e.target.value)}
                    className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  >
                    <option value="">Select Member</option>
                    {membersData.members.map(member => (
                      <option key={member._id} value={member._id}>
                        {member.firstName} {member.lastName} - {member.phone}
                      </option>
                    ))}
                  </select>
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
                <div className="relative">
                  <input
                    type="date"
                    name="invoiceDate"
                    value={formData.invoiceDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                </div>
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
                          <div className="relative">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              placeholder="Select service"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white pr-8"
                            />
                            <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          </div>
                          {plansData?.plans && (
                            <select
                              value={item.serviceId}
                              onChange={(e) => handleServiceSelect(index, e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm"
                            >
                              <option value="">Select Service</option>
                              {plansData.plans.map(plan => (
                                <option key={plan._id} value={plan._id}>{plan.name}</option>
                              ))}
                            </select>
                          )}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-gray-600">Start date:</label>
                              <input
                                type="date"
                                value={item.startDate}
                                onChange={(e) => handleItemChange(index, 'startDate', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-gray-600">Expiry date:</label>
                              <input
                                type="date"
                                value={item.expiryDate}
                                onChange={(e) => handleItemChange(index, 'expiryDate', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded mt-1"
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
                  {formData.paymentModes.map((pm, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <select
                        value={pm.method}
                        onChange={(e) => handlePaymentModeChange(index, 'method', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                      >
                        <option value="">Select</option>
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
                  ))}
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
              onClick={onClose}
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
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

