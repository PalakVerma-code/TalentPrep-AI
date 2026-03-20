import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QuestionBox from '../components/QuestionBox'
import AnswerInput from '../components/AnswerInput'
import EvaluationResult from '../components/EvaluationResult'
import StartButton from '../components/StartButton'
import { apiFetch } from '../lib/api'
import UserMenu from '../components/UserMenu'

const prepareQuestions = (items) => {
	if (!Array.isArray(items)) {
		return []
	}

	const deduped = []
	const seen = new Set()

	for (const item of items) {
		if (typeof item !== 'string') {
			continue
		}

		const cleaned = item.trim()
		if (!cleaned) {
			continue
		}

		const key = cleaned.toLowerCase()
		if (seen.has(key)) {
			continue
		}

		seen.add(key)
		deduped.push(cleaned)
	}

	for (let index = deduped.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1))
		;[deduped[index], deduped[swapIndex]] = [deduped[swapIndex], deduped[index]]
	}

	return deduped
}

const renderList = (items, emptyText) => {
	const values = Array.isArray(items) ? items.filter(Boolean) : []

	if (values.length === 0) {
		return <p className="text-sm text-slate-500">{emptyText}</p>
	}

	return (
		<ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
			{values.map((item, index) => (
				<li key={`${item}-${index}`}>{item}</li>
			))}
		</ul>
	)
}

export default function Interview({ user }) {
	const navigate = useNavigate()
	const [questions, setQuestions] = useState([])
	const [currentIndex, setCurrentIndex] = useState(0)
	const [answer, setAnswer] = useState('')
	const [evaluation, setEvaluation] = useState(null)
	const [resumeFile, setResumeFile] = useState(null)
	const [isUploading, setIsUploading] = useState(false)
	const [uploadMessage, setUploadMessage] = useState('')
	const [latestReport, setLatestReport] = useState(null)
	const [voiceMode, setVoiceMode] = useState(false)
	const hasFetchedInitialQuestion = useRef(false)
	const currentQuestion =
		questions[currentIndex] || 'No questions loaded. Upload resume or start without resume.'

	const fetchGeneralQuestions = async () => {
		try {
			const { response, data } = await apiFetch('/api/interview/upload-resume', {
				method: 'POST',
			})

			if (response.status === 401) {
				navigate('/auth', { replace: true })
				return false
			}

			const nextQuestions = prepareQuestions(data.questions)

			if (!response.ok || nextQuestions.length === 0) {
				setUploadMessage(data.error || 'Could not load questions. Please try again.')
				setQuestions([])
				return false
			}

			setQuestions(nextQuestions)
			setCurrentIndex(0)
			return true
		} catch {
			setUploadMessage('Could not load questions. Please try again.')
			setQuestions([])
			return false
		}
	}

	const evaluateAnswer = async (submittedAnswer, askedQuestion) => {
		try {
			const { response, data } = await apiFetch('/api/interview/evaluate-answer', {
				method: 'POST',
				body: JSON.stringify({ question: askedQuestion, answer: submittedAnswer }),
			})

			if (response.status === 401) {
				navigate('/auth', { replace: true })
				return
			}

			if (!response.ok || !data.score) {
				setEvaluation({ error: data.error || 'Failed to evaluate answer' })
				return
			}

			setEvaluation(data)
		} catch {
			setEvaluation({ error: 'Failed to evaluate answer. Please try again.' })
		}
	}

	const handleSubmit = async (event) => {
		event.preventDefault()

		if (!answer.trim() || !questions[currentIndex]) {
			return
		}

		console.log('Submitted answer:', answer)
		await evaluateAnswer(answer, questions[currentIndex])
		setAnswer('')

		if (currentIndex < questions.length - 1) {
			setCurrentIndex((prev) => prev + 1)
			return
		}

		setCurrentIndex(questions.length)
		setUploadMessage('Interview completed. Great job!')
	}

	const handleFileChange = (event) => {
		const file = event.target.files?.[0] || null
		setResumeFile(file)
		setUploadMessage('')
	}

	const startWithoutResume = async () => {
		try {
			setIsUploading(true)
			setUploadMessage('Loading interview questions...')
			setQuestions([])
			setCurrentIndex(0)
			setEvaluation(null)
			setAnswer('')
			const didLoad = await fetchGeneralQuestions()
			if (didLoad) {
				setUploadMessage('Started without resume.')
			}
		} catch {
			setUploadMessage('Could not start interview. Please try again.')
		} finally {
			setIsUploading(false)
		}
	}

	const handleResumeUpload = async () => {
		if (!resumeFile) {
			await startWithoutResume()
			return
		}

		const formData = new FormData()
		formData.append('resume', resumeFile)

		try {
			setIsUploading(true)
			setUploadMessage('Uploading resume and generating questions...')

			const { response, data } = await apiFetch('/api/interview/upload-resume', {
				method: 'POST',
				body: formData,
			})

			if (response.status === 401) {
				navigate('/auth', { replace: true })
				return
			}

			const nextQuestions = prepareQuestions(data.questions)

			if (!response.ok || nextQuestions.length === 0) {
				setUploadMessage(data.error || 'Could not generate questions from resume.')
				return
			}

			setQuestions(nextQuestions)
			setCurrentIndex(0)
			setEvaluation(null)
			setAnswer('')
			setUploadMessage('Resume uploaded. Showing resume-based questions.')
		} catch {
			setUploadMessage('Upload failed. Please try again.')
		} finally {
			setIsUploading(false)
		}
	}

	useEffect(() => {
		if (hasFetchedInitialQuestion.current) {
			return
		}

		hasFetchedInitialQuestion.current = true
		setUploadMessage('Use Upload Resume or Start Without Resume to begin.')
	}, [])

	useEffect(() => {
		try {
			const savedReport = localStorage.getItem('skillGapReport')
			if (!savedReport) {
				return
			}

			const parsedReport = JSON.parse(savedReport)
			if (parsedReport && typeof parsedReport === 'object') {
				setLatestReport(parsedReport)
			}
		} catch (error) {
			console.error('Failed to restore skill gap report:', error)
		}
	}, [])

	useEffect(() => {
		if (!voiceMode || !questions[currentIndex] || !window.speechSynthesis) {
			return
		}

		// Cancel prior speech so only the current question is spoken.
		window.speechSynthesis.cancel()
		const utterance = new SpeechSynthesisUtterance(questions[currentIndex])
		utterance.lang = 'en-US'

		try {
			window.speechSynthesis.speak(utterance)
		} catch (error) {
			console.error('Speech synthesis error:', error)
		}

		return () => {
			window.speechSynthesis.cancel()
		}
	}, [voiceMode, questions, currentIndex])

	useEffect(() => {
		return () => {
			if (window.speechSynthesis) {
				window.speechSynthesis.cancel()
			}
		}
	}, [])

	return (
		<main className="flex min-h-screen flex-col bg-slate-50 px-4 py-8">
			<div className="mx-auto mb-4 flex w-full max-w-7xl justify-end">
				<UserMenu user={user} />
			</div>

			<div className="mx-auto mb-6 flex w-full max-w-7xl flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
				{latestReport ? (
					<div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
						<h3 className="mb-3 text-base font-semibold text-emerald-900">Latest Skill Gap Report</h3>
						<div className="grid gap-3">
							<section className="rounded-md bg-white p-3">
								<p className="mb-1 text-sm font-semibold text-slate-700">Strengths</p>
								{renderList(latestReport.strengths, 'No strengths identified yet.')}
							</section>
							<section className="rounded-md bg-white p-3">
								<p className="mb-1 text-sm font-semibold text-slate-700">Weaknesses</p>
								{renderList(latestReport.weaknesses, 'No weaknesses identified yet.')}
							</section>
							<section className="rounded-md bg-white p-3">
								<p className="mb-1 text-sm font-semibold text-slate-700">Topics to Improve</p>
								{renderList(latestReport.topics_to_improve, 'No topics to improve identified yet.')}
							</section>
							<section className="rounded-md bg-white p-3">
								<p className="mb-1 text-sm font-semibold text-slate-700">Overall Summary</p>
								<p className="text-sm text-slate-700">
									{latestReport.overall_summary || latestReport.summary || 'No summary available yet.'}
								</p>
							</section>
						</div>
						<p className="mt-3 text-xs text-emerald-700">This report is synced from your Dashboard generation.</p>
					</div>
				) : null}

				<div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
					<span className="text-sm font-medium text-slate-700">Voice Interview Mode</span>
					<button
						type="button"
						onClick={() => setVoiceMode((prev) => !prev)}
						aria-pressed={voiceMode}
						className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
							voiceMode ? 'bg-emerald-500' : 'bg-slate-300'
						}`}
					>
						<span
							className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
								voiceMode ? 'translate-x-6' : 'translate-x-1'
							}`}
						/>
					</button>
				</div>

				<label className="text-sm font-medium text-slate-700" htmlFor="resume-upload">
					Upload Resume (PDF)
				</label>
				<input
					id="resume-upload"
					type="file"
					accept="application/pdf"
					onChange={handleFileChange}
					className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
				/>
				<div className="flex flex-wrap items-center gap-3">
					<StartButton
						label={isUploading ? 'Uploading...' : 'Upload Resume'}
						onClick={handleResumeUpload}
						disabled={isUploading}
					/>
					<span className="text-sm font-semibold text-slate-500">OR</span>
					<StartButton
						label="Start Without Resume"
						onClick={startWithoutResume}
						disabled={isUploading}
					/>
				</div>
				{uploadMessage ? <p className="text-sm text-slate-600">{uploadMessage}</p> : null}
			</div>

			{/* Two-column layout container */}
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:flex-row lg:gap-8">
				{/* LEFT COLUMN - Question and Answer Input */}
				<div className="flex w-full flex-col gap-6 lg:w-1/2">
					<h2 className="text-2xl font-bold text-slate-800">Interview Question</h2>
					<QuestionBox question={currentQuestion} />
					<AnswerInput answer={answer} onAnswerChange={setAnswer} onSubmit={handleSubmit} />
				</div>

				{/* RIGHT COLUMN - Evaluation Feedback */}
				<div className="flex w-full flex-col gap-6 lg:w-1/2">
					<h2 className="text-2xl font-bold text-slate-800">Feedback</h2>
					{evaluation ? (
						<EvaluationResult evaluation={evaluation} />
					) : (
						<div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-100 p-6 text-center text-slate-500">
							<p>Submit your answer to see feedback</p>
						</div>
					)}
				</div>
			</div>

			{/* Back Button - Below layout on all screen sizes */}
			<div className="mx-auto mt-8 w-full max-w-7xl">
				<div className="flex flex-wrap gap-3">
					<StartButton label="Back to Home" onClick={() => navigate('/')} />
					<StartButton label="Go to Dashboard" onClick={() => navigate('/dashboard')} />
				</div>
			</div>
		</main>
	)
}
