-- Migración: Agregar columna 'theme' a la tabla profiles
-- Esta migración permite guardar la preferencia de tema del usuario en Supabase

-- 1. Agregar columna theme si no existe
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'dark';

-- 2. Comentario para documentar la columna
COMMENT ON COLUMN public.profiles.theme IS 'Preferencia de tema del usuario (dark o light)';

-- 3. Actualizar política RLS para permitir actualizar el tema
-- Primero eliminar la política si existe para evitar errores
DROP POLICY IF EXISTS "Users can update their own theme" ON public.profiles;

-- Crear política que permita a los usuarios actualizar su propio tema
CREATE POLICY "Users can update their own theme" 
ON public.profiles 
FOR UPDATE TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 4. Verificar que la política de lectura también permita leer el tema
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;

CREATE POLICY "Users can read their own profile" 
ON public.profiles 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

-- 5. Recargar el esquema de PostgREST
NOTIFY pgrst, 'reload schema';
