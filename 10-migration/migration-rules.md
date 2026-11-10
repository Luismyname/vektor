# TYPESCRIPT MIGRATION RULES

Objetivo:

Migrar JavaScript → TypeScript.

NO rediseñar.

NO refactorizar.

NO optimizar.

NO reorganizar carpetas.

NO modificar UX.

NO modificar comportamiento.

NO modificar CSS.

NO modificar estructura de datos.

NO modificar tablas.

NO modificar servicios.

La migración debe ser:

JavaScript actual
↓
Mismo comportamiento
↓
TypeScript

Nada más.

REGLA VEKTOR TS-001

Durante la migración TypeScript:

Está prohibido corregir "malas prácticas".

Está prohibido refactorizar.

Está prohibido mejorar arquitectura.

Está prohibido extraer hooks.

Está prohibido dividir componentes.

Está prohibido cambiar nombres.

Primero migrar.
Después mejorar.

Nunca ambas cosas a la vez.

Durante Fase 3:

NO convertir hooks a lógica nueva.

NO fusionar hooks.

NO dividir hooks.

NO optimizar hooks.

Solo añadir tipos.

REGLA VEKTOR TS-002

TaskBlock
HabitBlock
ReminderBlock
DayColumn
WeeklyGrid

son componentes críticos.

Está prohibido modificar:

- top
- left
- transform
- posicionamiento
- variables CSS
- drag and drop
- sistema de energía

durante la migración.

La migración debe limitarse exclusivamente al tipado.

TS-003

Si un componente funciona y TypeScript
requiere más de 30 minutos para tiparlo
correctamente:

usar tipos temporales explícitos.

No refactorizar.

No reescribir.

Continuar migración.

FASE 7.5

Auditoría final de JavaScript.

Buscar:

*.js
*.jsx

Mostrar:

- Archivos restantes.
- Motivo por el que siguen en JS.
- Bloqueadores TypeScript.

No activar strict mode todavía.