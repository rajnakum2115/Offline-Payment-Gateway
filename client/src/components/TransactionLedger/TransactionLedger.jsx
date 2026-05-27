/**
 * TransactionLedger.jsx
 * Live scrollable feed of network hops and transaction events.
 */
import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMeshStore } from '../../store/useMeshStore';
import './TransactionLedger.css';

const TYPE_STYLES = {
  SEND: { borderColor: 'rgba(0,212,255,0.4)', bg: 'rgba(0,212,255,0.05)' },
  HOP: { borderColor: 'rgba(139,92,246,0.4)', bg: 'rgba(139,92,246,0.05)' },
  DELIVER: { borderColor: 'rgba(0,255,136,0.4)', bg: 'rgba(0,255,136,0.06)' },
  ERROR: { borderColor: 'rgba(244,114,182,0.4)', bg: 'rgba(244,114,182,0.05)' },
};

function LedgerRow({ entry }) {
  const style = TYPE_STYLES[entry.type] || TYPE_STYLES.HOP;
  return (
    <motion.div
      className="ledger-row"
      layout
      initial={{ x: 40, opacity: 0, scale: 0.95 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 60, opacity: 0, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      style={{
        borderLeftColor: style.borderColor,
        background: style.bg,
      }}
    >
      <div className="ledger-row-header">
        <span className="ledger-icon">{entry.icon}</span>
        <span className="ledger-type font-mono">{entry.type}</span>
        <span className="ledger-time font-mono">{entry.timestamp}</span>
      </div>
      <div className="ledger-message">{entry.message}</div>
      <div className="ledger-meta font-mono">
        {entry.amount && (
          <span className="ledger-amount">₹{entry.amount.toFixed(2)}</span>
        )}
        {entry.latency && (
          <span className="ledger-latency">{entry.latency}</span>
        )}
        <span className="ledger-packet-id">{entry.packetId}</span>
      </div>
    </motion.div>
  );
}

export default function TransactionLedger() {
  const { state } = useMeshStore();
  const scrollRef = useRef(null);

  // Auto-scroll to top on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [state.transactions.length]);

  return (
    <motion.div
      className="transaction-ledger"
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 160, damping: 20, delay: 0.35 }}
      role="region"
      aria-label="Transaction Ledger"
      aria-live="polite"
    >
      {/* Header */}
      <div className="ledger-header">
        <div className="ledger-title">
          <span className="ledger-title-icon">📡</span>
          <span className="ledger-title-text font-display">NETWORK LOG</span>
        </div>
        <div className="ledger-count font-mono">
          {state.transactions.length} events
        </div>
      </div>

      {/* Live indicator */}
      <div className="ledger-live-bar">
        <span className="ledger-live-dot" />
        <span className="ledger-live-text font-mono">LIVE FEED</span>
        <div className="ledger-pulse-bar">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="ledger-pulse-segment"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
      </div>

      {/* Entries */}
      <div className="ledger-scroll" ref={scrollRef}>
        {state.transactions.length === 0 ? (
          <div className="ledger-empty">
            <div className="ledger-empty-icon">⬡</div>
            <div className="ledger-empty-text font-mono">Awaiting network activity…</div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {state.transactions.map((entry) => (
              <LedgerRow key={entry.id} entry={entry} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer stats */}
      <div className="ledger-footer">
        <div className="ledger-footer-stat">
          <span className="font-mono">PKT</span>
          <span className="font-mono" style={{ color: 'var(--color-neon-blue)' }}>
            {state.activePackets.length}
          </span>
        </div>
        <div className="ledger-footer-divider" />
        <div className="ledger-footer-stat">
          <span className="font-mono">HOPS</span>
          <span className="font-mono" style={{ color: 'var(--color-neon-purple)' }}>
            {state.hopCount}
          </span>
        </div>
        <div className="ledger-footer-divider" />
        <div className="ledger-footer-stat">
          <span className="font-mono">SENT</span>
          <span className="font-mono" style={{ color: 'var(--color-neon-green)' }}>
            ₹{state.totalSent.toFixed(0)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
