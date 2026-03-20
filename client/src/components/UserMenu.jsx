import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function UserMenu({ user }) {
	const navigate = useNavigate()
	const [isSigningOut, setIsSigningOut] = useState(false)
	const displayName =
		user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
	const email = user?.email || 'No email'
	const initial = displayName.charAt(0).toUpperCase()

	const handleSignOut = async () => {
		try {
			setIsSigningOut(true)
			await supabase.auth.signOut()
			navigate('/auth', { replace: true })
		} finally {
			setIsSigningOut(false)
		}
	}

	return (
		<div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
			<div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
				{initial}
			</div>
			<div className="min-w-0">
				<p className="max-w-44 truncate text-xs font-semibold text-slate-800">{displayName}</p>
				<p className="max-w-44 truncate text-[11px] text-slate-500">{email}</p>
			</div>
			<button
				type="button"
				onClick={handleSignOut}
				disabled={isSigningOut}
				className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{isSigningOut ? 'Signing out...' : 'Sign Out'}
			</button>
		</div>
	)
}
