import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Layout from '../src/components/Layout'

afterEach(cleanup)

describe('public landing navigation', () => {
  it.each([
    ['Demo', '/demo'],
    ['Configuración', '/preferences'],
    ['Ayuda', '/help'],
  ])('navigates to %s and closes the menu', (label, path) => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Layout>Portada</Layout>} />
          <Route path={path} element={<p>{path}</p>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /menu/i }))
    fireEvent.click(screen.getByRole('link', { name: label }))

    expect(screen.getByText(path)).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Navegación pública' })).not.toBeInTheDocument()
  })

  it('shows the shared public header, footer, and return link on interior pages', () => {
    render(
      <MemoryRouter initialEntries={['/demo']}>
        <Routes>
          <Route path="/demo" element={<Layout><p>Demo</p></Layout>} />
          <Route path="/" element={<Layout><p>Portada</p></Layout>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Inicio de sesión' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registro' })).toBeInTheDocument()
    expect(screen.getByText('Proyecto de Luis Guillermo Rodríguez Velásquez')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'GitHub' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: '← Volver al inicio' }))
    expect(screen.getByText('Portada')).toBeInTheDocument()
  })
})
