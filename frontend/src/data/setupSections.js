import {
  Settings,
  Megaphone,
  Users,
  Dumbbell,
  UserCog,
  Receipt,
  Link as LinkIcon
} from 'lucide-react'

export const setupSections = [
  {
    id: 'general',
    title: 'General',
    description: 'Core business profile, branding and default preferences.',
    icon: Settings,
    highlights: [
      'Branch & business profile',
      'Services and packages',
      'Tax and invoice defaults'
    ],
    items: [
      {
        id: 'general-getting-started',
        title: 'Getting Started',
        description: 'Step-by-step checklist to configure your organization for launch.',
        details: [
          'Work through the recommended tasks in sequence to launch smoothly.',
          'Complete key sections such as profile, services, taxes and communications.',
          'Invite staff, assign roles and confirm integrations before going live.'
        ],
        path: '/setup/getting-started',
        actionLabel: 'View Checklist'
      },
      {
        id: 'general-profile',
        title: 'Profile',
        description: 'Maintain organization information, branding and regional preferences.',
        details: [
          'Update legal name, contact information and support details.',
          'Configure currencies, time zones and locale specific defaults.',
          'Manage branding assets such as logo, theme colours and email footers.'
        ],
        path: '/branches',
        actionLabel: 'Update Profile'
      },
      {
        id: 'general-manage-services',
        title: 'Manage Services',
        description: 'Create and maintain services that define how you sell memberships.',
        details: [
          'Set up service categories, durations and pricing.',
          'Map services to sales teams and configure default taxes.',
          'Review service availability before rolling out new offers.'
        ],
        path: '/setup/services',
        actionLabel: 'Manage Services'
      },
      {
        id: 'general-bill-template',
        title: 'Bill Template',
        description: 'Standardise invoice layout, numbering and payment follow-up policies.',
        details: [
          'Configure branding, GST details and activation rules per location.',
          'Automate follow-up reminders, payment blocking and ID visibility.',
          'Manage invoice terms, prefixes and start dates in one central hub.'
        ],
        path: '/setup/bill-template',
        actionLabel: 'Configure Billing'
      },
      {
        id: 'general-form-customization',
        title: 'Form Customization',
        description: 'Collect the right information through configurable enquiry and member forms.',
        details: [
          'Add custom fields to enquiry, member or staff intake forms.',
          'Reorder sections to match the flow your team prefers.',
          'Label fields clearly so front-desk teams capture consistent data.'
        ],
        path: '/setup/form-customization',
        actionLabel: 'Customize Forms'
      },
      {
        id: 'general-define-tax',
        title: 'Define Tax',
        description: 'Set up tax slabs and defaults applied across services and invoices.',
        details: [
          'Create GST or VAT slabs with effective dates and jurisdiction.',
          'Assign default tax profiles to services, packages and add-ons.',
          'Review compliance summaries before billing members.'
        ],
        path: '/setup/define-tax',
        actionLabel: 'Configure Taxes'
      },
      // Removed additional legacy options to streamline General setup navigation
    ]
  },
  {
    id: 'marketing',
    title: 'Marketing',
    description: 'Communication templates, lead funnels and campaign automations.',
    icon: Megaphone,
    highlights: [
      'Email & SMS templates',
      'Lead source management',
      'Campaign automation'
    ],
    items: [
      {
        id: 'marketing-communication-templates',
        title: 'Templates',
        description: 'Build email, SMS and WhatsApp templates for quick outreach.',
        details: [
          'Create branded templates with dynamic placeholders.',
          'Segment audiences and reuse templates across campaigns.',
          'Track engagement and iterate quickly with analytics.'
        ],
        path: '/setup/marketing/templates',
        actionLabel: 'Open Marketing'
      },
      {
        id: 'marketing-lead-sources',
        title: 'Lead Source',
        description: 'Define and prioritise the sources that bring enquiries into your funnel.',
        details: [
          'Configure source hierarchy to measure ROI effectively.',
          'Automatically assign follow-up owners based on source.',
          'Sync online sources via forms, landing pages or integrations.'
        ],
        path: '/setup/marketing/lead-sources',
        actionLabel: 'Configure Lead Sources'
      }
    ]
  },
  {
    id: 'client-management',
    title: 'Client Management',
    description: 'Segment clients, define lifecycle stages and manage retention workflows.',
    icon: Users,
    highlights: [
      'Client segmentation',
      'Lifecycle & retention',
      'Custom data fields'
    ],
    items: [
      {
        id: 'client-management-upgrade-cross-sell-transfer',
        title: 'Upgrade, Cross Sell & Transfer',
        description: 'Guide teams through membership upgrades, add-on sales and branch transfers.',
        details: [
          'Track upgrade opportunities with preset workflows and documentation.',
          'Standardise cross-selling scripts for front-desk and sales teams.',
          'Coordinate branch transfers with member history and payment continuity.'
        ],
        path: '/setup/client-management/upgrade',
        actionLabel: 'Manage Settings'
      },
      {
        id: 'client-management-extension',
        title: 'Extension',
        description: 'Manage membership extensions with clear approvals and audit trails.',
        details: [
          'Log extension reasons, validity dates and authorised approvers.',
          'Automate reminders when extended memberships near completion.',
          'Ensure billing updates reflect paused or extended contract periods.'
        ],
        path: '/setup/client-management/extension',
        actionLabel: 'Open Extension Hub'
      }
    ]
  }
]

export default setupSections

