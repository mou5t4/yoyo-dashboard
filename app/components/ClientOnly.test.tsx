import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ClientOnly } from './ClientOnly';

describe('ClientOnly', () => {
  it('renders children after mounting', async () => {
    render(
      <ClientOnly fallback={<div>Loading...</div>}>
        {() => <div>Client Content</div>}
      </ClientOnly>
    );

    // In test environment, useEffect runs synchronously, so content appears immediately
    await waitFor(() => {
      expect(screen.getByText('Client Content')).toBeInTheDocument();
    });
  });

  it('renders children when mounted', async () => {
    render(
      <ClientOnly>
        {() => <div>Client Content</div>}
      </ClientOnly>
    );

    // Component should render children after mount
    await waitFor(() => {
      expect(screen.getByText('Client Content')).toBeInTheDocument();
    });
  });

  it('calls children function when mounted', async () => {
    const childrenFn = vi.fn(() => <div>Content</div>);

    render(<ClientOnly>{childrenFn}</ClientOnly>);

    await waitFor(() => {
      expect(childrenFn).toHaveBeenCalled();
    });
  });

  it('renders complex children correctly', async () => {
    render(
      <ClientOnly>
        {() => (
          <div>
            <h1>Title</h1>
            <p>Paragraph</p>
          </div>
        )}
      </ClientOnly>
    );

    await waitFor(() => {
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Paragraph')).toBeInTheDocument();
    });
  });

  it('handles multiple ClientOnly components independently', async () => {
    render(
      <>
        <ClientOnly fallback={<div>Loading 1</div>}>
          {() => <div>Content 1</div>}
        </ClientOnly>
        <ClientOnly fallback={<div>Loading 2</div>}>
          {() => <div>Content 2</div>}
        </ClientOnly>
      </>
    );

    await waitFor(() => {
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });
});
