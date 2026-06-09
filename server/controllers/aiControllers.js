//one job is to generate question and evaluate answer using Gemini API
//another job is to save sessions in Supabase and retrieve them for dashboard
const { GoogleGenAI } = require('@google/genai') // Gemini API client library
const { PDFParse } = require('pdf-parse')  // For parsing PDF resumes
const supabase = require('../supabaseClient')

const cleanQuestionText = (text) => {  // Remove markdown, bullets, numbering, and extra whitespace
	return text
		.replace(/[*_`#>-]/g, '')
		.replace(/\s+/g, ' ')
		.replace(/^\s*\d+[.)]\s*/, '')
		.trim()
}

const normalizeScore = (rawScore) => {  // Convert various score formats to a number between 0 and 10
	if (typeof rawScore === 'number' && Number.isFinite(rawScore)) {
		return Math.max(0, Math.min(10, Math.round(rawScore)))
	}

	if (typeof rawScore === 'string') {
		const match = rawScore.match(/\d+/)
		if (match) {
			const parsed = Number.parseInt(match[0], 10)
			if (Number.isFinite(parsed)) {
				return Math.max(0, Math.min(10, parsed))
			}
		}
	}

	return null
}

const getUniqueQuestions = (rawQuestions, limit = 5) => {
	if (!Array.isArray(rawQuestions)) {
		return []
	}

	const unique = []
	const seen = new Set()

	for (const item of rawQuestions) {
		if (typeof item !== 'string') {
			continue
		}
        // Clean the question text to ensure uniqueness is based on the actual question, not formatting
		const cleaned = cleanQuestionText(item) 
		if (!cleaned) {
			continue
		}
         // Use a lowercase version of the cleaned question as the key for uniqueness
		const key = cleaned.toLowerCase()
		// If we've already seen this question, skip it
		if (seen.has(key)) {  
			continue
		}

		seen.add(key)
		unique.push(cleaned)

		if (unique.length >= limit) {
			break
		}
	}

	return unique
}
 //generate one question for fresher, without numbering or markdown, just the question sentence. no explanation.
 //route: GET /api/interview/generate-question
const generateQuestion = async (req, res) => {
	try {
		const apiKey = process.env.GEMINI_API_KEY

		if (!apiKey) {
			console.error('GEMINI_API_KEY not found in environment')
			return res.status(500).json({ error: 'API key not configured' })
		}

		const genAI = new GoogleGenAI({ apiKey }) // Initialize the Gemini API client with the provided API key
		const prompt =
			'Generate exactly one professional HR interview question for a fresher. Return only the question sentence, without numbering, markdown, bullets, or explanation.'

		
		const result = await genAI.models.generateContent({   //request Gemini to generate content based on the prompt
			model: 'gemini-2.5-flash',
			contents: prompt,
		})

		console.log('Result type:', typeof result)
		console.log('Result keys:', Object.keys(result || {}))

		let rawText = ''
		if (result?.text) { // The most common case is that the generated text is in result.text
			rawText = result.text
		} else if (result?.response?.text) { // In some cases, the response might be nested under result.response.text
			rawText = result.response.text
		} else if (result?.candidates?.[0]?.content?.parts?.[0]?.text) {
			rawText = result.candidates[0].content.parts[0].text
		} else if (typeof result === 'string') {
			rawText = result
		} else {
			
			return res.status(500).json({ error: 'Unexpected API response format' })
		}

		rawText = rawText.trim()
		

		if (!rawText) {
			console.error('Empty response from Gemini')
			return res.status(500).json({ error: 'Could not generate question. Please try again.' })
		}

		const firstLine = rawText.split('\n')[0] || '' // Take only the first line in case Gemini returns multiple lines, but still clean it up
		const question = cleanQuestionText(firstLine)

		if (!question) {
		
			return res.status(500).json({ error: 'Could not generate question. Please try again.' })
		}

		
		return res.json({ question })
	} catch (error) {
		const errorMessage = error.message || ''
		console.error('Error generating question:', error.message, error.stack)

		if (errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
			return res.status(429).json({ error: 'API quota exceeded. Please try again tomorrow.' })
		}

		if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
			return res.status(401).json({ error: 'Invalid API key. Please check your configuration.' })
		}

		if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
			return res.status(503).json({ error: 'Network error. Please try again.' })
		}

		return res.status(500).json({ error: 'Could not generate question. Please try again.' })
	}
}
//route: POST /api/interview/evaluate-answer
const evaluateAnswer = async (req, res) => {
	try {
		const { answer, question } = req.body
		const userId = req.user?.id

		if (!answer) {
			return res.status(400).json({ error: 'Answer is required' })
		}

		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' })
		}

		const apiKey = process.env.GEMINI_API_KEY

		if (!apiKey) {
			console.error('GEMINI_API_KEY not found in environment')
			return res.status(500).json({ error: 'API key not configured' })
		}

		console.log('Initializing Gemini for evaluation...')
		const genAI = new GoogleGenAI({ apiKey })
		const prompt = `Evaluate the following interview answer:

${answer}

Give response in JSON format with:
- score (out of 10)
- feedback (short explanation)
- improved_answer (better version of answer)
- suggestions (how to improve)`

		console.log('Calling Gemini API for evaluation...')
		const result = await genAI.models.generateContent({
			model: 'gemini-2.5-flash',
			contents: prompt,
		})

		let responseText = ''
		if (result?.text) {
			responseText = result.text
		} else if (result?.response?.text) {
			responseText = result.response.text
		} else if (result?.candidates?.[0]?.content?.parts?.[0]?.text) {
			responseText = result.candidates[0].content.parts[0].text
		} else if (typeof result === 'string') {
			responseText = result
		} else {
			console.error('Unknown result format for evaluation')
			return res.status(500).json({ error: 'Could not evaluate answer. Please try again.' })
		}

		responseText = responseText.trim()
		

		if (!responseText) {
			console.error('Empty response from Gemini for evaluation')
			return res.status(500).json({ error: 'Could not evaluate answer. Please try again.' })
		}

		try {
			const jsonMatch = responseText.match(/\{[\s\S]*\}/) // Extract the JSON object from the response
			if (!jsonMatch) {
				console.error('No JSON found in response')
				return res.status(500).json({ error: 'Could not evaluate answer. Please try again.' })
			}

			const evaluation = JSON.parse(jsonMatch[0]) // Parse the JSON to get the evaluation details
			const score = normalizeScore(evaluation.score)
			console.log('Parsed evaluation successfully')

			// Save evaluation to Supabase
			const { error } = await supabase.from('interview_sessions').insert([
				{
					user_id: userId,
					question: question || null,
					answer: answer,
					score: score,
					feedback: evaluation.feedback || null, 
					improved_answer: evaluation.improved_answer || null,
				},
			])

			if (error) {
				console.warn('Supabase insert error:', error.message)
				return res.status(500).json({
					error: 'Evaluation generated, but failed to save in database.',
					details: error.message,
				})
			} else {
				console.log('Evaluation saved to database successfully')
			}

			return res.json({ ...evaluation, score })
		} catch (parseError) {
			
			return res.status(500).json({ error: 'Could not evaluate answer. Please try again.' })
		}
	} catch (error) {
		const errorMessage = error.message || ''
		console.error('Error evaluating answer:', error.message, error.stack)

		if (errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
			return res.status(429).json({ error: 'API quota exceeded. Please try again tomorrow.' })
		}

		if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
			return res.status(401).json({ error: 'Invalid API key. Please check your configuration.' })
		}

		if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
			return res.status(503).json({ error: 'Network error. Please try again.' })
		}

		return res.status(500).json({ error: 'Could not evaluate answer. Please try again.' })
	}
}
//route: POST /api/interview/upload-resume
const handleResumeUpload = async (req, res) => {
	let mode = 'general'
	let resumeTextForSave = null

	try {
		const userId = req.user?.id
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' })
		}

		const apiKey = process.env.GEMINI_API_KEY
		if (!apiKey) {
			return res.status(500).json({ error: 'API key not configured' })
		}

		const genAI = new GoogleGenAI({ apiKey })
		const hasResume = Boolean(req.file)
		mode = hasResume ? 'resume' : 'general'
		let prompt = `Generate 5 random interview questions for a fresher developer.
All 5 questions must be unique and non-repeating.
Return JSON array only.`

		if (hasResume) {
			if (!req.file.buffer) {
				return res.status(400).json({ error: 'Invalid resume file' })
			}

			const parser = new PDFParse({ data: req.file.buffer }) // Parse the uploaded PDF resume to extract text content
			const parsedPdf = await parser.getText()   // Extract text from the PDF buffer using pdf-parse library
			await parser.destroy() // Clean up any resources used by the parser
			const resumeText = (parsedPdf.text || '').trim().slice(0, 2000) // Take only the first 2000 characters of the resume text to avoid hitting token limits, and trim whitespace

			if (!resumeText) {
				return res.status(400).json({ error: 'Could not extract text from resume' })
			}
			resumeTextForSave = resumeText

			prompt = `Based on the following resume, generate 5 interview questions.
Focus on skills, projects, and experience.
Return ONLY JSON array.

Resume:
${resumeText}`
		}

		const result = await genAI.models.generateContent({
			model: 'gemini-2.5-flash',
			contents: prompt,
		})

		let responseText = ''
		if (result?.text) {
			responseText = result.text
		} else if (result?.response?.text) {
			responseText = result.response.text
		} else if (result?.candidates?.[0]?.content?.parts?.[0]?.text) {
			responseText = result.candidates[0].content.parts[0].text
		} else if (typeof result === 'string') {
			responseText = result
		}

		responseText = responseText.trim()
		if (!responseText) {
			return res.status(500).json({ error: 'Empty response from AI' })
		}

		const jsonArrayMatch = responseText.match(/\[[\s\S]*\]/) // Extract the JSON array from the response, which should contain the questions
		if (!jsonArrayMatch) {
			return res.status(500).json({ error: 'Invalid AI response format' })
		}

		const parsedQuestions = JSON.parse(jsonArrayMatch[0])
		const questions = getUniqueQuestions(parsedQuestions, 5)

		if (questions.length === 0) {
			return res.status(500).json({ error: 'Invalid AI response format' })
		}

		const { error: saveError } = await supabase.from('interview_sessions').insert([ // Save the generated questions and resume text (if any) to Supabase for later retrieval in the dashboard
			{
				user_id: userId,
				question: typeof questions[0] === 'string' ? questions[0] : null,
				mode,
				resume_text: resumeTextForSave,
			},
		])

		if (saveError) {
			
			return res.status(500).json({
				error: 'Questions generated, but failed to save session.',
				details: saveError.message,
			})
		}

		return res.json({ questions })
	} catch (error) {
		const errorMessage = error.message || ''
		console.error('Error in handleResumeUpload:', error.message, error.stack)

		const { error: fallbackSaveError } = await supabase.from('interview_sessions').insert([
			{
				user_id: req.user?.id || null,
				question: null,
				mode,
				resume_text: resumeTextForSave,
			},
		])

		if (fallbackSaveError) {
			console.warn('Fallback save failed:', fallbackSaveError.message)
		}

		if (errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
			return res.status(429).json({ error: 'API quota exceeded. Please try again tomorrow.' })
		}

		if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
			return res.status(401).json({ error: 'Invalid API key. Please check your configuration.' })
		}

		if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
			return res.status(503).json({ error: 'Network error. Please try again.' })
		}

		return res.status(500).json({ error: 'Could not process resume upload' })
	}
}
//route: GET /api/interview/sessions
const getSessions = async (req, res) => {
	try {
		const userId = req.user?.id
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' })
		}
        // Fetch all interview sessions for the authenticated user from Supabase, ordered by creation date (most recent first)
		const { data, error } = await supabase  
			.from('interview_sessions')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false })

		if (error) {
			console.error('Error fetching sessions:', error.message)
			return res.status(500).json({ error: 'Failed to fetch sessions' })
		}

		return res.json({ sessions: data || [] })
	} catch (error) {
		console.error('Error fetching sessions:', error.message)
		return res.status(500).json({ error: 'Failed to fetch sessions' })
	}
}

// For backward compatibility, we can export getSessions under another name as well
const getInterviewSessions = getSessions

//route: DELETE /api/interview/sessions/:id
const deleteSession = async (req, res) => {
	try {
		const { id } = req.params
		const sessionId = (id || '').trim()
		const userId = req.user?.id

		if (!sessionId) {
			return res.status(400).json({ error: 'Invalid session id' })
		}

		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' })
		}

		const { data, error } = await supabase
			.from('interview_sessions')
			.delete()
			.eq('id', sessionId)
			.eq('user_id', userId)
			.select('id')

		if (error) {
			console.error('Error deleting session:', error.message)
			return res.status(500).json({ error: 'Failed to delete session' })
		}

		if (!Array.isArray(data) || data.length === 0) {
			return res.status(404).json({ error: 'Session not found' })
		}

		return res.json({ success: true, id: sessionId })
	} catch (error) {
		console.error('Error deleting session:', error.message)
		return res.status(500).json({ error: 'Failed to delete session' })
	}
}

module.exports = {
	generateQuestion,
	evaluateAnswer,
	handleResumeUpload,
	getSessions,
	deleteSession,
	getInterviewSessions,
}
