# Arquitectura del Proyecto

## Visión General

Vektor es una **SPA (Single Page Application)** web. Usa **Supabase** como backend (BaaS - Backend as a Service).

```
┌─────────────────────────────────────────────────────────┐
│                    NAVEGADOR WEB                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │                  REACT SPA                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │  │
│  │  │   Auth      │  │  Dashboard  │  │  Planner  │ │  │
│  │  │   Context   │  │  Components │  │  Semanal  │ │  │
│  │  └─────────────┘  └─────────────┘  └───────────┘ │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │              Services Layer                  │  │  │
│  │  │   (Supabase, Auth, Tasks, Activity, etc.)   │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌───────────────────────┐
              │      SUPABASE         │
              │  (Auth + Database)    │
              └───────────────────────┘
```

## Decisiones Arquitectónicas

### 1. Patrón: Componentes + Services

| Capa | Responsabilidad |
|------|-----------------|
| **Componentes** | Renderizado UI y manejo de estado local |
| **Services** | Comunicación con Supabase y lógica de negocio |
| **Hooks** | Lógica reutilizable y estado compartido |
| **Context** | Estado global (autenticación) |

### 2. Estado Global: Context API

Usamos **Context API** para el estado de autenticación:

```javascript
// src/context/AuthContext.jsx
const { user, loading, isAuthenticated } = useAuth()
```

**¿Por qué Context API y no Redux/Zustand?**
- El estado global es mínimo (solo autenticación)
- No necesitamos un store completo
- Context API es nativo de React

### 3. Enrutamiento: React Router con Lazy Loading

```javascript
const Dashboard = lazy(() => import('./app/dashboard'))
```

**Beneficios:**
- Código más pequeño (code splitting)
- Carga inicial más rápida
- Mejor rendimiento percibido

### 4. Estilos: CSS con Variables

Usamos **CSS variables** para temas (claro/oscuro):

```css
:root {
  --bg-main: #0f172a;
  --text-primary: #f7f7fb;
  --accent: #6c5ce7;
}

:root[data-theme='light'] {
  --bg-main: #f4f6fb;
  --text-primary: #182033;
}
```

### 5. Backend: Supabase (BaaS)

| Servicio | Uso |
|----------|-----|
| **Auth** | Autenticación con email/password |
| **Database** | Perfiles, tareas, actividad, planner |
| **RLS** | Row Level Security para seguridad |

## Flujo de Datos

```
Usuario → Componente → Service → Supabase → Respuesta → Estado → UI
```

### Ejemplo: Cargar Dashboard

1. `Dashboard` llama a `useDashboardData()`
2. El hook llama a `getAuthenticatedUser()` y `getCurrentProfile()`
3. Los servicios hacen la petición a Supabase
4. Se actualiza el estado del hook
5. El componente se re-renderiza con los datos

## Seguridad

| Medida | Implementación |
|--------|----------------|
| **Autenticación** | Supabase Auth |
| **Autorización** | Row Level Security (RLS) en Supabase |
| **Variables de entorno** | Credenciales en `.env` (no en el código) |
| **Error Boundaries** | Componentes protegidos con ErrorBoundary |

## Testing

| Tipo | Herramienta | Cobertura |
|------|-------------|-----------|
| **Unitarios** | Vitest + Testing Library | ~40-50% |
| **E2E** | No implementado | 0% |

## Escalabilidad

El proyecto está diseñado para escalar:

- **Componentes**: Fáciles de agregar y mantener
- **Services**: Capa de abstracción para cambiar de backend
- **Context**: Se pueden agregar más contexts (tema, notificaciones)
- **Hooks**: Lógica reutilizable entre componentes
