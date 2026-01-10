'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GAME_DEFINITIONS, GameDefinition } from '@/lib/games/types';
import { Users, Clock, Sparkles, ArrowRight, Zap, Play } from 'lucide-react';

export default function GamesHub() {
  const [selectedGame, setSelectedGame] = useState<GameDefinition | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Zap className="w-10 h-10 text-yellow-400" />
          <h1 className="text-5xl font-black text-white tracking-tight">
            Project Jam
          </h1>
        </div>
        <p className="text-xl text-purple-200 font-medium">
          Family games that spark joy
        </p>
        <p className="text-sm text-purple-300/70 mt-2">
          Pick a game. Scan the code. Play together.
        </p>
      </header>

      {/* Games Grid */}
      <main className="max-w-6xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {GAME_DEFINITIONS.map((game) => (
            <GameCard
              key={game.type}
              game={game}
              onClick={() => setSelectedGame(game)}
            />
          ))}
        </div>

        {/* Coming Soon Note */}
        <div className="mt-12 text-center">
          <p className="text-purple-300/60 text-sm">
            More games coming soon...
          </p>
        </div>
      </main>

      {/* Game Detail Modal */}
      {selectedGame && (
        <GameDetailModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </div>
  );
}

function GameCard({
  game,
  onClick,
}: {
  game: GameDefinition;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-left hover:bg-white/15 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-white/10"
      style={{ '--game-color': game.color } as React.CSSProperties}
    >
      {/* Icon */}
      <div
        className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300"
        style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}
      >
        {game.icon}
      </div>

      {/* Title & Tagline */}
      <h2 className="text-xl font-bold text-white mb-1">{game.name}</h2>
      <p className="text-sm text-purple-200/80 mb-4">{game.tagline}</p>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-purple-300/60">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {game.minPlayers}-{game.maxPlayers}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {game.estimatedTime}
        </span>
      </div>

      {/* Play Arrow */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight
          className="w-6 h-6"
          style={{ color: game.color }}
        />
      </div>

      {/* Accent Border */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 0 2px ${game.color}`,
        }}
      />
    </button>
  );
}

function GameDetailModal({
  game,
  onClose,
}: {
  game: GameDefinition;
  onClose: () => void;
}) {
  const isPlayable = game.type === 'mind-meld' || game.type === 'quick-think';

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-3xl max-w-md w-full p-8 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ '--game-color': game.color } as React.CSSProperties}
      >
        {/* Background Glow */}
        <div
          className="absolute top-0 right-0 w-64 h-64 opacity-20 blur-3xl rounded-full"
          style={{ background: game.color }}
        />

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-6">
            <div
              className="text-6xl mb-4"
              style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}
            >
              {game.icon}
            </div>
            <h2 className="text-3xl font-black text-white mb-2">{game.name}</h2>
            <p className="text-lg text-purple-200" style={{ color: game.color }}>
              {game.tagline}
            </p>
          </div>

          {/* Description */}
          <p className="text-purple-100/80 text-center mb-6">
            {game.description}
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-6 mb-6">
            <div className="text-center">
              <Users className="w-5 h-5 mx-auto mb-1 text-purple-300" />
              <span className="text-sm text-purple-200">
                {game.minPlayers}-{game.maxPlayers} players
              </span>
            </div>
            <div className="text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-purple-300" />
              <span className="text-sm text-purple-200">{game.estimatedTime}</span>
            </div>
          </div>

          {/* Learning Focus */}
          <div className="mb-8">
            <div className="flex items-center gap-2 justify-center mb-3">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-purple-200">You&apos;ll practice</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {game.learningFocus.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-purple-100"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Play Button */}
          {isPlayable ? (
            <Link
              href={`/games/${game.type}`}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold text-white text-lg transition-all hover:scale-[1.02] hover:shadow-lg"
              style={{ background: game.color }}
            >
              <Play className="w-5 h-5" />
              Play Now
            </Link>
          ) : (
            <div className="text-center py-4 text-purple-300/60">
              Coming soon...
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="mt-4 w-full py-2 text-purple-300/60 hover:text-purple-200 text-sm transition-colors"
          >
            Back to games
          </button>
        </div>
      </div>
    </div>
  );
}
