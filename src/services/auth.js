import { supabase } from './supabase'

// Inicia sesión con email y contraseña, normalizando espacios del identificador.
export async function signIn(identifier, password) {
  return supabase.auth.signInWithPassword({ email: identifier.trim(), password })
}

// Devuelve el usuario validado por la sesión actual de Supabase.
export async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser()
  return { user: data.user, error }
}

// Busca el perfil de onboarding asociado al usuario autenticado.
export async function getCurrentProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, answers, hidden_answers, dominant_value, secondary_value, habits, completed_onboarding, created_at')
    .eq('user_id', userId)
    .maybeSingle()

  return { profile: data, error }
}

// Decide si la sesión debe ir al login, al onboarding o al dashboard.
export async function getOnboardingDestination() {
  const { user, error: userError } = await getAuthenticatedUser()

  if (userError || !user) return { destination: '/login', error: userError }

  const { profile, error } = await getCurrentProfile(user.id)

  if (error) return { destination: null, error }
  return { destination: profile?.completed_onboarding ? '/dashboard' : '/onboarding', error: null }
}

// Crea una cuenta y guarda los datos personales como metadatos de autenticación.
export async function registerUser({
  firstName,
  middleName,
  lastName,
  birthDate,
  address,
  email,
  password,
}) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        birth_date: birthDate,
        address,
      },
    },
  })

  if (error || !data.user) {
    return {
      data,
      error: error || new Error('Supabase no devolvió un usuario al crear la cuenta.'),
    }
  }

  return { data, error: null }
}
