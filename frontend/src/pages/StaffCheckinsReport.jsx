import { useMemo, useState } from 'react'
import { CalendarRange, Download, Filter, Users, Activity } from 'lucide-react'

const mockCheckins = [
  {
    id: 'chk-001',
    staffName: 'Dhanush Kumar',
    staffId: 'STF1024',
    branch: 'Koramangala',
    designation: 'Sales Manager',
    checkInTime: '2025-11-07T09:05:00Z',
    checkOutTime: '2025-11-07T18:12:00Z',
    method: 'Biometric'
  },
  {
    id: 'chk-002',
    staffName: 'Vishva S',
    staffId: 'STF1051',
    branch: 'Koramangala',
    designation: 'Membership Consultant',
    checkInTime: '2025-11-07T08:42:00Z',
    checkOutTime: '2025-11-07T17:35:00Z',
    method: 'Manual'
  },
  {
    id: 'chk-003',
    staffName: 'Sahana Rao',
    staffId: 'STF1097',
    branch: 'Indiranagar',
    designation: 'Trainer',
    checkInTime: '2025-11-07T06:58:00Z',
    checkOutTime: '2025-11-07T15:04:00Z',
    method: 'QR'
  }
]

const dateRanges = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last-7-days', label: 'Last 7 Days' },
  { value: 'last-30-days', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' }
]

const staffOptions = [
  { value: 'all', label: 'All Staff' },
  { value: 'STF1024', label: 'Dhanush Kumar' },
  { value: 'STF1051', label: 'Vishva S' },
  { value: 'STF1097', label: 'Sahana Rao' }
]

function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function StaffCheckinsReport() {
  const [filters, setFilters] = useState({
    staff: 'all',
    range: 'today',
    from: '',
    to: ''
  })

  const resetFilters = () => {
    setFilters({ staff: 'all', range: 'today', from: '', to: '' })
  }

  const filteredRecords = useMemo(() => {
    return mockCheckins.filter(record => {
      if (filters.staff !== 'all' && record.staffId !== filters.staff) {
        return false
      }
      return true
    })
  }, [filters.staff])

  const summary = useMemo(() => {
    const distinctStaff = new Set(filteredRecords.map(r => r.staffId))
    const totalHours = filteredRecords.reduce((total, record) => {
      const start = record.checkInTime ? new Date(record.checkInTime) : null
      const end = record.checkOutTime ? new Date(record.checkOutTime) : null
      if (!start || !end) return total
      return total + Math.max(0, (end - start) / (1000 * 60 * 60))
    }, 0)

    return {
      totalCheckins: filteredRecords.length,
      uniqueStaff: distinctStaff.size,
      avgHours: filteredRecords.length ? (totalHours / filteredRecords.length).toFixed(1) : '0.0'
    }
  }, [filteredRecords])

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
          <span className="text-orange-600 font-medium">Staff Check-Ins</span>
        </nav>
      </div>

      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Check-Ins</h1>
          <p className="text-gray-600 mt-1">Track staff attendance across branches in real-time.</p>
        </div>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg shadow-sm hover:bg-orange-600 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Excel
        </button>
      </header>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="w-4 h-4" />
          Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Select Staff</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={filters.staff}
              onChange={(event) => setFilters(prev => ({ ...prev, staff: event.target.value }))}
            >
              {staffOptions.map(option => (
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
              {dateRanges.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">From</label>
            <input
              type="date"
              disabled={filters.range !== 'custom'}
              value={filters.from}
              onChange={(event) => setFilters(prev => ({ ...prev, from: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">To</label>
            <input
              type="date"
              disabled={filters.range !== 'custom'}
              value={filters.to}
              onChange={(event) => setFilters(prev => ({ ...prev, to: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Reset
          </button>
          <button className="px-5 py-2 bg-orange-500 text-white rounded-lg shadow hover:bg-orange-600 transition-colors">
            Go
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Check-Ins</p>
              <p className="text-2xl font-semibold text-gray-900">{summary.totalCheckins}</p>
            </div>
            <CalendarRange className="w-10 h-10 text-orange-500" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Based on the selected filters</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Unique Staff</p>
              <p className="text-2xl font-semibold text-gray-900">{summary.uniqueStaff}</p>
            </div>
            <Users className="w-10 h-10 text-orange-500" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Staff who checked in during the period</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Average Hours</p>
              <p className="text-2xl font-semibold text-gray-900">{summary.avgHours} hrs</p>
            </div>
            <Activity className="w-10 h-10 text-orange-500" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Per check-in</p>
        </article>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Check-In Activity</h2>
            <p className="text-sm text-gray-500">Detailed log of staff attendance</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CalendarRange className="w-4 h-4" />
            Showing {filteredRecords.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Staff</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Staff ID</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Designation</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Branch</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Check-In</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Check-Out</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Method</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                    No results found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => {
                  const start = record.checkInTime ? new Date(record.checkInTime) : null
                  const end = record.checkOutTime ? new Date(record.checkOutTime) : null
                  const hours = start && end ? Math.max(0, (end - start) / (1000 * 60 * 60)).toFixed(1) : '—'

                  return (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{record.staffName}</span>
                          <span className="text-xs text-gray-500">Last sync 2 mins ago</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{record.staffId}</td>
                      <td className="px-6 py-4 text-gray-700">{record.designation}</td>
                      <td className="px-6 py-4 text-gray-700">{record.branch}</td>
                      <td className="px-6 py-4 text-gray-700">{formatDateTime(record.checkInTime)}</td>
                      <td className="px-6 py-4 text-gray-700">{formatDateTime(record.checkOutTime)}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          {record.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{hours}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}


