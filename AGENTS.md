# Guía del repositorio

## Estructura del proyecto

- Vektor es una aplicación con React 19 y Vite 8, con una versión de escritorio basada en Electron y datos respaldados por Supabase.
- Mantén las páginas y los componentes específicos de cada funcionalidad en `src/app/<feature>/`. Coloca la interfaz reutilizable en `src/components/`, los hooks compartidos en `src/hooks/`, los helpers de dominio en `src/lib/` y las operaciones de backend en `src/services/`.
- Mantén los estilos coherentes con las capas CSS existentes en `src/styles/` y con las hojas de estilo de cada funcionalidad. Evita introducir un sistema de estilos nuevo para un cambio local.
- `src/services/supabase.js` es el cliente compartido de Supabase. Reutiliza los patrones existentes de los servicios y conserva el acceso por usuario y las garantías de seguridad a nivel de fila (RLS) al cambiar operaciones de datos.

## Cambios y validación

- Sigue las convenciones del código y las pruebas cercanas; las pruebas usan Vitest y Testing Library, y están en `tests/`.
- Ejecuta primero la prueba pertinente más específica. Las comprobaciones disponibles incluyen `npm test`, `npm run lint` y `npm run build`.
- Ten en cuenta el comportamiento en el navegador y en Electron: Vite usa rutas relativas para los recursos, y la versión de escritorio en producción usa hash routing y carga `dist/index.html` localmente.
- No edites los archivos generados en `dist/` o `release/`, salvo que la tarea se refiera explícitamente a artefactos de empaquetado.
- Mantén las credenciales de Supabase en la configuración local del entorno; nunca agregues secretos al control de versiones.
