/**
 * App.jsx
 * Root composition layer.
 * Wires Matter.js engine → packet router → HUD → NetworkCanvas.
 */
import { useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MeshProvider } from './store/useMeshStore';
import { useMatterEngine } from './hooks/useMatterEngine';
import { usePacketRouter } from './hooks/usePacketRouter';
import NetworkCanvas from './components/NetworkCanvas/NetworkCanvas';
import HUD from './components/HUD/HUD';
import './App.css';

function AppInner() {
  const canvasSizeRef = useRef({ width: window.innerWidth, height: window.innerHeight });

  // Physics engine — zero gravity
  const { engineRef, addBody, removeBody, onCollision, getBodies } = useMatterEngine();

  // Packet routing logic
  const { sendPacket, activeRoutesRef } = usePacketRouter({
    engineRef,
    addBody,
    removeBody,
    onCollision,
    canvasSizeRef,
  });

  return (
    <div className="app-root">
      {/* Layer 0: Physics world canvas */}
      <NetworkCanvas
        engineRef={engineRef}
        addBody={addBody}
        getBodies={getBodies}
        canvasSizeRef={canvasSizeRef}
        activeRoutesRef={activeRoutesRef}
      />

      {/* Layer 1: Glassmorphism HUD overlay */}
      <AnimatePresence>
        <HUD key="hud" onSendPayment={sendPacket} />
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <MeshProvider>
      <AppInner />
    </MeshProvider>
  );
}
