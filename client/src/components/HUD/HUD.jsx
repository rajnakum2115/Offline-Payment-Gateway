/**
 * HUD.jsx
 * Transparent overlay container for all floating UI panels.
 * pointer-events: none by default — individual panels re-enable as needed.
 */
import { AnimatePresence } from 'framer-motion';
import ControlPanel from '../ControlPanel/ControlPanel';
import TransactionLedger from '../TransactionLedger/TransactionLedger';
import PacketToast from '../PacketToast/PacketToast';
import { NodeLabelsLayer } from '../NodeLabel/NodeLabel';
import NetworkHeader from '../NetworkHeader/NetworkHeader';
import { useMeshStore } from '../../store/useMeshStore';
import './HUD.css';

export default function HUD({ onSendPayment }) {
  const { state } = useMeshStore();

  return (
    <div className="hud-layer" aria-label="Heads Up Display">
      {/* Top header bar */}
      <AnimatePresence>
        <NetworkHeader key="header" />
      </AnimatePresence>

      {/* Node floating labels */}
      <NodeLabelsLayer networkStatus={state.networkStatus} />

      {/* Bottom-left: control panel */}
      <AnimatePresence>
        <ControlPanel key="control" onSendPayment={onSendPayment} />
      </AnimatePresence>

      {/* Bottom-right: transaction ledger */}
      <AnimatePresence>
        <TransactionLedger key="ledger" />
      </AnimatePresence>

      {/* Top-center: delivery toast */}
      <PacketToast />
    </div>
  );
}
