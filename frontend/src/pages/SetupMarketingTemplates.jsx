import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Copy, Plus, Filter, FileDown, CheckCircle2, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const transactionalTemplates = [
  {
    id: 'class-cancel',
    name: 'Class cancellation SMS to member',
    content: 'Dear member, {class name} scheduled on {date and time} is cancelled. - {business name}'
  },
  {
    id: 'studio-close',
    name: 'Studio closed for multiple days',
    content: 'Dear member, we would like to inform you that {business name}, {locality} will be closed from {date} to {date} due to {reason}. - {business name}'
  },
  {
    id: 'renewal-link',
    name: 'Renewal SMS with payment link',
    content: 'Dear member, your {service name} membership at {business name} is due for renewal on {service expiry date}. Kindly renew via {payment link}. - {business name}'
  },
  {
    id: 'birthday',
    name: 'Birthday wish',
    content: 'Dear {member name}, {business name} wishes you a happy birthday. Have a great day ahead. - {business name}'
  },
  {
    id: 'freeze',
    name: 'Membership freeze',
    content: 'Dear member, your membership has been frozen from {freeze start date} to {freeze end date}. Your new expiry date is {expiry date}. - {business name}'
  },
  {
    id: 'freeze-lift',
    name: 'Freeze lifted',
    content: 'Dear member, freeze period ended on {freeze end date}. Welcome back! Your new expiry date is {expiry date}. - {business name}'
  }
]

const promotionalTemplates = [
  { id: 'offer', name: 'Offer', content: 'Offer from {offer details (max 60 char)} - {business name}' },
  { id: 'gym-offer', name: 'Gym Offer', content: 'Offer from your gym {link (max 30 char)} - {business name}' },
  { id: 'yoga', name: 'Yoga Offer', content: 'Offer from your yoga studio {link (max 30 char)} - {business name}' },
  { id: 'health', name: 'Health Offer', content: 'Offer from your health club {link (max 30 char)} - {business name}' },
  { id: 'sports', name: 'Sports Offer', content: 'Offer from your sports centre {link (max 30 char)} - {business name}' },
  { id: 'fitness', name: 'Fitness Offer', content: 'Offer from your fitness club {link (max 30 char)} - {business name}' }
]

const emailTemplateSkeleton = {
  subject: '',
  body: '',
  attachments: []
}

const tabs = [
  { id: 'transactional', label: 'Transactional SMS Template' },
  { id: 'promotional', label: 'Promotional SMS Template' },
  { id: 'email', label: 'E-mail Template' },
  { id: 'whatsapp', label: 'WhatsApp Template' }
]

const Switch = ({ checked, onCheckedChange }) => (
  <button
    onClick={onCheckedChange}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
      checked ? 'bg-orange-500' : 'bg-gray-300'
    }`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-1'
      }`}
    />
  </button>
)

function TemplatesTable({ templates, onCopy }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="hidden md:grid grid-cols-[80px_1.2fr_2fr_120px] bg-gray-50 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        <span>S.No</span>
        <span>Template Name</span>
        <span>SMS Content</span>
        <span className="text-center">Actions</span>
      </div>
      <div className="divide-y divide-gray-200">
        {templates.map((template, index) => (
          <div
            key={template.id}
            className="grid grid-cols-1 gap-4 px-4 py-4 text-sm text-gray-700 md:grid-cols-[80px_1.2fr_2fr_120px] md:items-center md:px-6"
          >
            <div className="flex items-center gap-3 text-gray-500 font-semibold">{index + 1}</div>
            <div className="font-semibold text-gray-900">{template.name}</div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600 whitespace-pre-line">{template.content}</div>
            <div className="flex justify-start md:justify-center">
              <button
                onClick={() => onCopy(template.content)}
                className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600 hover:bg-orange-100"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function QuickFilters({ placeholder, onSearch, onAdd }) {
  const [value, setValue] = useState('')

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              onSearch?.(event.target.value)
            }}
            placeholder={placeholder}
            className="w-64 rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          />
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>
      {onAdd && (
        <div className="flex items-center gap-3">
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            New Template
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            <FileDown className="h-4 w-4" />
            Export
          </button>
        </div>
      )}
    </div>
  )
}

export default function SetupMarketingTemplates() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('transactional')
  const [emailTemplate, setEmailTemplate] = useState(emailTemplateSkeleton)
  const [includeWhatsapp, setIncludeWhatsapp] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  const filteredTransactional = useMemo(() => {
    if (!searchValue) return transactionalTemplates
    const query = searchValue.toLowerCase()
    return transactionalTemplates.filter(template => template.name.toLowerCase().includes(query))
  }, [searchValue])

  const onCopy = (content) => {
    navigator.clipboard.writeText(content)
    toast.success('Template copied to clipboard')
  }

  const handleEmailChange = (key, value) => {
    setEmailTemplate(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveEmailTemplate = () => {
    if (!emailTemplate.subject.trim() || !emailTemplate.body.trim()) {
      toast.error('Please provide both a subject and content for the email template')
      return
    }
    toast.success('Email template saved')
    setEmailTemplate(emailTemplateSkeleton)
  }

  const renderEmailEditor = () => (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">E-mail Subject</label>
          <input
            value={emailTemplate.subject}
            onChange={(event) => handleEmailChange('subject', event.target.value)}
            placeholder="Renewal reminder for your membership"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Attach file (optional)</label>
          <div className="flex items-center gap-3">
            <input type="file" className="text-sm" onChange={() => toast('Attachment upload coming soon')} />
            <span className="text-xs text-gray-500">Max 10 MB</span>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Template E-mail</label>
        <textarea
          value={emailTemplate.body}
          onChange={(event) => handleEmailChange('body', event.target.value)}
          rows={10}
          placeholder={'Dear member,\n\nYour membership is due for renewal on {date}. Please renew using {payment link}.\n\nRegards,\n{business name}'}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={includeWhatsapp} onCheckedChange={() => setIncludeWhatsapp(!includeWhatsapp)} />
        <span className="text-sm text-gray-600">Share this template with WhatsApp broadcast as well</span>
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSaveEmailTemplate}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Save Template
        </button>
      </div>
    </div>
  )

  const renderWhatsappComingSoon = () => (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-600">
      <MessageCircle className="mx-auto mb-3 h-10 w-10 text-orange-400" />
      <p className="font-semibold text-gray-800">WhatsApp templates are coming soon</p>
      <p className="mt-2 text-sm text-gray-600">We are working on direct WhatsApp Business API integrations. Stay tuned!</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <nav className="text-sm mb-4">
          <span className="text-gray-600">Home</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">Setup</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">Marketing</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="font-semibold text-orange-600">Templates</span>
        </nav>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Access ready-to-send SMS and email templates for every lifecycle moment. Copy, customise and deploy campaigns in seconds.
            </p>
          </div>
          <button
            onClick={() => navigate('/setup/getting-started')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white"
          >
            <CheckCircle2 className="h-4 w-4 text-orange-500" />
            Back to checklist
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === tab.id ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 p-6">
          {activeTab === 'transactional' && (
            <>
              <QuickFilters
                placeholder="Search transactional templates"
                onSearch={setSearchValue}
                onAdd={() => toast('Template creation coming soon')}
              />
              <TemplatesTable templates={filteredTransactional} onCopy={onCopy} />
            </>
          )}

          {activeTab === 'promotional' && (
            <>
              <QuickFilters
                placeholder="Search promotional templates"
                onAdd={() => toast('Promotional template creation coming soon')}
              />
              <TemplatesTable templates={promotionalTemplates} onCopy={onCopy} />
            </>
          )}

          {activeTab === 'email' && renderEmailEditor()}

          {activeTab === 'whatsapp' && renderWhatsappComingSoon()}
        </div>
      </div>
    </div>
  )
}

