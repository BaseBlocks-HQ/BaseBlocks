export function particleColor(
  intensity: number,
  dark: boolean,
  highlight = 0.4,
  _hueShift = 0,
) {
  const value = Math.max(0, Math.min(1, intensity));
  const lift = Math.max(0, Math.min(1, highlight));

  if (dark) {
    const baseLightness = 0.45 + 0.38 * value;
    const lightness = baseLightness + lift * (1 - baseLightness) * 0.4;
    const alpha = Math.min(1, 0.12 + 0.88 * value);
    return `oklch(${lightness.toFixed(3)} 0 0 / ${alpha.toFixed(3)})`;
  }

  const baseLightness = 0.68 - 0.41 * value;
  const lightness = baseLightness + lift * (1 - baseLightness) * 0.45;
  const alpha = Math.min(1, 0.14 + 0.76 * value);
  return `oklch(${lightness.toFixed(3)} 0 0 / ${alpha.toFixed(3)})`;
}
