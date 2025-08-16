import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';

const SimonGame = () => {
  const [sequence, setSequence] = useState([]);
  const [playerSequence, setPlayerSequence] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [gameCount, setGameCount] = useState(0);
  const [gameHistory, setGameHistory] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isFlashing, setIsFlashing] = useState(false);

  const colors = useMemo(() => ['red', 'blue', 'green', 'yellow'], []);
  const colorMap = useMemo(() => ({
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500'
  }), []);

  const soundMap = useMemo(() => ({
    red: 261.63,    // C4
    blue: 329.63,   // E4
    green: 392.00,  // G4
    yellow: 523.25  // C5
  }), []);

  const playSound = (frequency) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gainNode.gain.value = 0.1;

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);

    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
    }, 500);
  };

  const playStartButtonSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'square';
    oscillator.frequency.value = 440; // A4
    gainNode.gain.value = 0.05;

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.2);

    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
    }, 200);
  };

  const playCountdownSound = (count) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'triangle';
    // Higher pitch for countdown numbers, lower for "Go!"
    oscillator.frequency.value = count > 0 ? 800 : 600;
    gainNode.gain.value = 0.08;

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.3);

    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
    }, 300);
  };

  const playTimeoutSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 200; // Low, ominous tone
    gainNode.gain.value = 0.1;

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.8);

    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
    }, 800);
  };

  const startTimer = useCallback(() => {
    setTimeLeft(6); // 6 seconds to respond
    setIsFlashing(false);
  }, []);

  const timeoutGame = useCallback(() => {
    playTimeoutSound();
    endGame(false);
  }, []);

  const addToSequence = useCallback(() => {
    const newColor = colors[Math.floor(Math.random() * colors.length)];
    setSequence(prev => [...prev, newColor]);
    setCurrentScore(prev => prev + 1);
  }, [colors]);

  const playSequence = useCallback(async () => {
    setIsShowingSequence(true);

    // Wait a brief moment before starting sequence
    await new Promise(resolve => setTimeout(resolve, 500));

    for (let i = 0; i < sequence.length; i++) {
      const button = document.querySelector(`[data-color="${sequence[i]}"]`);
      if (button) {
        // Make button fully visible during flash
        button.style.opacity = '1';
        playSound(soundMap[sequence[i]]);

        // Wait longer to show each color
        await new Promise(resolve => setTimeout(resolve, 750));

        // Reset opacity
        button.style.opacity = '0.5';

        // Pause between colors
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }

    setIsShowingSequence(false);
    startTimer(); // Start the countdown timer for player input
  }, [sequence, soundMap, startTimer]);

  const handleColorClick = (color) => {
    if (isShowingSequence || !isPlaying) return;

    // Clear the timer since player made a move
    setTimeLeft(null);
    setIsFlashing(false);

    const button = document.querySelector(`[data-color="${color}"]`);
    if (button) {
      button.style.opacity = '1';
      setTimeout(() => {
        button.style.opacity = '0.5';
      }, 200);
    }

    const newPlayerSequence = [...playerSequence, color];
    setPlayerSequence(newPlayerSequence);
    playSound(soundMap[color]);

    const currentIndex = newPlayerSequence.length - 1;
    if (color !== sequence[currentIndex]) {
      endGame(false);
      return;
    }

    if (newPlayerSequence.length === sequence.length) {
      if (sequence.length === 20) {
        endGame(true);
        return;
      }
      setTimeout(() => {
        setPlayerSequence([]);
        addToSequence();
      }, 1000);
    }
  };

  const startCountdown = () => {
    setCountdown(3);
  };

  const startNewGame = () => {
    if (gameCount >= 10) {
      return;
    }
    playStartButtonSound();
    setSequence([]);
    setPlayerSequence([]);
    setGameOver(false);
    setCurrentScore(0);
    startCountdown();
  };

  useEffect(() => {
    if (countdown === null) return;

    // Play countdown sound
    playCountdownSound(countdown);

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCountdown(null);
      setIsPlaying(true);
      addToSequence();
    }
  }, [countdown, addToSequence]);

  // Timer useEffect for player response time limit
  useEffect(() => {
    if (timeLeft === null || !isPlaying || isShowingSequence) return;

    if (timeLeft <= 3 && timeLeft > 0) {
      // Start flashing when 3 seconds or less remain
      setIsFlashing(true);
      playCountdownSound(timeLeft);
    }

    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      // Time's up!
      timeoutGame();
    }
  }, [timeLeft, isPlaying, isShowingSequence, timeoutGame]);

  const endGame = (won) => {
    setIsPlaying(false);
    setGameOver(true);
    setTimeLeft(null); // Clear any active timer
    setIsFlashing(false);
    setGameHistory(prev => [...prev, {
      gameNumber: gameCount + 1,
      score: currentScore,
      won
    }]);
    setGameCount(prev => prev + 1);
  };

  useEffect(() => {
    if (sequence.length > 0 && isPlaying) {
      playSequence();
    }
  }, [sequence, isPlaying, playSequence]);

  const getAverageScore = () => {
    if (gameHistory.length === 0) return 0;
    return (gameHistory.reduce((acc, game) => acc + game.score, 0) / gameHistory.length).toFixed(1);
  };

  const getHighScore = () => {
    if (gameHistory.length === 0) return 0;
    return Math.max(...gameHistory.map(game => game.score));
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl border-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm relative">
      {/* Fixed Timer Display - Upper Right */}
      {timeLeft !== null && (
        <div className="absolute top-3 right-3 z-10">
          <div className={`px-3 py-1 rounded-full text-sm font-mono font-bold shadow-lg ${
            timeLeft <= 3 
              ? 'bg-red-500 text-white animate-pulse' 
              : 'bg-blue-500 text-white'
          }`}>
            ⏰ {timeLeft}s
          </div>
        </div>
      )}
      
      <CardContent className="p-4 sm:p-6 lg:p-8">
        <div className="space-y-4 sm:space-y-6">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">Simon Game</h2>
            <div className="grid grid-cols-3 gap-4 text-gray-700 dark:text-gray-300">
              <div>
                <p className="font-semibold">Games</p>
                <p>{gameCount}/10</p>
              </div>
              <div>
                <p className="font-semibold">Average</p>
                <p>{getAverageScore()}</p>
              </div>
              <div>
                <p className="font-semibold">High Score</p>
                <p>{getHighScore()}</p>
              </div>
            </div>
          </div>

          <div className="relative max-w-md mx-auto">
            {/* Game Board */}
            <div className={`grid grid-cols-2 gap-4 transition-all duration-300 ${isFlashing ? 'ring-4 ring-red-500 ring-opacity-60' : ''}`}>
              {colors.map(color => (
                <button
                  key={color}
                  data-color={color}
                  disabled={!isPlaying || isShowingSequence}
                  onClick={() => handleColorClick(color)}
                  className={`${colorMap[color]} h-32 rounded-lg opacity-50 transition-opacity duration-200 hover:opacity-75 disabled:cursor-not-allowed`}
                  aria-label={`${color} button`}
                />
              ))}
            </div>

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
                <div className="bg-white dark:bg-gray-800 bg-opacity-95 dark:bg-opacity-95 rounded-xl px-8 py-6 shadow-lg">
                  <span className="text-4xl font-bold text-gray-800 dark:text-gray-100">
                    {countdown > 0 ? countdown : 'Go!'}
                  </span>
                </div>
              </div>
            )}

            {/* Game Over Overlay */}
            {gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
                <div className="bg-white dark:bg-gray-800 bg-opacity-95 dark:bg-opacity-95 rounded-xl px-6 py-4 shadow-lg max-w-xs">
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 text-center">
                    Game Over! Final Score: {currentScore}
                  </p>
                </div>
              </div>
            )}

            {/* Timer Countdown Overlay */}
            {timeLeft !== null && timeLeft <= 3 && timeLeft > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`text-6xl font-bold ${timeLeft === 1 ? 'text-red-600' : timeLeft === 2 ? 'text-orange-500' : 'text-yellow-500'} drop-shadow-lg animate-pulse`}>
                  {timeLeft}
                </div>
              </div>
            )}
          </div>

          <div className="text-center">
            <Button
              onClick={startNewGame}
              disabled={gameCount >= 10 || isPlaying || countdown !== null}
              className="mt-4"
            >
              {gameCount >= 10 ? 'All Games Completed' : 'Start New Game'}
            </Button>
          </div>

          {gameHistory.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-gray-100">Game History</h3>
              <div className="space-y-2">
                {gameHistory.map((game, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded text-gray-800 dark:text-gray-100 ${game.won ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}
                  >
                    Game {game.gameNumber}: Score {game.score} - {game.won ? 'Won!' : 'Lost'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SimonGame;