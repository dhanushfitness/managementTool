import { useState } from 'react'

export default function Estimates() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Estimates</h1>
          <p className="text-gray-600 mt-1">Manage estimates</p>
        </div>
        <button className="btn btn-primary">Create Estimate</button>
      </div>

      <div className="card">
        <p className="text-gray-500">Estimate management coming soon...</p>
      </div>
    </div>
  )
}

