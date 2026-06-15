import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '@/ui/App';

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the star map and dashboard', async () => {
    render(<App />);

    expect(await screen.findByText("Choose today's mission")).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Dashboard/i }));

    await waitFor(() => {
      expect(screen.getByText('Progress and exports')).toBeInTheDocument();
    });
  });

  it('starts the orbit tracker mission', async () => {
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: /Launch Mission/i }));

    expect(await screen.findByText('Keep the beam locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Orbit Tracker game surface')).toBeInTheDocument();
  });
});
