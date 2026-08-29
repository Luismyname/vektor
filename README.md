# Vektor

Vektor es una aplicación web de productividad personal que conecta valores, hábitos y tareas. El usuario completa un onboarding, recibe una orientación inicial y puede convertirla en sesiones de trabajo medibles.

## Funcionalidades

- Registro e inicio de sesión con Supabase Auth.
- Onboarding de valores con generación de hábitos recomendados.
- Dashboard protegido con valores dominantes, hábitos, tareas y actividad reciente.
- CRUD de tareas con prioridades, edición, selección múltiple y eliminación.
- Temporizador de sesiones de enfoque con opción de continuar o finalizar.
- Historial de actividad con búsqueda y filtros por tipo y fecha.
- Perfil editable con nombre, apellidos, email y avatar por URL.
- Gestión de hábitos recomendados y personalizados.
- Respuestas del onboarding ocultables desde el dashboard.
- Preferencias persistentes de tema, duración, sonidos y visibilidad de valores.
- Row Level Security (RLS) para que cada usuario acceda únicamente a sus datos.

## Stack

- React 19 y React Router 7.
- Vite 8.
- Supabase Auth, PostgreSQL y políticas RLS.
- CSS propio organizado por capas globales, componentes y utilidades.

## Arquitectura

```text
src/
|-- app/          Páginas y componentes por funcionalidad
|-- components/   Layouts y componentes compartidos
|-- hooks/        Lógica reutilizable, incluido el temporizador
|-- lib/          Utilidades de dominio
|-- services/     Acceso a Supabase y operaciones CRUD
`-- styles/       Estilos globales y animaciones
supabase/         Esquema, políticas RLS y trigger de perfiles
```

La aplicación usa una única instancia de Supabase en `src/services/supabase.js`. `ProfileGate` protege las rutas privadas y exige completar el onboarding antes de acceder al dashboard.

## Instalación

Requisitos: Node.js 18 o superior y un proyecto de Supabase.

```bash
npm install
```

Crea `.env.local` en la raíz:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima
```

En el SQL Editor de Supabase ejecuta, en este orden:

1. `supabase/profiles.sql`
2. `supabase/tasks.sql`

Después inicia el entorno local:

```bash
npm run dev
```

Otros comandos disponibles:

```bash
npm run lint
npm run build
npm run preview
```

## Flujo principal

1. El usuario crea una cuenta.
2. Completa el onboarding de valores.
3. Vektor genera valores dominantes y hábitos iniciales.
4. Desde el dashboard puede crear una tarea y comenzar una sesión de enfoque.
5. La sesión queda reflejada en el historial de actividad.

## Demo

Visita `/demo` después de iniciar el servidor para probar el flujo completo con datos locales, sin configurar una cuenta de Supabase: encuesta, dashboard, tareas, temporizador e historial.

## Decisiones y límites actuales

- La aplicación utiliza la clave anónima de Supabase en el cliente; el aislamiento de datos depende de las políticas RLS.
- El historial y los datos del dashboard se consultan al cargar cada vista; no hay suscripciones Realtime implementadas.
- La duración de las sesiones se registra en Supabase, mientras que la cuenta atrás se ejecuta en el navegador.
- No se incluye un usuario de demostración porque cada entorno necesita sus propias variables de Supabase.

## Roadmap

- Añadir estadísticas de enfoque y evolución de hábitos.
- Ampliar la cobertura de tests unitarios y añadir pruebas end-to-end.
- Publicar una demo con datos de prueba y un flujo de acceso documentado.

## Autor

**Luis Guillermo Rodríguez Velásquez**

Creador y desarrollador de Vektor.

- [GitHub](https://github.com/Luismyname/)
- [LinkedIn](https://www.linkedin.com/in/luis-guillermo-rodriguez-velasquez-786a83b6)