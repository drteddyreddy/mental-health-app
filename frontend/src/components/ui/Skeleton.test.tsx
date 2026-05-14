import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SkeletonBlock, SkeletonTable, SkeletonCardGrid, SkeletonStats } from './Skeleton'

describe('Skeleton components', () => {
  it('SkeletonBlock renders with default class', () => {
    const { container } = render(<SkeletonBlock />)
    expect(container.firstChild).toHaveClass('bg-gray-200')
    expect(container.firstChild).toHaveClass('animate-pulse')
  })

  it('SkeletonBlock accepts custom className', () => {
    const { container } = render(<SkeletonBlock className="w-32 h-8" />)
    expect(container.firstChild).toHaveClass('w-32')
    expect(container.firstChild).toHaveClass('h-8')
  })

  it('SkeletonTable renders correct number of rows', () => {
    const { container } = render(<SkeletonTable rows={3} cols={4} />)
    const rows = container.querySelectorAll('.divide-y > div')
    expect(rows.length).toBe(3)
  })

  it('SkeletonCardGrid renders correct number of cards', () => {
    const { container } = render(<SkeletonCardGrid count={2} />)
    expect(container.firstChild?.childNodes.length).toBe(2)
  })

  it('SkeletonStats renders correct number of stat boxes', () => {
    const { container } = render(<SkeletonStats count={3} />)
    expect(container.firstChild?.childNodes.length).toBe(3)
  })
})
