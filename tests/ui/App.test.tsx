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

    await userEvent.click(
      await screen.findByRole('button', { name: 'Launch Mission: Orbit Tracker' }),
    );

    expect(await screen.findByText('Keep the beam locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Orbit Tracker game surface')).toBeInTheDocument();
  });

  it('starts Star Jumper after test unlock', async () => {
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: 'Unlock Cards' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Launch Mission: Star Jumper' }),
    );

    expect(await screen.findByText('Jump to the red gate')).toBeInTheDocument();
    expect(screen.getByLabelText('Star Jumper game surface')).toBeInTheDocument();
  });

  it('starts Focus Portal after test unlock', async () => {
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: 'Unlock Cards' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Launch Mission: Focus Portal' }),
    );

    expect(await screen.findByText('Dive the depth portal')).toBeInTheDocument();
    expect(screen.getByLabelText('Focus Portal game surface')).toBeInTheDocument();
  });

  it('shows audio briefing and test unlock affordances on the star map', async () => {
    render(<App />);

    expect(await screen.findByText('Audio Briefings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlock Cards' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hear Orbit Tracker briefing' })).toBeInTheDocument();
  });
});
