import PropTypes from 'prop-types'
import { Link, matchPath, useLocation } from 'react-router-dom'

const titleize = (value) => {
  if (!value) return ''
  return value
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

const routeBreadcrumbs = [
  {
    path: '/',
    getCrumbs: () => ([
      { label: 'Home', to: '/' },
      { label: 'Dashboard' }
    ])
  },
  {
    path: '/taskboard',
    getCrumbs: () => ([
      { label: 'Home', to: '/' },
      { label: 'Dashboard', to: '/' },
      { label: 'Follow-ups' }
    ])
  },
  {
    path: '/leaderboard',
    getCrumbs: () => ([
      { label: 'Home', to: '/' },
      { label: 'Dashboard', to: '/' },
      { label: 'Leaderboards' }
    ])
  },
  {
    path: '/clients',
    getCrumbs: () => ([
      { label: 'Home', to: '/' },
      { label: 'Clients' }
    ])
  },
  {
    path: '/clients/:id',
    getCrumbs: () => ([
      { label: 'Home', to: '/' },
      { label: 'Clients', to: '/clients' },
      { label: 'Member Details' }
    ])
  },
  {
    path: '/staff',
    getCrumbs: () => ([
      { label: 'Home', to: '/' },
      { label: 'Staff' }
    ])
  },
  {
    path: '/staff/:id',
    getCrumbs: () => ([
      { label: 'Home', to: '/' },
      { label: 'Staff', to: '/staff' },
      { label: 'Staff Details' }
    ])
  },
  {
    path: '/staff/:id/admin-rights',
    getCrumbs: ({ id }) => ([
      { label: 'Home', to: '/' },
      { label: 'Staff', to: '/staff' },
      { label: 'Staff Details', to: `/staff/${id}` },
      { label: 'Admin Rights' }
    ])
  },
  {
    path: '/staff/:id/targets',
    getCrumbs: ({ id }) => ([
      { label: 'Home', to: '/' },
      { label: 'Staff', to: '/staff' },
      { label: 'Staff Details', to: `/staff/${id}` },
      { label: 'Targets' }
    ])
  },
  {
    path: '/staff/:id/add-target',
    getCrumbs: ({ id }) => ([
      { label: 'Home', to: '/' },
      { label: 'Staff', to: '/staff' },
      { label: 'Staff Details', to: `/staff/${id}` },
      { label: 'Add Target' }
    ])
  },
  {
    path: '/staff/:id/rep-change',
    getCrumbs: ({ id }) => ([
      { label: 'Home', to: '/' },
      { label: 'Staff', to: '/staff' },
      { label: 'Staff Details', to: `/staff/${id}` },
      { label: 'Rep Change' }
    ])
  },
  {
    path: '/reports',
    getCrumbs: () => ([
      { label: 'Home', to: '/' },
      { label: 'Reports' }
    ])
  },
  {
    path: '/reports/:section',
    getCrumbs: ({ section }) => ([
      { label: 'Home', to: '/' },
      { label: 'Reports', to: '/reports' },
      { label: titleize(section) }
    ])
  },
  {
    path: '/reports/:section/:subSection',
    getCrumbs: ({ section, subSection }) => {
      const basePath = `/reports/${section}`
      return [
        { label: 'Home', to: '/' },
        { label: 'Reports', to: '/reports' },
        { label: titleize(section), to: basePath },
        { label: titleize(subSection) }
      ]
    }
  },
  {
    path: '/reports/:section/:subSection/:detail',
    getCrumbs: ({ section, subSection, detail }) => {
      const basePath = `/reports/${section}`
      const nestedPath = `${basePath}/${subSection}`
      return [
        { label: 'Home', to: '/' },
        { label: 'Reports', to: '/reports' },
        { label: titleize(section), to: basePath },
        { label: titleize(subSection), to: nestedPath },
        { label: titleize(detail) }
      ]
    }
  },
  {
    path: '/setup',
    getCrumbs: () => ([
      { label: 'Home', to: '/' },
      { label: 'Setup' }
    ])
  },
  {
    path: '/setup/:section',
    getCrumbs: ({ section }) => ([
      { label: 'Home', to: '/' },
      { label: 'Setup', to: '/setup' },
      { label: titleize(section) }
    ])
  },
  {
    path: '/setup/marketing/:category',
    getCrumbs: ({ category }) => ([
      { label: 'Home', to: '/' },
      { label: 'Setup', to: '/setup' },
      { label: 'Marketing', to: '/setup/marketing' },
      { label: titleize(category) }
    ])
  },
  {
    path: '/setup/client-management/:category',
    getCrumbs: ({ category }) => ([
      { label: 'Home', to: '/' },
      { label: 'Setup', to: '/setup' },
      { label: 'Client Management', to: '/setup/client-management' },
      { label: titleize(category) }
    ])
  },
  {
    path: '/marketing',
    getCrumbs: () => ([
      { label: 'Home', to: '/' },
      { label: 'Marketing' }
    ])
  },
  {
    path: '/enquiries',
    getCrumbs: () => ([
      { label: 'Home', to: '/' },
      { label: 'Enquiries' }
    ])
  },
  {
    path: '/enquiries/:enquiryId/edit',
    getCrumbs: ({ enquiryId }) => ([
      { label: 'Home', to: '/' },
      { label: 'Enquiries', to: '/enquiries' },
      { label: 'Edit Enquiry' }
    ])
  },
  {
    path: '/expenses',
    getCrumbs: () => ([
      { label: 'Home', to: '/' },
      { label: 'Expenses' }
    ])
  },
  {
    path: '/payments',
    getCrumbs: () => ([
      { label: 'Home', to: '/' },
      { label: 'Payments' }
    ])
  },
  {
    path: '/corporates',
    getCrumbs: () => ([
      { label: 'Home', to: '/' },
      { label: 'Corporates' }
    ])
  },
  {
    path: '/support',
    getCrumbs: () => ([
      { label: 'Home', to: '/' },
      { label: 'Support' }
    ])
  },
  {
    path: '/profile',
    getCrumbs: () => ([
      { label: 'Home', to: '/' },
      { label: 'Profile' }
    ])
  },
  {
    path: '/account-plan',
    getCrumbs: () => ([
      { label: 'Home', to: '/' },
      { label: 'Account Plan' }
    ])
  },
  {
    path: '/central-panel',
    getCrumbs: () => ([
      { label: 'Home', to: '/' },
      { label: 'Central Panel' }
    ])
  },
  {
    path: '/branches',
    getCrumbs: () => ([
      { label: 'Home', to: '/' },
      { label: 'Branch Management' }
    ])
  },
  {
    path: '/taskboard/:view',
    getCrumbs: ({ view }) => ([
      { label: 'Home', to: '/' },
      { label: 'Dashboard', to: '/' },
      { label: titleize(view) }
    ])
  }
]

const reportSections = {
  finance: {
    label: 'Finance',
    reports: {
      'pending-collections': 'Pending Collections',
      'service-payments-collected': 'Service Payments Collected'
    }
  },
  sales: {
    label: 'Sales',
    reports: {
      'service-sales': 'Service Sales'
    }
  },
  'client-management': {
    label: 'Client Management',
    reports: {
      'upgrade': 'Upgrade',
      'member-checkins': 'Member Check-ins',
      'new-clients': 'New Clients',
      'renewals': 'Renewals',
      'service-expiry': 'Service Expiry',
      'birthday': 'Birthday'
    }
  },
  staff: {
    label: 'Staff',
    reports: {
      'birthday': 'Staff Birthday'
    }
  }
}

Object.entries(reportSections).forEach(([section, config]) => {
  Object.entries(config.reports).forEach(([slug, label]) => {
    routeBreadcrumbs.push({
      path: `/reports/${section}/${slug}`,
      getCrumbs: () => ([
        { label: 'Home', to: '/' },
        { label: 'Reports', to: '/reports' },
        { label: config.label, to: '/reports' },
        { label }
      ])
    })
  })
})

const findRouteCrumbs = (pathname) => {
  for (const route of routeBreadcrumbs) {
    const match = matchPath({ path: route.path, end: true }, pathname)
    if (match) {
      if (typeof route.getCrumbs === 'function') {
        return route.getCrumbs(match.params)
      }
      return route.crumbs || []
    }
  }

  const segments = pathname.split('/').filter(Boolean)
  const crumbs = []
  let pathAccumulator = ''

  if (segments.length === 0) {
    return [
      { label: 'Home', to: '/' }
    ]
  }

  segments.forEach((segment, index) => {
    pathAccumulator += `/${segment}`
    crumbs.push({
      label: titleize(segment),
      to: index === segments.length - 1 ? undefined : pathAccumulator
    })
  })

  return [{ label: 'Home', to: '/' }, ...crumbs]
}

export default function Breadcrumbs({ items, className = '' }) {
  const location = useLocation()
  const resolvedItems = items && items.length > 0 ? items : findRouteCrumbs(location.pathname)

  if (!resolvedItems || resolvedItems.length === 0) {
    return null
  }

  return (
    <nav className={`text-sm flex flex-wrap items-center ${className}`}>
      {resolvedItems.map((item, index) => {
        const isLast = index === resolvedItems.length - 1
        const key = `${item.label}-${index}`
        const separator = index < resolvedItems.length - 1 ? (
          <span key={`${key}-separator`} className="text-gray-400 mx-2">/</span>
        ) : null

        const content = item.to && !isLast ? (
          <Link
            to={item.to}
            className="text-gray-600 hover:text-orange-600 transition-colors"
          >
            {item.label}
          </Link>
        ) : (
          <span className={isLast ? 'text-orange-600 font-medium' : 'text-gray-600'}>
            {item.label}
          </span>
        )

        return (
          <span key={key} className="inline-flex items-center">
            {content}
            {separator}
          </span>
        )
      })}
    </nav>
  )
}

Breadcrumbs.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      to: PropTypes.string
    })
  ),
  className: PropTypes.string
}

