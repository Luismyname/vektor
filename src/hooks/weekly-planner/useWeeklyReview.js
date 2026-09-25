import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'

const QUESTIONS = [
  ['learned', '¿Qué aprendí esta semana?'],
  ['built', '¿Qué construí?'],
  ['improved', '¿Qué mejoré?'],
  ['failedHabit', '¿Qué hábito falló?'],
  ['keptHabit', '¿Qué hábito mantuve?'],
]

export function useWeeklyReview(userId, weekStart) {
  const [review, setReview] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    async function loadReview() {
      if (!userId) return
      const { data } = await supabase.from('weekly_planner').select('notes').eq('user_id', userId).eq('date', weekStart).is('task_id', null).is('habit_id', null).maybeSingle()
      if (active && data?.notes) {
        try { setReview(JSON.parse(data.notes)) } catch { setReview({}) }
      }
    }
    loadReview()
    return () => { active = false }
  }, [userId, weekStart])

  async function saveReview(nextReview) {
    setSaving(true)
    setSaved(false)
    const payload = { user_id: userId, date: weekStart, start_time: '05:00', end_time: '23:00', status: 'scheduled', notes: JSON.stringify(nextReview), task_id: null, habit_id: null }
    const { data: existing } = await supabase.from('weekly_planner').select('id').eq('user_id', userId).eq('date', weekStart).is('task_id', null).is('habit_id', null).maybeSingle()
    const { error } = existing
      ? await supabase.from('weekly_planner').update(payload).eq('id', existing.id)
      : await supabase.from('weekly_planner').insert(payload)
    setSaving(false)
    if (!error) {
      setReview(nextReview)
      setSaved(true)
    }
    return { error }
  }

  return { questions: QUESTIONS, review, setReview, saveReview, saving, saved }
}