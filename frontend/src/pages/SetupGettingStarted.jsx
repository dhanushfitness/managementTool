import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Circle,
  ArrowUpRight,
  Loader2,
  Building2,
  Image as ImageIcon,
  ScrollText,
  FileText,
  LayoutDashboard
} from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchSetupChecklist, updateSetupTaskStatus } from '../api/setup'
import { getBranches } from '../api/organization'

const iconLibrary = {
  Building2,
  Image: ImageIcon,
  ScrollText,
  FileText,
  LayoutDashboard
}

const statusConfig = {
  completed: {
    label: 'Completed',
    badge: 'bg-emerald-500 text-white',
    icon: CheckCircle2,
    accent: 'text-emerald-600'
  },
  'in-progress': {
    label: 'In Progress',
    badge: 'bg-sky-500 text-white',
    icon: Circle,
    accent: 'text-sky-600'
  },
  pending: {
    label: 'Pending',
    badge: 'bg-gray-200 text-gray-600',
    icon: Circle,
    accent: 'text-gray-500'
  }
}

export default function SetupGettingStarted() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['setup-checklist'],
    queryFn: fetchSetupChecklist
  })

  const { data: branchesResponse, isFetching: isFetchingBranches } = useQuery({
    queryKey: ['branches-summary'],
    queryFn: getBranches
  })

  const existingBranchId = branchesResponse?.branches?.[0]?._id

  const groups = useMemo(() => data?.data?.data?.groups || [], [data])
  const metrics = data?.data?.data?.metrics || { totalTasks: 0, completedTasks: 0, completionPercent: 0 }

  const updateStatusMutation = useMutation({
    mutationFn: ({ key, status }) => updateSetupTaskStatus(key, status),
    onSuccess: () => {
      toast.success('Checklist updated')
      queryClient.invalidateQueries({ queryKey: ['setup-checklist'] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Unable to update task status')
    }
  })

  const handleStatusChange = (task, nextStatus) => {
    if (task.status === nextStatus) return
    updateStatusMutation.mutate({ key: task.key, status: nextStatus })
  }

  const handleTaskNavigate = (task) => {
    if (!task.path) return
    if (task.key === 'branch-profile') {
      if (existingBranchId) {
        navigate(`/branches?id=${existingBranchId}`)
      } else {
        navigate(task.path)
      }
      return
    }
    navigate(task.path)
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
                <span className="text-orange-600 font-semibold">
                  Completed {metrics.completedTasks} out of {metrics.totalTasks}
                </span>
              </div>
              <div className="h-2 rounded-full bg-orange-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${metrics.completionPercent || 0}%` }}
                />
              </div>
              {isFetching && (
                <div className="mt-2 inline-flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Syncing progress
                </div>
              )}
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

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, index) => (
            <div key={index} className="animate-pulse rounded-xl border border-gray-200 bg-white p-6">
              <div className="h-5 w-40 rounded-full bg-gray-100" />
              <div className="mt-4 space-y-3">
                {[...Array(2)].map((__, idx) => (
                  <div key={idx} className="h-20 rounded-xl bg-gray-100" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{group.title}</h2>
              <span className="text-sm text-gray-500">
                {group.tasks.filter((task) => task.status === 'completed').length}/{group.tasks.length} completed
              </span>
            </div>

            <div className="space-y-4">
              {group.tasks.map((task) => {
                const status = statusConfig[task.status] || statusConfig.pending
                const StatusIcon = status.icon
                const IconComponent = iconLibrary[task.icon] || Circle
                const isDisabled = !task.path || (task.key === 'branch-profile' && isFetchingBranches)

                return (
                  <div
                    key={task.key}
                    className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${task.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                          <StatusIcon className={`${status.accent} h-4 w-4`} />
                          <span>Step {task.order}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mt-1">{task.title}</h3>
                        <p className="text-sm text-gray-600 mt-1 max-w-2xl">{task.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 md:flex-col md:items-end md:gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${status.badge}`}>
                        {status.label}
                      </span>
                      <button
                        onClick={() => !isDisabled && handleTaskNavigate(task)}
                        disabled={isDisabled}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                          isDisabled
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-orange-500 text-white hover:bg-orange-600'
                        }`}
                      >
                        {isDisabled
                          ? task.key === 'branch-profile' && isFetchingBranches
                            ? 'Loading...'
                            : 'Coming Soon'
                          : task.actionLabel || 'Open'}
                        {!isDisabled && <ArrowUpRight className="h-4 w-4" />}
                      </button>
                      {task.status !== 'completed' ? (
                        <button
                          onClick={() => handleStatusChange(task, 'completed')}
                          disabled={updateStatusMutation.isPending}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          Mark as done
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(task, 'pending')}
                          disabled={updateStatusMutation.isPending}
                          className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

