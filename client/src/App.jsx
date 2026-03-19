import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Interview from './pages/Interview'
import Dashboard from './pages/Dashboard'
import Auth from './pages/Auth'
import { supabase } from './lib/supabase'

function ProtectedRoute({ session, children }) {
	if (!session) {
		return <Navigate to="/auth" replace />
	}

	return children
}

export default function App() {
	const [session, setSession] = useState(null)
	const [isAuthLoading, setIsAuthLoading] = useState(true)

	useEffect(() => {
		let isMounted = true

		supabase.auth.getSession().then(({ data }) => {
			if (!isMounted) {
				return
			}

			setSession(data.session || null)
			setIsAuthLoading(false)
		})

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, nextSession) => {
			setSession(nextSession || null)
		})

		return () => {
			isMounted = false
			subscription.unsubscribe()
		}
	}, [])

	if (isAuthLoading) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
				<p className="text-sm text-slate-600">Loading...</p>
			</main>
		)
	}

	return (
		<BrowserRouter>
			<Routes>
				<Route path="/auth" element={session ? <Navigate to="/" replace /> : <Auth />} />
				<Route
					path="/"
					element={
						<ProtectedRoute session={session}>
							<Home user={session?.user || null} />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/interview"
					element={
						<ProtectedRoute session={session}>
							<Interview user={session?.user || null} />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard"
					element={
						<ProtectedRoute session={session}>
							<Dashboard user={session?.user || null} />
						</ProtectedRoute>
					}
				/>
				<Route path="*" element={<Navigate to={session ? '/' : '/auth'} replace />} />
			</Routes>
		</BrowserRouter>
	)
}

