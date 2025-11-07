import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings2, ArrowLeftRight, Shuffle, ShieldCheck, Sparkles, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getBranches } from '../api/organization'
import {
  getClientManagementSettings,
  updateUpgradeSettings,
  updateCrossSellSettings
} from '../api/clientManagement'
import { useAuthStore } from '../store/authStore'

const defaultUpgradeState = {
  upgradeDeadlineDays: 30,
  enableTransferFee: false,
  enableFreezeFee: false,
  autoSelectAssetsOnTransfer: false
}

const defaultCrossSellState = {
  sameCategoryAsCrossSell: false
}

const Toggle = ({ id, label, description, value, onChange, disabled }) => (
  <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4">
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-gray-900">
        {label}
      </label>
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
    </div>
    <button
      id={id}
      type="button"
      onClick={() => !disabled && onChange(!value)}
      className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
        value ? 'bg-orange-500' : 'bg-gray-200'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      role="switch"
      aria-checked={value}
      aria-disabled={disabled}
      disabled={disabled}
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
          value ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
)

const InfoBadge = ({ icon: Icon, title, description }) => (
  <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 text-orange-600">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  </div>
)

export default function ClientManagementUpgrade() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [selectedBranchId, setSelectedBranchId] = useState(null)
  const [activeTab, setActiveTab] = useState('upgrade')
  const [upgradeState, setUpgradeState] = useState(defaultUpgradeState)
  const [crossSellState, setCrossSellState] = useState(defaultCrossSellState)

  const { data: branchesData } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      try {
        const response = await getBranches()
        return response.branches || []
      } catch (error) {
        console.error('Failed to load branches', error)
        toast.error('Unable to load branches')
        return []
      }
    }
  })

  const branches = branchesData || []

  useEffect(() => {
    if (!branches.length) return
    if (selectedBranchId) return

    const preferredBranch = branches.find(branch => branch._id === user?.branchId)
    setSelectedBranchId(preferredBranch?._id || branches[0]._id)
  }, [branches, selectedBranchId, user?.branchId])

  const {
    data: settingsData,
    isLoading: settingsLoading,
    isFetching: settingsFetching
  } = useQuery({
    queryKey: ['client-management-settings', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return null
      const response = await getClientManagementSettings(selectedBranchId)
      return response.data?.data || response.data || null
    },
    enabled: Boolean(selectedBranchId),
    refetchOnWindowFocus: false
  })

  const currentSettings = useMemo(() => settingsData || null, [settingsData])

  useEffect(() => {
    if (!currentSettings) return

    setUpgradeState({
      ...defaultUpgradeState,
      ...(currentSettings.upgrade || {})
    })
    setCrossSellState({
      ...defaultCrossSellState,
      ...(currentSettings.crossSell || {})
    })
  }, [currentSettings])

  const upgradeMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await updateUpgradeSettings(selectedBranchId, payload)
      return response.data
    },
    onSuccess: (response) => {
      if (response?.success) {
        toast.success(response?.message || 'Upgrade settings updated')
        queryClient.invalidateQueries(['client-management-settings', selectedBranchId])
      } else {
        toast.success('Upgrade settings updated')
      }
    },
    onError: (error) => {
      const message = error?.response?.data?.message || 'Failed to update upgrade settings'
      toast.error(message)
    }
  })

  const crossSellMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await updateCrossSellSettings(selectedBranchId, payload)
      return response.data
    },
    onSuccess: (response) => {
      if (response?.success) {
        toast.success(response?.message || 'Cross-sell settings updated')
        queryClient.invalidateQueries(['client-management-settings', selectedBranchId])
      } else {
        toast.success('Cross-sell settings updated')
      }
    },
    onError: (error) => {
      const message = error?.response?.data?.message || 'Failed to update cross-sell settings'
      toast.error(message)
    }
  })

  const handleUpgradeSubmit = (event) => {
    event.preventDefault()
    if (!selectedBranchId) {
      toast.error('Please select a branch first')
      return
    }

    upgradeMutation.mutate(upgradeState)
  }

  const handleCrossSellSubmit = (event) => {
    event.preventDefault()
    if (!selectedBranchId) {
      toast.error('Please select a branch first')
      return
    }

    crossSellMutation.mutate(crossSellState)
  }

  const isBusy = settingsLoading || settingsFetching

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <nav className="text-sm text-gray-500">
          <span className="text-gray-600">Home</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">Setup</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">Client Management</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="font-medium text-orange-600">Upgrade &amp; Renewal Setup</span>
        </nav>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Upgrade, Transfer &amp; Cross-sell</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600">
              Configure how your teams handle membership upgrades, branch transfers and cross-selling conversations.
              These controls sync across sales, billing and retention workflows.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="branch-select" className="text-sm font-medium text-gray-600">
              Branch
            </label>
            <select
              id="branch-select"
              value={selectedBranchId || ''}
              onChange={(event) => setSelectedBranchId(event.target.value || null)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 sm:w-64"
            >
              {branches.map(branch => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoBadge
            icon={Settings2}
            title="Policy in one place"
            description="Share a consistent upgrade policy across billing, sales and front-desk teams."
          />
          <InfoBadge
            icon={ArrowLeftRight}
            title="Smooth transfers"
            description="Standardise member transfers with auto-selected assets and clear deadlines."
          />
          <InfoBadge
            icon={Shuffle}
            title="Relevant cross-sell"
            description="Enable smart recommendations without pushing the same category twice."
          />
          <InfoBadge
            icon={ShieldCheck}
            title="Audit-ready"
            description="Log every change for compliance with approvals and time stamps."
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col border-b border-gray-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex">
            <button
              type="button"
              onClick={() => setActiveTab('upgrade')}
              className={`w-full px-5 py-3 text-sm font-semibold transition-colors sm:w-auto ${
                activeTab === 'upgrade' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Upgrade Transfer &amp; Freeze Setup
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cross-sell')}
              className={`w-full px-5 py-3 text-sm font-semibold transition-colors sm:w-auto ${
                activeTab === 'cross-sell' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Cross-sell Setup
            </button>
          </div>
          <div className="hidden px-5 text-xs font-medium uppercase tracking-wide text-gray-400 sm:block">
            {isBusy ? 'Loading latest settings…' : 'Settings synced'}
          </div>
        </div>

        {activeTab === 'upgrade' ? (
          <form onSubmit={handleUpgradeSubmit} className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-[260px_1fr]">
              <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-gradient-to-br from-orange-50 via-white to-white p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">Upgrade Deadline</p>
                  <div className="mt-3 flex items-end gap-2">
                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={upgradeState.upgradeDeadlineDays}
                      onChange={(event) => setUpgradeState(prev => ({
                        ...prev,
                        upgradeDeadlineDays: Number(event.target.value)
                      }))}
                      className="w-28 rounded-lg border border-orange-200 bg-white px-3 py-2 text-2xl font-semibold text-orange-600 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                    <span className="pb-2 text-sm font-medium text-gray-500">days after joining</span>
                  </div>
                </div>
                <p className="mt-4 text-xs text-gray-500">
                  Members become eligible for upgrade fee waivers until this deadline. After the limit, approval is required.
                </p>
              </div>

              <div className="grid gap-4">
                <Toggle
                  id="transfer-fee-toggle"
                  label="Enable membership transfer fee"
                  description="Charge a predefined fee whenever members transfer between branches."
                  value={upgradeState.enableTransferFee}
                  onChange={(value) => setUpgradeState(prev => ({ ...prev, enableTransferFee: value }))}
                  disabled={upgradeMutation.isPending || isBusy}
                />
                <Toggle
                  id="freeze-fee-toggle"
                  label="Enable freeze fee"
                  description="Apply a nominal charge when a membership is frozen to maintain tracking accuracy."
                  value={upgradeState.enableFreezeFee}
                  onChange={(value) => setUpgradeState(prev => ({ ...prev, enableFreezeFee: value }))}
                  disabled={upgradeMutation.isPending || isBusy}
                />
                <Toggle
                  id="auto-select-assets-toggle"
                  label="Auto-select documents & trackers during transfer"
                  description="Automatically move member documents, workout plans and logs when branch changes are processed."
                  value={upgradeState.autoSelectAssetsOnTransfer}
                  onChange={(value) => setUpgradeState(prev => ({ ...prev, autoSelectAssetsOnTransfer: value }))}
                  disabled={upgradeMutation.isPending || isBusy}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Sparkles className="h-4 w-4 text-orange-500" />
                <span>
                  These settings sync instantly with your billing templates and transfer workflows for the selected branch.
                </span>
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-orange-300"
                disabled={upgradeMutation.isPending || isBusy}
              >
                {upgradeMutation.isPending ? 'Saving…' : 'Save Upgrade Settings'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCrossSellSubmit} className="space-y-6 p-6">
            <div className="grid gap-6 md:grid-cols-[300px_1fr]">
              <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-blue-50 via-white to-white p-6">
                <div className="flex items-center gap-3">
                  <Building2 className="h-6 w-6 text-blue-500" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Cross-sell Guardrail</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      Keep recommendations relevant
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-gray-600">
                  Decide whether services from the same category should be tagged as cross-sell. Turning this on prevents duplicate offers and focuses teams on upsell-ready options.
                </p>
              </div>

              <div className="space-y-4">
                <Toggle
                  id="same-category-cross-sell-toggle"
                  label="Treat same category services as cross-sell"
                  description="When enabled, recommending another service from the same category will be flagged as cross-sell in reports and dashboards."
                  value={crossSellState.sameCategoryAsCrossSell}
                  onChange={(value) => setCrossSellState({ sameCategoryAsCrossSell: value })}
                  disabled={crossSellMutation.isPending || isBusy}
                />

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                  <p className="font-medium text-gray-800">Tip for sales huddles</p>
                  <p className="mt-1">
                    Keep a shortlist of high-performing add-ons ready. Members love tailored recommendations backed by their attendance or goal tracking data.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Sparkles className="h-4 w-4 text-orange-500" />
                <span>
                  Cross-sell tags sync with dashboards, attribution reports and staff scorecards.
                </span>
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-orange-300"
                disabled={crossSellMutation.isPending || isBusy}
              >
                {crossSellMutation.isPending ? 'Saving…' : 'Save Cross-sell Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

