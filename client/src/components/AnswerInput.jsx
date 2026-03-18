import StartButton from './StartButton'

export default function AnswerInput({ answer, onAnswerChange, onSubmit }) {
	const canSubmit = answer.trim().length > 0

	return (
		<form onSubmit={onSubmit} className="mt-4 w-full max-w-xl space-y-3">
			<textarea
				value={answer}
				onChange={(event) => onAnswerChange(event.target.value)}
				placeholder="Type your answer here..."
				rows={6}
				className="w-full rounded-xl border border-slate-300 bg-white p-4 text-slate-800 outline-none ring-0 transition focus:border-slate-500"
			/>
			<StartButton label="Submit Answer" type="submit" disabled={!canSubmit} />
		</form>
	)
}
