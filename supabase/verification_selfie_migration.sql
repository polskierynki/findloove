-- Selfie verification workflow (user submit -> AI score -> admin review)
-- Run in Supabase SQL editor.

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  selfie_storage_path text not null,
  status text not null default 'pending_admin'
    check (status in ('pending_ai', 'pending_admin', 'approved', 'rejected')),
  ai_score numeric(5,4),
  ai_reason text,
  admin_reviewer_id uuid references public.profiles(id) on delete set null,
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists verification_requests_profile_id_idx
  on public.verification_requests(profile_id);

create index if not exists verification_requests_status_idx
  on public.verification_requests(status, created_at desc);

create unique index if not exists verification_requests_one_pending_idx
  on public.verification_requests(profile_id)
  where status in ('pending_ai', 'pending_admin');

create or replace function public.set_verification_request_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists verification_requests_set_updated_at on public.verification_requests;
create trigger verification_requests_set_updated_at
before update on public.verification_requests
for each row execute function public.set_verification_request_updated_at();

alter table public.verification_requests enable row level security;

drop policy if exists "Verification requests own read" on public.verification_requests;
create policy "Verification requests own read"
  on public.verification_requests
  for select
  using (
    profile_id = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  );

drop policy if exists "Verification requests own insert" on public.verification_requests;
create policy "Verification requests own insert"
  on public.verification_requests
  for insert
  with check (profile_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-selfies',
  'verification-selfies',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
