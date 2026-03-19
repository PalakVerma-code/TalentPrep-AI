import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function UserMenu({ user }) {
	const navigate = useNavigate()
	const [isSigningOut, setIsSigningOut] = useState(false)

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
		<div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
			<span className="max-w-55 truncate text-xs font-medium text-slate-600">
				{user?.email || 'Signed in'}
			</span>
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
