const { GoogleGenAI } = require('@google/genai')
const supabase = require('../supabaseClient')

const safeArray = (value) => {
	if (!Array.isArray(value)) {
		return []
	}

	return value
		.filter((item) => typeof item === 'string')
		.map((item) => item.trim())
		.filter(Boolean)
}

const getModelText = (result) => {
	if (result?.text) {
		return result.text
	}

	if (result?.response?.text) {
		return result.response.text
	}

	if (result?.candidates?.[0]?.content?.parts?.[0]?.text) {
		return result.candidates[0].content.parts[0].text
	}

	if (typeof result === 'string') {
		return result
	}

	return ''
}

const stripCodeFence = (text) => {
	if (!text || typeof text !== 'string') {
		return ''
	}

	return text
		.trim()
		.replace(/^```json\s*/i, '')
		.replace(/^```\s*/i, '')
		.replace(/```\s*$/i, '')
		.trim()
}

const parseReportJson = (rawText) => {
	if (!rawText || typeof rawText !== 'string') {
		return null
	}

	const trimmed = rawText.trim()

	try {
		return JSON.parse(trimmed)
	} catch {
		const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
		if (!jsonMatch) {
			return null
		}

		try {
			return JSON.parse(jsonMatch[0])
		} catch {
			return null
		}
	}
}

const buildFallbackReport = (sessions) => {
	const scored = sessions
		.map((item) => Number(item.score))
		.filter((score) => Number.isFinite(score))

	const avgScore =
		scored.length > 0
			? scored.reduce((sum, score) => sum + score, 0) / scored.length
			: null

	const strengths = []
	const weaknesses = []
	const topicsToImprove = []

	if (avgScore !== null && avgScore >= 7) {
		strengths.push('Consistent interview performance across sessions.')
	} else if (avgScore !== null) {
		weaknesses.push('Interview answers need more depth and clarity.')
		topicsToImprove.push('Structured answering using clear examples.')
	}

	if (sessions.length >= 5) {
		strengths.push('Good interview practice consistency.')
	} else {
		topicsToImprove.push('Increase practice frequency with more mock interviews.')
	}

	if (strengths.length === 0) {
		strengths.push('You are actively attempting interview questions and building momentum.')
	}

	if (weaknesses.length === 0) {
		weaknesses.push('Some answers can be more specific and impact-focused.')
	}

	if (topicsToImprove.length === 0) {
		topicsToImprove.push('Behavioral storytelling (Situation, Task, Action, Result).')
		topicsToImprove.push('Technical fundamentals relevant to your target role.')
	}

	const summary =
		avgScore === null
			? 'A report was generated from your saved responses, but score-based analysis is limited because scores are missing in some sessions.'
			: `Based on ${sessions.length} sessions, your estimated average score is ${avgScore.toFixed(1)}/10. Focus on clearer structure, concrete examples, and role-specific fundamentals to improve interview performance.`

	return {
		strengths,
		weaknesses,
		topics_to_improve: topicsToImprove,
		summary,
		overall_summary: summary,
	}
}

const generateSkillGapReport = async (req, res) => {
	let validSessionsForFallback = []

	try {
		const userId = req.user?.id
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' })
		}

		const { data: sessions, error: sessionsError } = await supabase
			.from('interview_sessions')
			.select('question, answer, score')
			.eq('user_id', userId)

		if (sessionsError) {
			console.error('Error fetching sessions for report:', sessionsError.message)
			return res.status(500).json({ error: 'Failed to fetch interview sessions.' })
		}

		const validSessions = (sessions || []).filter((item) => {
			const hasAnswer = typeof item?.answer === 'string' && item.answer.trim().length > 0
			return hasAnswer
		})
		validSessionsForFallback = validSessions

		if (validSessions.length === 0) {
			return res.status(404).json({ error: 'No interview sessions found for report.' })
		}

		const transcriptText = validSessions
			.slice(0, 40)
			.map((session, index) => {
				const scoreValue = Number.isFinite(Number(session.score))
					? Number(session.score)
					: 'N/A'
				const questionText =
					typeof session.question === 'string' && session.question.trim().length > 0
						? session.question.trim().slice(0, 400)
						: 'Question not available'
				const answerText = session.answer.trim().slice(0, 1000)
				return `Q${index + 1}: ${questionText}\nA${index + 1}: ${answerText}\nScore: ${scoreValue}`
			})
			.join('\n\n')

		const apiKey = process.env.GEMINI_API_KEY
		if (!apiKey) {
			return res.status(500).json({ error: 'API key not configured' })
		}

		const genAI = new GoogleGenAI({ apiKey })
		const prompt = `Analyze the following interview responses and return JSON with strengths, weaknesses, topics_to_improve, and summary.

Return ONLY valid JSON in this exact structure:
{
  "strengths": ["..."],
  "weaknesses": ["..."],
  "topics_to_improve": ["..."],
  "summary": "..."
}

Interview data:
${transcriptText}`

		const result = await genAI.models.generateContent({
			model: 'gemini-2.5-flash',
			contents: prompt,
		})

		let responseText = stripCodeFence(getModelText(result))
		let parsed = parseReportJson(responseText)

		if (!parsed) {
			const repairPrompt = `Return only valid JSON with this structure:
{
  "strengths": ["..."],
  "weaknesses": ["..."],
  "topics_to_improve": ["..."],
  "summary": "..."
}

Fix this content into the required JSON format only:
${responseText}`

			const repairedResult = await genAI.models.generateContent({
				model: 'gemini-2.5-flash',
				contents: repairPrompt,
			})

			responseText = stripCodeFence(getModelText(repairedResult))
			parsed = parseReportJson(responseText)
		}

		if (!parsed || typeof parsed !== 'object') {
			console.warn('Gemini returned invalid JSON for report. Using fallback report.')
			return res.json(buildFallbackReport(validSessions))
		}

		const summaryText =
			typeof parsed.summary === 'string' && parsed.summary.trim()
				? parsed.summary.trim()
				: typeof parsed.overall_summary === 'string' && parsed.overall_summary.trim()
					? parsed.overall_summary.trim()
					: ''

		const report = {
			strengths: safeArray(parsed.strengths),
			weaknesses: safeArray(parsed.weaknesses),
			topics_to_improve: safeArray(parsed.topics_to_improve),
			summary: summaryText,
			overall_summary: summaryText,
		}

		return res.json(report)
	} catch (error) {
		const errorMessage = error.message || ''
		console.error('Error generating skill gap report:', error.message, error.stack)

		if (errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
			return res.status(429).json({ error: 'API quota exceeded. Please try again tomorrow.' })
		}

		if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
			return res.status(401).json({ error: 'Invalid API key. Please check your configuration.' })
		}

		if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
			return res.status(503).json({ error: 'Network error. Please try again.' })
		}

		if (validSessionsForFallback.length > 0) {
			return res.json(buildFallbackReport(validSessionsForFallback))
		}

		return res.status(500).json({ error: 'Failed to generate skill gap report.' })
	}
}

module.exports = {
	generateSkillGapReport,
}