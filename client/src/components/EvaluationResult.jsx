import { useState } from 'react'

const MAX_TEXT_LENGTH = 160

const normalizeText = (value) => {
	if (typeof value === 'string') {
		return value.trim()
	}

	if (Array.isArray(value)) {
		return value
			.map((item) => (typeof item === 'string' ? item.trim() : String(item || '').trim()))
			.filter(Boolean)
			.join(' ')
	}

	if (value && typeof value === 'object') {
		return Object.values(value)
			.map((item) => (typeof item === 'string' ? item.trim() : String(item || '').trim()))
			.filter(Boolean)
			.join(' ')
	}

	if (value === null || value === undefined) {
		return ''
	}

	return String(value).trim()
}

function ExpandableText({ value }) {
	const [isExpanded, setIsExpanded] = useState(false)
	const text = normalizeText(value)

	if (!text) {
		return null
	}

	const shouldTruncate = text.length > MAX_TEXT_LENGTH
	const shownText = shouldTruncate && !isExpanded ? `${text.slice(0, MAX_TEXT_LENGTH)}...` : text

	return (
		<div>
			<p className="text-sm text-slate-700">{shownText}</p>
			{shouldTruncate ? (
				<button
					type="button"
					onClick={() => setIsExpanded((prev) => !prev)}
					className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-600 underline hover:text-slate-900"
				>
					<span aria-hidden="true">{isExpanded ? '-' : '+'}</span>
					{isExpanded ? 'Reduce' : 'Expand'}
				</button>
			) : null}
		</div>
	)
}

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
					<p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
						<span aria-hidden="true">i</span>
						Feedback
					</p>
					<ExpandableText value={evaluation.feedback} />
				</div>
			)}

			{evaluation.improved_answer && (
				<div>
					<p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
						<span aria-hidden="true">*</span>
						Improved Answer
					</p>
					<ExpandableText value={evaluation.improved_answer} />
				</div>
			)}

			{evaluation.suggestions && (
				<div>
					<p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
						<span aria-hidden="true">{'>'}</span>
						Suggestions
					</p>
					<ExpandableText value={evaluation.suggestions} />
				</div>
			)}
		</div>
	)
}
