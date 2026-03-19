const express = require('express')
const multer = require('multer')
const { rateLimit } = require('express-rate-limit')
const requireAuth = require('../middleware/requireAuth')
const {
	generateQuestion,
	evaluateAnswer,
	getSessions,
	deleteSession,
	handleResumeUpload,
} = require('../controllers/aiControllers')

const router = express.Router()
const storage = multer.memoryStorage()
const maxResumeSizeMb = Number.parseInt(process.env.MAX_RESUME_SIZE_MB || '5', 10)
const maxResumeSizeBytes = Math.max(1, maxResumeSizeMb) * 1024 * 1024

const upload = multer({
	storage,
	limits: { fileSize: maxResumeSizeBytes },
	fileFilter: (req, file, callback) => {
		if (!file) {
			return callback(null, true)
		}

		const isPdfMime = file.mimetype === 'application/pdf'
		const isPdfExtension = /\.pdf$/i.test(file.originalname || '')

		if (!isPdfMime || !isPdfExtension) {
			return callback(new Error('Only PDF files are allowed'))
		}

		return callback(null, true)
	},
})

const aiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 40,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Too many AI requests. Please try again in a few minutes.' },
})

const sessionsReadLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 120,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Too many dashboard requests. Please slow down.' },
})

const sessionsWriteLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 30,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Too many write requests. Please try again later.' },
})

router.use(requireAuth)

router.get('/generate-question', aiLimiter, generateQuestion)
router.post('/evaluate-answer', aiLimiter, evaluateAnswer)
router.get('/sessions', sessionsReadLimiter, getSessions)
router.get('/get-sessions', sessionsReadLimiter, getSessions)
router.delete('/sessions/:id', sessionsWriteLimiter, deleteSession)
router.post('/upload-resume', aiLimiter, upload.single('resume'), handleResumeUpload)

router.use((error, req, res, next) => {
	if (error instanceof multer.MulterError) {
		if (error.code === 'LIMIT_FILE_SIZE') {
			return res.status(413).json({
				error: `Resume file is too large. Maximum size allowed is ${Math.max(1, maxResumeSizeMb)}MB.`,
			})
		}

		return res.status(400).json({ error: 'Invalid resume upload request.' })
	}

	if (error.message === 'Only PDF files are allowed') {
		return res.status(400).json({ error: 'Only PDF resume files are allowed.' })
	}

	return next(error)
})

module.exports = router

