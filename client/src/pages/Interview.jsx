import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QuestionBox from '../components/QuestionBox'
import AnswerInput from '../components/AnswerInput'
import EvaluationResult from '../components/EvaluationResult'
import StartButton from '../components/StartButton'

export default function Interview() {
	const navigate = useNavigate()
	const [questions, setQuestions] = useState([])
	const [currentIndex, setCurrentIndex] = useState(0)
	const [answer, setAnswer] = useState('')
	const [evaluation, setEvaluation] = useState(null)
	const [resumeFile, setResumeFile] = useState(null)
	const [isUploading, setIsUploading] = useState(false)
	const [uploadMessage, setUploadMessage] = useState('')
	const hasFetchedInitialQuestion = useRef(false)
	const currentQuestion =
		questions[currentIndex] || 'No questions loaded. Upload resume or start without resume.'

	const fetchGeneralQuestions = async () => {
		try {
			const response = await fetch('http://localhost:5000/api/interview/upload-resume', {
				method: 'POST',
			})
			const data = await response.json()

			if (!response.ok || !Array.isArray(data.questions) || data.questions.length === 0) {
				setUploadMessage(data.error || 'Could not load questions. Please try again.')
				setQuestions([])
				return
			}

			setQuestions(data.questions)
			setCurrentIndex(0)
		} catch (error) {
			setUploadMessage('Could not load questions. Please try again.')
			setQuestions([])
		}
	}

	const evaluateAnswer = async (submittedAnswer, askedQuestion) => {
		try {
			const response = await fetch('http://localhost:5000/api/interview/evaluate-answer', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ question: askedQuestion, answer: submittedAnswer }),
			})

			const data = await response.json()

			if (!response.ok || !data.score) {
				setEvaluation({ error: data.error || 'Failed to evaluate answer' })
				return
			}

			setEvaluation(data)
		} catch (error) {
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
			await fetchGeneralQuestions()
			setUploadMessage('Started without resume.')
		} catch (error) {
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

			const response = await fetch('http://localhost:5000/api/interview/upload-resume', {
				method: 'POST',
				body: formData,
			})

			const data = await response.json()

			if (!response.ok || !Array.isArray(data.questions) || data.questions.length === 0) {
				setUploadMessage(data.error || 'Could not generate questions from resume.')
				return
			}

			setQuestions(data.questions)
			setCurrentIndex(0)
			setEvaluation(null)
			setAnswer('')
			setUploadMessage('Resume uploaded. Showing resume-based questions.')
		} catch (error) {
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

	return (
		<main className="flex min-h-screen flex-col bg-slate-50 px-4 py-8">
			<div className="mx-auto mb-6 flex w-full max-w-7xl flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
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
				<StartButton label="Back to Home" onClick={() => navigate('/')} />
			</div>
		</main>
	)
}
