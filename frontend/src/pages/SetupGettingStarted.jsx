import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Loader2,
  Building2,
  Image as ImageIcon,
  ScrollText,
  FileText,
  LayoutDashboard,
  Check
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

  const allTasks = useMemo(() => {
    return groups.flatMap(group => group.tasks)
  }, [groups])

  const nextTask = allTasks.find(task => task.status !== 'completed')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Getting Started</h1>
          <p className="mt-1 text-sm text-gray-600">
            Complete these steps to set up your account
          </p>
        </div>

        {/* Progress Section */}
        <div className="rounded-lg bg-gradient-to-r from-orange-50 to-orange-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Setup Progress</span>
            <span className="text-sm font-semibold text-orange-700">
              {metrics.completedTasks} of {metrics.totalTasks} completed
            </span>
          </div>
          <div className="h-3 rounded-full bg-white/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500"
              style={{ width: `${metrics.completionPercent || 0}%` }}
            />
          </div>
          {isFetching && (
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-gray-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating...
            </div>
          )}
        </div>
      </div>

      {/* Next Task Highlight */}
      {nextTask && !isLoading && (
        <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-white p-5">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-orange-500 p-2">
              <ArrowRight className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-orange-700 mb-1">Next Step</p>
              <h3 className="text-base font-semibold text-gray-900 mb-1">{nextTask.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{nextTask.description}</p>
              <button
                onClick={() => handleTaskNavigate(nextTask)}
                disabled={!nextTask.path || (nextTask.key === 'branch-profile' && isFetchingBranches)}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {nextTask.actionLabel || 'Get Started'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="animate-pulse rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-gray-100" />
                  <div className="h-3 w-64 rounded bg-gray-100" />
                </div>
                <div className="h-10 w-24 rounded-lg bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">{group.title}</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {group.tasks.map((task, index) => {
                const isCompleted = task.status === 'completed'
                const IconComponent = iconLibrary[task.icon] || Circle
                const isDisabled = !task.path || (task.key === 'branch-profile' && isFetchingBranches)

                return (
                  <div
                    key={task.key}
                    className={`p-5 transition-colors ${
                      isCompleted ? 'bg-gray-50/50' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center transition-colors ${
                        isCompleted 
                          ? 'bg-emerald-100 text-emerald-600' 
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <IconComponent className="h-6 w-6" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-gray-500">
                                Step {task.order}
                              </span>
                              {isCompleted && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                  <Check className="h-3 w-3" />
                                  Completed
                                </span>
                              )}
                            </div>
                            <h3 className={`text-base font-semibold mb-1 ${
                              isCompleted ? 'text-gray-600 line-through' : 'text-gray-900'
                            }`}>
                              {task.title}
                            </h3>
                            <p className="text-sm text-gray-600">{task.description}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!isCompleted && (
                              <button
                                onClick={() => handleTaskNavigate(task)}
                                disabled={isDisabled}
                                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                  isDisabled
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-orange-500 text-white hover:bg-orange-600'
                                }`}
                              >
                                {task.actionLabel || 'Open'}
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleStatusChange(task, isCompleted ? 'pending' : 'completed')}
                              disabled={updateStatusMutation.isPending}
                              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                                isCompleted
                                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {isCompleted ? 'Reopen' : 'Mark Done'}
                            </button>
                          </div>
                        </div>
                      </div>
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
