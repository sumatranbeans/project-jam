'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  QUICK_THINK_CATEGORIES,
  getRandomPrompt,
  normalizeAnswer,
  PLAYER_COLORS,
} from '@/lib/games/types';
import {
  Zap,
  Users,
  Clock,
  Trophy,
  ArrowLeft,
  Plus,
  Check,
  Crown,
  RotateCcw,
  X,
  AlertTriangle,
} from 'lucide-react';

interface LocalPlayer {
  id: string;
  name: string;
  color: string;
  score: number;
  currentAnswer: string;
  hasSubmitted: boolean;
  isUnique: boolean;
  isEliminated: boolean;
}

type GamePhase = 'setup' | 'category' | 'thinking' | 'reveal' | 'scoring' | 'final';

const THINKING_TIME = 8; // seconds - faster for Quick Think!

export default function QuickThinkGame() {
  const router = useRouter();

  // Game state
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [players, setPlayers] = useState<LocalPlayer[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds] = useState(7);
  const [currentCategory, setCurrentCategory] = useState('');
  const [timeLeft, setTimeLeft] = useState(THINKING_TIME);

  // Input refs
  const answerInputRef = useRef<HTMLInputElement>(null);

  // Timer effect
  useEffect(() => {
    if (phase !== 'thinking') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleReveal();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  // Focus input when thinking phase starts
  useEffect(() => {
    if (phase === 'thinking' && answerInputRef.current) {
      answerInputRef.current.focus();
    }
  }, [phase]);

  // Add a player
  const addPlayer = useCallback((name: string) => {
    const newPlayer: LocalPlayer = {
      id: `player-${Date.now()}`,
      name,
      color: PLAYER_COLORS[players.length % PLAYER_COLORS.length],
      score: 0,
      currentAnswer: '',
      hasSubmitted: false,
      isUnique: false,
      isEliminated: false,
    };
    setPlayers((prev) => [...prev, newPlayer]);
  }, [players.length]);

  // Start the game
  const startGame = useCallback(() => {
    if (players.length < 2) return;
    setCurrentRound(1);
    startRound();
  }, [players.length]);

  // Start a new round
  const startRound = useCallback(() => {
    const category = getRandomPrompt(QUICK_THINK_CATEGORIES, 'easy');
    setCurrentCategory(category);
    setTimeLeft(THINKING_TIME);

    // Reset player answers
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        currentAnswer: '',
        hasSubmitted: false,
        isUnique: false,
        isEliminated: false,
      }))
    );

    // Show category briefly, then start thinking
    setPhase('category');
    setTimeout(() => {
      setPhase('thinking');
    }, 1500);
  }, []);

  // Handle answer submission
  const submitAnswer = useCallback((playerId: string, answer: string) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId
          ? { ...p, currentAnswer: answer.trim(), hasSubmitted: true }
          : p
      )
    );
  }, []);

  // Check if all players have submitted
  useEffect(() => {
    if (phase !== 'thinking') return;
    const allSubmitted = players.every((p) => p.hasSubmitted);
    if (allSubmitted && players.length > 0) {
      handleReveal();
    }
  }, [players, phase]);

  // Reveal answers and calculate duplicates
  const handleReveal = useCallback(() => {
    setPhase('reveal');

    // Count occurrences of each answer
    const answerCounts = new Map<string, string[]>();
    players.forEach((player) => {
      const normalized = normalizeAnswer(player.currentAnswer);
      if (!normalized) return;

      const playerList = answerCounts.get(normalized) || [];
      playerList.push(player.id);
      answerCounts.set(normalized, playerList);
    });

    // Mark unique vs eliminated
    setPlayers((prev) =>
      prev.map((p) => {
        const normalized = normalizeAnswer(p.currentAnswer);
        if (!normalized || !p.currentAnswer.trim()) {
          return { ...p, isUnique: false, isEliminated: true };
        }

        const count = answerCounts.get(normalized)?.length || 0;
        const isUnique = count === 1;
        const isEliminated = count > 1;

        return { ...p, isUnique, isEliminated };
      })
    );

    // Update scores after delay
    setTimeout(() => {
      setPhase('scoring');
      setPlayers((prev) =>
        prev.map((p) => ({
          ...p,
          score: p.score + (p.isUnique ? 1 : 0),
        }))
      );
    }, 2500);
  }, [players]);

  // Next round or finish
  const nextRound = useCallback(() => {
    if (currentRound >= totalRounds) {
      setPhase('final');
    } else {
      setCurrentRound((prev) => prev + 1);
      startRound();
    }
  }, [currentRound, totalRounds, startRound]);

  // Play again
  const playAgain = useCallback(() => {
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));
    setCurrentRound(1);
    startRound();
  }, [startRound]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-slate-900">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.push('/games')}
          className="flex items-center gap-2 text-amber-200 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-300" />
          <span className="text-xl font-bold text-white">Quick Think</span>
        </div>

        {phase !== 'setup' && phase !== 'final' && (
          <div className="flex items-center gap-4 text-amber-200">
            <span className="text-sm">
              Round {currentRound}/{totalRounds}
            </span>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {phase === 'setup' && (
          <SetupPhase
            players={players}
            onAddPlayer={addPlayer}
            onRemovePlayer={(id) =>
              setPlayers((prev) => prev.filter((p) => p.id !== id))
            }
            onStart={startGame}
          />
        )}

        {phase === 'category' && (
          <CategoryPhase category={currentCategory} />
        )}

        {phase === 'thinking' && (
          <ThinkingPhase
            category={currentCategory}
            timeLeft={timeLeft}
            players={players}
            onSubmit={submitAnswer}
            inputRef={answerInputRef}
          />
        )}

        {phase === 'reveal' && (
          <RevealPhase
            category={currentCategory}
            players={players}
          />
        )}

        {phase === 'scoring' && (
          <ScoringPhase
            players={players}
            onContinue={nextRound}
            isLastRound={currentRound >= totalRounds}
          />
        )}

        {phase === 'final' && (
          <FinalPhase
            players={players}
            onPlayAgain={playAgain}
            onBack={() => router.push('/games')}
          />
        )}
      </main>
    </div>
  );
}

// ============================================
// Phase Components
// ============================================

function SetupPhase({
  players,
  onAddPlayer,
  onRemovePlayer,
  onStart,
}: {
  players: LocalPlayer[];
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  onStart: () => void;
}) {
  const [newName, setNewName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (newName.trim()) {
      onAddPlayer(newName.trim());
      setNewName('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="text-center">
      <div className="mb-8">
        <Zap className="w-16 h-16 mx-auto mb-4 text-amber-400" />
        <h1 className="text-4xl font-black text-white mb-3">Quick Think</h1>
        <p className="text-lg text-amber-200 max-w-md mx-auto">
          Name something in the category—but don&apos;t say what anyone else says! Unique answers score.
        </p>
      </div>

      <div className="max-w-sm mx-auto mb-8">
        <div className="flex gap-2 mb-4">
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Enter player name..."
            className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-amber-400/30 text-white placeholder-amber-300/50 focus:outline-none focus:ring-2 focus:ring-amber-400"
            maxLength={20}
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="px-4 py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          {players.map((player, index) => (
            <div
              key={player.id}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/10"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: player.color }}
                >
                  {player.name[0].toUpperCase()}
                </div>
                <span className="text-white font-medium">{player.name}</span>
                {index === 0 && (
                  <span className="text-xs text-amber-300/60">(You)</span>
                )}
              </div>
              <button
                onClick={() => onRemovePlayer(player.id)}
                className="text-amber-300/60 hover:text-red-400 transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mb-6 text-amber-200">
        <Users className="w-5 h-5" />
        <span>{players.length} player{players.length !== 1 ? 's' : ''}</span>
        {players.length < 2 && (
          <span className="text-amber-400/60">(need at least 2)</span>
        )}
      </div>

      <button
        onClick={onStart}
        disabled={players.length < 2}
        className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
      >
        Start Game
      </button>
    </div>
  );
}

function CategoryPhase({ category }: { category: string }) {
  return (
    <div className="text-center py-16">
      <div className="mb-6">
        <Zap className="w-12 h-12 mx-auto text-amber-400 animate-pulse" />
      </div>
      <p className="text-amber-200 mb-4 text-lg">Quick! Name...</p>
      <h2 className="text-4xl font-black text-white max-w-lg mx-auto">
        {category}
      </h2>
    </div>
  );
}

function ThinkingPhase({
  category,
  timeLeft,
  players,
  onSubmit,
  inputRef,
}: {
  category: string;
  timeLeft: number;
  players: LocalPlayer[];
  onSubmit: (playerId: string, answer: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleSubmit = (playerId: string) => {
    const answer = answers[playerId] || '';
    if (answer.trim()) {
      onSubmit(playerId, answer);
    }
  };

  return (
    <div className="text-center">
      {/* Timer */}
      <div className="mb-6">
        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
            timeLeft <= 3
              ? 'bg-red-500/20 text-red-300 animate-pulse'
              : 'bg-amber-500/20 text-amber-200'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="font-mono text-2xl font-bold">{timeLeft}</span>
        </div>
      </div>

      {/* Category */}
      <h2 className="text-3xl font-black text-white mb-2 max-w-lg mx-auto">
        {category}
      </h2>
      <p className="text-amber-300 mb-8 flex items-center justify-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Duplicates get eliminated!
      </p>

      {/* Answer Inputs */}
      <div className="max-w-md mx-auto space-y-4">
        {players.map((player, index) => (
          <div
            key={player.id}
            className={`p-4 rounded-xl ${
              player.hasSubmitted
                ? 'bg-green-500/20 border border-green-500/30'
                : 'bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ background: player.color }}
              >
                {player.name[0].toUpperCase()}
              </div>
              <span className="text-white font-medium">{player.name}</span>
              {player.hasSubmitted && (
                <Check className="w-5 h-5 text-green-400 ml-auto" />
              )}
            </div>

            {!player.hasSubmitted ? (
              <div className="flex gap-2">
                <input
                  ref={index === 0 ? inputRef : undefined}
                  type="text"
                  value={answers[player.id] || ''}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [player.id]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit(player.id);
                  }}
                  placeholder="Type something unique..."
                  className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white placeholder-amber-300/50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  maxLength={50}
                />
                <button
                  onClick={() => handleSubmit(player.id)}
                  disabled={!answers[player.id]?.trim()}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-400 transition-colors disabled:opacity-50"
                >
                  Lock In
                </button>
              </div>
            ) : (
              <div className="text-amber-200 italic">Answer locked in!</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RevealPhase({
  category,
  players,
}: {
  category: string;
  players: LocalPlayer[];
}) {
  const uniquePlayers = players.filter((p) => p.isUnique);
  const eliminatedPlayers = players.filter((p) => p.isEliminated);

  return (
    <div className="text-center">
      <p className="text-amber-200 mb-2">Category: {category}</p>
      <h2 className="text-3xl font-bold text-white mb-8">Results!</h2>

      {/* Unique Answers */}
      {uniquePlayers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-green-400 font-bold mb-3 flex items-center justify-center gap-2">
            <Check className="w-5 h-5" />
            Unique Answers (+1 each)
          </h3>
          <div className="max-w-lg mx-auto space-y-2">
            {uniquePlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-green-500/20 border border-green-500/30"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: player.color }}
                  >
                    {player.name[0].toUpperCase()}
                  </div>
                  <span className="text-white font-medium">{player.name}</span>
                </div>
                <span className="text-xl font-bold text-green-400">
                  &ldquo;{player.currentAnswer}&rdquo;
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Eliminated Answers */}
      {eliminatedPlayers.length > 0 && (
        <div>
          <h3 className="text-red-400 font-bold mb-3 flex items-center justify-center gap-2">
            <X className="w-5 h-5" />
            Eliminated (Duplicates)
          </h3>
          <div className="max-w-lg mx-auto space-y-2">
            {eliminatedPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: player.color }}
                  >
                    {player.name[0].toUpperCase()}
                  </div>
                  <span className="text-white font-medium">{player.name}</span>
                </div>
                <span className="text-lg text-red-300 line-through">
                  &ldquo;{player.currentAnswer}&rdquo;
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {uniquePlayers.length === 0 && eliminatedPlayers.length === 0 && (
        <div className="text-amber-300/60">No answers submitted</div>
      )}
    </div>
  );
}

function ScoringPhase({
  players,
  onContinue,
  isLastRound,
}: {
  players: LocalPlayer[];
  onContinue: () => void;
  isLastRound: boolean;
}) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold text-white mb-8">Scores</h2>

      <div className="max-w-sm mx-auto space-y-3 mb-8">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center justify-between px-4 py-3 rounded-xl ${
              index === 0 ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              {index === 0 && <Crown className="w-5 h-5 text-amber-400" />}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ background: player.color }}
              >
                {player.name[0].toUpperCase()}
              </div>
              <span className="text-white font-medium">{player.name}</span>
            </div>
            <span className="text-2xl font-bold text-white">{player.score}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onContinue}
        className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg hover:from-amber-400 hover:to-orange-400 transition-all hover:scale-105"
      >
        {isLastRound ? 'See Final Results' : 'Next Round'}
      </button>
    </div>
  );
}

function FinalPhase({
  players,
  onPlayAgain,
  onBack,
}: {
  players: LocalPlayer[];
  onPlayAgain: () => void;
  onBack: () => void;
}) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  return (
    <div className="text-center py-8">
      <div className="mb-6">
        <div className="inline-block animate-bounce">
          <Trophy className="w-20 h-20 text-amber-400" />
        </div>
      </div>

      <h1 className="text-4xl font-black text-white mb-2">
        {winner.name} Wins!
      </h1>
      <p className="text-xl text-amber-200 mb-8">
        The quickest, most unique thinker!
      </p>

      <div className="max-w-sm mx-auto space-y-3 mb-8">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center justify-between px-4 py-4 rounded-xl ${
              index === 0
                ? 'bg-gradient-to-r from-amber-500/30 to-orange-500/30 border border-amber-500/50'
                : 'bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-amber-300 w-8">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
              </span>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: player.color }}
              >
                {player.name[0].toUpperCase()}
              </div>
              <span className="text-lg text-white font-medium">{player.name}</span>
            </div>
            <span className="text-2xl font-bold text-white">{player.score}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-4 justify-center">
        <button
          onClick={onPlayAgain}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:from-amber-400 hover:to-orange-400 transition-all hover:scale-105"
        >
          <RotateCcw className="w-5 h-5" />
          Play Again
        </button>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-amber-200 font-bold hover:bg-white/20 transition-all"
        >
          <Zap className="w-5 h-5" />
          More Games
        </button>
      </div>
    </div>
  );
}
