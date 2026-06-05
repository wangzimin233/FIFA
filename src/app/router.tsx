import { Navigate, createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '../layouts/root-layout'
import { DashboardPage } from '../pages/dashboard-page'
import { MarketDetailPage } from '../pages/market-detail-page'
import { MatchDetailPage } from '../pages/match-detail-page'
import { ProfilePage } from '../pages/profile-page'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/matches" replace />,
      },
      {
        path: 'matches',
        element: <DashboardPage tab="matches" />,
      },
      {
        path: 'markets',
        element: <DashboardPage tab="markets" />,
      },
      {
        path: 'playground',
        element: <Navigate to="/matches" replace />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'matches/:slug',
        element: <MatchDetailPage />,
      },
      {
        path: 'markets/:marketId',
        element: <MarketDetailPage />,
      },
    ],
  },
])
