import { supabase } from './supabase'

export async function getUsersCount() {
  const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })
  return count
}

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

export async function saveOnboarding({ user, answers, dominantValue, secondaryValue, habits }) {
  const payload = {
    answers,
    dominant_value: dominantValue,
    secondary_value: secondaryValue,
    habits,
    completed_onboarding: true,
  }
  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError) return { data: null, error: profileError }

  const query = existingProfile
    ? supabase.from('profiles').update(payload).eq('user_id', user.id)
    : supabase.from('profiles').insert({ ...payload, user_id: user.id })
  const { data, error } = await query
    .select('id, user_id, completed_onboarding')
    .single()

  return { data, error }
}

export async function saveHabits(userId, habits) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ habits })
    .eq('user_id', userId)
    .select('habits')
    .single()

  return { habits: data?.habits || null, error }
}

export async function updateHiddenAnswers(userId, hiddenAnswers) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ hidden_answers: hiddenAnswers })
    .eq('user_id', userId)
    .select('hidden_answers')
    .single()

  return { hiddenAnswers: data?.hidden_answers || {}, error }
}
