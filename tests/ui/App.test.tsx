import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '@/ui/App';

describe('App', () => {
  beforeEach(() => {
    delete window.nateAcademy;
    window.localStorage.clear();
  });

  it('renders the star map and dashboard', async () => {
    render(<App />);

    expect(await screen.findByText("Choose today's mission")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check Updates' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Dashboard/i }));

    await waitFor(() => {
      expect(screen.getByText('Progress and exports')).toBeInTheDocument();
    });
  });

  it('reports that updates require the desktop app in browser mode', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Check Updates' }));

    expect(await screen.findByRole('button', { name: 'Check Updates' })).toHaveAttribute(
      'title',
      'Updates work in the installed app.',
    );
  });

  it('starts the orbit tracker mission', async () => {
    render(<App />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Launch Mission: Orbit Tracker' }),
    );
    expect(await screen.findByText('Track')).toBeInTheDocument();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Start Mission: Orbit Tracker' }),
    );

    expect(await screen.findByText('Keep the beam locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Orbit Tracker game surface')).toBeInTheDocument();
  });

  it('shows the mission summary when ending a mission', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Launch Mission: Orbit Tracker' }));
    await user.click(await screen.findByRole('button', { name: 'Start Mission: Orbit Tracker' }));
    await user.click(await screen.findByRole('button', { name: 'End' }));

    expect(await screen.findByText('Mission Complete')).toBeInTheDocument();
    expect(screen.getByText('Mission Logged')).toBeInTheDocument();
  });

  it('shows the mission summary even if progress saving fails', async () => {
    window.nateAcademy = {
      load: async () => null,
      save: async () => {
        throw new Error('save failed');
      },
      clear: async () => true,
    };
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Launch Mission: Orbit Tracker' }));
    await user.click(await screen.findByRole('button', { name: 'Start Mission: Orbit Tracker' }));
    await user.click(await screen.findByRole('button', { name: 'End' }));

    expect(await screen.findByText('Mission Complete')).toBeInTheDocument();
    expect(screen.getByText('Mission Logged')).toBeInTheDocument();
  });

  it('starts Star Jumper without requiring a parent unlock', async () => {
    render(<App />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Launch Mission: Star Jumper' }),
    );
    expect(await screen.findByText('Start')).toBeInTheDocument();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Start Mission: Star Jumper' }),
    );

    expect(await screen.findByText('Jump to the red gate')).toBeInTheDocument();
    expect(screen.getByLabelText('Star Jumper game surface')).toBeInTheDocument();
  });

  it('starts Focus Portal without requiring a parent unlock', async () => {
    render(<App />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Launch Mission: Focus Portal' }),
    );
    expect(await screen.findByText('Watch')).toBeInTheDocument();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Start Mission: Focus Portal' }),
    );

    expect(await screen.findByText('Stop the crash codes')).toBeInTheDocument();
    expect(screen.getByLabelText('Focus Portal game surface')).toBeInTheDocument();
  });

  it('starts Dual-Signal Decoder without requiring a parent unlock', async () => {
    render(<App />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Launch Mission: Dual-Signal Decoder' }),
    );
    expect(await screen.findByText('Red')).toBeInTheDocument();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Start Mission: Dual-Signal Decoder' }),
    );

    expect(await screen.findByText('Match both signals')).toBeInTheDocument();
    expect(screen.getByLabelText('Dual-Signal Decoder game surface')).toBeInTheDocument();
  });

  it('shows audio briefing and level test affordances on the star map', async () => {
    render(<App />);

    expect(await screen.findByText('Audio Briefings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Games' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lock Games' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Level 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Level 30' })).toBeInTheDocument();
    expect(
      screen.getByRole('spinbutton', { name: 'Select Orbit Tracker level' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Increase Orbit Tracker level' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hear Orbit Tracker briefing' })).toBeInTheDocument();
  });

  it('can relock and reopen mission cards for testing', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      await screen.findByRole('button', { name: 'Launch Mission: Star Jumper' }),
    ).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Lock Games' }));
    expect(screen.getByRole('button', { name: 'Launch Mission: Star Jumper' })).toBeDisabled();
    expect(screen.getByText('Earn 6 more')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open Games' }));
    expect(screen.getByRole('button', { name: 'Launch Mission: Star Jumper' })).toBeEnabled();
  });

  it('can reset and max all mission levels for testing', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Level 30' }));
    expect(screen.getByRole('spinbutton', { name: 'Select Orbit Tracker level' })).toHaveValue(30);
    expect(screen.getByRole('spinbutton', { name: 'Select Star Jumper level' })).toHaveValue(30);

    await user.click(screen.getByRole('button', { name: 'Level 1' }));
    expect(screen.getByRole('spinbutton', { name: 'Select Orbit Tracker level' })).toHaveValue(1);
    expect(screen.getByRole('spinbutton', { name: 'Select Star Jumper level' })).toHaveValue(1);
  });

  it('launches the selected Orbit Tracker testing level', async () => {
    const user = userEvent.setup();
    render(<App />);

    const increase = await screen.findByRole('button', { name: 'Increase Orbit Tracker level' });
    for (let clickCount = 0; clickCount < 5; clickCount += 1) {
      await user.click(increase);
    }
    await user.click(screen.getByRole('button', { name: 'Launch Mission: Orbit Tracker' }));
    await user.click(await screen.findByRole('button', { name: 'Start Mission: Orbit Tracker' }));

    expect(await screen.findByLabelText('Orbit Tracker game surface')).toHaveAttribute(
      'data-level',
      '6',
    );
  });
});
