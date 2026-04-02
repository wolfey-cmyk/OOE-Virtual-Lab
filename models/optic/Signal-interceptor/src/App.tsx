import React from "react";
import { useState, useRef, useEffect, useCallback } from "react";

// Physics constants
const WAVE_SPEED = 2.0; // visual speed
const NUM_ANTINODES = 5;
const PROXIMITY_THRESHOLD = 0.12; // how close to node/antinode to trigger color

interface GamePhase {
  x: number;
  isAntinode: boolean;
  isNode: boolean;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const [interceptorPos, setInterceptorPos] = useState<number>(0.5); // 0 to 1
  const [isDragging, setIsDragging] = useState(false);
  const [currentType, setCurrentType] = useState<
    "neutral" | "node" | "antinode"
  >("neutral");
  const [foundAntinodes, setFoundAntinodes] = useState<Set<number>>(new Set());
  const [foundNodes, setFoundNodes] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [showHelp, setShowHelp] = useState(true);
  const [signalStrength, setSignalStrength] = useState(0);
  const [passwordRevealed, setPasswordRevealed] = useState(false);
  const [waveCount, setWaveCount] = useState(3); // number of half-wavelengths
  const particlesRef = useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      color: string;
    }>
  >([]);
  const [glowIntensity, setGlowIntensity] = useState(0);

  const k = waveCount * Math.PI; // wave number

  // Standing wave amplitude at position x (0 to 1)
  const getAmplitude = useCallback(
    (x: number) => {
      return Math.abs(Math.sin(k * x));
    },
    [k],
  );

  // Check if position is near an antinode
  const getAntinodeIndex = useCallback(
    (x: number): number => {
      for (let i = 0; i <= waveCount; i++) {
        const antinodeX = (2 * i + 1) / (2 * waveCount + 1);
        if (
          Math.abs(x - antinodeX) <
          PROXIMITY_THRESHOLD * (1 / (waveCount + 1))
        ) {
          return i;
        }
      }
      return -1;
    },
    [waveCount],
  );

  const getNodeIndex = useCallback(
    (x: number): number => {
      const nodes = [0]; // node at x=0 (signal source)
      for (let i = 1; i <= waveCount; i++) {
        nodes.push(i / waveCount);
      }
      for (let i = 0; i < nodes.length; i++) {
        if (
          Math.abs(x - nodes[i]) <
          PROXIMITY_THRESHOLD * (1 / (waveCount + 1))
        ) {
          return i;
        }
      }
      return -1;
    },
    [waveCount],
  );

  // Add particle burst
  const addParticles = useCallback(
    (canvasX: number, canvasY: number, color: string, count: number) => {
      const particles = particlesRef.current;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const speed = 1 + Math.random() * 3;
        particles.push({
          x: canvasX,
          y: canvasY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 30 + Math.random() * 30,
          color,
        });
      }
    },
    [],
  );

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      timeRef.current += 0.02;
      const t = timeRef.current;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.clearRect(0, 0, w, h);

      // Background grid
      ctx.strokeStyle = "rgba(0, 240, 255, 0.04)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let gx = 0; gx < w; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      // Wave area dimensions
      const padding = { left: 80, right: 80, top: 80, bottom: 60 };
      const waveAreaW = w - padding.left - padding.right;
      const waveAreaH = h - padding.top - padding.bottom;
      const centerY = padding.top + waveAreaH / 2;
      const amplitude = waveAreaH * 0.35;

      // Draw signal source
      ctx.save();
      const sourceGlow = ctx.createRadialGradient(
        padding.left,
        centerY,
        0,
        padding.left,
        centerY,
        30,
      );
      sourceGlow.addColorStop(0, "rgba(0, 240, 255, 0.8)");
      sourceGlow.addColorStop(0.5, "rgba(0, 240, 255, 0.2)");
      sourceGlow.addColorStop(1, "rgba(0, 240, 255, 0)");
      ctx.fillStyle = sourceGlow;
      ctx.fillRect(padding.left - 30, centerY - 30, 60, 60);
      ctx.fillStyle = "#00f0ff";
      ctx.font = "12px Orbitron";
      ctx.textAlign = "center";
      ctx.fillText("SIGNAL", padding.left, centerY + 45);
      ctx.fillText("SOURCE", padding.left, centerY + 60);
      ctx.restore();

      // Draw metal wall
      const wallX = padding.left + waveAreaW;
      const wallGrad = ctx.createLinearGradient(wallX - 8, 0, wallX + 8, 0);
      wallGrad.addColorStop(0, "rgba(120, 120, 140, 0.3)");
      wallGrad.addColorStop(0.3, "rgba(180, 180, 200, 0.9)");
      wallGrad.addColorStop(0.5, "rgba(220, 220, 240, 1)");
      wallGrad.addColorStop(0.7, "rgba(180, 180, 200, 0.9)");
      wallGrad.addColorStop(1, "rgba(120, 120, 140, 0.3)");
      ctx.fillStyle = wallGrad;
      ctx.fillRect(wallX - 8, padding.top - 20, 16, waveAreaH + 40);
      // Wall hash marks
      ctx.strokeStyle = "rgba(100, 100, 120, 0.8)";
      ctx.lineWidth = 1;
      for (
        let wy = padding.top - 10;
        wy < padding.top + waveAreaH + 30;
        wy += 8
      ) {
        ctx.beginPath();
        ctx.moveTo(wallX - 6, wy);
        ctx.lineTo(wallX + 6, wy + 8);
        ctx.stroke();
      }
      ctx.save();
      ctx.fillStyle = "#c0c0d0";
      ctx.font = "12px Orbitron";
      ctx.textAlign = "center";
      ctx.fillText("METAL", wallX + 30, centerY - 8);
      ctx.fillText("WALL", wallX + 30, centerY + 8);
      ctx.restore();

      // Draw node and antinode markers
      // Nodes at x = i/waveCount for i = 0..waveCount
      for (let i = 0; i <= waveCount; i++) {
        const nodeX = padding.left + (i / waveCount) * waveAreaW;
        // Vertical dashed line
        ctx.save();
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = "rgba(67, 97, 238, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(nodeX, padding.top);
        ctx.lineTo(nodeX, padding.top + waveAreaH);
        ctx.stroke();
        ctx.setLineDash([]);
        // Label
        ctx.fillStyle = "rgba(67, 97, 238, 0.6)";
        ctx.font = "9px Orbitron";
        ctx.textAlign = "center";
        ctx.fillText("N", nodeX, padding.top - 8);
        ctx.restore();
      }

      // Antinodes at x = (2i+1)/(2*waveCount) for i = 0..waveCount-1
      for (let i = 0; i < waveCount; i++) {
        const antiX =
          padding.left + ((2 * i + 1) / (2 * waveCount)) * waveAreaW;
        ctx.save();
        ctx.setLineDash([2, 8]);
        ctx.strokeStyle = "rgba(255, 45, 85, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(antiX, padding.top);
        ctx.lineTo(antiX, padding.top + waveAreaH);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(255, 45, 85, 0.6)";
        ctx.font = "9px Orbitron";
        ctx.textAlign = "center";
        ctx.fillText("A", antiX, padding.top - 8);
        ctx.restore();
      }

      // Draw standing wave
      const points: { x: number; y: number }[] = [];
      const steps = 200;
      for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        const x = padding.left + frac * waveAreaW;
        const amp = Math.sin(k * frac) * Math.cos(WAVE_SPEED * t);
        const y = centerY - amp * amplitude;
        points.push({ x, y });
      }

      // Standing wave glow
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = "rgba(0, 240, 255, 0.5)";
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Draw envelope (max amplitude boundaries)
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
      ctx.lineWidth = 1;
      // Upper envelope
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        const x = padding.left + frac * waveAreaW;
        const envAmp = Math.abs(Math.sin(k * frac));
        const y = centerY - envAmp * amplitude;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // Lower envelope
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        const x = padding.left + frac * waveAreaW;
        const envAmp = Math.abs(Math.sin(k * frac));
        const y = centerY + envAmp * amplitude;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Center line
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, centerY);
      ctx.lineTo(padding.left + waveAreaW, centerY);
      ctx.stroke();
      ctx.restore();

      // Draw intercepted indicator on the wave
      const interceptCanvasX = padding.left + interceptorPos * waveAreaW;
      const interceptAmp =
        Math.sin(k * interceptorPos) * Math.cos(WAVE_SPEED * t);
      const interceptCanvasY = centerY - interceptAmp * amplitude;
      const localAmplitude = getAmplitude(interceptorPos);

      // Interceptor beam
      ctx.save();
      const beamColor =
        currentType === "antinode"
          ? `rgba(255, 45, 85, ${0.3 + 0.4 * Math.abs(Math.cos(WAVE_SPEED * t))})`
          : currentType === "node"
            ? `rgba(67, 97, 238, ${0.2 + 0.2 * Math.abs(Math.cos(WAVE_SPEED * t))})`
            : `rgba(255, 255, 255, 0.05)`;
      ctx.strokeStyle = beamColor;
      ctx.lineWidth = 3;
      ctx.shadowBlur =
        currentType === "antinode" ? 20 : currentType === "node" ? 10 : 0;
      ctx.shadowColor =
        currentType === "antinode"
          ? "#ff2d55"
          : currentType === "node"
            ? "#4361ee"
            : "transparent";
      ctx.beginPath();
      ctx.moveTo(interceptCanvasX, padding.top + 10);
      ctx.lineTo(interceptCanvasX, padding.top + waveAreaH - 10);
      ctx.stroke();
      ctx.restore();

      // Interceptor dot on wave
      const dotRadius = 10 + localAmplitude * 6;
      let dotColor: string;
      let dotGlow: string;
      if (currentType === "antinode") {
        dotColor = "#ff2d55";
        dotGlow = "#ff2d55";
      } else if (currentType === "node") {
        dotColor = "#4361ee";
        dotGlow = "#4361ee";
      } else {
        dotColor = "#00f0ff";
        dotGlow = "#00f0ff";
      }

      // Glow ring
      ctx.save();
      const ringGlow = ctx.createRadialGradient(
        interceptCanvasX,
        interceptCanvasY,
        0,
        interceptCanvasX,
        interceptCanvasY,
        dotRadius * 3,
      );
      ringGlow.addColorStop(0, dotGlow + "80");
      ringGlow.addColorStop(0.5, dotGlow + "20");
      ringGlow.addColorStop(1, dotGlow + "00");
      ctx.fillStyle = ringGlow;
      ctx.beginPath();
      ctx.arc(
        interceptCanvasX,
        interceptCanvasY,
        dotRadius * 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();

      // Main dot
      ctx.save();
      ctx.shadowBlur = 25;
      ctx.shadowColor = dotGlow;
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(interceptCanvasX, interceptCanvasY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
      // Inner bright spot
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(
        interceptCanvasX,
        interceptCanvasY,
        dotRadius * 0.35,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();

      // Signal strength bar
      const barX = padding.left;
      const barY = padding.top + waveAreaH + 25;
      const barW = waveAreaW;
      const barH = 8;
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(barX, barY, barW, barH);
      const strength = localAmplitude;
      const strengthColor =
        strength > 0.85
          ? "#ff2d55"
          : strength < 0.15
            ? "#4361ee"
            : `hsl(${200 - strength * 160}, 100%, 50%)`;
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = strengthColor;
      ctx.fillStyle = strengthColor;
      ctx.fillRect(barX, barY, barW * strength, barH);
      ctx.restore();

      // Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1 / p.maxLife;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = p.life * 0.8;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 + p.life * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [interceptorPos, currentType, getAmplitude, k, waveCount]);

  // Update current type based on position
  useEffect(() => {
    const antiIdx = getAntinodeIndex(interceptorPos);
    const nodeIdx = getNodeIndex(interceptorPos);
    const amp = getAmplitude(interceptorPos);
    setSignalStrength(amp);

    if (antiIdx >= 0) {
      setCurrentType("antinode");
      setGlowIntensity(1);
      if (!foundAntinodes.has(antiIdx)) {
        const newFound = new Set(foundAntinodes);
        newFound.add(antiIdx);
        setFoundAntinodes(newFound);
        setScore((s) => s + 100);
        // Particles
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const padding = { left: 80, right: 80 };
          const waveAreaW = rect.width - padding.left - padding.right;
          const cx = padding.left + interceptorPos * waveAreaW;
          const cy = rect.height / 2;
          addParticles(cx, cy, "#ff2d55", 20);
        }
      }
    } else if (nodeIdx >= 0) {
      setCurrentType("node");
      setGlowIntensity(0.5);
      if (!foundNodes.has(nodeIdx)) {
        const newFound = new Set(foundNodes);
        newFound.add(nodeIdx);
        setFoundNodes(newFound);
        setScore((s) => s + 25);
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const padding = { left: 80, right: 80 };
          const waveAreaW = rect.width - padding.left - padding.right;
          const cx = padding.left + interceptorPos * waveAreaW;
          const cy = rect.height / 2;
          addParticles(cx, cy, "#4361ee", 12);
        }
      }
    } else {
      setCurrentType("neutral");
      setGlowIntensity(0);
    }

    if (foundAntinodes.size >= waveCount && !passwordRevealed) {
      setPasswordRevealed(true);
    }
  }, [
    interceptorPos,
    getAntinodeIndex,
    getNodeIndex,
    getAmplitude,
    foundAntinodes,
    foundNodes,
    addParticles,
    waveCount,
    passwordRevealed,
  ]);

  // Mouse / touch handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updatePosition(e);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) updatePosition(e);
  };
  const handlePointerUp = () => setIsDragging(false);

  const updatePosition = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const padding = { left: 80, right: 80 };
    const waveAreaW = rect.width - padding.left - padding.right;
    const x = (e.clientX - rect.left - padding.left) / waveAreaW;
    setInterceptorPos(Math.max(0, Math.min(1, x)));
  };

  const resetGame = () => {
    setInterceptorPos(0.5);
    setFoundAntinodes(new Set());
    setFoundNodes(new Set());
    setScore(0);
    setPasswordRevealed(false);
    setCurrentType("neutral");
  };

  const statusColor =
    currentType === "antinode"
      ? "#ff2d55"
      : currentType === "node"
        ? "#4361ee"
        : "#00f0ff";
  const statusLabel =
    currentType === "antinode"
      ? "🔥 ANTINODE — Max Signal!"
      : currentType === "node"
        ? "❄️ NODE — No Signal"
        : "📡 Scanning...";

  return (
    <div className="relative min-h-screen bg-[#0a0a1a] overflow-hidden select-none">
      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="scan-line absolute left-0 w-full h-[2px] bg-cyan-400" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 pt-6 pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1
            className="font-orbitron text-2xl sm:text-3xl font-bold tracking-wider"
            style={{
              color: "#00f0ff",
              textShadow: "0 0 20px rgba(0,240,255,0.3)",
            }}
          >
            SIGNAL INTERCEPTOR
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-orbitron tracking-wide">
            Standing Wave Detector v2.0
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-900/50 backdrop-blur">
            <div className="text-xs text-gray-500 font-orbitron">SCORE</div>
            <div
              className="text-xl font-bold font-orbitron"
              style={{
                color: "#39ff14",
                textShadow: "0 0 10px rgba(57,255,20,0.3)",
              }}
            >
              {score}
            </div>
          </div>
          <div className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-900/50 backdrop-blur">
            <div className="text-xs text-gray-500 font-orbitron">FOUND</div>
            <div
              className="text-xl font-bold font-orbitron"
              style={{ color: "#ff2d55" }}
            >
              {foundAntinodes.size}/{waveCount}
            </div>
          </div>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="w-10 h-10 rounded-full border border-gray-700 bg-gray-900/50 flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:border-cyan-400/50 transition-all"
          >
            ?
          </button>
          <button
            onClick={resetGame}
            className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-900/50 text-gray-400 hover:text-cyan-400 hover:border-cyan-400/50 transition-all font-orbitron text-xs"
          >
            RESET
          </button>
        </div>
      </header>

      {/* Status bar */}
      <div className="relative z-10 px-6 py-2 flex items-center justify-center gap-3">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300"
          style={{
            borderColor: statusColor + "60",
            backgroundColor: statusColor + "10",
            boxShadow:
              currentType !== "neutral" ? `0 0 20px ${statusColor}20` : "none",
          }}
        >
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{
              backgroundColor: statusColor,
              boxShadow: `0 0 8px ${statusColor}`,
            }}
          />
          <span
            className="font-orbitron text-sm tracking-wide"
            style={{ color: statusColor }}
          >
            {statusLabel}
          </span>
        </div>
        <div className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/50">
          <span className="text-xs text-gray-500 font-orbitron">STRENGTH </span>
          <span
            className="font-orbitron text-sm font-bold"
            style={{ color: statusColor }}
          >
            {(signalStrength * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative z-10 flex-1 px-2 sm:px-6 py-2">
        <div
          className="relative rounded-xl border border-gray-800 bg-gray-900/30 overflow-hidden"
          style={{ height: "50vh", minHeight: 300 }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-crosshair"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>
      </div>

      {/* Formula bar */}
      <div className="relative z-10 px-6 py-3 flex flex-col sm:flex-row items-center justify-center gap-4">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-xs text-gray-500 font-orbitron mb-1">
              LAW OF REFLECTION
            </div>
            <div className="font-orbitron text-lg" style={{ color: "#00f0ff" }}>
              θ<sub>i</sub> = θ<sub>r</sub>
            </div>
          </div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="text-center">
            <div className="text-xs text-gray-500 font-orbitron mb-1">
              STANDING WAVE
            </div>
            <div className="font-orbitron text-lg" style={{ color: "#00f0ff" }}>
              A(x) = 2A₀ sin(kx)
            </div>
          </div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="text-center">
            <div className="text-xs text-gray-500 font-orbitron mb-1">
              WAVELENGTHS
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setWaveCount(Math.max(2, waveCount - 1));
                  resetGame();
                }}
                className="w-7 h-7 rounded border border-gray-600 text-gray-400 hover:text-cyan-400 hover:border-cyan-400/50 flex items-center justify-center text-lg"
              >
                −
              </button>
              <span
                className="font-orbitron text-lg w-4 text-center"
                style={{ color: "#00f0ff" }}
              >
                {waveCount}
              </span>
              <button
                onClick={() => {
                  setWaveCount(Math.min(6, waveCount + 1));
                  resetGame();
                }}
                className="w-7 h-7 rounded border border-gray-600 text-gray-400 hover:text-cyan-400 hover:border-cyan-400/50 flex items-center justify-center text-lg"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password revealed overlay */}
      {passwordRevealed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div
            className="text-center p-8 rounded-2xl border-2 border-green-500/50 bg-gray-900/90 max-w-md mx-4"
            style={{ boxShadow: "0 0 60px rgba(57,255,20,0.2)" }}
          >
            <div className="text-6xl mb-4">🔓</div>
            <h2
              className="font-orbitron text-2xl font-bold mb-2"
              style={{
                color: "#39ff14",
                textShadow: "0 0 20px rgba(57,255,20,0.4)",
              }}
            >
              PASSWORD INTERCEPTED
            </h2>
            <p className="text-gray-400 mb-4 font-orbitron text-sm">
              All {waveCount} antinodes located!
            </p>
            <div className="px-6 py-3 rounded-lg border border-green-500/30 bg-green-500/5 mb-6">
              <div className="text-xs text-green-400/60 font-orbitron mb-1">
                DECODED SIGNAL
              </div>
              <div
                className="font-orbitron text-xl tracking-[0.3em]"
                style={{ color: "#39ff14" }}
              >
                θᵢ=θᵣ
              </div>
            </div>
            <div className="text-gray-500 text-sm mb-6">
              Final Score:{" "}
              <span
                className="font-orbitron font-bold"
                style={{ color: "#39ff14" }}
              >
                {score}
              </span>
            </div>
            <button
              onClick={resetGame}
              className="px-6 py-3 rounded-lg font-orbitron text-sm border border-green-500/50 text-green-400 hover:bg-green-500/10 transition-all"
              style={{ boxShadow: "0 0 20px rgba(57,255,20,0.1)" }}
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}

      {/* Help overlay */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="p-8 rounded-2xl border border-cyan-500/30 bg-gray-900/95 max-w-lg mx-4"
            style={{ boxShadow: "0 0 40px rgba(0,240,255,0.1)" }}
          >
            <h2
              className="font-orbitron text-xl font-bold mb-6"
              style={{ color: "#00f0ff" }}
            >
              HOW TO PLAY
            </h2>
            <div className="space-y-4 text-gray-300 text-sm">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📡</span>
                <div>
                  <div className="font-semibold text-white mb-1">
                    The Mission
                  </div>
                  <div>
                    A wireless signal carries a password. It bounces off a metal
                    wall (total reflection). Your job: find the strongest signal
                    points.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔴</span>
                <div>
                  <div
                    className="font-semibold mb-1"
                    style={{ color: "#ff2d55" }}
                  >
                    Antinodes (Red/Hot)
                  </div>
                  <div>
                    Where the signal is <strong>maximum</strong>. This is where
                    A(x) = 2A₀ sin(kx) peaks. Place your interceptor here!
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔵</span>
                <div>
                  <div
                    className="font-semibold mb-1"
                    style={{ color: "#4361ee" }}
                  >
                    Nodes (Blue/Cold)
                  </div>
                  <div>
                    Where the signal is <strong>zero</strong>. The wave cancels
                    out here — no signal at all.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <div className="font-semibold text-white mb-1">Goal</div>
                  <div>
                    Drag the interceptor across the wave to find all{" "}
                    <strong style={{ color: "#ff2d55" }}>antinodes</strong>.
                    Find them all to decode the password!
                  </div>
                </div>
              </div>
            </div>
            <button
              className="mt-6 w-full px-6 py-3 rounded-lg font-orbitron text-sm border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 transition-all"
              style={{ boxShadow: "0 0 15px rgba(0,240,255,0.1)" }}
              onClick={() => setShowHelp(false)}
            >
              START INTERCEPTING →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
