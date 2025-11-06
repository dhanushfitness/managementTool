import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Download } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getLeadSourceReport, exportLeadSourceReport } from '../api/reports'

export default function LeadSourceReport() {
  const [dateFilter, setDateFilter] = useState('today')

  // Fetch lead source report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['lead-source-report', dateFilter],
    queryFn: () => getLeadSourceReport({ dateFilter }),
    enabled: false // Only fetch when "Go" is clicked
  })

  // Show dummy data by default
  const showDummyData = !reportData && !isLoading

  const handleSearch = () => {
    refetch()
  }

  const handleExportExcel = async () => {
    try {
      const response = await exportLeadSourceReport({ dateFilter })
      // Create a blob and download
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `lead-source-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  // Dummy data for visualization - all lead sources from the image
  const dummyData = [
    { leadSource: 'Others', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'airfit', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Word Of Mouth', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Website', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Walk-In', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'TV', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Staff', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Social Media', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'SMS', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Signboard', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Referral', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Radio', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Promotional Consultant', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Posters', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Phone', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Passing By', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Newspapers', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Missed Call App', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Member App', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Magazine', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Listing Sites', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Hoardings', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Google', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Friends', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Flyers/Banners', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Facebook', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'E-Mail', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Corporate', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Canopi', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 },
    { leadSource: 'Admin Test', totalFootfall: 0, activeEnquiries: 0, lostEnquiries: 0, converted: 0, conversionPercent: 0, convertedOpportunityValue: 0, spotConversion: 0, spotValue: 0, totalConversionPercent: 0, totalValue: 0 }
  ]

  // Use dummy data if no data is loaded yet
  const displayData = reportData?.data?.leadSources || (showDummyData ? dummyData : [])
  const hasData = displayData && displayData.length > 0

  const formatCurrency = (value) => {
    return `₹${value.toLocaleString('en-IN')}`
  }

  const formatPercent = (value) => {
    return `${value.toFixed(2)}%`
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
          <span className="text-orange-600 font-medium">Leadsource</span>
        </nav>
      </div>

      {/* Page Title */}
      <div className="text-center w-full max-w-full overflow-hidden">
        <h1 className="text-3xl font-bold text-gray-900">Leadsource</h1>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
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

          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full max-w-full overflow-hidden">
        {isLoading ? (
          <LoadingPage message="Loading lead source report..." fullScreen={false} />
        ) : !hasData ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No Results Found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full" style={{ maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full" style={{ minWidth: '1200px', width: '100%' }}>
              <thead>
                <tr className="border-b border-gray-200 bg-blue-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">S.No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Lead Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Footfall</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Active Enquiries</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Lost Enquiries</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Converted</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Conversion %</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Converted Opportunity Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Spot Conversion</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Conversion %</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Value</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayData.map((item, index) => (
                  <tr key={item.leadSource || index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.leadSource}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.totalFootfall || 0}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.activeEnquiries || 0}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.lostEnquiries || 0}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.converted || 0}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{formatPercent(item.conversionPercent || 0)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{formatCurrency(item.convertedOpportunityValue || 0)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.spotConversion || 0}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{formatCurrency(item.spotValue || 0)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{formatPercent(item.totalConversionPercent || 0)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{formatCurrency(item.totalValue || 0)}</td>
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

