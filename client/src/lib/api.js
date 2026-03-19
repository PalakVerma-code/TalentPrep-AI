import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export const apiFetch = async (path, options = {}) => {
	const { data } = await supabase.auth.getSession()
	const accessToken = data?.session?.access_token
	const headers = new Headers(options.headers || {})

	if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json')
	}

	if (accessToken) {
		headers.set('Authorization', `Bearer ${accessToken}`)
	}

	const response = await fetch(`${API_BASE_URL}${path}`, {
		...options,
		headers,
	})

	const rawText = await response.text()
	let payload = {}

	if (rawText) {
		try {
			payload = JSON.parse(rawText)
		} catch {
			payload = { raw: rawText }
		}
	}

	return { response, data: payload }
}
