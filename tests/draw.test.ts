import { describe, expect, it } from 'vitest';
import { drawTargets, sattoloCycle } from '../server/draw';

const people = (count: number) => Array.from({ length: count }, (_, i) => `person.${i}`);

/** Follows `next` from 0 and returns how many steps it takes to come back. */
function cycleLength(next: number[]): number {
  let steps = 0;
  let current = 0;
  do {
    current = next[current] as number;
    steps++;
  } while (current !== 0 && steps <= next.length);
  return steps;
}

describe('sattoloCycle', () => {
  it('always builds one single circle through everybody', () => {
    for (let size = 2; size <= 15; size++) {
      for (let run = 0; run < 50; run++) expect(cycleLength(sattoloCycle(size))).toBe(size);
    }
  });
});

describe('drawTargets', () => {
  for (const gifts of [1, 2, 3]) {
    it(`gives ${gifts} distinct people to each, never oneself, and everyone receives ${gifts}`, () => {
      for (let size = gifts + 1; size <= 12; size++) {
        for (let run = 0; run < 30; run++) {
          const handles = people(size);
          const targets = drawTargets(handles, gifts);
          const received = new Map(handles.map((h) => [h, 0]));
          for (const giver of handles) {
            const receivers = targets[giver] ?? [];
            expect(receivers).toHaveLength(gifts);
            expect(new Set(receivers).size).toBe(gifts);
            expect(receivers).not.toContain(giver);
            for (const r of receivers) received.set(r, (received.get(r) ?? 0) + 1);
          }
          for (const count of received.values()) expect(count).toBe(gifts);
        }
      }
    });
  }

  it('needs at least gifts + 1 participants', () => {
    expect(() => drawTargets(people(2), 2)).toThrow();
    expect(() => drawTargets(people(3), 2)).not.toThrow();
    expect(() => drawTargets(people(3), 0)).toThrow();
  });

  it('is not a guessable rotation of the list order', () => {
    const handles = people(10);
    const firstTargets = new Set<string>();
    for (let run = 0; run < 200; run++) firstTargets.add(drawTargets(handles, 1)['person.0']![0]!);
    expect(firstTargets.size).toBeGreaterThan(5);
  });
});
