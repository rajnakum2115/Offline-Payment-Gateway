/**
 * useMatterEngine.js
 * Owns the entire Matter.js lifecycle.
 * Exposes engine controls without touching the DOM.
 */
import { useRef, useEffect, useCallback } from 'react';
import Matter from 'matter-js';

const { Engine, Runner, Events, Body, Bodies, Composite, World } = Matter;

export function useMatterEngine() {
  const engineRef = useRef(null);
  const runnerRef = useRef(null);
  const collisionCallbacksRef = useRef([]);

  useEffect(() => {
    // Create engine with zero gravity
    const engine = Engine.create({
      gravity: { x: 0, y: 0, scale: 0 },
    });
    engine.gravity.x = 0;
    engine.gravity.y = 0;

    const runner = Runner.create();
    Runner.run(runner, engine);

    engineRef.current = engine;
    runnerRef.current = runner;

    // Global collision dispatcher
    Events.on(engine, 'collisionStart', (event) => {
      const pairs = event.pairs;
      collisionCallbacksRef.current.forEach((cb) => cb(pairs));
    });

    return () => {
      Runner.stop(runner);
      Engine.clear(engine);
      World.clear(engine.world, false);
      Events.off(engine);
      engineRef.current = null;
      runnerRef.current = null;
    };
  }, []);

  /** Add a body to the world */
  const addBody = useCallback((body) => {
    if (!engineRef.current) return;
    Composite.add(engineRef.current.world, body);
  }, []);

  /** Remove a body from the world */
  const removeBody = useCallback((body) => {
    if (!engineRef.current) return;
    Composite.remove(engineRef.current.world, body);
  }, []);

  /** Apply a force vector to a body */
  const applyForce = useCallback((body, position, force) => {
    if (!engineRef.current) return;
    Body.applyForce(body, position, force);
  }, []);

  /** Set body velocity directly */
  const setVelocity = useCallback((body, velocity) => {
    if (!engineRef.current) return;
    Body.setVelocity(body, velocity);
  }, []);

  /** Register a collision callback — returns unsubscribe fn */
  const onCollision = useCallback((callback) => {
    collisionCallbacksRef.current.push(callback);
    return () => {
      collisionCallbacksRef.current = collisionCallbacksRef.current.filter(
        (cb) => cb !== callback
      );
    };
  }, []);

  /** Get all current bodies in the world */
  const getBodies = useCallback(() => {
    if (!engineRef.current) return [];
    return Composite.allBodies(engineRef.current.world);
  }, []);

  return {
    engineRef,
    addBody,
    removeBody,
    applyForce,
    setVelocity,
    onCollision,
    getBodies,
  };
}
