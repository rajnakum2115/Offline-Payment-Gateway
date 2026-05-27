/**
 * vectorUtils.js
 * Lightweight 2D vector helpers for physics calculations.
 */

/** Normalize a 2D vector to unit length */
export function normalize(v) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/** Scale a vector by a scalar */
export function scale(v, s) {
  return { x: v.x * s, y: v.y * s };
}

/** Add two vectors */
export function add(v1, v2) {
  return { x: v1.x + v2.x, y: v1.y + v2.y };
}

/** Subtract v2 from v1 */
export function subtract(v1, v2) {
  return { x: v1.x - v2.x, y: v1.y - v2.y };
}

/** Compute distance between two points */
export function distance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Compute unit direction vector from p1 → p2 */
export function direction(p1, p2) {
  return normalize(subtract(p2, p1));
}

/** Clamp a value between min and max */
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/** Generate a force vector from p1 → p2 with given magnitude */
export function forceToward(p1, p2, magnitude) {
  return scale(direction(p1, p2), magnitude);
}
