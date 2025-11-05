import { useState } from 'react'

export default function Expenses() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-600 mt-1">Manage expenses</p>
        </div>
        <button className="btn btn-primary">Add Expense</button>
      </div>

      <div className="card">
        <p className="text-gray-500">Expense management coming soon...</p>
      </div>
    </div>
  )
}

