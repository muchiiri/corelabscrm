import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { computeCompletionTrend, parseDateKey } from '@/lib/computeCompletionTrend'
import { cn } from '@/lib/utils'

const RANGE_OPTIONS = [
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

const VIEW_WIDTH = 720
const VIEW_HEIGHT = 200
const BASELINE_Y = 180
const TOP_Y = 10
const LABEL_COUNT = 5

function pickLabelIndices(n) {
  if (n <= LABEL_COUNT) {
    return Array.from({ length: n }, (_, i) => i)
  }
  const step = (n - 1) / (LABEL_COUNT - 1)
  const indices = new Set()
  for (let i = 0; i < LABEL_COUNT; i++) {
    indices.add(Math.round(i * step))
  }
  return [...indices]
}

function CompletionTrendChart({ tasks }) {
  const [days, setDays] = useState(14)
  const trend = computeCompletionTrend(tasks, days)
  const maxCount = Math.max(1, ...trend.map((point) => point.count))
  const n = trend.length

  const coordinates = trend.map((point, index) => ({
    x: n <= 1 ? VIEW_WIDTH / 2 : (index / (n - 1)) * VIEW_WIDTH,
    y: BASELINE_Y - (point.count / maxCount) * (BASELINE_Y - TOP_Y),
  }))

  const linePoints = coordinates.map(({ x, y }) => `${x},${y}`).join(' ')
  const areaPoints =
    coordinates.length > 0
      ? `${coordinates[0].x},${BASELINE_Y} ${linePoints} ${coordinates[coordinates.length - 1].x},${BASELINE_Y}`
      : ''

  const labelIndices = pickLabelIndices(n)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-normal text-muted">Completion trend</CardTitle>
          <p className="mt-1 text-xs text-faint">Tasks completed per day</p>
        </div>
        <div className="flex gap-0.5 rounded-sm border border-border bg-surface-hover p-0.5">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.days}
              type="button"
              onClick={() => setDays(option.days)}
              className={cn(
                'rounded-sm px-2.5 py-1 text-xs font-medium transition',
                days === option.days ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} preserveAspectRatio="none" className="h-40 w-full">
          {areaPoints && <polygon points={areaPoints} fill="var(--color-secondary)" fillOpacity="0.08" />}
          {linePoints && (
            <polyline
              points={linePoints}
              fill="none"
              stroke="var(--color-secondary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
        <div className="mt-2 flex justify-between text-xs text-muted">
          {labelIndices.map((index) => (
            <span key={index}>
              {parseDateKey(trend[index].date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default CompletionTrendChart
