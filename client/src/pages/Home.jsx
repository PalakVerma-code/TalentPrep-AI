import { useNavigate } from 'react-router-dom'
import StartButton from '../components/StartButton'
import UserMenu from '../components/UserMenu'

export default function Home({ user }) {
	const navigate = useNavigate()

	return (
		<main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
			<div className="text-center">
				<div className="mb-5 flex justify-center">
					<UserMenu user={user} />
				</div>
				<h1 className="mb-6 text-4xl font-bold text-slate-900">AI Interview Coach</h1>
				<div className="flex flex-wrap justify-center gap-3">
					<StartButton label="Start" onClick={() => navigate('/interview')} />
					<StartButton label="Dashboard" onClick={() => navigate('/dashboard')} />
				</div>
			</div>
		</main>
	)
}
