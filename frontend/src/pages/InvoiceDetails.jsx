import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import api from '../api/axios'
import LoadingPage from '../components/LoadingPage'
import Breadcrumbs from '../components/Breadcrumbs'
import { ArrowLeft, Printer, Mail, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function InvoiceDetails() {
  const { invoiceId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const shouldPrint = searchParams.get('print') === 'true'

  const { data, isLoading, error } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      const res = await api.get(`/invoices/${invoiceId}`)
      return res.data
    }
  })

  const invoice = data?.invoice
  const member = invoice?.memberId
  const organization = invoice?.organizationId

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatDateTime = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0.00'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getDurationText = (item) => {
    // Check if item has serviceId with duration
    const serviceDuration = item.serviceId?.duration || item.serviceId?.serviceId?.duration
    if (!serviceDuration) {
      // Try to get from planId if available
      if (invoice.planId?.duration) {
        const duration = invoice.planId.duration
        const value = duration.value || 0
        const unit = duration.unit || ''
        if (value && unit) {
          return `${value} ${unit}${value !== 1 ? 's' : ''}`
        }
      }
      return '-'
    }
    
    const duration = serviceDuration
    const value = duration.value || 0
    const unit = duration.unit || ''
    
    if (unit === 'days') {
      return `${value} Day${value !== 1 ? 's' : ''} Per week. Valid for ${value} day(s).`
    } else if (unit === 'weeks') {
      return `${value} Day${value !== 1 ? 's' : ''} Per week. Valid for ${value} week(s).`
    } else if (unit === 'months') {
      return `${value} Day${value !== 1 ? 's' : ''} Per week. Valid for ${value} month(s).`
    } else if (unit === 'years') {
      return `${value} Day${value !== 1 ? 's' : ''} Per week. Valid for ${value} year(s).`
    }
    return '-'
  }

  // Auto-print when print parameter is present
  useEffect(() => {
    if (shouldPrint && !isLoading && invoice) {
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [shouldPrint, isLoading, invoice])

  if (isLoading) {
    return <LoadingPage message="Loading invoice details..." />
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h2>
          <p className="text-gray-600 mb-4">The invoice you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const taxAmount = invoice.tax?.amount || 0
  const subtotal = invoice.subtotal || (invoice.total - taxAmount)
  const pendingAmount = invoice.pending || Math.max(0, invoice.total - (invoice.totalPaid || 0))

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            margin: 0.5cm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .min-h-screen {
            min-height: auto !important;
            background: white !important;
            padding: 0 !important;
          }
          .max-w-5xl {
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          .px-4, .px-8, .sm\\:px-6, .lg\\:px-8 {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
          .py-8, .py-6 {
            padding-top: 0.5rem !important;
            padding-bottom: 0.5rem !important;
          }
          .bg-white {
            background: white !important;
          }
          .rounded-2xl {
            border-radius: 0 !important;
          }
          .shadow-lg {
            box-shadow: none !important;
          }
          .border {
            border: none !important;
          }
          .border-b {
            border-bottom: 1px solid #e5e7eb !important;
          }
          .border-t {
            border-top: 1px solid #e5e7eb !important;
          }
          .border-gray-200 {
            border-color: #e5e7eb !important;
          }
        }
      `}</style>
      
      <div className="min-h-screen bg-gray-50 print:bg-white">
        <div className="bg-white border-b border-gray-200 no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <Breadcrumbs />
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    window.open(`/invoices/${invoiceId}/print`, '_blank')
                  }}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => toast.success('Email functionality coming soon')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Email</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:mx-0 print:px-0 print:py-0">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden print:rounded-none print:shadow-none print:border-0">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {invoice.isProForma ? 'Pro Forma Invoice' : 'Invoice'}
                </h1>
                <p className="text-orange-100 text-sm">Invoice #{invoice.invoiceNumber || invoice._id}</p>
              </div>
              <div className="text-right">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                  <p className="text-white text-sm font-medium">Total Amount</p>
                  <p className="text-white text-2xl font-bold">{formatCurrency(invoice.total)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Invoice Info */}
          <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-gray-200">
            {/* Customer Details */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Customer Details</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-600">Customer Name:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {member?.firstName} {member?.lastName}
                  </span>
                </div>
                {member?.email && (
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-medium text-gray-900">{member.email}</span>
                  </div>
                )}
                {member?.phone && (
                  <div>
                    <span className="text-gray-600">Mobile:</span>
                    <span className="ml-2 font-medium text-gray-900">{member.phone}</span>
                  </div>
                )}
                {member?.memberId && (
                  <div>
                    <span className="text-gray-600">Attendance ID:</span>
                    <span className="ml-2 font-medium text-gray-900">{member.memberId}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Place of Supply:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {invoice.branchId?.address?.state || 'Karnataka'}
                  </span>
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Invoice Details</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-600">Invoice Type:</span>
                  <span className="ml-2 font-medium text-gray-900 capitalize">
                    {invoice.type?.replace('-', ' ') || 'New Booking'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Date, Time:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {formatDateTime(invoice.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Invoice Number:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {invoice.invoiceNumber || '-'}
                  </span>
                </div>
                {invoice.dateOfInvoice && (
                  <div>
                    <span className="text-gray-600">Date of Invoice:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {formatDate(invoice.dateOfInvoice)}
                    </span>
                  </div>
                )}
                {invoice.createdBy && (
                  <div>
                    <span className="text-gray-600">Created by:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {invoice.createdBy.firstName} {invoice.createdBy.lastName}
                    </span>
                  </div>
                )}
                {member?.salesRep && (
                  <div>
                    <span className="text-gray-600">Sales Rep:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {member.salesRep.firstName} {member.salesRep.lastName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="px-8 py-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Service Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Description</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Duration</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Quantity</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Service Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.description || item.serviceId?.name || 'Service'}
                            </p>
                            {item.startDate && item.expiryDate && (
                              <p className="text-xs text-gray-500 mt-1">
                                Start date: {formatDate(item.startDate)}, Expiry date: {formatDate(item.expiryDate)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {getDurationText(item)}
                        </td>
                        <td className="py-4 px-4 text-center text-sm text-gray-600">
                          {item.quantity || 1}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="text-sm">
                            {item.discount && (
                              <>
                                <p className="text-gray-500">Fee: {formatCurrency(item.amount || item.total)}</p>
                                <p className="text-orange-600">Discount: {formatCurrency(item.discount?.amount || 0)}</p>
                              </>
                            )}
                            <p className="font-semibold text-gray-900">
                              Base Fee: {formatCurrency(item.total || item.amount || 0)}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        No items found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Section */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-end">
              <div className="w-full md:w-80 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium text-gray-900">{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-3 border-t-2 border-gray-300">
                  <span className="text-gray-900">Total Due</span>
                  <span className="text-orange-600">{formatCurrency(invoice.total)}</span>
                </div>
                {pendingAmount > 0 && (
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-gray-600">Pending</span>
                    <span className="font-medium text-red-600">{formatCurrency(pendingAmount)}</span>
                  </div>
                )}
                {invoice.totalPaid > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Paid</span>
                    <span className="font-medium text-green-600">{formatCurrency(invoice.totalPaid)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          {invoice.customerNotes && (
            <div className="px-8 py-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Customer Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.customerNotes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              This is a computer-generated {invoice.isProForma ? 'pro forma invoice' : 'invoice'}. No signature is required.
            </p>
          </div>
          </div>
        </div>
      </div>
    </>
  )
}

