import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Pencil,
  Trash2,
  Play,
  Pause,
  Zap,
  Calendar,
  RefreshCw,
} from 'lucide-react'
import { getRecurring, deleteRecurring, updateRecurring, processRecurring } from '../services/api'
import RecurringModal from '../components/RecurringModal'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'

const fmt = (amount, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0)
  } catch {
    return `${currency} ${amount}`
  }
}

const FREQUENCY_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

export default function Recurring() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [processing, setProcessing] = useState(false)

  const { data: recurring = [], isLoading, isError } = useQuery({
    queryKey: ['recurring'],
    queryFn: getRecurring,
  })

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this recurring transaction?')) return
    setDeletingId(id)
    try {
      await deleteRecurring(id)
      toast.success('Recurring transaction deleted')
      qc.invalidateQueries({ queryKey: ['recurring'] })
    } catch {
      toast.error('Failed to delete recurring transaction')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (item) => {
    setTogglingId(item.id)
    try {
      await updateRecurring(item.id, { ...item, is_active: !item.is_active })
      toast.success(item.is_active ? 'Paused' : 'Activated')
      qc.invalidateQueries({ queryKey: ['recurring'] })
    } catch {
      toast.error('Failed to update status')
    } finally {
      setTogglingId(null)
    }
  }

  const handleProcess = async () => {
    setProcessing(true)
    try {
      const result = await processRecurring()
      toast.success(`Processed ${result.created} recurring transaction${result.created !== 1 ? 's' : ''}`)
      qc.invalidateQueries({ queryKey: ['recurring'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
    } catch {
      toast.error('Processing failed')
    } finally {
      setProcessing(false)
    }
  }

  const openCreate = () => {
    setEditingRecurring(null)
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditingRecurring(item)
    setModalOpen(true)
  }

  const activeCount = recurring.filter((r) => r.is_active).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Recurring</h1>
          <p className="text-slate-500 text-sm mt-1">
            {recurring.length} recurring · {activeCount} active
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleProcess}
            disabled={processing}
            className="btn-secondary"
          >
            {processing ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Zap size={15} />
            )}
            Process Now
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} />
            Add Recurring
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="card p-0 overflow-hidden">
          <div className="p-8 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        </div>
      ) : isError ? (
        <div className="card text-center text-red-500 py-8">Failed to load recurring transactions.</div>
      ) : recurring.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-3">🔄</div>
          <p className="text-slate-600 font-medium">No recurring transactions</p>
          <p className="text-slate-400 text-sm mt-1">Set up automatic recurring expenses or income</p>
          <button onClick={openCreate} className="btn-primary mt-4">
            <Plus size={16} />
            Add Recurring
          </button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Description</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Category</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Frequency</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Next Date</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Status</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recurring.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      !item.is_active ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                            item.type === 'income' ? 'bg-green-400' : 'bg-red-400'
                          }`}
                        />
                        <span className="text-sm font-medium text-slate-800">
                          {item.description || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.category ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0"
                            style={{ backgroundColor: (item.category.color || '#6366f1') + '20' }}
                          >
                            {item.category.icon || '💰'}
                          </span>
                          <span className="text-sm text-slate-700">{item.category.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm font-semibold ${
                          item.type === 'income' ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {fmt(item.amount, item.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <RefreshCw size={13} className="text-slate-400" />
                        {FREQUENCY_LABELS[item.frequency] || item.frequency}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Calendar size={13} className="text-slate-400" />
                        {item.next_date
                          ? format(parseISO(item.next_date), 'MMM d, yyyy')
                          : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        <span
                          className={`badge ${
                            item.is_active ? 'badge-green' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.is_active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleToggleActive(item)}
                          disabled={togglingId === item.id}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                            item.is_active
                              ? 'text-slate-400 hover:text-yellow-600 hover:bg-yellow-50'
                              : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={item.is_active ? 'Pause' : 'Activate'}
                        >
                          {togglingId === item.id ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                          ) : item.is_active ? (
                            <Pause size={15} />
                          ) : (
                            <Play size={15} />
                          )}
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === item.id ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <RecurringModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingRecurring(null) }}
        recurring={editingRecurring}
      />
    </div>
  )
}
