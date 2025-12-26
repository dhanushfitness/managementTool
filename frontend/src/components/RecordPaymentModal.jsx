import { useState } from 'react'
import { X, DollarSign, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPayment } from '../api/payments'
import toast from 'react-hot-toast'

export default function RecordPaymentModal({ invoice, isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'cash'
  })

  const queryClient = useQueryClient()

  const calculatePendingAmount = () => {
    const total = invoice?.total || 0
    const paidAmount = invoice?.totalPaid || 0
    return Math.max(0, total - paidAmount)
  }

  const pendingAmount = calculatePendingAmount()

  const paymentMutation = useMutation({
    mutationFn: (data) => createPayment(data),
    onSuccess: () => {
      toast.success('Payment recorded successfully')
      queryClient.invalidateQueries(['member-invoices-payments'])
      queryClient.invalidateQueries(['member-invoices'])
      queryClient.invalidateQueries(['pending-collections'])
      queryClient.invalidateQueries(['dashboard-stats'])
      onClose()
      if (onSuccess) onSuccess()
      // Reset form
      setFormData({
        amount: '',
        paymentMethod: 'cash'
      })
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to record payment')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const amount = parseFloat(formData.amount)
    
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    if (amount > pendingAmount) {
      toast.error(`Payment amount cannot exceed pending amount of ₹${pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      return
    }

    const paymentData = {
      invoiceId: invoice._id,
      amount: amount,
      paymentMethod: formData.paymentMethod
    }

    paymentMutation.mutate(paymentData)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={onClose}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
                <p className="text-sm text-gray-600">Invoice #{invoice?.invoiceNumber || invoice?._id?.slice(-8)}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4" style={{ marginTop: 0, paddingTop: 0 }}>
            {/* Invoice Summary */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200" style={{ marginTop: 0 }}>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Total Amount</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(invoice?.total || 0)}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Paid Amount</p>
                  <p className="font-semibold text-green-600">{formatCurrency(invoice?.totalPaid || 0)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-600 mb-1">Pending Amount</p>
                  <p className="font-semibold text-lg text-red-600">{formatCurrency(pendingAmount)}</p>
                </div>
              </div>
            </div>

            {/* Payment Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder={`Max: ${formatCurrency(pendingAmount)}`}
                step="0.01"
                min="0"
                max={pendingAmount}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Enter amount up to pending amount</p>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={paymentMutation.isLoading}
                className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {paymentMutation.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <span>Record Payment</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

