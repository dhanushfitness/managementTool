import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Layers, SlidersHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'

const getCurrentDate = () => new Date().toISOString().slice(0, 10)

const initialTaxes = [
  { id: 'gst', name: 'GST', percentage: 5, enabled: true, hideInBill: false, createdAt: getCurrentDate() },
  { id: 'cgst', name: 'CGST', percentage: 2.5, enabled: true, hideInBill: false, createdAt: getCurrentDate() },
  { id: 'sgst', name: 'SGST', percentage: 2.5, enabled: true, hideInBill: false, createdAt: getCurrentDate() }
]

export default function SetupDefineTax() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('define')
  const [isTaxEnabled, setIsTaxEnabled] = useState(true)
  const [taxEntries, setTaxEntries] = useState(initialTaxes)
  const [taxName, setTaxName] = useState('')
  const [taxPercentage, setTaxPercentage] = useState('')
  const [combinationName, setCombinationName] = useState('')
  const [primaryTax, setPrimaryTax] = useState('')
  const [secondaryTax, setSecondaryTax] = useState('')
  const [defaultTaxId, setDefaultTaxId] = useState('gst')

  const combinations = useMemo(() => {
    return taxEntries
      .filter(entry => entry.combination)
      .map(entry => entry.combination)
  }, [taxEntries])

  const handleAddTax = (event) => {
    event.preventDefault()
    if (!taxName.trim() || !taxPercentage) {
      toast.error('Please provide tax name and percentage')
      return
    }
    const percentageValue = Number(taxPercentage)
    if (Number.isNaN(percentageValue) || percentageValue <= 0 || percentageValue > 100) {
      toast.error('Enter a valid percentage value between 0 and 100')
      return
    }

    const id = taxName.toLowerCase().replace(/\s+/g, '-')
    const exists = taxEntries.some(item => item.id === id)
    if (exists) {
      toast.error('A tax with this name already exists')
      return
    }

    const newEntry = {
      id,
      name: taxName.trim(),
      percentage: percentageValue,
      enabled: true,
      hideInBill: false,
      createdAt: getCurrentDate()
    }

    setTaxEntries(prev => [...prev, newEntry])
    setTaxName('')
    setTaxPercentage('')
    toast.success('Tax slab added')
  }

  const handleDeleteTax = (id) => {
    setTaxEntries(prev => prev.filter(item => item.id !== id))
    toast.success('Tax removed')
  }

  const handleToggleHide = (id) => {
    setTaxEntries(prev => prev.map(item => (item.id === id ? { ...item, hideInBill: !item.hideInBill } : item)))
  }

  const handleAddCombination = (event) => {
    event.preventDefault()
    if (!primaryTax || !secondaryTax || !combinationName.trim()) {
      toast.error('Select taxes and provide a combination name')
      return
    }
    if (primaryTax === secondaryTax) {
      toast.error('Choose two different taxes to combine')
      return
    }

    const id = combinationName.toLowerCase().replace(/\s+/g, '-')
    const primary = taxEntries.find(entry => entry.id === primaryTax)
    const secondary = taxEntries.find(entry => entry.id === secondaryTax)

    if (!primary || !secondary) {
      toast.error('Select valid tax slabs')
      return
    }

    const combinedEntry = {
      id,
      name: combinationName.trim(),
      percentage: Number(primary.percentage) + Number(secondary.percentage),
      enabled: true,
      hideInBill: false,
      createdAt: getCurrentDate(),
      combination: {
        id,
        name: combinationName.trim(),
        primary: primary.name,
        secondary: secondary.name,
        percentage: Number(primary.percentage) + Number(secondary.percentage)
      }
    }

    setTaxEntries(prev => [...prev, combinedEntry])
    setCombinationName('')
    setPrimaryTax('')
    setSecondaryTax('')
    toast.success('Tax combination created')
  }

  const activeCombinationList = useMemo(() => combinations.filter(Boolean), [combinations])

  const renderDefineTax = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div>
          <p className="text-sm font-semibold text-gray-700">Would you like to configure tax for your business?</p>
          <p className="text-xs text-green-600 mt-1">Switching this off will reset the entire tax configuration to zero at service and variation levels.</p>
        </div>
        <button
          onClick={() => setIsTaxEnabled(prev => !prev)}
          className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
            isTaxEnabled ? 'bg-green-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
              isTaxEnabled ? 'translate-x-8' : 'translate-x-2'
            }`}
          />
        </button>
      </div>

      {isTaxEnabled && (
        <form onSubmit={handleAddTax} className="grid gap-4 rounded-xl border border-gray-200 bg-white p-6 md:grid-cols-[1fr_200px_120px]">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tax Name</label>
            <input
              type="text"
              value={taxName}
              onChange={(event) => setTaxName(event.target.value)}
              placeholder="e.g. GST"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tax in %</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={taxPercentage}
              onChange={(event) => setTaxPercentage(event.target.value)}
              placeholder="5"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
              Save
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">S.No</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Tax Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Tax %</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Option</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Hide in New Bill</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {taxEntries.map((entry, index) => (
              <tr key={entry.id} className="bg-white hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                <td className="px-4 py-3 text-gray-600">{entry.createdAt}</td>
                <td className="px-4 py-3 text-gray-800 font-medium">{entry.name}</td>
                <td className="px-4 py-3 text-gray-600">{entry.percentage}%</td>
                <td className="px-4 py-3 text-gray-600">{entry.enabled ? 'Enabled' : 'Disabled'}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleHide(entry.id)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      entry.hideInBill ? 'bg-green-100 text-green-700' : 'bg-orange-50 text-orange-600'
                    }`}
                  >
                    {entry.hideInBill ? 'Enabled' : 'Disabled'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDeleteTax(entry.id)}
                    className="inline-flex items-center justify-center rounded-lg border border-red-100 bg-red-50 p-2 text-red-500 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderCombination = () => (
    <div className="space-y-6">
      <form onSubmit={handleAddCombination} className="grid gap-4 rounded-xl border border-gray-200 bg-white p-6 md:grid-cols-[repeat(3,minmax(0,1fr))_160px]">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Primary Tax</label>
          <select
            value={primaryTax}
            onChange={(event) => setPrimaryTax(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
            required
          >
            <option value="">Select</option>
            {taxEntries.filter(entry => !entry.combination).map(entry => (
              <option key={entry.id} value={entry.id}>{entry.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Tax</label>
          <select
            value={secondaryTax}
            onChange={(event) => setSecondaryTax(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
            required
          >
            <option value="">Select</option>
            {taxEntries.filter(entry => !entry.combination).map(entry => (
              <option key={entry.id} value={entry.id}>{entry.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Combination Name</label>
          <input
            type="text"
            value={combinationName}
            onChange={(event) => setCombinationName(event.target.value)}
            placeholder="e.g. GST @18"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
            required
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Save
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">S.No</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Tax Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Tax %</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Option</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {activeCombinationList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No combinations yet. Create one using the form above.</td>
              </tr>
            ) : (
              activeCombinationList.map((combo, index) => (
                <tr key={combo.id} className="bg-white hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                  <td className="px-4 py-3 text-gray-600">{getCurrentDate()}</td>
                  <td className="px-4 py-3 text-gray-800 font-medium">{combo.name}</td>
                  <td className="px-4 py-3 text-gray-600">{combo.percentage}%</td>
                  <td className="px-4 py-3 text-gray-600">Enabled</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setTaxEntries(prev => prev.filter(entry => entry.combination?.id !== combo.id))
                        toast.success('Combination removed')
                      }}
                      className="inline-flex items-center justify-center rounded-lg border border-red-100 bg-red-50 p-2 text-red-500 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderDefaultTax = () => (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm font-semibold text-gray-700">Select Default Tax</p>
        <p className="mt-2 text-sm text-green-600">This tax will automatically apply whenever a multi-club service or any new service is created from the central panel.</p>

        <div className="mt-4 space-y-3">
          {taxEntries.map(entry => (
            <label key={entry.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-2 text-sm text-gray-700 hover:border-orange-200">
              <input
                type="radio"
                name="default-tax"
                value={entry.id}
                checked={defaultTaxId === entry.id}
                onChange={() => setDefaultTaxId(entry.id)}
              />
              <span>{entry.name}</span>
              <span className="ml-auto text-xs text-gray-500">{entry.percentage}%</span>
            </label>
          ))}
        </div>

        <button
          onClick={() => toast.success('Default tax updated')}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-2 font-semibold text-white hover:bg-orange-600"
        >
          Save
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <nav className="text-sm mb-4">
          <span className="text-gray-600">Home</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">Setup</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">General</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-orange-600 font-semibold">Define Tax</span>
        </nav>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Define Tax</h1>
            <p className="text-gray-600 mt-2 max-w-2xl">
              Create, combine and manage tax slabs that apply across invoices, services and packages. Configure defaults to keep billing consistent.
            </p>
          </div>
          <button
            onClick={() => navigate('/setup/getting-started')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white transition-colors"
          >
            Back to checklist
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-6 py-4">
          <button
            onClick={() => setActiveTab('define')}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'define' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Define Tax
          </button>
          <button
            onClick={() => setActiveTab('combination')}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'combination' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            Add Tax Combination
          </button>
          <button
            onClick={() => setActiveTab('default')}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'default' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Default Tax
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'define' && renderDefineTax()}
          {activeTab === 'combination' && renderCombination()}
          {activeTab === 'default' && renderDefaultTax()}
        </div>
      </div>
    </div>
  )
}

