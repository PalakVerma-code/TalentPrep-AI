const express = require('express')
const multer = require('multer')
const {
	generateQuestion,
	evaluateAnswer,
	getSessions,
	handleResumeUpload,
} = require('../controllers/aiControllers')

const router = express.Router()
const storage = multer.memoryStorage()
const upload = multer({ storage })

router.get('/generate-question', generateQuestion)
router.post('/evaluate-answer', evaluateAnswer)
router.get('/sessions', getSessions)
router.get('/get-sessions', getSessions)
router.post('/upload-resume', upload.single('resume'), handleResumeUpload)

module.exports = router

