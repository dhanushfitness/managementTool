import { useState, useEffect } from 'react'
import { X, Loader2, TrendingUp, Calculator, Calendar, DollarSign, AlertCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { calculateUpgradeProration, upgradeMembership } from '../api/members'
import api from '../api/axios'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import DateInput from './DateInput'

export default function UpgradeMembershipModal({ isOpen, onClose, member }) {
  const queryClient = useQueryClient()
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [upgradeDetails, setUpgradeDetails] = useState(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [paymentModes, setPaymentModes] = useState([{ method: '', amount: '' }])
  const [discount, setDiscount] = useState({ type: 'flat', value: 0 })
  const [customerNotes, setCustomerNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [upgradeStartDate, setUpgradeStartDate] = useState('')

  // Fetch available plans
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans', { params: { isActive: 'true' } }).then(res => res.data),
    enabled: isOpen
  })

  // Early return after all hooks (React Rules of Hooks)
  if (!isOpen) return null

  const plans = plansData?.plans || []
  const currentPlanId = member?.currentPlan?.planId?._id || member?.currentPlan?.planId
  const currentPlan = member?.currentPlan
  const currentPlanPrice = currentPlan?.planId?.price || 0
  
  // Only show plans with higher price than current plan (upgrade only)
  const availablePlans = plans.filter(plan => 
    plan._id !== currentPlanId && (plan.price || 0) > currentPlanPrice
  )

  // Calculate proration when plan is selected
  useEffect(() => {
    if (selectedPlanId && member?._id && currentPlanId) {
      const selectedPlan = plans.find(p => p._id === selectedPlanId)
      // Validate it's an upgrade (higher price)
      if (selectedPlan && (selectedPlan.price || 0) <= currentPlanPrice) {
        toast.error('Please select a plan with higher price than current plan')
        setSelectedPlanId('')
        setUpgradeDetails(null)
        return
      }
      
      setIsCalculating(true)
      calculateUpgradeProration(member._id, selectedPlanId)
        .then(res => {
          if (res.data.success) {
            setUpgradeDetails(res.data.upgradeDetails)
            const upgradeAmount = res.data.upgradeDetails.proration.upgradeAmount
            setPaymentModes([{ method: '', amount: upgradeAmount > 0 ? upgradeAmount.toFixed(2) : '' }])
          }
        })
        .catch(err => {
          console.error('Failed to calculate proration:', err)
          toast.error(err.response?.data?.message || 'Failed to calculate upgrade details')
          setUpgradeDetails(null)
        })
        .finally(() => setIsCalculating(false))
    } else {
      setUpgradeDetails(null)
    }
  }, [selectedPlanId, member?._id, currentPlanId, plans, currentPlanPrice])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPlanId('')
      setUpgradeDetails(null)
      setPaymentModes([{ method: '', amount: '' }])
      setDiscount({ type: 'flat', value: 0 })
      setCustomerNotes('')
      setInternalNotes('')
      setUpgradeStartDate('')
    }
  }, [isOpen])

  // Set default start date when upgrade details are calculated
  useEffect(() => {
    if (upgradeDetails && !upgradeStartDate) {
      // Default to day after current plan expires
      const currentEndDate = new Date(upgradeDetails.currentPlan.endDate)
      currentEndDate.setDate(currentEndDate.getDate() + 1)
      setUpgradeStartDate(currentEndDate.toISOString().split('T')[0])
    }
  }, [upgradeDetails, upgradeStartDate])

  const upgradeMutation = useMutation({
    mutationFn: (data) => upgradeMembership(member._id, data),
    onSuccess: (response) => {
      toast.success('Upgrade invoice created successfully! The new plan will activate automatically once the current plan expires.')
      queryClient.invalidateQueries(['member', member._id])
      queryClient.invalidateQueries(['member-invoices', member._id])
      queryClient.invalidateQueries(['member-invoices-payments', member._id])
      onClose()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create upgrade invoice')
    }
  })

  const handlePaymentMethodChange = (index, field, value) => {
    const updated = [...paymentModes]
    updated[index] = { ...updated[index], [field]: value }
    setPaymentModes(updated)
  }

  const addPaymentMode = () => {
    setPaymentModes([...paymentModes, { method: '', amount: '' }])
  }

  const removePaymentMode = (index) => {
    if (paymentModes.length > 1) {
      setPaymentModes(paymentModes.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!selectedPlanId) {
      toast.error('Please select a plan to upgrade to')
      return
    }

    if (!upgradeDetails) {
      toast.error('Please wait for upgrade calculation to complete')
      return
    }

    // Validate payment modes
    const validPaymentModes = paymentModes
      .filter(pm => pm.method && pm.amount && parseFloat(pm.amount) > 0)
      .map(pm => ({
        method: pm.method,
        amount: parseFloat(pm.amount)
      }))

    if (validPaymentModes.length === 0 && upgradeDetails.proration.upgradeAmount > 0) {
      toast.error('Please add at least one payment method')
      return
    }

    const totalPaid = validPaymentModes.reduce((sum, pm) => sum + pm.amount, 0)
    const upgradeAmount = upgradeDetails.proration.upgradeAmount

    if (totalPaid < upgradeAmount) {
      toast.error(`Total payment (₹${totalPaid.toFixed(2)}) is less than upgrade amount (₹${upgradeAmount.toFixed(2)})`)
      return
    }

    if (!upgradeStartDate) {
      toast.error('Please select an upgrade start date')
      return
    }

    upgradeMutation.mutate({
      newPlanId: selectedPlanId,
      paymentModes: validPaymentModes,
      discount: discount.value > 0 ? discount : undefined,
      customerNotes: customerNotes || undefined,
      internalNotes: internalNotes || undefined,
      startDate: upgradeStartDate
    })
  }

  // Check if member has a valid current plan - show error modal if not
  if (!member || !currentPlan || !currentPlanId) {
    return (
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          margin: 0,
          padding: '1rem',
          width: '100vw',
          height: '100vh',
          zIndex: 9999
        }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md z-10">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl font-bold text-gray-900">No Active Plan</h2>
          </div>
          <p className="text-gray-600 mb-4">
            This member does not have an active plan to upgrade from. Please enroll them in a plan first.
          </p>
          <button
            onClick={onClose}
            className="w-full px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        margin: 0,
        padding: '1rem',
        width: '100vw',
        height: '100vh',
        zIndex: 9999
      }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{ top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-6 h-6 text-green-500" />
            <h2 className="text-2xl font-bold text-gray-900">
              Upgrade Membership
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-0">
          <div className="space-y-6 py-6">
            {/* Current Plan Info */}
            {currentPlan && (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Current Plan</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Plan Name</p>
                    <p className="font-semibold text-gray-900">
                      {currentPlan.planName || currentPlan.planId?.name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Price</p>
                    <p className="font-semibold text-gray-900">
                      ₹{currentPlan.planId?.price || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Start Date</p>
                    <p className="font-semibold text-gray-900">
                      {currentPlan.startDate ? dayjs(currentPlan.startDate).format('DD-MM-YYYY') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">End Date</p>
                    <p className="font-semibold text-gray-900">
                      {currentPlan.endDate ? dayjs(currentPlan.endDate).format('DD-MM-YYYY') : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Plan Selection */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Plan to Upgrade To <span className="text-red-500">*</span>
              </label>
              {availablePlans.length === 0 && !plansLoading ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    No upgrade plans available. All available plans have the same or lower price than the current plan.
                  </p>
                </div>
              ) : (
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  disabled={plansLoading || isCalculating}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                  required
                >
                  <option value="">Select a plan to upgrade to...</option>
                  {plansLoading && <option disabled>Loading plans...</option>}
                  {!plansLoading && availablePlans.map(plan => (
                    <option key={plan._id} value={plan._id}>
                      {plan.name} - ₹{plan.price}
                      {plan.duration && ` (${plan.duration.value} ${plan.duration.unit})`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Upgrade Details */}
            {isCalculating && (
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 flex items-center space-x-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <p className="text-blue-700 font-medium">Calculating upgrade details...</p>
              </div>
            )}

            {upgradeDetails && !isCalculating && (
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                <div className="flex items-center space-x-2 mb-4">
                  <Calculator className="w-5 h-5 text-orange-600" />
                  <h3 className="text-lg font-bold text-gray-900">Upgrade Calculation</h3>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> An invoice will be created for this upgrade. The new plan will automatically activate once your current plan expires on {dayjs(upgradeDetails.currentPlan.endDate).format('DD-MM-YYYY')}.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">New Plan</p>
                    <p className="font-bold text-gray-900">{upgradeDetails.newPlan.name}</p>
                    <p className="text-sm text-gray-600">₹{upgradeDetails.newPlan.price}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Remaining Days</p>
                    <p className="font-bold text-gray-900">{upgradeDetails.currentPlan.remainingDays} days</p>
                    <p className="text-sm text-gray-600">of {upgradeDetails.currentPlan.totalDays} total</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Credit Amount</p>
                    <p className="font-bold text-green-600">₹{upgradeDetails.proration.creditAmount.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Unused portion of current plan</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Upgrade Amount</p>
                    <p className="font-bold text-orange-600 text-lg">₹{upgradeDetails.proration.upgradeAmount.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Amount to pay</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 mt-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <p className="text-sm font-semibold text-gray-700">New End Date</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {dayjs(upgradeDetails.newPlan.newEndDate).format('DD-MM-YYYY')}
                  </p>
                </div>
              </div>
            )}

            {/* Start Date Selection */}
            {upgradeDetails && !isCalculating && (
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Upgrade Start Date <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Select when the upgrade should start (default: day after current plan expires on {dayjs(upgradeDetails.currentPlan.endDate).format('DD-MM-YYYY')})
                </p>
                <DateInput
                  value={upgradeStartDate}
                  onChange={(date) => {
                    if (date) {
                      setUpgradeStartDate(date)
                      // Recalculate end date based on new start date
                      const newStart = new Date(date)
                      const newEnd = new Date(newStart)
                      const selectedPlan = plans.find(p => p._id === selectedPlanId)
                      if (selectedPlan?.type === 'duration' && selectedPlan?.duration) {
                        const { value, unit } = selectedPlan.duration
                        switch (unit) {
                          case 'days':
                            newEnd.setDate(newEnd.getDate() + value)
                            break
                          case 'weeks':
                            newEnd.setDate(newEnd.getDate() + (value * 7))
                            break
                          case 'months':
                            newEnd.setMonth(newEnd.getMonth() + value)
                            break
                          case 'years':
                            newEnd.setFullYear(newEnd.getFullYear() + value)
                            break
                        }
                      }
                      // Update upgrade details with new dates
                      setUpgradeDetails({
                        ...upgradeDetails,
                        newPlan: {
                          ...upgradeDetails.newPlan,
                          newEndDate: newEnd.toISOString()
                        }
                      })
                    }
                  }}
                  minDate={dayjs(upgradeDetails.currentPlan.endDate).add(1, 'day').format('YYYY-MM-DD')}
                  className="w-full"
                />
              </div>
            )}

            {/* Payment Modes */}
            {upgradeDetails && upgradeDetails.proration.upgradeAmount > 0 && (
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Payment Methods</h3>
                  <button
                    type="button"
                    onClick={addPaymentMode}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    + Add Payment
                  </button>
                </div>
                <div className="space-y-3">
                  {paymentModes.map((pm, index) => (
                    <div key={index} className="flex gap-3">
                      <select
                        value={pm.method}
                        onChange={(e) => handlePaymentMethodChange(index, 'method', e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                        required={index === 0}
                      >
                        <option value="">Select method...</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="upi">UPI</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="razorpay">Razorpay (Online)</option>
                      </select>
                      <input
                        type="number"
                        value={pm.amount}
                        onChange={(e) => handlePaymentMethodChange(index, 'amount', e.target.value)}
                        placeholder="Amount"
                        step="0.01"
                        min="0"
                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required={index === 0}
                      />
                      {paymentModes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePaymentMode(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Discount (Optional) */}
            {upgradeDetails && (
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Discount (Optional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={discount.type}
                    onChange={(e) => setDiscount({ ...discount, type: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  >
                    <option value="flat">Flat Amount</option>
                    <option value="percentage">Percentage</option>
                  </select>
                  <input
                    type="number"
                    value={discount.value}
                    onChange={(e) => setDiscount({ ...discount, value: parseFloat(e.target.value) || 0 })}
                    placeholder={discount.type === 'flat' ? 'Amount' : 'Percentage'}
                    step="0.01"
                    min="0"
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            {upgradeDetails && (
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Notes (Optional)</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Customer Notes</label>
                    <textarea
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Notes visible to customer..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Internal Notes</label>
                    <textarea
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Internal notes (not visible to customer)..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end space-x-3 -mx-6 -mb-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedPlanId || isCalculating || upgradeMutation.isLoading || !upgradeDetails}
              className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {upgradeMutation.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  <span>Create Upgrade Invoice</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

