import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  getDashboardSummary,
  getExpensesByCategory,
  getMonthlyTrend,
  getTopCategories,
} from '../services/api'
import ExpensesPieChart from '../components/charts/ExpensesPieChart'
import MonthlyTrendChart from '../components/charts/MonthlyTrendChart'

const fmt = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0)

function StatCard({ title, value, icon: Icon, color, sub, trend }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      {trend != null && (
        <div className={`flex items-center gap-0.5 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(trend).toFixed(0)}%
        </div>
      )}
    </div>
  )
}

function LoadingCard() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-200" />
        <div className="flex-1">
          <div className="h-3 bg-slate-200 rounded w-24 mb-2" />
          <div className="h-7 bg-slate-200 rounded w-32" />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
  })

  const { data: expensesByCategory, isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses-by-category'],
    queryFn: getExpensesByCategory,
  })

  const { data: monthlyTrend, isLoading: loadingTrend } = useQuery({
    queryKey: ['monthly-trend'],
    queryFn: () => getMonthlyTrend(6),
  })

  const { data: topCategories, isLoading: loadingTop } = useQuery({
    queryKey: ['top-categories'],
    queryFn: getTopCategories,
  })

  const balance = summary
    ? summary.total_income - summary.total_expense
    : 0

  const maxTopAmount = topCategories?.length
    ? Math.max(...topCategories.map((c) => c.total_amount))
    : 1

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Your financial overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loadingSummary ? (
          <>
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
          </>
        ) : (
          <>
            <StatCard
              title="Total Balance"
              value={fmt(balance)}
              icon={Wallet}
              color={balance >= 0 ? 'bg-indigo-500' : 'bg-red-500'}
              sub="All time income − expense"
            />
            <StatCard
              title="Monthly Income"
              value={fmt(summary?.current_month_income)}
              icon={TrendingUp}
              color="bg-green-500"
              sub="Current month"
            />
            <StatCard
              title="Monthly Expense"
              value={fmt(summary?.current_month_expense)}
              icon={TrendingDown}
              color="bg-red-500"
              sub="Current month"
            />
            <StatCard
              title="Total Transactions"
              value={summary?.transaction_count?.toLocaleString() || '0'}
              icon={Activity}
              color="bg-purple-500"
              sub="All time"
            />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="card">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Expenses by Category</h2>
          {loadingExpenses ? (
            <div className="h-48 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="max-w-xs mx-auto">
              <ExpensesPieChart data={expensesByCategory} />
            </div>
          )}
        </div>

        {/* Line chart */}
        <div className="card">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Monthly Trend</h2>
          {loadingTrend ? (
            <div className="h-48 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <MonthlyTrendChart data={monthlyTrend} />
          )}
        </div>
      </div>

      {/* Top categories */}
      <div className="card">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Top Spending Categories</h2>
        {loadingTop ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-200" />
                  <div className="h-3 bg-slate-200 rounded w-24" />
                  <div className="ml-auto h-3 bg-slate-200 rounded w-16" />
                </div>
                <div className="h-2 bg-slate-200 rounded-full w-full" />
              </div>
            ))}
          </div>
        ) : !topCategories?.length ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <span className="text-4xl mb-2">📊</span>
            <p className="text-sm">No category data yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topCategories.slice(0, 5).map((cat, idx) => {
              const pct = maxTopAmount > 0 ? (cat.total_amount / maxTopAmount) * 100 : 0
              return (
                <div key={cat.category_id || idx}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                        style={{ backgroundColor: (cat.category_color || '#6366f1') + '20' }}
                      >
                        <span>{cat.category_icon || '💰'}</span>
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {cat.category_name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-slate-800">{fmt(cat.total_amount)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: cat.category_color || '#6366f1',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
