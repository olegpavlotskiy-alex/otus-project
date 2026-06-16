import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { getCategories, createTransaction, updateTransaction } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'RUB', 'JPY', 'CNY', 'CAD', 'AUD', 'CHF']

const makeDefaultForm = (preferredCurrency = 'USD') => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  category_id: '',
  type: 'expense',
  amount: '',
  original_amount: '',
  original_currency: preferredCurrency,
  exchange_rate: '1.0',
  description: '',
})

export default function TransactionModal({ isOpen, onClose, transaction }) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const preferredCurrency = user?.preferred_currency || 'USD'
  const [form, setForm] = useState(() => makeDefaultForm(preferredCurrency))
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const isEdit = Boolean(transaction)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    enabled: isOpen,
  })

  useEffect(() => {
    if (isOpen) {
      if (transaction) {
        setForm({
          date: transaction.date ? transaction.date.slice(0, 10) : format(new Date(), 'yyyy-MM-dd'),
          category_id: transaction.category_id?.toString() || '',
          type: transaction.type || 'expense',
          amount: transaction.amount?.toString() || '',
          original_amount: transaction.original_amount?.toString() || transaction.amount?.toString() || '',
          original_currency: transaction.original_currency || preferredCurrency,
          exchange_rate: transaction.exchange_rate?.toString() || '1.0',
          description: transaction.description || '',
        })
      } else {
        setForm(makeDefaultForm(preferredCurrency))
      }
      setErrors({})
    }
  }, [isOpen, transaction, preferredCurrency])

  // Auto-calculate amount in preferred currency whenever original_amount or exchange_rate changes
  useEffect(() => {
    const orig = parseFloat(form.original_amount)
    const rate = parseFloat(form.exchange_rate)
    if (!isNaN(orig) && orig > 0 && !isNaN(rate) && rate > 0) {
      const calculated = (orig * rate).toFixed(2)
      setForm(prev => ({ ...prev, amount: calculated }))
    }
  }, [form.original_amount, form.exchange_rate])

  const filteredCategories = categories.filter((c) => c.type === form.type || !c.type)

  const handleCurrencyChange = (currency) => {
    const newForm = { ...form, original_currency: currency }
    if (currency === preferredCurrency) {
      newForm.exchange_rate = '1.0'
      // amount will sync via useEffect
    }
    setForm(newForm)
  }

  const validate = () => {
    const errs = {}
    if (!form.date) errs.date = 'Date is required'
    if (!form.category_id) errs.category_id = 'Category is required'
    if (!form.original_amount || isNaN(parseFloat(form.original_amount)) || parseFloat(form.original_amount) <= 0)
      errs.amount = 'Valid amount is required'
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

    const origAmt = parseFloat(form.original_amount)
    const rate = parseFloat(form.exchange_rate) || 1.0
    const payload = {
      date: form.date,
      category_id: form.category_id,
      type: form.type,
      original_amount: origAmt,
      original_currency: form.original_currency,
      exchange_rate: rate,
      amount: parseFloat((origAmt * rate).toFixed(2)),
      exchange_rate: parseFloat(form.exchange_rate) || 1.0,
      description: form.description,
    }

    try {
      if (isEdit) {
        await updateTransaction(transaction.id, payload)
        toast.success('Transaction updated')
      } else {
        await createTransaction(payload)
        toast.success('Transaction added')
      }
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      qc.invalidateQueries({ queryKey: ['expenses-by-category'] })
      qc.invalidateQueries({ queryKey: ['monthly-trend'] })
      qc.invalidateQueries({ queryKey: ['top-categories'] })
      onClose()
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(Array.isArray(detail) ? detail[0]?.msg : detail || 'Failed to save transaction')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg modal-content max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">
            {isEdit ? 'Edit Transaction' : 'New Transaction'}
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

          {/* Date */}
          <div>
            <label className="label" htmlFor="tx-date">Date</label>
            <input
              id="tx-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={`input ${errors.date ? 'border-red-400' : ''}`}
            />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="label" htmlFor="tx-category">Category</label>
            <select
              id="tx-category"
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
            {errors.category_id && (
              <p className="text-red-500 text-xs mt-1">{errors.category_id}</p>
            )}
          </div>

          {/* Original currency + amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="tx-orig-currency">Currency</label>
              <select
                id="tx-orig-currency"
                value={form.original_currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="input"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="tx-orig-amount">Amount</label>
              <input
                id="tx-orig-amount"
                type="number"
                step="0.01"
                min="0"
                value={form.original_amount}
                onChange={(e) => setForm({ ...form, original_amount: e.target.value })}
                className={`input ${errors.amount ? 'border-red-400' : ''}`}
                placeholder="0.00"
              />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
            </div>
          </div>

          {/* Exchange rate + converted amount */}
          {form.original_currency !== preferredCurrency && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="tx-rate">
                  Rate (1 {form.original_currency} → {preferredCurrency})
                </label>
                <input
                  id="tx-rate"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={form.exchange_rate}
                  onChange={(e) => setForm({ ...form, exchange_rate: e.target.value })}
                  className="input"
                  placeholder="1.0"
                />
              </div>
              <div>
                <label className="label" htmlFor="tx-amount">
                  Amount ({preferredCurrency})
                </label>
                <input
                  id="tx-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  readOnly
                  className="input bg-slate-50 cursor-not-allowed"
                  placeholder="auto"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="label" htmlFor="tx-description">Description</label>
            <textarea
              id="tx-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input resize-none"
              rows={2}
              placeholder="Optional note…"
            />
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
              ) : isEdit ? 'Update' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
