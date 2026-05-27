/**
 * NodeLabel.jsx
 * Floating HTML labels anchored above each canvas node.
 * Position is synchronized with the nodeConfig fractional coords.
 */
import { motion } from 'framer-motion';
import { NODE_CONFIGS, NODE_ROLES } from '../NetworkCanvas/nodeConfig';
import './NodeLabel.css';

const ROLE_META = {
  [NODE_ROLES.SENDER]: { badge: 'TX', badgeClass: 'badge-sender' },
  [NODE_ROLES.RELAY]: { badge: 'RLY', badgeClass: 'badge-relay' },
  [NODE_ROLES.BRIDGE]: { badge: 'BRG', badgeClass: 'badge-bridge' },
  [NODE_ROLES.RECEIVER]: { badge: 'RX', badgeClass: 'badge-receiver' },
};

export default function NodeLabel({ nodeId, networkStatus }) {
  const cfg = NODE_CONFIGS.find((n) => n.id === nodeId);
  if (!cfg) return null;

  const meta = ROLE_META[cfg.role] || { badge: '?', badgeClass: '' };
  const isActive = networkStatus === 'routing';

  return (
    <motion.div
      className={`node-label ${cfg.role} ${isActive ? 'active' : ''}`}
      style={{
        left: `${cfg.xFrac * 100}%`,
        top: `${cfg.yFrac * 100}%`,
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22, delay: cfg.xFrac * 0.3 }}
      whileHover={{ scale: 1.12 }}
    >
      <div className={`node-badge ${meta.badgeClass}`}>{meta.badge}</div>
      <div className="node-label-name">{cfg.label}</div>
      <div className="node-status-dot" />
    </motion.div>
  );
}

export function NodeLabelsLayer({ networkStatus }) {
  return (
    <div className="node-labels-layer" aria-hidden="true">
      {NODE_CONFIGS.map((cfg) => (
        <NodeLabel key={cfg.id} nodeId={cfg.id} networkStatus={networkStatus} />
      ))}
    </div>
  );
}
