import { createClient } from '@supabase/supabase-js'

// Cliente único de Supabase configurado desde variables de entorno Vite.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
