import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard } from './MetricCard';

// Mock MiniChart component
vi.mock('./ui/mini-chart', () => ({
  MiniChart: ({ value, max, color, size }: any) => (
    <div data-testid="mini-chart" data-value={value} data-max={max} data-color={color} data-size={size}>
      Chart: {value}/{max}
    </div>
  ),
}));

describe('MetricCard', () => {
  it('renders title and value', () => {
    render(<MetricCard title="Test Metric" value="100" />);
    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<MetricCard title="Test" value="50" subtitle="Active now" />);
    expect(screen.getByText('Active now')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    render(<MetricCard title="Test" value="50" />);
    expect(screen.queryByText('Active now')).not.toBeInTheDocument();
  });

  it('applies green status color', () => {
    render(<MetricCard title="Test" value="50" subtitle="Good" statusColor="green" />);
    const indicator = document.querySelector('.status-indicator');
    expect(indicator).toHaveClass('bg-green-500');
  });

  it('applies yellow status color', () => {
    render(<MetricCard title="Test" value="50" subtitle="Warning" statusColor="yellow" />);
    const indicator = document.querySelector('.status-indicator');
    expect(indicator).toHaveClass('bg-yellow-500');
  });

  it('applies red status color', () => {
    render(<MetricCard title="Test" value="50" subtitle="Error" statusColor="red" />);
    const indicator = document.querySelector('.status-indicator');
    expect(indicator).toHaveClass('bg-red-500');
  });

  it('applies blue status color', () => {
    render(<MetricCard title="Test" value="50" subtitle="Info" statusColor="blue" />);
    const indicator = document.querySelector('.status-indicator');
    expect(indicator).toHaveClass('bg-blue-500');
  });

  it('renders chart when showChart is true and chartValue is provided', () => {
    render(
      <MetricCard
        title="Test"
        value="50"
        showChart={true}
        chartValue={75}
        chartMax={100}
      />
    );
    expect(screen.getByTestId('mini-chart')).toBeInTheDocument();
  });

  it('does not render chart when showChart is false', () => {
    render(
      <MetricCard
        title="Test"
        value="50"
        showChart={false}
        chartValue={75}
      />
    );
    expect(screen.queryByTestId('mini-chart')).not.toBeInTheDocument();
  });

  it('renders icon when provided and chart is not shown', () => {
    const icon = <div data-testid="custom-icon">Icon</div>;
    render(<MetricCard title="Test" value="50" icon={icon} showChart={false} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('uses custom chart color when provided', () => {
    render(
      <MetricCard
        title="Test"
        value="50"
        chartValue={75}
        chartColor="#FF5733"
      />
    );
    const chart = screen.getByTestId('mini-chart');
    expect(chart).toHaveAttribute('data-color', '#FF5733');
  });

  it('uses default chart color based on status color', () => {
    render(
      <MetricCard
        title="Test"
        value="50"
        chartValue={75}
        statusColor="green"
      />
    );
    const chart = screen.getByTestId('mini-chart');
    expect(chart).toHaveAttribute('data-color', '#10b981');
  });

  it('accepts number value', () => {
    render(<MetricCard title="Test" value={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('accepts string value', () => {
    render(<MetricCard title="Test" value="Online" />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('applies default chartMax of 100', () => {
    render(<MetricCard title="Test" value="50" chartValue={75} />);
    const chart = screen.getByTestId('mini-chart');
    expect(chart).toHaveAttribute('data-max', '100');
  });

  it('accepts custom chartMax', () => {
    render(<MetricCard title="Test" value="50" chartValue={75} chartMax={200} />);
    const chart = screen.getByTestId('mini-chart');
    expect(chart).toHaveAttribute('data-max', '200');
  });

  it('renders base card styles', () => {
    const { container } = render(<MetricCard title="Test" value="50" />);
    const card = container.firstChild;
    expect(card).toHaveClass('bg-white', 'dark:bg-gray-800', 'rounded-xl');
  });
});
