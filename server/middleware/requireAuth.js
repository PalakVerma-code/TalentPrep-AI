// Middleware to require authentication for protected routes using Supabase
const supabase = require('../supabaseClient')

const requireAuth = async (req, res, next) => {
	try {
		const authHeader = req.headers.authorization || ''
		const isBearer = authHeader.toLowerCase().startsWith('bearer ')// Check if the Authorization header is in the expected "Bearer <token>" format
		const token = isBearer ? authHeader.slice(7).trim() : ''   // Extract the token from the Authorization header

		if (!token) {
			return res.status(401).json({ error: 'Unauthorized: missing token' })
		}
   // Use the extracted token to get the authenticated user from Supabase. If the token is invalid or expired, this will return an error or no user data.
		const { data, error } = await supabase.auth.getUser(token)
		if (error || !data?.user) {
			return res.status(401).json({ error: 'Unauthorized: invalid token' })
		}

		req.user = data.user
		return next()
	} catch (error) {
		console.error('Auth middleware error:', error.message)
		return res.status(500).json({ error: 'Authentication failed' })
	}
}

module.exports = requireAuth
