export type HomeTab = 'matches' | 'markets'

export type WinnerOutcome = {
  id: string
  shortLabel: string
  subject: string
  badge: string
  badgeLogo?: string
  yesPrice: number
  noPrice: number
  yesAssetId?: string
  noAssetId?: string
  tone?: 'emerald' | 'rose' | 'blue' | 'slate'
}

export type SpreadVariant = {
  id: string
  displayLine: string
  homeHandicap: string
  awayHandicap: string
  homePrice: number
  awayPrice: number
  homeAssetId?: string
  awayAssetId?: string
  favoredSide?: 'home' | 'away'
}

export type TotalLine = {
  id: string
  line: string
  overPrice: number
  underPrice: number
  overAssetId?: string
  underAssetId?: string
}

export type MatchCard = {
  id: string
  slug?: string
  date: string
  timeLabel: string
  volumeLabel: string
  matchup: string
  primaryTeam: string
  secondaryTeam: string
  primaryFlag: string
  secondaryFlag: string
  primaryLogo?: string
  secondaryLogo?: string
  primaryRecord: string
  secondaryRecord: string
  score: string
  badgeCount: number
  winnerMarket: {
    outcomes: WinnerOutcome[]
  }
  spreadMarket: {
    defaultVariantId: string
    variants: SpreadVariant[]
  }
  totalMarket: {
    defaultLineId: string
    lines: TotalLine[]
  }
}

export type MarketListCandidate = {
  id?: string
  name: string
  probability: number
  yesPrice: number
  noPrice: number
  yesAssetId?: string
  noAssetId?: string
}

export type MarketCard =
  | {
      id: string
      kind: 'list'
      title: string
      icon: string
      iconLogo?: string
      volumeLabel: string
      candidates: MarketListCandidate[]
      detailCount?: number
    }
  | {
      id: string
      kind: 'binary'
      title: string
      icon: string
      iconLogo?: string
      subject: string
      probability: number
      yesPrice: number
      noPrice: number
      yesAssetId?: string
      noAssetId?: string
      volumeLabel: string
    }

export const homeBanner = {
  title: '世界杯 2026',
  description: '世界杯实时预测和赔率。',
}

export const homeTabs: Array<{ key: HomeTab; label: string }> = [
  { key: 'matches', label: '比赛' },
  { key: 'markets', label: '玩法' },
]

export const matchGroups: Array<{ date: string; matches: MatchCard[] }> = [
  {
    date: 'Thu, June 11',
    matches: [
      {
        id: 'mex-rsa',
        slug: 'fifwc-mex-rsa-2026-06-11',
        date: 'Thu, June 11',
        timeLabel: '上午 3:00',
        volumeLabel: '$52.57K 交易量',
        matchup: 'Mexico vs South Africa',
        primaryTeam: 'Mexico',
        secondaryTeam: 'South Africa',
        primaryFlag: '🇲🇽',
        secondaryFlag: '🇿🇦',
        primaryRecord: '0-0',
        secondaryRecord: '0-0',
        score: '0-0',
        badgeCount: 34,
        winnerMarket: {
          outcomes: [
            {
              id: 'mex-rsa-winner-mex',
              shortLabel: 'MEX',
              subject: 'Mexico',
              badge: '🇲🇽',
              yesPrice: 67,
              noPrice: 34,
              tone: 'emerald',
            },
            {
              id: 'mex-rsa-winner-draw',
              shortLabel: 'DRAW',
              subject: 'Draw',
              badge: '◌',
              yesPrice: 22,
              noPrice: 80,
              tone: 'slate',
            },
            {
              id: 'mex-rsa-winner-rsa',
              shortLabel: 'RSA',
              subject: 'South Africa',
              badge: '🇿🇦',
              yesPrice: 13,
              noPrice: 88,
              tone: 'emerald',
            },
          ],
        },
        spreadMarket: {
          defaultVariantId: 'mex-rsa-spread-mex-1-5',
          variants: [
            {
              id: 'mex-rsa-spread-mex-1-5',
              displayLine: '1.5',
              homeHandicap: '-1.5',
              awayHandicap: '+1.5',
              homePrice: 39,
              awayPrice: 62,
            },
            {
              id: 'mex-rsa-spread-rsa-1-5',
              displayLine: '1.5',
              homeHandicap: '+1.5',
              awayHandicap: '-1.5',
              homePrice: 97.7,
              awayPrice: 16.8,
            },
            {
              id: 'mex-rsa-spread-mex-2-5',
              displayLine: '2.5',
              homeHandicap: '-2.5',
              awayHandicap: '+2.5',
              homePrice: 21,
              awayPrice: 8.6,
            },
            {
              id: 'mex-rsa-spread-rsa-2-5',
              displayLine: '2.5',
              homeHandicap: '+2.5',
              awayHandicap: '-2.5',
              homePrice: 86,
              awayPrice: 27,
            },
          ],
        },
        totalMarket: {
          defaultLineId: 'mex-rsa-total-2-5',
          lines: [
            { id: 'mex-rsa-total-0-5', line: '0.5', overPrice: 82, underPrice: 20 },
            { id: 'mex-rsa-total-1-5', line: '1.5', overPrice: 65, underPrice: 37 },
            { id: 'mex-rsa-total-2-5', line: '2.5', overPrice: 46, underPrice: 55 },
            { id: 'mex-rsa-total-3-5', line: '3.5', overPrice: 27, underPrice: 75 },
            { id: 'mex-rsa-total-4-5', line: '4.5', overPrice: 16, underPrice: 86 },
            { id: 'mex-rsa-total-5-5', line: '5.5', overPrice: 9, underPrice: 93 },
          ],
        },
      },
      {
        id: 'kor-cze',
        slug: 'fifwc-kr-cze-2026-06-11',
        date: 'Thu, June 11',
        timeLabel: '上午 10:00',
        volumeLabel: '$16.59K 交易量',
        matchup: 'Korea Republic vs Czechia',
        primaryTeam: 'Korea Republic',
        secondaryTeam: 'Czechia',
        primaryFlag: '🇰🇷',
        secondaryFlag: '🇨🇿',
        primaryRecord: '0-0',
        secondaryRecord: '0-0',
        score: '0-0',
        badgeCount: 34,
        winnerMarket: {
          outcomes: [
            {
              id: 'kor-cze-winner-kor',
              shortLabel: 'KR',
              subject: 'Korea Republic',
              badge: '🇰🇷',
              yesPrice: 36,
              noPrice: 65,
              tone: 'rose',
            },
            {
              id: 'kor-cze-winner-draw',
              shortLabel: 'DRAW',
              subject: 'Draw',
              badge: '◌',
              yesPrice: 31,
              noPrice: 70,
              tone: 'slate',
            },
            {
              id: 'kor-cze-winner-cze',
              shortLabel: 'CZE',
              subject: 'Czechia',
              badge: '🇨🇿',
              yesPrice: 35,
              noPrice: 66,
              tone: 'rose',
            },
          ],
        },
        spreadMarket: {
          defaultVariantId: 'kor-cze-spread-kor-1-5',
          variants: [
            {
              id: 'kor-cze-spread-kor-1-5',
              displayLine: '1.5',
              homeHandicap: '-1.5',
              awayHandicap: '+1.5',
              homePrice: 15,
              awayPrice: 89,
            },
            {
              id: 'kor-cze-spread-cze-1-5',
              displayLine: '1.5',
              homeHandicap: '+1.5',
              awayHandicap: '-1.5',
              homePrice: 84,
              awayPrice: 18,
            },
          ],
        },
        totalMarket: {
          defaultLineId: 'kor-cze-total-2-5',
          lines: [{ id: 'kor-cze-total-2-5', line: '2.5', overPrice: 42, underPrice: 59 }],
        },
      },
    ],
  },
  {
    date: 'Fri, June 12',
    matches: [
      {
        id: 'can-bih',
        slug: 'fifwc-can-bih-2026-06-12',
        date: 'Fri, June 12',
        timeLabel: '上午 3:00',
        volumeLabel: '$10.83K 交易量',
        matchup: 'Canada vs Bosnia-Herzegovina',
        primaryTeam: 'Canada',
        secondaryTeam: 'Bosnia-Herzegovina',
        primaryFlag: '🇨🇦',
        secondaryFlag: '🇧🇦',
        primaryRecord: '0-0',
        secondaryRecord: '0-0',
        score: '0-0',
        badgeCount: 34,
        winnerMarket: {
          outcomes: [
            {
              id: 'can-bih-winner-can',
              shortLabel: 'CAN',
              subject: 'Canada',
              badge: '🇨🇦',
              yesPrice: 53,
              noPrice: 48,
              tone: 'rose',
            },
            {
              id: 'can-bih-winner-draw',
              shortLabel: 'DRAW',
              subject: 'Draw',
              badge: '◌',
              yesPrice: 26,
              noPrice: 75,
              tone: 'slate',
            },
            {
              id: 'can-bih-winner-bih',
              shortLabel: 'BIH',
              subject: 'Bosnia-Herzegovina',
              badge: '🇧🇦',
              yesPrice: 22,
              noPrice: 79,
              tone: 'blue',
            },
          ],
        },
        spreadMarket: {
          defaultVariantId: 'can-bih-spread-can-1-5',
          variants: [
            {
              id: 'can-bih-spread-can-1-5',
              displayLine: '1.5',
              homeHandicap: '-1.5',
              awayHandicap: '+1.5',
              homePrice: 28,
              awayPrice: 74,
            },
          ],
        },
        totalMarket: {
          defaultLineId: 'can-bih-total-2-5',
          lines: [{ id: 'can-bih-total-2-5', line: '2.5', overPrice: 43, underPrice: 58 }],
        },
      },
      {
        id: 'usa-par',
        slug: 'fifwc-usa-par-2026-06-12',
        date: 'Fri, June 12',
        timeLabel: '上午 9:00',
        volumeLabel: '$31.42K 交易量',
        matchup: 'United States vs Paraguay',
        primaryTeam: 'United States',
        secondaryTeam: 'Paraguay',
        primaryFlag: '🇺🇸',
        secondaryFlag: '🇵🇾',
        primaryRecord: '0-0',
        secondaryRecord: '0-0',
        score: '0-0',
        badgeCount: 34,
        winnerMarket: {
          outcomes: [
            {
              id: 'usa-par-winner-usa',
              shortLabel: 'USA',
              subject: 'United States',
              badge: '🇺🇸',
              yesPrice: 48,
              noPrice: 53,
              tone: 'rose',
            },
            {
              id: 'usa-par-winner-draw',
              shortLabel: 'DRAW',
              subject: 'Draw',
              badge: '◌',
              yesPrice: 29,
              noPrice: 72,
              tone: 'slate',
            },
            {
              id: 'usa-par-winner-par',
              shortLabel: 'PAR',
              subject: 'Paraguay',
              badge: '🇵🇾',
              yesPrice: 25,
              noPrice: 76,
              tone: 'rose',
            },
          ],
        },
        spreadMarket: {
          defaultVariantId: 'usa-par-spread-usa-1-5',
          variants: [
            {
              id: 'usa-par-spread-usa-1-5',
              displayLine: '1.5',
              homeHandicap: '-1.5',
              awayHandicap: '+1.5',
              homePrice: 24,
              awayPrice: 79,
            },
          ],
        },
        totalMarket: {
          defaultLineId: 'usa-par-total-2-5',
          lines: [{ id: 'usa-par-total-2-5', line: '2.5', overPrice: 42, underPrice: 61 }],
        },
      },
    ],
  },
]

export const marketCards: MarketCard[] = [
  {
    id: 'world-cup-winner',
    kind: 'list',
    title: '世界杯冠军',
    icon: '🏆',
    volumeLabel: '$1B 交易量',
    candidates: [
      { name: '西班牙', probability: 17, yesPrice: 17, noPrice: 83 },
      { name: '法国', probability: 16, yesPrice: 16, noPrice: 84 },
      { name: '英格兰', probability: 14, yesPrice: 14, noPrice: 86 },
    ],
    detailCount: 24,
  },
  {
    id: 'group-a-winner',
    kind: 'list',
    title: '世界杯A组冠军',
    icon: '⚽',
    volumeLabel: '$336K 交易量',
    candidates: [
      { name: '墨西哥', probability: 52, yesPrice: 52, noPrice: 48 },
      { name: '捷克', probability: 22, yesPrice: 22, noPrice: 78 },
      { name: '南非', probability: 18, yesPrice: 18, noPrice: 82 },
    ],
    detailCount: 6,
  },
  {
    id: 'group-c-winner',
    kind: 'list',
    title: '世界杯C组冠军',
    icon: '⚽',
    volumeLabel: '$293K 交易量',
    candidates: [
      { name: '巴西', probability: 73, yesPrice: 73, noPrice: 27 },
      { name: '摩洛哥', probability: 19, yesPrice: 19, noPrice: 81 },
      { name: '瑞士', probability: 8, yesPrice: 8, noPrice: 92 },
    ],
    detailCount: 6,
  },
  {
    id: 'messi-world-cup',
    kind: 'binary',
    title: '莱昂内尔·梅西会参加世界杯吗？',
    icon: '🧑🏻',
    subject: '梅西',
    probability: 98,
    yesPrice: 98,
    noPrice: 4,
    volumeLabel: '$179K 交易量',
  },
  {
    id: 'group-j-winner',
    kind: 'list',
    title: '世界杯J组冠军',
    icon: '⚽',
    volumeLabel: '$150K 交易量',
    candidates: [
      { name: '阿根廷', probability: 74, yesPrice: 74, noPrice: 26 },
      { name: '奥地利', probability: 19, yesPrice: 19, noPrice: 81 },
      { name: '荷兰', probability: 7, yesPrice: 7, noPrice: 93 },
    ],
    detailCount: 5,
  },
  {
    id: 'group-b-winner',
    kind: 'list',
    title: '世界杯B组冠军',
    icon: '⚽',
    volumeLabel: '$128K 交易量',
    candidates: [
      { name: '瑞士', probability: 55, yesPrice: 55, noPrice: 45 },
      { name: '加拿大', probability: 29, yesPrice: 29, noPrice: 71 },
      { name: '智利', probability: 10, yesPrice: 10, noPrice: 90 },
    ],
    detailCount: 7,
  },
  {
    id: 'group-g-winner',
    kind: 'list',
    title: '世界杯G组冠军',
    icon: '⚽',
    volumeLabel: '$84K 交易量',
    candidates: [
      { name: '比利时', probability: 68, yesPrice: 68, noPrice: 32 },
      { name: '埃及', probability: 19, yesPrice: 19, noPrice: 81 },
      { name: '日本', probability: 9, yesPrice: 9, noPrice: 91 },
    ],
    detailCount: 4,
  },
]
