import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import ErrorBoundary from '../src/components/ErrorBoundary'

// Limpiar el DOM después de cada test
afterEach(() => {
  cleanup()
})

// Componente que lanza un error cuando se renderiza
function BrokenComponent() {
  throw new Error('Error de prueba')
}

// Componente normal que no lanza errores
function WorkingComponent() {
  return <div>Componente funcionando correctamente</div>
}

describe('ErrorBoundary', () => {
  it('debe renderizar los hijos normalmente cuando no hay errores', () => {
    render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Componente funcionando correctamente')).toBeTruthy()
  })

  it('debe mostrar UI de fallback cuando un hijo lanza error', () => {
    // Silenciar el error de consola para que no ensucie el output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('¡Algo salió mal! 😔')).toBeTruthy()
    expect(screen.getByText(/Ha ocurrido un error inesperado/)).toBeTruthy()
    expect(screen.getByText(/tu trabajo está guardado/)).toBeTruthy()

    consoleSpy.mockRestore()
  })

  it('debe mostrar botones de recuperación', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Intentar de nuevo')).toBeTruthy()
    expect(screen.getByText('Recargar página')).toBeTruthy()

    consoleSpy.mockRestore()
  })

  it('debe resetear el estado al hacer clic en "Intentar de nuevo"', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Componente que falla solo la primera vez
    let shouldFail = true
    function SometimesBroken() {
      if (shouldFail) {
        throw new Error('Error temporal')
      }
      return <div>Componente recuperado</div>
    }

    const { rerender } = render(
      <ErrorBoundary>
        <SometimesBroken />
      </ErrorBoundary>
    )

    expect(screen.getByText('¡Algo salió mal! 😔')).toBeTruthy()

    // Hacer que el componente no falle la próxima vez
    shouldFail = false

    // Hacer clic en "Intentar de nuevo"
    fireEvent.click(screen.getByText('Intentar de nuevo'))

    // Re-renderizar con el componente ya funcional
    rerender(
      <ErrorBoundary>
        <SometimesBroken />
      </ErrorBoundary>
    )

    expect(screen.queryByText('¡Algo salió mal! 😔')).toBeNull()
    expect(screen.getByText('Componente recuperado')).toBeTruthy()

    consoleSpy.mockRestore()
  })

  it('debe mostrar detalles del error en modo desarrollo', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    )

    // En desarrollo, debería mostrar el summary de detalles
    expect(screen.getByText(/Ver detalles del error/)).toBeTruthy()

    consoleSpy.mockRestore()
  })
})
