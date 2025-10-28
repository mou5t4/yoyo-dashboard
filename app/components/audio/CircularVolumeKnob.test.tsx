import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CircularVolumeKnob } from './CircularVolumeKnob';

describe('CircularVolumeKnob', () => {
  it('renders with value', () => {
    render(<CircularVolumeKnob value={50} onChange={vi.fn()} />);
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('displays label when provided', () => {
    render(<CircularVolumeKnob value={50} onChange={vi.fn()} label="Master Volume" />);
    expect(screen.getByText('Master Volume')).toBeInTheDocument();
  });

  it('shows muted indicator when muted', () => {
    render(<CircularVolumeKnob value={50} onChange={vi.fn()} muted={true} />);
    expect(screen.getByText('Muted')).toBeInTheDocument();
  });

  it('does not show muted indicator when not muted', () => {
    render(<CircularVolumeKnob value={50} onChange={vi.fn()} muted={false} />);
    expect(screen.queryByText('Muted')).not.toBeInTheDocument();
  });

  it('has slider role for accessibility', () => {
    render(<CircularVolumeKnob value={50} onChange={vi.fn()} />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('has correct aria attributes', () => {
    render(<CircularVolumeKnob value={75} onChange={vi.fn()} label="Volume" />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
    expect(slider).toHaveAttribute('aria-valuenow', '75');
    expect(slider).toHaveAttribute('aria-label', 'Volume');
  });

  it('handles keyboard arrow up', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<CircularVolumeKnob value={50} onChange={handleChange} />);

    const slider = screen.getByRole('slider');
    slider.focus();
    await user.keyboard('{ArrowUp}');

    expect(handleChange).toHaveBeenCalledWith(51);
  });

  it('handles keyboard arrow down', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<CircularVolumeKnob value={50} onChange={handleChange} />);

    const slider = screen.getByRole('slider');
    slider.focus();
    await user.keyboard('{ArrowDown}');

    expect(handleChange).toHaveBeenCalledWith(49);
  });

  it('handles keyboard home key', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<CircularVolumeKnob value={50} onChange={handleChange} />);

    const slider = screen.getByRole('slider');
    slider.focus();
    await user.keyboard('{Home}');

    expect(handleChange).toHaveBeenCalledWith(0);
  });

  it('handles keyboard end key', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<CircularVolumeKnob value={50} onChange={handleChange} />);

    const slider = screen.getByRole('slider');
    slider.focus();
    await user.keyboard('{End}');

    expect(handleChange).toHaveBeenCalledWith(100);
  });

  it('is disabled when disabled prop is true', () => {
    render(<CircularVolumeKnob value={50} onChange={vi.fn()} disabled={true} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('tabIndex', '-1');
  });

  it('does not respond to keyboard when disabled', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<CircularVolumeKnob value={50} onChange={handleChange} disabled={true} />);

    const slider = screen.getByRole('slider');
    slider.focus();
    await user.keyboard('{ArrowUp}');

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('displays percentage symbol', () => {
    render(<CircularVolumeKnob value={50} onChange={vi.fn()} />);
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    const { container } = render(<CircularVolumeKnob value={50} onChange={vi.fn()} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
