import type { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'
import type { ChartRange } from '../../../store/ui-store'
import type { DashboardOverview } from '../../../types/dashboard'

const pointsByRange: Record<ChartRange, number> = {
  '24h': 4,
  '7d': 7,
  '30d': 7,
}

interface OverviewChartProps {
  data: DashboardOverview
  range: ChartRange
}

export function OverviewChart({ data, range }: OverviewChartProps) {
  const points = data.trends.slice(-pointsByRange[range])

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    grid: {
      top: 16,
      right: 16,
      bottom: 24,
      left: 8,
      containLabel: true,
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: {
        color: '#8E9488',
      },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1E1E1E',
      borderColor: '#2A2A2A',
      textStyle: {
        color: '#F7FFF1',
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: points.map((point) => point.label),
      axisLine: {
        lineStyle: {
          color: '#2A2A2A',
        },
      },
      axisLabel: {
        color: '#8E9488',
      },
    },
    yAxis: [
      {
        type: 'value',
        axisLabel: {
          color: '#8E9488',
          formatter: (value: number) => `$${(value / 1_000_000).toFixed(1)}M`,
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255,255,255,0.06)',
          },
        },
      },
      {
        type: 'value',
        axisLabel: {
          color: '#8E9488',
          formatter: (value: number) => `${Math.round(value / 1000)}k`,
        },
        splitLine: {
          show: false,
        },
      },
    ],
    series: [
      {
        name: 'Volume',
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        data: points.map((point) => point.volumeUsd),
        lineStyle: {
          color: '#00FF41',
          width: 3,
        },
        symbolSize: 8,
        itemStyle: {
          color: '#00FF41',
        },
        areaStyle: {
          color: 'rgba(0, 255, 65, 0.12)',
        },
      },
      {
        name: 'Wallets',
        type: 'bar',
        yAxisIndex: 1,
        data: points.map((point) => point.wallets),
        barMaxWidth: 22,
        itemStyle: {
          borderRadius: 999,
          color: '#D7EBC5',
        },
      },
    ],
  }

  return <ReactECharts option={option} style={{ height: 320, width: '100%' }} />
}
