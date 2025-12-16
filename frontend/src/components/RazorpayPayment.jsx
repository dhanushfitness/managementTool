import { useState, useEffect } from 'react'
import { X, Loader2, CreditCard, QrCode, Copy, Check, Smartphone, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { createRazorpayOrder, processRazorpayPayment, sendPaymentLinkViaSMS } from '../api/payments'
import { useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'

export default function RazorpayPayment({ invoice, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [orderData, setOrderData] = useState(null)
  const [qrCodeData, setQrCodeData] = useState(null)
  const [copied, setCopied] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('card') // 'card' or 'qr'
  const [sendingSMS, setSendingSMS] = useState(false)
  const queryClient = useQueryClient()

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0)
  }

  // Load order and QR code when component mounts
  useEffect(() => {
    const loadPaymentData = async () => {
      try {
        setLoading(true)
        const orderResponse = await createRazorpayOrder(invoice._id)
        const { order, qrCode } = orderResponse.data

        console.log('Payment data received:', { 
          hasOrder: !!order, 
          hasQrCode: !!qrCode,
          qrCodeType: qrCode ? (qrCode.fallback ? 'fallback' : 'direct') : 'none',
          qrCodeKeys: qrCode ? Object.keys(qrCode) : []
        })

        if (order && order.id) {
          setOrderData(order)
        }

        if (qrCode) {
          console.log('QR code data received:', qrCode)
          // Check if it's a fallback (payment link) or direct QR code
          if (qrCode.shortUrl || qrCode.image || qrCode.upiQr || qrCode.qrString) {
            setQrCodeData(qrCode)
          } else {
            console.warn('QR code object received but no usable data')
            setQrCodeData({ error: true })
          }
        } else {
          console.warn('QR code not available in response')
          setQrCodeData({ error: true })
        }
      } catch (error) {
        console.error('Error loading payment data:', error)
        toast.error(error.response?.data?.message || 'Failed to load payment options')
        // Set error state so user can still see the section
        setQrCodeData({ error: true })
      } finally {
        setLoading(false)
      }
    }

    loadPaymentData()
  }, [invoice._id])

  const handlePayment = async () => {
    if (!window.Razorpay) {
      toast.error('Razorpay SDK not loaded. Please refresh the page.')
      return
    }

    if (!orderData || !orderData.id) {
      toast.error('Payment order not ready. Please wait...')
      return
    }

    try {
      setLoading(true)

      // Initialize Razorpay checkout
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Gym Management',
        description: `Payment for Invoice ${invoice.invoiceNumber || invoice._id}`,
        order_id: orderData.id,
        handler: async function (response) {
          try {
            setLoading(true)
            
            // Verify payment on backend
            const paymentResponse = await processRazorpayPayment({
              invoiceId: invoice._id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            })

            if (paymentResponse.data.success) {
              toast.success('Payment successful!')
              
              // Invalidate relevant queries
              queryClient.invalidateQueries(['invoice', invoice._id])
              queryClient.invalidateQueries(['member-invoices'])
              queryClient.invalidateQueries(['member-invoices-payments'])
              queryClient.invalidateQueries(['payments'])
              queryClient.invalidateQueries(['receipts'])
              
              if (onSuccess) {
                onSuccess(paymentResponse.data.payment)
              }
              
              onClose()
            } else {
              throw new Error(paymentResponse.data.message || 'Payment verification failed')
            }
          } catch (error) {
            console.error('Payment verification error:', error)
            toast.error(error.response?.data?.message || error.message || 'Payment verification failed')
          } finally {
            setLoading(false)
          }
        },
        prefill: {
          name: invoice.memberId 
            ? `${invoice.memberId.firstName || ''} ${invoice.memberId.lastName || ''}`.trim()
            : '',
          email: invoice.memberId?.email || '',
          contact: invoice.memberId?.phone || ''
        },
        theme: {
          color: '#f97316' // Orange color matching the app theme
        },
        modal: {
          ondismiss: function() {
            setLoading(false)
          }
        },
        // Enable UPI payment methods - UPI will show as a separate payment option
        // Users can select their UPI app (Google Pay, PhonePe, Paytm) or enter UPI ID manually
        // Note: UPI is enabled by default in Razorpay, but we explicitly enable it here
        method: {
          upi: 1, // Use 1 for Razorpay (enables UPI with ID input option)
          card: 1,
          netbanking: 1,
          wallet: 1
        }
      }

      const razorpay = new window.Razorpay(options)
      razorpay.on('payment.failed', function (response) {
        console.error('Payment failed:', response)
        toast.error(response.error.description || 'Payment failed. Please try again.')
        setLoading(false)
      })

      razorpay.open()
    } catch (error) {
      console.error('Payment initiation error:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to initiate payment')
      setLoading(false)
    }
  }

  const pendingAmount = invoice.pending || Math.max(0, invoice.total - (invoice.totalPaid || 0))

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      toast.error('Failed to copy')
    })
  }

  const handleSendSMS = async () => {
    if (!invoice.memberId?.phone) {
      toast.error('Member phone number not available')
      return
    }

    try {
      setSendingSMS(true)
      const response = await sendPaymentLinkViaSMS(invoice._id)
      
      if (response.data.success) {
        toast.success('Payment link sent via SMS successfully!')
      } else {
        toast.error(response.data.message || 'Failed to send SMS')
      }
    } catch (error) {
      console.error('Error sending SMS:', error)
      toast.error(error.response?.data?.message || 'Failed to send payment link via SMS')
    } finally {
      setSendingSMS(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        margin: 0,
        width: '100vw',
        height: '100vh'
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <CreditCard className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Pay with Razorpay</h2>
              <p className="text-sm text-gray-500">Secure online payment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Invoice Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Invoice Number:</span>
              <span className="text-sm font-medium text-gray-900">
                {invoice.invoiceNumber || invoice._id.slice(-8)}
              </span>
            </div>
            {invoice.memberId && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Member:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {invoice.memberId.firstName} {invoice.memberId.lastName}
                  </span>
                </div>
                {invoice.memberId.phone && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Phone:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {invoice.memberId.phone}
                    </span>
                  </div>
                )}
                {invoice.memberId.email && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {invoice.memberId.email}
                    </span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="text-base font-semibold text-gray-900">Amount to Pay:</span>
              <span className="text-2xl font-bold text-orange-600">
                {formatCurrency(pendingAmount)}
              </span>
            </div>
          </div>

          {/* Send SMS Button */}
          {invoice.memberId?.phone && (
            <button
              onClick={handleSendSMS}
              disabled={sendingSMS || loading || pendingAmount <= 0}
              className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {sendingSMS ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5" />
                  <span>Send Payment Link via SMS</span>
                </>
              )}
            </button>
          )}

          {/* Payment Method Tabs */}
          <div className="flex space-x-2 border-b border-gray-200">
            <button
              onClick={() => setPaymentMethod('qr')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                paymentMethod === 'qr'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <QrCode className="w-4 h-4" />
                <span>Scan QR Code</span>
              </div>
            </button>
            <button
              onClick={() => setPaymentMethod('card')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                paymentMethod === 'card'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <CreditCard className="w-4 h-4" />
                <span>Card/UPI</span>
              </div>
            </button>
          </div>

          {/* QR Code Payment Section */}
          {paymentMethod === 'qr' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Smartphone className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Scan with any UPI app
                    </p>
                    <p className="text-xs text-blue-700">
                      Use PhonePe, Google Pay, Paytm, or any UPI app to scan and pay
                    </p>
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {loading && !qrCodeData && (
                <div className="flex flex-col items-center justify-center space-y-4 bg-white border-2 border-gray-200 rounded-lg p-12">
                  <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                  <p className="text-sm text-gray-600">Generating QR code...</p>
                </div>
              )}

              {/* QR Code Display */}
              {qrCodeData && !qrCodeData.error && (
                <div className="flex flex-col items-center space-y-4 bg-white border-2 border-gray-200 rounded-lg p-6">
                  {qrCodeData.image || qrCodeData.upiQr ? (
                    <img
                      src={qrCodeData.image || qrCodeData.upiQr}
                      alt="UPI QR Code"
                      className="w-64 h-64 object-contain"
                      onError={(e) => {
                        console.error('Failed to load QR code image, trying fallback')
                        // If image fails, try generating from qrString or shortUrl
                        e.target.style.display = 'none'
                        const fallbackValue = qrCodeData.qrString || qrCodeData.shortUrl
                        if (fallbackValue && !document.querySelector('#fallback-qr')) {
                          const fallbackDiv = document.createElement('div')
                          fallbackDiv.id = 'fallback-qr'
                          e.target.parentElement.appendChild(fallbackDiv)
                        }
                      }}
                    />
                  ) : qrCodeData.qrString ? (
                    <QRCodeSVG
                      value={qrCodeData.qrString}
                      size={256}
                      level="H"
                      includeMargin={true}
                    />
                  ) : qrCodeData.shortUrl ? (
                    <div className="space-y-4">
                      <QRCodeSVG
                        value={qrCodeData.shortUrl}
                        size={256}
                        level="H"
                        includeMargin={true}
                      />
                      {qrCodeData.fallback && (
                        <div className="text-center space-y-2">
                          <p className="text-xs text-blue-600">
                            Scan with any UPI app (PhonePe, Google Pay, Paytm)
                          </p>
                          <p className="text-xs text-gray-500">
                            This will open the payment page where you can pay via UPI
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2 p-8">
                      <QrCode className="w-16 h-16 text-gray-400" />
                      <p className="text-sm text-gray-500">QR code data not available</p>
                    </div>
                  )}

                  <div className="text-center space-y-2">
                    <p className="text-sm font-semibold text-gray-900">
                      Amount: {formatCurrency(pendingAmount)}
                    </p>
                    {qrCodeData.shortUrl && (
                      <div className="flex items-center justify-center space-x-2">
                        <p className="text-xs text-gray-600 break-all max-w-xs">
                          {qrCodeData.shortUrl}
                        </p>
                        <button
                          onClick={() => copyToClipboard(qrCodeData.shortUrl)}
                          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                          title="Copy payment link"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error State */}
              {qrCodeData && qrCodeData.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <X className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900 mb-1">
                        QR Code Not Available
                      </p>
                      <p className="text-xs text-red-700 mb-3">
                        Unable to generate QR code at this time. Please use the Card/UPI payment method instead.
                      </p>
                      <button
                        onClick={() => setPaymentMethod('card')}
                        className="text-xs text-red-600 hover:text-red-800 underline"
                      >
                        Switch to Card/UPI Payment
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {qrCodeData && !qrCodeData.error && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    <strong>Note:</strong> This QR code expires in 1 hour. After payment, the invoice will be automatically updated.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Card/UPI Payment Section */}
          {paymentMethod === 'card' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Accepted Payment Methods:</strong> Credit/Debit Cards, UPI, Net Banking, Wallets
                </p>
              </div>

              <button
                onClick={handlePayment}
                disabled={loading || pendingAmount <= 0 || !orderData}
                className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>Pay with Card/UPI</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

