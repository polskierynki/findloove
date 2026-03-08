-- Fix RLS policies for profiles table
-- Problem: Brakuje polityki UPDATE, co uniemożliwia edycję profilu

-- Dodaj brakującą politykę UPDATE
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

-- Dodaj politykę DELETE (opcjonalnie, dla kompletności)
drop policy if exists "Users can delete own profile" on public.profiles;
create policy "Users can delete own profile"
  on public.profiles
  for delete
  using (auth.uid() = id);

-- Upewnij się że polityka INSERT pozwala użytkownikom tworzyć własne profile
drop policy if exists "Public insert profiles" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Dodaj politykę dla profile_photos jeśli tabela istnieje
do $$
begin
  if exists (select from pg_tables where tablename = 'profile_photos') then
    -- Enable RLS
    execute 'alter table public.profile_photos enable row level security';
    
    -- Create policies
    execute 'drop policy if exists "Public read photos" on public.profile_photos';
    execute 'create policy "Public read photos" on public.profile_photos for select using (true)';
    
    execute 'drop policy if exists "Users can manage own photos" on public.profile_photos';
    execute 'create policy "Users can manage own photos" on public.profile_photos for all using (auth.uid() = profile_id)';
  end if;
end $$;
