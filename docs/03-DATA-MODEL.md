# 03 — Mô hình dữ liệu (Postgres/Supabase)

Quy ước: `snake_case`, `uuid` khóa chính (`gen_random_uuid()`), `timestamptz` UTC, mọi bảng bật RLS. SQL dưới đây là *phác thảo* để agent dựa vào; migration thật phải qua `/db-migration`.

## 1. Nguyên tắc truy cập
- `authenticated`: chỉ `SELECT` dữ liệu của mình hoặc dữ liệu công khai đã chọn. **Không** ghi trực tiếp bảng game.
- Ghi chỉ qua RPC `SECURITY DEFINER` hoặc Edge Function dùng `service_role`.
- Số dư chỉ đổi qua `commit_effects`, luôn kèm dòng `resource_ledger`.

## 2. Nhóm bảng

### 2.1. Người chơi
```sql
profiles(
  id uuid primary key references auth.users on delete cascade,
  display_name text not null unique check (char_length(display_name) between 3 and 20),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  banned_until timestamptz,
  trust_score int not null default 0,       -- nội bộ, không expose
  locale text not null default 'vi'
)
```
View công khai `public_profiles(id, display_name)`.

### 2.2. Hành tinh
```sql
planets(
  id uuid pk, owner_id uuid not null references profiles,
  name text not null, primary_element text not null check (primary_element in
    ('metal','wood','water','fire','earth','light','dark','thunder')),
  seed bigint not null, stage smallint not null default 1 check (stage between 1 and 5),
  grid_size smallint not null default 12,
  state_version int not null default 0,     -- khóa lạc quan
  shield_until timestamptz, created_at timestamptz not null default now()
)
planet_tiles(planet_id uuid, x smallint, y smallint, element text not null,
  biome text not null, richness smallint not null, primary key(planet_id,x,y))
```

### 2.3. Tài nguyên và sổ cái
```sql
resource_balances(planet_id uuid, resource_key text, amount numeric not null check (amount >= 0),
  rate_per_sec numeric not null default 0 check (rate_per_sec >= 0),
  cap numeric not null, updated_at timestamptz not null default now(),
  primary key(planet_id, resource_key))

resource_ledger(                         -- append-only (trigger chặn UPDATE/DELETE)
  id bigserial primary key, planet_id uuid not null, resource_key text not null,
  delta numeric not null, reason text not null, ref_type text, ref_id uuid,
  idempotency_key uuid not null unique, created_at timestamptz not null default now())
```

### 2.4. Công trình và công việc
```sql
buildings(id uuid pk, planet_id uuid not null, kind text not null, level int not null default 1,
  tile_x smallint, tile_y smallint, unique(planet_id, tile_x, tile_y))
jobs(id uuid pk, planet_id uuid not null, kind text not null check (kind in
  ('build','upgrade','breed','craft','expedition')), payload jsonb not null,
  finish_at timestamptz not null, status text not null default 'running'
  check (status in ('running','done','cancelled')), idempotency_key uuid not null unique)
```

### 2.5. Sinh vật, nguyên liệu, codex
```sql
creatures(id uuid pk, planet_id uuid not null, species_key text not null,
  primary_element text not null, secondary_element text,
  stats jsonb not null,                    -- {qi,guard,agility,harmony,chaos}
  traits text[] not null default '{}' check (cardinality(traits) <= 3),
  generation int not null default 0, inbreeding numeric not null default 0,
  parent_a uuid, parent_b uuid, born_at timestamptz not null default now())

items(id uuid pk, def_key text not null, genome jsonb,   -- genome rỗng với nguyên liệu thô
  created_at timestamptz not null default now())
inventory(planet_id uuid, item_id uuid, qty int not null check (qty >= 0),
  primary key(planet_id, item_id))
codex_entries(player_id uuid, kind text, entry_key text, discovered_at timestamptz default now(),
  primary key(player_id, kind, entry_key))
```

### 2.6. Liên minh và party (chi tiết ở `05-MULTIPLAYER-SOCIAL.md`)
```sql
alliances(id uuid pk, name text unique not null, tag text unique not null check (char_length(tag) between 2 and 5),
  leader_id uuid not null, level int not null default 1, member_cap int not null default 20,
  created_at timestamptz default now())
alliance_members(alliance_id uuid, player_id uuid unique,    -- một người một liên minh
  role text not null check (role in ('leader','officer','member')),
  joined_at timestamptz default now(), contribution numeric default 0, primary key(alliance_id, player_id))
alliance_invites(id uuid pk, alliance_id uuid, invitee_id uuid, expires_at timestamptz, status text)
parties(id uuid pk, leader_id uuid not null, kind text not null, expires_at timestamptz not null)
party_members(party_id uuid, player_id uuid, joined_at timestamptz default now(), primary key(party_id, player_id))
```

### 2.7. Chat
```sql
chat_channels(id uuid pk, kind text not null check (kind in ('global','planet','alliance','party','dm')),
  ref_id uuid,                              -- id liên minh/party/cặp DM
  created_at timestamptz default now(), unique(kind, ref_id))
chat_messages(id bigserial pk, channel_id uuid not null references chat_channels,
  sender_id uuid not null, body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now(), deleted_at timestamptz)
create index on chat_messages(channel_id, id desc);
chat_blocks(blocker_id uuid, blocked_id uuid, primary key(blocker_id, blocked_id))
chat_mutes(player_id uuid, channel_id uuid null, until timestamptz not null, reason text)
chat_reports(id uuid pk, reporter_id uuid, message_id bigint, reason text, status text default 'open')
```

### 2.8. Vận hành và an ninh
```sql
audit_log(id bigserial pk, actor_id uuid, action text not null, details jsonb,
  ip_hash text, request_id uuid, created_at timestamptz default now())
rate_limits(key text primary key, tokens numeric not null, updated_at timestamptz not null)
cheat_flags(id uuid pk, player_id uuid, kind text not null, evidence jsonb, severity smallint,
  status text default 'open', created_at timestamptz default now())
feature_flags(key text primary key, enabled boolean not null, rollout_percent smallint default 100)
```

## 3. Ví dụ RLS
```sql
alter table public.planets enable row level security;
create policy planets_select_owner on public.planets
  for select to authenticated using (owner_id = auth.uid());
-- Cố ý KHÔNG có policy insert/update/delete cho authenticated.

alter table public.chat_messages enable row level security;
create policy chat_messages_select_member on public.chat_messages
  for select to authenticated using (public.is_channel_member(channel_id));
-- Ghi tin nhắn chỉ qua Edge Function chat-send (service_role).
```

## 4. Hàm cam kết hiệu ứng (khung)
```sql
create function public.commit_effects(p_planet uuid, p_expected int, p_effects jsonb, p_idem uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_ver int;
begin
  if v_uid is null then raise exception 'UNAUTHENTICATED'; end if;
  -- idempotent: nếu p_idem đã dùng, trả kết quả cũ
  select state_version into v_ver from public.planets
    where id = p_planet and owner_id = v_uid for update;
  if not found then raise exception 'NOT_OWNER'; end if;
  if v_ver <> p_expected then raise exception 'VERSION_CONFLICT'; end if;
  -- áp từng effect (trừ/cộng số dư + chèn ledger + tạo job...), CHECK DB chặn số âm
  update public.planets set state_version = state_version + 1 where id = p_planet;
  return jsonb_build_object('version', v_ver + 1);
end $$;
revoke execute on function public.commit_effects from public;
```
(Khung này chỉ minh họa; phần áp effect phải viết đầy đủ, có test pgTAP.)

## 5. Lưu trữ và dọn dẹp
- `chat_messages`: giữ 30 ngày (kênh global 7 ngày); job `pg_cron` xóa theo lô để tránh đầy gói miễn phí.
- `audit_log`: giữ 90 ngày. `resource_ledger`: giữ vĩnh viễn bản tóm tắt theo ngày, chi tiết 180 ngày (làm ở P7).
- `jobs` đã `done` > 14 ngày: xóa.

## 6. Quyền riêng tư
- Không lưu IP thô; chỉ `ip_hash` (băm có muối, đổi muối định kỳ).
- Người dùng có thể yêu cầu xóa tài khoản → xóa cascade dữ liệu cá nhân; chat đã gửi ẩn danh hóa (`deleted_user`).
