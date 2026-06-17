import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { getCategories, createRecurring, updateRecurring } from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'RUB', 'JPY', 'CNY', 'CAD', 'AUD', 'CHF']
const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly']

const DEFAULT_FORM = {
  category_id: '',
  type: 'expense',
  amount: '',
  currency: 'USD',
  description: '',
  frequency: 'monthly',
  next_date: format(new Date(), 'yyyy-MM-dd'),
}

export default function RecurringModal({ isOpen, onClose, recurring }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const isEdit = Boolean(recurring)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    enabled: isOpen,
  })

  useEffect(() => {
    if (isOpen) {
      if (recurring) {
        setForm({
          category_id: recurring.category_id?.toString() || '',
          type: recurring.type || 'expense',
          amount: recurring.amount?.toString() || '',
          currency: recurring.currency || 'USD',
          description: recurring.description || '',
          frequency: recurring.frequency || 'monthly',
          next_date: recurring.next_date ? recurring.next_date.slice(0, 10) : format(new Date(), 'yyyy-MM-dd'),
        })
      } else {
        setForm(DEFAULT_FORM)
      }
      setErrors({})
    }
  }, [isOpen, recurring])

  const filteredCategories = categories.filter((c) => c.type === form.type || !c.type)

  const validate = () => {
    const errs = {}
    if (!form.category_id) errs.category_id = 'Category is required'
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0)
      errs.amount = 'Valid amount is required'
    if (!form.next_date) errs.next_date = 'Next date is required'
    if (!form.description.trim()) errs.description = 'Description is required'
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
      category_id: form.category_id,
      type: form.type,
      amount: parseFloat(form.amount),
      currency: form.currency,
      description: form.description,
      frequency: form.frequency,
      next_date: form.next_date,
    }

    try {
      if (isEdit) {
        await updateRecurring(recurring.id, payload)
        toast.success('Recurring transaction updated')
      } else {
        await createRecurring(payload)
        toast.success('Recurring transaction created')
      }
      qc.invalidateQueries({ queryKey: ['recurring'] })
      onClose()
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(Array.isArray(detail) ? detail[0]?.msg : detail || 'Failed to save recurring transaction')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md modal-content max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">
            {isEdit ? 'Edit Recurring' : 'New Recurring Transaction'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type toggle */}
          <div>
            <label className="label">Type</label>
            <div className="flex rounded-lg overflow-hidden border border-slate-300">
              {['expense', 'income'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t, category_id: '' })}
                  className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                    form.type === t
                      ? t === 'expense'
                        ? 'bg-red-500 text-white'
                        : 'bg-green-500 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="label" htmlFor="rec-category">Category</label>
            <select
              id="rec-category"
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className={`input ${errors.category_id ? 'border-red-400' : ''}`}
            >
              <option value="">Select category…</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
            {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="label" htmlFor="rec-desc">Description</label>
            <input
              id="rec-desc"
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={`input ${errors.description ? 'border-red-400' : ''}`}
              placeholder="e.g. Netflix subscription"
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="rec-amount">Amount</label>
              <input
                id="rec-amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className={`input ${errors.amount ? 'border-red-400' : ''}`}
                placeholder="0.00"
              />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
            </div>
            <div>
              <label className="label" htmlFor="rec-currency">Currency</label>
              <select
                id="rec-currency"
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

          {/* Frequency */}
          <div>
            <label className="label" htmlFor="rec-frequency">Frequency</label>
            <select
              id="rec-frequency"
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              className="input"
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f} className="capitalize">
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Next date */}
          <div>
            <label className="label" htmlFor="rec-next-date">Next Date</label>
            <input
              id="rec-next-date"
              type="date"
              value={form.next_date}
              onChange={(e) => setForm({ ...form, next_date: e.target.value })}
              className={`input ${errors.next_date ? 'border-red-400' : ''}`}
            />
            {errors.next_date && <p className="text-red-500 text-xs mt-1">{errors.next_date}</p>}
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
