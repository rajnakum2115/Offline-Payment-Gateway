/**
 * NetworkHeader.jsx
 * Top-center floating status bar showing network identity and live clock.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMeshStore } from '../../store/useMeshStore';
import './NetworkHeader.css';

function useClock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('en-US', { hour12: false })
  );
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

const STATUS_COLORS = {
  idle: 'var(--color-neon-green)',
  routing: 'var(--color-neon-yellow)',
  delivered: 'var(--color-neon-blue)',
  error: 'var(--color-neon-pink)',
};

export default function NetworkHeader() {
  const { state } = useMeshStore();
  const clock = useClock();
  const statusColor = STATUS_COLORS[state.networkStatus] || STATUS_COLORS.idle;

  return (
    <motion.header
      className="network-header"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22, delay: 0.1 }}
      role="banner"
    >
      {/* Left: branding */}
      <div className="nh-left">
        <div className="nh-brand">
          <span className="nh-brand-hex">⬡</span>
          <div>
            <div className="nh-brand-name font-display">OFFLINE PAYMENT MESH</div>
            <div className="nh-brand-sub font-mono">Distributed WebRTC Network · P2P Layer</div>
          </div>
        </div>
      </div>

      {/* Center: node count + signal */}
      <div className="nh-center">
        <div className="nh-metric">
          <span className="nh-metric-label font-mono">NODES</span>
          <span className="nh-metric-value font-display">7</span>
        </div>
        <div className="nh-signal-bars">
          {[4, 7, 10, 13, 16].map((h, i) => (
            <div
              key={i}
              className="nh-signal-bar"
              style={{
                height: `${h}px`,
                opacity: i < 4 ? 1 : 0.25,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
        <div className="nh-metric">
          <span className="nh-metric-label font-mono">PEERS</span>
          <span className="nh-metric-value font-display">9</span>
        </div>
      </div>

      {/* Right: clock + status */}
      <div className="nh-right">
        <div
          className="nh-status-pill font-mono"
          style={{ borderColor: statusColor, color: statusColor }}
        >
          <span
            className="nh-status-dot"
            style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }}
          />
          {state.networkStatus.toUpperCase()}
        </div>
        <div className="nh-clock font-mono">{clock}</div>
      </div>
    </motion.header>
  );
}
