import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Loader2,
  DollarSign,
  Calendar,
  X
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
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
    category: 'membership'
  })

  useEffect(() => {
    if (!open) return
    setFormState({
      name: service?.name || '',
      description: service?.description || '',
      category: service?.category || 'membership'
    })
  }, [service, open])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!formState.name.trim()) {
      toast.error('Please enter a service name')
      return
    }
    onSubmit({
      name: formState.name.trim(),
      description: formState.description.trim(),
      category: formState.category
    })
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Add New Service' : 'Edit Service'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Service Name *</label>
          <input
            value={formState.name}
            onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
            placeholder="e.g., Gym Membership"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Category *</label>
          <select
            value={formState.category}
            onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
          >
            {SERVICE_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Description (Optional)</label>
          <textarea
            value={formState.description}
            onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all resize-none"
            rows={3}
            placeholder="Brief description of the service"
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    type: 'duration',
    durationValue: 1,
    durationUnit: 'months',
    price: '',
    taxRate: 0
  })

  useEffect(() => {
    if (!open) return
    setFormState({
      name: variation?.name || '',
      type: variation?.type || 'duration',
      durationValue: variation?.duration?.value || 1,
      durationUnit: variation?.duration?.unit || 'months',
      price: variation?.price ?? '',
      taxRate: variation?.taxRate ?? 0
    })
  }, [service, variation, open])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!formState.name.trim()) {
      toast.error('Please enter a variation name')
      return
    }
    if (formState.price === '' || Number.isNaN(Number(formState.price)) || Number(formState.price) <= 0) {
      toast.error('Please enter a valid price')
      return
    }

    if (formState.type === 'duration' && (!formState.durationValue || !formState.durationUnit)) {
      toast.error('Please provide duration details')
      return
    }

    const payload = {
      name: formState.name.trim(),
      type: formState.type,
      price: Number(formState.price),
      taxRate: Number(formState.taxRate) || 0
    }

    if (formState.type === 'duration') {
      payload.duration = {
        value: Number(formState.durationValue),
        unit: formState.durationUnit
      }
    }

    onSubmit(payload)
  }

  const calculateTotal = () => {
    const basePrice = Number(formState.price) || 0
    const tax = (basePrice * (Number(formState.taxRate) || 0)) / 100
    return basePrice + tax
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`${mode === 'create' ? 'Add' : 'Edit'} Pricing • ${service?.name ?? ''}`}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Variation Name *</label>
          <input
            value={formState.name}
            onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
            placeholder="e.g., 1 Month Membership"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Type *</label>
            <select
              value={formState.type}
              onChange={(event) => setFormState((prev) => ({ ...prev, type: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
            >
              <option value="duration">Duration Based</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </div>
          {formState.type === 'duration' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Duration Value *</label>
                <input
                  type="number"
                  min={1}
                  value={formState.durationValue}
                  onChange={(event) => setFormState((prev) => ({ ...prev, durationValue: Number(event.target.value) }))}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium text-gray-700">Duration Unit *</label>
                <select
                  value={formState.durationUnit}
                  onChange={(event) => setFormState((prev) => ({ ...prev, durationUnit: event.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                >
                  {DURATION_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit.charAt(0).toUpperCase() + unit.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Pricing Section - Prominent */}
        <div className="rounded-xl border-2 border-orange-100 bg-gradient-to-br from-orange-50 to-white p-5 space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-orange-600" />
            <h4 className="text-sm font-semibold text-gray-900">Pricing Details</h4>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Base Price (₹) *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formState.price}
                  onChange={(event) => setFormState((prev) => ({ ...prev, price: event.target.value }))}
                  className="w-full rounded-lg border border-gray-200 pl-8 pr-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-medium"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tax Rate (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={formState.taxRate}
                  onChange={(event) => setFormState((prev) => ({ ...prev, taxRate: event.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  placeholder="0"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
            </div>

            {/* Total Price Preview */}
            {formState.price && Number(formState.price) > 0 && (
              <div className="rounded-lg bg-white border border-gray-200 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Base Price:</span>
                  <span className="font-medium text-gray-900">₹{Number(formState.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {formState.taxRate && Number(formState.taxRate) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Tax ({formState.taxRate}%):</span>
                    <span className="font-medium text-gray-900">
                      ₹{((Number(formState.price) * Number(formState.taxRate)) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-base font-semibold text-gray-900">Total Price:</span>
                  <span className="text-xl font-bold text-orange-600">
                    ₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Add Pricing' : 'Update Pricing'}
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
      toast.success(`Pricing ${variables.mode === 'create' ? 'added' : 'updated'} successfully`)
      setVariationModal({ open: false, mode: 'create', service: null, variation: null })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Unable to save pricing')
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
      toast.success('Pricing status updated')
    },
    onError: () => toast.error('Unable to update pricing status')
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
      toast.success('Pricing deleted')
    },
    onError: () => toast.error('Unable to delete pricing')
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
        {/* Header */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Service Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your services and their pricing plans
              </p>
            </div>
            <button
              onClick={() => setServiceModal({ open: true, mode: 'create', service: null })}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Service
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search services..."
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
              />
            </div>
            <div className="text-sm text-gray-500">
              {filteredServices.length} service{filteredServices.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Services List */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="rounded-full bg-orange-100 p-3">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No services yet</h3>
              <p className="max-w-md text-sm text-gray-500">
                Create your first service to get started with pricing management
              </p>
              <button
                onClick={() => setServiceModal({ open: true, mode: 'create', service: null })}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Service
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredServices.map((service, index) => {
                const variationCount = service.variations?.length || 0
                const isExpanded = expanded[service._id] ?? index === 0
                return (
                  <div key={service._id}>
                    <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-1 items-start gap-3">
                        <button
                          onClick={() => toggleExpanded(service._id)}
                          className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                              {service.category || 'SERVICE'}
                            </span>
                            {!service.isActive && (
                              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                Inactive
                              </span>
                            )}
                          </div>
                          <h3 className="mt-2 text-lg font-semibold text-gray-900">{service.name}</h3>
                          {service.description && (
                            <p className="mt-1 text-sm text-gray-600">{service.description}</p>
                          )}
                          <div className="mt-2 text-xs text-gray-500">
                            {variationCount} pricing plan{variationCount === 1 ? '' : 's'}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setServiceModal({ open: true, mode: 'edit', service })}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => serviceStatusMutation.mutate(service._id)}
                          className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                            service.isActive
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {service.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-gray-50 px-6 pb-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
                          <p className="text-sm font-semibold text-gray-700">Pricing Plans</p>
                          <button
                            onClick={() =>
                              setVariationModal({
                                open: true,
                                mode: 'create',
                                service,
                                variation: null
                              })
                            }
                            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Add Pricing
                          </button>
                        </div>
                        <div className="mt-4 space-y-3">
                          {variationCount === 0 ? (
                            <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                              No pricing plans yet. Add your first pricing plan.
                            </div>
                          ) : (
                            service.variations.map((variation) => {
                              const basePrice = variation.price || 0
                              const taxRate = variation.taxRate || 0
                              const taxAmount = (basePrice * taxRate) / 100
                              const totalPrice = basePrice + taxAmount

                              return (
                                <div
                                  key={variation._id}
                                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-orange-200 transition-colors"
                                >
                                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h4 className="text-base font-semibold text-gray-900">{variation.name}</h4>
                                        {variation.duration?.value && variation.duration?.unit && (
                                          <span className="flex items-center gap-1 text-xs text-gray-500">
                                            <Calendar className="h-3 w-3" />
                                            {variation.duration.value} {variation.duration.unit}
                                          </span>
                                        )}
                                      </div>
                                      {!variation.isActive && (
                                        <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                          Inactive
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-bold text-gray-900">
                                          ₹{basePrice.toLocaleString('en-IN')}
                                        </span>
                                        {taxRate > 0 && (
                                          <span className="text-xs text-gray-500">+ {taxRate}% tax</span>
                                        )}
                                      </div>
                                      {taxRate > 0 && (
                                        <p className="text-sm font-medium text-orange-600 mt-1">
                                          Total: ₹{totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <button
                                      onClick={() =>
                                        setVariationModal({
                                          open: true,
                                          mode: 'edit',
                                          service,
                                          variation
                                        })
                                      }
                                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                      <Pencil className="h-3 w-3" />
                                      Edit
                                    </button>
                                    <button
                                      onClick={() =>
                                        variationStatusMutation.mutate({
                                          serviceId: service._id,
                                          variationId: variation._id
                                        })
                                      }
                                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                        variation.isActive
                                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      {variation.isActive ? 'Active' : 'Inactive'}
                                    </button>
                                    <button
                                      onClick={() =>
                                        deleteVariationMutation.mutate({
                                          serviceId: service._id,
                                          variationId: variation._id
                                        })
                                      }
                                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              )
                            })
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
              Syncing...
            </div>
          )}
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
