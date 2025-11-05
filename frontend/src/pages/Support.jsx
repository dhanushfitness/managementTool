import { useState } from 'react'

export default function Support() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Requests</h1>
          <p className="text-gray-600 mt-1">Manage support requests</p>
        </div>
        <button className="btn btn-primary">Create Support Request</button>
      </div>

      <div className="card">
        <p className="text-gray-500">Support request management coming soon...</p>
      </div>
    </div>
  )
}

