import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Calendar } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getSMSReport } from '../api/reports'
import DateInput from '../components/DateInput'

export default function SMSReport() {
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7) // Default to 7 days ago
    return date.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [recordsPerPage, setRecordsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const [hasSearched, setHasSearched] = useState(false)

  // Fetch SMS report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['sms-report', fromDate, toDate, currentPage, recordsPerPage],
    queryFn: () => getSMSReport({ 
      startDate: fromDate, 
      endDate: toDate,
      page: currentPage,
      limit: recordsPerPage
    }),
    enabled: hasSearched // Only fetch after "Go" is clicked
  })

  // Show dummy data by default (before first search)
  const showDummyData = !hasSearched || (!reportData && !isLoading)

  const handleSearch = () => {
    setCurrentPage(1)
    setHasSearched(true)
    // Query will automatically refetch when hasSearched becomes true
  }

  // Dummy data for visualization
  const dummySMSData = [
    {
      _id: '1',
      message: 'Welcome to our fitness center! Your membership is now active. Visit us anytime.',
      module: 'member',
      gateway: 'Twilio',
      status: 'completed',
      totalRecipients: 150,
      successfulSends: 148,
      failedSends: 2,
      sentAt: new Date('2024-01-20T10:30:00'),
      createdAt: new Date('2024-01-20T10:25:00'),
      createdBy: { firstName: 'John', lastName: 'Doe' }
    },
    {
      _id: '2',
      message: 'Reminder: Your membership expires in 7 days. Renew now to continue enjoying our services.',
      module: 'member',
      gateway: 'MSG91',
      status: 'completed',
      totalRecipients: 85,
      successfulSends: 85,
      failedSends: 0,
      sentAt: new Date('2024-01-19T14:15:00'),
      createdAt: new Date('2024-01-19T14:10:00'),
      createdBy: { firstName: 'Jane', lastName: 'Smith' }
    },
    {
      _id: '3',
      message: 'Thank you for your enquiry. We would love to schedule a visit for you. Reply YES to confirm.',
      module: 'enquiry',
      gateway: 'Twilio',
      status: 'completed',
      totalRecipients: 45,
      successfulSends: 43,
      failedSends: 2,
      sentAt: new Date('2024-01-18T09:00:00'),
      createdAt: new Date('2024-01-18T08:55:00'),
      createdBy: { firstName: 'Mike', lastName: 'Johnson' }
    },
    {
      _id: '4',
      message: 'Special offer: Get 20% off on annual membership. Valid until end of month. Hurry!',
      module: 'member',
      gateway: 'MSG91',
      status: 'completed',
      totalRecipients: 320,
      successfulSends: 318,
      failedSends: 2,
      sentAt: new Date('2024-01-17T16:45:00'),
      createdAt: new Date('2024-01-17T16:40:00'),
      createdBy: { firstName: 'Sarah', lastName: 'Williams' }
    },
    {
      _id: '5',
      message: 'Your payment of ₹5000 has been received. Thank you for your payment.',
      module: 'member',
      gateway: 'Twilio',
      status: 'completed',
      totalRecipients: 12,
      successfulSends: 12,
      failedSends: 0,
      sentAt: new Date('2024-01-16T11:20:00'),
      createdAt: new Date('2024-01-16T11:15:00'),
      createdBy: { firstName: 'David', lastName: 'Brown' }
    },
    {
      _id: '6',
      message: 'Class reminder: Your yoga class starts in 1 hour. See you soon!',
      module: 'member',
      gateway: 'MSG91',
      status: 'completed',
      totalRecipients: 25,
      successfulSends: 25,
      failedSends: 0,
      sentAt: new Date('2024-01-15T08:00:00'),
      createdAt: new Date('2024-01-15T07:55:00'),
      createdBy: { firstName: 'Emily', lastName: 'Davis' }
    },
    {
      _id: '7',
      message: 'We noticed you haven\'t visited us in a while. Come back and enjoy our facilities!',
      module: 'member',
      gateway: 'Twilio',
      status: 'sending',
      totalRecipients: 67,
      successfulSends: 45,
      failedSends: 3,
      sentAt: null,
      createdAt: new Date('2024-01-14T13:30:00'),
      createdBy: { firstName: 'Robert', lastName: 'Wilson' }
    },
    {
      _id: '8',
      message: 'New fitness program launched! Join our HIIT classes starting next week.',
      module: 'member',
      gateway: 'MSG91',
      status: 'failed',
      totalRecipients: 200,
      successfulSends: 0,
      failedSends: 200,
      sentAt: null,
      createdAt: new Date('2024-01-13T10:00:00'),
      createdBy: { firstName: 'Lisa', lastName: 'Anderson' }
    }
  ]

  // Use dummy data if no data is loaded yet
  const displayData = reportData?.data?.smsRecords || (showDummyData ? dummySMSData : [])
  const pagination = reportData?.data?.pagination || {
    page: 1,
    limit: recordsPerPage,
    total: showDummyData ? dummySMSData.length : 0,
    pages: showDummyData ? Math.ceil(dummySMSData.length / recordsPerPage) : 0
  }
  const hasData = displayData && displayData.length > 0

  const formatDate = (date) => {
    if (!date) return 'N/A'
    const d = new Date(date)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = String(d.getFullYear()).slice(-2)
    return `${day}-${month}-${year}`
  }

  const formatDateTime = (date) => {
    if (!date) return 'N/A'
    const d = new Date(date)
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateMessage = (message, maxLength = 60) => {
    if (!message) return 'N/A'
    if (message.length <= maxLength) return message
    return message.substring(0, maxLength) + '...'
  }

  // Pagination calculations
  const startIndex = (currentPage - 1) * recordsPerPage
  const endIndex = startIndex + recordsPerPage
  const paginatedData = showDummyData ? displayData.slice(startIndex, endIndex) : displayData

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
    // Query will automatically refetch when currentPage changes (if hasSearched is true)
  }

  return (
    <div className="space-y-6 max-w-full w-full overflow-x-hidden" style={{ boxSizing: 'border-box' }}>
      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <nav className="text-sm">
          <span className="text-gray-600">Home</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">Reports</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">Marketing</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-orange-600 font-medium">SMS Report</span>
        </nav>
      </div>

      {/* Page Title */}
      <div className="text-center w-full max-w-full overflow-hidden">
        <h1 className="text-3xl font-bold text-gray-900">SMS Report</h1>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <div className="flex flex-wrap items-center gap-4">
          {/* From Date */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">From</label>
          <DateInput
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            containerClassName="min-w-[140px]"
            className="pr-10"
          />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">To</label>
          <DateInput
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            containerClassName="min-w-[140px]"
            className="pr-10"
          />
          </div>

          {/* Go Button */}
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Go
          </button>

          {/* Records Per Page Dropdown */}
          <div className="relative ml-auto">
            <select
              value={recordsPerPage}
              onChange={(e) => {
                setRecordsPerPage(Number(e.target.value))
                setCurrentPage(1)
                // Query will automatically refetch when recordsPerPage changes (if hasSearched is true)
              }}
              className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer min-w-[120px]"
            >
              <option value={10}>10 Records</option>
              <option value={25}>25 Records</option>
              <option value={50}>50 Records</option>
              <option value={100}>100 Records</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full max-w-full overflow-hidden">
        {isLoading ? (
          <LoadingPage message="Loading SMS report..." fullScreen={false} />
        ) : !hasData ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No Results Found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto w-full" style={{ maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full" style={{ minWidth: '1000px', width: '100%' }}>
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">S.No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Message</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Module</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Gateway</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Recipients</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Successful</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Failed</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Sent By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.map((item, index) => (
                    <tr key={item._id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{startIndex + index + 1}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDateTime(item.sentAt || item.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 max-w-xs" title={item.message}>
                        {truncateMessage(item.message)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                        {item.module || 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.gateway || 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : item.status === 'sending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : item.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {item.totalRecipients || 0}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {item.successfulSends || 0}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                        {item.failedSends || 0}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.createdBy?.firstName} {item.createdBy?.lastName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {(showDummyData ? Math.ceil(displayData.length / recordsPerPage) > 1 : pagination.pages > 1) && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, showDummyData ? displayData.length : pagination.total)} of {showDummyData ? displayData.length : pagination.total} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center space-x-1">
                    {(() => {
                      const totalPages = showDummyData ? Math.ceil(displayData.length / recordsPerPage) : pagination.pages
                      const pagesToShow = Math.min(5, totalPages)
                      return Array.from({ length: pagesToShow }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            disabled={isLoading}
                            className={`px-3 py-2 rounded-lg text-sm font-medium ${
                              currentPage === pageNum
                                ? 'bg-orange-500 text-white'
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {pageNum}
                          </button>
                        )
                      })
                    })()}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= (showDummyData ? Math.ceil(displayData.length / recordsPerPage) : pagination.pages) || isLoading}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

