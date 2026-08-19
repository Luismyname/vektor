import { supabase } from './supabase'

export async function signIn(identifier, password) {
  return supabase.auth.signInWithPassword({ email: identifier.trim(), password })
}

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
    email,
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
    return { data, error }
  }

  return { data, error: null }
}
