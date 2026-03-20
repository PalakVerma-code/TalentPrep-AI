import LoadingSpinner from './LoadingSpinner'

export default function StartButton({ label, onClick, type = 'button', disabled = false, isLoading = false }) {
	return (
		<button
			type={type}
			onClick={onClick}
			disabled={disabled || isLoading}
			className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 inline-flex items-center gap-2"
		>
			{isLoading ? <LoadingSpinner size="sm" /> : null}
			{label}
		</button>
	)
}
