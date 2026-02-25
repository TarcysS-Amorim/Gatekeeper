
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ROLES
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'doorman');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Security definer functions for RBAC
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','supervisor')
  )
$$;

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =============================================
-- GATE ENTRIES (Controle de Portaria)
-- =============================================
CREATE TYPE public.gate_classification AS ENUM (
  'PRESTADOR_ISENTO', 'VISITANTE', 'CLIENTE', 'FORNECEDOR'
);

CREATE TABLE public.gate_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classification gate_classification NOT NULL DEFAULT 'VISITANTE',
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_time TIME,
  name TEXT NOT NULL,
  company TEXT,
  plate TEXT,
  nf TEXT,
  purchase_order TEXT,
  unit_price NUMERIC(15,2),
  total_price NUMERIC(15,2),
  quantity NUMERIC(15,3),
  net_weight NUMERIC(15,3),
  material TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gate_entries ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_gate_entries_updated_at
  BEFORE UPDATE ON public.gate_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- COST CENTERS
-- =============================================
CREATE TABLE public.cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

-- =============================================
-- EMPLOYEES
-- =============================================
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  registration TEXT UNIQUE,
  department TEXT,
  cost_center_id UUID REFERENCES public.cost_centers(id),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- VEHICLES
-- =============================================
CREATE TYPE public.vehicle_status AS ENUM ('ACTIVE', 'PENDING', 'BLOCKED');

CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT NOT NULL UNIQUE,
  model TEXT,
  color TEXT,
  brand TEXT,
  year INT,
  status vehicle_status NOT NULL DEFAULT 'PENDING',
  employee_id UUID REFERENCES public.employees(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- LOCKERS
-- =============================================
CREATE TYPE public.locker_group AS ENUM ('FEM_A', 'MASC_A', 'MASC_B');

CREATE TABLE public.lockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL,
  locker_group locker_group NOT NULL,
  employee_id UUID REFERENCES public.employees(id),
  allocated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (number, locker_group)
);
ALTER TABLE public.lockers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_lockers_updated_at
  BEFORE UPDATE ON public.lockers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- POWER OUTAGES (Queda de Energia)
-- =============================================
CREATE TABLE public.power_outages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  protocol TEXT,
  start_time TIME NOT NULL,
  return_time TIME,
  duration_minutes INT GENERATED ALWAYS AS (
    CASE WHEN return_time IS NOT NULL
    THEN EXTRACT(EPOCH FROM (return_time - start_time))::INT / 60
    ELSE NULL END
  ) STORED,
  attendant_name TEXT,
  doorman_name TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.power_outages ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_power_outages_updated_at
  BEFORE UPDATE ON public.power_outages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS POLICIES - Profiles
-- =============================================
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES - User Roles
-- =============================================
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES - Gate Entries
-- =============================================
CREATE POLICY "Authenticated can view gate entries" ON public.gate_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert gate entries" ON public.gate_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin/supervisor can update gate entries" ON public.gate_entries FOR UPDATE USING (public.is_admin_or_supervisor(auth.uid()));
CREATE POLICY "Admin can delete gate entries" ON public.gate_entries FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES - Vehicles
-- =============================================
CREATE POLICY "Authenticated can view vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin/supervisor can update vehicles" ON public.vehicles FOR UPDATE USING (public.is_admin_or_supervisor(auth.uid()));
CREATE POLICY "Admin can delete vehicles" ON public.vehicles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES - Employees
-- =============================================
CREATE POLICY "Authenticated can view employees" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/supervisor can manage employees" ON public.employees FOR ALL USING (public.is_admin_or_supervisor(auth.uid()));

-- =============================================
-- RLS POLICIES - Cost Centers
-- =============================================
CREATE POLICY "Authenticated can view cost centers" ON public.cost_centers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage cost centers" ON public.cost_centers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES - Lockers
-- =============================================
CREATE POLICY "Authenticated can view lockers" ON public.lockers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/supervisor can manage lockers" ON public.lockers FOR ALL USING (public.is_admin_or_supervisor(auth.uid()));

-- =============================================
-- RLS POLICIES - Power Outages
-- =============================================
CREATE POLICY "Authenticated can view power outages" ON public.power_outages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert power outages" ON public.power_outages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin/supervisor can update power outages" ON public.power_outages FOR UPDATE USING (public.is_admin_or_supervisor(auth.uid()));
CREATE POLICY "Admin can delete power outages" ON public.power_outages FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- TRIGGER: Auto-create profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
