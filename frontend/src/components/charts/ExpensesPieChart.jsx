import React from 'react'
import { Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const DEFAULT_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6',
]

export default function ExpensesPieChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400">
        <span className="text-3xl mb-2">🥧</span>
        <p className="text-sm">No expense data yet</p>
      </div>
    )
  }

  const chartData = {
    labels: data.map((d) => d.category_name),
    datasets: [
      {
        data: data.map((d) => d.total_amount),
        backgroundColor: data.map((d, i) => d.category_color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]),
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { size: 12 },
          color: '#475569',
          boxWidth: 8,
          boxHeight: 8,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0)
            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0
            const formatted = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 2,
            }).format(ctx.parsed)
            return ` ${ctx.label}: ${formatted} (${pct}%)`
          },
        },
      },
    },
  }

  return <Doughnut data={chartData} options={options} />
}
