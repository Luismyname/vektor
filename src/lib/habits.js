const habitTemplates = {
  salud: [
    'Dormir mínimo 7 horas',
    'Caminar 20 minutos diarios',
    'Beber 2 litros de agua',
    'Reducir azúcar y ultraprocesados',
    'Estiramientos 5 minutos',
    'Desayuno rico en proteínas',
    'Evitar pantallas 30 minutos antes de dormir',
    'Tomar el sol 10 minutos',
    'Mantener horarios regulares de sueño',
    'Registrar energía diaria',
  ],
  crecimiento: [
    'Planificar 3 tareas diarias',
    'Revisar progreso semanal',
    'Aprender 10 minutos al día',
    'Registrar logros',
    'Dividir objetivos grandes en pasos pequeños',
    'Leer 10 páginas',
    'Evitar multitarea',
    'Establecer metas mensuales',
    'Revisar hábitos cada domingo',
    'Escribir un micro-resumen del día',
  ],
  conexion: [
    'Llamar a un amigo cada semana',
    'Participar en una actividad social',
    'Enviar un mensaje a alguien importante',
    'Practicar escucha activa',
    'Compartir un logro con alguien',
    'Hacer un plan social semanal',
    'Felicitar a alguien por algo',
    'Evitar aislamiento prolongado',
    'Escribir un mensaje de agradecimiento',
    'Registrar interacciones positivas',
  ],
  bienestar: [
    'Meditar 5 minutos',
    'Escribir 3 cosas positivas',
    'Respiración consciente 2 minutos',
    'Reducir pantallas antes de dormir',
    'Paseo sin móvil',
    'Diario emocional',
    'Evitar multitarea',
    'Rutina de cierre del día',
    'Música relajante 10 minutos',
    'Agradecimiento diario',
  ],
}

export function generateHabits(dominantValue, secondaryValue, answers = {}) {
  const value = [dominantValue, secondaryValue, answers?.[3]]
    .map(normalizeValue)
    .find((candidate) => habitTemplates[candidate]) || 'bienestar'
  const primaryHabits = habitTemplates[value] || habitTemplates.bienestar

  return {
    recommended: primaryHabits.map((title, index) => ({ id: `recommended-${value}-${index}`, title, value, active: true })),
    custom: [],
  }
}

function normalizeValue(value) {
  const normalizedValue = String(value || '').trim().toLowerCase()
  return normalizedValue === 'bienestar emocional' ? 'bienestar' : normalizedValue
}

export function normalizeHabits(habits) {
  if (Array.isArray(habits)) return { recommended: habits.map(normalizeHabit), custom: [] }
  return {
    recommended: Array.isArray(habits?.recommended) ? habits.recommended.map(normalizeHabit) : [],
    custom: Array.isArray(habits?.custom) ? habits.custom.map(normalizeHabit) : [],
  }
}

function normalizeHabit(habit) {
  return {
    id: habit?.id || crypto.randomUUID(),
    title: typeof habit === 'string' ? habit : habit?.title || habit?.value || 'Hábito sin nombre',
    value: typeof habit === 'object' ? habit.value || 'personalizado' : 'personalizado',
    active: habit?.active !== false,
  }
}