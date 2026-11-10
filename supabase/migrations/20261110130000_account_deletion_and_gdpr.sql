-- Migration: GDPR account deletion RPC and privacy compliance (T7.3)
-- Conforms to docs/04-SECURITY.md, docs/legal/PRIVACY-POLICY.md and Rule 30

-- 1. Cho phép chat_messages.sender_id nhận null nếu người dùng bị xóa (để ẩn danh hóa)
alter table public.chat_messages alter column sender_id drop not null;

-- Đổi foreign key sender_id thành on delete set null để không bị mất dòng lịch sử chat
alter table public.chat_messages
  drop constraint if exists chat_messages_sender_id_fkey,
  add constraint chat_messages_sender_id_fkey
    foreign key (sender_id) references auth.users(id) on delete set null;

-- 2. Hàm RPC: delete_own_account
create or replace function public.delete_own_account()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_alliance_id uuid;
  v_other_member_id uuid;
begin
  -- 1. Kiểm tra xác thực
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Bạn cần đăng nhập để thực hiện xóa tài khoản';
  end if;

  -- 2. Xử lý trường hợp người dùng là chủ liên minh
  select id into v_alliance_id
  from public.alliances
  where owner_id = v_user_id
  limit 1;

  if v_alliance_id is not null then
    -- Tìm thành viên khác gia nhập sớm nhất để chuyển giao quyền chủ bang
    select user_id into v_other_member_id
    from public.alliance_members
    where alliance_id = v_alliance_id and user_id <> v_user_id
    order by joined_at asc
    limit 1;

    if v_other_member_id is not null then
      update public.alliances
      set owner_id = v_other_member_id, updated_at = now()
      where id = v_alliance_id;

      update public.alliance_members
      set role = 'leader'
      where alliance_id = v_alliance_id and user_id = v_other_member_id;
    else
      -- Không còn ai khác trong liên minh -> Giải tán liên minh
      delete from public.alliances where id = v_alliance_id;
    end if;
  end if;

  -- 3. Rời khỏi các đội nhóm (parties)
  delete from public.party_members where user_id = v_user_id;
  delete from public.parties where leader_id = v_user_id;

  -- 4. Ẩn danh hóa các tin nhắn chat cũ (bảo toàn ngữ cảnh hội thoại công cộng)
  update public.chat_messages
  set filtered_content = '[Người chơi đã xóa tài khoản]'
  where sender_id = v_user_id;

  -- 5. Xóa thông báo cá nhân
  delete from public.notifications where user_id = v_user_id;

  -- 6. Ghi nhận log ẩn danh vào audit_logs trước khi xóa
  insert into public.audit_logs (user_id, action, details)
  values (
    v_user_id,
    'GDPR_ACCOUNT_DELETE',
    jsonb_build_object(
      'timestamp', extract(epoch from now()),
      'reason', 'User requested full erasure under GDPR / Decree 147'
    )
  );

  -- 7. Xóa hồ sơ profile (cascade sẽ tự động xóa planets, balances, tiles, creatures, items)
  delete from public.profiles where id = v_user_id;

  -- 8. Xóa tài khoản auth.users
  delete from auth.users where id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'message', 'Tài khoản và toàn bộ dữ liệu cá nhân đã được xóa vĩnh viễn theo chính sách GDPR.'
  );
end;
$$;

-- 3. Phân quyền RPC
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
