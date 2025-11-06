import { useState } from 'react'
import { X, Calendar, Upload } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

export default function AddExpenseModal({ isOpen, onClose }) {
  const { user } = useAuthStore()
  const [formData, setFormData] = useState({
    voucherDate: new Date().toISOString().split('T')[0],
    voucherNumber: '',
    category: '',
    paidTo: '',
    paidTowards: '',
    amount: '',
    amountInWords: '',
    paymentSource: '',
    paymentMode: 'cash',
    attachment: null
  })

  const queryClient = useQueryClient()

  const createExpenseMutation = useMutation({
    mutationFn: (data) => api.post('/expenses', data),
    onSuccess: () => {
      toast.success('Expense created successfully')
      queryClient.invalidateQueries(['expenses'])
      queryClient.invalidateQueries(['dashboard-stats'])
      onClose()
      // Reset form
      setFormData({
        voucherDate: new Date().toISOString().split('T')[0],
        voucherNumber: '',
        category: '',
        paidTo: '',
        paidTowards: '',
        amount: '',
        amountInWords: '',
        paymentSource: '',
        paymentMode: 'cash',
        attachment: null
      })
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create expense')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const expenseData = {
      voucherDate: formData.voucherDate,
      voucherNumber: formData.voucherNumber || undefined,
      category: formData.category,
      paidTo: formData.paidTo,
      paidTowards: formData.paidTowards || undefined,
      amount: parseFloat(formData.amount),
      amountInWords: formData.amountInWords || undefined,
      paymentSource: formData.paymentSource || undefined,
      paymentMode: formData.paymentMode,
      attachment: formData.attachment || undefined
    }

    createExpenseMutation.mutate(expenseData)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAttachmentUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          attachment: {
            name: file.name,
            url: reader.result
          }
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${
          isOpen ? 'bg-opacity-50 opacity-100' : 'bg-opacity-0 opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Slide-in Form */}
      <div className={`fixed right-0 top-0 h-full w-3/4 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } overflow-y-auto ${!isOpen ? 'pointer-events-none' : ''}`}>
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-8 py-5 flex items-center justify-between z-10 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Add Expense</h2>
            <p className="text-sm text-gray-500 mt-1">Fill in the expense details</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Company/Branch Info */}
          <div className="bg-red-600 text-white rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                <span className="text-red-600 font-bold text-xl">A</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">AIRFIT LUXURY CLUB</h3>
                <p className="text-sm text-red-100">{user?.organizationName || 'Indiranagar'}</p>
              </div>
            </div>
          </div>

          {/* Debit Voucher Section */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center border-b-2 border-gray-300 pb-2">
              <span className="w-1 h-6 bg-orange-500 rounded-full mr-3"></span>
              DEBIT VOUCHER
            </h3>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Voucher date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="voucherDate"
                    value={formData.voucherDate}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Voucher number
                </label>
                <input
                  type="text"
                  name="voucherNumber"
                  value={formData.voucherNumber}
                  onChange={handleChange}
                  placeholder="Auto-generated if left empty"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                />
              </div>
            </div>
          </div>

          {/* Expense Details Section */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
              <span className="w-1 h-6 bg-orange-500 rounded-full mr-3"></span>
              Expense Details
            </h3>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                >
                  <option value="">Select Category</option>
                  <option value="rent">Rent</option>
                  <option value="utilities">Utilities</option>
                  <option value="salaries">Salaries</option>
                  <option value="equipment">Equipment</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="marketing">Marketing</option>
                  <option value="supplies">Supplies</option>
                  <option value="travel">Travel</option>
                  <option value="professional-services">Professional Services</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Paid to <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="paidTo"
                  value={formData.paidTo}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Paid towards
                </label>
                <input
                  type="text"
                  name="paidTowards"
                  value={formData.paidTowards}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Value (in ₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  In words (₹)
                </label>
                <input
                  type="text"
                  name="amountInWords"
                  value={formData.amountInWords}
                  onChange={handleChange}
                  placeholder="Auto-generated if left empty"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Payment Source
                </label>
                <select
                  name="paymentSource"
                  value={formData.paymentSource}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                >
                  <option value="">Select Source</option>
                  <option value="cash">Cash</option>
                  <option value="bank-account">Bank Account</option>
                  <option value="credit-card">Credit Card</option>
                  <option value="petty-cash">Petty Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mode of payment
                </label>
                <select
                  name="paymentMode"
                  value={formData.paymentMode}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Attachment File
                </label>
                <div className="flex items-center space-x-2">
                  <label className="flex-1 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-all">
                    <span className="text-sm text-gray-600">Choose file</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleAttachmentUpload}
                      className="hidden"
                    />
                  </label>
                  {formData.attachment && (
                    <span className="text-sm text-gray-600 truncate max-w-xs">
                      {formData.attachment.name || 'File chosen'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 px-8 py-5 -mx-8 -mb-8 shadow-lg flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createExpenseMutation.isLoading}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md flex items-center space-x-2"
            >
              {createExpenseMutation.isLoading ? (
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
    </>
  )
}

