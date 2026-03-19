import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Auth() {
	const navigate = useNavigate()
	const [isSignUp, setIsSignUp] = useState(false)
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState('')
	const [message, setMessage] = useState('')

	const handleSubmit = async (event) => {
		event.preventDefault()
		setError('')
		setMessage('')

		if (!email.trim() || !password.trim()) {
			setError('Email and password are required.')
			return
		}

		try {
			setIsSubmitting(true)

			if (isSignUp) {
				const { error: signUpError } = await supabase.auth.signUp({
					email: email.trim(),
					password,
				})

				if (signUpError) {
					setError(signUpError.message || 'Could not create account.')
					return
				}

				setMessage('Account created. If email confirmation is enabled, please verify your email, then sign in.')
				setIsSignUp(false)
				return
			}

			const { error: signInError } = await supabase.auth.signInWithPassword({
				email: email.trim(),
				password,
			})

			if (signInError) {
				setError(signInError.message || 'Could not sign in.')
				return
			}

			navigate('/', { replace: true })
		} catch (authError) {
			setError('Authentication failed. Please try again.')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
			<div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<h1 className="mb-2 text-2xl font-bold text-slate-900">{isSignUp ? 'Create Account' : 'Sign In'}</h1>
				<p className="mb-6 text-sm text-slate-600">
					Use your account to access interview sessions and your private dashboard.
				</p>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="auth-email">
							Email
						</label>
						<input
							id="auth-email"
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
							autoComplete="email"
							required
						/>
					</div>

					<div>
						<label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="auth-password">
							Password
						</label>
						<input
							id="auth-password"
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
							autoComplete={isSignUp ? 'new-password' : 'current-password'}
							required
						/>
					</div>

					{error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
					{message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}

					<button
						type="submit"
						disabled={isSubmitting}
						className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isSubmitting ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
					</button>
				</form>

				<button
					type="button"
					onClick={() => {
						setIsSignUp((prev) => !prev)
						setError('')
						setMessage('')
					}}
					className="mt-4 w-full text-sm font-medium text-slate-700 underline"
				>
					{isSignUp ? 'Already have an account? Sign in' : 'New user? Create an account'}
				</button>
			</div>
		</main>
	)
}
