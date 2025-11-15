import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Plus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  fetchServices,
  createService,
  updateService,
  toggleServiceStatus,
  deleteService,
  createVariation,
  updateVariation,
  toggleVariationStatus,
  deleteVariation
} from '../api/services'

const SERVICE_CATEGORIES = [
  { label: 'Membership', value: 'membership' },
  { label: 'Program', value: 'program' },
  { label: 'Package', value: 'package' },
  { label: 'Personal Training', value: 'pt' },
  { label: 'Other', value: 'other' }
]

const DURATION_UNITS = ['days', 'weeks', 'months', 'years']

const ModalShell = ({ open, title, children, onClose }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full border border-gray-200 p-1 text-gray-500 hover:bg-gray-50"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

const ServiceModal = ({ open, mode, service, onClose, onSubmit, isSubmitting }) => {
  const [formState, setFormState] = useState({
    name: '',
    description: '',
    category: 'membership',
    accentColor: '#f97316',
    icon: 'dumbbell',
    isPromoted: true,
    displayOrder: 0
  })

  useEffect(() => {
    if (!open) return
    setFormState({
      name: service?.name || '',
      description: service?.description || '',
      category: service?.category || 'membership',
      accentColor: service?.accentColor || '#f97316',
      icon: service?.icon || 'dumbbell',
      isPromoted: service?.isPromoted ?? true,
      displayOrder: service?.displayOrder ?? 0
    })
  }, [service, open])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!formState.name.trim()) {
      toast.error('Please enter a service name')
      return
    }
    onSubmit({
      ...formState,
      name: formState.name.trim()
    })
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Add New Service' : 'Edit Service'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Service Name</label>
            <input
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              placeholder="Gym Membership"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Category</label>
            <select
              value={formState.category}
              onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            >
              {SERVICE_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Description</label>
          <textarea
            value={formState.description}
            onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            rows={3}
            placeholder="Add a short description to help your team identify the service."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Accent Color</label>
            <input
              type="color"
              value={formState.accentColor}
              onChange={(event) => setFormState((prev) => ({ ...prev, accentColor: event.target.value }))}
              className="h-11 w-full cursor-pointer rounded-xl border border-gray-200 bg-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Icon (Lucide)</label>
            <input
              value={formState.icon}
              onChange={(event) => setFormState((prev) => ({ ...prev, icon: event.target.value }))}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              placeholder="dumbbell"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Display Order</label>
            <input
              type="number"
              min={0}
              value={formState.displayOrder}
              onChange={(event) => setFormState((prev) => ({ ...prev, displayOrder: Number(event.target.value) }))}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Promote this service</p>
            <p className="text-xs text-gray-500">Promoted services appear on top of member journeys.</p>
          </div>
          <button
            type="button"
            onClick={() => setFormState((prev) => ({ ...prev, isPromoted: !prev.isPromoted }))}
            className={`inline-flex items-center rounded-full px-4 py-1 text-xs font-semibold ${
              formState.isPromoted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {formState.isPromoted ? 'On' : 'Off'}
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-70"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Create Service' : 'Update Service'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

const VariationModal = ({ open, mode, service, variation, onClose, onSubmit, isSubmitting }) => {
  const [formState, setFormState] = useState({
    name: '',
    description: '',
    type: 'duration',
    durationValue: 1,
    durationUnit: 'months',
    sessions: '',
    price: '',
    setupFee: 0,
    taxRate: 0,
    allowOnlineSale: false,
    isPopular: false,
    autoRenew: true,
    displayOrder: (service?.variations?.length || 0) + 1,
    variationId: ''
  })

  useEffect(() => {
    if (!open) return
    setFormState({
      name: variation?.name || '',
      description: variation?.description || '',
      type: variation?.type || 'duration',
      durationValue: variation?.duration?.value || 1,
      durationUnit: variation?.duration?.unit || 'months',
      sessions: variation?.sessions || '',
      price: variation?.price ?? '',
      setupFee: variation?.setupFee ?? 0,
      taxRate: variation?.taxRate ?? 0,
      allowOnlineSale: variation?.allowOnlineSale ?? false,
      isPopular: variation?.isPopular ?? false,
      autoRenew: variation?.autoRenew ?? true,
      displayOrder: variation?.displayOrder ?? ((service?.variations?.length || 0) + 1),
      variationId: variation?.variationId || ''
    })
  }, [service, variation, open])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!formState.name.trim()) {
      toast.error('Please enter a variation name')
      return
    }
    if (formState.price === '' || Number.isNaN(Number(formState.price))) {
      toast.error('Please enter a valid price')
      return
    }

    if (formState.type === 'duration' && (!formState.durationValue || !formState.durationUnit)) {
      toast.error('Please provide duration details')
      return
    }

    const payload = {
      name: formState.name.trim(),
      description: formState.description,
      type: formState.type,
      price: Number(formState.price),
      setupFee: Number(formState.setupFee) || 0,
      taxRate: Number(formState.taxRate) || 0,
      allowOnlineSale: Boolean(formState.allowOnlineSale),
      isPopular: Boolean(formState.isPopular),
      autoRenew: Boolean(formState.autoRenew),
      displayOrder: Number(formState.displayOrder) || 0,
      variationId: formState.variationId?.trim() || undefined
    }

    if (formState.type === 'duration') {
      payload.duration = {
        value: Number(formState.durationValue),
        unit: formState.durationUnit
      }
      payload.sessions = undefined
    } else if (formState.type === 'sessions') {
      payload.sessions = Number(formState.sessions) || 0
      payload.duration = undefined
    } else {
      payload.duration = undefined
      payload.sessions = undefined
    }

    onSubmit(payload)
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`${mode === 'create' ? 'Create' : 'Edit'} Variation • ${service?.name ?? ''}`}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Variation Name</label>
            <input
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              placeholder="1 Month Membership"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Unique Code (Optional)</label>
            <input
              value={formState.variationId}
              onChange={(event) => setFormState((prev) => ({ ...prev, variationId: event.target.value }))}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              placeholder="GM-010"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Description</label>
          <textarea
            value={formState.description}
            onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            rows={3}
            placeholder="Describe what this variation includes."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Type</label>
            <select
              value={formState.type}
              onChange={(event) => setFormState((prev) => ({ ...prev, type: event.target.value }))}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="duration">Duration</option>
              <option value="sessions">Sessions</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </div>
          {formState.type === 'duration' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Duration Value</label>
                <input
                  type="number"
                  min={1}
                  value={formState.durationValue}
                  onChange={(event) => setFormState((prev) => ({ ...prev, durationValue: Number(event.target.value) }))}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Duration Unit</label>
                <select
                  value={formState.durationUnit}
                  onChange={(event) => setFormState((prev) => ({ ...prev, durationUnit: event.target.value }))}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                >
                  {DURATION_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          {formState.type === 'sessions' && (
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">Number of Sessions</label>
              <input
                type="number"
                min={1}
                value={formState.sessions}
                onChange={(event) => setFormState((prev) => ({ ...prev, sessions: Number(event.target.value) }))}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Price (₹)</label>
            <input
              type="number"
              min={0}
              value={formState.price}
              onChange={(event) => setFormState((prev) => ({ ...prev, price: event.target.value }))}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Setup Fee (₹)</label>
            <input
              type="number"
              min={0}
              value={formState.setupFee}
              onChange={(event) => setFormState((prev) => ({ ...prev, setupFee: event.target.value }))}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Tax Rate (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={formState.taxRate}
              onChange={(event) => setFormState((prev) => ({ ...prev, taxRate: event.target.value }))}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Display Order</label>
            <input
              type="number"
              min={0}
              value={formState.displayOrder}
              onChange={(event) => setFormState((prev) => ({ ...prev, displayOrder: Number(event.target.value) }))}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Online Sales</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFormState((prev) => ({ ...prev, allowOnlineSale: !prev.allowOnlineSale }))}
                className={`inline-flex items-center rounded-full px-4 py-1 text-xs font-semibold ${
                  formState.allowOnlineSale ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {formState.allowOnlineSale ? 'Enabled' : 'Disabled'}
              </button>
              <button
                type="button"
                onClick={() => setFormState((prev) => ({ ...prev, isPopular: !prev.isPopular }))}
                className={`inline-flex items-center rounded-full px-4 py-1 text-xs font-semibold ${
                  formState.isPopular ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {formState.isPopular ? 'Popular' : 'Standard'}
              </button>
              <button
                type="button"
                onClick={() => setFormState((prev) => ({ ...prev, autoRenew: !prev.autoRenew }))}
                className={`inline-flex items-center rounded-full px-4 py-1 text-xs font-semibold ${
                  formState.autoRenew ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {formState.autoRenew ? 'Auto Renew' : 'Manual'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-70"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Create Variation' : 'Update Variation'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

export default function SetupServices() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [expanded, setExpanded] = useState({})
  const [serviceModal, setServiceModal] = useState({ open: false, mode: 'create', service: null })
  const [variationModal, setVariationModal] = useState({
    open: false,
    mode: 'create',
    service: null,
    variation: null
  })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['services'],
    queryFn: fetchServices
  })

  const services = data?.data?.services ?? []

  const filteredServices = useMemo(() => {
    if (!searchTerm.trim()) return services
    const query = searchTerm.toLowerCase()
    return services.filter((service) => service.name.toLowerCase().includes(query))
  }, [services, searchTerm])

  const invalidateServices = () => queryClient.invalidateQueries({ queryKey: ['services'] })

  const serviceMutation = useMutation({
    mutationFn: ({ mode, payload, serviceId }) =>
      mode === 'create' ? createService(payload) : updateService(serviceId, payload),
    onSuccess: (_, variables) => {
      invalidateServices()
      toast.success(`Service ${variables.mode === 'create' ? 'created' : 'updated'} successfully`)
      setServiceModal({ open: false, mode: 'create', service: null })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Unable to save service')
    }
  })

  const variationMutation = useMutation({
    mutationFn: ({ mode, serviceId, variationId, payload }) =>
      mode === 'create'
        ? createVariation(serviceId, payload)
        : updateVariation(serviceId, variationId, payload),
    onSuccess: (_, variables) => {
      invalidateServices()
      toast.success(`Variation ${variables.mode === 'create' ? 'created' : 'updated'} successfully`)
      setVariationModal({ open: false, mode: 'create', service: null, variation: null })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Unable to save variation')
    }
  })

  const serviceStatusMutation = useMutation({
    mutationFn: (serviceId) => toggleServiceStatus(serviceId),
    onSuccess: () => {
      invalidateServices()
      toast.success('Service status updated')
    },
    onError: () => toast.error('Unable to update service status')
  })

  const variationStatusMutation = useMutation({
    mutationFn: ({ serviceId, variationId }) => toggleVariationStatus(serviceId, variationId),
    onSuccess: () => {
      invalidateServices()
      toast.success('Variation status updated')
    },
    onError: () => toast.error('Unable to update variation status')
  })

  const deleteServiceMutation = useMutation({
    mutationFn: (serviceId) => deleteService(serviceId),
    onSuccess: () => {
      invalidateServices()
      toast.success('Service archived')
    },
    onError: () => toast.error('Unable to archive service')
  })

  const deleteVariationMutation = useMutation({
    mutationFn: ({ serviceId, variationId }) => deleteVariation(serviceId, variationId),
    onSuccess: () => {
      invalidateServices()
      toast.success('Variation deleted')
    },
    onError: () => toast.error('Unable to delete variation')
  })

  const handleServiceSubmit = (payload) => {
    serviceMutation.mutate({
      mode: serviceModal.mode,
      payload,
      serviceId: serviceModal.service?._id
    })
  }

  const handleVariationSubmit = (payload) => {
    variationMutation.mutate({
      mode: variationModal.mode,
      payload,
      serviceId: variationModal.service?._id,
      variationId: variationModal.variation?._id
    })
  }

  const toggleExpanded = (serviceId) => {
    setExpanded((prev) => ({
      ...prev,
      [serviceId]: !prev[serviceId]
    }))
  }

  const isEmpty = !isLoading && filteredServices.length === 0

  return (
    <>
      <div className="space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <nav className="text-sm mb-4 text-gray-500">
            <span>Home</span>
            <span className="mx-2">/</span>
            <span>Setup</span>
            <span className="mx-2">/</span>
            <span>General</span>
            <span className="mx-2">/</span>
            <span className="font-semibold text-orange-600">Service Management</span>
          </nav>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
                <Sparkles className="h-3.5 w-3.5" />
                Services go live automatically
              </div>
              <h1 className="mt-3 text-3xl font-bold text-gray-900">Gym & Studio Services</h1>
              <p className="mt-2 text-sm text-gray-600 max-w-2xl">
                Every new organization starts with a curated Gym Membership service.
                Add more services or variations as you diversify your offerings.
              </p>
            </div>
            <button
              onClick={() => navigate('/setup/getting-started')}
              className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white"
            >
              Back to checklist
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm lg:flex lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by service name"
                className="w-64 rounded-2xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div className="rounded-2xl border border-dashed border-gray-300 px-3 py-1 text-xs text-gray-500">
              {filteredServices.length} service{filteredServices.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 lg:mt-0">
            <button
              onClick={() => setServiceModal({ open: true, mode: 'create', service: null })}
              className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
              Add New Service
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
              ))}
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <Sparkles className="h-10 w-10 text-orange-400" />
              <h3 className="text-lg font-semibold text-gray-900">No services yet</h3>
              <p className="max-w-md text-sm text-gray-500">
                Every business starts with our curated Gym Membership. Add more services to reflect
                personal training, programs, or premium offers.
              </p>
              <button
                onClick={() => setServiceModal({ open: true, mode: 'create', service: null })}
                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
              >
                <Plus className="h-4 w-4" />
                Create your first service
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredServices.map((service, index) => {
                const variationCount = service.variations?.length || 0
                const isExpanded = expanded[service._id] ?? index === 0
                return (
                  <div key={service._id}>
                    <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-1 items-start gap-4">
                        <button
                          onClick={() => toggleExpanded(service._id)}
                          className="rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        <div>
                          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${service.accentColor}20`, color: service.accentColor }}>
                            {service.category?.toUpperCase() || 'SERVICE'}
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <h3 className="text-xl font-semibold text-gray-900">{service.name}</h3>
                            <span className="text-sm text-gray-400">#{service.displayOrder ?? 0}</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600 max-w-2xl">{service.description}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span>{variationCount} variations</span>
                            <span className="h-1 w-1 rounded-full bg-gray-300" />
                            <span>{service.isPromoted ? 'Promoted' : 'Not promoted'}</span>
                            <span className="h-1 w-1 rounded-full bg-gray-300" />
                            <span>{service.isActive ? 'Live' : 'Archived'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            setServiceModal({ open: true, mode: 'edit', service })
                          }
                          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => serviceStatusMutation.mutate(service._id)}
                          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold ${
                            service.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {service.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => deleteServiceMutation.mutate(service._id)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Archive
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-gray-50 px-6 pb-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
                          <p className="text-sm font-semibold text-gray-700">Variations</p>
                          <button
                            onClick={() =>
                              setVariationModal({
                                open: true,
                                mode: 'create',
                                service,
                                variation: null
                              })}
                            className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
                          >
                            <Plus className="h-4 w-4" />
                            Add Variation
                          </button>
                        </div>
                        <div className="mt-4 space-y-3">
                          {variationCount === 0 ? (
                            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
                              No variations yet. Start by adding memberships or packages for this service.
                            </div>
                          ) : (
                            service.variations.map((variation) => (
                              <div
                                key={variation._id}
                                className="rounded-2xl border border-white bg-white p-4 shadow-sm transition hover:border-orange-100"
                              >
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-600">
                                        {variation.variationId || 'Variation'}
                                      </span>
                                      {variation.durationLabel && (
                                        <>
                                          <span className="h-1 w-1 rounded-full bg-gray-300" />
                                          <span>{variation.durationLabel}</span>
                                        </>
                                      )}
                                    </div>
                                    <h4 className="mt-2 text-lg font-semibold text-gray-900">{variation.name}</h4>
                                    <p className="text-sm text-gray-500">{variation.description}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-2xl font-bold text-gray-900">₹{variation.price?.toLocaleString()}</p>
                                    <p className="text-xs text-gray-400">+ ₹{variation.taxRate || 0}% tax</p>
                                  </div>
                                </div>
                                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                  {variation.allowOnlineSale && (
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-600">
                                      Online ready
                                    </span>
                                  )}
                                  {variation.isPopular && (
                                    <span className="rounded-full bg-orange-50 px-2 py-0.5 font-semibold text-orange-600">
                                      Popular pick
                                    </span>
                                  )}
                                  {!variation.isActive && (
                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-500">
                                      Hidden
                                    </span>
                                  )}
                                </div>
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                  <button
                                    onClick={() =>
                                      setVariationModal({
                                        open: true,
                                        mode: 'edit',
                                        service,
                                        variation
                                      })}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      variationStatusMutation.mutate({
                                        serviceId: service._id,
                                        variationId: variation._id
                                      })}
                                    className={`inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 text-xs font-semibold ${
                                      variation.isActive
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {variation.isActive ? 'Disable' : 'Enable'}
                                  </button>
                                  <button
                                    onClick={() =>
                                      deleteVariationMutation.mutate({
                                        serviceId: service._id,
                                        variationId: variation._id
                                      })}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {isFetching && (
            <div className="flex items-center gap-2 border-t border-gray-100 px-6 py-3 text-xs text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Syncing latest services…
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-orange-50 to-white p-6 shadow-inner">
          <div className="flex items-start gap-3">
            <Sparkles className="h-6 w-6 text-orange-500" />
            <div>
              <p className="text-base font-semibold text-gray-900">Playbook</p>
              <p className="mt-1 text-sm text-gray-600">
                Keep only one flagship service live during onboarding. Once your team is comfortable,
                add premium services and anchor each with at least two variations.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ServiceModal
        open={serviceModal.open}
        mode={serviceModal.mode}
        service={serviceModal.service}
        onClose={() => setServiceModal({ open: false, mode: 'create', service: null })}
        onSubmit={handleServiceSubmit}
        isSubmitting={serviceMutation.isPending}
      />

      <VariationModal
        open={variationModal.open}
        mode={variationModal.mode}
        service={variationModal.service}
        variation={variationModal.variation}
        onClose={() => setVariationModal({ open: false, mode: 'create', service: null, variation: null })}
        onSubmit={handleVariationSubmit}
        isSubmitting={variationMutation.isPending}
      />
    </>
  )
}

