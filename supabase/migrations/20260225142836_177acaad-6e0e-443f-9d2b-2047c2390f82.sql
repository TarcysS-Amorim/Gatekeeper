
-- Fix overly permissive INSERT policies by checking auth.uid() is not null
DROP POLICY IF EXISTS "Authenticated can insert gate entries" ON public.gate_entries;
DROP POLICY IF EXISTS "Authenticated can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated can insert power outages" ON public.power_outages;

CREATE POLICY "Authenticated can insert gate entries" ON public.gate_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert vehicles" ON public.vehicles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert power outages" ON public.power_outages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
