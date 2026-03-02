import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';

const COLORS = ['red', 'blue', 'green', 'yellow'];
const LEVEL_TARGETS = [5, 10, 15, 20, Infinity];
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

function shuffled(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build a bag of 200 colors from shuffled 8-color chunks (2 of each color per chunk).
// This prevents streaky runs that pure Math.random() produces with only 4 colors,
// while keeping each short span feeling unpredictable.
function createColorBag() {
  const bag = [];
  for (let i = 0; i < 25; i++) bag.push(...shuffled([...COLORS, ...COLORS]));
  return bag;
}

const SimonGame = () => {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('simon-game-mode') || 'levels';
  });
  const [level, setLevel] = useState(() => {
    const saved = localStorage.getItem('simon-game-level');
    return saved ? JSON.parse(saved) : 1;
  });
  const [sequence, setSequence] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [gameCount, setGameCount] = useState(() => {
    const saved = localStorage.getItem('simon-game-count');
    return saved ? JSON.parse(saved) : 0;
  });
  const [gameHistory, setGameHistory] = useState(() => {
    const saved = localStorage.getItem('simon-game-history');
    return saved ? JSON.parse(saved) : [];
  });
  const [levelHistory, setLevelHistory] = useState(() => {
    const saved = localStorage.getItem('simon-game-level-history');
    return saved ? JSON.parse(saved) : [];
  });
  const [gameOver, setGameOver] = useState(false);
  const [lastWon, setLastWon] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [activeColors, setActiveColors] = useState(new Set());

  const sequenceRef = useRef([]);
  const playerSequenceRef = useRef([]);
  const colorBagRef = useRef(createColorBag());

  useEffect(() => {
    localStorage.setItem('simon-game-history', JSON.stringify(gameHistory));
    localStorage.setItem('simon-game-count', JSON.stringify(gameCount));
  }, [gameHistory, gameCount]);

  useEffect(() => {
    localStorage.setItem('simon-game-mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('simon-game-level', JSON.stringify(level));
    localStorage.setItem('simon-game-level-history', JSON.stringify(levelHistory));
  }, [level, levelHistory]);

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
    setLastWon(won);
    setTimeLeft(null);
    setIsFlashing(false);
    if (mode === 'levels') {
      setLevelHistory(prev => [...prev, { level, score: currentScore, won }]);
      if (won && level < 5) {
        setLevel(prev => prev + 1);
      }
    } else {
      setGameHistory(prev => [...prev, {
        gameNumber: gameCount + 1,
        score: currentScore,
        won
      }]);
      setGameCount(prev => prev + 1);
    }
  }, [gameCount, currentScore, mode, level]);

  const timeoutGame = useCallback(() => {
    playTimeoutSound();
    endGame(false);
  }, [playTimeoutSound, endGame]);

  const addToSequence = useCallback(() => {
    if (colorBagRef.current.length === 0) {
      colorBagRef.current = createColorBag();
    }
    const newColor = colorBagRef.current.pop();
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
      const target = mode === 'levels' ? LEVEL_TARGETS[level - 1] : 20;
      if (currentSequence.length >= target) {
        endGame(true);
        return;
      }
      setTimeout(() => {
        playerSequenceRef.current = [];
        addToSequence();
      }, 1000);
    }
  }, [isShowingSequence, isPlaying, playTone, endGame, addToSequence, mode, level]);

  const startNewGame = () => {
    if (mode === 'freeplay' && gameCount >= 10) return;
    playStartButtonSound();
    sequenceRef.current = [];
    setSequence([]);
    playerSequenceRef.current = [];
    setGameOver(false);
    setCurrentScore(0);
    setCountdown(3);
  };

  const switchMode = (newMode) => {
    if (isPlaying || countdown !== null) return;
    setMode(newMode);
    setGameOver(false);
  };

  const getLevelBest = () => {
    const entries = levelHistory.filter(e => e.level === level);
    if (entries.length === 0) return 0;
    return Math.max(...entries.map(e => e.score));
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

  const levelTarget = LEVEL_TARGETS[level - 1];
  const freeplayDone = mode === 'freeplay' && gameCount >= 10;

  return (
    <div className="w-full max-w-lg mx-auto relative">
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

      <div className="p-4 sm:p-6 lg:p-8 border-2 border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800">
        <div className="space-y-4 sm:space-y-6">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-1 mb-2">
              <button
                onClick={() => switchMode('levels')}
                className={`px-3 py-1 text-xs font-semibold rounded-l-full border transition-colors ${
                  mode === 'levels'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Levels
              </button>
              <button
                onClick={() => switchMode('freeplay')}
                className={`px-3 py-1 text-xs font-semibold rounded-r-full border transition-colors ${
                  mode === 'freeplay'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Free Play
              </button>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">Simon Game</h2>

            {mode === 'levels' ? (
              <div className="grid grid-cols-4 gap-4 text-gray-700 dark:text-gray-300">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Level</p>
                  <p className="text-lg font-bold">{level}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Target</p>
                  <p className="text-lg font-bold">{levelTarget === Infinity ? '∞' : levelTarget}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Current</p>
                  <p className={`text-lg font-bold ${isPlaying ? 'text-blue-600 dark:text-blue-400' : ''}`}>{currentScore}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Best</p>
                  <p className="text-lg font-bold">{getLevelBest()}</p>
                </div>
              </div>
            ) : (
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
            )}
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

            {!isPlaying && countdown === null && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg gap-3">
                {gameOver && (
                  <div className="text-center bg-white/90 dark:bg-gray-800/90 px-4 py-2 rounded-lg">
                    {mode === 'levels' && lastWon ? (
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">Level Complete!</p>
                    ) : (
                      <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">Score: {currentScore}</p>
                    )}
                  </div>
                )}
                <Button
                  onClick={startNewGame}
                  disabled={freeplayDone}
                  className="text-lg px-10 py-6 shadow-lg bg-white text-gray-900 hover:bg-gray-100 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                >
                  {freeplayDone
                    ? 'All Games Completed'
                    : mode === 'levels'
                      ? (gameOver && !lastWon ? `Retry Level ${level}` : `Start Level ${level}`)
                      : (gameCount === 0 ? 'Start Game' : 'Play Again')
                  }
                </Button>
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

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">History</h3>
              {!isPlaying && (mode === 'levels' ? levelHistory.length > 0 : gameHistory.length > 0) && (
                <button
                  onClick={() => {
                    if (mode === 'levels') {
                      setLevelHistory([]);
                      setLevel(1);
                    } else {
                      setGameHistory([]);
                      setGameCount(0);
                    }
                    setGameOver(false);
                  }}
                  className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="h-48 overflow-y-auto">
              {mode === 'levels' ? (
                levelHistory.length > 0 ? (
                  <div className="space-y-1.5 pr-2">
                    {levelHistory.map((entry, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded text-sm text-gray-800 dark:text-gray-100 border-l-4 ${entry.won ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'}`}
                      >
                        Level {entry.level}: Score {entry.score} — {entry.won ? 'Cleared!' : 'Failed'}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                    <p className="text-xs">No games played yet</p>
                  </div>
                )
              ) : (
                gameHistory.length > 0 ? (
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
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimonGame;