import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StartButton from '../components/StartButton'
import { apiFetch } from '../lib/api'
import UserMenu from '../components/UserMenu'

const formatDate = (dateString) => {
	if (!dateString) {
		return 'N/A'
	}

	return new Date(dateString).toLocaleString()
}

const shortenFeedback = (feedback) => {
	if (!feedback) {
		return 'No feedback available.'
	}

	if (feedback.length <= 120) {
		return feedback
	}

	return `${feedback.slice(0, 120)}...`
}

const isLongFeedback = (feedback) => {
	if (!feedback || typeof feedback !== 'string') {
		return false
	}

	return feedback.length > 120
}

export default function Dashboard({ user }) {
	const navigate = useNavigate()
	const [sessions, setSessions] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState('')
	const [deletingSessionId, setDeletingSessionId] = useState(null)
	const [expandedSessionIds, setExpandedSessionIds] = useState([])
	const [report, setReport] = useState(null)
	const [isGeneratingReport, setIsGeneratingReport] = useState(false)
	const [reportError, setReportError] = useState('')

	const validScores = sessions
		.map((session) => Number(session.score))
		.filter((score) => Number.isFinite(score))

	const averageScore =
		validScores.length > 0
			? (validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(1)
			: null

	useEffect(() => {
		try {
			const savedReport = localStorage.getItem('skillGapReport')
			if (!savedReport) {
				return
			}

			const parsedReport = JSON.parse(savedReport)
			if (parsedReport && typeof parsedReport === 'object') {
				setReport(parsedReport)
			}
		} catch (error) {
			console.error('Failed to restore skill gap report:', error)
		}
	}, [])

	useEffect(() => {
		const fetchSessions = async () => {
			try {
				setIsLoading(true)
				setError('')

				const { response, data } = await apiFetch('/api/interview/get-sessions')

				if (response.status === 401) {
					navigate('/auth', { replace: true })
					return
				}

				if (!response.ok) {
					setError(data.error || 'Could not load sessions.')
					setSessions([])
					return
				}

				setSessions(data.sessions || [])
			} catch {
				setError('Could not load sessions. Please try again.')
				setSessions([])
			} finally {
				setIsLoading(false)
			}
		}

		fetchSessions()
	}, [navigate])

	const handleDeleteSession = async (sessionId) => {
		try {
			setDeletingSessionId(sessionId)
			setError('')

			const { response, data } = await apiFetch(`/api/interview/sessions/${sessionId}`, {
				method: 'DELETE',
			})

			if (response.status === 401) {
				navigate('/auth', { replace: true })
				return
			}

			if (!response.ok) {
				setError(data.error || 'Could not delete this session.')
				return
			}

			setSessions((prevSessions) => prevSessions.filter((session) => session.id !== sessionId))
		} catch {
			setError('Could not delete this session. Please try again.')
		} finally {
			setDeletingSessionId(null)
		}
	}

	const toggleSessionFeedback = (sessionId) => {
		setExpandedSessionIds((prev) => {
			if (prev.includes(sessionId)) {
				return prev.filter((id) => id !== sessionId)
			}

			return [...prev, sessionId]
		})
	}

	const handleGenerateReport = async () => {
		try {
			setIsGeneratingReport(true)
			setReportError('')
			setReport(null)
			localStorage.removeItem('skillGapReport')

			const { response, data } = await apiFetch('/api/report', {
				method: 'GET',
				credentials: 'include',
			})

			if (response.status === 401) {
				navigate('/auth', { replace: true })
				return
			}

			if (!response.ok) {
				setReportError(data.error || 'Could not generate skill gap report.')
				return
			}

			setReport(data)
			localStorage.setItem('skillGapReport', JSON.stringify(data))
		} catch {
			setReportError('Could not generate skill gap report. Please try again.')
		} finally {
			setIsGeneratingReport(false)
		}
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

	return (
		<main className="min-h-screen bg-slate-50 px-4 py-8">
			<div className="mx-auto w-full max-w-5xl">
				<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
					<h1 className="text-3xl font-bold text-slate-900">Interview Dashboard</h1>
					<div className="flex flex-wrap items-center gap-3">
						<StartButton label="Back" onClick={() => navigate('/')} />
						<StartButton label="Go to Chat" onClick={() => navigate('/interview')} />
						<UserMenu user={user} />
					</div>
				</div>

				{!isLoading && !error && sessions.length > 0 && (
					<div className="mb-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
						<p className="text-sm text-slate-500">Average Score</p>
						<p className="text-3xl font-bold text-slate-900">{averageScore ?? 'N/A'}/10</p>
					</div>
				)}

				<div className="mb-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 className="text-lg font-semibold text-slate-900">Skill Gap Report</h2>
							<p className="text-sm text-slate-500">Generate an AI analysis of your interview performance.</p>
						</div>
						<StartButton
							label={isGeneratingReport ? 'Generating...' : 'Generate Skill Gap Report'}
							onClick={handleGenerateReport}
							disabled={isGeneratingReport || isLoading}
						/>
					</div>

					{reportError ? (
						<div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
							{reportError}
						</div>
					) : null}

					{report ? (
						<div className="mt-5 grid gap-4">
							<section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
								<h3 className="mb-2 text-base font-semibold text-slate-900">Strengths</h3>
								{renderList(report.strengths, 'No strengths identified yet.')}
							</section>

							<section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
								<h3 className="mb-2 text-base font-semibold text-slate-900">Weaknesses</h3>
								{renderList(report.weaknesses, 'No weaknesses identified yet.')}
							</section>

							<section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
								<h3 className="mb-2 text-base font-semibold text-slate-900">Topics to Improve</h3>
								{renderList(report.topics_to_improve, 'No topics to improve identified yet.')}
							</section>

							<section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
								<h3 className="mb-2 text-base font-semibold text-slate-900">Overall Summary</h3>
								<p className="text-sm text-slate-700">
									{report.overall_summary || report.summary || 'No summary available yet.'}
								</p>
							</section>
						</div>
					) : null}
				</div>

				{isLoading && (
					<div className="rounded-xl bg-white p-6 text-slate-600 shadow-sm">Loading sessions...</div>
				)}

				{!isLoading && error && (
					<div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
				)}

				{!isLoading && !error && sessions.length === 0 && (
					<div className="rounded-xl bg-white p-6 text-slate-600 shadow-sm">No interview sessions found yet.</div>
				)}

				{!isLoading && !error && sessions.length > 0 && (
					<div className="grid gap-4 sm:grid-cols-2">
						{sessions.map((session) => (
							<article key={session.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
								{(() => {
									const rawFeedback = session.feedback || ''
									const isExpanded = expandedSessionIds.includes(session.id)
									const canExpand = isLongFeedback(rawFeedback)
									const shownFeedback = isExpanded ? rawFeedback : shortenFeedback(rawFeedback)

									return (
										<>
								<div className="mb-3 flex items-center justify-between gap-3">
									<span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
										Score: {session.score ?? 'N/A'}/10
									</span>
									<span className="text-xs text-slate-500">{formatDate(session.created_at)}</span>
								</div>

								<h2 className="mb-2 text-base font-semibold text-slate-900">{session.question || 'No question'}</h2>
								<p className="text-sm text-slate-600">{shownFeedback || 'No feedback available.'}</p>
								{canExpand ? (
									<button
										type="button"
										onClick={() => toggleSessionFeedback(session.id)}
										className="mt-2 inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-200"
									>
										<span aria-hidden="true">{isExpanded ? '▴' : '▾'}</span>
										{isExpanded ? 'Reduce' : 'Expand'}
									</button>
								) : null}
								<button
									type="button"
									onClick={() => handleDeleteSession(session.id)}
									disabled={deletingSessionId === session.id}
									className="mt-4 inline-flex rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
								>
									{deletingSessionId === session.id ? 'Deleting...' : 'Delete'}
								</button>
										</>
									)
								})()}
							</article>
						))}
					</div>
				)}
			</div>
		</main>
	)
}
