import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Settings2, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'

const enquiryFormConfig = [
  {
    id: 'personal-details',
    title: 'Personal Details',
    fields: [
      {
        id: 'email',
        label: 'Email',
        description: 'Capture the enquiry email address for follow-ups and receipts.',
        supportsMandatory: true
      },
        {
        id: 'gender',
        label: 'Gender',
        description: 'Understand preference for group classes, personal training or facilities.'
      },
      {
        id: 'dateOfBirth',
        label: 'Date of birth',
        description: 'Send birthday campaigns and measure cohort performance.'
      }
    ]
  },
  {
    id: 'lead-information',
    title: 'Lead Information',
    fields: [
      {
        id: 'customerType',
        label: 'Customer type',
        description: 'Identify whether the enquiry is individual, corporate or a group sign-up.'
      },
      {
        id: 'leadSource',
        label: 'Lead source',
        description: 'Track which marketing channel brings in the most enquiries.',
        supportsMandatory: true
      },
      {
        id: 'enquiryType',
        label: 'Enquiry type',
        description: 'Segment walk-ins vs renewals to guide the follow-up playbook.'
      },
      {
        id: 'fitnessGoal',
        label: 'Fitness goal',
        description: 'Share context with trainers to run meaningful consultations.'
      }
    ]
  }
]

const memberFormConfig = [
  {
    id: 'contact',
    title: 'Contact & Demographics',
    fields: [
      {
        id: 'email',
        label: 'Email',
        description: 'Send receipts, reminders and newsletters.',
        supportsMandatory: true
      },
      {
        id: 'alternatePhone',
        label: 'Alternate phone',
        description: 'Reach members in case of emergency or payment follow-ups.'
      },
      {
        id: 'dateOfBirth',
        label: 'Date of birth',
        description: 'Trigger age-based offers and birthday automations.'
      },
      {
        id: 'gender',
        label: 'Gender',
        description: 'Offer tailored programs and locker access.'
      }
    ]
  },
  {
    id: 'address',
    title: 'Address & Communication',
    fields: [
      {
        id: 'address.street',
        label: 'Street address',
        description: 'Generate invoices with GST compliant address blocks.'
      },
      {
        id: 'address.city',
        label: 'City',
        description: 'Identify catchment area performance.'
      },
      {
        id: 'address.state',
        label: 'State',
        description: 'Track tax jurisdictions for reporting.'
      },
      {
        id: 'address.zipCode',
        label: 'Zip code',
        description: 'Enable courier deliveries for merchandise or welcome kits.'
      },
      {
        id: 'communicationPreferences',
        label: 'Communication preferences',
        description: 'Let members pick channels for reminders and promotion consent.'
      }
    ]
  },
  {
    id: 'emergency',
    title: 'Emergency & Accountability',
    fields: [
      {
        id: 'emergencyContact',
        label: 'Emergency contact',
        description: 'Store the person to reach out to in a medical emergency.'
      },
      {
        id: 'memberManager',
        label: 'Member manager',
        description: 'Assign relationship managers for high-touch experiences.'
      },
      {
        id: 'notes',
        label: 'Internal notes',
        description: 'Keep important context visible to trainers and front desk teams.'
      }
    ]
  }
]

const fitnessProfileConfig = [
  {
    id: 'body-composition',
    title: 'Body Composition',
    fields: [
      {
        id: 'fitnessProfile.bodyWeight',
        label: 'Body weight',
        description: 'Track progress over time with assessments.'
      },
      {
        id: 'fitnessProfile.bmi',
        label: 'BMI',
        description: 'Baseline for nutrition and training plans.'
      },
      {
        id: 'fitnessProfile.fatPercentage',
        label: 'Fat percentage',
        description: 'Monitor fat-loss programs effectively.'
      },
      {
        id: 'fitnessProfile.musclePercentage',
        label: 'Muscle percentage',
        description: 'Celebrate strength training milestones.'
      },
      {
        id: 'fitnessProfile.height',
        label: 'Height',
        description: 'Required to compute BMI and other indices.'
      }
    ]
  },
  {
    id: 'performance',
    title: 'Performance Benchmarks',
    fields: [
      {
        id: 'fitnessProfile.cardio',
        label: 'Cardiovascular test report',
        description: 'Record cardio assessment outcomes.'
      },
      {
        id: 'fitnessProfile.muscleStrength',
        label: 'Muscle strength report',
        description: 'Document strength improvements after programs.'
      },
      {
        id: 'fitnessProfile.flexibility',
        label: 'Flexibility',
        description: 'Useful for yoga and rehab members.'
      }
    ]
  }
]

const DEFAULT_SETTINGS = {
  enquiry: Object.fromEntries(
    enquiryFormConfig.flatMap(section =>
      section.fields.map(field => [field.id, { enabled: true, mandatory: false }])
    )
  ),
  member: Object.fromEntries(
    memberFormConfig.flatMap(section =>
      section.fields.map(field => [field.id, { enabled: true, mandatory: false }])
    )
  ),
  fitness: Object.fromEntries(
    fitnessProfileConfig.flatMap(section =>
      section.fields.map(field => [field.id, { enabled: true }])
    )
  )
}

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

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function FieldRow({ field, state, onToggle, onMandatoryToggle }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-gray-900">{field.label}</p>
        {field.description && <p className="text-xs text-gray-500">{field.description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-gray-500">Enable</span>
          <Switch checked={state.enabled} onCheckedChange={() => onToggle(!state.enabled)} />
        </div>
        {field.supportsMandatory && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase text-gray-500">Mandatory</span>
            <Switch
              checked={state.mandatory}
              onCheckedChange={() => onMandatoryToggle(!state.mandatory)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default function SetupFormCustomization() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [activeTab, setActiveTab] = useState('enquiry')

  const handleToggle = (form, fieldId, key, value) => {
    setSettings(prev => ({
      ...prev,
      [form]: {
        ...prev[form],
        [fieldId]: {
          ...prev[form][fieldId],
          [key]: value
        }
      }
    }))
  }

  const hasChanges = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(DEFAULT_SETTINGS)
  }, [settings])

  const handleSave = () => {
    toast.success('Form customization saved successfully')
  }

  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS)
    toast('Form settings reverted to defaults', {
      icon: '↩️'
    })
  }

  const renderSections = (formId) => {
    const configMap = {
      enquiry: enquiryFormConfig,
      member: memberFormConfig,
      fitness: fitnessProfileConfig
    }

    return configMap[formId].map(section => (
      <SectionCard
        key={section.id}
        title={section.title}
        subtitle={section.subtitle}
      >
        <div className="space-y-3">
          {section.fields.map(field => (
            <FieldRow
              key={field.id}
              field={field}
              state={settings[formId][field.id]}
              onToggle={(value) => handleToggle(formId, field.id, 'enabled', value)}
              onMandatoryToggle={(value) => handleToggle(formId, field.id, 'mandatory', value)}
            />
          ))}
        </div>
      </SectionCard>
    ))
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <nav className="text-sm mb-4">
          <span className="text-gray-600">Home</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">Setup</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">General</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="font-semibold text-orange-600">Form Customization</span>
        </nav>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Form Customization</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Decide which fields appear on enquiry, member and fitness profile forms. Keep data collection lightweight while still capturing what matters to your business.
            </p>
          </div>
          <button
            onClick={() => navigate('/setup/getting-started')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white transition-colors"
          >
            <CheckCircle2 className="h-4 w-4 text-orange-500" />
            Back to checklist
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'enquiry', label: 'Enquiry Form' },
              { id: 'member', label: 'Member Form' },
              { id: 'fitness', label: 'Fitness Profile' }
            ].map(tab => (
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
          {activeTab === 'enquiry' && renderSections('enquiry')}
          {activeTab === 'member' && renderSections('member')}
          {activeTab === 'fitness' && renderSections('fitness')}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Settings2 className="h-5 w-5 text-orange-500" />
          <span>{hasChanges ? 'You have unsaved changes.' : 'All changes saved.'}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={resetToDefaults}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to defaults
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
            disabled={!hasChanges}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}

