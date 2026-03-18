export default function QuestionBox({ question }) {
	const isError = question.toLowerCase().includes('error') || 
		question.toLowerCase().includes('could not') || 
		question.toLowerCase().includes('quota') ||
		question.toLowerCase().includes('failed')

	if (isError) {
		return (
			<div className="w-full max-w-xl rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
				<p className="mb-2 text-sm font-semibold text-red-600">Error</p>
				<h2 className="text-lg font-semibold text-red-700">{question}</h2>
			</div>
		)
	}

	return (
		<div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
			<p className="mb-2 text-sm font-semibold text-slate-500">Interview Question</p>
			<h2 className="text-xl font-semibold text-slate-900">{question}</h2>
		</div>
	)
}
