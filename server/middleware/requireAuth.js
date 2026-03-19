const supabase = require('../supabaseClient')

const requireAuth = async (req, res, next) => {
	try {
		const authHeader = req.headers.authorization || ''
		const isBearer = authHeader.toLowerCase().startsWith('bearer ')
		const token = isBearer ? authHeader.slice(7).trim() : ''

		if (!token) {
			return res.status(401).json({ error: 'Unauthorized: missing token' })
		}

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
