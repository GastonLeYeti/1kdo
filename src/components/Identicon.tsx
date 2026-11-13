const AVATAR_COLORS = ['#d93a3a', '#1f7a4d', '#e0a800', '#e86a8a', '#2a9d8f'];

/** FNV-1a hash of a string. */
function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0;
  return value;
}

/** The filled cells (column, row) of the symmetric 5×5 grid derived from a hash. */
function cellsOf(value: number): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      if (!((value >> (row * 3 + col)) & 1)) continue;
      cells.push([col, row]);
      if (col !== 4 - col) cells.push([4 - col, row]);
    }
  }
  return cells;
}

/** GitHub-style avatar generated from an Instagram handle (no photos). */
export function Identicon({ handle, size = 44 }: { handle: string; size?: number }) {
  const value = hash(handle);
  const color = AVATAR_COLORS[value % AVATAR_COLORS.length];
  return (
    <svg className="avatar" width={size} height={size} viewBox="0 0 6 6" role="img" aria-label={`Avatar de @${handle}`}>
      {cellsOf(value).map(([col, row]) => (
        <rect key={`${col}-${row}`} x={0.5 + col} y={0.5 + row} width={1.02} height={1.02} fill={color} />
      ))}
    </svg>
  );
}
