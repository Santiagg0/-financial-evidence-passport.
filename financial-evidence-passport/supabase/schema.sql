create table if not exists public.entries (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, kind text not null check(kind in ('income','expense')), amount numeric(12,2) not null check(amount>0 and amount<=100000000), note text not null check(char_length(note) between 2 and 100), date date not null, created_at timestamptz not null default now());
alter table public.entries enable row level security;
create policy "read own" on public.entries for select to authenticated using ((select auth.uid())=user_id);
create policy "insert own" on public.entries for insert to authenticated with check ((select auth.uid())=user_id);
create policy "delete own" on public.entries for delete to authenticated using ((select auth.uid())=user_id);
