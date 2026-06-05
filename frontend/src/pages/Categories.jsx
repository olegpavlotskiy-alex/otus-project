import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { getCategories, deleteCategory } from '../services/api'
import CategoryModal from '../components/CategoryModal'
import toast from 'react-hot-toast'

export default function Categories() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [filter, setFilter] = useState('all') // all | income | expense

  const { data: categories = [], isLoading, isError } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  const filtered = categories.filter((c) => filter === 'all' || c.type === filter)
  const incomeCount = categories.filter((c) => c.type === 'income').length
  const expenseCount = categories.filter((c) => c.type === 'expense').length

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category? Transactions using it may be affected.')) return
    setDeletingId(id)
    try {
      await deleteCategory(id)
      toast.success('Category deleted')
      qc.invalidateQueries({ queryKey: ['categories'] })
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(detail || 'Failed to delete category')
    } finally {
      setDeletingId(null)
    }
  }

  const openCreate = () => {
    setEditingCategory(null)
    setModalOpen(true)
  }

  const openEdit = (cat) => {
    setEditingCategory(cat)
    setModalOpen(true)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Categories</h1>
          <p className="text-slate-500 text-sm mt-1">
            {categories.length} total · {incomeCount} income · {expenseCount} expense
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} />
          Add Category
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {['all', 'income', 'expense'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
              filter === f
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {f === 'all' ? `All (${categories.length})` : f === 'income' ? `Income (${incomeCount})` : `Expense (${expenseCount})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-24 mb-2" />
                  <div className="h-3 bg-slate-200 rounded w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="card text-center text-red-500 py-8">
          Failed to load categories.
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-3">🏷️</div>
          <p className="text-slate-600 font-medium">No categories yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first category to get started</p>
          <button onClick={openCreate} className="btn-primary mt-4">
            <Plus size={16} />
            Add Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((cat) => (
            <div
              key={cat.id}
              className="card hover:shadow-md transition-shadow group relative"
            >
              {/* Color bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                style={{ backgroundColor: cat.color || '#6366f1' }}
              />

              <div className="flex items-start gap-3 pt-2">
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{
                    backgroundColor: (cat.color || '#6366f1') + '20',
                    border: `1.5px solid ${cat.color || '#6366f1'}40`,
                  }}
                >
                  {cat.icon || '💰'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{cat.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`badge ${cat.type === 'income' ? 'badge-green' : 'badge-red'}`}
                    >
                      {cat.type}
                    </span>
                    <div
                      className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: cat.color || '#6366f1' }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1 mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => openEdit(cat)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  disabled={deletingId === cat.id}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  {deletingId === cat.id ? (
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
          ))}
        </div>
      )}

      {/* Modal */}
      <CategoryModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCategory(null) }}
        category={editingCategory}
      />
    </div>
  )
}
