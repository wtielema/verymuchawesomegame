-- Games
create table games (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  status text not null default 'lobby' check (status in ('lobby', 'active', 'finished')),
  tick_number integer not null default 0,
  next_tick_at timestamptz,
  hostility real not null default 0,
  config jsonb not null default '{}',
  hull_q integer,
  hull_r integer,
  parts_installed integer not null default 0,
  parts_required integer not null default 0,
  launch_countdown integer,
  created_at timestamptz not null default now()
);

-- Players
create table players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  user_id uuid references auth.users(id),
  name text not null,
  avatar text not null default 'default',
  health integer not null default 100,
  energy integer not null default 3,
  max_energy integer not null default 3,
  inventory jsonb not null default '[]',
  equipment jsonb not null default '{}',
  discoveries jsonb not null default '[]',
  position_q integer,
  position_r integer,
  camp_q integer,
  camp_r integer,
  structures jsonb not null default '[]',
  stash jsonb not null default '[]',
  buffs jsonb not null default '{}',
  is_alive boolean not null default true,
  is_winner boolean,
  created_at timestamptz not null default now(),
  unique(game_id, name)
);

-- Hexes
create table hexes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  q integer not null,
  r integer not null,
  biome text not null,
  features jsonb not null default '{}',
  history jsonb not null default '[]',
  ship_part boolean not null default false,
  ruins_loot jsonb,
  unique(game_id, q, r)
);

-- Actions (queued per tick)
create table actions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  tick_number integer not null,
  action_type text not null,
  params jsonb not null default '{}',
  energy_cost integer not null default 1,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Factions
create table factions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  name text not null,
  created_by uuid not null references players(id),
  created_at timestamptz not null default now()
);

create table faction_members (
  faction_id uuid not null references factions(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (faction_id, player_id)
);

create table faction_invites (
  id uuid primary key default gen_random_uuid(),
  faction_id uuid not null references factions(id) on delete cascade,
  invited_player_id uuid not null references players(id) on delete cascade,
  invited_by uuid not null references players(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

-- Tick Reports
create table tick_reports (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  tick_number integer not null,
  report_type text not null default 'tick' check (report_type in ('tick', 'epilogue')),
  narrative text,
  outcomes jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Launch votes
create table launch_votes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  voter_id uuid not null references players(id),
  target_id uuid not null references players(id),
  tick_number integer not null,
  created_at timestamptz not null default now(),
  unique(game_id, voter_id, tick_number)
);

-- Enable Realtime for key tables
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table tick_reports;
alter publication supabase_realtime add table actions;

-- Row Level Security
alter table games enable row level security;
alter table players enable row level security;
alter table hexes enable row level security;
alter table actions enable row level security;
alter table factions enable row level security;
alter table faction_members enable row level security;
alter table faction_invites enable row level security;
alter table tick_reports enable row level security;
alter table launch_votes enable row level security;

-- Basic RLS policies (players can read their own game data)
create policy "Players can read their game" on games for select using (true);
create policy "Players can read players in their game" on players for select using (true);
create policy "Players can read their tick reports" on tick_reports for select
  using (player_id in (select id from players where user_id = auth.uid()));
create policy "Players can read their actions" on actions for select
  using (player_id in (select id from players where user_id = auth.uid()));
