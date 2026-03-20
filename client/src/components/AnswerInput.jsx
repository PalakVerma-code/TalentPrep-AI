import { useEffect, useRef, useState } from 'react'
import StartButton from './StartButton'

export default function AnswerInput({ answer, onAnswerChange, onSubmit }) {
	const canSubmit = answer.trim().length > 0
	const [isListening, setIsListening] = useState(false)
	const [speechError, setSpeechError] = useState('')
	const recognitionRef = useRef(null)
	const setAnswer = onAnswerChange

	const startListening = () => {
		setSpeechError('')

		const SpeechRecognition =
			window.SpeechRecognition || window.webkitSpeechRecognition

		if (!SpeechRecognition) {
			setSpeechError('Speech recognition is not supported in this browser.')
			return
		}

		if (recognitionRef.current) {
			recognitionRef.current.stop()
		}

		const recognition = new SpeechRecognition()
		recognition.lang = 'en-US'
		recognition.interimResults = false
		recognition.maxAlternatives = 1

		recognition.onstart = () => {
			setIsListening(true)
		}

		recognition.onresult = (event) => {
			const transcript = event.results?.[0]?.[0]?.transcript || ''
			if (transcript) {
				setAnswer(transcript)
			}
		}

		recognition.onerror = (event) => {
			console.error('Speech recognition error:', event.error)
			if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
				setSpeechError('Microphone permission denied. Please allow mic access and try again.')
				return
			}
			setSpeechError('Speech recognition failed. Please try again.')
		}

		recognition.onend = () => {
			setIsListening(false)
		}

		recognitionRef.current = recognition
		recognition.start()
	}

	useEffect(() => {
		return () => {
			if (recognitionRef.current) {
				recognitionRef.current.stop()
			}
		}
	}, [])

	return (
		<form onSubmit={onSubmit} className="mt-4 w-full max-w-xl space-y-3">
			<textarea
				value={answer}
				onChange={(event) => onAnswerChange(event.target.value)}
				placeholder="Type your answer here..."
				rows={6}
				className="w-full rounded-xl border border-slate-300 bg-white p-4 text-slate-800 outline-none ring-0 transition focus:border-slate-500"
			/>
			<div className="flex flex-wrap items-center gap-3">
				<StartButton
					label={isListening ? 'Listening...' : '🎤 Speak'}
					type="button"
					onClick={startListening}
					disabled={isListening}
				/>
				<StartButton label="Submit Answer" type="submit" disabled={!canSubmit} />
			</div>
			{speechError ? <p className="text-sm text-rose-600">{speechError}</p> : null}
		</form>
	)
}
