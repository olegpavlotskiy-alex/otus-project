import React, { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Download,
  Upload,
  Search,
  Filter,
  RotateCcw,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react'
import { getTransactions, deleteTransaction, exportTransactions, getCategories } from '../services/api'
import TransactionModal from '../components/TransactionModal'
import CsvImportModal from '../components/CsvImportModal'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'

const fmt = (amount) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount || 0)

const EMPTY_FILTERS = {
  date_from: '',
  date_to: '',
  category_id: '',
  type: '',
  amount_min: '',
  amount_max: '',
}

export default function Transactions() {
  const qc = useQueryClient()

  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const buildParams = useCallback(
    () => ({
      ...Object.fromEntries(Object.entries(appliedFilters).filter(([, v]) => v !== '')),
      page,
      size: 20,
    }),
    [appliedFilters, page]
  )

  const { data, isLoading, isError } = useQuery({
    queryKey: ['transactions', appliedFilters, page],
    queryFn: () => getTransactions(buildParams()),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return
    setDeletingId(id)
    try {
      await deleteTransaction(id)
      toast.success('Transaction deleted')
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      qc.invalidateQueries({ queryKey: ['expenses-by-category'] })
      qc.invalidateQueries({ queryKey: ['monthly-trend'] })
      qc.invalidateQueries({ queryKey: ['top-categories'] })
    } catch {
      toast.error('Failed to delete transaction')
    } finally {
      setDeletingId(null)
    }
  }

  const handleExport = async () => {
    try {
      const response = await exportTransactions()
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 150)
      toast.success('Export downloaded')
    } catch {
      toast.error('Export failed')
    }
  }

  const openCreate = () => {
    setEditingTransaction(null)
    setModalOpen(true)
  }

  const openEdit = (tx) => {
    setEditingTransaction(tx)
    setModalOpen(true)
  }

  const transactions = data?.items || []
  const totalPages = data?.pages || 1

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transactions</h1>
          <p className="text-slate-500 text-sm mt-1">
            {data?.total != null ? `${data.total} total transactions` : 'Manage your transactions'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setImportModalOpen(true)} className="btn-secondary">
            <Upload size={16} />
            Import CSV
          </button>
          <button onClick={handleExport} className="btn-secondary">
            <Download size={16} />
            Export CSV
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div>
            <label className="label">From</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">To</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Category</label>
            <select
              value={filters.category_id}
              onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
              className="input"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="input"
            >
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label className="label">Min Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={filters.amount_min}
              onChange={(e) => setFilters({ ...filters, amount_min: e.target.value })}
              className="input"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="label">Max Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={filters.amount_max}
              onChange={(e) => setFilters({ ...filters, amount_max: e.target.value })}
              className="input"
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
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

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500">
            <p>Failed to load transactions. Please try again.</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-3">💳</div>
            <p className="text-slate-600 font-medium">No transactions found</p>
            <p className="text-slate-400 text-sm mt-1">
              {Object.values(appliedFilters).some(Boolean)
                ? 'Try adjusting your filters'
                : 'Add your first transaction to get started'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Date</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Description</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Category</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Type</th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Amount</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {tx.date ? format(parseISO(tx.date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800 max-w-xs truncate">
                        {tx.description || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {tx.category ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0"
                              style={{ backgroundColor: (tx.category.color || '#6366f1') + '20' }}
                            >
                              {tx.category.icon || '💰'}
                            </span>
                            <span className="text-sm text-slate-700">{tx.category.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge ${
                            tx.type === 'income' ? 'badge-green' : 'badge-red'
                          } flex items-center gap-1 w-fit`}
                        >
                          {tx.type === 'income' ? (
                            <ArrowUpCircle size={11} />
                          ) : (
                            <ArrowDownCircle size={11} />
                          )}
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-sm font-semibold ${
                            tx.type === 'income' ? 'text-green-600' : 'text-red-500'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {fmt(tx.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(tx)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            disabled={deletingId === tx.id}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === tx.id ? (
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

      {/* Modals */}
      <TransactionModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTransaction(null) }}
        transaction={editingTransaction}
      />
      <CsvImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
    </div>
  )
}
