import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { format } from 'date-fns'
import type { DailyStats, SubjectStats } from '../../types'
import { toHours } from '../../utils/time'

// ─── Stacked Bar Chart ────────────────────────────────────────────────────────

interface StackedBarChartProps {
  data: DailyStats[]
  allSubjects: SubjectStats[]
}

export function StackedBarChart({ data, allSubjects }: StackedBarChartProps) {
  // Build normalized data for recharts: each row is a day, keys are subject names
  const chartData = data.map(day => {
    const row: Record<string, unknown> = {
      date: format(new Date(day.date), 'EEE d'),
    }
    for (const subj of day.subjects) {
      row[subj.subject_name] = parseFloat(toHours(subj.total_seconds).toFixed(2))
    }
    return row
  })

  const subjectKeys = [...new Set(data.flatMap(d => d.subjects.map(s => s.subject_name)))]
  const colorMap: Record<string, string> = {}
  for (const stat of allSubjects) {
    colorMap[stat.subject_name] = stat.subject_color
  }

  if (chartData.length === 0) {
    return <EmptyChart message="No data for this period" />
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit="h" />
        <Tooltip
          formatter={(value: number, name: string) => [`${value}h`, name]}
          contentStyle={{
            backgroundColor: '#1f2937',
            border: 'none',
            borderRadius: '8px',
            color: '#f9fafb',
            fontSize: 12,
          }}
        />
        {subjectKeys.map(key => (
          <Bar key={key} dataKey={key} stackId="a" fill={colorMap[key] ?? '#6366f1'} radius={[2, 2, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Pie Chart ────────────────────────────────────────────────────────────────

interface SubjectPieChartProps {
  data: SubjectStats[]
}

const RADIAN = Math.PI / 180

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
  cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number
}) {
  if (percent < 0.05) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="600">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function SubjectPieChart({ data }: SubjectPieChartProps) {
  if (data.length === 0) return <EmptyChart message="No data for this period" />

  const chartData = data.map(s => ({
    name: s.subject_name,
    value: parseFloat(toHours(s.total_seconds).toFixed(2)),
    color: s.subject_color,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius={90}
          dataKey="value"
          labelLine={false}
          label={renderCustomLabel}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Legend
          formatter={(value: string) => (
            <span style={{ fontSize: 12, color: '#6b7280' }}>{value}</span>
          )}
        />
        <Tooltip
          formatter={(value: number, name: string) => [`${value}h`, name]}
          contentStyle={{
            backgroundColor: '#1f2937',
            border: 'none',
            borderRadius: '8px',
            color: '#f9fafb',
            fontSize: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-60 text-sm text-zinc-400">
      {message}
    </div>
  )
}
