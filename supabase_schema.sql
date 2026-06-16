-- ============================================================
-- ROBLES EDIFICIOS — Schema Supabase
-- Ejecuta este SQL en: Supabase > SQL Editor > New Query
-- ============================================================

-- 1. PROFILES (extiende auth.users)
create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  nombres     text not null,
  apellidos   text not null,
  cargo       text not null default 'Sin cargo',
  rol         text not null default 'viewer',
  activo      boolean default true,
  avatar_url  text,
  created_at  timestamptz default now()
);

-- Trigger: crear perfil automático al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nombres, apellidos, cargo, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombres',   'Nuevo'),
    coalesce(new.raw_user_meta_data->>'apellidos', 'Usuario'),
    coalesce(new.raw_user_meta_data->>'cargo',     'Sin cargo'),
    'viewer'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. PROYECTOS
create table if not exists public.proyectos (
  id                   uuid default gen_random_uuid() primary key,
  nombre               text not null,
  descripcion          text,
  tipo                 text not null default 'residencial',
  estado               text not null default 'planificacion',
  ubicacion            text,
  presupuesto_total    numeric(15,2) default 0,
  presupuesto_gastado  numeric(15,2) default 0,
  fecha_inicio         date,
  fecha_fin_estimada   date,
  fecha_fin_real       date,
  responsable_id       uuid references public.profiles(id),
  created_by           uuid references public.profiles(id),
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- 3. PROYECTO PERSONAL
create table if not exists public.proyecto_personal (
  id              uuid default gen_random_uuid() primary key,
  proyecto_id     uuid references public.proyectos(id) on delete cascade,
  perfil_id       uuid references public.profiles(id) on delete cascade,
  rol_en_proyecto text,
  fecha_ingreso   date default current_date,
  unique(proyecto_id, perfil_id)
);

-- 4. TAREAS
create table if not exists public.tareas (
  id               uuid default gen_random_uuid() primary key,
  proyecto_id      uuid references public.proyectos(id) on delete cascade,
  titulo           text not null,
  descripcion      text,
  estado           text default 'pendiente',
  prioridad        text default 'media',
  asignado_a       uuid references public.profiles(id),
  fecha_vencimiento date,
  completada_at    timestamptz,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz default now()
);

-- 5. MATERIALES
create table if not exists public.materiales (
  id              uuid default gen_random_uuid() primary key,
  nombre          text not null,
  unidad          text not null default 'unidad',
  stock_actual    numeric(10,2) default 0,
  stock_minimo    numeric(10,2) default 0,
  precio_unitario numeric(10,2) default 0,
  proveedor       text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 6. MOVIMIENTOS INVENTARIO
create table if not exists public.movimientos_inventario (
  id             uuid default gen_random_uuid() primary key,
  material_id    uuid references public.materiales(id) on delete cascade,
  proyecto_id    uuid references public.proyectos(id),
  tipo           text not null,
  cantidad       numeric(10,2) not null,
  motivo         text,
  realizado_por  uuid references public.profiles(id),
  created_at     timestamptz default now()
);

-- 7. TRANSACCIONES FINANCIERAS
create table if not exists public.transacciones (
  id               uuid default gen_random_uuid() primary key,
  proyecto_id      uuid references public.proyectos(id),
  tipo             text not null,
  categoria        text,
  descripcion      text not null,
  monto            numeric(15,2) not null,
  fecha            date not null,
  comprobante_url  text,
  registrado_por   uuid references public.profiles(id),
  created_at       timestamptz default now()
);

-- 8. DOCUMENTOS
create table if not exists public.documentos (
  id          uuid default gen_random_uuid() primary key,
  proyecto_id uuid references public.proyectos(id) on delete cascade,
  nombre      text not null,
  tipo        text default 'otro',
  url         text not null,
  tamaño_kb   integer,
  subido_por  uuid references public.profiles(id),
  created_at  timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY — solo usuarios autenticados
-- ============================================================
alter table public.profiles               enable row level security;
alter table public.proyectos              enable row level security;
alter table public.proyecto_personal      enable row level security;
alter table public.tareas                 enable row level security;
alter table public.materiales             enable row level security;
alter table public.movimientos_inventario enable row level security;
alter table public.transacciones          enable row level security;
alter table public.documentos             enable row level security;

-- Política: solo usuarios con sesión activa
do $$ begin
  -- profiles
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='auth_users_only') then
    create policy auth_users_only on public.profiles for all using (auth.role() = 'authenticated');
  end if;
  -- proyectos
  if not exists (select 1 from pg_policies where tablename='proyectos' and policyname='auth_users_only') then
    create policy auth_users_only on public.proyectos for all using (auth.role() = 'authenticated');
  end if;
  -- proyecto_personal
  if not exists (select 1 from pg_policies where tablename='proyecto_personal' and policyname='auth_users_only') then
    create policy auth_users_only on public.proyecto_personal for all using (auth.role() = 'authenticated');
  end if;
  -- tareas
  if not exists (select 1 from pg_policies where tablename='tareas' and policyname='auth_users_only') then
    create policy auth_users_only on public.tareas for all using (auth.role() = 'authenticated');
  end if;
  -- materiales
  if not exists (select 1 from pg_policies where tablename='materiales' and policyname='auth_users_only') then
    create policy auth_users_only on public.materiales for all using (auth.role() = 'authenticated');
  end if;
  -- movimientos_inventario
  if not exists (select 1 from pg_policies where tablename='movimientos_inventario' and policyname='auth_users_only') then
    create policy auth_users_only on public.movimientos_inventario for all using (auth.role() = 'authenticated');
  end if;
  -- transacciones
  if not exists (select 1 from pg_policies where tablename='transacciones' and policyname='auth_users_only') then
    create policy auth_users_only on public.transacciones for all using (auth.role() = 'authenticated');
  end if;
  -- documentos
  if not exists (select 1 from pg_policies where tablename='documentos' and policyname='auth_users_only') then
    create policy auth_users_only on public.documentos for all using (auth.role() = 'authenticated');
  end if;
end $$;

-- ============================================================
-- STORAGE BUCKET para documentos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('robles-docs', 'robles-docs', true)
on conflict (id) do nothing;

create policy "auth upload docs" on storage.objects
  for insert with check (auth.role() = 'authenticated' and bucket_id = 'robles-docs');

create policy "public read docs" on storage.objects
  for select using (bucket_id = 'robles-docs');

create policy "auth delete docs" on storage.objects
  for delete using (auth.role() = 'authenticated' and bucket_id = 'robles-docs');
