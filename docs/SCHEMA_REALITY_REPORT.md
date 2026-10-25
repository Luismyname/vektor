# Schema Reality Report — Motor de aprendizaje, Sprint 1

**Fecha:** 2026-10-22  
**Alcance:** servicios y consumidores Supabase del repositorio frente a SQL versionado en `supabase/`.  
**Modo:** solo lectura. No se modificaron código, SQL, esquema ni commits.

## Alcance y límites de evidencia

- Se rastrearon las consultas Supabase de `src/services/`, el hook de revisión semanal, el contexto de autenticación y el guardado del onboarding.
- El DDL versionado encontrado está en `supabase/tasks.sql`, `supabase/weekly_planner.sql`, `supabase/focus_habit_history.sql`, `supabase/profiles.sql` y `supabase/theme.sql`.
- La petición de lectura a la API REST de Supabase (`/rest/v1/`) respondió **HTTP 401** usando la configuración pública local. No se obtuvieron metadatos ni filas.
- Por ello, **ninguna existencia de tabla, columna o FK en Supabase real queda confirmada**. “No verificable” no significa que el objeto no exista en el proyecto remoto. El SQL del repositorio tampoco demuestra que se haya aplicado.

## 1. Inventario de tablas

“Existe en código” significa que el cliente consulta o escribe ese nombre de relación. `public.users` es el destino implícito de `.from('users')`; no equivale a `auth.users`.

| Tabla | Existe en código | Existe en SQL versionado | Existe en Supabase real | Estado |
|---|---:|---:|---|---|
| `tasks` | Sí | Sí | No verificable (401) | ⚠ Parcial: faltan columnas utilizadas por el servicio |
| `activity` | Sí | Sí | No verificable (401) | ✅ Coincide en nombres y columnas consultadas según el DDL |
| `weekly_planner` | Sí | Sí | No verificable (401) | ⚠ Parcial: faltan campos consumidos/escritos |
| `focus_sessions` | Sí | Sí | No verificable (401) | ⚠ Parcial: faltan campos de evaluación |
| `habit_status_history` | Sí | Sí | No verificable (401) | ✅ Coincide en nombres y columnas consultadas según el DDL |
| `profiles` | Sí | Sí | No verificable (401) | ⚠ Parcial: varios servicios usan columnas que no declara el DDL |
| `habits` | Sí | No se encontró DDL | No verificable (401) | ❌ Inconsistente entre código y SQL versionado |
| `energy_levels` | Sí | No se encontró DDL | No verificable (401) | ❌ Inconsistente entre código y SQL versionado |
| `creative_blocks` | Sí | No se encontró DDL | No verificable (401) | ❌ Inconsistente entre código y SQL versionado |
| `events` | Sí | No se encontró DDL | No verificable (401) | ❌ Inconsistente entre código y SQL versionado |
| `users` (esquema `public`, implícito) | Sí | No se encontró DDL | No verificable (401) | ❌ Inconsistente/ambiguo: no se encontró relación pública; `auth.users` es otra relación |

La tabla `theme.sql` no añade un DDL de `profiles` que cubra `theme`; `profiles.sql` crea y amplía esa tabla, pero tampoco declara todos los campos que consumen sus servicios.

## 2. Columnas

Abreviaturas: **C** = usada/seleccionada/escrita por código; **SQL** = declarada o añadida por el SQL versionado; **Supabase** = todas **N/V** por el HTTP 401. En relaciones con `.select('*')`, el inventario de código refleja los campos que el servicio escribe o consume explícitamente, no cualquier columna que pudiera devolver la tabla.

| Tabla | Columnas usadas en código | Existe en SQL versionado | Existe en Supabase |
|---|---|---|---|
| `tasks` | `id`, `user_id`, `title`, `description`, `priority`, `status`, `related_value`, `created_at`, `completed_at`, `energy_cost`, `cognitive_load`, `work_type`, `estimated_duration`, `actual_duration` | Sí: primeras 9. **No:** `energy_cost`, `cognitive_load`, `work_type`, `estimated_duration`, `actual_duration` | N/V |
| `activity` | `id`, `user_id`, `type`, `task_id`, `title`, `duration`, `created_at`, `hidden_in_dashboard`; relación embebida `tasks(status)` | Sí: columnas declaradas o añadidas con `ALTER TABLE`; `task_id` tiene FK a `tasks.id` | N/V |
| `weekly_planner` | `id`, `user_id`, `date`, `start_time`, `end_time`, `task_id`, `habit_id`, `status`, `notes`, `created_at`, `energy_level`, `is_creative_block`, `focus_session_id`, `block_type`, `quality_score`, `interruptions` | Sí: primeras 10. **No:** `energy_level`, `is_creative_block`, `focus_session_id`, `block_type`, `quality_score`, `interruptions` | N/V |
| `focus_sessions` | `id`, `user_id`, `task_id`, `planned_duration_seconds`, `started_at`, `paused_at`, `paused_seconds`, `ended_at`, `duration_seconds`, `status`, `created_at`; además escritura de `quality_score`, `interruptions`, `notes` | Sí: columnas de sesión enumeradas; **no** `quality_score`, `interruptions`, `notes` | N/V |
| `habit_status_history` | `id`, `user_id`, `planner_entry_id`, `habit_id`, `habit_title`, `planned_date`, `previous_status`, `status`, `event_type`, `changed_at` | Sí: todas | N/V |
| `profiles` | `id`, `user_id`, `answers`, `hidden_answers`, `dominant_value`, `secondary_value`, `habits`, `completed_onboarding`, `created_at`, `first_name`, `middle_name`, `last_name`, `theme`, `chronotype`, `peak_hours`, `notification_config` | Sí: las primeras 12. **No:** `theme`, `chronotype`, `peak_hours`, `notification_config` | N/V |
| `habits` | En `select('*')`; campos explícitos de escritura/uso: `id`, `user_id`, `title`, `description`, `duration_minutes`, `color`, `frequency`, `active`, `source`, `created_at`, `updated_at` | No se encontró DDL | N/V |
| `energy_levels` | `user_id`, `date`, `hour`, `energy_level`, `source`; upsert requiere unicidad de `user_id,date,hour` | No se encontró DDL | N/V |
| `creative_blocks` | En `select('*')`; campos escritos/usados: `id`, `user_id`, `date`, `start_time`, `end_time`, `block_type`, `planned_task_id`, `actual_focus_session_id`, `quality_score`, `interruptions`, `notes` | No se encontró DDL | N/V |
| `events` | En `select('*')`; orden por `created_at` | No se encontró DDL | N/V |
| `users` | `select('*', { count: 'exact', head: true })` | No se encontró DDL de `public.users` | N/V |

### Campos de especial atención

| Campo | Situación en código frente al SQL versionado |
|---|---|
| `estimated_duration` | Se lee/escribe en `tasks`; no está declarado en `tasks.sql`. |
| `actual_duration` | Se escribe al completar una tarea; no está declarado en `tasks.sql`. También hay duraciones distintas en `activity.duration` y `focus_sessions.duration_seconds`. |
| `focus_session_id` | Se inserta, selecciona y espera en `weekly_planner`; no está declarado allí ni tiene FK versionada. |
| `quality_score`, `interruptions`, `notes` | La calificación de sesión escribe los tres en `focus_sessions`; el DDL de esa tabla no los contiene. `notes` sí existe en `weekly_planner` y `creative_blocks` se usa por separado, sin DDL versionado. |
| `peak_hours`, `chronotype` | Se leen/escriben en `profiles`; faltan en `profiles.sql`. |
| `notification_config` | Se lee/escribe en `profiles`; falta en `profiles.sql`. |
| `energy_level`, `is_creative_block` | Se escriben y seleccionan en `weekly_planner`; faltan en `weekly_planner.sql`. |

## 3. Relaciones

### FK declaradas en SQL versionado

| Origen | Columna | Destino | Regla declarada |
|---|---|---|---|
| `tasks` | `user_id` | `auth.users(id)` | `ON DELETE CASCADE` |
| `activity` | `user_id` | `auth.users(id)` | `ON DELETE CASCADE` |
| `activity` | `task_id` | `tasks(id)` | `ON DELETE SET NULL` |
| `weekly_planner` | `user_id` | `auth.users(id)` | `ON DELETE CASCADE` |
| `weekly_planner` | `task_id` | `tasks(id)` | `ON DELETE CASCADE` |
| `focus_sessions` | `user_id` | `auth.users(id)` | `ON DELETE CASCADE` |
| `focus_sessions` | `task_id` | `tasks(id)` | `ON DELETE SET NULL` |
| `habit_status_history` | `user_id` | `auth.users(id)` | `ON DELETE CASCADE` |
| `habit_status_history` | `planner_entry_id` | `weekly_planner(id)` | `ON DELETE SET NULL` |
| `profiles` | `user_id` | `auth.users(id)` | `ON DELETE CASCADE`; `user_id` también es único |

### Relaciones usadas frente a relaciones ausentes

| Relación | Uso observado | Estado en DDL versionado |
|---|---|---|
| `weekly_planner → tasks` | Inserción/consulta de `task_id`; una entrada puede representar una tarea | FK declarada. La eliminación de una tarea elimina sus entradas del planificador (`CASCADE`). |
| `weekly_planner → habits` | `habit_id` guarda `habit.id` (y el código antiguo también permitía título); historial resuelve el título contra `profiles.habits` | **FK inexistente.** `habit_id` es texto; no se declara FK a `habits`. La relación operativa también está duplicada como JSON en `profiles.habits`. |
| `weekly_planner → focus_sessions` | El código pasa `focus_session_id` al planificador y lo incluye en su proyección | **Columna y FK inexistentes en DDL versionado.** |
| `focus_sessions → weekly_planner` | No se consulta un vínculo directo en el servicio actual | **FK inexistente.** El DDL de sesiones no tiene `planner_entry_id`; no puede asociar formalmente una ejecución con una ocurrencia planificada. |
| `activity → tasks` | Proyección PostgREST `tasks(status)` y operaciones por `task_id` | FK declarada (`activity.task_id → tasks.id`). |
| `focus_sessions → tasks` | Sesiones consultadas por `task_id` | FK declarada (`ON DELETE SET NULL`). |
| `habit_status_history → weekly_planner` | Historial de ocurrencias usa `planner_entry_id` | FK declarada (`ON DELETE SET NULL`); triggers de `weekly_planner` generan historial de hábitos. |
| `creative_blocks → tasks/focus_sessions` | Se escriben `planned_task_id` y `actual_focus_session_id` | No hay DDL versionado; existencia de columnas y FKs no verificable. |

**Distinción importante:** `activity → tasks` tiene FK en el SQL versionado; `weekly_planner → habits` y los vínculos del planificador con sesiones no. `auth.users` tampoco implica la existencia de una tabla consultable `public.users`.

## 4. Estados

| Estado | Responsabilidad | Sistema |
|---|---|---|
| `pending` | Tarea aún pendiente; también tipo de actividad inicial o detenida | `tasks.status`, `activity.type` |
| `in_progress` | Actividad de tarea en curso; no es un estado establecido por `startTask` en `tasks.status` | `activity.type` |
| `completed` | Tarea/actividad completada; ocurrencia del planificador completada; sesión de foco terminada normalmente | `tasks.status`, `activity.type`, `weekly_planner.status`, `focus_sessions.status`, `habit_status_history.status` |
| `scheduled` | Acción/hábito planificado y estado de ocurrencia | `weekly_planner.status`, `habit_status_history.status`; también `habit_status_history.event_type` |
| `failed` | Resultado fallido de una ocurrencia del planificador/hábito | `weekly_planner.status`, `habit_status_history.status` |
| `moved` | Entrada reubicada en el planificador | `weekly_planner.status`, `habit_status_history.status` |
| `running` | Sesión de foco activa | `focus_sessions.status` |
| `paused` | Sesión de foco pausada | `focus_sessions.status` |
| `interrupted` | Sesión de foco detenida/interrumpida | `focus_sessions.status` |
| `status_changed` | Tipo de evento que registra un cambio de estado de hábito | `habit_status_history.event_type` |
| `baseline` | Tipo de evento de historial insertado para la línea base existente | `habit_status_history.event_type` |

El SQL restringe `weekly_planner.status` a `scheduled/completed/failed/moved`; restringe `focus_sessions.status` a `running/paused/completed/interrupted`; y define para el historial los cuatro estados de planificación más `event_type` (`scheduled/status_changed/baseline`). `tasks.status` y `activity.type` no tienen `CHECK` en el SQL revisado. El SQL migra valores antiguos de actividad `task_started`, `task_extended` y `task_completed`; por tanto, los valores históricos y los que todavía interpreta alguna interfaz no deben confundirse con los estados canónicos actuales.

## 5. ActionExecution — análisis de brecha

| Concepto | Estado | Evidencia y diferencia |
|---|---|---|
| `scheduled_start` | ⚠ Existe parcialmente | `weekly_planner.date + start_time` representan el inicio planificado en campos separados; no hay `scheduled_start` unificado. |
| `scheduled_end` | ⚠ Existe parcialmente | `weekly_planner.date + end_time` representan el fin planificado en campos separados. El SQL valida `end_time > start_time`, pero no un modelo de ejecución. |
| `actual_start` | ⚠ Existe parcialmente | `focus_sessions.started_at` marca el comienzo de una sesión de foco, no necesariamente de toda la acción planificada. |
| `actual_end` | ⚠ Existe parcialmente | `focus_sessions.ended_at` marca el fin de una sesión de foco; no completa ni referencia de manera inequívoca una entrada `weekly_planner`. |
| `actual_duration` | ⚠ Existe parcialmente | `focus_sessions.duration_seconds` y `activity.duration` registran duraciones con unidades/modelos distintos; el servicio también escribe `tasks.actual_duration`, ausente de SQL. |
| `completion_status` | ⚠ Existe parcialmente | Hay estados separados en `tasks`, `weekly_planner`, `activity` y `focus_sessions`; no existe un estado canónico de ejecución que las una. |
| `planner_entry_id` | ⚠ Existe parcialmente | Solo existe en `habit_status_history` y apunta a `weekly_planner`. No está en `focus_sessions` ni existe una tabla de ejecución. |

No existe una entidad `ActionExecution` en el código/SQL revisados. Hay piezas reutilizables (agenda, actividad, sesiones y estados), pero no una ejecución persistida que vincule cada acción planificada con su comienzo/fin real, duración y resultado.

## 6. Riesgos de construir ActionExecution sobre el estado actual

1. **Errores de esquema en caminos activos.** Los servicios incluyen columnas que no aparecen en el DDL versionado; PostgREST puede rechazar tanto las escrituras como la proyección de respuesta.
2. **No se puede identificar inequívocamente qué ejecución completa qué planificación.** `weekly_planner.focus_session_id` no está declarado y `focus_sessions` no tiene `planner_entry_id`.
3. **Duplicidad de mediciones y semánticas.** `tasks.actual_duration`, `activity.duration` y `focus_sessions.duration_seconds` pueden expresar la duración de una tarea/sesión con unidades y reglas diferentes. `activity.type`, `tasks.status`, `weekly_planner.status` y `focus_sessions.status` son estados paralelos.
4. **Hábitos con identidad/registro duplicados.** El servicio opera la tabla `habits`, mientras que el trigger del historial busca títulos en `profiles.habits` JSON. `weekly_planner.habit_id` no tiene FK y acepta históricamente identificador o título.
5. **Tablas y campos no reproducibles desde el SQL versionado.** `habits`, `energy_levels`, `creative_blocks` y `events` carecen de DDL localizado, igual que varias columnas de `profiles`, `tasks`, `weekly_planner` y `focus_sessions`.
6. **El resultado de la acción no se propaga de forma uniforme.** Completar una tarea actualiza `tasks` y crea actividad; no se observa en ese flujo una actualización atómica de la entrada correspondiente de `weekly_planner`. Una sesión de foco se puede completar independientemente de la tarea.
7. **Pérdida o degradación de integridad.** `weekly_planner.task_id` elimina entradas en cascada al borrar una tarea; en cambio, enlaces a hábitos/sesiones carecen de integridad referencial versionada. No se conoce el comportamiento remoto real.
8. **Un conteo de usuarios ambiguo.** `.from('users')` apunta normalmente a `public.users`, no a `auth.users`; no hay DDL público correspondiente en los archivos revisados.

## 7. Decisión para Sprint 2

**B) No.** No se recomienda iniciar la implementación de ActionExecution sin una reconciliación previa del esquema. El estado real de Supabase continúa sin confirmar por el 401, así que la primera condición es obtener una inspección autenticada de solo lectura y comparar sus metadatos con el inventario siguiente.

### Correcciones/reconciliaciones previas exactas

**Tablas**

- Verificar en el proyecto real y versionar/confirmar DDL para `tasks`, `activity`, `weekly_planner`, `focus_sessions`, `habit_status_history` y `profiles`.
- Confirmar existencia y DDL de `habits` y `energy_levels` (necesarias para flujos de planificación y aprendizaje); también de `creative_blocks` y `events`, consumidas por servicios.
- Resolver si `public.users` existe o si el conteo de usuarios usa el esquema/relación equivocados.

**Columnas**

- `tasks`: confirmar/definir `estimated_duration`, `actual_duration`, `energy_cost`, `cognitive_load`, `work_type`.
- `weekly_planner`: confirmar/definir `energy_level`, `is_creative_block`, `focus_session_id`; el flujo creativo también intenta escribir `block_type`, `quality_score`, `interruptions`.
- `focus_sessions`: confirmar/definir `quality_score`, `interruptions`, `notes`, usados al calificar una sesión.
- `profiles`: confirmar/definir `chronotype`, `peak_hours`, `notification_config`, `theme`.
- `energy_levels`, `habits`, `creative_blocks`: verificar todas las columnas enumeradas en la matriz y, para energía, la unicidad requerida por el upsert `user_id,date,hour`.

**Relaciones**

- Alinear la identidad de hábito entre `weekly_planner.habit_id`, la relación `habits` y `profiles.habits`; elegir una clave estable y verificar compatibilidad de tipos antes de establecer integridad referencial.
- Definir y materializar un único vínculo entre la entrada planificada y la ejecución de foco (`weekly_planner.focus_session_id` o un `focus_sessions.planner_entry_id`), con FK y política de borrado acordadas.
- Mantener/confirmar `activity.task_id → tasks.id` y `focus_sessions.task_id → tasks.id`; confirmar si `weekly_planner.task_id ON DELETE CASCADE` es la política deseada para preservar historial de ejecución.
- No usar `auth.users` como sustituto implícito de `public.users`; aclarar la relación objetivo de `getUsersCount`.

Hasta que se confirme qué existe realmente y se resuelvan estas divergencias, cualquier propuesta de ActionExecution se apoyaría en columnas y relaciones cuyo contrato actual no está demostrado.
