import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@heroui/react'
import { motion } from 'motion/react'

const playgroundItems = [
  {
    key: 'router',
    text: 'React Router 已就绪，适合继续拆分嵌套路由和功能页面。',
  },
  {
    key: 'query',
    text: 'TanStack Query 与 Axios 已配置好，可直接接后端接口。',
  },
  {
    key: 'wallet',
    text: 'Reown AppKit、Wagmi、Viem 和 Ethers 已安装完毕，可继续接钱包与合约。',
  },
  {
    key: 'i18n',
    text: 'i18next 已通过 HTTP backend 加载语言包，并支持浏览器语言识别。',
  },
  {
    key: 'state',
    text: 'Zustand 已可用于管理 UI 级本地状态。',
  },
  {
    key: 'motion',
    text: 'Motion 已可用于页面转场与界面动画。',
  },
] as const

export function PlaygroundPage() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className="grid gap-6"
    >
      <Card className="border border-white/8 bg-panel">
        <CardHeader>
          <CardTitle className="text-3xl text-ink">集成实验区</CardTitle>
          <CardDescription className="mt-3 max-w-2xl text-base leading-7 text-ink-soft">
            后续功能模块、合约交互流程和系统设置都可以先落在这里。
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {playgroundItems.map((item) => (
          <Card key={item.key} className="border border-white/8 bg-white/4">
            <CardHeader>
              <CardTitle className="font-mono text-xs uppercase tracking-[0.26em] text-brand">
                {item.key}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-ink-soft">{item.text}</CardContent>
          </Card>
        ))}
      </div>
    </motion.section>
  )
}
