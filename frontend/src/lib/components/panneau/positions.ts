export function ellipsePositions({
  n,
  cx,
  cy,
  rx,
  ry,
  nudges,
  angle,
}: PositionParams) {
  return Array.from({ length: n }, (_, i) => {
    const a = ((2 * Math.PI) / n) * i - Math.PI + angle;
    return {
      x: cx + (rx + nudges[i]) * Math.cos(a),
      y: cy + (ry + nudges[i]) * Math.sin(a),
    };
  });
}

export function tanPositions({
  n,
  cx,
  cy,
  rx,
  ry,
  nudges,
  angle,
  maxTan = 2.5,
}: PositionParams & { maxTan?: number }) {
  return Array.from({ length: n }, (_, i) => {
    const a = ((2 * Math.PI) / n) * i - Math.PI + angle;
    return {
      x:
        cx +
        (rx + nudges[i]) * Math.max(-maxTan, Math.min(maxTan, Math.tan(a))),
      y: cy + (ry + nudges[i]) * Math.sin(a),
    };
  });
}
