/**
 * PacketToast.jsx
 * Delivery success notification that floats up with spring physics.
 */
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMeshStore } from '../../store/useMeshStore';
import './PacketToast.css';

export default function PacketToast() {
  const { state, dismissToast } = useMeshStore();
  const toast = state.lastToast;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismissToast, 3800);
    return () => clearTimeout(timer);
  }, [toast, dismissToast]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          id="packet-toast"
          className="packet-toast"
          role="alert"
          aria-live="assertive"
          initial={{ y: 60, opacity: 0, scale: 0.82 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -30, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          onClick={dismissToast}
          style={{ cursor: 'pointer' }}
        >
          {/* Animated rings */}
          <div className="toast-rings">
            <div className="toast-ring toast-ring-1" />
            <div className="toast-ring toast-ring-2" />
            <div className="toast-ring toast-ring-3" />
          </div>

          <div className="toast-icon-wrap">
            <motion.div
              className="toast-icon"
              initial={{ rotate: -20, scale: 0.5 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
            >
              ✅
            </motion.div>
          </div>

          <div className="toast-content">
            <div className="toast-title font-display">PAYMENT DELIVERED</div>
            <div className="toast-subtitle font-mono">
              via {toast.bridgeLabel} bridge node
            </div>
            <div className="toast-amount font-display">
              ₹{typeof toast.amount === 'number' ? toast.amount.toFixed(2) : toast.amount}
            </div>
          </div>

          <div className="toast-close" aria-label="Dismiss">✕</div>

          {/* Progress bar */}
          <motion.div
            className="toast-progress"
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 3.8, ease: 'linear' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
