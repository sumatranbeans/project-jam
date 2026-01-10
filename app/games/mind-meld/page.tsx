'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  MIND_MELD_PROMPTS,
  getRandomPrompt,
  normalizeAnswer,
  PLAYER_COLORS,
  Player,
  MindMeldPhase,
  MindMeldResult,
} from '@/lib/games/types';
import {
  Brain,
  Users,
  Clock,
  Trophy,
  ArrowLeft,
  Plus,
  Sparkles,
  Check,
  Crown,
  Zap,
  RotateCcw,
} from 'lucide-react';

// Local player simulation for demo
interface LocalPlayer {
  id: string;
  name: string;
  color: string;
  score: number;
  currentAnswer: string;
  hasSubmitted: boolean;
}

type GamePhase = 'setup' | 'prompt' | 'thinking' | 'reveal' | 'scoring' | 'final';

const THINKING_TIME = 10; // seconds

export default function MindMeldGame() {
  const router = useRouter();

  // Game state
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [players, setPlayers] = useState<LocalPlayer[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds] = useState(5);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [timeLeft, setTimeLeft] = useState(THINKING_TIME);
  const [results, setResults] = useState<MindMeldResult[]>([]);
  const [isPerfectMeld, setIsPerfectMeld] = useState(false);

  // Input refs
  const answerInputRef = useRef<HTMLInputElement>(null);

  // Timer effect
  useEffect(() => {
    if (phase !== 'thinking') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up - force reveal
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

  // Add a player (demo mode)
  const addPlayer = useCallback((name: string) => {
    const newPlayer: LocalPlayer = {
      id: `player-${Date.now()}`,
      name,
      color: PLAYER_COLORS[players.length % PLAYER_COLORS.length],
      score: 0,
      currentAnswer: '',
      hasSubmitted: false,
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
    const prompt = getRandomPrompt(MIND_MELD_PROMPTS, 'medium');
    setCurrentPrompt(prompt);
    setTimeLeft(THINKING_TIME);
    setResults([]);
    setIsPerfectMeld(false);

    // Reset player answers
    setPlayers((prev) =>
      prev.map((p) => ({ ...p, currentAnswer: '', hasSubmitted: false }))
    );

    // Show prompt briefly, then start thinking
    setPhase('prompt');
    setTimeout(() => {
      setPhase('thinking');
    }, 2000);
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

  // Reveal answers and calculate scores
  const handleReveal = useCallback(() => {
    setPhase('reveal');

    // Group answers
    const answerGroups = new Map<string, LocalPlayer[]>();
    players.forEach((player) => {
      const normalized = normalizeAnswer(player.currentAnswer);
      if (!normalized) return; // Skip empty answers

      const group = answerGroups.get(normalized) || [];
      group.push(player);
      answerGroups.set(normalized, group);
    });

    // Calculate results
    const newResults: MindMeldResult[] = [];
    let perfectMeld = false;

    answerGroups.forEach((groupPlayers, answer) => {
      const points = groupPlayers.length >= 2 ? groupPlayers.length : 0;
      const displayAnswer = groupPlayers[0].currentAnswer; // Use original casing

      // Check for perfect meld (all players same answer)
      if (groupPlayers.length === players.length && players.length >= 3) {
        perfectMeld = true;
      }

      newResults.push({
        answer: displayAnswer,
        players: groupPlayers.map((p) => ({
          id: p.id,
          name: p.name,
          avatar: undefined,
          color: p.color,
          score: p.score,
          isHost: false,
          isConnected: true,
          joinedAt: new Date(),
        })),
        points,
        isPerfectMeld: perfectMeld && groupPlayers.length === players.length,
      });
    });

    // Sort by player count (highest matches first)
    newResults.sort((a, b) => b.players.length - a.players.length);

    setResults(newResults);
    setIsPerfectMeld(perfectMeld);

    // Update scores after delay
    setTimeout(() => {
      setPhase('scoring');
      setPlayers((prev) => {
        const updated = [...prev];
        newResults.forEach((result) => {
          result.players.forEach((player) => {
            const idx = updated.findIndex((p) => p.id === player.id);
            if (idx >= 0) {
              updated[idx].score += result.points;
            }
          });
        });
        return updated;
      });
    }, 2000);
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

  // Render based on phase
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-violet-900 to-slate-900">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.push('/games')}
          className="flex items-center gap-2 text-purple-200 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-300" />
          <span className="text-xl font-bold text-white">Mind Meld</span>
        </div>

        {phase !== 'setup' && phase !== 'final' && (
          <div className="flex items-center gap-4 text-purple-200">
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

        {phase === 'prompt' && (
          <PromptPhase prompt={currentPrompt} />
        )}

        {phase === 'thinking' && (
          <ThinkingPhase
            prompt={currentPrompt}
            timeLeft={timeLeft}
            players={players}
            onSubmit={submitAnswer}
            inputRef={answerInputRef}
          />
        )}

        {phase === 'reveal' && (
          <RevealPhase
            prompt={currentPrompt}
            results={results}
            isPerfectMeld={isPerfectMeld}
          />
        )}

        {phase === 'scoring' && (
          <ScoringPhase
            players={players}
            results={results}
            isPerfectMeld={isPerfectMeld}
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
      {/* Instructions */}
      <div className="mb-8">
        <Brain className="w-16 h-16 mx-auto mb-4 text-purple-400" />
        <h1 className="text-4xl font-black text-white mb-3">Mind Meld</h1>
        <p className="text-lg text-purple-200 max-w-md mx-auto">
          Think alike to score points! Everyone answers the same question—match others to win.
        </p>
      </div>

      {/* Add Players */}
      <div className="max-w-sm mx-auto mb-8">
        <div className="flex gap-2 mb-4">
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Enter player name..."
            className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-purple-400/30 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
            maxLength={20}
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="px-4 py-3 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Player List */}
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
                  <span className="text-xs text-purple-300/60">(You)</span>
                )}
              </div>
              <button
                onClick={() => onRemovePlayer(player.id)}
                className="text-purple-300/60 hover:text-red-400 transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Player Count */}
      <div className="flex items-center justify-center gap-2 mb-6 text-purple-200">
        <Users className="w-5 h-5" />
        <span>{players.length} player{players.length !== 1 ? 's' : ''}</span>
        {players.length < 2 && (
          <span className="text-purple-400/60">(need at least 2)</span>
        )}
      </div>

      {/* Start Button */}
      <button
        onClick={onStart}
        disabled={players.length < 2}
        className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 text-white font-bold text-lg hover:from-purple-400 hover:to-violet-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
      >
        Start Game
      </button>
    </div>
  );
}

function PromptPhase({ prompt }: { prompt: string }) {
  return (
    <div className="text-center py-16">
      <div className="mb-6">
        <Brain className="w-12 h-12 mx-auto text-purple-400 animate-pulse" />
      </div>
      <p className="text-purple-200 mb-4">The prompt is...</p>
      <h2 className="text-4xl font-black text-white max-w-lg mx-auto">
        &ldquo;{prompt}&rdquo;
      </h2>
    </div>
  );
}

function ThinkingPhase({
  prompt,
  timeLeft,
  players,
  onSubmit,
  inputRef,
}: {
  prompt: string;
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
              ? 'bg-red-500/20 text-red-300'
              : 'bg-purple-500/20 text-purple-200'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="font-mono text-2xl font-bold">{timeLeft}</span>
        </div>
      </div>

      {/* Prompt */}
      <h2 className="text-3xl font-black text-white mb-8 max-w-lg mx-auto">
        &ldquo;{prompt}&rdquo;
      </h2>

      {/* Answer Inputs for Each Player */}
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
                  placeholder="Type your answer..."
                  className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  maxLength={50}
                />
                <button
                  onClick={() => handleSubmit(player.id)}
                  disabled={!answers[player.id]?.trim()}
                  className="px-4 py-2 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-400 transition-colors disabled:opacity-50"
                >
                  Lock In
                </button>
              </div>
            ) : (
              <div className="text-purple-200 italic">Answer locked in!</div>
            )}
          </div>
        ))}
      </div>

      <p className="text-purple-300/60 text-sm mt-6">
        Think like everyone else thinks!
      </p>
    </div>
  );
}

function RevealPhase({
  prompt,
  results,
  isPerfectMeld,
}: {
  prompt: string;
  results: MindMeldResult[];
  isPerfectMeld: boolean;
}) {
  return (
    <div className="text-center">
      {/* Perfect Meld Celebration */}
      {isPerfectMeld && (
        <div className="mb-8 animate-bounce">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-bold text-xl">
            <Sparkles className="w-6 h-6" />
            PERFECT MELD!
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      )}

      {/* Prompt */}
      <p className="text-purple-200 mb-2">The prompt was...</p>
      <h2 className="text-2xl font-bold text-white mb-8">&ldquo;{prompt}&rdquo;</h2>

      {/* Results */}
      <div className="max-w-lg mx-auto space-y-4">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl ${
              result.points > 0
                ? 'bg-green-500/20 border border-green-500/30'
                : 'bg-red-500/10 border border-red-500/20'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl font-bold text-white">
                {result.answer || '(no answer)'}
              </span>
              <span
                className={`px-3 py-1 rounded-full font-bold ${
                  result.points > 0
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500/30 text-red-300'
                }`}
              >
                +{result.points}
              </span>
            </div>

            <div className="flex gap-2 flex-wrap">
              {result.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10"
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ background: player.color }}
                  />
                  <span className="text-sm text-white">{player.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {results.length === 0 && (
          <div className="text-purple-300/60">No answers submitted</div>
        )}
      </div>
    </div>
  );
}

function ScoringPhase({
  players,
  results,
  isPerfectMeld,
  onContinue,
  isLastRound,
}: {
  players: LocalPlayer[];
  results: MindMeldResult[];
  isPerfectMeld: boolean;
  onContinue: () => void;
  isLastRound: boolean;
}) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold text-white mb-8">
        {isPerfectMeld ? '🎉 What a meld!' : 'Scores'}
      </h2>

      {/* Leaderboard */}
      <div className="max-w-sm mx-auto space-y-3 mb-8">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center justify-between px-4 py-3 rounded-xl ${
              index === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              {index === 0 && <Crown className="w-5 h-5 text-yellow-400" />}
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

      {/* Continue Button */}
      <button
        onClick={onContinue}
        className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 text-white font-bold text-lg hover:from-purple-400 hover:to-violet-400 transition-all hover:scale-105"
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
      {/* Trophy Animation */}
      <div className="mb-6">
        <div className="inline-block animate-bounce">
          <Trophy className="w-20 h-20 text-yellow-400" />
        </div>
      </div>

      {/* Winner Announcement */}
      <h1 className="text-4xl font-black text-white mb-2">
        {winner.name} Wins!
      </h1>
      <p className="text-xl text-purple-200 mb-8">
        with {winner.score} points
      </p>

      {/* Final Leaderboard */}
      <div className="max-w-sm mx-auto space-y-3 mb-8">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center justify-between px-4 py-4 rounded-xl ${
              index === 0
                ? 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border border-yellow-500/50'
                : 'bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-purple-300 w-8">
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

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={onPlayAgain}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 text-white font-bold hover:from-purple-400 hover:to-violet-400 transition-all hover:scale-105"
        >
          <RotateCcw className="w-5 h-5" />
          Play Again
        </button>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-purple-200 font-bold hover:bg-white/20 transition-all"
        >
          <Zap className="w-5 h-5" />
          More Games
        </button>
      </div>
    </div>
  );
}
