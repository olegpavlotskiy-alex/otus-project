import React, { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { createCategory, updateCategory } from '../services/api'
import toast from 'react-hot-toast'

const DEFAULT_FORM = {
  name: '',
  icon: '💰',
  color: '#6366f1',
  type: 'expense',
}

export default function CategoryModal({ isOpen, onClose, category }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const isEdit = Boolean(category)

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setForm({
          name: category.name || '',
          icon: category.icon || '💰',
          color: category.color || '#6366f1',
          type: category.type || 'expense',
        })
      } else {
        setForm(DEFAULT_FORM)
      }
      setErrors({})
    }
  }, [isOpen, category])

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
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
    try {
      if (isEdit) {
        await updateCategory(category.id, form)
        toast.success('Category updated')
      } else {
        await createCategory(form)
        toast.success('Category created')
      }
      qc.invalidateQueries({ queryKey: ['categories'] })
      onClose()
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(Array.isArray(detail) ? detail[0]?.msg : detail || 'Failed to save category')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md modal-content">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">
            {isEdit ? 'Edit Category' : 'New Category'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="label" htmlFor="cat-name">Name</label>
            <input
              id="cat-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`input ${errors.name ? 'border-red-400' : ''}`}
              placeholder="e.g. Groceries"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Icon and color row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="cat-icon">Icon (emoji)</label>
              <input
                id="cat-icon"
                type="text"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="input text-xl"
                placeholder="💰"
                maxLength={4}
              />
            </div>
            <div>
              <label className="label" htmlFor="cat-color">Color</label>
              <div className="flex items-center gap-2">
                <input
                  id="cat-color"
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                />
                <span className="text-sm text-slate-500 font-mono">{form.color}</span>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: form.color + '20', border: `2px solid ${form.color}40` }}
            >
              {form.icon || '💰'}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{form.name || 'Category name'}</p>
              <p className="text-xs text-slate-500 capitalize">{form.type}</p>
            </div>
            <div
              className="ml-auto w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: form.color }}
            />
          </div>

          {/* Type */}
          <div>
            <label className="label">Type</label>
            <div className="flex rounded-lg overflow-hidden border border-slate-300">
              {['expense', 'income'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
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
