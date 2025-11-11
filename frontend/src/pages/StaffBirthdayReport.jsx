import { useMemo, useState } from 'react'
import { CalendarHeart, Download, Filter } from 'lucide-react'
import DateInput from '../components/DateInput'

const celebrationDataset = [
  {
    id: 'celebration-001',
    staffId: 'STF1201',
    staffName: 'Anishv Suresh',
    occasion: 'Birthday',
    date: '2025-11-13',
    designation: 'Assessment Coach',
    branch: 'HSR Layout',
    contact: '9886355099',
    notes: 'Favourite cake: Dark chocolate'
  },
  {
    id: 'celebration-002',
    staffId: 'STF1220',
    staffName: 'Swathi Gowda',
    occasion: 'Work Anniversary',
    date: '2025-12-02',
    designation: 'Client Success',
    branch: 'Indiranagar',
    contact: '7892863424',
    notes: 'Completed 3 years of service'
  }
]

const occasionOptions = [
  { value: 'all', label: 'Birthday & Anniversary' },
  { value: 'Birthday', label: 'Birthday' },
  { value: 'Work Anniversary', label: 'Work Anniversary' }
]

export default function StaffBirthdayReport() {
  const [filters, setFilters] = useState({
    occasion: 'all',
    from: '2025-11-01',
    to: '2025-12-31'
  })

  const upcomingCelebrations = useMemo(() => {
    return celebrationDataset.filter(item => {
      if (filters.occasion !== 'all' && item.occasion !== filters.occasion) {
        return false
      }

      const celebrationDate = new Date(item.date)
      const fromDate = filters.from ? new Date(filters.from) : null
      const toDate = filters.to ? new Date(filters.to) : null

      if (fromDate && celebrationDate < fromDate) return false
      if (toDate && celebrationDate > toDate) return false

      return true
    })
  }, [filters])

  const summary = useMemo(() => {
    const birthdays = upcomingCelebrations.filter(item => item.occasion === 'Birthday').length
    const anniversaries = upcomingCelebrations.filter(item => item.occasion !== 'Birthday').length
    const nextCelebration = upcomingCelebrations.reduce((closest, item) => {
      if (!closest) return item
      return new Date(item.date) < new Date(closest.date) ? item : closest
    }, null)

    return {
      total: upcomingCelebrations.length,
      birthdays,
      anniversaries,
      nextCelebration
    }
  }, [upcomingCelebrations])

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
          <span className="text-orange-600 font-medium">Staff Birthday Report</span>
        </nav>
      </div>

      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Birthday Report</h1>
          <p className="text-gray-600 mt-1">Plan celebrations and reminders for your team in advance.</p>
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Occasion</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={filters.occasion}
              onChange={(event) => setFilters(prev => ({ ...prev, occasion: event.target.value }))}
            >
              {occasionOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">From</label>
            <DateInput
              value={filters.from}
              onChange={(event) => setFilters(prev => ({ ...prev, from: event.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">To</label>
            <DateInput
              value={filters.to}
              onChange={(event) => setFilters(prev => ({ ...prev, to: event.target.value }))}
            />
          </div>
          <div className="flex items-end gap-3">
            <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Reset
            </button>
          </div>
        </div>
        <div className="flex justify-end">
          <button className="px-5 py-2 bg-orange-500 text-white rounded-lg shadow hover:bg-orange-600 transition-colors">
            Go
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Upcoming Celebrations</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{summary.total}</p>
          <p className="text-xs text-gray-500 mt-3">Across the selected period</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Birthdays</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{summary.birthdays}</p>
          <p className="text-xs text-gray-500 mt-3">Send wishes and rewards</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Anniversaries</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{summary.anniversaries}</p>
          <p className="text-xs text-gray-500 mt-3">Plan recognition activities</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Next Celebration</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{summary.nextCelebration ? new Date(summary.nextCelebration.date).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short'
          }) : '—'}</p>
          <p className="text-xs text-gray-500 mt-3">{summary.nextCelebration ? summary.nextCelebration.staffName : 'No events in range'}</p>
        </article>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Celebration Planner</h2>
            <p className="text-sm text-gray-500">Stay on top of birthdays, anniversaries and milestones</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CalendarHeart className="w-4 h-4" />
            Showing {upcomingCelebrations.length} events
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Staff</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Staff ID</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Occasion</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Date</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Branch</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Contact</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {upcomingCelebrations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    No celebrations scheduled within the selected period.
                  </td>
                </tr>
              ) : (
                upcomingCelebrations.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{item.staffName}</span>
                        <span className="text-xs text-gray-500">{item.designation}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{item.staffId}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        {item.occasion}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{new Date(item.date).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })}</td>
                    <td className="px-6 py-4 text-gray-700">{item.branch}</td>
                    <td className="px-6 py-4 text-gray-700">{item.contact}</td>
                    <td className="px-6 py-4 text-gray-500">{item.notes}</td>
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


