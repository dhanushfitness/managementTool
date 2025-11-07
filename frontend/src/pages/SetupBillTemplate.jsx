import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ToggleRight, Edit3, Eye, Plus, Trash2, FileText, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'

const defaultTemplates = [
  {
    id: 'karnataka-template',
    state: 'Karnataka',
    gst: '29ABCDE1234F1Z5',
    businessName: 'AIRFIT',
    isActive: true
  }
]

const defaultTerms = [
  { id: 'general-membership', name: 'General Membership', enabled: true },
  { id: 'personal-training', name: 'Personal Training', enabled: true },
  { id: 'group-training', name: 'Group Training', enabled: true }
]

const tabList = [
  { id: 'bill-template', label: 'Bill Template' },
  { id: 'customer-id', label: 'Customer-id Hide' },
  { id: 'block-access', label: 'Block user access' },
  { id: 'payment-followup', label: 'Payment Follow-up' },
  { id: 'bill-start-date', label: 'Bill Start Date' },
  { id: 'prefix-suffix', label: 'Tax No. Prefix/Suffix' },
  { id: 'terms-conditions', label: 'Invoice Terms and Conditions' }
]

export default function SetupBillTemplate() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('bill-template')
  const [templates, setTemplates] = useState(defaultTemplates)
  const [showCustomerId, setShowCustomerId] = useState(false)
  const [blockDays, setBlockDays] = useState(0)
  const [blockReference, setBlockReference] = useState('followup')
  const [followUpMandatory, setFollowUpMandatory] = useState(false)
  const [billStartOffset, setBillStartOffset] = useState(30)
  const [prefixOrSuffix, setPrefixOrSuffix] = useState('prefix')
  const [taxNumberText, setTaxNumberText] = useState('')
  const [terms, setTerms] = useState(defaultTerms)

  const totalActiveTemplates = useMemo(() => templates.filter(t => t.isActive).length, [templates])

  const handleToggleTemplate = (id) => {
    setTemplates(prev => prev.map(template => (template.id === id ? { ...template, isActive: !template.isActive } : template)))
  }

  const handleAddTemplate = () => {
    const newTemplate = {
      id: `template-${templates.length + 1}`,
      state: 'New State',
      gst: 'Pending',
      businessName: 'AIRFIT',
      isActive: false
    }
    setTemplates(prev => [...prev, newTemplate])
    toast.success('New bill template stub added — update the details before activating.')
  }

  const handleSaveCustomerId = () => {
    toast.success(`Customer ID will ${showCustomerId ? 'now' : 'no longer'} appear on invoices.`)
  }

  const handleSaveBlockAccess = () => {
    toast.success('Block access policy updated successfully.')
  }

  const handleSaveFollowUp = () => {
    toast.success('Payment follow-up preference saved.')
  }

  const handleSaveBillStartDate = () => {
    toast.success('Default bill start date updated.')
  }

  const handleSavePrefixSuffix = () => {
    if (!taxNumberText.trim()) {
      toast.error('Enter a prefix or suffix value to save.')
      return
    }
    toast.success(`Tax number ${prefixOrSuffix === 'prefix' ? 'prefix' : 'suffix'} saved.`)
  }

  const handleToggleTerm = (id) => {
    setTerms(prev => prev.map(term => (term.id === id ? { ...term, enabled: !term.enabled } : term)))
  }

  const handleAddTerms = () => {
    const newTermName = `Custom Terms ${terms.length + 1}`
    setTerms(prev => [...prev, { id: `custom-${terms.length + 1}`, name: newTermName, enabled: true }])
    toast.success('New invoice terms placeholder added.')
  }

  const renderBillTemplateTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">Active bill templates</p>
          <p className="text-xs text-gray-500">{totalActiveTemplates} activated out of {templates.length} configured.</p>
        </div>
        <button
          onClick={handleAddTemplate}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          <Plus className="h-4 w-4" />
          Add Bill Template
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">State</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">GST</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Business Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">View</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Activation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {templates.map(template => (
              <tr key={template.id} className="bg-white hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-700 font-medium">{template.state}</td>
                <td className="px-4 py-3 text-gray-600">{template.gst}</td>
                <td className="px-4 py-3 text-gray-600">{template.businessName}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toast.success('Opening template preview...')}
                    className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600 hover:bg-orange-100"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleTemplate(template.id)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                      template.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    <ToggleRight className="h-4 w-4" />
                    {template.isActive ? 'ON' : 'OFF'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4 text-sm text-yellow-800">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          <span>
            Note: If the GST number is changed while modifying the bill template, a new invoice sequence will be initiated automatically.
          </span>
        </div>
      </div>
    </div>
  )

  const renderCustomerIdTab = () => (
    <div className="max-w-xl space-y-6">
      <p className="text-sm text-gray-600">
        Choose whether the customer ID should be printed on the invoice. This is helpful for reference in multi-branch organisations.
      </p>
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
          <input
            type="checkbox"
            checked={showCustomerId}
            onChange={(event) => setShowCustomerId(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          Display customer ID on the bill
        </label>
      </div>
      <button
        onClick={handleSaveCustomerId}
        className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
      >
        Save
      </button>
    </div>
  )

  const renderBlockAccessTab = () => (
    <div className="max-w-xl space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">Block user access after</label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            value={blockDays}
            onChange={(event) => setBlockDays(Number(event.target.value))}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
          <span className="text-sm text-gray-600">days from pending payment</span>
        </div>
      </div>
      <div className="space-y-3 text-sm text-gray-700">
        <p className="font-semibold">Reference date</p>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="block-reference"
            value="followup"
            checked={blockReference === 'followup'}
            onChange={() => setBlockReference('followup')}
          />
          Follow-up date
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="block-reference"
            value="invoice"
            checked={blockReference === 'invoice'}
            onChange={() => setBlockReference('invoice')}
          />
          Invoice date
        </label>
      </div>
      <button
        onClick={handleSaveBlockAccess}
        className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
      >
        Save
      </button>
    </div>
  )

  const renderPaymentFollowupTab = () => (
    <div className="max-w-xl space-y-6">
      <p className="text-sm text-gray-600">
        Enable this to ensure staff capture follow-up dates for all balances and reduce leakage in collections.
      </p>
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
        <input
          type="checkbox"
          checked={followUpMandatory}
          onChange={(event) => setFollowUpMandatory(event.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
        />
        Balance payment follow-up mandatory
      </label>
      <button
        onClick={handleSaveFollowUp}
        className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
      >
        Save
      </button>
    </div>
  )

  const renderBillStartDateTab = () => (
    <div className="max-w-xl space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">Bill start date</label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            value={billStartOffset}
            onChange={(event) => setBillStartOffset(Number(event.target.value))}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
          <span className="text-sm text-gray-600">days from purchase date</span>
        </div>
      </div>
      <button
        onClick={handleSaveBillStartDate}
        className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
      >
        Save
      </button>
    </div>
  )

  const renderPrefixSuffixTab = () => (
    <div className="max-w-xl space-y-6">
      <p className="text-sm text-gray-600">
        Apply a consistent prefix or suffix to your tax invoice numbers for statutory compliance or internal tracking.
      </p>
      <div className="flex items-center gap-4 text-sm text-gray-700">
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="prefix-suffix"
            value="prefix"
            checked={prefixOrSuffix === 'prefix'}
            onChange={() => setPrefixOrSuffix('prefix')}
          />
          Prefix
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="prefix-suffix"
            value="suffix"
            checked={prefixOrSuffix === 'suffix'}
            onChange={() => setPrefixOrSuffix('suffix')}
          />
          Suffix
        </label>
      </div>
      <input
        type="text"
        value={taxNumberText}
        onChange={(event) => setTaxNumberText(event.target.value)}
        placeholder={prefixOrSuffix === 'prefix' ? 'e.g. AIRFIT-' : 'e.g. -2025'}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
      />
      <p className="text-xs text-green-600">Changes will apply to invoices created after this update.</p>
      <button
        onClick={handleSavePrefixSuffix}
        className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
      >
        Save
      </button>
    </div>
  )

  const renderTermsConditionsTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">Invoice term categories</p>
          <p className="text-xs text-gray-500">Attach the right terms to each service category.</p>
        </div>
        <button
          onClick={handleAddTerms}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          <Plus className="h-4 w-4" />
          Add Terms
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">S.No</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Category Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Edit</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">View</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">On/Off</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {terms.map((term, index) => (
              <tr key={term.id} className="bg-white hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                <td className="px-4 py-3 text-gray-800 font-medium">{term.name}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toast.success('Opening editor for terms...')}
                    className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600 hover:bg-orange-100"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toast.success('Previewing terms...')}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    <FileText className="h-4 w-4" />
                    View
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleTerm(term.id)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                      term.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    <ToggleRight className="h-4 w-4" />
                    {term.enabled ? 'ON' : 'OFF'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      setTerms(prev => prev.filter(t => t.id !== term.id))
                      toast.success('Invoice terms removed')
                    }}
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

  const renderActiveContent = () => {
    switch (activeTab) {
      case 'bill-template':
        return renderBillTemplateTab()
      case 'customer-id':
        return renderCustomerIdTab()
      case 'block-access':
        return renderBlockAccessTab()
      case 'payment-followup':
        return renderPaymentFollowupTab()
      case 'bill-start-date':
        return renderBillStartDateTab()
      case 'prefix-suffix':
        return renderPrefixSuffixTab()
      case 'terms-conditions':
        return renderTermsConditionsTab()
      default:
        return null
    }
  }

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
          <span className="text-orange-600 font-semibold">Bill Template</span>
        </nav>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bill Template</h1>
            <p className="text-gray-600 mt-2 max-w-2xl">
              Craft branded invoices, automate follow-ups, and maintain consistent numbering across branches. Use the tabs below to configure each aspect of billing.
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
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-4 py-4">
          {tabList.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {renderActiveContent()}
        </div>
      </div>
    </div>
  )
}

