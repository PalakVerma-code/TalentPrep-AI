import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import StartButton from '../components/StartButton'
import LoadingSpinner from '../components/LoadingSpinner'
import { apiFetch } from '../lib/api'
import UserMenu from '../components/UserMenu'

const formatDate = (dateString) => {
	if (!dateString) {
		return 'N/A'
	}

	return new Date(dateString).toLocaleString()
}

const truncateText = (text, maxLength = 90) => {
	if (!text || typeof text !== 'string') {
		return 'Untitled session'
	}

	if (text.length <= maxLength) {
		return text
	}

	return `${text.slice(0, maxLength)}...`
}

export default function Dashboard({ user }) {
	const navigate = useNavigate()
	const [sessions, setSessions] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState('')
	const [deletingSessionId, setDeletingSessionId] = useState(null)
	const [selectedSessionId, setSelectedSessionId] = useState(null)
	const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(false)
	const [report, setReport] = useState(null)
	const [isGeneratingReport, setIsGeneratingReport] = useState(false)
	const [reportError, setReportError] = useState('')
	const [expandedCharts, setExpandedCharts] = useState({
		overview: true,
		strengths: true,
		weaknesses: true,
		topics: true,
	})

	const validScores = sessions
		.map((session) => Number(session.score))
		.filter((score) => Number.isFinite(score))

	const averageScore =
		validScores.length > 0
			? (validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(1)
			: null

	const selectedSession = sessions.find((session) => session.id === selectedSessionId) || null

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

				const loadedSessions = data.sessions || []
				setSessions(loadedSessions)
				if (loadedSessions.length > 0) {
					setSelectedSessionId(loadedSessions[0].id)
				}
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

			setSessions((prevSessions) => {
				const nextSessions = prevSessions.filter((session) => session.id !== sessionId)
				if (selectedSessionId === sessionId) {
					setSelectedSessionId(nextSessions[0]?.id || null)
					setIsFeedbackExpanded(false)
				}
				return nextSessions
			})
		} catch {
			setError('Could not delete this session. Please try again.')
		} finally {
			setDeletingSessionId(null)
		}
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

	const toggleChartExpanded = (chartName) => {
		setExpandedCharts((prev) => ({
			...prev,
			[chartName]: !prev[chartName],
		}))
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

	const getDisplayedFeedback = () => {
		const feedback = selectedSession?.feedback || 'No feedback available.'
		if (isFeedbackExpanded || feedback.length <= 220) {
			return feedback
		}

		return `${feedback.slice(0, 220)}...`
	}

	return (
		<main className="min-h-screen bg-slate-100 px-4 py-6">
			<div className="mx-auto mb-4 flex w-full max-w-7xl items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold text-slate-900">Interview Dashboard</h1>
					<p className="text-sm text-slate-600">Your interview history and skill gap analysis</p>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<StartButton label="Back" onClick={() => navigate('/')} />
					<StartButton label="Go to Chat" onClick={() => navigate('/interview')} />
					<UserMenu user={user} />
				</div>
			</div>

			<div className="mx-auto h-[calc(100vh-140px)] w-full max-w-7xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<div className="grid h-full gap-4 lg:grid-cols-[290px_minmax(0,1fr)]">
					<aside className="overflow-hidden border-r border-slate-200">
						<div className="border-b border-slate-200 p-4">
							<p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Chat History</p>
							<p className="mt-1 text-sm text-slate-600">{sessions.length} sessions</p>
						</div>
						<div className="h-[calc(100%-74px)] overflow-y-auto p-2">
							{isLoading ? (
								<div className="flex items-center justify-center p-4">
									<LoadingSpinner size="md" />
								</div>
							) : null}
							{!isLoading && sessions.length === 0 ? (
								<p className="px-3 py-2 text-sm text-slate-500">No interview sessions yet.</p>
							) : null}
							{sessions.map((session) => {
								const isActive = selectedSessionId === session.id
								return (
									<button
										key={session.id}
										type="button"
										onClick={() => {
											setSelectedSessionId(session.id)
											setIsFeedbackExpanded(false)
										}}
										className={`mb-2 w-full rounded-xl border px-3 py-3 text-left transition ${
											isActive
												? 'border-blue-300 bg-blue-50'
												: 'border-transparent bg-slate-50 hover:border-slate-200 hover:bg-slate-100'
										}`}
									>
										<p className="text-xs font-semibold text-slate-500">{formatDate(session.created_at)}</p>
										<p className="mt-1 text-sm font-medium text-slate-800">{truncateText(session.question)}</p>
									</button>
								)
							})}
						</div>
					</aside>

					<section className="flex flex-col gap-4 overflow-y-auto p-5">
						{error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

					<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<h2 className="text-lg font-semibold text-slate-900">Skill Gap Report</h2>
								<p className="text-sm text-slate-500">Generate an AI analysis from your interview history.</p>
							</div>
							<StartButton
								label="Generate Skill Gap Report"
								onClick={handleGenerateReport}
								isLoading={isGeneratingReport}
								disabled={isLoading || sessions.length === 0}
							/>
						</div>

						{reportError ? <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{reportError}</div> : null}

						{report ? (
							<div className="mt-5 space-y-4">
								{/* Overview Section - Pie Chart */}
								<div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
									<button
										type="button"
										onClick={() => toggleChartExpanded('overview')}
										className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition"
									>
										<h3 className="text-base font-semibold text-slate-900">Performance Overview</h3>
										<span className="text-sm text-slate-500">{expandedCharts.overview ? '▴' : '▾'}</span>
									</button>
									{expandedCharts.overview ? (
										<div className="px-5 pb-4 border-t border-slate-200">
											<ResponsiveContainer width="100%" height={250}>
												<PieChart>
													<Pie
														data={[
															{ name: 'Strengths', value: (report.strengths?.length || 0) },
															{ name: 'Weaknesses', value: (report.weaknesses?.length || 0) },
														]}
														cx="50%"
														cy="50%"
														labelLine={false}
														label={({ name, value }) => `${name}: ${value}`}
														outerRadius={80}
														fill="#3b82f6"
														dataKey="value"
													>
														<Cell fill="#10b981" />
														<Cell fill="#ef4444" />
													</Pie>
													<Tooltip />
												</PieChart>
											</ResponsiveContainer>
										</div>
									) : null}
								</div>

								{/* Strengths and Weaknesses Grid */}
								<div className="grid gap-4 md:grid-cols-2">
									{/* Strengths Section */}
									<div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
										<button
											type="button"
											onClick={() => toggleChartExpanded('strengths')}
											className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition"
										>
											<h3 className="text-base font-semibold text-slate-900">Strengths</h3>
											<span className="text-sm text-slate-500">{expandedCharts.strengths ? '▴' : '▾'}</span>
										</button>
										{expandedCharts.strengths ? (
											<div className="px-4 pb-4 border-t border-slate-200">
												{renderList(report.strengths, 'No strengths identified yet.')}
											</div>
										) : null}
									</div>

									{/* Weaknesses Section */}
									<div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
										<button
											type="button"
											onClick={() => toggleChartExpanded('weaknesses')}
											className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition"
										>
											<h3 className="text-base font-semibold text-slate-900">Weaknesses</h3>
											<span className="text-sm text-slate-500">{expandedCharts.weaknesses ? '▴' : '▾'}</span>
										</button>
										{expandedCharts.weaknesses ? (
											<div className="px-4 pb-4 border-t border-slate-200">
												{renderList(report.weaknesses, 'No weaknesses identified yet.')}
											</div>
										) : null}
									</div>
								</div>

								{/* Topics to Improve - Bar Chart */}
								<div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
									<button
										type="button"
										onClick={() => toggleChartExpanded('topics')}
										className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition"
									>
										<h3 className="text-base font-semibold text-slate-900">Topics to Improve</h3>
										<span className="text-sm text-slate-500">{expandedCharts.topics ? '▴' : '▾'}</span>
									</button>
									{expandedCharts.topics ? (
										<div className="px-5 pb-4 border-t border-slate-200">
											{((report.topics_to_improve && report.topics_to_improve.length > 0) ? (
												<ResponsiveContainer width="100%" height={250}>
													<BarChart
														data={report.topics_to_improve.map((topic, index) => ({
															name: topic.slice(0, 20),
															count: 1,
															fullName: topic,
														}))}
													>
														<CartesianGrid strokeDasharray="3 3" />
														<XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
														<YAxis />
														<Tooltip content={(props) => {
															const { active, payload } = props
															return active && payload && payload[0] ? (
																<div className="bg-white p-2 border border-slate-200 rounded shadow">
																	<p className="text-sm font-medium">{payload[0].payload.fullName}</p>
																</div>
															) : null
														}} />
														<Bar dataKey="count" fill="#3b82f6" />
													</BarChart>
												</ResponsiveContainer>
											) : (
												<p className="text-sm text-slate-500">No topics to improve identified yet.</p>
											))}
										</div>
									) : null}
								</div>

								{/* Summary Section */}
								<div className="rounded-lg border border-slate-200 bg-linear-to-br from-blue-50 to-slate-50 p-5">
									<h3 className="mb-3 text-base font-semibold text-slate-900">Overall Summary</h3>
									<p className="text-sm leading-relaxed text-slate-700">{report.overall_summary || report.summary || 'No summary available yet.'}</p>
								</div>
							</div>
						) : null}
					</div>

					<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
						<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
							<div>
								<p className="text-sm text-slate-500">Selected Session</p>
								<p className="text-2xl font-bold text-slate-900">{averageScore ?? 'N/A'}/10 Avg Score</p>
							</div>
							{selectedSession ? (
								<span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Score: {selectedSession.score ?? 'N/A'}/10</span>
							) : null}
						</div>

						{selectedSession ? (
							<>
								<p className="text-xs text-slate-500">{formatDate(selectedSession.created_at)}</p>
								<h3 className="mt-2 text-xl font-semibold leading-relaxed text-slate-900">{selectedSession.question || 'No question'}</h3>
								<div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
									<p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Feedback</p>
									<p className="mt-2 text-sm leading-relaxed text-slate-700">{getDisplayedFeedback()}</p>
									{(selectedSession.feedback || '').length > 220 ? (
										<button
											type="button"
											onClick={() => setIsFeedbackExpanded((prev) => !prev)}
											className="mt-3 inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
										>
											<span aria-hidden="true">{isFeedbackExpanded ? '▴' : '▾'}</span>
											{isFeedbackExpanded ? 'Reduce' : 'Expand'}
										</button>
									) : null}
								</div>
								<button
									type="button"
									onClick={() => handleDeleteSession(selectedSession.id)}
									disabled={deletingSessionId === selectedSession.id}
									className="mt-4 inline-flex rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
								>
									{deletingSessionId === selectedSession.id ? 'Deleting...' : 'Delete Session'}
								</button>
							</>
						) : (
							<p className="text-sm text-slate-500">Select a session from the history sidebar to view details.</p>
						)}
					</div>
				</section>
			</div>
		</div>
		</main>
	)
}
