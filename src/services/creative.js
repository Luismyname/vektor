import { supabase } from './supabase'

/**
 * Crea un bloque creativo (deep work) vinculado a una tarea opcional y sesión de enfoque
 */
export async function createCreativeBlock(userId, input) {
  const payload = {
    user_id: userId,
    date: input.date,
    start_time: input.startTime,
    end_time: input.endTime,
    block_type: input.blockType || 'deep_work',
    planned_task_id: input.plannedTaskId || null,
    actual_focus_session_id: input.actualFocusSessionId || null,
    quality_score: input.qualityScore || null,
    interruptions: input.interruptions || 0,
    notes: input.notes || '',
  }
  const { data, error } = await supabase.from('creative_blocks').insert(payload).select().single()
  return { data, error }
}

/**
 * Actualiza un bloque creativo existente
 */
export async function updateCreativeBlock(id, updates) {
  const { data, error } = await supabase
    .from('creative_blocks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

/**
 * Obtiene los bloques creativos de una semana
 */
export async function getWeeklyCreativeBlocks(userId, weekStart) {
  const dates = []
  const start = new Date(weekStart)
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(start.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }

  const { data, error } = await supabase
    .from('creative_blocks')
    .select('*')
    .eq('user_id', userId)
    .in('date', dates)
    .order('date')
    .order('start_time')

  return { data: data || [], error }
}

/**
 * Obtiene bloques creativos de un día específico
 */
export async function getDailyCreativeBlocks(userId, date) {
  const { data, error } = await supabase
    .from('creative_blocks')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('start_time')

  return { data: data || [], error }
}

/**
 * Elimina un bloque creativo
 */
export async function deleteCreativeBlock(id) {
  const { error } = await supabase.from('creative_blocks').delete().eq('id', id)
  return { error }
}

/**
 * Calcula estadísticas de bloques creativos de una semana
 */
export async function getCreativeBlocksStats(userId, weekStart) {
  const { data: blocks, error } = await getWeeklyCreativeBlocks(userId, weekStart)
  if (error) return { stats: null, error }

  const totalBlocks = blocks.length
  const totalMinutes = blocks.reduce((sum, b) => {
    const start = new Date(`2000-01-01T${b.start_time}`)
    const end = new Date(`2000-01-01T${b.end_time}`)
    return sum + (end - start) / (1000 * 60)
  }, 0)

  const withQuality = blocks.filter(b => b.quality_score !== null)
  const avgQuality = withQuality.length
    ? Math.round(withQuality.reduce((sum, b) => sum + b.quality_score, 0) / withQuality.length)
    : null

  const totalInterruptions = blocks.reduce((sum, b) => sum + (b.interruptions || 0), 0)

  const byType = {}
  blocks.forEach(b => {
    byType[b.block_type] = (byType[b.block_type] || 0) + 1
  })

  return {
    stats: {
      totalBlocks,
      totalMinutes,
      avgQuality,
      totalInterruptions,
      byType,
      withQualityScore: withQuality.length,
    },
    error: null
  }
}