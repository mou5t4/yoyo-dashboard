import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from './label';

describe('Label', () => {
  it('renders label with text', () => {
    render(<Label>Label Text</Label>);
    expect(screen.getByText('Label Text')).toBeInTheDocument();
  });

  it('renders as label element', () => {
    render(<Label>Label</Label>);
    expect(screen.getByText('Label').tagName).toBe('LABEL');
  });

  it('applies base styles', () => {
    render(<Label>Styled Label</Label>);
    const label = screen.getByText('Styled Label');
    expect(label).toHaveClass('text-sm', 'font-medium');
  });

  it('accepts custom className', () => {
    render(<Label className="custom-label">Custom</Label>);
    const label = screen.getByText('Custom');
    expect(label).toHaveClass('custom-label');
  });

  it('accepts htmlFor attribute', () => {
    render(<Label htmlFor="input-id">Form Label</Label>);
    const label = screen.getByText('Form Label');
    expect(label).toHaveAttribute('for', 'input-id');
  });

  it('renders children correctly', () => {
    render(
      <Label>
        <span>Nested Content</span>
      </Label>
    );
    expect(screen.getByText('Nested Content')).toBeInTheDocument();
  });
});
