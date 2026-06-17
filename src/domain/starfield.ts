export interface StarFieldPoint {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: string;
  twinklePhase: number;
}

export function makeStarField(
  count: number,
  width: number,
  height: number,
  seed = 1,
): StarFieldPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const x = hashUnit(index, seed + 17.23) * width;
    const y = hashUnit(index, seed + 91.71) * height;
    const sizeRoll = hashUnit(index, seed + 203.19);
    return {
      x,
      y,
      radius: 0.65 + sizeRoll * 2.45,
      alpha: 0.2 + hashUnit(index, seed + 311.47) * 0.48,
      color: hashUnit(index, seed + 419.83) > 0.9 ? '#ffd166' : '#cdefff',
      twinklePhase: hashUnit(index, seed + 557.03) * Math.PI * 2,
    };
  });
}

function hashUnit(index: number, salt: number): number {
  const value = Math.sin((index + 1) * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}
