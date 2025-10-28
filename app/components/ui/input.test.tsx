import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './input';

describe('Input', () => {
  it('renders input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('accepts text input', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');

    await user.type(input, 'Hello World');
    expect(input).toHaveValue('Hello World');
  });

  it('handles onChange event', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<Input onChange={handleChange} placeholder="Enter text" />);

    await user.type(screen.getByPlaceholderText('Enter text'), 'test');
    expect(handleChange).toHaveBeenCalled();
  });

  it('applies disabled state', () => {
    render(<Input disabled placeholder="Disabled input" />);
    const input = screen.getByPlaceholderText('Disabled input');
    expect(input).toBeDisabled();
  });

  it('accepts custom type', () => {
    render(<Input type="email" placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('renders password input', () => {
    render(<Input type="password" placeholder="Password" />);
    const input = screen.getByPlaceholderText('Password');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('accepts value prop', () => {
    render(<Input value="Initial value" readOnly />);
    expect(screen.getByDisplayValue('Initial value')).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(<Input className="custom-input" placeholder="Custom" />);
    const input = screen.getByPlaceholderText('Custom');
    expect(input).toHaveClass('custom-input');
  });

  it('forwards ref correctly', () => {
    const ref = vi.fn();
    render(<Input ref={ref} placeholder="Ref test" />);
    expect(ref).toHaveBeenCalled();
  });

  it('applies base styles', () => {
    render(<Input placeholder="Styled input" />);
    const input = screen.getByPlaceholderText('Styled input');
    expect(input).toHaveClass('rounded-lg', 'border-2');
  });

  it('accepts name attribute', () => {
    render(<Input name="username" placeholder="Username" />);
    const input = screen.getByPlaceholderText('Username');
    expect(input).toHaveAttribute('name', 'username');
  });

  it('accepts required attribute', () => {
    render(<Input required placeholder="Required" />);
    const input = screen.getByPlaceholderText('Required');
    expect(input).toBeRequired();
  });
});
