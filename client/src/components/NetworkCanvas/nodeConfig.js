/**
 * nodeConfig.js
 * Static definitions for all mesh network nodes.
 * Positions are expressed as fractions of canvas width/height (0–1).
 */

export const NODE_ROLES = {
  SENDER: 'sender',
  RELAY: 'relay',
  BRIDGE: 'bridge',
  RECEIVER: 'receiver',
};

/**
 * @type {Array<{
 *   id: string,
 *   label: string,
 *   role: string,
 *   xFrac: number,   // 0..1 fraction of canvas width
 *   yFrac: number,   // 0..1 fraction of canvas height
 *   radius: number,
 *   color: string,
 *   glowColor: string,
 *   pulseAnimation: string,
 * }>}
 */
export const NODE_CONFIGS = [
  {
    id: 'node-0',
    label: 'Device A',
    role: NODE_ROLES.SENDER,
    xFrac: 0.12,
    yFrac: 0.50,
    radius: 22,
    color: '#00d4ff',
    glowColor: 'rgba(0,212,255,0.7)',
    pulseAnimation: 'pulse-glow-blue 2.4s ease-in-out infinite',
  },
  {
    id: 'node-1',
    label: 'Device B',
    role: NODE_ROLES.RELAY,
    xFrac: 0.30,
    yFrac: 0.22,
    radius: 18,
    color: '#8b5cf6',
    glowColor: 'rgba(139,92,246,0.7)',
    pulseAnimation: 'pulse-glow-purple 2.8s ease-in-out infinite',
  },
  {
    id: 'node-2',
    label: 'Device C',
    role: NODE_ROLES.RELAY,
    xFrac: 0.30,
    yFrac: 0.78,
    radius: 18,
    color: '#8b5cf6',
    glowColor: 'rgba(139,92,246,0.7)',
    pulseAnimation: 'pulse-glow-purple 3.1s ease-in-out infinite',
  },
  {
    id: 'node-3',
    label: 'Device D',
    role: NODE_ROLES.RELAY,
    xFrac: 0.52,
    yFrac: 0.35,
    radius: 18,
    color: '#8b5cf6',
    glowColor: 'rgba(139,92,246,0.7)',
    pulseAnimation: 'pulse-glow-purple 2.6s ease-in-out infinite',
  },
  {
    id: 'node-4',
    label: 'Device E',
    role: NODE_ROLES.RELAY,
    xFrac: 0.52,
    yFrac: 0.65,
    radius: 18,
    color: '#8b5cf6',
    glowColor: 'rgba(139,92,246,0.7)',
    pulseAnimation: 'pulse-glow-purple 3.4s ease-in-out infinite',
  },
  {
    id: 'node-5',
    label: 'Bridge',
    role: NODE_ROLES.BRIDGE,
    xFrac: 0.75,
    yFrac: 0.50,
    radius: 26,
    color: '#f472b6',
    glowColor: 'rgba(244,114,182,0.7)',
    pulseAnimation: 'pulse-glow-pink 2.2s ease-in-out infinite',
  },
  {
    id: 'node-6',
    label: 'Receiver',
    role: NODE_ROLES.RECEIVER,
    xFrac: 0.92,
    yFrac: 0.50,
    radius: 22,
    color: '#00d4ff',
    glowColor: 'rgba(0,212,255,0.7)',
    pulseAnimation: 'pulse-glow-blue 2.4s ease-in-out infinite',
  },
];

/**
 * The routing path for packets: sender → relay1 → relay2 → bridge
 */
export const ROUTING_PATH = ['node-0', 'node-3', 'node-4', 'node-5'];

/** Mesh edges (pairs of node IDs to draw connection lines between) */
export const MESH_EDGES = [
  ['node-0', 'node-1'],
  ['node-0', 'node-2'],
  ['node-0', 'node-3'],
  ['node-1', 'node-3'],
  ['node-2', 'node-4'],
  ['node-3', 'node-4'],
  ['node-3', 'node-5'],
  ['node-4', 'node-5'],
  ['node-5', 'node-6'],
];
