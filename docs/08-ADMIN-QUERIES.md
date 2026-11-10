# 08 — Truy Vấn Quản Trị & Giám Sát Gian Lận (Internal Admin Queries)

Tài liệu tập hợp các câu truy vấn SQL chuẩn cho người vận hành game (Admin/Operator) truy cập trực tiếp qua Supabase SQL Editor hoặc `psql` để giám sát cờ gian lận (`cheat_flags`) và vết kiểm toán (`audit_log`).

---

## 1. Giám sát cờ gian lận (`cheat_flags`)

### 1.1. Danh sách các cờ đang mở (Open flags) theo mức độ nghiêm trọng
```sql
select
  cf.id,
  cf.created_at,
  cf.player_id,
  p.display_name,
  cf.kind,
  cf.severity,
  cf.status,
  cf.evidence
from public.cheat_flags cf
left join public.profiles p on p.id = cf.player_id
where cf.status = 'open'
order by cf.severity desc, cf.created_at desc
limit 50;
```

### 1.2. Thống kê số lượng cờ theo phân loại vi phạm
```sql
select
  kind,
  severity,
  count(*) as total_occurrences,
  count(distinct player_id) as affected_players
from public.cheat_flags
group by kind, severity
order by total_occurrences desc;
```

### 1.3. Cập nhật trạng thái cờ sau khi kiểm tra
```sql
-- Đánh dấu cờ đã xem xét (bỏ qua nếu vô hại)
update public.cheat_flags
set status = 'dismissed'
where id = 'FLAG_UUID_HERE';

-- Đánh dấu cờ xác nhận gian lận
update public.cheat_flags
set status = 'reviewed'
where id = 'FLAG_UUID_HERE';
```

---

## 2. Kiểm toán vết kiểm soát (`audit_log`)

### 2.1. Tra cứu toàn bộ hành vi quan trọng của một người chơi
```sql
select
  id,
  created_at,
  action,
  details,
  request_id,
  ip_hash
from public.audit_log
where actor_id = 'PLAYER_UUID_HERE'
order by created_at desc
limit 100;
```

### 2.2. Danh sách hành tinh vừa tiến hóa mốc 2 (`planet.evolve`) trong 24h qua
```sql
select
  al.created_at,
  al.actor_id,
  p.display_name,
  al.details->>'planet_id' as planet_id,
  al.details->>'old_stage' as old_stage,
  al.details->>'new_stage' as new_stage
from public.audit_log al
left join public.profiles p on p.id = al.actor_id
where al.action = 'planet.evolve'
  and al.created_at >= now() - interval '24 hours'
order by al.created_at desc;
```

---

## 3. Kiểm tra toàn vẹn tài nguyên thủ công (`verify_planet_integrity`)

Hàm `verify_planet_integrity` tự động đối chiếu số dư hiện tại trong `resource_balances` với tổng delta phát sinh từ `resource_ledger` (append-only ledger).

```sql
-- Chạy kiểm toán cho một hành tinh cụ thể
select public.verify_planet_integrity('PLANET_UUID_HERE');

-- Truy vấn đối soát nhanh sai lệch giữa số dư và sổ cái cho mọi hành tinh
select
  rb.planet_id,
  rb.resource_key,
  rb.amount as current_balance,
  coalesce(sum(rl.delta), 0) as ledger_total,
  rb.amount - coalesce(sum(rl.delta), 0) as discrepancy
from public.resource_balances rb
left join public.resource_ledger rl
  on rl.planet_id = rb.planet_id and rl.resource_key = rb.resource_key
group by rb.planet_id, rb.resource_key, rb.amount
having abs(rb.amount - coalesce(sum(rl.delta), 0)) > 0.01
order by discrepancy desc;
```
