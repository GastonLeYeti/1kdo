import { randomInt } from 'node:crypto';

/** Picks a random integer in [0, max): crypto-grade by default, injectable for tests. */
export type RandomIndex = (max: number) => number;

const cryptoRandomIndex: RandomIndex = (max) => randomInt(max);

/**
 * Sattolo's algorithm: a uniformly random permutation made of one single cycle.
 * Returns `next`, where next[i] is the index that follows i in the secret circle.
 */
export function sattoloCycle(size: number, random: RandomIndex = cryptoRandomIndex): number[] {
  const next = Array.from({ length: size }, (_, index) => index);
  for (let i = size - 1; i > 0; i--) {
    const j = random(i);
    [next[i], next[j]] = [next[j] as number, next[i] as number];
  }
  return next;
}

/**
 * Draws who gives to whom: everybody sits in one secret circle and gives to the
 * `giftsPerPerson` people that follow them. So each person gives and receives
 * exactly that many gifts, never to themselves and never twice to the same person.
 */
export function drawTargets(
  handles: readonly string[],
  giftsPerPerson: number,
  random: RandomIndex = cryptoRandomIndex,
): Record<string, string[]> {
  if (!Number.isInteger(giftsPerPerson) || giftsPerPerson < 1) throw new Error('giftsPerPerson must be at least 1');
  if (handles.length < giftsPerPerson + 1) throw new Error('Not enough participants for this many gifts');
  const next = sattoloCycle(handles.length, random);
  const targets: Record<string, string[]> = {};
  for (let start = 0; start < handles.length; start++) {
    const receivers: string[] = [];
    let current = start;
    for (let k = 0; k < giftsPerPerson; k++) {
      current = next[current] as number;
      receivers.push(handles[current] as string);
    }
    targets[handles[start] as string] = receivers;
  }
  return targets;
}
