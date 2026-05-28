import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Avatar from '../Avatar';

describe('Avatar Component', () => {
  it('renders initials fallback when no src provided', () => {
    render(<Avatar alt="Ashwin Kumar" />);
    expect(screen.getByText('AK')).toBeInTheDocument();
  });

  it('renders initials from single name', () => {
    render(<Avatar alt="Ashwin" />);
    expect(screen.getByText('AS')).toBeInTheDocument();
  });

  it('renders image when src is valid', async () => {
    render(<Avatar src="https://example.com/avatar.jpg" alt="Ashwin Kumar" />);
    
    const img = screen.getByRole('img', { name: 'Ashwin Kumar' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('falls back to initials on image error', async () => {
    render(<Avatar src="https://example.com/broken.jpg" alt="Ashwin Kumar" />);
    
    const img = screen.getByRole('img', { name: 'Ashwin Kumar' });
    
    // Simulate image error
    img.dispatchEvent(new Event('error'));
    
    await waitFor(() => {
      expect(screen.getByText('AK')).toBeInTheDocument();
    });
  });

  it('renders with correct size classes', () => {
    const { container } = render(<Avatar alt="Test User" size={64} />);
    expect(container.querySelector('.w-16')).toBeInTheDocument();
    expect(container.querySelector('.h-16')).toBeInTheDocument();
  });

  it('renders square shape for company logos', () => {
    const { container } = render(<Avatar alt="ForgeAsh" square />);
    expect(container.querySelector('.rounded-md')).toBeInTheDocument();
  });

  it('renders role badge when provided', () => {
    const { container } = render(<Avatar alt="Test User" badge="student" />);
    const badge = container.querySelector('.bg-blue-500');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('aria-label', 'student badge');
  });

  it('applies cache-buster to image URL', () => {
    render(<Avatar src="https://example.com/avatar.jpg" alt="Test" version="123" />);
    
    const img = screen.getByRole('img');
    expect(img.src).toContain('v=123');
  });

  it('has proper accessibility attributes', () => {
    const { container } = render(<Avatar alt="Ashwin Kumar" />);
    
    const avatarContainer = container.firstChild;
    expect(avatarContainer).toHaveAttribute('role', 'img');
    expect(avatarContainer).toHaveAttribute('aria-label', 'Ashwin Kumar');
  });

  it('renders loading skeleton initially', () => {
    const { container } = render(<Avatar src="https://example.com/avatar.jpg" alt="Test" />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('handles empty alt text gracefully', () => {
    render(<Avatar alt="" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
