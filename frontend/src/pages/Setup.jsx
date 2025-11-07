import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, ArrowUpRight, ChevronRight, CheckCircle2, Sparkles, FolderCog, Settings2 } from 'lucide-react'
import { setupSections } from '../data/setupSections'

const actionButtonBaseClasses = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'

export default function Setup() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchTerm, setSearchTerm] = useState('')
  const initialSectionId = location.state?.sectionId || setupSections[0].id
  const [selectedSection, setSelectedSection] = useState(initialSectionId)
  const [selectedItemId, setSelectedItemId] = useState(location.state?.itemId || null)

  const totalSections = setupSections.length
  const totalItems = useMemo(() => setupSections.reduce((sum, section) => sum + section.items.length, 0), [])
  const actionableItems = useMemo(
    () =>
      setupSections.reduce((count, section) => {
        const actionable = section.items.filter(item => !item.comingSoon && (item.path || typeof item.onClick === 'function'))
        return count + actionable.length
      }, 0),
    []
  )

  const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) {
      return setupSections
    }

    const query = searchTerm.toLowerCase()
    return setupSections.filter(section => {
      const sectionMatch = section.title.toLowerCase().includes(query)
      const itemMatch = section.items.some(item => item.title.toLowerCase().includes(query))
      return sectionMatch || itemMatch
    })
  }, [searchTerm])

  useEffect(() => {
    if (!location.state) return

    if (location.state.sectionId) {
      setSelectedSection(location.state.sectionId)
    }
    if (location.state.itemId) {
      setSelectedItemId(location.state.itemId)
    }

    navigate(location.pathname, { replace: true })
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    if (filteredSections.length === 0) {
      return
    }

    const hasSelected = filteredSections.some(section => section.id === selectedSection)
    if (!hasSelected) {
      setSelectedSection(filteredSections[0].id)
      return
    }
  }, [filteredSections, selectedSection])

  const activeSection = filteredSections.find(section => section.id === selectedSection) || filteredSections[0] || null
  const ActiveSectionIcon = activeSection?.icon
  const selectedItem = activeSection?.items?.find(item => item.id === selectedItemId) || activeSection?.items?.[0] || null

  useEffect(() => {
    if (!activeSection || !activeSection.items) {
      setSelectedItemId(null)
      return
    }

    const hasItem = activeSection.items.some(item => item.id === selectedItemId)
    if (!hasItem) {
      setSelectedItemId(activeSection.items[0]?.id || null)
    }
  }, [activeSection, selectedItemId])

  const handleItemPrimaryAction = (item) => {
    if (!item || item.comingSoon) return

    if (item.path) {
      navigate(item.path)
      return
    }

    if (typeof item.onClick === 'function') {
      item.onClick(navigate)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <nav className="text-sm mb-4">
          <span className="text-gray-600">Home</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">Setup</span>
          {activeSection && (
            <>
              <span className="mx-2 text-gray-400">/</span>
              <span className="text-orange-600 font-medium">{activeSection.title}</span>
            </>
          )}
        </nav>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Setup Workspace</h1>
            <p className="text-gray-600 mt-1 max-w-2xl">
              Configure every part of your management stack—from branch profiles to automations—using curated checklists and guided actions.
            </p>
          </div>
          <button
            onClick={() => navigate('/support')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white transition-colors"
          >
            <Sparkles className="h-4 w-4 text-orange-500" />
            Explore Guides
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-6 md:grid-cols-3">
          <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 p-5">
            <p className="text-sm font-medium text-orange-700 flex items-center gap-2">
              <FolderCog className="h-4 w-4" />
              Configuration Areas
            </p>
            <p className="text-3xl font-bold text-orange-700 mt-2">{totalSections}</p>
            <p className="text-xs text-orange-600 mt-1">Categories to organise your setup modules.</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-5">
            <p className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Setup Items
            </p>
            <p className="text-3xl font-bold text-blue-700 mt-2">{totalItems}</p>
            <p className="text-xs text-blue-600 mt-1">Tasks and configuration points tracked here.</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-5">
            <p className="text-sm font-medium text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Actionable Today
            </p>
            <p className="text-3xl font-bold text-green-700 mt-2">{actionableItems}</p>
            <p className="text-xs text-green-600 mt-1">Setup actions with direct navigation available.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedSection}
              onChange={(event) => {
                setSelectedSection(event.target.value)
                setSelectedItemId(null)
              }}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-sm font-medium text-gray-700"
            >
              {setupSections.map(section => (
                <option key={section.id} value={section.id}>{section.title}</option>
              ))}
            </select>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search setup areas"
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedSection(setupSections[0].id)
                setSelectedItemId(null)
              }}
              className="px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-white transition-colors"
            >
              Reset View
            </button>
            <button
              className="px-4 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
            >
              Download Checklist
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Configuration Areas</h2>
            <p className="text-sm text-gray-500">{filteredSections.length} categories {searchTerm ? 'match your search' : 'available'}.</p>
          </div>

          <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
            {filteredSections.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">
                No setup sections match “{searchTerm.trim()}”.
              </div>
            ) : (
              filteredSections.map(section => {
                const isActive = section.id === selectedSection
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setSelectedSection(section.id)
                      setSelectedItemId(section.items[0]?.id || null)
                    }}
                    className={`w-full border-b border-gray-100 px-5 py-4 text-left transition-colors ${
                      isActive ? 'bg-orange-50/80 text-orange-700' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{section.title}</span>
                      <ArrowUpRight className={`h-4 w-4 ${isActive ? 'text-orange-600' : 'text-gray-300'}`} />
                    </div>
                    {section.highlights && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {section.highlights.map(highlight => (
                          <span key={highlight} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${isActive ? 'bg-white text-orange-600 border border-orange-200' : 'bg-gray-100 text-gray-500'}`}>
                            {highlight}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </aside>

        <section className="space-y-6">
          {activeSection ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      {ActiveSectionIcon && (
                        <ActiveSectionIcon className="h-6 w-6 text-orange-500" />
                      )}
                      <h2 className="text-2xl font-semibold text-gray-900">{activeSection.title}</h2>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{activeSection.description}</p>
                  </div>
                </div>
                {activeSection.highlights && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {activeSection.highlights.map(highlight => (
                      <span
                        key={highlight}
                        className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {activeSection.items.map(item => {
                      const isSelected = item.id === selectedItem?.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedItemId(item.id)}
                          className={`w-full px-5 py-3 flex items-center justify-between text-left transition-colors ${
                            isSelected
                              ? 'bg-orange-50/80 text-orange-700'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="font-medium">{item.title}</span>
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${isSelected ? 'translate-x-1 text-orange-600' : 'text-gray-300'}`}
                          />
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  {selectedItem ? (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">Focus Area</p>
                          <h3 className="mt-1 text-2xl font-semibold text-gray-900">{selectedItem.title}</h3>
                          <p className="mt-3 text-sm text-gray-600">{selectedItem.description}</p>
                        </div>
                        {selectedItem.comingSoon && (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">Coming soon</span>
                        )}
                      </div>

                      {selectedItem.details && selectedItem.details.length > 0 && (
                        <ul className="mt-6 space-y-3">
                          {selectedItem.details.map(detail => (
                            <li key={detail} className="flex items-start gap-3 text-sm text-gray-600">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-500" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {(selectedItem.path || typeof selectedItem.onClick === 'function') && (
                        <div className="mt-6">
                          <button
                            type="button"
                            onClick={() => handleItemPrimaryAction(selectedItem)}
                            className={`${actionButtonBaseClasses} bg-orange-500 text-white hover:bg-orange-600 ring-orange-500/60`}
                          >
                            {selectedItem.actionLabel || 'Open'}
                            <ArrowUpRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-500">
                      Select an option to view configuration guidance.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
              Select a setup category to get started.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

