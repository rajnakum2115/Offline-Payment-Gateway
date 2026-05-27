/**
 * useMeshStore.js
 * Lightweight global state via React Context + useReducer.
 * No external state library needed.
 */
import { createContext, useContext, useReducer, useCallback } from 'react';

// ── Initial State ──────────────────────────────────────────
const initialState = {
  balance: 2450.75,
  transactions: [],
  activePackets: [],
  networkStatus: 'idle', // 'idle' | 'routing' | 'delivered' | 'error'
  totalSent: 0,
  hopCount: 0,
  lastToast: null,
};

// ── Action Types ───────────────────────────────────────────
export const ACTIONS = {
  SEND_PAYMENT: 'SEND_PAYMENT',
  LOG_HOP: 'LOG_HOP',
  DELIVER_PAYMENT: 'DELIVER_PAYMENT',
  DISMISS_TOAST: 'DISMISS_TOAST',
  PACKET_FAILED: 'PACKET_FAILED',
  RESET_STATUS: 'RESET_STATUS',
};

// ── Reducer ────────────────────────────────────────────────
function meshReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SEND_PAYMENT: {
      const { packetId, amount, senderLabel } = action.payload;
      const entry = {
        id: `tx-${Date.now()}`,
        packetId,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        type: 'SEND',
        icon: '🚀',
        message: `Packet dispatched from ${senderLabel}`,
        amount,
        status: 'routing',
      };
      return {
        ...state,
        balance: parseFloat((state.balance - amount).toFixed(2)),
        transactions: [entry, ...state.transactions].slice(0, 50),
        activePackets: [...state.activePackets, packetId],
        networkStatus: 'routing',
        totalSent: state.totalSent + amount,
      };
    }

    case ACTIONS.LOG_HOP: {
      const { packetId, fromLabel, toLabel, hopIndex, latency } = action.payload;
      const hopIcons = ['⚡', '🔗', '📡', '🛸'];
      const entry = {
        id: `hop-${Date.now()}-${Math.random()}`,
        packetId,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        type: 'HOP',
        icon: hopIcons[hopIndex % hopIcons.length],
        message: `Hop ${hopIndex + 1}: ${fromLabel} → ${toLabel}`,
        latency: `${latency}ms`,
        status: 'routing',
      };
      return {
        ...state,
        transactions: [entry, ...state.transactions].slice(0, 50),
        hopCount: state.hopCount + 1,
      };
    }

    case ACTIONS.DELIVER_PAYMENT: {
      const { packetId, amount, bridgeLabel } = action.payload;
      const entry = {
        id: `dlv-${Date.now()}`,
        packetId,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        type: 'DELIVER',
        icon: '✅',
        message: `Delivered via ${bridgeLabel} — confirmed`,
        amount,
        status: 'delivered',
      };
      return {
        ...state,
        transactions: [entry, ...state.transactions].slice(0, 50),
        activePackets: state.activePackets.filter((id) => id !== packetId),
        networkStatus: 'delivered',
        lastToast: {
          id: `toast-${Date.now()}`,
          amount,
          bridgeLabel,
        },
      };
    }

    case ACTIONS.DISMISS_TOAST:
      return { ...state, lastToast: null };

    case ACTIONS.PACKET_FAILED: {
      const { packetId } = action.payload;
      const entry = {
        id: `err-${Date.now()}`,
        packetId,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        type: 'ERROR',
        icon: '❌',
        message: 'Packet lost — no route to bridge',
        status: 'error',
      };
      return {
        ...state,
        transactions: [entry, ...state.transactions].slice(0, 50),
        activePackets: state.activePackets.filter((id) => id !== packetId),
        networkStatus: 'error',
      };
    }

    case ACTIONS.RESET_STATUS:
      return { ...state, networkStatus: 'idle' };

    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────
const MeshContext = createContext(null);

export function MeshProvider({ children }) {
  const [state, dispatch] = useReducer(meshReducer, initialState);

  const sendPayment = useCallback((packetId, amount, senderLabel) => {
    dispatch({ type: ACTIONS.SEND_PAYMENT, payload: { packetId, amount, senderLabel } });
  }, []);

  const logHop = useCallback((packetId, fromLabel, toLabel, hopIndex, latency) => {
    dispatch({ type: ACTIONS.LOG_HOP, payload: { packetId, fromLabel, toLabel, hopIndex, latency } });
  }, []);

  const deliverPayment = useCallback((packetId, amount, bridgeLabel) => {
    dispatch({ type: ACTIONS.DELIVER_PAYMENT, payload: { packetId, amount, bridgeLabel } });
    setTimeout(() => dispatch({ type: ACTIONS.RESET_STATUS }), 3500);
  }, []);

  const dismissToast = useCallback(() => {
    dispatch({ type: ACTIONS.DISMISS_TOAST });
  }, []);

  const failPacket = useCallback((packetId) => {
    dispatch({ type: ACTIONS.PACKET_FAILED, payload: { packetId } });
    setTimeout(() => dispatch({ type: ACTIONS.RESET_STATUS }), 2000);
  }, []);

  return (
    <MeshContext.Provider
      value={{ state, sendPayment, logHop, deliverPayment, dismissToast, failPacket }}
    >
      {children}
    </MeshContext.Provider>
  );
}

export function useMeshStore() {
  const ctx = useContext(MeshContext);
  if (!ctx) throw new Error('useMeshStore must be used within MeshProvider');
  return ctx;
}
