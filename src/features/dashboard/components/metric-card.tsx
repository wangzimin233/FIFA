import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@heroui/react'
import type { ReactNode } from 'react'

interface MetricCardProps {
  description: string
  icon: ReactNode
  title: string
  value: string
}

export function MetricCard({ description, icon, title, value }: MetricCardProps) {
  return (
    <Card className="border border-white/8 bg-white/4 backdrop-blur-sm">
      <CardHeader className="flex items-center justify-between gap-4">
        <div>
          <CardDescription className="text-xs uppercase tracking-[0.24em] text-ink-soft">
            {description}
          </CardDescription>
          <CardTitle className="mt-2 text-sm font-medium text-ink">{title}</CardTitle>
        </div>
        <div className="rounded-full border border-brand/25 bg-brand/10 p-2 text-brand">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight text-ink">{value}</p>
      </CardContent>
    </Card>
  )
}
