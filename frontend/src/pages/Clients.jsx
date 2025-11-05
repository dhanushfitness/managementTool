import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getMembers, searchMembers } from '../api/members'
import { Search, Download, Mail, MessageSquare, User, Image as ImageIcon } from 'lucide-react'

export default function Clients() {
  const [search, setSearch] = useState('')
  const [validityFilter, setValidityFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['members', search, validityFilter],
    queryFn: () => getMembers({ 
      search, 
      status: validityFilter === 'all' ? undefined : validityFilter,
      page: 1, 
      limit: 20 
    }).then(res => res.data)
  })

  const stats = {
    total: data?.pagination?.total || 0,
    active: data?.members?.filter(m => m.membershipStatus === 'active').length || 0,
    inactive: data?.members?.filter(m => m.membershipStatus !== 'active').length || 0
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search clients..."
              className="input pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={validityFilter}
            onChange={(e) => setValidityFilter(e.target.value)}
            className="input"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <button className="btn btn-secondary">Import Member Details</button>
          <button className="btn btn-secondary">Mailer's List</button>
          <button className="btn btn-secondary">Add to Mailer</button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div>
            <span className="text-sm text-gray-600">Total Members: </span>
            <span className="font-bold">{stats.total}</span>
          </div>
          <div>
            <span className="text-sm text-gray-600">Active: </span>
            <span className="font-bold text-green-600">{stats.active}</span>
          </div>
          <div>
            <span className="text-sm text-gray-600">Inactive: </span>
            <span className="font-bold text-red-600">{stats.inactive}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <select className="input">
            <option>Filter</option>
          </select>
          <select className="input">
            <option>Communicate</option>
            <option>Send Email</option>
            <option>Send SMS</option>
          </select>
          <button className="btn btn-primary flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export Clients
          </button>
        </div>
      </div>

      {/* Clients Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">
                  <input type="checkbox" />
                </th>
                <th className="text-left py-3 px-4">Profile</th>
                <th className="text-left py-3 px-4">Billing</th>
                <th className="text-left py-3 px-4">Service Card</th>
                <th className="text-left py-3 px-4">Attendance ID</th>
                <th className="text-left py-3 px-4">All Log</th>
                <th className="text-left py-3 px-4">Info</th>
                <th className="text-left py-3 px-4">Appointment</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="9" className="text-center py-8">Loading...</td>
                </tr>
              ) : (
                data?.members?.map((member) => (
                  <tr key={member._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <input type="checkbox" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {member.profilePicture ? (
                          <img src={member.profilePicture} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <Link to={`/clients/${member._id}`} className="font-medium text-primary-600 hover:underline">
                            {member.firstName} {member.lastName}
                          </Link>
                          <p className="text-sm text-gray-500">{member.memberId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-primary-600 hover:underline">Payments</button>
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-primary-600 hover:underline">View</button>
                    </td>
                    <td className="py-3 px-4">{member.memberId}</td>
                    <td className="py-3 px-4">
                      <button className="text-primary-600">+</button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="relative group">
                        <span className="text-gray-600">Last Comm</span>
                        <div className="hidden group-hover:block absolute z-10 bg-white p-2 shadow-lg rounded border">
                          Last communication details
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="relative group">
                        <button className="text-gray-600">ℹ️</button>
                        <div className="hidden group-hover:block absolute z-10 bg-white p-2 shadow-lg rounded border w-48">
                          <p>Status: {member.membershipStatus}</p>
                          <p>Last Contacted: N/A</p>
                          <p>Total Bills: N/A</p>
                          <p>Last Check-in: N/A</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-primary-600 hover:underline">View</button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button className="text-gray-600 hover:text-gray-800">Archive</button>
                        <button className="text-red-600 hover:text-red-800">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

