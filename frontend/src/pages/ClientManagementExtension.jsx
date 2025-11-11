import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Clock, FileText, History, UserCheck, ShieldAlert, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { getBranches } from '../api/organization'
import { applyMembershipExtension, getExtensionSummary } from '../api/clientManagement'
import { useAuthStore } from '../store/authStore'
import DateInput from '../components/DateInput'

const SummaryItem = ({ icon: Icon, label, value, helper }) => (
  <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 text-orange-600">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-sm font-semibold text-gray-900">{label}</p>
      <p className="mt-1 text-sm text-gray-600">{value}</p>
      {helper && <p className="mt-1 text-xs text-gray-400">{helper}</p>}
    </div>
  </div>
)

const formatDate = (dateInput) => {
  if (!dateInput) return '—'
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function ClientManagementExtension() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedBranchId, setSelectedBranchId] = useState(null)
  const [formValues, setFormValues] = useState({
    fromDate: '',
    extensionDays: '',
    reason: ''
  })

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
    data: extensionData,
    isLoading: summaryLoading,
    isFetching: summaryFetching
  } = useQuery({
    queryKey: ['client-management-extension-summary', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return null
      const response = await getExtensionSummary(selectedBranchId)
      return response.data?.data || response.data || null
    },
    enabled: Boolean(selectedBranchId),
    refetchOnWindowFocus: false
  })

  const extensionSummary = useMemo(() => extensionData || {}, [extensionData])

  const extensionMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await applyMembershipExtension(selectedBranchId, payload)
      return response.data
    },
    onSuccess: (response) => {
      const message = response?.message || 'Memberships extended successfully'
      toast.success(message)
      queryClient.invalidateQueries(['client-management-extension-summary', selectedBranchId])
      queryClient.invalidateQueries(['client-management-settings', selectedBranchId])
      setFormValues({ fromDate: '', extensionDays: '', reason: '' })
    },
    onError: (error) => {
      const message = error?.response?.data?.message || 'Failed to extend memberships'
      toast.error(message)
    }
  })

  const handleInputChange = (key, value) => {
    setFormValues(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!selectedBranchId) {
      toast.error('Please select a branch before applying extension')
      return
    }

    if (!formValues.extensionDays) {
      toast.error('Please enter extension days')
      return
    }

    extensionMutation.mutate({
      fromDate: formValues.fromDate || null,
      extensionDays: Number(formValues.extensionDays),
      reason: formValues.reason || ''
    })
  }

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
          <span className="font-medium text-orange-600">Membership Extension</span>
        </nav>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Membership Extension Hub</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600">
              Extend active memberships in bulk for operational downtimes or special offers. Every run logs the user, date and impacted member count for compliance.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="extension-branch-select" className="text-sm font-medium text-gray-600">
              Branch
            </label>
            <select
              id="extension-branch-select"
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
          <SummaryItem
            icon={CalendarDays}
            label="Last Extension Date"
            value={formatDate(extensionSummary.lastRunAt)}
            helper={extensionSummary.lastFromDate ? `From ${formatDate(extensionSummary.lastFromDate)}` : undefined}
          />
          <SummaryItem
            icon={Clock}
            label="Days Added"
            value={extensionSummary.lastExtensionDays ? `${extensionSummary.lastExtensionDays} days` : '—'}
            helper={extensionSummary.lastReason || 'No reason logged'}
          />
          <SummaryItem
            icon={UserCheck}
            label="Members Updated"
            value={extensionSummary.processedCount ? `${extensionSummary.processedCount} updated` : '—'}
            helper={extensionSummary.skippedCount ? `${extensionSummary.skippedCount} skipped` : 'All eligible members processed'}
          />
          <SummaryItem
            icon={History}
            label="Last Updated By"
            value={extensionSummary?.lastRunBy?.name || '—'}
            helper={extensionSummary?.lastRunBy?.email || undefined}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Apply Extension</h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="extension-from-date" className="text-sm font-medium text-gray-700">
                From Date
              </label>
              <DateInput
                id="extension-from-date"
                value={formValues.fromDate}
                onChange={(event) => handleInputChange('fromDate', event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="extension-days" className="text-sm font-medium text-gray-700">
                Extension Days<span className="ml-1 text-orange-500">*</span>
              </label>
              <input
                id="extension-days"
                type="number"
                min={1}
                max={365}
                value={formValues.extensionDays}
                onChange={(event) => handleInputChange('extensionDays', event.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="extension-reason" className="text-sm font-medium text-gray-700">
              Reason (optional)
            </label>
            <textarea
              id="extension-reason"
              rows={3}
              value={formValues.reason}
              onChange={(event) => handleInputChange('reason', event.target.value)}
              placeholder="e.g. Maintenance shutdown or festival closure"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-4 w-4 text-orange-500" />
              <span>
                Extensions apply to active memberships in the selected branch. Members whose plans ended before the chosen date will be skipped automatically.
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-orange-300 sm:w-auto"
            disabled={extensionMutation.isPending}
          >
            {extensionMutation.isPending ? 'Applying Extension…' : 'Apply Extension'}
          </button>
        </form>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-green-50 via-white to-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-green-600" />
              <p className="text-sm font-semibold text-gray-900">Audit Log Snapshot</p>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Every extension run is timestamped with the operator’s name and stored under member history. Download full logs from reports if needed.
            </p>

            <ul className="mt-4 space-y-3 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-500" />
                {summaryFetching || summaryLoading ? 'Checking history…' : `Last run processed ${extensionSummary.processedCount || 0} members.`}
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-500" />
                {extensionSummary.lastReason ? `Reason: ${extensionSummary.lastReason}` : 'No reason provided in the previous run.'}
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-500" />
                {extensionSummary?.lastRunBy?.name ? `Handled by ${extensionSummary.lastRunBy.name}` : 'Awaiting first extension run.'}
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600 shadow-sm">
            <p className="font-medium text-gray-800">Need a reminder?</p>
            <p className="mt-2">
              Schedule a task from the Taskboard to revisit extensions monthly or after maintenance downtime. Consistent updates keep members delighted.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

