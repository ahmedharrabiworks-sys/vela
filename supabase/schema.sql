-- ============================================================
-- VELA — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TENANTS
-- ============================================================
create table if not exists tenants (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid references auth.users(id) on delete cascade not null,
  business_name text not null,
  plan        text not null default 'starter' check (plan in ('starter', 'pro', 'premium')),
  stripe_customer_id text,
  created_at  timestamptz default now()
);

-- ============================================================
-- TENANT CONFIG
-- ============================================================
create table if not exists tenant_config (
  tenant_id       uuid primary key references tenants(id) on delete cascade,
  services_json   jsonb default '[]',
  faq_json        jsonb default '[]',
  tone            text default 'professional',
  language        text default 'English',
  booking_rules   jsonb default '{}'
);

-- ============================================================
-- LEADS
-- ============================================================
create table if not exists leads (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid references tenants(id) on delete cascade not null,
  name        text not null,
  phone       text,
  email       text,
  channel     text check (channel in ('instagram', 'whatsapp', 'website')),
  status      text default 'new' check (status in ('new', 'contacted', 'qualified', 'booked', 'client')),
  created_at  timestamptz default now()
);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
create table if not exists conversations (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid references tenants(id) on delete cascade not null,
  lead_id     uuid references leads(id) on delete cascade not null,
  channel     text not null,
  created_at  timestamptz default now()
);

-- ============================================================
-- MESSAGES
-- ============================================================
create table if not exists messages (
  id                uuid primary key default uuid_generate_v4(),
  conversation_id   uuid references conversations(id) on delete cascade not null,
  role              text not null check (role in ('user', 'assistant', 'system')),
  content           text not null,
  created_at        timestamptz default now()
);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
create table if not exists appointments (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid references tenants(id) on delete cascade not null,
  lead_id     uuid references leads(id) on delete cascade not null,
  datetime    timestamptz not null,
  status      text default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  notes       text,
  created_at  timestamptz default now()
);

-- ============================================================
-- AUTOMATIONS
-- ============================================================
create table if not exists automations (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid references tenants(id) on delete cascade not null,
  type        text not null,
  trigger     text not null,
  action      jsonb not null,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table tenants        enable row level security;
alter table tenant_config  enable row level security;
alter table leads          enable row level security;
alter table conversations  enable row level security;
alter table messages       enable row level security;
alter table appointments   enable row level security;
alter table automations    enable row level security;

-- TENANTS: users can only see their own tenant
create policy "tenant_owner" on tenants
  for all using (owner_id = auth.uid());

-- TENANT CONFIG
create policy "tenant_config_owner" on tenant_config
  for all using (
    tenant_id in (select id from tenants where owner_id = auth.uid())
  );

-- LEADS
create policy "leads_owner" on leads
  for all using (
    tenant_id in (select id from tenants where owner_id = auth.uid())
  );

-- CONVERSATIONS
create policy "conversations_owner" on conversations
  for all using (
    tenant_id in (select id from tenants where owner_id = auth.uid())
  );

-- MESSAGES (via conversation → tenant)
create policy "messages_owner" on messages
  for all using (
    conversation_id in (
      select c.id from conversations c
      join tenants t on t.id = c.tenant_id
      where t.owner_id = auth.uid()
    )
  );

-- APPOINTMENTS
create policy "appointments_owner" on appointments
  for all using (
    tenant_id in (select id from tenants where owner_id = auth.uid())
  );

-- AUTOMATIONS
create policy "automations_owner" on automations
  for all using (
    tenant_id in (select id from tenants where owner_id = auth.uid())
  );

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists leads_tenant_id_idx on leads(tenant_id);
create index if not exists leads_status_idx on leads(status);
create index if not exists messages_conversation_id_idx on messages(conversation_id);
create index if not exists appointments_tenant_id_idx on appointments(tenant_id);
create index if not exists appointments_datetime_idx on appointments(datetime);
