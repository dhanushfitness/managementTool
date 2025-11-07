import { useMemo, useState } from 'react'
import { Calendar, Download, Filter, TrendingUp, Wallet, FileSpreadsheet } from 'lucide-react'

const expenseSummaryData = [
  { month: 'January', budget: 250000, actual: 218400 },
  { month: 'February', budget: 235000, actual: 201350 },
  { month: 'March', budget: 240000, actual: 248100 },
  { month: 'April', budget: 245000, actual: 232940 },
  { month: 'May', budget: 255000, actual: 261780 },
  { month: 'June', budget: 260000, actual: 249520 },
  { month: 'July', budget: 265000, actual: 258660 },
  { month: 'August', budget: 270000, actual: 268400 },
  { month: 'September', budget: 275000, actual: 269800 },
  { month: 'October', budget: 280000, actual: 275940 },
  { month: 'November', budget: 285000, actual: 0 },
  { month: 'December', budget: 290000, actual: 0 }
]

const branches = [
  { value: 'all', label: 'All Branches' },
  { value: 'koramangala', label: 'Koramangala' },
  { value: 'indiranagar', label: 'Indiranagar' },
  { value: 'hsr', label: 'HSR Layout' }
]

const currencies = Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
})

export default function ExpenseReport() {
  const [filters, setFilters] = useState({
    year: '2025',
    branch: 'all',
    service: 'all'
  })

  const summary = useMemo(() => {
    const totalBudget = expenseSummaryData.reduce((sum, record) => sum + record.budget, 0)
    const totalActual = expenseSummaryData.reduce((sum, record) => sum + record.actual, 0)
    const variance = totalBudget - totalActual
    const spentPercent = totalBudget > 0 ? Math.min(100, ((totalActual / totalBudget) * 100).toFixed(1)) : '0.0'

    return {
      totalBudget,
      totalActual,
      variance,
      spentPercent
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
          <span className="text-gray-600">Expense</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-orange-600 font-medium">Expense Summary</span>
        </nav>
      </div>

      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expense Summary</h1>
          <p className="text-gray-600 mt-1">Review annual budgets versus actual spending across branches.</p>
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
            <label className="text-sm font-medium text-gray-700">Financial Year</label>
            <select
              value={filters.year}
              onChange={(event) => setFilters(prev => ({ ...prev, year: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              {['2026', '2025', '2024', '2023'].map(yearOption => (
                <option key={yearOption} value={yearOption}>{yearOption}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Branch</label>
            <select
              value={filters.branch}
              onChange={(event) => setFilters(prev => ({ ...prev, branch: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              {branches.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Cost Centre</label>
            <select
              value={filters.service}
              onChange={(event) => setFilters(prev => ({ ...prev, service: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Cost Centres</option>
              <option value="operations">Operations</option>
              <option value="marketing">Marketing</option>
              <option value="maintenance">Maintenance</option>
              <option value="utilities">Utilities</option>
            </select>
          </div>
          <div className="flex items-end gap-3">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Reset
            </button>
            <button className="px-5 py-2 bg-orange-500 text-white rounded-lg shadow hover:bg-orange-600 transition-colors">
              Go
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Budgeted Spend</p>
              <p className="text-2xl font-semibold text-gray-900">{currencies.format(summary.totalBudget)}</p>
            </div>
            <Wallet className="w-10 h-10 text-orange-500" />
          </div>
          <p className="text-xs text-gray-500 mt-3">Annual allocation for the selected filters</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Actual Spend</p>
              <p className="text-2xl font-semibold text-gray-900">{currencies.format(summary.totalActual)}</p>
            </div>
            <FileSpreadsheet className="w-10 h-10 text-orange-500" />
          </div>
          <p className="text-xs text-gray-500 mt-3">Captured from recorded expenses</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Variance</p>
              <p className={`text-2xl font-semibold ${summary.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.variance >= 0 ? '+' : '-'}{currencies.format(Math.abs(summary.variance))}
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-orange-500" />
          </div>
          <p className="text-xs text-gray-500 mt-3">Positive indicates under budget</p>
        </article>
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">% Budget Utilised</p>
          <p className="text-2xl font-semibold text-gray-900">{summary.spentPercent}%</p>
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500" style={{ width: `${summary.spentPercent}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-3">Progress towards annual budget</p>
        </article>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Budget vs Actual</h2>
            <p className="text-sm text-gray-500">Month-wise breakdown to spot variances quickly</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            Financial Year {filters.year}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Month</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-600">Budget</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-600">Actual</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-600">Variance</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-600">% Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expenseSummaryData.map(record => {
                const variance = record.budget - record.actual
                const percent = record.budget > 0 ? ((record.actual / record.budget) * 100).toFixed(1) : '0.0'

                return (
                  <tr key={record.month} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-900 font-medium">{record.month}</td>
                    <td className="px-6 py-4 text-right text-gray-700">{currencies.format(record.budget)}</td>
                    <td className="px-6 py-4 text-right text-gray-700">{currencies.format(record.actual)}</td>
                    <td className={`px-6 py-4 text-right font-medium ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {variance >= 0 ? '+' : '-'}{currencies.format(Math.abs(variance))}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-700">{percent}%</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-6 py-4 text-gray-900 font-semibold">Total</td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900">{currencies.format(summary.totalBudget)}</td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900">{currencies.format(summary.totalActual)}</td>
                <td className={`px-6 py-4 text-right font-semibold ${summary.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.variance >= 0 ? '+' : '-'}{currencies.format(Math.abs(summary.variance))}
                </td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900">{summary.spentPercent}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  )
}


