import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, MoreVertical, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

const initialServices = [
  {
    id: 'service-1',
    order: 1,
    name: 'Gym Membership',
    variations: 9,
    promote: true,
    status: true
  },
  {
    id: 'service-2',
    order: 2,
    name: 'Silver Package',
    variations: 2,
    promote: true,
    status: true
  },
  {
    id: 'service-3',
    order: 3,
    name: 'Gold Package',
    variations: 2,
    promote: true,
    status: true
  },
  {
    id: 'service-4',
    order: 4,
    name: 'Diamond Package',
    variations: 2,
    promote: true,
    status: true
  },
  {
    id: 'service-5',
    order: 5,
    name: 'Platinum Package',
    variations: 2,
    promote: true,
    status: true
  },
  {
    id: 'service-6',
    order: 6,
    name: 'Transformation Package',
    variations: 2,
    promote: true,
    status: true
  }
]

export default function SetupServices() {
  const navigate = useNavigate()
  const [services, setServices] = useState(initialServices)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredServices = useMemo(() => {
    if (!searchTerm.trim()) return services
    const query = searchTerm.toLowerCase()
    return services.filter(service => service.name.toLowerCase().includes(query))
  }, [services, searchTerm])

  const handleToggle = (id, field) => {
    setServices(prev =>
      prev.map(service => (service.id === id ? { ...service, [field]: !service[field] } : service))
    )
  }

  const handleAddVariation = (serviceName) => {
    toast.success(`Launching variation flow for ${serviceName}`)
  }

  const handleOptions = (serviceName) => {
    toast('More options coming soon', {
      icon: '⚙️',
      style: { background: '#1f2937', color: '#fff' }
    })
  }

  const handleAddService = () => {
    toast('Service creation wizard launching shortly!', {
      icon: '🚀'
    })
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
          <span className="text-orange-600 font-semibold">Service Management</span>
        </nav>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Service Management</h1>
            <p className="text-gray-600 mt-2 max-w-2xl">
              Publish, promote and manage your core services. Keep packages discoverable with the right status and highlight the offers you want to promote.
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search service"
              className="w-64 rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
          </div>
          <button
            onClick={() => toast.success(`Showing ${filteredServices.length} results`)}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Go
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleAddService}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Add New Service
          </button>
          <button
            onClick={() => toast.success('Playgrounds coming soon')}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Playgrounds
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="hidden lg:grid grid-cols-[80px_1.5fr_1fr_1fr_1fr_160px] px-6 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
          <span>S.No</span>
          <span>Service Name</span>
          <span className="text-center">Service Variations</span>
          <span className="text-center">Promote</span>
          <span className="text-center">Status</span>
          <span className="text-center">Options</span>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredServices.map(service => (
            <div
              key={service.id}
              className="grid grid-cols-1 gap-4 px-4 py-4 text-sm text-gray-700 lg:grid-cols-[80px_1.5fr_1fr_1fr_1fr_160px] lg:items-center lg:px-6"
            >
              <div className="flex items-center gap-3 text-gray-500">
                <span className="hidden text-lg lg:inline">⠿</span>
                <span className="font-medium">{service.order}</span>
              </div>
              <div className="font-semibold text-gray-900">{service.name}</div>
              <div className="text-orange-600 font-semibold text-center">
                {service.variations}{' '}
                <button
                  onClick={() => toast.success(`${service.variations} variations available`)}
                  className="underline"
                >
                  View
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => handleToggle(service.id, 'promote')}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold transition-colors ${
                    service.promote ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {service.promote ? 'On' : 'Off'}
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => handleToggle(service.id, 'status')}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold transition-colors ${
                    service.status ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {service.status ? 'On' : 'Off'}
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={() => handleAddVariation(service.name)}
                  className="rounded-full bg-orange-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-orange-600"
                >
                  + Add Variation
                </button>
                <button
                  onClick={() => handleOptions(service.name)}
                  className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 text-center">
          <button
            onClick={() => toast.success('Fetching more services...')}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Load More
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <Sparkles className="h-6 w-6 text-orange-500" />
          <div>
            <p className="text-sm font-semibold text-gray-800">Tip</p>
            <p className="text-sm text-gray-600 mt-1">
              Use promotions to highlight seasonal offers or new programs. When a service is promoted, it appears higher in client discovery workflows and marketing campaigns.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

