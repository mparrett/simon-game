import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
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

  const colors = ['red', 'blue', 'green', 'yellow'];
  const baseShowColorDelay = 750;
  const basePauseBetweenColorsDelay = 250;
  const speedIncreaseFactor = 0.05;
  const minShowColorDelay = 200;
  const minPauseBetweenColorsDelay = 100;

  const colorMap = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500'
  };

  const soundMap = {
    red: 261.63,    // C4
    blue: 329.63,   // E4
    green: 392.00,  // G4
    yellow: 523.25  // C5
  };

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

  const addToSequence = useCallback(() => {
    const newColor = colors[Math.floor(Math.random() * colors.length)];
    setSequence(prev => [...prev, newColor]);
    setCurrentScore(prev => prev + 1);
  }, []);

  const playSequence = useCallback(async () => {
    setIsShowingSequence(true);

    // Wait a brief moment before starting sequence
    await new Promise(resolve => setTimeout(resolve, 500));

    const currentShowColorDelay = Math.max(minShowColorDelay, baseShowColorDelay / (1 + sequence.length * speedIncreaseFactor));
    const currentPauseBetweenColorsDelay = Math.max(minPauseBetweenColorsDelay, basePauseBetweenColorsDelay / (1 + sequence.length * speedIncreaseFactor));

    for (let i = 0; i < sequence.length; i++) {
      const button = document.querySelector(`[data-color="${sequence[i]}"]`);
      if (button) {
        // Make button fully visible during flash
        button.style.opacity = '1';
        playSound(soundMap[sequence[i]]);

        // Wait longer to show each color
        await new Promise(resolve => setTimeout(resolve, currentShowColorDelay));

        // Reset opacity
        button.style.opacity = '0.5';

        // Pause between colors
        await new Promise(resolve => setTimeout(resolve, currentPauseBetweenColorsDelay));
      }
    }

    setIsShowingSequence(false);
  }, [sequence, baseShowColorDelay, basePauseBetweenColorsDelay, speedIncreaseFactor, minShowColorDelay, minPauseBetweenColorsDelay]);

  const handleColorClick = (color) => {
    if (isShowingSequence || !isPlaying) return;

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
    setSequence([]);
    setPlayerSequence([]);
    setGameOver(false);
    setCurrentScore(0);
    startCountdown();
  };

  useEffect(() => {
    if (countdown === null) return;

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

  const endGame = (won) => {
    setIsPlaying(false);
    setGameOver(true);
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
    <Card className="w-full max-w-2xl mx-auto p-6">
      <CardContent>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Simon Game</h2>
            <div className="grid grid-cols-3 gap-4">
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

          {countdown !== null && (
            <div className="text-center">
              <span className="text-4xl font-bold">
                {countdown > 0 ? countdown : 'Go!'}
              </span>
            </div>
          )}

          {gameOver && (
            <Alert>
              <AlertDescription>
                Game Over! Final Score: {currentScore}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
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
              <h3 className="text-xl font-bold mb-2">Game History</h3>
              <div className="space-y-2">
                {gameHistory.map((game, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded ${game.won ? 'bg-green-100' : 'bg-red-100'}`}
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