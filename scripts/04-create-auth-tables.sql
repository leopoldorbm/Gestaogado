-- Create profiles table for user management
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  empresa VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Add user_id to fazendas table
ALTER TABLE public.fazendas ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS on existing tables
ALTER TABLE public.fazendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastos ENABLE ROW LEVEL SECURITY;

-- Create policies for fazendas
CREATE POLICY "fazendas_select_own" ON public.fazendas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fazendas_insert_own" ON public.fazendas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fazendas_update_own" ON public.fazendas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "fazendas_delete_own" ON public.fazendas FOR DELETE USING (auth.uid() = user_id);

-- Create policies for lotes (through fazenda relationship)
CREATE POLICY "lotes_select_own" ON public.lotes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.fazendas WHERE fazendas.id = lotes.fazenda_id AND fazendas.user_id = auth.uid())
);
CREATE POLICY "lotes_insert_own" ON public.lotes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.fazendas WHERE fazendas.id = lotes.fazenda_id AND fazendas.user_id = auth.uid())
);
CREATE POLICY "lotes_update_own" ON public.lotes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.fazendas WHERE fazendas.id = lotes.fazenda_id AND fazendas.user_id = auth.uid())
);
CREATE POLICY "lotes_delete_own" ON public.lotes FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.fazendas WHERE fazendas.id = lotes.fazenda_id AND fazendas.user_id = auth.uid())
);

-- Create policies for gado (through fazenda relationship)
CREATE POLICY "gado_select_own" ON public.gado FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.fazendas WHERE fazendas.id = gado.fazenda_id AND fazendas.user_id = auth.uid())
);
CREATE POLICY "gado_insert_own" ON public.gado FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.fazendas WHERE fazendas.id = gado.fazenda_id AND fazendas.user_id = auth.uid())
);
CREATE POLICY "gado_update_own" ON public.gado FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.fazendas WHERE fazendas.id = gado.fazenda_id AND fazendas.user_id = auth.uid())
);
CREATE POLICY "gado_delete_own" ON public.gado FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.fazendas WHERE fazendas.id = gado.fazenda_id AND fazendas.user_id = auth.uid())
);

-- Create policies for pesagens (through gado relationship)
CREATE POLICY "pesagens_select_own" ON public.pesagens FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.gado 
    JOIN public.fazendas ON fazendas.id = gado.fazenda_id 
    WHERE gado.id = pesagens.gado_id AND fazendas.user_id = auth.uid()
  )
);
CREATE POLICY "pesagens_insert_own" ON public.pesagens FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gado 
    JOIN public.fazendas ON fazendas.id = gado.fazenda_id 
    WHERE gado.id = pesagens.gado_id AND fazendas.user_id = auth.uid()
  )
);
CREATE POLICY "pesagens_update_own" ON public.pesagens FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.gado 
    JOIN public.fazendas ON fazendas.id = gado.fazenda_id 
    WHERE gado.id = pesagens.gado_id AND fazendas.user_id = auth.uid()
  )
);
CREATE POLICY "pesagens_delete_own" ON public.pesagens FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.gado 
    JOIN public.fazendas ON fazendas.id = gado.fazenda_id 
    WHERE gado.id = pesagens.gado_id AND fazendas.user_id = auth.uid()
  )
);

-- Create policies for pastos (through fazenda relationship)
CREATE POLICY "pastos_select_own" ON public.pastos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.fazendas WHERE fazendas.id = pastos.fazenda_id AND fazendas.user_id = auth.uid())
);
CREATE POLICY "pastos_insert_own" ON public.pastos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.fazendas WHERE fazendas.id = pastos.fazenda_id AND fazendas.user_id = auth.uid())
);
CREATE POLICY "pastos_update_own" ON public.pastos FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.fazendas WHERE fazendas.id = pastos.fazenda_id AND fazendas.user_id = auth.uid())
);
CREATE POLICY "pastos_delete_own" ON public.pastos FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.fazendas WHERE fazendas.id = pastos.fazenda_id AND fazendas.user_id = auth.uid())
);

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'nome', 'Usuário'),
    new.email
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
