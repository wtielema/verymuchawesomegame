'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { Hex, Player } from '@/lib/types';

interface GameCanvasProps {
  hexes: Hex[];
  player: Player;
  otherPlayers: Player[];
  visibleHexKeys: Set<string>;
  hullQ: number;
  hullR: number;
  onHexSelected: (q: number, r: number) => void;
}

export default function GameCanvas({
  hexes,
  player,
  otherPlayers,
  visibleHexKeys,
  hullQ,
  hullR,
  onHexSelected,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const onHexSelectedRef = useRef(onHexSelected);
  onHexSelectedRef.current = onHexSelected;

  const setupEventListeners = useCallback((game: Phaser.Game) => {
    const scene = game.scene.getScene('MapScene');
    if (scene) {
      scene.events.off('hex-selected');
      scene.events.on('hex-selected', (data: { q: number; r: number }) => {
        onHexSelectedRef.current(data.q, data.r);
      });
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    let destroyed = false;

    // Dynamic import of Phaser (browser only)
    Promise.all([
      import('phaser'),
      import('@/game/config'),
    ]).then(([Phaser, { createGameConfig }]) => {
      if (destroyed || !containerRef.current) return;

      const config = createGameConfig('game-container');
      const game = new Phaser.default.Game(config);
      gameRef.current = game;

      // Set initial data via registry
      game.registry.set('hexes', hexes);
      game.registry.set('player', player);
      game.registry.set('otherPlayers', otherPlayers);
      game.registry.set('visibleHexKeys', visibleHexKeys);
      game.registry.set('hullQ', hullQ);
      game.registry.set('hullR', hullR);

      // Wait for scene to be ready
      game.events.on('ready', () => {
        setupEventListeners(game);
      });
    });

    return () => {
      destroyed = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update registry when props change
  useEffect(() => {
    if (!gameRef.current) return;
    gameRef.current.registry.set('hexes', hexes);
    gameRef.current.registry.set('visibleHexKeys', visibleHexKeys);
  }, [hexes, visibleHexKeys]);

  useEffect(() => {
    if (!gameRef.current) return;
    gameRef.current.registry.set('player', player);
  }, [player]);

  useEffect(() => {
    if (!gameRef.current) return;
    gameRef.current.registry.set('otherPlayers', otherPlayers);
  }, [otherPlayers]);

  useEffect(() => {
    if (!gameRef.current) return;
    gameRef.current.registry.set('hullQ', hullQ);
    gameRef.current.registry.set('hullR', hullR);
  }, [hullQ, hullR]);

  // Re-attach event listeners when callback changes
  useEffect(() => {
    if (gameRef.current) {
      setupEventListeners(gameRef.current);
    }
  }, [setupEventListeners]);

  return (
    <div
      id="game-container"
      ref={containerRef}
      className="absolute inset-0 z-0"
    />
  );
}
