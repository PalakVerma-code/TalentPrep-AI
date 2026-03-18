export default function EvaluationResult({ evaluation }) {
	if (evaluation.error) {
		return (
			<div className="mt-4 w-full max-w-xl rounded-xl border border-red-200 bg-red-50 p-6">
				<p className="text-sm font-semibold text-red-700">{evaluation.error}</p>
			</div>
		)
	}

	return (
		<div className="mt-4 w-full max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold text-slate-900">Evaluation</h3>
				<div className="rounded-full bg-blue-100 px-4 py-2 text-center">
					<p className="text-2xl font-bold text-blue-900">{evaluation.score || 'N/A'}</p>
					<p className="text-xs font-semibold text-blue-700">/ 10</p>
				</div>
			</div>

			{evaluation.feedback && (
				<div>
					<p className="mb-2 text-sm font-semibold text-slate-600">Feedback</p>
					<p className="text-sm text-slate-700">{evaluation.feedback}</p>
				</div>
			)}

			{evaluation.improved_answer && (
				<div>
					<p className="mb-2 text-sm font-semibold text-slate-600">Improved Answer</p>
					<p className="text-sm text-slate-700">{evaluation.improved_answer}</p>
				</div>
			)}

			{evaluation.suggestions && (
				<div>
					<p className="mb-2 text-sm font-semibold text-slate-600">Suggestions</p>
					<p className="text-sm text-slate-700">{evaluation.suggestions}</p>
				</div>
			)}
		</div>
	)
}
