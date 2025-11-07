import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { leadSources, defaultEnabledSources } from '../data/leadSources'
import { CheckCircle2, Filter, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

function LeadSourceToggle({ label, checked, onChange }) {
  return (
    <label className={`relative flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:border-orange-200 ${
      checked ? 'shadow-sm ring-1 ring-orange-400/20' : ''
    }`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
      />
      <span>{label}</span>
    </label>
  )
}

export default function SetupMarketingLeadSource() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [enabledSources, setEnabledSources] = useState(new Set(defaultEnabledSources))

  const filteredSources = useMemo(() => {
    if (!search.trim()) return leadSources
    const query = search.toLowerCase()
    return leadSources.filter(source => source.toLowerCase().includes(query))
  }, [search])

  const handleToggle = (source, checked) => {
    setEnabledSources(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(source)
      } else {
        next.delete(source)
      }
      return next
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const payload = Array.from(enabledSources)
    console.log('Saving lead sources:', payload)
    toast.success('Lead source preferences saved')
  }

  const selectAll = () => {
    setEnabledSources(new Set(leadSources))
  }

  const deselectAll = () => {
    setEnabledSources(new Set())
  }

  const addLeadSource = () => {
    toast('Adding custom lead sources coming soon')
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <nav className="text-sm mb-4">
          <span className="text-gray-600">Home</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">Setup</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">Marketing</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="font-semibold text-orange-600">Lead Source Setup</span>
        </nav>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lead Source Setup</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Enable the lead sources you actively track so that enquiries, members and reports stay consistent across your organization.
            </p>
          </div>
          <button
            onClick={() => navigate('/setup/getting-started')}
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white"
          >
            <CheckCircle2 className="h-4 w-4 text-orange-500" />
            Back to checklist
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search lead sources"
              className="w-72 rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
          </div>
          <button
            type="button"
            onClick={() => toast('Filters coming soon')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <button
            type="button"
            onClick={addLeadSource}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Add lead source
          </button>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <button
            type="button"
            onClick={selectAll}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-100"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={deselectAll}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-100"
          >
            Clear all
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredSources.map(source => (
            <LeadSourceToggle
              key={source}
              label={source}
              checked={enabledSources.has(source)}
              onChange={(checked) => handleToggle(source, checked)}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <button
          type="submit"
          className="rounded-lg bg-orange-500 px-10 py-3 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Submit
        </button>
      </div>
    </form>
  )
}

