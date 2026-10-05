# Analisis detallado de Vektor

## Alcance y metodo

Este documento complementa `ANALYSIS_REPORT.md` con un mapa de responsabilidades y complejidad. El analisis sintactico se hizo con el parser Babel instalado en el proyecto, sobre los archivos JavaScript/JSX de `src/`, `tests/` y scripts JavaScript de la raiz. No se analizaron `node_modules/`, `release/` ni otros artefactos generados. Las cifras cuentan nodos de funciones (incluidas funciones flecha y callbacks) y declaradores `const`/`let`/`var`; no cuentan parametros, imports, propiedades de objetos ni variables CSS como declaradores JavaScript.

| Area | Archivos | Funciones | Declaraciones de variables |
|---|---:|---:|---:|
| Aplicacion (`src/`) | 86 | 637 | 615 |
| Pruebas (`tests/`) | 21 | 303 | 157 |
| Total de archivos examinados | 109 | 957 | 784 |

Las pruebas se incluyen porque tambien contienen logica ejecutable: preparan datos, simulan servicios y describen comportamientos esperados. La aplicacion tiene mas funciones y variables que archivos; por tanto, el numero de archivos por si solo subestima su complejidad.

## Vista general

Vektor es una SPA de React 19 y React Router 7. La interfaz se divide por funcionalidad bajo `src/app/`; los componentes y hooks compartidos viven fuera de esa carpeta. La persistencia y autenticacion se resuelven mediante Supabase. No hay un servidor de dominio propio en este repositorio: el cliente de navegador consulta Supabase directamente y las politicas RLS son parte de la frontera de autorizacion.

Flujo general:

1. `src/main.jsx` crea la raiz React y monta la aplicacion.
2. `src/App.jsx` configura proveedores, rutas, carga diferida y limites de error.
3. Las pantallas de `src/app/` coordinan estado de interfaz, formularios y acciones del usuario.
4. Los hooks reutilizables encapsulan estado y efectos de comportamiento; los servicios de `src/services/` ejecutan consultas y mutaciones contra Supabase.
5. `src/lib/` contiene logica de dominio que no depende directamente de una pantalla.

## Mapa por area

### Inicio, rutas y estructura comun

- [`src/main.jsx`](../src/main.jsx): punto de entrada del navegador; conecta el elemento DOM con el arbol React.
- [`src/App.jsx`](../src/App.jsx): arbol de rutas, carga de pantallas y composicion de proveedores y protecciones de acceso.
- [`src/config/routers.js`](../src/config/routers.js): definiciones y utilidades de navegacion compartidas.
- [`src/config/constans.js`](../src/config/constans.js): constantes de configuracion compartidas. El nombre del archivo esta escrito `constans` en el repositorio.
- [`src/components/Layout.jsx`](../src/components/Layout.jsx), `src/components/layout/`: estructura visual comun y navegacion.
- [`src/components/ErrorBoundary.jsx`](../src/components/ErrorBoundary.jsx): captura errores de renderizado para evitar que un fallo de una subvista derribe toda la interfaz.
- [`src/context/`](../src/context/): estado transversal de autenticacion y tema.

### Autenticacion y perfil

- `src/app/auth/`: formularios de inicio de sesion y registro; delegan autenticacion en servicios/contexto.
- `src/context/AuthContext.jsx`: estado de sesion, usuario y operaciones de autenticacion compartidas.
- `src/app/profile/index.jsx` y `src/services/users.js`: lectura y actualizacion de datos del perfil.
- `src/services/auth.js`: operaciones de autenticacion de bajo nivel con Supabase.

### Onboarding y valores

- `src/app/survey/`: flujo de encuesta y composicion de sus componentes.
- `src/app/survey/questions.js`: definicion de preguntas/opciones usada por la encuesta.
- `src/lib/habits.js` y `src/services/habits.js`: logica de habitos y persistencia relacionada.
- `src/app/dashboard/components/DashboardAnswers.jsx`: presentacion y acciones relacionadas con las respuestas de onboarding.

### Dashboard, tareas y enfoque

- `src/app/dashboard/`: composicion del resumen y paneles de tareas, habitos y actividad.
- `src/app/dashboard/hooks/useDashboardData.js`: carga y coordinacion de los datos que consume el dashboard.
- `src/app/tasks/` y `src/services/tasks.js`: interfaz de gestion de tareas y operaciones persistentes.
- `src/hooks/useTaskTimer.js`: estado y ciclo temporal de una sesion de enfoque.
- `src/services/focus-sessions.js`: registro de sesiones de enfoque.
- `src/app/dashboard/components/TaskTimer.jsx`, `TaskStartModal.jsx` y `TaskEndModal.jsx`: interfaz del temporizador y transiciones de inicio/cierre.

### Habitos y actividad

- `src/app/habits/`: listado, seleccion y administracion de habitos.
- `src/app/activity/`: historial, detalle, busqueda y filtros.
- `src/services/activity.js` y `src/services/events.js`: lectura/registro de eventos que alimentan la actividad.

### Planificador semanal

- `src/app/weekly-planner/index.jsx`: vista de planificacion y coordinacion de interacciones.
- `src/components/weekly-planner/`: columnas, bloques, intervalos y formularios de la cuadricula semanal.
- `src/hooks/weekly-planner/`: estado del planificador, revision semanal y reprogramacion automatica.
- `src/services/weekly-planner.js`: capa de consultas y mutaciones del planificador. Es el modulo con mas declaraciones detectadas (46 funciones y 64 variables), por lo que concentra una parte importante de la complejidad funcional.
- `src/components/dashboard/WeeklyPreview.jsx`: vista previa compacta del plan semanal.

### Preferencias, tema y demo

- `src/hooks/usePreferences.js` y `src/services/theme.js`: preferencias del usuario y persistencia/configuracion visual.
- `src/context/ThemeProvider.jsx` y `src/hooks/useTheme.js`: aplicacion del tema en la interfaz.
- `src/app/settings/index.jsx`: controles de configuracion.
- `src/app/demo/index.jsx`: flujo de demostracion con datos/estado local para recorrer funcionalidades sin el flujo normal de cuenta.

## Capas y responsabilidades

| Capa | Responsabilidad | Riesgo de complejidad |
|---|---|---|
| `src/app/` | Coordina pantallas, estado local, formularios y componentes de cada flujo. | Los componentes de pagina pueden mezclar presentacion, efectos y operaciones si crecen demasiado. |
| `src/components/` | Presentacion reutilizable entre pantallas. | Debe recibir datos y acciones por props; reglas de dominio duplicadas aqui y en paginas dificultan cambios. |
| `src/hooks/` | Estado y efectos reutilizables de UI. | Temporizadores, efectos y limpieza de recursos son sensibles a ciclos de montaje/desmontaje. |
| `src/services/` | Frontera con Supabase: consultas, inserciones, actualizaciones y borrados. | Cambios de esquema, filtros por usuario y RLS afectan varias pantallas. |
| `src/lib/` | Transformaciones y reglas de dominio reutilizables. | Conviene mantener estas funciones puras cuando no necesiten I/O. |
| `supabase/` | Esquemas y politicas SQL. | La seguridad real depende de que las politicas RLS coincidan con los filtros y relaciones usados por los servicios. |
| `tests/` | Contratos de comportamiento para hooks, pantallas, servicios y flujos E2E. | Mocks incompletos pueden ocultar discrepancias entre las consultas simuladas y Supabase real. |

## Lectura de complejidad

- **Concentracion del planificador:** `src/services/weekly-planner.js` y `src/hooks/weekly-planner/useWeeklyPlanner.js` agrupan muchas operaciones y transformaciones. Son buenos puntos de entrada para entender el dominio de planificacion; cambios aqui pueden repercutir en multiples formularios y vistas.
- **Coordinacion en paginas:** los indices de dashboard, tareas, habitos y planificador conectan componentes, estado y acciones. Su complejidad es principalmente de flujo y estado, no solo de computo.
- **Temporizador:** la cuenta atras combina tiempo, efectos y acciones de cierre. Hay pruebas especificas para el hook y sus componentes, lo cual protege una zona propensa a errores de ciclo de vida.
- **Integracion distribuida:** una accion visible suele cruzar componente -> hook/pagina -> servicio -> Supabase. La autorizacion debe validarse en RLS; ocultar o filtrar controles en React no es una barrera de seguridad.
- **Cobertura:** existen pruebas unitarias/componentes y una prueba E2E del modal del planificador. El inventario de pruebas esta en `tests/`; las pruebas no sustituyen validar politicas y consultas contra un proyecto Supabase real.

### Modulos con mas declaraciones

El recuento incluye callbacks JSX y funciones flecha anidadas; sirve para comparar densidad, no equivale a complejidad ciclomática ni a dificultad de mantenimiento.

| Archivo | Funciones | Variables | Lectura de complejidad |
|---|---:|---:|---|
| [`src/services/weekly-planner.js`](../src/services/weekly-planner.js) | 46 | 64 | Reglas de fecha/horario, CRUD, creaciones compuestas, reprogramación y métricas. |
| [`src/hooks/weekly-planner/useWeeklyPlanner.js`](../src/hooks/weekly-planner/useWeeklyPlanner.js) | 36 | 30 | Carga y estado de agenda, múltiples operaciones remotas y actualizaciones locales. |
| [`src/app/weekly-planner/index.jsx`](../src/app/weekly-planner/index.jsx) | 35 | 20 | Integra drag-and-drop, modales, edición, métricas y revisión semanal. |
| [`src/app/dashboard/index.jsx`](../src/app/dashboard/index.jsx) | 19 | 42 | Coordina tareas y la máquina de estados temporal de sesiones de enfoque. |
| [`src/app/tasks/index.jsx`](../src/app/tasks/index.jsx) | 27 | 16 | Carga, edición, selección, creación y borrado individual o masivo. |
| [`src/App.jsx`](../src/App.jsx) | 18 | 18 | Rutas diferidas, composición de proveedores y protección de pantallas. |
| [`src/app/demo/index.jsx`](../src/app/demo/index.jsx) | 22 | 10 | Simulación autónoma de varias funcionalidades y transiciones de demo. |
| [`src/app/habits/index.jsx`](../src/app/habits/index.jsx) | 18 | 15 | Carga, normalización, recomendación y persistencia de hábitos. |
| [`src/app/activity/components/ActivityHistoryPage.jsx`](../src/app/activity/components/ActivityHistoryPage.jsx) | 14 | 18 | Combina consultas, filtros remotos y búsqueda local. |
| [`src/hooks/useTaskTimer.js`](../src/hooks/useTaskTimer.js) | 16 | 15 | Cuenta regresiva, persistencia, hidratación y callbacks de ciclo de vida. |

## Alcance de las pruebas

La anotación en el código se centra en componentes/hooks/servicios exportados, reglas auxiliares con responsabilidad propia y constantes de módulo relevantes. No agrega comentarios a cada estado local, callback JSX o variable temporal: son cientos de declaraciones mecánicas y la descripción de cada pantalla/hook ya explica cómo se coordinan. Las pruebas se describen aquí por archivo y comportamiento cubierto.

| Archivo | Qué verifica |
|---|---|
| [`tests/ActivityHistoryItem.test.jsx`](../tests/ActivityHistoryItem.test.jsx) | Presentación de una entrada y apertura de su detalle. |
| [`tests/completeTask.test.js`](../tests/completeTask.test.js) | Finalización de tarea e inserción de actividad con duración acumulada. |
| [`tests/DashboardAnswers.test.jsx`](../tests/DashboardAnswers.test.jsx) | Respuestas disponibles/ausentes, ocultación y reaparición. |
| [`tests/DashboardTasks.test.jsx`](../tests/DashboardTasks.test.jsx) | Exclusión de tareas ya completadas en el dashboard. |
| [`tests/e2e/weekly-planner-modal.spec.js`](../tests/e2e/weekly-planner-modal.spec.js) | Presentación adaptable del modal del planificador y filtrado de tareas. |
| [`tests/ErrorBoundary.test.jsx`](../tests/ErrorBoundary.test.jsx) | Render normal, fallback, detalles de desarrollo y recuperación. |
| [`tests/focusSessions.test.js`](../tests/focusSessions.test.js) | Creación, transición y búsqueda de sesiones activas/pausadas. |
| [`tests/login.test.jsx`](../tests/login.test.jsx) | Formulario de acceso, errores, carga y navegación posterior. |
| [`tests/saveOnboarding.test.js`](../tests/saveOnboarding.test.js) | Persistencia del onboarding para el usuario autenticado. |
| [`tests/SurveyForm.test.jsx`](../tests/SurveyForm.test.jsx) | Preguntas, selección, validación, envío y error de persistencia. |
| [`tests/TaskEndModal.test.jsx`](../tests/TaskEndModal.test.jsx) | Acción de finalizar, estado ocupado y visualización de errores. |
| [`tests/TaskForm.test.jsx`](../tests/TaskForm.test.jsx) | Altas/ediciones, valores, cancelación y estado de envío. |
| [`tests/TaskTimer.test.jsx`](../tests/TaskTimer.test.jsx) | Presentación del contador y controles de pausa, reanudación y parada. |
| [`tests/useDashboardData.test.js`](../tests/useDashboardData.test.js) | Carga de perfil/datos, errores y restauración de tarea/sesión activa. |
| [`tests/usePreferences.test.js`](../tests/usePreferences.test.js) | Valores por defecto, lectura, actualización y persistencia local. |
| [`tests/useTaskTimer.test.jsx`](../tests/useTaskTimer.test.jsx) | Cuenta atrás, expiración, pausa y recuperación desde `localStorage`. |
| [`tests/useWeeklyReview.test.jsx`](../tests/useWeeklyReview.test.jsx) | Consulta de revisión con fecha ISO. |
| [`tests/weeklyPlannerDates.test.js`](../tests/weeklyPlannerDates.test.js) | Formato de fecha, navegación semanal, siete días y rango horario. |
| [`tests/weeklyPlannerFocusSessions.test.js`](../tests/weeklyPlannerFocusSessions.test.js) | Lectura de sesiones y fallback a actividad cuando la tabla no existe. |
| [`tests/weeklyPlannerQueries.test.js`](../tests/weeklyPlannerQueries.test.js) | Límites de consulta ISO y filtro del historial de estado por usuario/fecha. |
| [`tests/setup.js`](../tests/setup.js) | Configuración compartida del entorno de pruebas; no declara una suite propia. |

La cobertura está concentrada en los flujos indicados; no se midió porcentaje de cobertura. En particular, estas pruebas no certifican las políticas RLS contra un proyecto Supabase desplegado.

## Pruebas y configuracion

- `tests/`: pruebas de formularios, temporizador, dashboard, actividad, preferencias, sesiones, consultas/fechas del planificador y revision semanal.
- `tests/e2e/weekly-planner-modal.spec.js`: recorrido de navegador del modal del planificador.
- `vite.config.js`: configuracion de Vite y Vitest.
- `playwright.config.js`: configuracion de Playwright.
- `eslint.config.js`: reglas estaticas.
- `check-server.mjs`, `check.bat` y `test-theme.mjs`: utilidades auxiliares de comprobacion del repositorio.
- `supabase/*.sql`: definiciones de tablas/politicas y soporte de persistencia. Consultar cada archivo SQL junto con el servicio que lo usa al cambiar el modelo de datos.

## Como navegar el codigo

Para seguir una funcionalidad de extremo a extremo, empieza en su pagina dentro de `src/app/`, identifica el hook que mantiene el estado, sigue las funciones importadas desde `src/services/` y termina en la tabla/politica SQL correspondiente. Para seguir una variable concreta, busca su declaracion en el archivo de la pagina o hook y rastrea sus lecturas/escrituras; los nombres y lineas de cada simbolo se pueden obtener con la busqueda de referencias del editor.

Este documento es un mapa de arquitectura y complejidad, no sustituye las firmas ni los cuerpos de cada simbolo. Las cifras anteriores miden el volumen exacto de declaraciones de la revision analizada; para explicar la semantica de un simbolo concreto, su implementacion fuente es la referencia definitiva.
