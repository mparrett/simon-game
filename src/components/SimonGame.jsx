import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';

const COLORS = ['red', 'blue', 'green', 'yellow'];
const COLOR_CLASSES = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500'
};
const COLOR_FREQUENCIES = {
  red: 261.63,    // C4
  blue: 329.63,   // E4
  green: 392.00,  // G4
  yellow: 523.25  // C5
};

const SimonGame = () => {
  const [sequence, setSequence] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [gameCount, setGameCount] = useState(0);
  const [gameHistory, setGameHistory] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [activeColors, setActiveColors] = useState(new Set());

  const sequenceRef = useRef([]);
  const playerSequenceRef = useRef([]);

  const audioContextRef = useRef(null);
  
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playTone = useCallback(({ frequency, type = 'sine', gain = 0.1, duration = 500 }) => {
    try {
      const audioContext = getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gainNode.gain.value = gain;

      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration / 1000);

      setTimeout(() => {
        oscillator.stop();
      }, duration);
    } catch (error) {
      console.warn('Audio playback failed:', error);
    }
  }, [getAudioContext]);

  const playStartButtonSound = useCallback(() => {
    playTone({ frequency: 440, type: 'square', gain: 0.05, duration: 200 });
  }, [playTone]);

  const playCountdownSound = useCallback((count) => {
    playTone({ frequency: count > 0 ? 800 : 600, type: 'triangle', gain: 0.08, duration: 300 });
  }, [playTone]);

  const playTimeoutSound = useCallback(() => {
    playTone({ frequency: 200, type: 'sawtooth', duration: 800 });
  }, [playTone]);

  const startTimer = useCallback(() => {
    setTimeLeft(6); // 6 seconds to respond
    setIsFlashing(false);
  }, []);

  const endGame = useCallback((won) => {
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
  }, [gameCount, currentScore]);

  const timeoutGame = useCallback(() => {
    playTimeoutSound();
    endGame(false);
  }, [playTimeoutSound, endGame]);

  const addToSequence = useCallback(() => {
    const newColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    setSequence(prev => {
      const next = [...prev, newColor];
      sequenceRef.current = next;
      return next;
    });
    setCurrentScore(prev => prev + 1);
  }, []);

  const playSequence = useCallback(async () => {
    setIsShowingSequence(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    const currentSequence = sequenceRef.current;
    for (let i = 0; i < currentSequence.length; i++) {
      const color = currentSequence[i];

      setActiveColors(new Set([color]));
      playTone({ frequency: COLOR_FREQUENCIES[color] });

      await new Promise(resolve => setTimeout(resolve, 750));

      setActiveColors(new Set());

      await new Promise(resolve => setTimeout(resolve, 250));
    }

    setIsShowingSequence(false);
    startTimer();
  }, [startTimer, playTone]);

  const handleColorClick = useCallback((color) => {
    if (isShowingSequence || !isPlaying) return;

    setTimeLeft(null);
    setIsFlashing(false);

    setActiveColors(new Set([color]));
    setTimeout(() => {
      setActiveColors(new Set());
    }, 200);

    const newPlayerSequence = [...playerSequenceRef.current, color];
    playerSequenceRef.current = newPlayerSequence;
    playTone({ frequency: COLOR_FREQUENCIES[color] });

    const currentSequence = sequenceRef.current;
    const currentIndex = newPlayerSequence.length - 1;
    if (color !== currentSequence[currentIndex]) {
      endGame(false);
      return;
    }

    if (newPlayerSequence.length === currentSequence.length) {
      if (currentSequence.length === 20) {
        endGame(true);
        return;
      }
      setTimeout(() => {
        playerSequenceRef.current = [];
        addToSequence();
      }, 1000);
    }
  }, [isShowingSequence, isPlaying, playTone, endGame, addToSequence]);

  const startNewGame = () => {
    if (gameCount >= 10) return;
    playStartButtonSound();
    sequenceRef.current = [];
    setSequence([]);
    playerSequenceRef.current = [];
    setGameOver(false);
    setCurrentScore(0);
    setCountdown(3);
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
  }, [countdown, addToSequence, playCountdownSound]);

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
  }, [timeLeft, isPlaying, isShowingSequence, timeoutGame, playCountdownSound]);

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
    <div className="w-full max-w-lg mx-auto rounded-xl shadow-xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm relative">
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
      
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="space-y-4 sm:space-y-6">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">Simon Game</h2>
            <div className="grid grid-cols-4 gap-4 text-gray-700 dark:text-gray-300">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Games</p>
                <p className="text-lg font-bold">{gameCount}/10</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Current</p>
                <p className={`text-lg font-bold ${isPlaying ? 'text-blue-600 dark:text-blue-400' : ''}`}>{currentScore}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Average</p>
                <p className="text-lg font-bold">{getAverageScore()}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Best</p>
                <p className="text-lg font-bold">{getHighScore()}</p>
              </div>
            </div>
          </div>

          <div className="relative max-w-md mx-auto">
            {/* Game Board */}
            <div className={`grid grid-cols-2 gap-4 transition-all duration-300 ${isFlashing ? 'ring-4 ring-red-500 ring-opacity-60' : ''}`}>
              {COLORS.map(color => (
                <button
                  key={color}
                  data-color={color}
                  disabled={!isPlaying || isShowingSequence}
                  onClick={() => handleColorClick(color)}
                  className={`${COLOR_CLASSES[color]} aspect-square rounded-lg transition-all duration-200 disabled:cursor-not-allowed ${
                    activeColors.has(color) 
                      ? 'opacity-100 brightness-125 shadow-lg shadow-white/50' 
                      : 'opacity-50 hover:opacity-75 hover:shadow-md hover:shadow-white/30'
                  }`}
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

          <div className="mt-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">History</h3>
            <div className="h-48 overflow-y-auto">
              {gameHistory.length > 0 ? (
                <div className="space-y-1.5 pr-2">
                  {gameHistory.map((game, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded text-sm text-gray-800 dark:text-gray-100 border-l-4 ${game.won ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'}`}
                    >
                      Game {game.gameNumber}: Score {game.score} — {game.won ? 'Won!' : 'Lost'}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                  <p className="text-xs">No games played yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimonGame;