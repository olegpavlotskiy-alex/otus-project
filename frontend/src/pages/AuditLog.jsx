import React, { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Shield,
  Filter,
  RotateCcw,
} from 'lucide-react'
import { getAuditLog } from '../services/api'
import { format, parseISO } from 'date-fns'

const ENTITY_TYPES = ['transaction', 'budget', 'category', 'recurring']
const ACTIONS = ['create', 'update', 'delete']

const ACTION_BADGE_CLASSES = {
  create: 'badge-green',
  update: 'badge-blue',
  delete: 'badge-red',
}

function JsonDiff({ oldValues, newValues }) {
  if (!oldValues && !newValues) return null

  const formatJson = (obj) => {
    if (!obj) return null
    try {
      return typeof obj === 'string' ? JSON.parse(obj) : obj
    } catch {
      return obj
    }
  }

  const oldObj = formatJson(oldValues)
  const newObj = formatJson(newValues)

  if (!oldObj && !newObj) return null

  return (
    <div className="mt-2 space-y-2">
      {oldObj && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">Previous values:</p>
          <pre className="text-xs bg-red-50 text-red-800 p-2 rounded-lg overflow-x-auto border border-red-100">
            {JSON.stringify(oldObj, null, 2)}
          </pre>
        </div>
      )}
      {newObj && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">New values:</p>
          <pre className="text-xs bg-green-50 text-green-800 p-2 rounded-lg overflow-x-auto border border-green-100">
            {JSON.stringify(newObj, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function AuditRow({ log }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = log.old_values || log.new_values

  return (
    <>
      <tr className="hover:bg-slate-50 transition-colors">
        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
          {log.timestamp ? format(parseISO(log.timestamp), 'MMM d, yyyy HH:mm') : '—'}
        </td>
        <td className="px-4 py-3">
          <span className="text-sm font-medium text-slate-700 capitalize">
            {log.entity_type || '—'}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-slate-500 font-mono">
            #{log.entity_id || '—'}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`badge ${ACTION_BADGE_CLASSES[log.action] || 'badge-blue'}`}>
            {log.action || '—'}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          {hasDetails && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title={expanded ? 'Hide details' : 'Show details'}
            >
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          )}
        </td>
      </tr>
      {expanded && hasDetails && (
        <tr>
          <td colSpan={5} className="px-4 pb-3 pt-0">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <JsonDiff oldValues={log.old_values} newValues={log.new_values} />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

const EMPTY_FILTERS = { entity_type: '', action: '' }

export default function AuditLog() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)

  const buildParams = useCallback(
    () => ({
      ...Object.fromEntries(Object.entries(appliedFilters).filter(([, v]) => v !== '')),
      page,
      size: 20,
    }),
    [appliedFilters, page]
  )

  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-log', appliedFilters, page],
    queryFn: () => getAuditLog(buildParams()),
  })

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters })
    setPage(1)
  }

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
    setPage(1)
  }

  const logs = data?.items || []
  const totalPages = data?.pages || 1

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Audit Log</h1>
        <p className="text-slate-500 text-sm mt-1">
          {data?.total != null ? `${data.total} events recorded` : 'Track all changes to your data'}
        </p>
      </div>

      {/* Filter bar */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[160px]">
            <label className="label">Entity Type</label>
            <select
              value={filters.entity_type}
              onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
              className="input"
            >
              <option value="">All types</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="label">Action</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="input"
            >
              <option value="">All actions</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a} className="capitalize">
                  {a.charAt(0).toUpperCase() + a.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleApplyFilters} className="btn-primary">
              <Filter size={14} />
              Apply
            </button>
            <button onClick={handleResetFilters} className="btn-secondary">
              <RotateCcw size={14} />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500">Failed to load audit log.</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No audit events found</p>
            <p className="text-slate-400 text-sm mt-1">Events will appear here as you make changes</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Timestamp</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Entity Type</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Entity ID</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Action</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <AuditRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                <p className="text-sm text-slate-500">
                  Page {page} of {totalPages} ({data?.total} total)
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-ghost p-2 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (page <= 3) {
                      pageNum = i + 1
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = page - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 text-sm rounded-lg font-medium transition-colors ${
                          pageNum === page
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-ghost p-2 disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
