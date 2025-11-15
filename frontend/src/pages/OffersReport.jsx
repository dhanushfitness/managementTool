import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getOffersReport } from '../api/reports'
import { useDateFilterStore } from '../store/dateFilterStore'

export default function OffersReport() {
  const { dateFilter, setDateFilterValue } = useDateFilterStore()

  // Fetch offers report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['offers-report', dateFilter],
    queryFn: () => getOffersReport({ dateFilter }),
    enabled: false // Only fetch when "Go" is clicked
  })

  // Show dummy data by default
  const showDummyData = !reportData && !isLoading

  const handleSearch = () => {
    refetch()
  }

  // Dummy data for visualization
  const dummyData = [
    {
      _id: '1',
      title: 'New Year Special - 30% Off',
      offerType: 'discount',
      discountType: 'percentage',
      discountValue: 30,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2024-01-31'),
      isActive: true,
      usedCount: 45,
      usageLimit: 100,
      applicablePlans: [{ name: 'Premium Gym Membership' }, { name: 'Standard Gym Membership' }],
      branch: { name: 'Main Branch' },
      createdAt: new Date('2024-01-01')
    },
    {
      _id: '2',
      title: 'Summer Package Deal',
      offerType: 'package',
      discountType: 'flat',
      discountValue: 5000,
      validFrom: new Date('2024-06-01'),
      validUntil: new Date('2024-08-31'),
      isActive: true,
      usedCount: 12,
      usageLimit: 50,
      applicablePlans: [{ name: 'VIP Membership' }],
      branch: { name: 'Downtown Branch' },
      createdAt: new Date('2024-05-25')
    },
    {
      _id: '3',
      title: 'Referral Bonus - Get 15% Off',
      offerType: 'referral',
      discountType: 'percentage',
      discountValue: 15,
      validFrom: new Date('2024-01-15'),
      validUntil: new Date('2024-12-31'),
      isActive: true,
      usedCount: 28,
      usageLimit: null,
      applicablePlans: [{ name: 'All Plans' }],
      branch: { name: 'Main Branch' },
      createdAt: new Date('2024-01-10')
    },
    {
      _id: '4',
      title: 'Free Trial - 7 Days',
      offerType: 'free-trial',
      discountType: null,
      discountValue: null,
      validFrom: new Date('2024-02-01'),
      validUntil: new Date('2024-02-29'),
      isActive: false,
      usedCount: 8,
      usageLimit: 20,
      applicablePlans: [{ name: 'Standard Gym Membership' }],
      branch: { name: 'Main Branch' },
      createdAt: new Date('2024-01-28')
    },
    {
      _id: '5',
      title: 'Holiday Special - Flat ₹2000 Off',
      offerType: 'seasonal',
      discountType: 'flat',
      discountValue: 2000,
      validFrom: new Date('2024-12-20'),
      validUntil: new Date('2024-12-31'),
      isActive: true,
      usedCount: 0,
      usageLimit: 30,
      applicablePlans: [{ name: 'Premium Gym Membership' }, { name: 'VIP Membership' }],
      branch: { name: 'All Branches' },
      createdAt: new Date('2024-12-15')
    }
  ]

  // Use dummy data if no data is loaded yet
  const displayData = reportData?.data?.offers || (showDummyData ? dummyData : [])
  const hasData = displayData && displayData.length > 0

  // Format date filter display
  const getDateFilterLabel = () => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfYear = new Date(today.getFullYear(), 0, 1)

    switch (dateFilter) {
      case 'today':
        return 'Today'
      case 'yesterday':
        return 'Yesterday'
      case 'this-week':
        return 'This Week'
      case 'last-week':
        return 'Last Week'
      case 'this-month':
        return 'This Month'
      case 'last-month':
        return 'Last Month'
      case 'this-year':
        return 'This Year'
      case 'last-year':
        return 'Last Year'
      default:
        return 'Today'
    }
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDiscount = (offer) => {
    if (offer.offerType === 'free-trial') {
      return 'Free Trial'
    }
    if (offer.discountType === 'percentage') {
      return `${offer.discountValue}% Off`
    } else if (offer.discountType === 'flat') {
      return `₹${offer.discountValue.toLocaleString()} Off`
    }
    return 'N/A'
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
          <span className="text-orange-600 font-medium">Offers Report</span>
        </nav>
      </div>

      {/* Page Title */}
      <div className="text-center w-full max-w-full overflow-hidden">
        <h1 className="text-3xl font-bold text-gray-900">Offers Report</h1>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="relative">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilterValue(e.target.value)}
              className="px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer min-w-[150px]"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this-week">This Week</option>
              <option value="last-week">Last Week</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="this-year">This Year</option>
              <option value="last-year">Last Year</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Go
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full max-w-full overflow-hidden">
        {isLoading ? (
          <LoadingPage message="Loading offers report..." fullScreen={false} />
        ) : !hasData ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No Results Found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full" style={{ maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full" style={{ minWidth: '800px', width: '100%' }}>
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">S.No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Offer Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Offer Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Discount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Valid From</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Valid Until</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Usage</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Applicable Plans</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Branch</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayData.map((offer, index) => (
                  <tr key={offer._id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{offer.title}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                      {offer.offerType?.replace('-', ' ')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                      {formatDiscount(offer)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(offer.validFrom)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(offer.validUntil)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {offer.usageLimit 
                        ? `${offer.usedCount || 0} / ${offer.usageLimit}`
                        : `${offer.usedCount || 0} / ∞`}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        offer.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {offer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {offer.applicablePlans && offer.applicablePlans.length > 0
                        ? offer.applicablePlans.map(p => p.name || p).join(', ')
                        : 'All Plans'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {offer.branchId?.name || offer.branch?.name || 'All Branches'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

