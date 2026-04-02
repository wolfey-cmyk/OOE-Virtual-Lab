import React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Zap,
  RotateCcw,
  Info,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Lock,
  Unlock,
  Target,
  Eye,
  EyeOff,
  Move,
  RefreshCw,
} from "lucide-react";

interface Point {
  x: number;
  y: number;
}

interface Mirror {
  id: string;
  x: number;
  y: number;
  angle: number;
  length: number;
}

interface Ray {
  start: Point;
  end: Point;
  color: string;
  incidenceAngle?: number;
  reflectionAngle?: number;
  mirrorId?: string;
}

type HitResult = {
  point: Point;
  mirror: Mirror | null;
  dist: number;
  normal?: Point;
};

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const LaserGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"exercise" | "sandbox">("exercise");
  const [step, setStep] = useState(0);
  const [mirrors, setMirrors] = useState<Mirror[]>([
    { id: "m1", x: 400, y: 450, angle: 0, length: 180 },
    { id: "m2", x: 600, y: 300, angle: 90, length: 180 },
  ]);
  const [source] = useState<Point>({ x: 150, y: 100 });
  const [sourceAngle, setSourceAngle] = useState(120);
  const [sensor] = useState<Point>({ x: 100, y: 100 });
  const [isSuccess, setIsSuccess] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(true);
  const [draggedMirror, setDraggedMirror] = useState<string | null>(null);
  const [rotatingMirror, setRotatingMirror] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const calculateReflections = useCallback(() => {
    const rays: Ray[] = [];
    let currentPos = { ...source };
    let currentAngle = sourceAngle * (Math.PI / 180);

    const maxReflections = 8;
    let hitSensor = false;

    for (let i = 0; i < maxReflections; i++) {
      let closestHit: HitResult | null = null;

      mirrors.forEach((mirror) => {
        const mAngleRad = mirror.angle * (Math.PI / 180);
        const mDir = { x: Math.cos(mAngleRad), y: Math.sin(mAngleRad) };

        const p1 = {
          x: mirror.x - (mDir.x * mirror.length) / 2,
          y: mirror.y - (mDir.y * mirror.length) / 2,
        };
        const p2 = {
          x: mirror.x + (mDir.x * mirror.length) / 2,
          y: mirror.y + (mDir.y * mirror.length) / 2,
        };

        const rDir = { x: Math.cos(currentAngle), y: Math.sin(currentAngle) };
        const hit: { point: Point; dist: number } | null = intersectRaySegment(
          currentPos,
          rDir,
          p1,
          p2,
        );

        if (hit) {
          if (!closestHit || hit.dist < closestHit.dist) {
            const mNormal = { x: -mDir.y, y: mDir.x };
            const dot = rDir.x * mNormal.x + rDir.y * mNormal.y;
            const actualNormal =
              dot > 0 ? { x: -mNormal.x, y: -mNormal.y } : mNormal;

            closestHit = {
              point: hit.point,
              mirror,
              dist: hit.dist,
              normal: actualNormal,
            };
          }
        }
      });

      // Check sensor
      const rDir = { x: Math.cos(currentAngle), y: Math.sin(currentAngle) };
      const sensorHit = intersectRayCircle(currentPos, rDir, sensor, 25);

      if (sensorHit) {
        if (!closestHit) {
          closestHit = {
            point: sensorHit.point,
            mirror: null,
            dist: sensorHit.dist,
          };
          hitSensor = true;
        }
      }

      // Check walls
      const wallHit = intersectRayWalls(currentPos, rDir);
      if (!closestHit || wallHit.dist < closestHit.dist) {
        closestHit = { point: wallHit.point, mirror: null, dist: wallHit.dist };
        hitSensor = false;
      }

      if (!closestHit) break;

      // Calculate angles for display
      let incidenceAngle = 0;
      let reflectionAngle = 0;
      if (closestHit.normal) {
        const incomingVec = {
          x: Math.cos(currentAngle),
          y: Math.sin(currentAngle),
        };
        const dot =
          incomingVec.x * closestHit.normal.x +
          incomingVec.y * closestHit.normal.y;
        incidenceAngle =
          Math.acos(Math.min(1, Math.max(-1, Math.abs(dot)))) * (180 / Math.PI);
        reflectionAngle = incidenceAngle;
      }

      rays.push({
        start: { ...currentPos },
        end: { ...closestHit.point },
        color: "#ef4444",
        incidenceAngle,
        reflectionAngle,
        mirrorId: closestHit.mirror?.id,
      });

      if (hitSensor) break;
      if (!closestHit.mirror || !closestHit.normal) break;

      // Calculate reflection
      const dot2 = rDir.x * closestHit.normal.x + rDir.y * closestHit.normal.y;
      const vOut = {
        x: rDir.x - 2 * dot2 * closestHit.normal.x,
        y: rDir.y - 2 * dot2 * closestHit.normal.y,
      };

      currentPos = { ...closestHit.point };
      currentAngle = Math.atan2(vOut.y, vOut.x);

      currentPos.x += vOut.x * 0.1;
      currentPos.y += vOut.y * 0.1;
    }

    return { rays, hitSensor };
  }, [mirrors, source, sourceAngle, sensor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { rays, hitSensor } = calculateReflections();
    setIsSuccess(hitSensor);

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Grid
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    for (let i = 0; i < CANVAS_WIDTH; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let i = 0; i < CANVAS_HEIGHT; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_WIDTH, i);
      ctx.stroke();
    }

    // Draw Sensor
    ctx.save();
    ctx.translate(sensor.x, sensor.y);
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fillStyle = hitSensor
      ? "rgba(34, 197, 94, 0.2)"
      : "rgba(239, 68, 68, 0.05)";
    ctx.fill();
    ctx.strokeStyle = hitSensor ? "#22c55e" : "#475569";
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = hitSensor ? "#22c55e" : "#475569";
    ctx.fill();
    ctx.restore();

    // Draw Source
    ctx.save();
    ctx.translate(source.x, source.y);
    ctx.rotate(sourceAngle * (Math.PI / 180));
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.roundRect(-20, -15, 40, 30, 4);
    ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(15, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Rays and Telemetry
    rays.forEach((ray) => {
      ctx.beginPath();
      ctx.moveTo(ray.start.x, ray.start.y);
      ctx.lineTo(ray.end.x, ray.end.y);
      ctx.strokeStyle = ray.color;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = ray.color;
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (showTelemetry && ray.incidenceAngle && ray.incidenceAngle > 0) {
        const midX = ray.end.x;
        const midY = ray.end.y;

        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
        ctx.lineWidth = 1;

        const mirror = mirrors.find((m) => m.id === ray.mirrorId);
        if (mirror) {
          const mAngleRad = mirror.angle * (Math.PI / 180);
          const mNormal = { x: -Math.sin(mAngleRad), y: Math.cos(mAngleRad) };
          const incomingVec = {
            x: ray.end.x - ray.start.x,
            y: ray.end.y - ray.start.y,
          };
          const dot = incomingVec.x * mNormal.x + incomingVec.y * mNormal.y;
          const actualNormal =
            dot > 0 ? { x: -mNormal.x, y: -mNormal.y } : mNormal;

          ctx.moveTo(midX, midY);
          ctx.lineTo(midX + actualNormal.x * 60, midY + actualNormal.y * 60);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.font = "bold 10px font-mono";
          ctx.fillStyle = "#94a3b8";
          ctx.textAlign = "center";
          const labelDist = 45;
          const angleText = `${Math.round(ray.incidenceAngle)}°`;
          ctx.fillText(
            `i=${angleText}`,
            midX + actualNormal.x * labelDist - 15,
            midY + actualNormal.y * labelDist - 10,
          );
          ctx.fillText(
            `r=${angleText}`,
            midX + actualNormal.x * labelDist + 15,
            midY + actualNormal.y * labelDist - 10,
          );
        }
      }
    });

    // Draw Mirrors
    mirrors.forEach((mirror) => {
      ctx.save();
      ctx.translate(mirror.x, mirror.y);
      ctx.rotate(mirror.angle * (Math.PI / 180));

      const gradient = ctx.createLinearGradient(0, -6, 0, 6);
      gradient.addColorStop(0, "#94a3b8");
      gradient.addColorStop(0.5, "#f8fafc");
      gradient.addColorStop(1, "#475569");

      ctx.beginPath();
      ctx.roundRect(-mirror.length / 2, -6, mirror.length, 12, 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle =
        draggedMirror === mirror.id || rotatingMirror === mirror.id
          ? "#3b82f6"
          : "#1e293b";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.rotate(-mirror.angle * (Math.PI / 180));
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(mirror.id.toUpperCase(), 0, -20);

      ctx.restore();
    });
  }, [
    calculateReflections,
    mirrors,
    sensor,
    source,
    sourceAngle,
    showTelemetry,
    draggedMirror,
    rotatingMirror,
  ]);

  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getCanvasCoordinates(e);
    const isShift = "shiftKey" in e ? (e as React.MouseEvent).shiftKey : false;

    mirrors.forEach((m) => {
      const dist = Math.sqrt(Math.pow(m.x - x, 2) + Math.pow(m.y - y, 2));
      if (dist < 60) {
        if (isShift) {
          setRotatingMirror(m.id);
        } else {
          setDraggedMirror(m.id);
        }
      }
    });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getCanvasCoordinates(e);

    if (draggedMirror) {
      setMirrors((prev) =>
        prev.map((m) => (m.id === draggedMirror ? { ...m, x, y } : m)),
      );
    } else if (rotatingMirror) {
      const m = mirrors.find((m) => m.id === rotatingMirror);
      if (m) {
        let angle = Math.atan2(y - m.y, x - m.x) * (180 / Math.PI);
        angle = Math.round(angle / 15) * 15;
        setMirrors((prev) =>
          prev.map((m) => (m.id === rotatingMirror ? { ...m, angle } : m)),
        );
      }
    }
  };

  const handleMouseUp = () => {
    setDraggedMirror(null);
    setRotatingMirror(null);
  };

  const resetExercise = () => {
    setMirrors([
      { id: "m1", x: 400, y: 450, angle: 0, length: 180 },
      { id: "m2", x: 600, y: 300, angle: 90, length: 180 },
    ]);
    setStep(0);
    setMode("exercise");
    setFeedback(null);
  };

  const checkStep = () => {
    const { rays, hitSensor } = calculateReflections();

    if (step === 1) {
      const ray1 = rays.find((r) => r.mirrorId === "m1");
      if (ray1 && Math.abs(ray1.incidenceAngle! - 30) < 2) {
        setFeedback({
          type: "success",
          msg: "Perfect! i1 = 30°. Law of Reflection: r1 = 30°.",
        });
        setTimeout(() => {
          setStep(2);
          setFeedback(null);
        }, 2000);
      } else {
        setFeedback({
          type: "error",
          msg: "Adjust M1 until the incidence angle i is 30°.",
        });
      }
    } else if (step === 2) {
      const m1 = mirrors.find((m) => m.id === "m1")!;
      const m2 = mirrors.find((m) => m.id === "m2")!;
      const isPerp = Math.abs(Math.abs(m1.angle - m2.angle) - 90) % 180 < 2;

      if (isPerp && hitSensor) {
        setFeedback({
          type: "success",
          msg: "Mission Accomplished! M1 ⊥ M2 and sensor triggered.",
        });
        setTimeout(() => {
          setStep(3);
          setFeedback(null);
        }, 2000);
      } else if (!isPerp) {
        setFeedback({
          type: "error",
          msg: "M2 must be exactly perpendicular to M1.",
        });
      } else {
        setFeedback({
          type: "error",
          msg: "Almost! Now position M2 to hit the sensor.",
        });
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617] p-4 font-sans text-slate-200">
      <div className="max-w-6xl w-full bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-800 flex flex-col lg:flex-row h-[750px]">
        <div className="w-full lg:w-[400px] bg-slate-800/40 border-r border-slate-700/50 p-10 flex flex-col">
          <div className="flex items-center gap-4 mb-10">
            <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
              <Zap className="w-7 h-7 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white leading-none mb-1">
                LASER OPS
              </h1>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                Active Protocol
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div
                  key="s0"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <h2 className="text-xl font-bold text-white mb-4">
                    Security Bypass
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed mb-8">
                    A security laser trips the alarm if broken. You must use two
                    pocket mirrors to bounce the beam into a hidden override
                    sensor.
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => setStep(1)}
                      className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-900/20"
                    >
                      Start Exercise <ArrowRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setMode("sandbox");
                        setStep(3);
                      }}
                      className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-3"
                    >
                      Sandbox Mode <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="s1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className="flex items-center gap-2 text-blue-400 mb-3">
                    <Target className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Objective 01
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-4">
                    The First Reflection
                  </h2>
                  <p className="text-slate-400 text-sm mb-6">
                    Task: Drag and rotate{" "}
                    <span className="text-white font-bold">Mirror M1</span> so
                    the laser hits it at an incidence angle of{" "}
                    <span className="text-blue-400 font-bold">30°</span>.
                  </p>
                  <div className="bg-slate-900/50 border border-slate-700 p-5 rounded-2xl mb-8">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        Current i₁
                      </span>
                      <span className="text-xl font-mono font-bold text-blue-400">
                        {Math.round(
                          calculateReflections().rays.find(
                            (r) => r.mirrorId === "m1",
                          )?.incidenceAngle || 0,
                        )}
                        °
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-blue-500"
                        animate={{
                          width: `${Math.min(100, ((calculateReflections().rays.find((r) => r.mirrorId === "m1")?.incidenceAngle || 0) / 30) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={checkStep}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all"
                  >
                    Verify Alignment
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="s2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className="flex items-center gap-2 text-blue-400 mb-3">
                    <Shield className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Objective 02
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-4">
                    The Corner Cube
                  </h2>
                  <p className="text-slate-400 text-sm mb-6">
                    Task: Position{" "}
                    <span className="text-white font-bold">Mirror M2</span>{" "}
                    exactly{" "}
                    <span className="text-blue-400 font-bold">
                      perpendicular
                    </span>{" "}
                    to M1 and redirect the beam into the sensor.
                  </p>
                  <div className="bg-slate-900/50 border border-slate-700 p-5 rounded-2xl mb-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        Angle M1-M2
                      </span>
                      <span className="text-sm font-mono font-bold text-white">
                        {Math.round(
                          Math.abs(mirrors[0].angle - mirrors[1].angle) % 180,
                        )}
                        °
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        Sensor Lock
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase ${isSuccess ? "text-green-500" : "text-red-500"}`}
                      >
                        {isSuccess ? "LOCKED" : "SEARCHING..."}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={checkStep}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all"
                  >
                    Execute Override
                  </button>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="s3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className="flex items-center gap-2 text-green-400 mb-3">
                    <Unlock className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Protocol Complete
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-4">
                    Mission Success
                  </h2>
                  <div className="bg-slate-900/80 border border-slate-700 p-5 rounded-2xl mb-8 text-[11px] leading-relaxed font-mono">
                    <p className="text-slate-500 mb-3 uppercase tracking-widest font-black">
                      Physics Proof
                    </p>
                    <p className="text-slate-300 mb-1">
                      Incident:{" "}
                      <span className="text-blue-400">v = (x, y)</span>
                    </p>
                    <p className="text-slate-300 mb-1">
                      M1 Refl:{" "}
                      <span className="text-blue-400">v' = (x, -y)</span>
                    </p>
                    <p className="text-slate-300 mb-1">
                      M2 Refl:{" "}
                      <span className="text-blue-400">v'' = (-x, -y)</span>
                    </p>
                    <div className="h-px bg-slate-700 my-3"></div>
                    <p className="text-green-400 font-bold text-sm">
                      v'' = -v (Parallel & Opposite)
                    </p>
                  </div>
                  <button
                    onClick={resetExercise}
                    className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-bold transition-all"
                  >
                    Restart Mission
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-6 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 ${feedback.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              {feedback.msg}
            </motion.div>
          )}
        </div>

        <div className="flex-1 relative bg-slate-950 flex flex-col">
          <div className="h-20 border-b border-slate-800/50 flex items-center justify-between px-10 bg-slate-900/40 backdrop-blur-xl">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${isSuccess ? "bg-green-500 shadow-[0_0_12px_#22c55e]" : "bg-red-500 shadow-[0_0_12px_#ef4444]"}`}
                ></div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  {isSuccess ? "Override Active" : "Alarm Armed"}
                </span>
              </div>
              <div className="h-5 w-px bg-slate-800"></div>
              <button
                onClick={() => setShowTelemetry(!showTelemetry)}
                className={`flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${showTelemetry ? "text-blue-400" : "text-slate-600"}`}
              >
                {showTelemetry ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
                Telemetry {showTelemetry ? "ON" : "OFF"}
              </button>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">
                  Laser Vector
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  [
                  {Math.round(Math.cos((sourceAngle * Math.PI) / 180) * 100) /
                    100}
                  ,{" "}
                  {Math.round(Math.sin((sourceAngle * Math.PI) / 180) * 100) /
                    100}
                  ]
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden flex items-center justify-center p-10">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              className="max-w-full h-auto rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-slate-800 bg-[#020617] cursor-crosshair"
            />

            <div className="absolute bottom-14 right-14 bg-slate-900/80 backdrop-blur p-5 rounded-2xl border border-slate-700/50 shadow-2xl max-w-[200px]">
              <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                <Move className="w-3 h-3" /> Controls
              </h3>
              <ul className="space-y-2 text-[10px] text-slate-400 font-medium">
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-blue-500"></span>{" "}
                  Drag to Move
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-blue-500"></span>{" "}
                  Shift + Drag to Rotate
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-blue-500"></span>{" "}
                  Snaps to 15°
                </li>
              </ul>
            </div>
          </div>

          <div className="h-16 border-t border-slate-800/50 flex items-center justify-center gap-12 px-10 bg-slate-900/20">
            <div className="flex items-center gap-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
              <div className="w-4 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444]"></div>
              Laser Beam
            </div>
            <div className="flex items-center gap-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
              <div className="w-4 h-2 bg-slate-400 rounded-sm"></div>
              Mirror
            </div>
            <div className="flex items-center gap-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
              <div className="w-4 h-4 border border-slate-700 border-dashed rounded-full"></div>
              Sensor
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function intersectRaySegment(
  origin: Point,
  dir: Point,
  p1: Point,
  p2: Point,
): { point: Point; dist: number } | null {
  const v1 = { x: origin.x - p1.x, y: origin.y - p1.y };
  const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };
  const v3 = { x: -dir.y, y: dir.x };
  const dot = v2.x * v3.x + v2.y * v3.y;
  if (Math.abs(dot) < 0.000001) return null;

  const t1 = (v2.x * v1.y - v2.y * v1.x) / dot;
  const t2 = (v1.x * v3.x + v1.y * v3.y) / dot;

  if (t1 >= 0 && t2 >= 0 && t2 <= 1) {
    return {
      point: { x: origin.x + dir.x * t1, y: origin.y + dir.y * t1 },
      dist: t1,
    };
  }
  return null;
}

function intersectRayCircle(
  origin: Point,
  dir: Point,
  center: Point,
  radius: number,
): { point: Point; dist: number } | null {
  const oc = { x: origin.x - center.x, y: origin.y - center.y };
  const a = dir.x * dir.x + dir.y * dir.y;
  const b = 2 * (oc.x * dir.x + oc.y * dir.y);
  const c = oc.x * oc.x + oc.y * oc.y - radius * radius;
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) return null;

  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  if (t < 0) return null;

  return {
    point: { x: origin.x + dir.x * t, y: origin.y + dir.y * t },
    dist: t,
  };
}

function intersectRayWalls(
  origin: Point,
  dir: Point,
): { point: Point; dist: number } {
  let t = Infinity;
  let point = { x: 0, y: 0 };

  if (dir.x > 0) {
    const tWall = (CANVAS_WIDTH - origin.x) / dir.x;
    if (tWall < t) {
      t = tWall;
      point = { x: CANVAS_WIDTH, y: origin.y + dir.y * t };
    }
  } else if (dir.x < 0) {
    const tWall = -origin.x / dir.x;
    if (tWall < t) {
      t = tWall;
      point = { x: 0, y: origin.y + dir.y * t };
    }
  }

  if (dir.y > 0) {
    const tWall = (CANVAS_HEIGHT - origin.y) / dir.y;
    if (tWall < t) {
      t = tWall;
      point = { x: origin.x + dir.x * t, y: CANVAS_HEIGHT };
    }
  } else if (dir.y < 0) {
    const tWall = -origin.y / dir.y;
    if (tWall < t) {
      t = tWall;
      point = { x: origin.x + dir.x * t, y: 0 };
    }
  }

  return { point, dist: t };
}

export default LaserGame;
