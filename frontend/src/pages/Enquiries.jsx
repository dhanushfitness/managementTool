import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { Download, Upload, Archive, Filter, Mail, MessageSquare, MoreVertical } from 'lucide-react'

export default function Enquiries() {
  const [dateFilter, setDateFilter] = useState('today')
  const [filters, setFilters] = useState({})
  const [showFilters, setShowFilters] = useState(false)
  const [selectedEnquiries, setSelectedEnquiries] = useState([])

  const { data, isLoading } = useQuery({
    queryKey: ['enquiries', dateFilter, filters],
    queryFn: () => api.get('/enquiries', { params: { dateFilter, ...filters } }).then(res => res.data)
  })

  const { data: stats } = useQuery({
    queryKey: ['enquiry-stats', dateFilter],
    queryFn: () => api.get('/enquiries/stats', { params: { dateFilter } }).then(res => res.data)
  })

  const queryClient = useQueryClient()

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="input"
          >
            <option value="today">Today</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <button className="btn btn-secondary flex items-center">
            <Upload className="w-4 h-4 mr-2" />
            Import Enquiries
          </button>
          <button className="btn btn-secondary">
            Enquiry Archive
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
            <div className="card">
              <p className="text-sm text-gray-600">Total Enquiries</p>
              <p className="text-2xl font-bold">{stats?.stats?.total || 0}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600">Opened</p>
              <p className="text-2xl font-bold text-blue-600">{stats?.stats?.opened || 0}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600">Converted</p>
              <p className="text-2xl font-bold text-green-600">{stats?.stats?.converted || 0}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600">Archived/Lost</p>
              <p className="text-2xl font-bold text-red-600">{stats?.stats?.archived || 0}</p>
            </div>
      </div>

      {/* Filters and Actions Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-secondary flex items-center"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </button>
        <div className="flex items-center space-x-2">
          <select className="input">
            <option>Actions</option>
            <option>Move to Archive</option>
            <option>Staff Change</option>
          </select>
          <select className="input">
            <option>Communicate</option>
            <option>Send Email</option>
            <option>Send SMS</option>
          </select>
          <button className="btn btn-primary flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export Enquiry
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Service</label>
            <select className="input">
              <option>All Services</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Lead Source</label>
            <select className="input">
              <option>All Sources</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Enquiry Stage</label>
            <select className="input">
              <option>All Stages</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Gender</label>
            <select className="input">
              <option>All</option>
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>
        </div>
      )}

      {/* Enquiries Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span>Pagination</span>
            <input type="number" className="input w-20" placeholder="Go to page" />
          </div>
        </div>
        {isLoading ? (
          <p className="text-center py-8">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">
                    <input type="checkbox" />
                  </th>
                  <th className="text-left py-3 px-4">S.No</th>
                  <th className="text-left py-3 px-4">Enquiry ID</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Service</th>
                  <th className="text-left py-3 px-4">Lead Source</th>
                  <th className="text-left py-3 px-4">Enquiry Stage</th>
                  <th className="text-left py-3 px-4">Last Call Status</th>
                  <th className="text-left py-3 px-4">Call Tag</th>
                  <th className="text-left py-3 px-4">Staff</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.enquiries?.map((enquiry, index) => (
                  <tr key={enquiry._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedEnquiries.includes(enquiry._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEnquiries([...selectedEnquiries, enquiry._id])
                          } else {
                            setSelectedEnquiries(selectedEnquiries.filter(id => id !== enquiry._id))
                          }
                        }}
                      />
                    </td>
                    <td className="py-3 px-4">{index + 1}</td>
                    <td className="py-3 px-4">{enquiry.enquiryId}</td>
                    <td className="py-3 px-4">{new Date(enquiry.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4">{enquiry.name}</td>
                    <td className="py-3 px-4">{enquiry.serviceName || 'N/A'}</td>
                    <td className="py-3 px-4">{enquiry.leadSource}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        enquiry.enquiryStage === 'converted' ? 'bg-green-100 text-green-800' :
                        enquiry.enquiryStage === 'lost' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {enquiry.enquiryStage}
                      </span>
                    </td>
                    <td className="py-3 px-4">{enquiry.lastCallStatus || 'N/A'}</td>
                    <td className="py-3 px-4">
                      {enquiry.callTag && (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          enquiry.callTag === 'hot' ? 'bg-red-100 text-red-800' :
                          enquiry.callTag === 'warm' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {enquiry.callTag}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {enquiry.assignedStaff?.firstName} {enquiry.assignedStaff?.lastName}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {!enquiry.convertedToMember && (
                          <button className="text-primary-600 hover:text-primary-800">
                            Invoice
                          </button>
                        )}
                        <button className="text-gray-600 hover:text-gray-800">Edit</button>
                        <button className="text-red-600 hover:text-red-800">Delete</button>
                      </div>
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

