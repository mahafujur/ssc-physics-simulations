'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { SIM_DEFS } from '@/lib/sims';

export default function Sim3D({ simKey, hue = 200, paramsRef, fill, onSelect }) {
  const mountRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const def = SIM_DEFS[simKey];
    const mount = mountRef.current;
    if (!mount || !def) return;

    /* renderer */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    mount.appendChild(renderer.domElement);

    /* scene */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    scene.add(new THREE.AmbientLight(0xffffff, 0.62));
    const dl = new THREE.DirectionalLight(0xffffff, 0.9);
    dl.position.set(6, 9, 5); scene.add(dl);
    const pl = new THREE.PointLight(new THREE.Color(`hsl(${hue},90%,65%)`), 0.7, 40);
    pl.position.set(-6, 4, -4); scene.add(pl);

    /* setup sim — returns either fn or {update,onTap} */
    const res = def.setup(scene, { onSelect: (id) => onSelectRef.current?.(id) });
    const update = typeof res === 'function' ? res : res.update;
    const onTap  = typeof res === 'function' ? null : res.onTap;

    /* orbit camera */
    const C = def.cam;
    let theta = C.theta ?? 0.5, phi = C.phi ?? 1.1, radius = C.radius ?? 10;
    const target = new THREE.Vector3(...(C.target || [0, 1, 0]));
    const pointers = new Map(); let prevDist = 0;
    const applyCamera = () => {
      phi = Math.max(0.15, Math.min(Math.PI - 0.25, phi));
      radius = Math.max(3, Math.min(26, radius));
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(target);
    };
    applyCamera();

    /* pointer events — tap vs drag distinguished by movement */
    const el = renderer.domElement;
    el.style.touchAction = 'none';
    const raycaster = new THREE.Raycaster();
    let downXY = null, moved = 0;

    const onDown = (e) => {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size === 1) { downXY = [e.clientX, e.clientY]; moved = 0; }
      if (pointers.size === 2) {
        const p = [...pointers.values()];
        prevDist = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
      }
    };
    const onMove = (e) => {
      if (!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      moved += Math.abs(e.clientX - prev[0]) + Math.abs(e.clientY - prev[1]);
      if (pointers.size === 1) {
        theta -= (e.clientX - prev[0]) * 0.006;
        phi   -= (e.clientY - prev[1]) * 0.006;
        applyCamera();
      } else if (pointers.size === 2 && C.zoom !== false) {
        const p = [...pointers.values()];
        const d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
        if (d > 0) radius *= prevDist / d;
        prevDist = d; applyCamera();
      }
    };
    const onUp = (e) => {
      const wasSingle = pointers.size === 1;
      pointers.delete(e.pointerId);
      if (wasSingle && onTap && downXY && moved < 10) {
        const rect = el.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(scene.children, true);
        if (hits.length) onTap(hits[0]);
      }
      downXY = null;
    };
    const onWheel = (e) => {
      if (C.zoom === false) return;
      e.preventDefault();
      radius = Math.max(3, Math.min(26, radius * (1 + e.deltaY * 0.001)));
      applyCamera();
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    /* resize */
    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    /* loop */
    const clock = new THREE.Clock();
    let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, clock.getDelta());
      const t = clock.elapsedTime;
      if (C.auto && pointers.size === 0) { theta += C.auto * dt; applyCamera(); }
      update(t, dt, paramsRef.current);
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
        }
      });
      renderer.dispose();
      if (mount.contains(el)) mount.removeChild(el);
    };
  }, [simKey]); // eslint-disable-line

  return (
    <div
      ref={mountRef}
      style={{ position: fill ? 'absolute' : 'relative', inset: 0, width: '100%', height: '100%' }}
    />
  );
}
