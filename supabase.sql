-- スキーマ作成（requests / responses / watchers）
create table if not exists public.requests (
  id bigint primary key,
  title text not null,
  category text not null,
  service text not null,
  location text,
  desc text not null,
  budget numeric not null,
  deadline date not null,
  imageUrl text,
  notes text,
  status text,
  createdAt timestamptz not null
);

create table if not exists public.responses (
  id bigint generated always as identity primary key,
  request_id bigint not null references public.requests(id) on delete cascade,
  price numeric not null,
  comment text not null,
  eta text,
  imageUrl text,
  createdAt timestamptz not null
);

create table if not exists public.watchers (
  id bigint generated always as identity primary key,
  request_id bigint not null references public.requests(id) on delete cascade,
  client_id text not null,
  createdAt timestamptz not null
);

-- RLS（ポリシー）簡易設定：匿名追加/削除/参照許可（必要に応じて強化）
alter table public.requests enable row level security;
alter table public.responses enable row level security;
alter table public.watchers enable row level security;

create policy "requests read" on public.requests for select using (true);
create policy "requests insert" on public.requests for insert with check (true);

create policy "responses read" on public.responses for select using (true);
create policy "responses insert" on public.responses for insert with check (true);

create policy "watchers read" on public.watchers for select using (true);
create policy "watchers insert" on public.watchers for insert with check (true);
create policy "watchers delete own" on public.watchers for delete using (true);

-- ストレージバケット（公開）作成
-- Storage > Create bucket: name=uploads, Public=true に設定（GUI推奨）
-- もしくは SQL:
-- select storage.create_bucket('uploads', public := true);

