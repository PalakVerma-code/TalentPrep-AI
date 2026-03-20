const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const express = require('express')
const cors = require('cors')
const { rateLimit } = require('express-rate-limit')
const interviewRoutes = require('./routes/interview')
const reportRoutes = require('./routes/report')

const app = express()
const PORT = 5000
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean)

const globalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 300,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Too many requests. Please try again shortly.' },
})

app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin) {
				return callback(null, true)
			}

			if (allowedOrigins.includes(origin)) {
				return callback(null, true)
			}

			return callback(new Error('Not allowed by CORS'))
		},
		credentials: true,
		methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	})
)
app.use(express.json())
app.use(globalLimiter)

app.get('/', (req, res) => {
	res.send('Server running')
})

app.use('/api/interview', interviewRoutes)
app.use('/api/report', reportRoutes)

app.use((error, req, res, next) => {
	if (error.message === 'Not allowed by CORS') {
		return res.status(403).json({ error: 'CORS policy does not allow this origin.' })
	}

	return next(error)
})

app.listen(PORT, () => {
	console.log(`Server started on port ${PORT}`)
})
