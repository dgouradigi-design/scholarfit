"use client";
import { useEffect, useRef } from "react";
import { COUNTRY_COORDS } from "@/lib/geo";
import { LAND_DOTS } from "@/lib/landDots";

export type GlobeMarker = { code: string; name: string; count: number };

const RAD = Math.PI / 180;
// Pays de départ fréquents des étudiants : origine des trajectoires lumineuses.
const ORIGINS = ["SN", "CI", "CM", "MA", "NG", "KE", "BJ", "BF", "TG", "MG", "IN", "VN", "BR", "CO", "HT", "EG", "GH", "CD", "TN", "PK", "ID", "PE"];

type Flight = { from: [number, number]; to: [number, number]; t: number; speed: number };

function slerp(a: [number, number], b: [number, number], t: number): [number, number] {
  const [l1, p1] = [a[0] * RAD, a[1] * RAD], [l2, p2] = [b[0] * RAD, b[1] * RAD];
  const v1 = [Math.cos(p1) * Math.cos(l1), Math.cos(p1) * Math.sin(l1), Math.sin(p1)];
  const v2 = [Math.cos(p2) * Math.cos(l2), Math.cos(p2) * Math.sin(l2), Math.sin(p2)];
  const d = Math.acos(Math.min(1, Math.max(-1, v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2])));
  if (d < 1e-6) return a;
  const s1 = Math.sin((1 - t) * d) / Math.sin(d), s2 = Math.sin(t * d) / Math.sin(d);
  const x = s1 * v1[0] + s2 * v2[0], y = s1 * v1[1] + s2 * v2[1], z = s1 * v1[2] + s2 * v2[2];
  return [Math.atan2(y, x) / RAD, Math.atan2(z, Math.hypot(x, y)) / RAD];
}

/**
 * Globe du monde entier, dessiné sur un canvas : terres en points gris, pays où il y a des bourses
 * en points or qui clignotent (taille selon le nombre), étiquettes reliées, étoiles autour.
 * Rotation lente, déplaçable à la souris ou au doigt. Respecte « réduire les animations ».
 */
export default function WorldGlobe({ markers, className = "" }: { markers: GlobeMarker[]; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const markersRef = useRef(markers);
  markersRef.current = markers;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, w = 0, h = 0, dpr = 1;
    let lambda = -10, phi = -12; // rotation : longitude au centre, inclinaison
    let dragging = false, lastX = 0, lastY = 0, idle = 0;
    const flights: Flight[] = [];
    const stars = Array.from({ length: 46 }, () => ({
      x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, r: 0.6 + Math.random() * 1.3,
      s: 0.5 + Math.random() * 1.5, ph: Math.random() * Math.PI * 2, gold: Math.random() < 0.25,
    }));

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const project = (lon: number, lat: number, R: number, cx: number, cy: number) => {
      const l = (lon - -lambda) * RAD, p = lat * RAD, p0 = -phi * RAD;
      const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
      return {
        x: cx + R * Math.cos(p) * Math.sin(l),
        y: cy - R * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l)),
        z: cosc,
      };
    };

    const spawn = () => {
      const ms = markersRef.current.filter((m) => COUNTRY_COORDS[m.code]);
      if (!ms.length) return;
      const to = ms[Math.floor(Math.random() * Math.min(ms.length, 12))];
      const fromCode = ORIGINS[Math.floor(Math.random() * ORIGINS.length)];
      if (fromCode === to.code || !COUNTRY_COORDS[fromCode]) return;
      flights.push({ from: COUNTRY_COORDS[fromCode], to: COUNTRY_COORDS[to.code], t: 0, speed: 0.004 + Math.random() * 0.004 });
    };

    let last = performance.now(), spawnAcc = 0;
    const frame = (now: number) => {
      const dt = Math.min(64, now - last); last = now;
      const light = document.documentElement.dataset.theme === "light";
      if (!dragging && !reduce) { idle += dt; if (idle > 1200) lambda += dt * 0.006; }
      spawnAcc += dt;
      if (!reduce && spawnAcc > 650 && flights.length < 9) { spawn(); spawnAcc = 0; }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const R = Math.min(w, h) * 0.44, cx = w / 2, cy = h / 2;

      // Étoiles autour du globe (comme un ciel de nuit, très discret)
      for (const st of stars) {
        const tw = reduce ? 0.6 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now * 0.0012 * st.s + st.ph));
        const x = cx + st.x * w * 0.5, y = cy + st.y * h * 0.5;
        if (Math.hypot(x - cx, y - cy) < R + 6) continue;
        ctx.fillStyle = st.gold ? `rgba(255,190,90,${0.75 * tw})` : light ? `rgba(30,40,70,${0.35 * tw})` : `rgba(255,255,255,${0.55 * tw})`;
        ctx.beginPath(); ctx.arc(x, y, st.r, 0, Math.PI * 2); ctx.fill();
      }

      // Sphère : toujours de nuit, sans halo, pour que les points or ressortent
      const sph = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
      sph.addColorStop(0, "#1f2140"); sph.addColorStop(0.65, "#14152b"); sph.addColorStop(1, "#0b0b19");
      ctx.fillStyle = sph; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(170,175,230,0.22)"; ctx.lineWidth = 1; ctx.stroke();

      // Méridiens et parallèles
      ctx.strokeStyle = "rgba(170,175,230,0.10)";
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath(); let pen = false;
        for (let lon = -180; lon <= 180; lon += 4) { const p = project(lon, lat, R, cx, cy); if (p.z > 0) { if (pen) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); pen = true; } else pen = false; }
        ctx.stroke();
      }
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath(); let pen = false;
        for (let lat = -88; lat <= 88; lat += 4) { const p = project(lon, lat, R, cx, cy); if (p.z > 0) { if (pen) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); pen = true; } else pen = false; }
        ctx.stroke();
      }

      // Terres : points gris clair, sans bourse
      const size = Math.max(1.4, R / 150);
      for (let i = 0; i < LAND_DOTS.length; i += 2) {
        const p = project(LAND_DOTS[i], LAND_DOTS[i + 1], R, cx, cy);
        if (p.z <= 0.02) continue;
        const a = 0.18 + p.z * 0.5;
        ctx.fillStyle = `rgba(196,200,224,${a})`;
        ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
      }

      // Trajectoires (fines, discrètes)
      for (let k = flights.length - 1; k >= 0; k--) {
        const f = flights[k];
        f.t += f.speed * (dt / 16);
        if (f.t > 1.35) { flights.splice(k, 1); continue; }
        const head = Math.min(1, f.t), tail = Math.max(0, f.t - 0.3);
        ctx.beginPath(); let pen = false;
        for (let s = tail; s <= head; s += 0.02) {
          const [lo, la] = slerp(f.from, f.to, s);
          const p = project(lo, la, R * (1 + Math.sin(s * Math.PI) * 0.1), cx, cy);
          if (p.z > -0.05) { if (pen) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); pen = true; } else pen = false;
        }
        ctx.strokeStyle = "rgba(255,255,255,0.28)"; ctx.lineWidth = 1; ctx.stroke();
      }

      // Pays avec des bourses : points or qui clignotent, taille selon le nombre de bourses
      const ms = markersRef.current;
      const max = Math.max(1, ...ms.map((m) => m.count));
      const labels: { x: number; y: number; m: GlobeMarker; z: number }[] = [];
      for (const m of ms) {
        const c = COUNTRY_COORDS[m.code];
        if (!c) continue;
        const p = project(c[0], c[1], R, cx, cy);
        if (p.z <= 0.05) continue;
        const r = (2.4 + 3.2 * Math.sqrt(m.count / max)) * Math.max(0.8, R / 230);
        const ph = (c[0] * 7.3 + c[1] * 3.1) % (Math.PI * 2);
        const blink = reduce ? 1 : 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(now * 0.0032 + ph), 2);
        const depth = 0.45 + 0.55 * p.z;
        ctx.fillStyle = `rgba(255,181,71,${0.22 * blink * depth})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 2.1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,${190 + Math.round(30 * blink)},${80 + Math.round(60 * blink)},${(0.55 + 0.45 * blink) * depth})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
        labels.push({ x: p.x, y: p.y, m, z: p.z });
      }

      // Étiquettes des pays les plus fournis, reliées au point par un trait
      labels.sort((a, b) => b.m.count - a.m.count);
      const placed: { x: number; y: number }[] = [];
      ctx.font = `600 ${Math.max(11, R / 24)}px "Poppins", system-ui, sans-serif`;
      for (const l of labels) {
        if (placed.length >= 5 || l.z < 0.45) continue;
        const left = l.x > cx + R * 0.2;
        const tx = left ? l.x - 26 : l.x + 26, ty = l.y - 20;
        if (placed.some((q) => Math.abs(q.x - tx) < 110 && Math.abs(q.y - ty) < 24)) continue;
        placed.push({ x: tx, y: ty });
        const text = `${l.m.name} · ${l.m.count}`;
        const tw = ctx.measureText(text).width;
        ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(tx, ty + 4); ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 6;
        ctx.fillText(text, left ? tx - tw - 4 : tx + 4, ty + 4);
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      lambda += (e.clientX - lastX) * 0.35; phi = Math.max(-60, Math.min(60, phi - (e.clientY - lastY) * 0.25));
      lastX = e.clientX; lastY = e.clientY; idle = 0;
    };
    const up = () => { dragging = false; idle = 0; };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up);
    };
  }, []);

  return <canvas ref={ref} className={`h-full w-full cursor-grab touch-pan-y active:cursor-grabbing ${className}`} role="img" aria-label="Globe des pays où il y a des bourses d'études" />;
}
