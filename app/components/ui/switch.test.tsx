import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './switch';

describe('Switch', () => {
  it('renders switch component', () => {
    render(<Switch />);
    const switchElement = screen.getByRole('checkbox');
    expect(switchElement).toBeInTheDocument();
  });

  it('toggles on click', async () => {
    const user = userEvent.setup();
    render(<Switch />);
    const switchElement = screen.getByRole('checkbox');

    expect(switchElement).not.toBeChecked();
    await user.click(switchElement);
    expect(switchElement).toBeChecked();
    await user.click(switchElement);
    expect(switchElement).not.toBeChecked();
  });

  it('calls onCheckedChange when toggled', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<Switch onCheckedChange={handleChange} />);

    await user.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('calls onChange when toggled', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<Switch onChange={handleChange} />);

    await user.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalled();
  });

  it('can be controlled with checked prop', () => {
    const { rerender } = render(<Switch checked={false} readOnly />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();

    rerender(<Switch checked={true} readOnly />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('applies disabled state', () => {
    render(<Switch disabled />);
    const switchElement = screen.getByRole('checkbox');
    expect(switchElement).toBeDisabled();
  });

  it('does not toggle when disabled', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<Switch disabled onCheckedChange={handleChange} />);

    await user.click(screen.getByRole('checkbox'));
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('accepts custom className', () => {
    render(<Switch className="custom-switch" />);
    // The className is applied to the inner div, not the checkbox
    expect(document.querySelector('.custom-switch')).toBeInTheDocument();
  });

  it('has checkbox role', () => {
    render(<Switch />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });
});
