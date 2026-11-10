import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import { formatDate } from '../../services/weekly-planner'

type WeeklyReviewAnswers = Record<string, string>

function isWeeklyReviewAnswers(value: unknown): value is WeeklyReviewAnswers {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && Object.values(value).every((answer) => typeof answer === 'string')
}

// Preguntas que estructuran la revisión y sus claves almacenadas en answers.
const QUESTIONS = [
  ['learned', '¿Qué aprendí esta semana?'],
  ['built', '¿Qué construí?'],
  ['improved', '¿Qué mejoré?'],
  ['failedHabit', '¿Qué hábito falló?'],
  ['keptHabit', '¿Qué hábito mantuve?'],
]

// Carga y guarda las respuestas de revisión semanal en weekly_reviews.
export function useWeeklyReview(userId: string | null | undefined, weekStart: Date | string) {
  const [review, setReview] = useState<WeeklyReviewAnswers>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const reviewDate = formatDate(weekStart)

  useEffect(() => {
    let active = true
    async function loadReview() {
      if (!userId) return
      const { data, error } = await supabase
        .from('weekly_reviews')
        .select('answers')
        .eq('user_id', userId)
        .eq('review_date', reviewDate)
        .maybeSingle()

      if (error) {
        console.error('No se pudo cargar la revisión semanal.', error)
        return
      }

      if (active && isWeeklyReviewAnswers(data?.answers)) {
        setReview(data.answers)
      } else if (active) {
        setReview({})
      }
    }
    loadReview()
    return () => { active = false }
  }, [userId, reviewDate])

  async function saveReview(nextReview: WeeklyReviewAnswers) {
    setSaving(true)
    setSaved(false)
    if (!userId) {
      setSaving(false)
      return { error: new Error('No se puede guardar la revisión sin un usuario autenticado.') }
    }

    const payload = {
      user_id: userId,
      review_date: reviewDate,
      answers: nextReview,
      updated_at: new Date().toISOString(),
    }

    try {
      const { data: existing, error: lookupError } = await supabase
        .from('weekly_reviews')
        .select('id')
        .eq('user_id', userId)
        .eq('review_date', reviewDate)
        .maybeSingle()

      if (lookupError) return { error: lookupError }

      const { error } = existing
        ? await supabase.from('weekly_reviews').update(payload).eq('id', existing.id)
        : await supabase.from('weekly_reviews').insert(payload)

      if (!error) {
        setReview(nextReview)
        setSaved(true)
      }
      return { error }
    } finally {
      setSaving(false)
    }
  }

  return { questions: QUESTIONS, review, setReview, saveReview, saving, saved }
}