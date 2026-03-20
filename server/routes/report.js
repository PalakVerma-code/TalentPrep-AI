const express = require('express')
const requireAuth = require('../middleware/requireAuth')
const { generateSkillGapReport } = require('../controllers/reportController')

const router = express.Router()

router.use(requireAuth)
router.get('/', generateSkillGapReport)

module.exports = router