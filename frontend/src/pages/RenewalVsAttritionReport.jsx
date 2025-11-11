import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Eye } from 'lucide-react'
import LoadingPage from '../components/LoadingPage'
import { getRenewalVsAttritionReport, exportRenewalVsAttritionReport, getRenewalVsAttritionList } from '../api/reports'
import toast from 'react-hot-toast'
import Breadcrumbs from '../components/Breadcrumbs'

export default function RenewalVsAttritionReport() {
  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString())
  const [hasSearched, setHasSearched] = useState(false)
  const [viewModal, setViewModal] = useState({ open: false, type: null, branchId: null })

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Fetch Renewal vs Attrition report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['renewal-vs-attrition-report', selectedYear, selectedMonth],
    queryFn: () => getRenewalVsAttritionReport({ 
      year: selectedYear,
      month: selectedMonth
    }),
    enabled: hasSearched
  })

  // Fetch list data for view modal
  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['renewal-vs-attrition-list', selectedYear, selectedMonth, viewModal.type, viewModal.branchId],
    queryFn: () => getRenewalVsAttritionList({
      year: selectedYear,
      month: selectedMonth,
      type: viewModal.type,
      branchId: viewModal.branchId || 'all'
    }),
    enabled: viewModal.open && viewModal.type !== null
  })

  const summary = reportData?.data?.summary || []
  const oldExpired = reportData?.data?.oldExpired || []
  const renewedInAdvance = reportData?.data?.renewedInAdvance || []
  const totals = reportData?.data?.totals || {
    totalExpiry: 0,
    totalRenewal: 0,
    totalOldExpiry: 0,
    totalReinstatements: 0,
    totalRenewedInAdvance: 0
  }

  const handleSearch = () => {
    setHasSearched(true)
    refetch()
  }

  const handleExportExcel = async () => {
    try {
      const response = await exportRenewalVsAttritionReport({
        year: selectedYear,
        month: selectedMonth
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `renewal-vs-attrition-${monthNames[parseInt(selectedMonth) - 1]}-${selectedYear}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Report exported successfully')
    } catch (error) {
      toast.error('Failed to export report')
      console.error('Export error:', error)
    }
  }

  const handleView = (type, branchId = null) => {
    setViewModal({ open: true, type, branchId })
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  if (isLoading) return <LoadingPage />

  return (
    <div className="space-y-6 max-w-full w-full overflow-x-hidden">
      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <Breadcrumbs />
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              {monthNames.map((month, index) => (
                <option key={index + 1} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <input
              type="text"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Go
          </button>
          <button
            onClick={handleExportExcel}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* This Month's Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">This Month's Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left">S.No</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Studio</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Total Expiry</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Total Renewal</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Renewal%</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Attrition%</th>
                <th className="border border-gray-300 px-4 py-2 text-center">List</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((item, index) => (
                <tr key={item.branchId}>
                  <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
                  <td className="border border-gray-300 px-4 py-2">{item.branchName}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{item.totalExpiry}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{item.totalRenewal}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{item.renewalPercent}%</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{item.attritionPercent}%</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <button
                      onClick={() => handleView('expiring', item.branchId)}
                      className="px-4 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold">
                <td className="border border-gray-300 px-4 py-2" colSpan="2">Total</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{totals.totalExpiry}</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{totals.totalRenewal}</td>
                <td className="border border-gray-300 px-4 py-2" colSpan="3"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Old Expired Memberships */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Old Expired Memberships</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left">S.No</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Studio</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Total Old Expiry</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Total Reinstatements</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Reinstatement%</th>
                <th className="border border-gray-300 px-4 py-2 text-center">List</th>
              </tr>
            </thead>
            <tbody>
              {oldExpired.map((item, index) => (
                <tr key={item.branchId}>
                  <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
                  <td className="border border-gray-300 px-4 py-2">{item.branchName}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{item.totalOldExpiry}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{item.totalReinstatements}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{item.reinstatementPercent}%</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <button
                      onClick={() => handleView('old-expired', item.branchId)}
                      className="px-4 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold">
                <td className="border border-gray-300 px-4 py-2" colSpan="2">Total</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{totals.totalOldExpiry}</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{totals.totalReinstatements}</td>
                <td className="border border-gray-300 px-4 py-2" colSpan="2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Membership Renewed In Advance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Membership Renewed In Advance</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left">S.No</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Studio</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Renewed In Advance</th>
                <th className="border border-gray-300 px-4 py-2 text-center">List</th>
              </tr>
            </thead>
            <tbody>
              {renewedInAdvance.map((item, index) => (
                <tr key={item.branchId}>
                  <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
                  <td className="border border-gray-300 px-4 py-2">{item.branchName}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{item.renewedInAdvance}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <button
                      onClick={() => handleView('renewed-advance', item.branchId)}
                      className="px-4 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold">
                <td className="border border-gray-300 px-4 py-2" colSpan="2">Total</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{totals.totalRenewedInAdvance}</td>
                <td className="border border-gray-300 px-4 py-2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {viewModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {viewModal.type === 'expiring' && 'Expiring Memberships'}
                {viewModal.type === 'old-expired' && 'Old Expired Memberships'}
                {viewModal.type === 'renewed-advance' && 'Renewed In Advance'}
              </h3>
              <button
                onClick={() => setViewModal({ open: false, type: null, branchId: null })}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            {listLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left">Member ID</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Member Name</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Mobile</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Service Name</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Start Date</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Expiry Date</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Bill Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(listData?.data?.records || []).map((record) => (
                      <tr key={record._id}>
                        <td className="border border-gray-300 px-4 py-2">{record.memberId}</td>
                        <td className="border border-gray-300 px-4 py-2">{record.memberName}</td>
                        <td className="border border-gray-300 px-4 py-2">{record.mobile}</td>
                        <td className="border border-gray-300 px-4 py-2">{record.serviceName}</td>
                        <td className="border border-gray-300 px-4 py-2">{formatDate(record.startDate)}</td>
                        <td className="border border-gray-300 px-4 py-2">{formatDate(record.expiryDate)}</td>
                        <td className="border border-gray-300 px-4 py-2">{record.billNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

