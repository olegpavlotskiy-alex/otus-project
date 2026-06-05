import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { getBudgets, deleteBudget } from '../services/api'
import BudgetModal from '../components/BudgetModal'
import toast from 'react-hot-toast'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const fmt = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)

function BudgetProgressBar({ spent, limit }) {
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
  let color = 'bg-green-500'
  let textColor = 'text-green-700'
  if (pct >= 90) {
    color = 'bg-red-500'
    textColor = 'text-red-700'
  } else if (pct >= 70) {
    color = 'bg-yellow-500'
    textColor = 'text-yellow-700'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-500">
          {fmt(spent)} <span className="text-slate-400">of</span> {fmt(limit)}
        </span>
        <span className={`text-xs font-semibold ${textColor}`}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function Budgets() {
  const qc = useQueryClient()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const { data: budgets = [], isLoading, isError } = useQuery({
    queryKey: ['budgets', year, month],
    queryFn: () => getBudgets({ year, month }),
  })

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this budget?')) return
    setDeletingId(id)
    try {
      await deleteBudget(id)
      toast.success('Budget deleted')
      qc.invalidateQueries({ queryKey: ['budgets'] })
    } catch {
      toast.error('Failed to delete budget')
    } finally {
      setDeletingId(null)
    }
  }

  const openCreate = () => {
    setEditingBudget(null)
    setModalOpen(true)
  }

  const openEdit = (budget) => {
    setEditingBudget(budget)
    setModalOpen(true)
  }

  const overBudgetCount = budgets.filter(
    (b) => b.limit_amount > 0 && b.spent_amount > b.limit_amount
  ).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Budgets</h1>
          <p className="text-slate-500 text-sm mt-1">
            {budgets.length} budget{budgets.length !== 1 ? 's' : ''} this period
            {overBudgetCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-red-600">
                <AlertTriangle size={12} />
                {overBudgetCount} over budget
              </span>
            )}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} />
          Add Budget
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <button onClick={prevMonth} className="btn-secondary p-2">
          <ChevronLeft size={16} />
        </button>
        <span className="text-base font-semibold text-slate-700 min-w-[160px] text-center">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button onClick={nextMonth} className="btn-secondary p-2">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-24 mb-2" />
                  <div className="h-3 bg-slate-200 rounded w-16" />
                </div>
              </div>
              <div className="h-2 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="card text-center text-red-500 py-8">Failed to load budgets.</div>
      ) : budgets.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-3">💰</div>
          <p className="text-slate-600 font-medium">No budgets for this period</p>
          <p className="text-slate-400 text-sm mt-1">Set budgets to track your spending</p>
          <button onClick={openCreate} className="btn-primary mt-4">
            <Plus size={16} />
            Add Budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget) => {
            const spent = budget.spent_amount || 0
            const limit = budget.limit_amount || 0
            const pct = limit > 0 ? (spent / limit) * 100 : 0
            const isOver = spent > limit && limit > 0

            return (
              <div
                key={budget.id}
                className={`card hover:shadow-md transition-shadow ${
                  isOver ? 'border-red-200' : ''
                }`}
              >
                {/* Category info */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{
                        backgroundColor: (budget.category?.color || '#6366f1') + '20',
                        border: `1.5px solid ${budget.category?.color || '#6366f1'}40`,
                      }}
                    >
                      {budget.category?.icon || '💰'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">
                        {budget.category?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">{budget.currency}</p>
                    </div>
                  </div>
                  {isOver && (
                    <div className="flex items-center gap-1 text-red-500">
                      <AlertTriangle size={14} />
                      <span className="text-xs font-medium">Over</span>
                    </div>
                  )}
                </div>

                {/* Progress */}
                <BudgetProgressBar spent={spent} limit={limit} />

                {/* Remaining */}
                <div className="mt-3">
                  {isOver ? (
                    <p className="text-xs text-red-600 font-medium">
                      {fmt(spent - limit)} over budget
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      {fmt(limit - spent)} remaining
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => openEdit(budget)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(budget.id)}
                    disabled={deletingId === budget.id}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === budget.id ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <BudgetModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingBudget(null) }}
        budget={editingBudget}
      />
    </div>
  )
}
