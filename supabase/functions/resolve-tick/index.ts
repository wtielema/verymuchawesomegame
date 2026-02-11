// Supabase Edge Function — resolves ticks for active games
// Triggered by cron (every 60 seconds) or manual invocation

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TICK_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find games that need ticking
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('*')
      .eq('status', 'active')
      .lte('next_tick_at', new Date().toISOString());

    if (gamesError) {
      return new Response(JSON.stringify({ error: gamesError.message }), { status: 500 });
    }

    const results = [];

    for (const game of games ?? []) {
      try {
        // Load full game state
        const [playersRes, hexesRes, actionsRes] = await Promise.all([
          supabase.from('players').select('*').eq('game_id', game.id).eq('is_alive', true),
          supabase.from('hexes').select('*').eq('game_id', game.id),
          supabase.from('actions').select('*')
            .eq('game_id', game.id)
            .eq('tick_number', game.tick_number)
            .eq('resolved', false),
        ]);

        const players = playersRes.data ?? [];
        const hexes = hexesRes.data ?? [];
        const actions = actionsRes.data ?? [];

        // --- Resolve tick in-line (Edge Functions can't import local TS) ---
        // This duplicates core logic; in production, bundle tick.ts into the function

        const newTickNumber = game.tick_number + 1;
        const newHostility = Math.min(1, game.hostility + (1 / 28));

        // Process movement
        const moveActions = actions.filter((a: any) => a.action_type === 'move');
        for (const action of moveActions) {
          const player = players.find((p: any) => p.id === action.player_id);
          if (!player) continue;

          const targetHex = hexes.find((h: any) =>
            h.q === action.params.target_q && h.r === action.params.target_r
          );
          if (!targetHex) continue;

          await supabase
            .from('players')
            .update({
              position_q: action.params.target_q,
              position_r: action.params.target_r,
              energy: Math.max(0, player.energy - action.energy_cost),
            })
            .eq('id', player.id);
        }

        // Process gather actions
        const gatherActions = actions.filter((a: any) => a.action_type === 'gather');
        for (const action of gatherActions) {
          const player = players.find((p: any) => p.id === action.player_id);
          if (!player) continue;

          const hex = hexes.find((h: any) =>
            h.q === player.position_q && h.r === player.position_r
          );
          if (!hex) continue;

          // Simple gather: add 2-4 rations
          const inventory = [...(player.inventory || [])];
          const rations = inventory.find((i: any) => i.id === 'rations');
          const amount = 2 + Math.floor(Math.random() * 3);
          if (rations) {
            rations.quantity += amount;
          } else {
            inventory.push({ id: 'rations', quantity: amount });
          }

          await supabase
            .from('players')
            .update({
              inventory,
              energy: Math.max(0, player.energy - action.energy_cost),
            })
            .eq('id', player.id);
        }

        // Survival: consume rations, apply starvation
        for (const player of players) {
          const inventory = [...(player.inventory || [])];
          const rationsIdx = inventory.findIndex((i: any) => i.id === 'rations');
          let health = player.health;

          if (rationsIdx !== -1 && inventory[rationsIdx].quantity > 0) {
            inventory[rationsIdx].quantity -= 1;
            if (inventory[rationsIdx].quantity <= 0) {
              inventory.splice(rationsIdx, 1);
            }
          } else {
            health = Math.max(0, health - 15);
          }

          // Energy recovery
          const atCamp = player.camp_q === player.position_q && player.camp_r === player.position_r;
          const hasShelter = atCamp && (player.structures || []).includes('lean_to');
          const energyGain = hasShelter ? 3 : 2;
          const energy = Math.min(9, player.energy + energyGain);

          await supabase
            .from('players')
            .update({ inventory, health, energy, is_alive: health > 0 })
            .eq('id', player.id);
        }

        // Mark actions as resolved
        await supabase
          .from('actions')
          .update({ resolved: true })
          .eq('game_id', game.id)
          .eq('tick_number', game.tick_number);

        // Generate tick reports
        const reports = players.map((p: any) => ({
          game_id: game.id,
          player_id: p.id,
          tick_number: game.tick_number,
          report_type: 'tick',
          narrative: `Tick ${game.tick_number} resolved. The planet grows more restless.`,
          outcomes: {},
        }));

        if (reports.length > 0) {
          await supabase.from('tick_reports').insert(reports);
        }

        // Update game
        const nextTickAt = new Date(Date.now() + TICK_INTERVAL_MS).toISOString();
        await supabase
          .from('games')
          .update({
            tick_number: newTickNumber,
            hostility: newHostility,
            next_tick_at: nextTickAt,
          })
          .eq('id', game.id);

        results.push({ gameId: game.id, tick: newTickNumber, players: players.length });
      } catch (err) {
        results.push({ gameId: game.id, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ resolved: results.length, results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
