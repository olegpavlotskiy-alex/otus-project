import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { getCategories, createBudget, updateBudget } from '../services/api'
import toast from 'react-hot-toast'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'RUB', 'JPY', 'CNY', 'CAD', 'AUD', 'CHF']

const now = new Date()
const DEFAULT_FORM = {
  category_id: '',
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  limit_amount: '',
  currency: 'USD',
}

export default function BudgetModal({ isOpen, onClose, budget }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const isEdit = Boolean(budget)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    enabled: isOpen,
  })

  useEffect(() => {
    if (isOpen) {
      if (budget) {
        setForm({
          category_id: budget.category_id?.toString() || '',
          year: budget.year || now.getFullYear(),
          month: budget.month || now.getMonth() + 1,
          limit_amount: budget.limit_amount?.toString() || '',
          currency: budget.currency || 'USD',
        })
      } else {
        setForm(DEFAULT_FORM)
      }
      setErrors({})
    }
  }, [isOpen, budget])

  const validate = () => {
    const errs = {}
    if (!form.category_id) errs.category_id = 'Category is required'
    if (!form.limit_amount || isNaN(parseFloat(form.limit_amount)) || parseFloat(form.limit_amount) <= 0)
      errs.limit_amount = 'Valid limit amount is required'
    if (!form.year || form.year < 2000 || form.year > 2100) errs.year = 'Valid year required'
    if (!form.month || form.month < 1 || form.month > 12) errs.month = 'Valid month required'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setLoading(true)

    const payload = {
      category_id: parseInt(form.category_id),
      year: parseInt(form.year),
      month: parseInt(form.month),
      limit_amount: parseFloat(form.limit_amount),
      currency: form.currency,
    }

    try {
      if (isEdit) {
        await updateBudget(budget.id, payload)
        toast.success('Budget updated')
      } else {
        await createBudget(payload)
        toast.success('Budget created')
      }
      qc.invalidateQueries({ queryKey: ['budgets'] })
      onClose()
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(Array.isArray(detail) ? detail[0]?.msg : detail || 'Failed to save budget')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md modal-content">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">
            {isEdit ? 'Edit Budget' : 'New Budget'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Category */}
          <div>
            <label className="label" htmlFor="budget-category">Category</label>
            <select
              id="budget-category"
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className={`input ${errors.category_id ? 'border-red-400' : ''}`}
            >
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
            {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id}</p>}
          </div>

          {/* Year + Month */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="budget-year">Year</label>
              <input
                id="budget-year"
                type="number"
                min="2000"
                max="2100"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || '' })}
                className={`input ${errors.year ? 'border-red-400' : ''}`}
              />
              {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year}</p>}
            </div>
            <div>
              <label className="label" htmlFor="budget-month">Month</label>
              <select
                id="budget-month"
                value={form.month}
                onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })}
                className={`input ${errors.month ? 'border-red-400' : ''}`}
              >
                {monthNames.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>{name}</option>
                ))}
              </select>
              {errors.month && <p className="text-red-500 text-xs mt-1">{errors.month}</p>}
            </div>
          </div>

          {/* Limit amount + currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="budget-limit">Limit Amount</label>
              <input
                id="budget-limit"
                type="number"
                step="0.01"
                min="0"
                value={form.limit_amount}
                onChange={(e) => setForm({ ...form, limit_amount: e.target.value })}
                className={`input ${errors.limit_amount ? 'border-red-400' : ''}`}
                placeholder="0.00"
              />
              {errors.limit_amount && (
                <p className="text-red-500 text-xs mt-1">{errors.limit_amount}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="budget-currency">Currency</label>
              <select
                id="budget-currency"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="input"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Saving…
                </span>
              ) : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
