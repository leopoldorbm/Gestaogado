-- Add admin fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status_acesso VARCHAR(50) DEFAULT 'ativo',
ADD COLUMN IF NOT EXISTS tipo_acesso VARCHAR(50) DEFAULT 'ilimitado',
ADD COLUMN IF NOT EXISTS data_expiracao_acesso DATE,
ADD COLUMN IF NOT EXISTS dias_acesso_restantes INTEGER,
ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS motivo_suspensao TEXT,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create admin_users table for hardcoded admin access
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  nome VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin user (password: Leo258258)
-- Using a simple hash for demonstration - in production use proper bcrypt
INSERT INTO public.admin_users (email, senha_hash, nome)
VALUES ('admin', 'Leo258258', 'Administrador')
ON CONFLICT (email) DO NOTHING;

-- Create policy to allow admin to view all profiles (using service role)
-- Note: Admin access will be done via service role key, bypassing RLS

-- Update existing profiles to have proper defaults
UPDATE public.profiles
SET 
  status_acesso = COALESCE(status_acesso, 'ativo'),
  tipo_acesso = COALESCE(tipo_acesso, 'ilimitado'),
  data_cadastro = COALESCE(data_cadastro, created_at)
WHERE status_acesso IS NULL OR tipo_acesso IS NULL;
