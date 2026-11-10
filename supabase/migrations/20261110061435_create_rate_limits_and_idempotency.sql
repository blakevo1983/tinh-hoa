-- Migration: create command idempotency table and atomic rate limit consumption RPC
-- Conforms to docs/02-ARCHITECTURE.md, docs/04-SECURITY.md and Rule 30

-- 1. command_idempotency table (stores processed command responses to prevent double-execution)
create table if not exists public.command_idempotency (
  idempotency_key text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  response jsonb not null,
  created_at timestamptz not null default now()
);

-- Index on user_id and created_at for TTL retention cleanup
create index if not exists idx_command_idempotency_user_time
  on public.command_idempotency (user_id, created_at desc);

-- Enable RLS immediately (Rule 30)
alter table public.command_idempotency enable row level security;

-- Deny-by-default (only Edge Function service_role accesses idempotency store)
revoke all on public.command_idempotency from anon, authenticated;

-- 2. Atomic Token Bucket Rate Limiting RPC
create or replace function public.consume_rate_limit(
  p_key text,
  p_cost numeric default 1,
  p_capacity numeric default 60,
  p_refill_rate numeric default 1, -- tokens replenished per second
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tokens numeric;
  v_updated_at timestamptz;
  v_elapsed_sec numeric;
  v_new_tokens numeric;
begin
  -- Ensure row exists with full capacity initially
  insert into public.rate_limits (key, tokens, updated_at)
  values (p_key, p_capacity, p_now)
  on conflict (key) do nothing;

  -- Lock row exclusively for atomic evaluation
  select tokens, updated_at into v_tokens, v_updated_at
  from public.rate_limits
  where key = p_key
  for update;

  -- Calculate elapsed seconds since last refill
  v_elapsed_sec := extract(epoch from (p_now - v_updated_at));
  if v_elapsed_sec < 0 then
    v_elapsed_sec := 0;
  end if;

  -- Refill tokens up to maximum capacity
  v_new_tokens := least(p_capacity, v_tokens + (v_elapsed_sec * p_refill_rate));

  -- Check if sufficient tokens exist
  if v_new_tokens < p_cost then
    return false;
  end if;

  -- Consume tokens and update timestamp atomically
  update public.rate_limits
  set tokens = v_new_tokens - p_cost,
      updated_at = p_now
  where key = p_key;

  return true;
end;
$$;

-- Restrict execution to service_role only (Edge Functions)
revoke execute on function public.consume_rate_limit from public;
grant execute on function public.consume_rate_limit to service_role;
