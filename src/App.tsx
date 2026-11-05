import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MarketingSite from './MarketingSite'

// the admin area is code-split so none of it ships with the marketing site
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const SetPassword = lazy(() => import('./pages/SetPassword'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MarketingSite />} />
        <Route
          path="/login"
          element={
            <Suspense fallback={null}>
              <Login />
            </Suspense>
          }
        />
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={null}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route path="/set-password" element={<Suspense fallback={null}><SetPassword /></Suspense>} />
        <Route path="*" element={<MarketingSite />} />
      </Routes>
    </BrowserRouter>
  )
}
