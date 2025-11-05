import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Mail, MessageSquare, Phone, Tag } from 'lucide-react'

export default function Marketing() {
  const [activeTab, setActiveTab] = useState('communication')
  const [communicationType, setCommunicationType] = useState('email')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Marketing</h1>
        <p className="text-gray-600 mt-1">Manage communications and engagement</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b">
        <button
          onClick={() => setActiveTab('communication')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'communication'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-600'
          }`}
        >
          Communication
        </button>
        <button
          onClick={() => setActiveTab('engagement')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'engagement'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-600'
          }`}
        >
          Engagement
        </button>
      </div>

      {activeTab === 'communication' && (
        <div className="space-y-6">
          {/* Communication Type Tabs */}
          <div className="flex space-x-4">
            <button
              onClick={() => setCommunicationType('email')}
              className={`px-4 py-2 rounded-lg flex items-center ${
                communicationType === 'email'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </button>
            <button
              onClick={() => setCommunicationType('sms')}
              className={`px-4 py-2 rounded-lg flex items-center ${
                communicationType === 'sms'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              SMS
            </button>
            <button
              onClick={() => setCommunicationType('whatsapp')}
              className={`px-4 py-2 rounded-lg flex items-center ${
                communicationType === 'whatsapp'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Phone className="w-4 h-4 mr-2" />
              WhatsApp
            </button>
          </div>

          {/* Communication Form */}
          <div className="card space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Select Module</label>
              <select className="input">
                <option>Member</option>
                <option>Enquire</option>
                <option>Suspect List</option>
              </select>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Validity</label>
                <select className="input">
                  <option>All Members</option>
                  <option>Active Members</option>
                  <option>Inactive Members</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Gender</label>
                <select className="input">
                  <option>All</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Not Specified</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Age Group</label>
                <select className="input">
                  <option>Select Age Group</option>
                </select>
              </div>
            </div>

            {communicationType === 'email' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Email Template</label>
                  <select className="input">
                    <option>Select Template</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input type="text" className="input" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <textarea className="input" rows="6" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Upload File (max 1MB)</label>
                  <input type="file" className="input" />
                </div>
                <div>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    Send copy to me
                  </label>
                </div>
                <button className="btn btn-primary">Send Email</button>
              </>
            )}

            {communicationType === 'sms' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Gateway</label>
                  <select className="input">
                    <option>Select Gateway</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">SMS Template</label>
                  <select className="input">
                    <option>Select Template</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Custom Message</label>
                  <textarea className="input" rows="4" />
                </div>
                <button className="btn btn-primary">Send SMS</button>
              </>
            )}

            {communicationType === 'whatsapp' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Select Account</label>
                  <select className="input">
                    <option>Select WhatsApp Account</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <textarea className="input" rows="4" />
                </div>
                <button className="btn btn-primary">Send WhatsApp</button>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'engagement' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Offers</h2>
            <button className="btn btn-primary">Create Offer</button>
          </div>
          <p className="text-gray-500">Offer management coming soon...</p>
        </div>
      )}
    </div>
  )
}

