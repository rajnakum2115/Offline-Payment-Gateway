/**
 * NetworkCanvas.jsx
 * Full-screen canvas that renders the Matter.js physics world.
 * Uses a dual-layer approach:
 *   - <canvas> for node circles + packet comet trails
 *   - <svg> overlay for animated mesh edge lines
 */
import { useEffect, useRef, useCallback } from 'react';
import Matter from 'matter-js';
import { NODE_CONFIGS, MESH_EDGES, ROUTING_PATH } from './nodeConfig';
import './NetworkCanvas.css';

const { Bodies, Body, Composite } = Matter;

const NODE_CATEGORY = 0x0001;
const PACKET_CATEGORY = 0x0002;

// Track comet trails: Map<bodyId, [{x,y}]>
const trailMap = new Map();
const MAX_TRAIL_LENGTH = 22;

export default function NetworkCanvas({ engineRef, addBody, getBodies, canvasSizeRef, activeRoutesRef }) {
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const rafRef = useRef(null);
  const nodeBodyMapRef = useRef({}); // nodeId → Matter body
  const nodePxRef = useRef({}); // nodeId → {x, y} in pixels
  const svgLineRefs = useRef({});

  /** Convert frac → px for current canvas size */
  const fracToPx = useCallback((xFrac, yFrac, w, h) => ({
    x: xFrac * w,
    y: yFrac * h,
  }), []);

  /** Initialize static node bodies in Matter world */
  const initNodes = useCallback((w, h) => {
    if (!engineRef.current) return;

    // Remove old node bodies
    Object.values(nodeBodyMapRef.current).forEach((b) => {
      try { Matter.Composite.remove(engineRef.current.world, b); } catch {}
    });
    nodeBodyMapRef.current = {};

    NODE_CONFIGS.forEach((cfg) => {
      const { x, y } = fracToPx(cfg.xFrac, cfg.yFrac, w, h);
      nodePxRef.current[cfg.id] = { x, y };

      const body = Bodies.circle(x, y, cfg.radius, {
        label: cfg.id,
        isStatic: true,
        restitution: 1.0,
        friction: 0,
        frictionAir: 0,
        collisionFilter: {
          category: NODE_CATEGORY,
          mask: PACKET_CATEGORY,
        },
        render: { fillStyle: cfg.color },
      });

      Matter.Composite.add(engineRef.current.world, body);
      nodeBodyMapRef.current[cfg.id] = body;
    });

    // Boundary walls — invisible
    const walls = [
      Bodies.rectangle(w / 2, -25, w, 50, { isStatic: true, label: 'wall', restitution: 1, friction: 0 }),
      Bodies.rectangle(w / 2, h + 25, w, 50, { isStatic: true, label: 'wall', restitution: 1, friction: 0 }),
      Bodies.rectangle(-25, h / 2, 50, h, { isStatic: true, label: 'wall', restitution: 1, friction: 0 }),
      Bodies.rectangle(w + 25, h / 2, 50, h, { isStatic: true, label: 'wall', restitution: 1, friction: 0 }),
    ];
    walls.forEach((w) => Matter.Composite.add(engineRef.current.world, w));
  }, [engineRef, fracToPx]);

  /** Draw a single glowing node circle */
  function drawNode(ctx, cfg, x, y) {
    const r = cfg.radius;

    // Outer glow halo
    const haloGrad = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 3.5);
    haloGrad.addColorStop(0, cfg.glowColor.replace('0.7', '0.25'));
    haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(x, y, r * 3.5, 0, Math.PI * 2);
    ctx.fillStyle = haloGrad;
    ctx.fill();

    // Inner body
    const bodyGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.3, cfg.color);
    bodyGrad.addColorStop(1, cfg.glowColor.replace('0.7', '0.4'));
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Ring border
    ctx.beginPath();
    ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /** Draw comet trail + packet body */
  function drawPacket(ctx, body) {
    const { x, y } = body.position;

    // Update trail
    if (!trailMap.has(body.id)) trailMap.set(body.id, []);
    const trail = trailMap.get(body.id);
    trail.push({ x, y });
    if (trail.length > MAX_TRAIL_LENGTH) trail.shift();

    // Draw trail
    trail.forEach((pt, i) => {
      const alpha = (i / trail.length) * 0.7;
      const size = (i / trail.length) * 5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.fill();
    });

    // Packet body glow
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 14);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#ffd700');
    grad.addColorStop(0.7, 'rgba(255,180,0,0.6)');
    grad.addColorStop(1, 'rgba(255,140,0,0)');
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Core dot
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  /** Update SVG edge lines */
  function updateSvgEdges(w, h) {
    const svg = svgRef.current;
    if (!svg) return;

    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    MESH_EDGES.forEach(([aId, bId]) => {
      const key = `${aId}-${bId}`;
      const aPos = nodePxRef.current[aId];
      const bPos = nodePxRef.current[bId];
      if (!aPos || !bPos) return;

      let line = svgLineRefs.current[key];
      if (!line) {
        line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const isRoutingEdge = isEdgeOnRoute(aId, bId);
        line.setAttribute('class', isRoutingEdge ? 'mesh-edge routing-edge' : 'mesh-edge');
        svg.appendChild(line);
        svgLineRefs.current[key] = line;
      }

      line.setAttribute('x1', aPos.x);
      line.setAttribute('y1', aPos.y);
      line.setAttribute('x2', bPos.x);
      line.setAttribute('y2', bPos.y);
    });
  }

  function isEdgeOnRoute(aId, bId) {
    for (let i = 0; i < ROUTING_PATH.length - 1; i++) {
      if (
        (ROUTING_PATH[i] === aId && ROUTING_PATH[i + 1] === bId) ||
        (ROUTING_PATH[i] === bId && ROUTING_PATH[i + 1] === aId)
      ) return true;
    }
    return false;
  }

  /** Main render loop */
  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background deep space gradient
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.7);
    bgGrad.addColorStop(0, '#060d1a');
    bgGrad.addColorStop(1, '#020408');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Star field (static via seeded positions, pre-computed once)
    drawStarfield(ctx, w, h);

    // Draw nodes
    NODE_CONFIGS.forEach((cfg) => {
      const pos = nodePxRef.current[cfg.id];
      if (pos) drawNode(ctx, cfg, pos.x, pos.y);
    });

    // Draw active packets
    if (activeRoutesRef?.current) {
      Object.values(activeRoutesRef.current).forEach((route) => {
        if (route?.body) {
          drawPacket(ctx, route.body);
        }
      });
    }

    // Clean up trails for removed packets
    const activeBodyIds = new Set(
      Object.values(activeRoutesRef?.current || {})
        .filter(Boolean)
        .map((r) => r.body?.id)
    );
    for (const id of trailMap.keys()) {
      if (!activeBodyIds.has(id)) trailMap.delete(id);
    }

    rafRef.current = requestAnimationFrame(renderLoop);
  }, [activeRoutesRef]);

  /** Starfield — drawn as semi-transparent dots */
  const starPositions = useRef(null);
  function drawStarfield(ctx, w, h) {
    if (!starPositions.current) {
      starPositions.current = Array.from({ length: 180 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.2 + 0.2,
        a: Math.random() * 0.5 + 0.1,
      }));
    }
    starPositions.current.forEach((s) => {
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,220,255,${s.a})`;
      ctx.fill();
    });
  }

  /** Handle canvas resize */
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    if (canvasSizeRef) canvasSizeRef.current = { width: w, height: h };
    // Re-init nodes at new positions
    initNodes(w, h);
    updateSvgEdges(w, h);
  }, [initNodes, canvasSizeRef]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);

    rafRef.current = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleResize, renderLoop]);

  return (
    <div className="network-canvas-container">
      <canvas ref={canvasRef} className="physics-canvas" />
      <svg ref={svgRef} className="mesh-svg" />
    </div>
  );
}
