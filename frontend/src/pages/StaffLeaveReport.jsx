import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Download, Filter, ShieldCheck, AlertCircle, Sparkles, RefreshCcw } from 'lucide-react'
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
      {/* Header */}
      <div className="space-y-3">
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/dashboard" className="text-gray-500 hover:text-orange-600 transition-colors">Home</Link>
          <span className="text-gray-300">/</span>
          <Link to="/reports" className="text-gray-500 hover:text-orange-600 transition-colors">Reports</Link>
          <span className="text-gray-300">/</span>
          <Link to="/staff" className="text-gray-500 hover:text-orange-600 transition-colors">Staff</Link>
          <span className="text-gray-300">/</span>
          <span className="text-orange-600 font-semibold">Staff Leave</span>
        </nav>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Staff Leave Report</h1>
            <p className="text-gray-600 mt-1">Monitor leave utilisation and approval trends for your team</p>
          </div>
          <button className="group inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold shadow-lg hover:shadow-xl">
            <Download className="w-4 h-4 group-hover:animate-bounce" />
            Export Excel
          </button>
        </div>
      </div>

      <section className="bg-white rounded-2xl shadow-sm border-2 border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-lg">
              <Filter className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">Filter Options</span>
          </div>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
        
        <div className="p-6 space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600">Select Staff</label>
              <select
                className="w-full appearance-none rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
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
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600">Status</label>
              <select
                className="w-full appearance-none rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                value={filters.status}
                onChange={(event) => setFilters(prev => ({ ...prev, status: event.target.value }))}
              >
              {statusFilters.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600">Date Range</label>
            <select
              className="w-full appearance-none rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
              value={filters.range}
              onChange={(event) => setFilters(prev => ({ ...prev, range: event.target.value }))}
            >
              {rangeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600">From</label>
            <DateInput
              disabled={filters.range !== 'custom'}
              value={filters.from}
              onChange={(event) => setFilters(prev => ({ ...prev, from: event.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600">To</label>
            <DateInput
              disabled={filters.range !== 'custom'}
              value={filters.to}
              onChange={(event) => setFilters(prev => ({ ...prev, to: event.target.value }))}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-4">
          <button className="group inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold shadow-lg hover:shadow-xl">
            <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
            Apply Filters
          </button>
        </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <article className="relative overflow-hidden bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-6 hover:shadow-lg transition-all">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-100/40 rounded-full blur-2xl"></div>
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Total Leaves</p>
          <p className="text-3xl font-black text-blue-600">{summary.totalLeaves}</p>
          <p className="text-xs text-gray-500 mt-2">Requested within period</p>
        </article>
        <article className="relative overflow-hidden bg-white rounded-2xl shadow-sm border-2 border-green-200 p-6 hover:shadow-lg transition-all">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-green-100/40 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Approved</p>
              <p className="text-3xl font-black text-green-600">{summary.approved}</p>
            </div>
            <ShieldCheck className="w-10 h-10 text-green-500" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Manager approved</p>
        </article>
        <article className="relative overflow-hidden bg-white rounded-2xl shadow-sm border-2 border-orange-200 p-6 hover:shadow-lg transition-all">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-orange-100/40 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Pending</p>
              <p className="text-3xl font-black text-orange-600">{summary.pending}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-orange-500" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Awaiting action</p>
        </article>
        <article className="relative overflow-hidden bg-white rounded-2xl shadow-sm border-2 border-purple-200 p-6 hover:shadow-lg transition-all">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-purple-100/40 rounded-full blur-2xl"></div>
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Total Days</p>
          <p className="text-3xl font-black text-purple-600">{summary.totalDays}</p>
          <p className="text-xs text-gray-500 mt-2">Aggregate duration</p>
        </article>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border-2 border-gray-200">
        <div className="px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900">Leave Ledger</h2>
            <p className="text-sm text-gray-600">Comprehensive view of leave requests and approvals</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Calendar className="w-4 h-4" />
            Showing {filteredLeaves.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Staff</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Staff ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Designation</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Leave Type</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Approved By</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                    No leave records found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map(entry => (
                  <tr key={entry.id} className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{entry.staffName}</span>
                        <span className="text-xs font-medium text-gray-500">{entry.startDate} → {entry.endDate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-700">{entry.staffId}</td>
                    <td className="px-6 py-4 font-medium text-gray-700">{entry.designation}</td>
                    <td className="px-6 py-4 font-medium text-gray-700">{entry.leaveType}</td>
                    <td className="px-6 py-4 font-medium text-gray-700">{entry.duration} {entry.duration > 1 ? 'days' : 'day'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold shadow-sm ${
                          entry.status === 'Approved'
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : entry.status === 'Pending'
                            ? 'bg-orange-100 text-orange-700 border border-orange-200'
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-700">{entry.approvedBy}</td>
                    <td className="px-6 py-4 font-medium text-gray-600">{entry.remarks}</td>
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


