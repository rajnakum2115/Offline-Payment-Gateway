/**
 * usePacketRouter.js
 * Handles all packet physics creation, force application,
 * collision-based hop routing, and ledger event dispatch.
 */
import { useCallback, useRef } from 'react';
import Matter from 'matter-js';
import { NODE_CONFIGS, ROUTING_PATH } from '../components/NetworkCanvas/nodeConfig';
import { forceToward } from '../utils/vectorUtils';
import { useMeshStore } from '../store/useMeshStore';

const { Bodies, Body, Composite } = Matter;

const PACKET_RADIUS = 7;
const PACKET_FORCE_MAGNITUDE = 0.004;
const PACKET_CATEGORY = 0x0002;
const NODE_CATEGORY = 0x0001;

/** Generate a short UUID for packet identification */
function genId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

/** Simulated network latency (ms) */
function fakeLatency() {
  return Math.floor(Math.random() * 40 + 8);
}

export function usePacketRouter({ engineRef, addBody, removeBody, onCollision, canvasSizeRef }) {
  const { sendPayment, logHop, deliverPayment, failPacket } = useMeshStore();
  const activeRoutesRef = useRef({}); // packetId → { body, routeIndex, path }
  const unsubscribeRef = useRef(null);

  /** Convert fractional position to canvas pixels */
  const fracToPixel = useCallback(
    (xFrac, yFrac) => {
      const { width, height } = canvasSizeRef.current || { width: window.innerWidth, height: window.innerHeight };
      return { x: xFrac * width, y: yFrac * height };
    },
    [canvasSizeRef]
  );

  /** Get pixel position of a node by ID */
  const getNodePos = useCallback(
    (nodeId) => {
      const cfg = NODE_CONFIGS.find((n) => n.id === nodeId);
      if (!cfg) return { x: 0, y: 0 };
      return fracToPixel(cfg.xFrac, cfg.yFrac);
    },
    [fracToPixel]
  );

  /** Redirect packet toward next hop target */
  const redirectPacket = useCallback(
    (packetBody, fromPos, toPos) => {
      const force = forceToward(fromPos, toPos, PACKET_FORCE_MAGNITUDE);
      // Reset velocity first so it shoots straight
      Body.setVelocity(packetBody, { x: 0, y: 0 });
      Body.applyForce(packetBody, packetBody.position, force);
    },
    []
  );

  /** Set up collision listener that drives hop-by-hop routing */
  const setupCollisionListener = useCallback(() => {
    if (unsubscribeRef.current) unsubscribeRef.current();

    const unsub = onCollision((pairs) => {
      pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;

        // Find which body is a packet and which is a node
        Object.entries(activeRoutesRef.current).forEach(([packetId, route]) => {
          if (!route || !route.body) return;

          const isPacket =
            route.body.id === bodyA.id || route.body.id === bodyB.id;
          if (!isPacket) return;

          const nodeBody = route.body.id === bodyA.id ? bodyB : bodyA;
          const hitNodeId = nodeBody.label;
          const expectedNodeId = route.path[route.routeIndex + 1];

          if (hitNodeId !== expectedNodeId) return;

          const newRouteIndex = route.routeIndex + 1;
          activeRoutesRef.current[packetId] = { ...route, routeIndex: newRouteIndex };

          const fromNodeId = route.path[route.routeIndex];
          const fromCfg = NODE_CONFIGS.find((n) => n.id === fromNodeId);
          const toCfg = NODE_CONFIGS.find((n) => n.id === hitNodeId);

          // Log the hop
          logHop(
            packetId,
            fromCfg?.label || fromNodeId,
            toCfg?.label || hitNodeId,
            newRouteIndex - 1,
            fakeLatency()
          );

          const nextTargetId = route.path[newRouteIndex + 1];

          if (nextTargetId) {
            // Redirect toward next hop
            const currentPos = route.body.position;
            const nextPos = getNodePos(nextTargetId);
            setTimeout(() => redirectPacket(route.body, currentPos, nextPos), 60);
          } else {
            // Final hop — delivery!
            const bridgeCfg = NODE_CONFIGS.find((n) => n.id === hitNodeId);
            deliverPayment(packetId, route.amount, bridgeCfg?.label || 'Bridge');

            setTimeout(() => {
              if (activeRoutesRef.current[packetId]?.body) {
                removeBody(activeRoutesRef.current[packetId].body);
              }
              delete activeRoutesRef.current[packetId];
            }, 600);
          }
        });
      });
    });

    unsubscribeRef.current = unsub;
  }, [onCollision, logHop, deliverPayment, removeBody, getNodePos, redirectPacket]);

  /**
   * Main entry point: spawn a packet and shoot it toward the first relay.
   * @param {number} amount - Payment amount
   */
  const sendPacket = useCallback(
    (amount = 10.0) => {
      if (!engineRef.current) return;

      const packetId = genId();
      const path = ROUTING_PATH;

      // Spawn at sender node position
      const senderPos = getNodePos(path[0]);
      const senderCfg = NODE_CONFIGS.find((n) => n.id === path[0]);

      const packetBody = Bodies.circle(senderPos.x, senderPos.y, PACKET_RADIUS, {
        label: `packet-${packetId}`,
        restitution: 0.85,
        friction: 0,
        frictionAir: 0.003,
        collisionFilter: {
          category: PACKET_CATEGORY,
          mask: NODE_CATEGORY | PACKET_CATEGORY,
        },
        render: { fillStyle: '#ffd700' },
        isSensor: false,
      });

      addBody(packetBody);

      // Register route tracking
      activeRoutesRef.current[packetId] = {
        body: packetBody,
        routeIndex: 0,
        path,
        amount,
      };

      // Dispatch payment to store
      sendPayment(packetId, amount, senderCfg?.label || 'Sender');

      // Setup listener (idempotent)
      setupCollisionListener();

      // Initial force toward first relay
      const firstRelayPos = getNodePos(path[1]);
      setTimeout(() => {
        Body.applyForce(packetBody, packetBody.position, forceToward(senderPos, firstRelayPos, PACKET_FORCE_MAGNITUDE));
      }, 50);

      // Timeout guard — fail if not delivered within 12 seconds
      setTimeout(() => {
        if (activeRoutesRef.current[packetId]) {
          failPacket(packetId);
          removeBody(activeRoutesRef.current[packetId].body);
          delete activeRoutesRef.current[packetId];
        }
      }, 12000);

      return packetId;
    },
    [engineRef, addBody, getNodePos, sendPayment, setupCollisionListener, failPacket, removeBody]
  );

  /** Get all active packet bodies for rendering */
  const getActivePacketBodies = useCallback(() => {
    return Object.values(activeRoutesRef.current)
      .filter(Boolean)
      .map((r) => r.body);
  }, []);

  return { sendPacket, getActivePacketBodies, activeRoutesRef };
}
