import { useMemo, useState } from 'react'
import { Calendar, Download, Filter, ShieldCheck, AlertCircle } from 'lucide-react'
import DateInput from '../components/DateInput'

const leaveDataset = [
  {
    id: 'leave-001',
    staffId: 'STF1051',
    staffName: 'Vishva S',
    designation: 'Membership Consultant',
    leaveType: 'Casual Leave',
    startDate: '2025-11-06',
    endDate: '2025-11-06',
    duration: 1,
    status: 'Approved',
    approvedBy: 'Dhanush Kumar',
    remarks: 'Family emergency'
  },
  {
    id: 'leave-002',
    staffId: 'STF1024',
    staffName: 'Dhanush Kumar',
    designation: 'Sales Manager',
    leaveType: 'Sick Leave',
    startDate: '2025-10-28',
    endDate: '2025-10-29',
    duration: 2,
    status: 'Approved',
    approvedBy: 'Anjali Singh',
    remarks: 'Medical leave'
  },
  {
    id: 'leave-003',
    staffId: 'STF1097',
    staffName: 'Sahana Rao',
    designation: 'Trainer',
    leaveType: 'Comp Off',
    startDate: '2025-11-15',
    endDate: '2025-11-16',
    duration: 2,
    status: 'Pending',
    approvedBy: 'Pending Approval',
    remarks: 'Weekend event support'
  }
]

const rangeOptions = [
  { value: 'today', label: 'Today' },
  { value: 'this-week', label: 'This Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' }
]

const statusFilters = [
  { value: 'all', label: 'All Status' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Rejected', label: 'Rejected' }
]

export default function StaffLeaveReport() {
  const [filters, setFilters] = useState({
    staff: 'all',
    status: 'all',
    range: 'this-month',
    from: '',
    to: ''
  })

  const filteredLeaves = useMemo(() => {
    return leaveDataset.filter(entry => {
      if (filters.staff !== 'all' && entry.staffId !== filters.staff) {
        return false
      }
      if (filters.status !== 'all' && entry.status !== filters.status) {
        return false
      }
      return true
    })
  }, [filters.staff, filters.status])

  const summary = useMemo(() => {
    const approved = filteredLeaves.filter(leave => leave.status === 'Approved').length
    const pending = filteredLeaves.filter(leave => leave.status === 'Pending').length
    const totalDays = filteredLeaves.reduce((total, leave) => total + leave.duration, 0)

    return {
      totalLeaves: filteredLeaves.length,
      approved,
      pending,
      totalDays
    }
  }, [filteredLeaves])

  const resetFilters = () => {
    setFilters({ staff: 'all', status: 'all', range: 'this-month', from: '', to: '' })
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <nav className="text-sm">
          <span className="text-gray-600">Home</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">Reports</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">Staff</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-orange-600 font-medium">Staff Leave</span>
        </nav>
      </div>

      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Leave</h1>
          <p className="text-gray-600 mt-1">Monitor leave utilisation and approval trends for your team.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg shadow-sm hover:bg-orange-600 transition-colors">
          <Download className="w-4 h-4" />
          Export Excel
        </button>
      </header>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="w-4 h-4" />
          Filters
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Select Staff</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={filters.staff}
              onChange={(event) => setFilters(prev => ({ ...prev, staff: event.target.value }))}
            >
              <option value="all">All Staff</option>
              {leaveDataset.map(entry => (
                <option key={entry.staffId} value={entry.staffId}>{entry.staffName}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={filters.status}
              onChange={(event) => setFilters(prev => ({ ...prev, status: event.target.value }))}
            >
              {statusFilters.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Date Range</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={filters.range}
              onChange={(event) => setFilters(prev => ({ ...prev, range: event.target.value }))}
            >
              {rangeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">From</label>
            <DateInput
              disabled={filters.range !== 'custom'}
              value={filters.from}
              onChange={(event) => setFilters(prev => ({ ...prev, from: event.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">To</label>
            <DateInput
              disabled={filters.range !== 'custom'}
              value={filters.to}
              onChange={(event) => setFilters(prev => ({ ...prev, to: event.target.value }))}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button onClick={resetFilters} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            Reset
          </button>
          <button className="px-5 py-2 bg-orange-500 text-white rounded-lg shadow hover:bg-orange-600 transition-colors">
            Go
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Leaves</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{summary.totalLeaves}</p>
          <p className="text-xs text-gray-500 mt-3">Requested within the selected period</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{summary.approved}</p>
            </div>
            <ShieldCheck className="w-10 h-10 text-green-500" />
          </div>
          <p className="text-xs text-gray-500 mt-3">Approved by reporting managers</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Approval</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{summary.pending}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-orange-500" />
          </div>
          <p className="text-xs text-gray-500 mt-3">Awaiting action</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Leave Days</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{summary.totalDays}</p>
          <p className="text-xs text-gray-500 mt-3">Aggregate duration of approved & pending leaves</p>
        </article>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Leave Ledger</h2>
            <p className="text-sm text-gray-500">Comprehensive view of leave requests and approvals</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            Showing {filteredLeaves.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Staff</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Staff ID</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Designation</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Leave Type</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Duration</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Approved By</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                    No leave records found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{entry.staffName}</span>
                        <span className="text-xs text-gray-500">{entry.startDate} → {entry.endDate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{entry.staffId}</td>
                    <td className="px-6 py-4 text-gray-700">{entry.designation}</td>
                    <td className="px-6 py-4 text-gray-700">{entry.leaveType}</td>
                    <td className="px-6 py-4 text-gray-700">{entry.duration} {entry.duration > 1 ? 'days' : 'day'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          entry.status === 'Approved'
                            ? 'bg-green-100 text-green-700'
                            : entry.status === 'Pending'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{entry.approvedBy}</td>
                    <td className="px-6 py-4 text-gray-500">{entry.remarks}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}


