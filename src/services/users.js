import { supabase } from './supabase'

// Cuenta usuarios sin transferir sus registros al cliente.
export async function getUsersCount() {
  const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })
  return count
}

// Actualiza metadatos de autenticación y los campos básicos del perfil.
export async function updateProfile({ user, firstName, middleName, lastName, email, avatarUrl }) {
  const first_name = firstName.trim()
  const middle_name = middleName.trim()
  const last_name = lastName.trim()
  const avatar_url = avatarUrl.trim()

  const { data, error: authError } = await supabase.auth.updateUser({
    email: email.trim(),
    data: {
      ...user.user_metadata,
      first_name,
      middle_name,
      last_name,
      avatar_url,
    },
  })

  if (authError) return { data: null, error: authError }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ first_name, middle_name, last_name })
    .eq('user_id', user.id)

  return { data, error: profileError }
}

// Persiste respuestas y resultados del onboarding tras validar la sesión propietaria.
export async function saveOnboarding({ user, answers, dominantValue, secondaryValue, habits }) {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  const authenticatedUser = authData?.user
  if (authError || !authenticatedUser) {
    return { data: null, error: authError || new Error('Sesión no disponible.') }
  }
  if (user?.id !== authenticatedUser.id) {
    return { data: null, error: new Error('El usuario del perfil no coincide con la sesión autenticada.') }
  }

  const userId = authenticatedUser.id
  const payload = {
    answers,
    hidden_answers: {},
    dominant_value: dominantValue,
    secondary_value: secondaryValue,
    habits,
    completed_onboarding: true,
  }
  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, hidden_answers')
    .eq('user_id', userId)
    .maybeSingle()

  if (profileError) return { data: null, error: profileError }
  if (existingProfile?.hidden_answers != null) payload.hidden_answers = existingProfile.hidden_answers

  const query = existingProfile
    ? supabase.from('profiles').update(payload).eq('user_id', userId)
    : supabase.from('profiles').insert({ ...payload, user_id: userId })
  const { data, error } = await query
    .select('id, user_id, completed_onboarding')
    .single()

  return { data, error }
}

// Reemplaza la lista de hábitos guardada en el perfil del usuario.
export async function saveHabits(userId, habits) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ habits })
    .eq('user_id', userId)
    .select('habits')
    .single()

  return { habits: data?.habits || null, error }
}

// Guarda qué respuestas del onboarding se ocultan en la interfaz.
export async function updateHiddenAnswers(userId, hiddenAnswers) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ hidden_answers: hiddenAnswers })
    .eq('user_id', userId)
    .select('hidden_answers')
    .single()

  return { hiddenAnswers: data?.hidden_answers || {}, error }
}
