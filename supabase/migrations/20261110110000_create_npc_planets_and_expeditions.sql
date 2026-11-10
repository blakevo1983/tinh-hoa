-- Migration: NPC Planets, Observatory Integration, and Expedition System (T5.1 & T5.2)
-- Conforms to docs/00-GDD.md section 10, docs/02-ARCHITECTURE.md and Rule 30

-- 1. Create npc_planets table
create table if not exists public.npc_planets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  element text not null check (element in ('metal', 'wood', 'water', 'fire', 'earth', 'light', 'dark', 'thunder')),
  personality text not null check (personality in ('aggressive', 'mercantile', 'reclusive', 'scientific')),
  coord_x int not null,
  coord_y int not null,
  discovered_min_stage int not null default 4,
  description text,
  base_rewards jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Index for spatial or elemental queries
create index if not exists idx_npc_planets_element on public.npc_planets(element);
create index if not exists idx_npc_planets_coords on public.npc_planets(coord_x, coord_y);

-- 2. Create planet_expeditions table
create table if not exists public.planet_expeditions (
  id uuid primary key default gen_random_uuid(),
  planet_id uuid not null references public.planets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  target_npc_id uuid not null references public.npc_planets(id),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'cancelled')),
  cost_resource text not null,
  cost_amount int not null,
  rewards jsonb,
  finish_at timestamptz not null,
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_planet_expeditions_user on public.planet_expeditions(user_id);
create index if not exists idx_planet_expeditions_planet on public.planet_expeditions(planet_id);
create index if not exists idx_planet_expeditions_finish on public.planet_expeditions(finish_at);

-- 3. Seed canonical 8 NPC planets representing the 8 elements & 4 personalities
insert into public.npc_planets (name, element, personality, coord_x, coord_y, discovered_min_stage, description, base_rewards)
values
  ('Kim Cương Tinh', 'metal', 'mercantile', 12, 18, 4, 'Hành tinh quặng kim loại khổng lồ, cư dân ham mê trao đổi quý kim.', '{"metal": 120, "crystal": 20}'::jsonb),
  ('Vạn Mộc Tinh', 'wood', 'scientific', -25, 14, 4, 'Hệ sinh thái rừng nguyên sinh bao phủ, lưu trữ vô số mẫu gen thực vật cổ.', '{"wood": 140, "seed": 30}'::jsonb),
  ('Thủy Triều Tinh', 'water', 'reclusive', -10, -32, 4, 'Đại dương vô tận, các nhà tu hành ẩn dật nghiên cứu dòng năng lượng thanh tịnh.', '{"water": 150, "pearl": 25}'::jsonb),
  ('Hỏa Diệm Tinh', 'fire', 'aggressive', 35, -20, 4, 'Dung nham sôi trào, cư dân hiếu chiến luôn tìm kiếm đối thủ thử thách sức mạnh.', '{"fire": 130, "obsidian": 35}'::jsonb),
  ('Hoàng Thổ Tinh', 'earth', 'mercantile', 5, -8, 4, 'Vùng đất phì nhiêu, các thương đội liên tinh tụ họp buôn bán lương thực và khoáng thạch.', '{"earth": 160, "gem": 20}'::jsonb),
  ('Quang Minh Tinh', 'light', 'scientific', 42, 42, 4, 'Hào quang rực rỡ từ sao mẹ chiếu sáng tri thức công nghệ thiên văn cao cấp.', '{"light": 80, "prism": 15}'::jsonb),
  ('Hắc Ám Tinh', 'dark', 'reclusive', -50, -45, 4, 'Vùng hắc ám yên tĩnh bao phủ, nơi ẩn náu của các sinh vật hắc ám huyền bí.', '{"dark": 80, "shadow_core": 15}'::jsonb),
  ('Lôi Đình Tinh', 'thunder', 'aggressive', 20, -50, 4, 'Sấm sét liên miên ngày đêm, năng lượng plasma tích tụ dày đặc.', '{"thunder": 90, "storm_gem": 15}'::jsonb)
on conflict do nothing;

-- 4. Enable RLS
alter table public.npc_planets enable row level security;
alter table public.planet_expeditions enable row level security;

-- RLS: npc_planets is readable by all authenticated users
create policy "Authenticated users can view NPC planets"
  on public.npc_planets for select
  to authenticated
  using (true);

-- RLS: planet_expeditions is viewable by owner only
create policy "Users can view own expeditions"
  on public.planet_expeditions for select
  to authenticated
  using (user_id = auth.uid());

-- Deny direct write from client (server-authoritative through RPC)
create policy "Deny direct insert on expeditions"
  on public.planet_expeditions for insert
  to authenticated
  with check (false);

create policy "Deny direct update on expeditions"
  on public.planet_expeditions for update
  to authenticated
  using (false);

create policy "Deny direct delete on expeditions"
  on public.planet_expeditions for delete
  to authenticated
  using (false);

-- 5. RPC: start_expedition
create or replace function public.start_expedition(
  p_planet_id uuid,
  p_target_npc_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_planet record;
  v_npc record;
  v_has_observatory boolean;
  v_ongoing_expedition record;
  v_cost_amount int := 50;
  v_current_balance record;
  v_distance numeric;
  v_duration_seconds int;
  v_finish_at timestamptz;
  v_expedition_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  -- 1. Verify planet ownership and stage >= 4
  select * into v_planet
  from public.planets
  where id = p_planet_id and owner_id = v_caller_id;

  if v_planet is null then
    raise exception 'PLANET_NOT_FOUND' using errcode = '40001';
  end if;

  if v_planet.stage < 4 then
    raise exception 'OBSERVATORY_STAGE_REQUIRED' using errcode = '40002';
  end if;

  -- 2. Verify Observatory building exists on planet
  select exists (
    select 1
    from public.building_instances
    where planet_id = p_planet_id
      and building_type = 'observatory'
  ) into v_has_observatory;

  if not v_has_observatory then
    raise exception 'OBSERVATORY_NOT_CONSTRUCTED' using errcode = '40003';
  end if;

  -- 3. Verify target NPC planet exists
  select * into v_npc
  from public.npc_planets
  where id = p_target_npc_id;

  if v_npc is null then
    raise exception 'TARGET_NPC_NOT_FOUND' using errcode = '40004';
  end if;

  -- 4. Check for active ongoing expedition
  select * into v_ongoing_expedition
  from public.planet_expeditions
  where planet_id = p_planet_id
    and status = 'in_progress'
    and finish_at > now();

  if v_ongoing_expedition is not null then
    raise exception 'EXPEDITION_ALREADY_IN_PROGRESS' using errcode = '40005';
  end if;

  -- 5. Deduct launch fuel (50 units of the target NPC's complementary element or base element)
  select * into v_current_balance
  from public.resource_balances
  where planet_id = p_planet_id and resource_key = v_planet.element
  for update;

  if v_current_balance is null or v_current_balance.amount < v_cost_amount then
    raise exception 'INSUFFICIENT_LAUNCH_RESOURCES' using errcode = '40006';
  end if;

  update public.resource_balances
  set amount = amount - v_cost_amount, updated_at = now()
  where planet_id = p_planet_id and resource_key = v_planet.element;

  -- Record to resource_ledger
  insert into public.resource_ledger (
    planet_id,
    user_id,
    resource_key,
    delta,
    balance_after,
    source,
    idempotency_key
  )
  values (
    p_planet_id,
    v_caller_id,
    v_planet.element,
    -v_cost_amount,
    v_current_balance.amount - v_cost_amount,
    'expedition_launch',
    'exp_launch_' || gen_random_uuid()::text
  );

  -- 6. Calculate flight duration based on Euclidean distance
  v_distance := sqrt(power(v_npc.coord_x, 2) + power(v_npc.coord_y, 2));
  -- Base 60s + 1s per 2 coordinates distance, capped at 300s
  v_duration_seconds := least(300, greatest(60, floor(60 + v_distance / 2)))::int;
  v_finish_at := now() + (v_duration_seconds || ' seconds')::interval;

  -- 7. Insert expedition record
  insert into public.planet_expeditions (
    planet_id,
    user_id,
    target_npc_id,
    status,
    cost_resource,
    cost_amount,
    finish_at
  )
  values (
    p_planet_id,
    v_caller_id,
    p_target_npc_id,
    'in_progress',
    v_planet.element,
    v_cost_amount,
    v_finish_at
  )
  returning id into v_expedition_id;

  return jsonb_build_object(
    'success', true,
    'expedition_id', v_expedition_id,
    'target_name', v_npc.name,
    'duration_seconds', v_duration_seconds,
    'finish_at', v_finish_at
  );
end;
$$;

grant execute on function public.start_expedition(uuid, uuid) to authenticated;

-- 6. RPC: settle_expedition
create or replace function public.settle_expedition(p_expedition_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_expedition record;
  v_npc record;
  v_rewards jsonb;
  v_elem_key text;
  v_elem_val text;
  v_elem_amount int;
  v_planet_balance record;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  -- 1. Lock and retrieve expedition record
  select * into v_expedition
  from public.planet_expeditions
  where id = p_expedition_id and user_id = v_caller_id
  for update;

  if v_expedition is null then
    raise exception 'EXPEDITION_NOT_FOUND' using errcode = '40001';
  end if;

  if v_expedition.status <> 'in_progress' then
    raise exception 'EXPEDITION_ALREADY_SETTLED' using errcode = '40007';
  end if;

  if v_expedition.finish_at > now() then
    raise exception 'EXPEDITION_NOT_FINISHED' using errcode = '40008';
  end if;

  -- 2. Retrieve NPC info
  select * into v_npc
  from public.npc_planets
  where id = v_expedition.target_npc_id;

  if v_npc is null then
    raise exception 'TARGET_NPC_NOT_FOUND' using errcode = '40004';
  end if;

  v_rewards := v_npc.base_rewards;

  -- 3. Deposit rewards into planet resource balance
  for v_elem_key, v_elem_val in select * from jsonb_each_text(v_rewards) loop
    v_elem_amount := v_elem_val::int;

    select * into v_planet_balance
    from public.resource_balances
    where planet_id = v_expedition.planet_id and resource_key = v_elem_key
    for update;

    if v_planet_balance is not null then
      update public.resource_balances
      set amount = least(amount + v_elem_amount, v_planet_balance.cap),
          updated_at = now()
      where planet_id = v_expedition.planet_id and resource_key = v_elem_key;

      insert into public.resource_ledger (
        planet_id,
        user_id,
        resource_key,
        delta,
        balance_after,
        source,
        idempotency_key
      )
      values (
        v_expedition.planet_id,
        v_caller_id,
        v_elem_key,
        v_elem_amount,
        least(v_planet_balance.amount + v_elem_amount, v_planet_balance.cap),
        'expedition_reward',
        'exp_reward_' || v_expedition.id::text || '_' || v_elem_key
      );
    end if;
  end loop;

  -- 4. Mark expedition as completed
  update public.planet_expeditions
  set status = 'completed',
      settled_at = now(),
      rewards = v_rewards
  where id = p_expedition_id;

  return jsonb_build_object(
    'success', true,
    'expedition_id', p_expedition_id,
    'target_name', v_npc.name,
    'rewards', v_rewards
  );
end;
$$;

grant execute on function public.settle_expedition(uuid) to authenticated;
