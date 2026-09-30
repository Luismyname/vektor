# Guía de Desarrollo

## Configuración Inicial

### Requisitos

- Node.js 18+
- npm 9+
- Cuenta en [Supabase](https://supabase.com)

### Instalación

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd vector

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Iniciar desarrollo
npm run dev
```

## Convenciones de Código

### Nomenclatura

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Componentes | PascalCase | `DashboardTasks.jsx` |
| Hooks | camelCase con prefijo `use` | `useDashboardData.js` |
| Servicios | camelCase | `auth.js`, `tasks.js` |
| Constantes | UPPER_SNAKE_CASE | `DEFAULT_DURATION` |
| Variables | camelCase | `userName`, `isLoading` |

### Estructura de Componentes

```jsx
// 1. Imports
import { useState, useEffect } from 'react'
import { someService } from '../../services/someService'

// 2. Constantes
const DEFAULT_VALUE = 'default'

// 3. Componente
export default function MyComponent({ prop1, prop2 }) {
  // 4. Estado
  const [state, setState] = useState(null)

  // 5. Efectos
  useEffect(() => {
    // Lógica de montaje
  }, [])

  // 6. Handlers
  const handleClick = () => {
    // Lógica del evento
  }

  // 7. Renderizado
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

### Estructura de Services

```javascript
// 1. Importar cliente de Supabase
import { supabase } from './supabase'

// 2. Funciones de servicio
export async function getData(userId) {
  const { data, error } = await supabase
    .from('table')
    .select('*')
    .eq('user_id', userId)

  return { data, error }
}

export async function createData(payload) {
  const { data, error } = await supabase
    .from('table')
    .insert(payload)
    .select()

  return { data, error }
}
```

## Flujo de Trabajo

### Crear una nueva página

1. Crear carpeta en `src/app/nueva-pagina/`
2. Crear `index.jsx` con el componente
3. Agregar ruta en `src/App.jsx`
4. Crear componentes específicos en `src/app/nueva-pagina/components/`

### Crear un nuevo servicio

1. Crear archivo en `src/services/nuevo-servicio.js`
2. Importar `supabase` desde `./supabase`
3. Exportar funciones async que retornen `{ data, error }`

### Crear un nuevo hook

1. Crear archivo en `src/hooks/useNombre.js`
2. Usar `useState`, `useEffect`, etc.
3. Retornar un objeto con estado y funciones

## Testing

### Escribir tests

```javascript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MyComponent from '../src/components/MyComponent'

describe('MyComponent', () => {
  it('debe renderizar correctamente', () => {
    render(<MyComponent />)
    expect(screen.getByText('Texto esperado')).toBeTruthy()
  })

  it('debe manejar clicks', () => {
    const handleClick = vi.fn()
    render(<MyComponent onClick={handleClick} />)
    fireEvent.click(screen.getByText('Botón'))
    expect(handleClick).toHaveBeenCalled()
  })
})
```

### Ejecutar tests

```bash
# Todos los tests
npm test

# Modo watch
npm run test:watch

# Coverage
npm run test:coverage
```

## Git

### Commits

Usa mensajes descriptivos en español:

```
feat: agregar página de hábitos
fix: corregir error en el timer
docs: actualizar README
test: agregar tests para Dashboard
refactor: simplificar componente TaskTimer
```

### Ramas

- `main` — Código en producción
- `develop` — Desarrollo activo
- `feature/nombre` — Nuevas funcionalidades
- `fix/nombre` — Correcciones

## Despliegue

### Build de producción

```bash
npm run build
```

### Despliegue en Vercel

```bash
npm run build
```

Los archivos generados estarán en `dist/` y se despliegan automáticamente en Vercel.

## Solución de Problemas

### Error: "process is not defined"

En Vite, usa `import.meta.env` en lugar de `process.env`:

```javascript
// ❌ Incorrecto
if (process.env.NODE_ENV === 'development') { ... }

// ✅ Correcto
if (import.meta.env.DEV) { ... }
```

### Error: "supabase is not defined"

Asegúrate de importar el cliente:

```javascript
import { supabase } from '../services/supabase'
```

### Los tests fallan

1. Verifica que los mocks estén correctos
2. Asegúrate de usar `cleanup()` después de cada test
3. Verifica que los componentes estén correctamente importados

## Recursos

- [Documentación de React](https://react.dev)
- [Documentación de Vite](https://vitejs.dev)
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Vitest](https://vitest.dev)
- [Testing Library](https://testing-library.com)
