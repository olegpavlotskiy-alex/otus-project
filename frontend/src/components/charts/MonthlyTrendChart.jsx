import React from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { format } from 'date-fns'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function MonthlyTrendChart({ data = [], currency = 'USD' }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400">
        <span className="text-3xl mb-2">📈</span>
        <p className="text-sm">No trend data yet</p>
      </div>
    )
  }

  const labels = data.map((d) => `${MONTH_NAMES[d.month - 1]} ${d.year}`)

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Income',
        data: data.map((d) => d.income),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.08)',
        pointBackgroundColor: '#22c55e',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
      },
      {
        label: 'Expense',
        data: data.map((d) => d.expense),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
      },
    ],
  }

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(val)

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          font: { size: 12 },
          color: '#475569',
          boxWidth: 8,
          boxHeight: 8,
          padding: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const formatted = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency,
              minimumFractionDigits: 2,
            }).format(ctx.parsed.y)
            return ` ${ctx.dataset.label}: ${formatted}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#94a3b8',
          font: { size: 11 },
        },
        border: { display: false },
      },
      y: {
        grid: {
          color: 'rgba(148, 163, 184, 0.15)',
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 11 },
          callback: (val) => formatCurrency(val),
        },
        border: { display: false },
      },
    },
  }

  return <Line data={chartData} options={options} />
}
