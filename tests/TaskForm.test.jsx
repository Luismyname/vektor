import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TaskForm from '../src/app/tasks/components/TaskForm'

describe('TaskForm', () => {
  it('envía una tarea nueva con el valor dominante', async () => {
    const onCreate = vi.fn().mockResolvedValue(true)
    const user = userEvent.setup()
    render(<TaskForm userId="user-1" dominantValue="crecimiento" onCreate={onCreate} isSubmitting={false} />)

    await user.type(screen.getByPlaceholderText('Ej. Preparar la presentación'), 'Estudiar React')
    await user.click(screen.getByRole('button', { name: 'Crear tarea' }))

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Estudiar React', related_value: 'crecimiento', user_id: 'user-1' }))
  })
})