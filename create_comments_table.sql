-- Run this in your Supabase SQL Editor to fix the missing table error

create table if not exists public.order_comments (
  id uuid not null default gen_random_uuid (),
  order_id text not null,
  user_id text not null,
  user_name text not null,
  content text not null,
  created_at timestamp with time zone not null default now(),
  constraint order_comments_pkey primary key (id),
  constraint order_comments_order_id_fkey foreign key (order_id) references orders (id) on delete cascade
);

-- Enable RLS
alter table public.order_comments enable row level security;

-- Policies
create policy "Enable read access for all users" on public.order_comments for select using (true);
create policy "Enable insert access for authenticated users" on public.order_comments for insert with check (true);
