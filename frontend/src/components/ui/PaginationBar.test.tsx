import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import PaginationBar from './PaginationBar'

describe('PaginationBar', () => {
  it('renders nothing when only one page', () => {
    const { container } = render(<PaginationBar count={5} page={1} pageSize={50} onPage={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows page info when multiple pages', () => {
    render(<PaginationBar count={100} page={2} pageSize={10} onPage={vi.fn()} />)
    expect(screen.getByText('Page 2 of 10')).toBeInTheDocument()
  })

  it('disables Prev on first page', () => {
    render(<PaginationBar count={100} page={1} pageSize={10} onPage={vi.fn()} />)
    expect(screen.getByText('Prev').closest('button')).toBeDisabled()
  })

  it('disables Next on last page', () => {
    render(<PaginationBar count={100} page={10} pageSize={10} onPage={vi.fn()} />)
    expect(screen.getByText('Next').closest('button')).toBeDisabled()
  })

  it('calls onPage with next page on Next click', async () => {
    const onPage = vi.fn()
    const user = userEvent.setup()
    render(<PaginationBar count={100} page={2} pageSize={10} onPage={onPage} />)
    await user.click(screen.getByText('Next'))
    expect(onPage).toHaveBeenCalledWith(3)
  })

  it('calls onPage with prev page on Prev click', async () => {
    const onPage = vi.fn()
    const user = userEvent.setup()
    render(<PaginationBar count={100} page={3} pageSize={10} onPage={onPage} />)
    await user.click(screen.getByText('Prev'))
    expect(onPage).toHaveBeenCalledWith(2)
  })
})
