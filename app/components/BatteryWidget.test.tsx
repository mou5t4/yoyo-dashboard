import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BatteryWidget } from './BatteryWidget';

describe('BatteryWidget', () => {
  it('renders battery level', () => {
    render(<BatteryWidget level={75} isCharging={false} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('renders title', () => {
    render(<BatteryWidget level={50} isCharging={false} />);
    expect(screen.getByText('Battery')).toBeInTheDocument();
  });

  it('shows charging status when charging', () => {
    render(<BatteryWidget level={50} isCharging={true} />);
    expect(screen.getByText('Charging')).toBeInTheDocument();
  });

  it('shows discharging status when not charging', () => {
    render(<BatteryWidget level={50} isCharging={false} />);
    expect(screen.getByText('Discharging')).toBeInTheDocument();
  });

  it('shows low battery warning when level is below 20 and not charging', () => {
    render(<BatteryWidget level={15} isCharging={false} />);
    expect(screen.getByText('Low Battery')).toBeInTheDocument();
  });

  it('does not show low battery warning when level is below 20 but charging', () => {
    render(<BatteryWidget level={15} isCharging={true} />);
    expect(screen.queryByText('Low Battery')).not.toBeInTheDocument();
  });

  it('does not show low battery warning when level is above 20', () => {
    render(<BatteryWidget level={50} isCharging={false} />);
    expect(screen.queryByText('Low Battery')).not.toBeInTheDocument();
  });

  it('applies green indicator when charging', () => {
    render(<BatteryWidget level={50} isCharging={true} />);
    const indicator = document.querySelector('.status-indicator');
    expect(indicator).toHaveClass('bg-green-500');
  });

  it('applies gray indicator when not charging', () => {
    render(<BatteryWidget level={50} isCharging={false} />);
    const indicator = document.querySelector('.status-indicator');
    expect(indicator).toHaveClass('bg-gray-500');
  });

  it('accepts custom className', () => {
    const { container } = render(<BatteryWidget level={50} isCharging={false} className="custom-class" />);
    const widget = container.firstChild;
    expect(widget).toHaveClass('custom-class');
  });

  it('handles level at 0%', () => {
    render(<BatteryWidget level={0} isCharging={false} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('Low Battery')).toBeInTheDocument();
  });

  it('handles level at 100%', () => {
    render(<BatteryWidget level={100} isCharging={false} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders base card styles', () => {
    const { container } = render(<BatteryWidget level={50} isCharging={false} />);
    const widget = container.firstChild;
    expect(widget).toHaveClass('bg-white', 'dark:bg-gray-800', 'rounded-xl');
  });
});
