import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Circle,
  ArrowUpRight,
  Building2,
  Image as ImageIcon,
  ScrollText,
  FileText,
  LayoutDashboard
} from 'lucide-react'

const STEP_GROUPS = [
  {
    id: 'launch-essentials',
    title: 'Launch Essentials',
    steps: [
      {
        id: 'step-1-branch-profile',
        order: 1,
        title: 'Set Up Branch Profile',
        description: 'Complete business profile, operating hours and contact details.',
        icon: Building2,
        status: 'completed',
        actionLabel: 'Review',
        path: '/branches'
      },
      {
        id: 'step-2-brand-logo',
        order: 2,
        title: 'Update Brand Logo',
        description: 'Upload your brand assets for CRM and member touchpoints.',
        icon: ImageIcon,
        status: 'completed',
        actionLabel: 'Review',
        path: '/setup/brand-logo'
      },
      {
        id: 'step-3-define-tax',
        order: 3,
        title: 'Define Tax',
        description: 'Configure GST or VAT slabs for invoices and services.',
        icon: ScrollText,
        status: 'completed',
        actionLabel: 'Review',
        path: '/setup/define-tax'
      },
      {
        id: 'step-4-bill-template',
        order: 4,
        title: 'Update Bill Template',
        description: 'Customise invoice look & feel with terms and branding.',
        icon: FileText,
        status: 'completed',
        actionLabel: 'Review',
        path: '/setup/bill-template'
      },
      {
        id: 'step-5-services-pricing',
        order: 5,
        title: 'Define Services & Pricing',
        description: 'Publish membership plans, packages and add-on pricing.',
        icon: LayoutDashboard,
        status: 'completed',
        actionLabel: 'Review',
        path: '/setup/services'
      }
    ]
  },
  // Promote On Yoactiv group temporarily removed
]

const statusConfig = {
  completed: {
    label: 'Completed',
    badge: 'bg-orange-500 text-white',
    icon: CheckCircle2,
    accent: 'text-orange-600'
  },
  'in-progress': {
    label: 'Start',
    badge: 'bg-sky-500 text-white',
    icon: Circle,
    accent: 'text-sky-600'
  },
  planned: {
    label: 'Coming Soon',
    badge: 'bg-gray-200 text-gray-500',
    icon: Circle,
    accent: 'text-gray-500'
  }
}

export default function SetupGettingStarted() {
  const navigate = useNavigate()

  const allSteps = useMemo(() => STEP_GROUPS.flatMap(group => group.steps), [])
  const completedCount = allSteps.filter(step => step.status === 'completed').length
  const totalSteps = allSteps.length
  const completionPercent = Math.round((completedCount / totalSteps) * 100)

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
          <span className="text-orange-600 font-semibold">Getting Started</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Getting Started</h1>
            <p className="text-gray-600 mt-2 max-w-2xl">
              Complete the following steps to configure your account, publish services, and keep your brand consistent across every touchpoint.
            </p>

            <div className="mt-6">
              <div className="flex items-center justify-between text-sm font-medium text-gray-600 mb-2">
                <span>Progress</span>
                <span className="text-orange-600 font-semibold">Completed {completedCount} out of {totalSteps}</span>
              </div>
              <div className="h-2 rounded-full bg-orange-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-orange-50 to-orange-100 p-5">
              <p className="text-sm font-semibold text-orange-700">Why it matters</p>
              <p className="mt-2 text-sm text-orange-700/80">
                These setup tasks ensure your billing, branding, and sales workflows are ready for members on day one.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-sm font-semibold text-gray-700">Need help?</p>
              <p className="mt-2 text-sm text-gray-600">
                Share progress with your onboarding manager or book a guided session to accelerate launch.
              </p>
              <button
                onClick={() => navigate('/support')}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700"
              >
                Contact support
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {STEP_GROUPS.map(group => (
        <section key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{group.title}</h2>
            <span className="text-sm text-gray-500">
              {group.steps.filter(step => step.status === 'completed').length}/{group.steps.length} completed
            </span>
          </div>

          <div className="space-y-4">
            {group.steps.map(step => {
              const status = statusConfig[step.status] || statusConfig['planned']
              const StatusIcon = status.icon
              const isDisabled = !step.path

              return (
                <div
                  key={step.id}
                  className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full ${step.status === 'completed' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                      {step.icon ? <step.icon className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                        <StatusIcon className={`${status.accent} h-4 w-4`} />
                        <span>Step {step.order}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mt-1">{step.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 max-w-2xl">{step.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 md:flex-col md:items-end md:gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${status.badge}`}>
                      {status.label}
                    </span>
                    <button
                      onClick={() => step.path && navigate(step.path)}
                      disabled={isDisabled}
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                        isDisabled
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                      }`}
                    >
                      {isDisabled ? 'Coming Soon' : step.actionLabel || 'Open'}
                      {!isDisabled && <ArrowUpRight className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

