import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import ConfirmDialog from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ConfirmDialog open={false} title="Test" message="Msg" onConfirm={vi.fn()} onCancel={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders title and message when open', () => {
    render(
      <ConfirmDialog open title="Delete?" message="Are you sure?" onConfirm={vi.fn()} onCancel={vi.fn()} />
    )
    expect(screen.getByText('Delete?')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(
      <ConfirmDialog open title="Delete?" message="Sure?" confirmLabel="Yes" onConfirm={onConfirm} onCancel={vi.fn()} />
    )
    await user.click(screen.getByText('Yes'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when cancel button clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(
      <ConfirmDialog open title="Delete?" message="Sure?" cancelLabel="No" onConfirm={vi.fn()} onCancel={onCancel} />
    )
    await user.click(screen.getByText('No'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('uses default labels when not provided', () => {
    render(
      <ConfirmDialog open title="Test" message="Msg" onConfirm={vi.fn()} onCancel={vi.fn()} />
    )
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })
})
