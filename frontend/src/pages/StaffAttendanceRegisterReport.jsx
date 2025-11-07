import { useMemo, useState } from 'react'
import { CalendarDays, Clock3, Users, Download, Filter } from 'lucide-react'

const hourSummary = [
  { id: 'STF1024', staff: 'Dhanush Kumar', totalHours: 162, avgDailyHours: 7.4, daysPresent: 22 },
  { id: 'STF1051', staff: 'Vishva S', totalHours: 148, avgDailyHours: 6.9, daysPresent: 21 },
  { id: 'STF1097', staff: 'Sahana Rao', totalHours: 171, avgDailyHours: 7.8, daysPresent: 23 }
]

const dayWiseDataset = [
  { date: '2025-11-01', staffPresent: 18, staffAbsent: 3 },
  { date: '2025-11-02', staffPresent: 14, staffAbsent: 7 },
  { date: '2025-11-03', staffPresent: 19, staffAbsent: 2 },
  { date: '2025-11-04', staffPresent: 17, staffAbsent: 5 },
  { date: '2025-11-05', staffPresent: 20, staffAbsent: 2 },
  { date: '2025-11-06', staffPresent: 18, staffAbsent: 3 },
  { date: '2025-11-07', staffPresent: 21, staffAbsent: 1 }
]

const availabilityMatrix = [
  { day: 'Monday', morning: 'Full', afternoon: 'Partial', evening: 'Full' },
  { day: 'Tuesday', morning: 'Full', afternoon: 'Full', evening: 'Partial' },
  { day: 'Wednesday', morning: 'Partial', afternoon: 'Full', evening: 'Full' },
  { day: 'Thursday', morning: 'Full', afternoon: 'Full', evening: 'Full' },
  { day: 'Friday', morning: 'Full', afternoon: 'Partial', evening: 'Partial' },
  { day: 'Saturday', morning: 'Full', afternoon: 'Full', evening: 'Partial' },
  { day: 'Sunday', morning: 'Off', afternoon: 'Off', evening: 'Off' }
]

const availabilitySlots = ['morning', 'afternoon', 'evening']

const staffList = [
  { value: 'all', label: 'All Staff' },
  { value: 'STF1024', label: 'Dhanush Kumar' },
  { value: 'STF1051', label: 'Vishva S' },
  { value: 'STF1097', label: 'Sahana Rao' }
]

export default function StaffAttendanceRegisterReport() {
  const [filters, setFilters] = useState({
    staff: 'all',
    designation: 'all',
    year: '2025',
    month: '11'
  })
  const [activeTab, setActiveTab] = useState('hours')

  const summaryCards = useMemo(() => {
    const totalStaff = hourSummary.length
    const totalHours = hourSummary.reduce((sum, record) => sum + record.totalHours, 0)
    const avgAttendance = dayWiseDataset.length
      ? Math.round(
          (dayWiseDataset.reduce((sum, record) => sum + record.staffPresent, 0) /
            (dayWiseDataset.reduce((sum, record) => sum + record.staffPresent + record.staffAbsent, 0))) * 100
        )
      : 0

    return {
      totalStaff,
      totalHours,
      avgAttendance,
      activeDays: dayWiseDataset.length
    }
  }, [])

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
          <span className="text-orange-600 font-medium">Attendance Register</span>
        </nav>
      </div>

      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Attendance Register</h1>
          <p className="text-gray-600 mt-1">Analyse attendance trends, productive hours and team availability.</p>
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
            <label className="text-sm font-medium text-gray-700">Staff</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={filters.staff}
              onChange={(event) => setFilters(prev => ({ ...prev, staff: event.target.value }))}
            >
              {staffList.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Designation</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={filters.designation}
              onChange={(event) => setFilters(prev => ({ ...prev, designation: event.target.value }))}
            >
              <option value="all">All Designations</option>
              <option value="sales">Sales</option>
              <option value="trainer">Trainer</option>
              <option value="frontdesk">Front Desk</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Year</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={filters.year}
              onChange={(event) => setFilters(prev => ({ ...prev, year: event.target.value }))}
            >
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Month</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={filters.month}
              onChange={(event) => setFilters(prev => ({ ...prev, month: event.target.value }))}
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map(monthValue => (
                <option key={monthValue} value={monthValue.toString().padStart(2, '0')}>
                  {new Date(2025, monthValue - 1).toLocaleString('en-IN', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors w-full">
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
          <p className="text-sm text-gray-500">Total Staff</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{summaryCards.totalStaff}</p>
          <p className="text-xs text-gray-500 mt-3">Employees included in register</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Productive Hours</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{summaryCards.totalHours}</p>
            </div>
            <Clock3 className="w-10 h-10 text-orange-500" />
          </div>
          <p className="text-xs text-gray-500 mt-3">For the selected month</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Attendance Health</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{summaryCards.avgAttendance}%</p>
            </div>
            <Users className="w-10 h-10 text-orange-500" />
          </div>
          <p className="text-xs text-gray-500 mt-3">Average presence across the period</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Active Working Days</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{summaryCards.activeDays}</p>
          <p className="text-xs text-gray-500 mt-3">Days with recorded attendance</p>
        </article>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 pt-4 border-b border-gray-200">
          <div className="flex space-x-6">
            {[
              { id: 'hours', label: 'Hours', icon: Clock3 },
              { id: 'days', label: 'Days', icon: CalendarDays },
              { id: 'availability', label: 'Staff availability', icon: Users }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 pb-3 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'hours' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Staff</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Staff ID</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Days Present</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Total Hours</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Avg Hours / Day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {hourSummary.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-900 font-medium">{record.staff}</td>
                    <td className="px-6 py-4 text-gray-700">{record.id}</td>
                    <td className="px-6 py-4 text-gray-700">{record.daysPresent}</td>
                    <td className="px-6 py-4 text-gray-700">{record.totalHours}</td>
                    <td className="px-6 py-4 text-gray-700">{record.avgDailyHours} hrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'days' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {dayWiseDataset.map(day => (
              <div key={day.date} className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                <p className="text-sm text-gray-500">{new Date(day.date).toLocaleDateString('en-IN', {
                  weekday: 'short', day: 'numeric', month: 'short'
                })}</p>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-xs text-gray-500">Present</p>
                    <p className="text-lg font-semibold text-green-600">{day.staffPresent}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Absent</p>
                    <p className="text-lg font-semibold text-red-500">{day.staffAbsent}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'availability' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Day</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Morning</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Afternoon</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Evening</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {availabilityMatrix.map(slot => (
                  <tr key={slot.day} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-900 font-medium">{slot.day}</td>
                    {availabilitySlots.map(period => (
                      <td key={period} className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            slot[period] === 'Full'
                              ? 'bg-green-100 text-green-700'
                              : slot[period] === 'Partial'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {slot[period]}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}


