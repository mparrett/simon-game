import './App.css'

import { HashRouter } from 'react-router-dom'; // Note 1

import SimonGame from './components/SimonGame'

function App() {
	return (
		<HashRouter basename="/simon-game">
			<div className="min-h-screen bg-gray-100 dark:bg-gray-800 p-4">
				<SimonGame />
			</div>
		</HashRouter>
	)
}


export default App
