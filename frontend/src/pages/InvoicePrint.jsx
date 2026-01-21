import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import api from '../api/axios'
import LoadingPage from '../components/LoadingPage'

// Helper function to resolve asset URLs
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

export default function InvoicePrint() {
  const { invoiceId } = useParams()

  const { data, isLoading, error } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      const res = await api.get(`/invoices/${invoiceId}`)
      return res.data
    }
  })

  // Fetch payments for this invoice
  const { data: paymentsData } = useQuery({
    queryKey: ['invoice-payments', invoiceId],
    queryFn: async () => {
      try {
        const res = await api.get(`/payments?invoiceId=${invoiceId}`)
        return res.data
      } catch (error) {
        return { payments: [] }
      }
    },
    enabled: !!invoiceId
  })

  const invoice = data?.invoice
  const member = invoice?.memberId
  const organization = invoice?.organizationId
  const payments = paymentsData?.payments || []

  // Resolve organization logo URL
  const organizationLogoUrl = organization?.logo?.startsWith('http')
    ? organization.logo
    : resolveAssetUrl(organization?.logo)

  // Auto-print when page loads
  useEffect(() => {
    if (!isLoading && invoice) {
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [isLoading, invoice])

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
    const serviceDuration = item.serviceId?.duration || item.serviceId?.serviceId?.duration
    if (!serviceDuration) {
      if (invoice?.planId?.duration) {
        const duration = invoice.planId.duration
        const value = duration.value || 0
        const unit = duration.unit || ''
        if (value && unit) {
          // Calculate months from duration
          let months = 0
          if (unit === 'months') months = value
          else if (unit === 'weeks') months = Math.round(value / 4.33)
          else if (unit === 'days') months = Math.round(value / 30)
          else if (unit === 'years') months = value * 12

          if (months > 0) {
            return `${value} Days Per week. Valid for ${months} month(s).`
          }
          return `${value} ${unit}${value !== 1 ? 's' : ''}`
        }
      }
      return '-'
    }

    const duration = serviceDuration
    const value = duration.value || 0
    const unit = duration.unit || ''

    // Calculate months for display
    let months = 0
    if (unit === 'months') months = value
    else if (unit === 'weeks') months = Math.round(value / 4.33)
    else if (unit === 'days') months = Math.round(value / 30)
    else if (unit === 'years') months = value * 12

    if (months > 0) {
      return `${value} Days Per week. Valid for ${months} month(s).`
    }

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

  // Get payment method display text
  const getPaymentMethodText = (method) => {
    const methodMap = {
      'cash': 'Cash',
      'card': 'Card',
      'upi': 'UPI',
      'bank_transfer': 'Bank Transfer',
      'cheque': 'Cheque',
      'razorpay': 'Online Payment',
      'other': 'Other'
    }
    return methodMap[method] || method
  }

  // Calculate total paid from payments
  const totalPaid = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  const firstPayment = payments.find(p => p.status === 'completed')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h2>
          <p className="text-gray-600">The invoice you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  const taxAmount = invoice.tax?.amount || 0
  const subtotal = invoice.subtotal || (invoice.total - taxAmount)
  const pendingAmount = invoice.pending || Math.max(0, invoice.total - totalPaid)

  // Get organization address as string
  const getOrgAddress = () => {
    if (!organization) return ''
    if (typeof organization.address === 'string') return organization.address
    if (organization.address) {
      const addr = organization.address
      const parts = [
        addr.street,
        addr.city,
        addr.state,
        addr.zipCode
      ].filter(Boolean)
      return parts.join(', ')
    }
    return ''
  }

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
        }
      `}</style>

      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto bg-white">
          {/* Header Section with Red Background */}
          <div className="bg-red-600 px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                {/* Company Logo Area */}
                <div className="bg-white w-20 h-20 flex items-center justify-center rounded overflow-hidden p-2 shadow-sm">
                  {organizationLogoUrl ? (
                    <img
                      src={organizationLogoUrl}
                      alt="Logo"
                      className="w-full h-full object-contain"
                      style={{ maxWidth: '100%', maxHeight: '100%' }}
                      onError={(e) => {
                        console.error('Logo failed to load:', organizationLogoUrl)
                        e.target.style.display = 'none'
                        const fallback = e.target.parentElement?.querySelector('.logo-fallback')
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <span
                    className={`text-gray-800 text-xl font-bold logo-fallback ${organizationLogoUrl ? 'hidden' : 'flex items-center justify-center'}`}
                    style={{ display: organizationLogoUrl ? 'none' : 'flex' }}
                  >
                    {organization?.name?.charAt(0) || 'A'}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">
                    {organization?.name || 'Company Name'}
                  </h1>
                  {getOrgAddress() && (
                    <p className="text-red-100 text-xs">{getOrgAddress()}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="border-t border-red-500 pt-4">
              <h2 className="text-3xl font-bold text-white text-center">
                {invoice.isProForma ? 'Tax Invoice' : 'Tax Invoice'}
              </h2>
            </div>
          </div>

          {/* Customer & Invoice Info */}
          <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-gray-200">
            {/* Customer Details - Left Side */}
            <div>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-600 font-medium">Customer Name:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {member?.firstName?.toUpperCase()} {member?.lastName?.toUpperCase()}
                  </span>
                </div>
                {member?.email && (
                  <div>
                    <span className="text-gray-600 font-medium">Email:</span>
                    <span className="ml-2 font-semibold text-gray-900">{member.email}</span>
                  </div>
                )}
                {member?.phone && (
                  <div>
                    <span className="text-gray-600 font-medium">Mobile:</span>
                    <span className="ml-2 font-semibold text-gray-900">{member.phone}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600 font-medium">Attendance ID:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {member?.memberId || member?.attendanceId || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Place of Supply:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {invoice.branchId?.address?.state || organization?.address?.state || 'Karnataka'}
                  </span>
                </div>
              </div>
            </div>

            {/* Invoice Details - Right Side */}
            <div className="text-right">
              <div className="space-y-2">
                <div>
                  <span className="text-gray-600 font-medium">Invoice Type:</span>
                  <span className="ml-2 font-semibold text-gray-900 capitalize">
                    {invoice.type?.replace('-', ' ') || 'New Booking'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Date, Time:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {formatDateTime(invoice.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Invoice Number:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {invoice.invoiceNumber || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Date of Invoice:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {formatDate(invoice.dateOfInvoice || invoice.createdAt)}
                  </span>
                </div>
                {invoice.createdBy && (
                  <div>
                    <span className="text-gray-600 font-medium">Created by:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {invoice.createdBy.firstName} {invoice.createdBy.lastName}
                    </span>
                  </div>
                )}
                {(member?.salesRep || invoice.createdBy) && (
                  <div>
                    <span className="text-gray-600 font-medium">Sales Rep:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {member?.salesRep
                        ? `${member.salesRep.firstName} ${member.salesRep.lastName}`
                        : invoice.createdBy
                          ? `${invoice.createdBy.firstName} ${invoice.createdBy.lastName}`
                          : '-'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="px-8 py-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="text-left py-3 px-4 text-sm font-bold text-gray-900 border-r border-gray-300">DESCRIPTION</th>
                    <th className="text-left py-3 px-4 text-sm font-bold text-gray-900 border-r border-gray-300">DURATION</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-900 border-r border-gray-300">QUANTITY</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-gray-900">SERVICE FEE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((item, index) => {
                      const itemAmount = item.amount || item.total || 0
                      const itemDiscount = item.discount?.amount || 0
                      const baseFee = item.total || (itemAmount - itemDiscount)

                      return (
                        <tr key={index} className="border-b border-gray-200">
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {item.description || item.serviceId?.name || 'Service'}
                              </p>
                              {item.startDate && item.expiryDate && (
                                <p className="text-xs text-gray-600 mt-1">
                                  <span className="font-medium">Start date:</span> {formatDate(item.startDate)}, <span className="font-medium">Expiry date:</span> {formatDate(item.expiryDate)}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700 border-r border-gray-200">
                            {getDurationText(item)}
                          </td>
                          <td className="py-4 px-4 text-center text-sm text-gray-700 border-r border-gray-200">
                            {item.quantity || 1}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="text-sm">
                              {itemDiscount > 0 && (
                                <>
                                  <p className="text-gray-600">Fee: {formatCurrency(itemAmount)}</p>
                                  <p className="text-red-600 font-medium">Discount: {formatCurrency(itemDiscount)}</p>
                                </>
                              )}
                              <p className="font-bold text-gray-900">
                                Base Fee: {formatCurrency(baseFee)}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )
                    })
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
          <div className="px-8 py-6 border-t border-gray-200">
            <div className="flex justify-end">
              <div className="w-full md:w-96 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 font-medium">Subtotal</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 font-medium">Tax</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                  <span className="text-gray-900">Total Due</span>
                  <span className="text-gray-900">{formatCurrency(invoice.total)}</span>
                </div>

                {/* Payment Information */}
                {totalPaid > 0 && (
                  <>
                    <div className="pt-3 border-t border-gray-300 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700 font-medium">
                          Paid ({firstPayment?.paidAt ? formatDate(firstPayment.paidAt) : formatDate(invoice.paidDate || invoice.createdAt)}):
                        </span>
                      </div>
                      {firstPayment?.receiptNumber && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Paid Invoice No.:</span>
                          <span className="font-medium text-gray-900">{invoice.invoiceNumber || '-'}</span>
                        </div>
                      )}
                      {firstPayment?.receiptNumber && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Receipt No.:</span>
                          <span className="font-medium text-gray-900">{firstPayment.receiptNumber}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Amount Paid:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(totalPaid)}</span>
                      </div>
                      {invoice.paymentModes && invoice.paymentModes.length > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Mode of Payment:</span>
                          <span className="font-medium text-gray-900">
                            {invoice.paymentModes.map((pm, idx) => (
                              <span key={idx}>
                                {pm.amount}({getPaymentMethodText(pm.method)})
                                {idx < invoice.paymentModes.length - 1 && ', '}
                              </span>
                            ))}
                          </span>
                        </div>
                      )}
                      {firstPayment?.razorpayDetails?.vpa && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">TXN ({firstPayment.razorpayDetails.method || 'gpay'}):</span>
                          <span className="font-medium text-gray-900">{firstPayment.razorpayDetails.vpa || firstPayment.razorpayDetails.method || 'gpay'}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="flex justify-between text-sm pt-2 border-t border-gray-300">
                  <span className="text-gray-700 font-medium">Pending</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(pendingAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="px-8 py-6 border-t-2 border-gray-300">
            <h2 className="text-xl font-bold text-gray-900 text-center mb-4">TERMS AND CONDITIONS</h2>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <p className="font-semibold mb-2">Membership Privileges, Notices, Disclosure & Agreement</p>
              </div>

              <div>
                <p className="font-semibold">Upgradation/Renewal:</p>
                <p>Any change in membership program/upgradation has to be done within 15 days of joining</p>
              </div>

              <div>
                <p className="font-semibold">Fresh Membership:</p>
                <p>A fresh membership can be taken on completion of earlier package.</p>
              </div>

              <div>
                <p className="font-semibold">Transfer:</p>
                <p>Transfer of a membership is permitted to a non-member i.e. to a person who has not been a member with the same branch of {organization?.name || 'AIRFIT'} before, at a transfer fee of Rs.3500+tax per transfer.</p>
              </div>

              <div>
                <p className="font-semibold">Cancellation/Refunds:</p>
                <p>No refunds shall be made for all the services.</p>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                <p className="font-semibold mb-2">Membership Agreement Acknowledgment:</p>
                <p className="text-xs">
                  This membership agreement contains a waiver and release of liability and indemnity agreement in section "VI" on the document to which you will be bound. Do not sign this agreement before you read it. By signing the below, you acknowledge receipt of a fully completed copy of this membership agreement executed by you and the club and a copy of the rules and regulations printed overleaf, you agree to be bound by the terms and conditions contained herein.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information & Footer */}
          <div className="px-8 py-6 border-t-2 border-gray-300">
            <div className="border-b border-gray-300 pb-4 mb-4">
              <div className="flex flex-wrap gap-4 justify-center text-xs text-gray-600">
                {organization?.email && (
                  <span>Mail: {organization.email}</span>
                )}
                {organization?.phone && (
                  <span>Phone: {organization.phone}</span>
                )}
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm font-semibold text-gray-700">Thank You For Your Business!</p>
              <p className="text-xs text-gray-500">
                This is a computer generated invoice. No signature is required.
              </p>
            </div>

            {invoice.customerNotes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Customer Notes</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.customerNotes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

