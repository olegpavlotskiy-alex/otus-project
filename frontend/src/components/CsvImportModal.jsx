import React, { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X, Upload, FileText, CheckCircle } from 'lucide-react'
import { importTransactions } from '../services/api'
import toast from 'react-hot-toast'

const REQUIRED_FIELDS = [
  { key: 'date', label: 'Date column name', placeholder: 'date' },
  { key: 'amount', label: 'Amount column name', placeholder: 'amount' },
  { key: 'type', label: 'Type column name (income/expense)', placeholder: 'type' },
  { key: 'category', label: 'Category column name', placeholder: 'category' },
  { key: 'description', label: 'Description column name', placeholder: 'description' },
]

export default function CsvImportModal({ isOpen, onClose }) {
  const qc = useQueryClient()
  const fileInputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [mapping, setMapping] = useState({
    date: 'date',
    amount: 'amount',
    type: 'type',
    category: 'category',
    description: 'description',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFileChange = (selectedFile) => {
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile)
      setResult(null)
    } else if (selectedFile) {
      toast.error('Please select a CSV file')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    handleFileChange(dropped)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      toast.error('Please select a CSV file')
      return
    }

    setLoading(true)
    try {
      const data = await importTransactions(file, mapping)
      setResult(data)
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      toast.success(`Successfully imported ${data.created} transactions`)
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(Array.isArray(detail) ? detail[0]?.msg : detail || 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setResult(null)
    setMapping({
      date: 'date',
      amount: 'amount',
      type: 'type',
      category: 'category',
      description: 'description',
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg modal-content max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Upload className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Import CSV</h2>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {result ? (
          /* Success state */
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Import Complete!</h3>
            <p className="text-slate-600 text-sm mb-6">
              Successfully imported{' '}
              <span className="font-bold text-indigo-600">{result.created}</span> transaction
              {result.created !== 1 ? 's' : ''}.
            </p>
            <button onClick={handleClose} className="btn-primary">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* File upload */}
            <div>
              <label className="label">CSV File</label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-indigo-400 bg-indigo-50'
                    : file
                    ? 'border-green-400 bg-green-50'
                    : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files[0])}
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-8 h-8 text-green-600" />
                    <p className="text-sm font-medium text-green-700">{file.name}</p>
                    <p className="text-xs text-green-600">
                      {(file.size / 1024).toFixed(1)} KB — click to change
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-slate-400" />
                    <p className="text-sm font-medium text-slate-600">
                      Drop your CSV here or click to browse
                    </p>
                    <p className="text-xs text-slate-400">Only .csv files are supported</p>
                  </div>
                )}
              </div>
            </div>

            {/* Column mapping */}
            <div>
              <h3 className="label mb-3">Column Mapping</h3>
              <p className="text-xs text-slate-500 mb-3">
                Enter the exact column header names from your CSV file that correspond to each field.
              </p>
              <div className="space-y-3">
                {REQUIRED_FIELDS.map(({ key, label, placeholder }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="text-sm text-slate-600 w-40 flex-shrink-0">{label}</label>
                    <input
                      type="text"
                      value={mapping[key]}
                      onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                      className="input flex-1"
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700 font-medium mb-1">CSV format tips:</p>
              <ul className="text-xs text-blue-600 space-y-0.5 list-disc list-inside">
                <li>Date should be in YYYY-MM-DD or MM/DD/YYYY format</li>
                <li>Type should be "income" or "expense"</li>
                <li>Category should match an existing category name</li>
                <li>Amount should be a positive number</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={handleClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={loading || !file} className="btn-primary flex-1">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Importing…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Upload size={16} />
                    Import
                  </span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
