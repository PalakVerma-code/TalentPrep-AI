export default function QuestionBox({ question }) {
	const isError = question.toLowerCase().includes('error') || 
		question.toLowerCase().includes('could not') || 
		question.toLowerCase().includes('quota') ||
		question.toLowerCase().includes('failed')

	if (isError) {
		return (
			<div className="w-full max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
				<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-700">Error</p>
				<h2 className="text-lg font-semibold leading-relaxed text-rose-900">{question}</h2>
			</div>
		)
	}

	return (
		<div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Interview Question</p>
			<h2 className="text-xl font-semibold leading-relaxed text-slate-900">{question}</h2>
		</div>
	)
}
