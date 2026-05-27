/**
 * ControlPanel.jsx
 * Glassmorphism floating panel — bottom-left.
 * Contains balance readout and Send Payment button.
 */
import { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useMeshStore } from '../../store/useMeshStore';
import './ControlPanel.css';

const PRESET_AMOUNTS = [10, 25, 50, 100, 250];

const statusConfig = {
  idle: { text: 'Mesh Online', color: 'var(--color-neon-green)', icon: '◉' },
  routing: { text: 'Routing Packet…', color: 'var(--color-neon-yellow)', icon: '◎' },
  delivered: { text: 'Delivered!', color: 'var(--color-neon-blue)', icon: '✦' },
  error: { text: 'Route Failed', color: 'var(--color-neon-pink)', icon: '◈' },
};

export default function ControlPanel({ onSendPayment }) {
  const { state } = useMeshStore();
  const [amount, setAmount] = useState(25);
  const [isPressed, setIsPressed] = useState(false);
  const btnRef = useRef(null);

  const isRouting = state.networkStatus === 'routing';
  const status = statusConfig[state.networkStatus] || statusConfig.idle;

  const handleSend = () => {
    if (isRouting) return;
    onSendPayment(amount);
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 300);
  };

  const canAfford = state.balance >= amount;

  return (
    <motion.div
      className="control-panel"
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 160, damping: 20, delay: 0.2 }}
      role="region"
      aria-label="Control Panel"
    >
      {/* Header */}
      <div className="cp-header">
        <div className="cp-logo">
          <span className="cp-logo-icon">⬡</span>
          <span className="cp-logo-text">OfflineMesh</span>
        </div>
        <div className="cp-version font-mono">v2.4.1</div>
      </div>

      {/* Network Status */}
      <div className="cp-status">
        <span
          className="cp-status-icon"
          style={{ color: status.color, textShadow: `0 0 8px ${status.color}` }}
        >
          {status.icon}
        </span>
        <span className="cp-status-text font-mono" style={{ color: status.color }}>
          {status.text}
        </span>
      </div>

      <div className="cp-divider" />

      {/* Balance Readout */}
      <div className="cp-balance-section">
        <div className="cp-balance-label font-mono">WALLET BALANCE</div>
        <motion.div
          className="cp-balance-value font-display"
          key={state.balance}
          initial={{ scale: 1.08, color: '#00ff88' }}
          animate={{ scale: 1, color: '#00d4ff' }}
          transition={{ duration: 0.5 }}
        >
          <span className="cp-balance-currency">₹</span>
          {state.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </motion.div>
        <div className="cp-stats-row">
          <div className="cp-stat">
            <span className="cp-stat-label font-mono">TOTAL SENT</span>
            <span className="cp-stat-value font-mono">₹{state.totalSent.toFixed(2)}</span>
          </div>
          <div className="cp-stat">
            <span className="cp-stat-label font-mono">HOP COUNT</span>
            <span className="cp-stat-value font-mono">{state.hopCount}</span>
          </div>
        </div>
      </div>

      <div className="cp-divider" />

      {/* Amount Selector */}
      <div className="cp-amount-section">
        <div className="cp-amount-label font-mono">SEND AMOUNT (₹)</div>
        <div className="cp-preset-grid">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              id={`preset-${preset}`}
              className={`cp-preset-btn font-mono ${amount === preset ? 'selected' : ''}`}
              onClick={() => setAmount(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
        <div className="cp-custom-input-row">
          <span className="cp-input-currency font-mono">₹</span>
          <input
            id="custom-amount-input"
            type="number"
            className="cp-custom-input font-mono"
            value={amount}
            min={1}
            max={state.balance}
            onChange={(e) => setAmount(Math.max(1, parseFloat(e.target.value) || 0))}
          />
        </div>
      </div>

      {/* Send Button */}
      <motion.button
        id="send-payment-btn"
        ref={btnRef}
        className={`cp-send-btn ${isRouting ? 'routing' : ''} ${!canAfford ? 'disabled' : ''}`}
        onClick={handleSend}
        disabled={isRouting || !canAfford}
        whileHover={!isRouting && canAfford ? { scale: 1.04, y: -2 } : {}}
        whileTap={!isRouting && canAfford ? { scale: 0.97 } : {}}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        aria-label="Send offline payment"
      >
        <motion.span
          className="cp-send-btn-inner"
          animate={isRouting ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
          transition={isRouting ? { repeat: Infinity, duration: 1 } : {}}
        >
          {isRouting ? (
            <>
              <span className="cp-btn-spinner" />
              ROUTING…
            </>
          ) : !canAfford ? (
            '⚠ INSUFFICIENT FUNDS'
          ) : (
            <>
              <span className="cp-btn-icon">⚡</span>
              SEND OFFLINE PAYMENT
            </>
          )}
        </motion.span>
      </motion.button>

      {/* Footer note */}
      <div className="cp-footer font-mono">
        WebRTC Mesh · End-to-End Encrypted · {state.activePackets.length} active packet{state.activePackets.length !== 1 ? 's' : ''}
      </div>
    </motion.div>
  );
}
