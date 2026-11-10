-- Migration: RPCs for submitting chat reports and dispatching notifications (T3.6)
-- Conforms to docs/05-MULTIPLAYER-SOCIAL.md, docs/04-SECURITY.md and Rule 30

-- 1. RPC: submit_chat_report
create or replace function public.submit_chat_report(
  p_reported_user_id uuid,
  p_reason text,
  p_message_id uuid default null,
  p_context_snapshot jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reporter_id uuid;
  v_report_id uuid;
begin
  v_reporter_id := auth.uid();
  if v_reporter_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if v_reporter_id = p_reported_user_id then
    raise exception 'CANNOT_REPORT_SELF' using errcode = '40001';
  end if;

  if p_reason is null or char_length(trim(p_reason)) < 3 or char_length(p_reason) > 500 then
    raise exception 'INVALID_REPORT_REASON' using errcode = '40002';
  end if;

  insert into public.chat_reports (
    reporter_id,
    reported_user_id,
    message_id,
    reason,
    context_snapshot,
    status
  )
  values (
    v_reporter_id,
    p_reported_user_id,
    p_message_id,
    trim(p_reason),
    coalesce(p_context_snapshot, '[]'::jsonb),
    'pending'
  )
  returning id into v_report_id;

  return jsonb_build_object(
    'success', true,
    'report_id', v_report_id,
    'status', 'pending'
  );
end;
$$;

grant execute on function public.submit_chat_report(uuid, text, uuid, jsonb) to authenticated;

-- 2. RPC: send_notification (internal/server-authoritative)
create or replace function public.send_notification(
  p_recipient_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notification_id uuid;
begin
  if p_recipient_id is null then
    raise exception 'MISSING_RECIPIENT' using errcode = '40001';
  end if;

  insert into public.notifications (
    recipient_id,
    type,
    title,
    body,
    payload,
    read
  )
  values (
    p_recipient_id,
    p_type,
    p_title,
    p_body,
    coalesce(p_payload, '{}'::jsonb),
    false
  )
  returning id into v_notification_id;

  return jsonb_build_object(
    'success', true,
    'notification_id', v_notification_id
  );
end;
$$;

grant execute on function public.send_notification(uuid, text, text, text, jsonb) to service_role;
