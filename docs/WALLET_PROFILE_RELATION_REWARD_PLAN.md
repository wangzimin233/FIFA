# 个人中心邀请关系与奖励接入方案

## Swagger 截图

- Swagger 入口总览截图：`docs/swagger-wallet/swagger-current.png`
- Swagger 地址：`http://192.168.0.12:8080/api/swagger-ui/index.html#/`
- OpenAPI JSON：`http://192.168.0.12:8080/api/v3/api-docs`

本方案已核对 Swagger 页面和 OpenAPI JSON，目标接口为：

- `GET /api/wallet/user/relation-stats`
- `GET /api/wallet/user/direct-page`
- `GET /api/wallet/reward/page`

## 接口使用方式

### 1. 关系统计

`GET /api/wallet/user/relation-stats`

用途：按用户 ID 查询直推人数和伞下总人数。

请求参数：

| 参数 | 位置 | 必填 | 类型 | 示例 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `userId` | query | 是 | `integer int64` | `7` | `xsyc_user.id` |

返回数据：

```ts
type WalletUserRelationStatsResponse = {
  userId: number
  directCount: number
  umbrellaCount: number
}
```

页面用途：

- `directCount` 显示为“直推人数”
- `umbrellaCount` 显示为“团队人数”或“伞下总人数”
- `userId` 用于校验当前查询对象，页面无需重点展示

### 2. 直推列表

`GET /api/wallet/user/direct-page`

用途：按用户 ID 分页查询直推用户列表，支持按直推钱包地址模糊搜索。

请求参数：

| 参数 | 位置 | 必填 | 类型 | 默认值 | 示例 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `userId` | query | 是 | `integer int64` | - | `7` | `xsyc_user.id` |
| `page` | query | 否 | `integer int32` | `1` | `1` | 页码 |
| `pageSize` | query | 否 | `integer int32` | `10` | `10` | 每页条数 |
| `username` | query | 否 | `string` | - | `0x2934` | 直推钱包地址，可模糊搜索 |

返回列表项：

```ts
type WalletUserDirectPageItem = {
  userId: number
  walletAddress: string
  authType: 'BSC' | 'TRX'
  nickname?: string
  inviteCode?: string
  userType: 1 | 2
  status: 1 | 2
  createTime?: string
}
```

字段显示建议：

- 主信息：钱包地址，昵称
- 辅助信息：用户 ID、邀请码、注册时间
- 标签：`authType`、`userType`、`status`
- `userType`: `1=普通用户`，`2=节点用户`
- `status`: `1=正常`，`2=禁用`

### 3. 奖励记录

`GET /api/wallet/reward/page`

用途：获取当前用户奖励记录。

请求参数：

| 参数 | 位置 | 必填 | 类型 | 默认值 | 示例 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `page` | query | 否 | `integer int32` | `1` | `1` | 页码 |
| `pageSize` | query | 否 | `integer int32` | `10` | `10` | 每页条数 |
| `bizTypes` | query | 否 | `integer[]` | - | `11,12` | 业务类型，`11=直推奖励`，`12=节点奖励` |

返回列表项：

```ts
type WalletRewardPageItem = {
  id: number
  detailNo: string
  bizType: 11 | 12
  bizTypeName: string
  coinId: number
  coinCode: string
  changeAmount: string
  remark?: string
  createTime?: string
}
```

字段显示建议：

- 主信息：`changeAmount + coinCode`
- 类型：优先显示 `bizTypeName`，缺失时按 `bizType` 映射
- 辅助信息：明细单号、备注、创建时间
- 筛选：全部、直推奖励、节点奖励

## 个人中心显示方案

当前个人中心结构在 `src/pages/profile-page.tsx`：

- 顶部状态条：钱包状态、网络、充值状态、提现状态
- 左侧资产主卡：余额、充值、提现、充值记录、提现记录、订单记录
- 右侧身份卡：钱包地址、用户 ID、邀请码、认证类型、邀请链接

建议在 `walletUser` 加载成功后新增一个独立的“邀请与奖励”区域，放在资产/身份双栏下面，避免挤压当前核心资产信息。

### 桌面端布局

新增一行两栏：

- 左栏“邀请关系”
  - 顶部两个统计单元：直推人数、伞下总人数
  - 下方展示最近 5 个直推用户
  - 右上角按钮：查看全部
  - 搜索入口放在“查看全部”弹窗中，不放首页，保持个人中心干净

- 右栏“奖励记录”
  - 顶部展示最近奖励合计（前端可从当前页累加，仅标注为“当前页”）
  - 下方展示最近 5 条奖励
  - 右上角筛选：全部、直推奖励、节点奖励
  - 按钮：查看全部

### 移动端布局

单列顺序：

1. 资产主卡
2. 身份卡
3. 邀请关系
4. 奖励记录

列表项使用紧凑行展示，钱包地址使用 `shortenAddress`，金额右对齐。

## 接入方案

### 1. 新增 API 文件

建议新增：`src/features/wallet/profile/api.ts`

```ts
import { apiClient } from '../../../lib/api-client'

const WALLET_PROFILE_TIMEOUT = 15_000

type ApiResult<T> = {
  code: number
  message: string
  data: T | null
}

type PageResult<T> = {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export type WalletUserRelationStatsResponse = {
  userId: number
  directCount: number
  umbrellaCount: number
}

export type WalletUserDirectPageItem = {
  userId: number
  walletAddress: string
  authType: 'BSC' | 'TRX'
  nickname?: string
  inviteCode?: string
  userType: 1 | 2
  status: 1 | 2
  createTime?: string
}

export type WalletRewardBizType = 11 | 12

export type WalletRewardPageItem = {
  id: number
  detailNo: string
  bizType: WalletRewardBizType
  bizTypeName: string
  coinId: number
  coinCode: string
  changeAmount: string
  remark?: string
  createTime?: string
}

export type WalletProfilePage<T> = PageResult<T> & {
  hasNext: boolean
}

function buildPage<T>(data: PageResult<T> | null, fallback: { page: number; pageSize: number }): WalletProfilePage<T> {
  const list = data?.list ?? []
  const page = Number(data?.page ?? fallback.page)
  const pageSize = Number(data?.pageSize ?? fallback.pageSize)
  const total = Number(data?.total ?? list.length)

  return {
    list,
    total,
    page,
    pageSize,
    hasNext: page * pageSize < total,
  }
}

export async function getWalletUserRelationStats(userId: number) {
  const response = await apiClient.get<ApiResult<WalletUserRelationStatsResponse>>('/api/wallet/user/relation-stats', {
    params: { userId },
    timeout: WALLET_PROFILE_TIMEOUT,
  })

  return response.data
}

export async function getWalletUserDirectPage(query: {
  userId: number
  page: number
  pageSize: number
  username?: string
}) {
  const response = await apiClient.get<ApiResult<PageResult<WalletUserDirectPageItem>>>('/api/wallet/user/direct-page', {
    params: query,
    timeout: WALLET_PROFILE_TIMEOUT,
  })

  return buildPage(response.data.data, query)
}

export async function getWalletRewardPage(query: {
  page: number
  pageSize: number
  bizTypes?: WalletRewardBizType[]
}) {
  const response = await apiClient.get<ApiResult<PageResult<WalletRewardPageItem>>>('/api/wallet/reward/page', {
    params: query,
    paramsSerializer: {
      serialize: (params) => {
        const search = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            if (value.length > 0) {
              search.set(key, value.join(','))
            }
            return
          }

          if (value !== undefined && value !== null && value !== '') {
            search.set(key, String(value))
          }
        })
        return search.toString()
      },
    },
    timeout: WALLET_PROFILE_TIMEOUT,
  })

  return buildPage(response.data.data, query)
}
```

### 2. React Query 接入点

在 `ProfilePage` 中，`walletUser` 取到后再拉关系统计：

```ts
const relationStatsQuery = useQuery({
  queryKey: ['wallet-user-relation-stats', walletUser?.userId ?? null, session?.token ?? null],
  queryFn: () => getWalletUserRelationStats(walletUser!.userId),
  enabled: isSessionForConnectedWallet && Boolean(walletUser?.userId),
})
```

首页预览直推用户：

```ts
const directPreviewQuery = useQuery({
  queryKey: ['wallet-user-direct-preview', walletUser?.userId ?? null, session?.token ?? null],
  queryFn: () => getWalletUserDirectPage({
    userId: walletUser!.userId,
    page: 1,
    pageSize: 5,
  }),
  enabled: isSessionForConnectedWallet && Boolean(walletUser?.userId),
})
```

首页预览奖励记录：

```ts
const rewardPreviewQuery = useQuery({
  queryKey: ['wallet-reward-preview', session?.token ?? null],
  queryFn: () => getWalletRewardPage({
    page: 1,
    pageSize: 5,
  }),
  enabled: isSessionForConnectedWallet,
})
```

查看全部弹窗使用 `useInfiniteQuery`，分页方式可以复用现有 `WalletHistoryDialog` 的滚动加载模式。

### 3. UI 组件拆分

建议拆为这些小组件，避免继续膨胀 `ProfilePage`：

- `RelationRewardOverview`
- `RelationStatsPanel`
- `DirectUsersDialog`
- `DirectUserRow`
- `RewardRecordsPanel`
- `RewardRecordsDialog`
- `RewardRecordRow`

如果先快速落地，也可以先放在 `profile-page.tsx` 内，后续再拆。

## 状态与交互

- 未连接钱包：沿用现有空态，不请求新接口
- 已连接未登录：沿用现有签名登录提示，不请求新接口
- 已登录但 `walletUser.userId` 缺失：不请求关系统计和直推列表，展示 `--`
- 关系统计失败：统计卡显示 `--`，下方展示一行错误提示，不阻塞资产和身份信息
- 直推列表为空：显示“暂无直推用户”
- 奖励记录为空：显示“暂无奖励记录”
- 奖励筛选变化：重置页码，重新请求第一页
- 直推搜索：建议 300ms debounce，避免每个字符都请求

## 接口鉴权

现有 `src/lib/api-client.ts` 会自动从钱包登录 session 中附加 `Authorization`。三个目标接口都不在登录/注册白名单内，因此不需要手动传 token。

## 推荐实现顺序

1. 新增 `src/features/wallet/profile/api.ts`
2. 在个人中心接入三个预览 Query
3. 在资产/身份区域下新增“邀请与奖励”双栏展示
4. 新增两个“查看全部”弹窗，复用现有滚动分页交互
5. 对直推搜索和奖励类型筛选做加载、空态、错误态
6. 跑 `pnpm typecheck` 和 `pnpm build`

