import './App.css'

import { BrowserRouter as Router } from 'react-router-dom';

import SimonGame from './components/SimonGame'

function App() {
	return (
		<Router basename="/simon-game">
			<div className="min-h-screen bg-gray-100 dark:bg-gray-800 p-4">
				<SimonGame />
			</div>
		</Router>
	)
}


export default App
