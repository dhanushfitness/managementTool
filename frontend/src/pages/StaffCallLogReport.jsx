import { useMemo, useState } from 'react'
import { PhoneCall, Download, Filter, Clock4, AlertTriangle, CheckCircle, Calendar } from 'lucide-react'

const enquiryLogs = [
  {
    id: 'enq-001',
    memberName: 'Abhishek',
    mobile: '7357277925',
    staff: 'Dhanush Kumar SK',
    callStatus: 'Not Interested',
    statusCategory: 'Contacted',
    callTime: '2025-11-04T17:29:00Z',
    details: 'He will not join',
    color: 'success'
  },
  {
    id: 'enq-002',
    memberName: 'Yogesh G',
    mobile: '8668399254',
    staff: 'Dhanush Kumar SK',
    callStatus: 'Future Prospect',
    statusCategory: 'Contacted',
    callTime: '2025-11-04T17:23:00Z',
    details: 'Will join in December',
    color: 'success'
  },
  {
    id: 'enq-003',
    memberName: 'Yogesh G',
    mobile: '8668399254',
    staff: 'Vishva S',
    callStatus: 'Upcoming Call',
    statusCategory: 'Upcoming',
    callTime: '2025-12-01T17:00:00Z',
    details: 'Follow-up scheduled',
    color: 'warning'
  }
]

const memberLogs = [
  {
    id: 'mem-001',
    memberName: 'Anishv Suresh',
    mobile: '9886355099',
    staff: 'Vishva S',
    callType: 'Assessment call',
    statusCategory: 'Upcoming',
    scheduleTime: '2025-11-13T21:00:00Z',
    details: 'Discuss renewal options'
  },
  {
    id: 'mem-002',
    memberName: 'Anishv Suresh',
    mobile: '9886355099',
    staff: 'Vishva S',
    callType: 'Welcome Call',
    statusCategory: 'Upcoming',
    scheduleTime: '2025-11-07T21:00:00Z',
    details: 'Welcome onboard message'
  }
]

const statusPills = {
  Upcoming: 'bg-blue-100 text-blue-700',
  Missed: 'bg-red-100 text-red-700',
  Contacted: 'bg-green-100 text-green-700',
  'No Contact': 'bg-gray-100 text-gray-600'
}

const callTypeFilters = [
  { value: 'all', label: 'All Call Types' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'courtesy', label: 'Courtesy' },
  { value: 'birthday', label: 'Birthday' }
]

const statusFilters = [
  { value: 'all', label: 'All Status' },
  { value: 'Upcoming', label: 'Upcoming' },
  { value: 'Missed', label: 'Missed' },
  { value: 'Contacted', label: 'Contacted' },
  { value: 'No Contact', label: 'No Contact' }
]

function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function StaffCallLogReport() {
  const [activeTab, setActiveTab] = useState('enquiry')
  const [filters, setFilters] = useState({
    from: '2025-11-01',
    to: '2025-11-07',
    staff: 'all',
    callType: 'all',
    status: 'all'
  })

  const summary = useMemo(() => ({
    enquiry: {
      upcoming: enquiryLogs.filter(log => log.statusCategory === 'Upcoming').length,
      missed: enquiryLogs.filter(log => log.statusCategory === 'Missed').length,
      contacted: enquiryLogs.filter(log => log.statusCategory === 'Contacted').length,
      total: enquiryLogs.length
    },
    member: {
      upcoming: memberLogs.filter(log => log.statusCategory === 'Upcoming').length,
      missed: memberLogs.filter(log => log.statusCategory === 'Missed').length,
      contacted: memberLogs.filter(log => log.statusCategory === 'Contacted').length,
      total: memberLogs.length
    }
  }), [])

  const filteredEnquiryLogs = useMemo(() => {
    const fromDate = filters.from ? new Date(filters.from) : null
    const toDate = filters.to ? new Date(filters.to) : null
    if (toDate) {
      toDate.setHours(23, 59, 59, 999)
    }

    return enquiryLogs.filter(log => {
      const callDate = new Date(log.callTime)
      if (filters.status !== 'all' && log.statusCategory !== filters.status) return false
      if (filters.staff !== 'all' && log.staff !== filters.staff) return false
      if (fromDate && callDate < fromDate) return false
      if (toDate && callDate > toDate) return false
      return true
    })
  }, [filters.from, filters.to, filters.staff, filters.status])

  const filteredMemberLogs = useMemo(() => {
    const fromDate = filters.from ? new Date(filters.from) : null
    const toDate = filters.to ? new Date(filters.to) : null
    if (toDate) {
      toDate.setHours(23, 59, 59, 999)
    }

    return memberLogs.filter(log => {
      const scheduledDate = new Date(log.scheduleTime)
      if (filters.status !== 'all' && log.statusCategory !== filters.status) return false
      if (filters.staff !== 'all' && log.staff !== filters.staff) return false
      if (filters.callType !== 'all') {
        const normalizedCallType = log.callType ? log.callType.toLowerCase() : ''
        if (!normalizedCallType.includes(filters.callType)) return false
      }
      if (fromDate && scheduledDate < fromDate) return false
      if (toDate && scheduledDate > toDate) return false
      return true
    })
  }, [filters.from, filters.to, filters.staff, filters.status, filters.callType])

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
          <span className="text-orange-600 font-medium">Call Log Report</span>
        </nav>
      </div>

      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Call Log Report</h1>
          <p className="text-gray-600 mt-1">Review outreach performance, call outcomes and follow-up adherence.</p>
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
            <label className="text-sm font-medium text-gray-700">From</label>
            <input
              type="date"
              value={filters.from}
              onChange={(event) => setFilters(prev => ({ ...prev, from: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">To</label>
            <input
              type="date"
              value={filters.to}
              onChange={(event) => setFilters(prev => ({ ...prev, to: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Staff</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={filters.staff}
              onChange={(event) => setFilters(prev => ({ ...prev, staff: event.target.value }))}
            >
              <option value="all">All Staff</option>
              {[...new Set([...enquiryLogs, ...memberLogs].map(log => log.staff))].map(staff => (
                <option key={staff} value={staff}>{staff}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Call Type</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={filters.callType}
              onChange={(event) => setFilters(prev => ({ ...prev, callType: event.target.value }))}
            >
              {callTypeFilters.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
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
        </div>
        <div className="flex justify-end gap-3">
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            Reset
          </button>
          <button className="px-5 py-2 bg-orange-500 text-white rounded-lg shadow hover:bg-orange-600 transition-colors">
            Go
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Upcoming Calls</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{summary[activeTab]?.upcoming || 0}</p>
          <p className="text-xs text-gray-500 mt-3">Scheduled follow-ups</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Missed Calls</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{summary[activeTab]?.missed || 0}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <p className="text-xs text-gray-500 mt-3">Needs immediate attention</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Contacted</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{summary[activeTab]?.contacted || 0}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <p className="text-xs text-gray-500 mt-3">Successfully connected conversations</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Calls</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{summary[activeTab]?.total || 0}</p>
          <p className="text-xs text-gray-500 mt-3">Across the selected filters</p>
        </article>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 pt-4 border-b border-gray-200">
          <div className="flex space-x-6">
            {[
              { id: 'enquiry', label: 'Enquiry Call Log', count: summary.enquiry.total },
              { id: 'member', label: 'Member Call Log', count: summary.member.total }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 pb-3 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <PhoneCall className="w-4 h-4" />
                {tab.label}
                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'enquiry' ? (
          <div className="divide-y divide-gray-200">
            {filteredEnquiryLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No enquiry call logs for the selected filters.</div>
            ) : (
              filteredEnquiryLogs.map(log => (
                <article key={log.id} className="px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <span
                      className={`mt-1 w-2.5 h-12 rounded-full ${
                        log.color === 'success' ? 'bg-green-500' : log.color === 'warning' ? 'bg-orange-500' : 'bg-gray-300'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          statusPills[log.statusCategory] || 'bg-gray-100 text-gray-600'
                        }`}>
                          {log.statusCategory}
                        </span>
                        <span>•</span>
                        <span>{formatDateTime(log.callTime)}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mt-1">{log.memberName}</h3>
                      <p className="text-sm text-gray-500">Mobile: {log.mobile}</p>
                      <p className="text-sm text-gray-500">Updated by {log.staff}</p>
                      <p className="text-sm text-gray-700 mt-2">{log.details}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <Clock4 className="w-4 h-4" />
                    {log.callStatus}
                  </div>
                </article>
              ))
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredMemberLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No member call logs for the selected filters.</div>
            ) : (
              filteredMemberLogs.map(log => (
                <article key={log.id} className="px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        statusPills[log.statusCategory] || 'bg-gray-100 text-gray-600'
                      }`}>
                        {log.statusCategory}
                      </span>
                      <span>•</span>
                      <span>{log.callType}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mt-1">{log.memberName}</h3>
                    <p className="text-sm text-gray-500">Mobile: {log.mobile}</p>
                    <p className="text-sm text-gray-500">Scheduled for {log.staff}</p>
                    <p className="text-sm text-gray-700 mt-2">{log.details}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    {formatDateTime(log.scheduleTime)}
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  )
}


