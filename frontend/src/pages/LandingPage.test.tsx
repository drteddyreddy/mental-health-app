import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LandingPage from './LandingPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  )
}

describe('LandingPage', () => {
  it('renders hero section', () => {
    renderPage()
    expect(screen.getAllByText('MindWell').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Get Started').length).toBeGreaterThan(0)
  })

  it('renders features', () => {
    renderPage()
    expect(screen.getByText('Fully Anonymous')).toBeInTheDocument()
    expect(screen.getByText('Aggregate Insights')).toBeInTheDocument()
    expect(screen.getByText('Clinical Tools')).toBeInTheDocument()
  })

  it('renders how it works steps', () => {
    renderPage()
    expect(screen.getByText('How It Works')).toBeInTheDocument()
    expect(screen.getByText(/Register your company/)).toBeInTheDocument()
    expect(screen.getByText(/Upload employees/)).toBeInTheDocument()
    expect(screen.getByText(/Create a campaign/)).toBeInTheDocument()
    expect(screen.getByText(/Share anonymous links/)).toBeInTheDocument()
    expect(screen.getByText(/View aggregate results/)).toBeInTheDocument()
  })

  it('has login link', () => {
    renderPage()
    const loginLink = screen.getByText('Log In')
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login')
  })

  it('has register link', () => {
    renderPage()
    const getStartedLinks = screen.getAllByText('Get Started')
    for (const link of getStartedLinks) {
      expect(link.closest('a')).toHaveAttribute('href', '/register')
    }
  })
})
