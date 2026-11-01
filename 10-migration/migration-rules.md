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