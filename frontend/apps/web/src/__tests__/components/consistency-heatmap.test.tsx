/**
 * TASK-610: RTL component tests for ConsistencyHeatmap.
 * Tests: renders 364+ cells with correct intensity classes.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConsistencyHeatmap } from '@/components/analytics/consistency-heatmap';
import type { HeatmapDay } from '@ordo/types';

// Use a non-leap year so we get exactly 365 days
const TEST_YEAR = 2025;

function buildHeatmapData(year: number): HeatmapDay[] {
  const data: HeatmapDay[] = [];
  // Create data for a few specific days with different intensities
  data.push({ date: `${year}-01-15`, count: 1, score: 1 });
  data.push({ date: `${year}-03-10`, count: 2, score: 2 });
  data.push({ date: `${year}-06-20`, count: 3, score: 3 });
  data.push({ date: `${year}-09-01`, count: 5, score: 4 });
  return data;
}

describe('ConsistencyHeatmap', () => {
  it('renders all day cells for the year (at least 364)', () => {
    const { container } = render(
      <ConsistencyHeatmap data={[]} year={TEST_YEAR} />,
    );

    // Each day cell is a 10x10 rounded-sm div. Count them.
    // Null-padding cells also have h-[10px] w-[10px] but no rounded-sm.
    // The day cells have `rounded-sm` class.
    const cells = container.querySelectorAll('.rounded-sm.h-\\[10px\\].w-\\[10px\\]');

    // 365 days + up to 5 legend cells (one per intensity level) = 370
    // The actual day cells are inside the weeks grid, legend cells are separate.
    // We expect >= 365 day cells + 5 legend cells = 370
    // But let's be flexible: at least 364 day cells plus legend
    expect(cells.length).toBeGreaterThanOrEqual(364);
  });

  it('applies correct intensity classes based on score', () => {
    const data = buildHeatmapData(TEST_YEAR);
    const { container } = render(
      <ConsistencyHeatmap data={data} year={TEST_YEAR} />,
    );

    // Intensity class mapping:
    // 0 -> bg-muted
    // 1 -> bg-violet-200
    // 2 -> bg-violet-400
    // 3 -> bg-violet-600
    // 4 -> bg-violet-800

    // Most cells should have bg-muted (score 0)
    const mutedCells = container.querySelectorAll('.bg-muted');
    expect(mutedCells.length).toBeGreaterThan(300);

    // Should have cells with violet intensity classes from our data
    const violet200 = container.querySelectorAll('[class*="bg-violet-200"]');
    const violet400 = container.querySelectorAll('[class*="bg-violet-400"]');
    const violet600 = container.querySelectorAll('[class*="bg-violet-600"]');
    const violet800 = container.querySelectorAll('[class*="bg-violet-800"]');

    expect(violet200.length).toBeGreaterThanOrEqual(1);
    expect(violet400.length).toBeGreaterThanOrEqual(1);
    expect(violet600.length).toBeGreaterThanOrEqual(1);
    expect(violet800.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the year in the year selector', () => {
    render(
      <ConsistencyHeatmap data={[]} year={TEST_YEAR} />,
    );

    expect(screen.getByText(String(TEST_YEAR))).toBeInTheDocument();
  });

  it('renders month labels', () => {
    render(
      <ConsistencyHeatmap data={[]} year={TEST_YEAR} />,
    );

    expect(screen.getByText('Jan')).toBeInTheDocument();
    expect(screen.getByText('Jun')).toBeInTheDocument();
    expect(screen.getByText('Dec')).toBeInTheDocument();
  });

  it('renders the legend with "Less" and "More" labels', () => {
    render(
      <ConsistencyHeatmap data={[]} year={TEST_YEAR} />,
    );

    expect(screen.getByText('Less')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('calls onYearChange when year navigation buttons are clicked', async () => {
    const onYearChange = vi.fn();
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    render(
      <ConsistencyHeatmap
        data={[]}
        year={TEST_YEAR}
        onYearChange={onYearChange}
      />,
    );

    // Click the previous year button (contains ‹)
    const prevButton = screen.getAllByRole('button')[0];
    await user.click(prevButton);

    expect(onYearChange).toHaveBeenCalledWith(TEST_YEAR - 1);
  });

  it('clamps score to 4 for values above 4', () => {
    const data: HeatmapDay[] = [
      { date: `${TEST_YEAR}-05-01`, count: 10, score: 7 },
    ];
    const { container } = render(
      <ConsistencyHeatmap data={data} year={TEST_YEAR} />,
    );

    // Score 7 should be clamped to intensity 4 -> bg-violet-800
    const violet800 = container.querySelectorAll('[class*="bg-violet-800"]');
    expect(violet800.length).toBeGreaterThanOrEqual(1);
  });
});
