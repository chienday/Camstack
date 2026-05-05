import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Bell, Sparkles } from "lucide-react";
import RealtimeCamera from "@/components/RealtimeCamera";
import AttendanceList from "@/components/AttendanceList";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/useWebSocket";
import { SessionsAPI, wsUrl } from "@/services/api";

// Pre-create audio context for better performance
let audioCtx = null;
const playDingSound = () => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    o.start();
    o.stop(ctx.currentTime + 0.27);
  } catch (_) {
    /* ignore */
  }
};

export default function RealtimePage() {
  const { t } = useTranslation();
  const [sessionId, setSessionId] = useState(null);
  const [sessionName, setSessionName] = useState(
    `${t("realtime.title")} ${new Date().toLocaleString()}`
  );
  const [className, setClassName] = useState("");
  const [starting, setStarting] = useState(false);

  const [attended, setAttended] = useState([]);
  const [processedFrame, setProcessedFrame] = useState(null);
  const [lastNotification, setLastNotification] = useState(null);

  // FPS calc
  const frameCountRef = useRef(0);
  const lastFpsTsRef = useRef(performance.now());
  const [fps, setFps] = useState(0);
  
  // Frame skipping - only send if not processing
  const processingRef = useRef(false);
  const fpsUpdateRef = useRef(0);

  const url = useMemo(() => (sessionId ? wsUrl(sessionId) : null), [sessionId]);

  const { status, send, close } = useWebSocket(url, {
    onOpen: () => toast.success(t("common.success")),
    onClose: () => {
      // quiet close
    },
    onMessage: (msg) => {
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "frame_result") {
        setProcessedFrame(msg.frame);
        processingRef.current = false;  // Ready for next frame

        // Optimized FPS calculation - update display less frequently
        frameCountRef.current += 1;
        fpsUpdateRef.current++;
        if (fpsUpdateRef.current >= 15) {
          const now = performance.now();
          const dt = now - lastFpsTsRef.current;
          if (dt > 0) {
            setFps(Math.round((frameCountRef.current * 1000) / dt));
          }
          frameCountRef.current = 0;
          fpsUpdateRef.current = 0;
          lastFpsTsRef.current = now;
        }

        if (msg.new_attendance) {
          setLastNotification(msg.new_attendance);
          toast.success(
            `✅ ${msg.new_attendance.student_id} - ${msg.new_attendance.name} ${t("students.created_success")}!`
          );
          // play ding with pre-created context
          playDingSound();
        }

        if (Array.isArray(msg.attended_list)) {
          setAttended(
            msg.attended_list.map((a) => ({
              student_id: a.student_id,
              name: a.name,
              time: a.check_in_time,
              confidence: a.confidence,
            }))
          );
        }
      } else if (msg.type === "error") {
        toast.error(msg.message || t("common.error"));
      }
    },
  });

  const sendFrame = useCallback(
    (dataUrl) => {
      // Skip if still processing previous frame
      if (!processingRef.current) {
        processingRef.current = true;
        send({ type: "frame", frame: dataUrl });
      }
    },
    [send]
  );

  const startSession = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const s = await SessionsAPI.start({
        session_name: sessionName || `Session ${new Date().toISOString()}`,
        class_name: className || undefined,
      });
      setSessionId(s._id || s.id);
      setAttended([]);
      setProcessedFrame(null);
      frameCountRef.current = 0;
      lastFpsTsRef.current = performance.now();
      toast.success(t("common.success"));
    } catch (e) {
      console.error(e);
      toast.error(
        e?.response?.data?.detail || e?.message || t("common.error")
      );
    } finally {
      setStarting(false);
    }
  };

  const stopSession = async () => {
    if (!sessionId) return;
    try {
      await SessionsAPI.end(sessionId);
    } catch (e) {
      console.warn("End session failed:", e);
    }
    close();
    toast.info(t("common.loading"));
    setSessionId(null);
    setProcessedFrame(null);
  };

  const handleToggle = () => (sessionId ? stopSession() : startSession());

  const exportExcel = () => {
    if (!sessionId) return;
    window.open(SessionsAPI.exportExcelUrl(sessionId), "_blank");
  };

  // Safety: cleanup on unmount
  useEffect(() => () => close(), [close]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold gradient-text">{t("realtime.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("realtime.subtitle")}
          </p>
        </div>
      </div>

      {/* Session controls */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {t("realtime.title")}
            </label>
            <Input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g., Buổi học 15/01/2025"
              disabled={!!sessionId}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {t("students.class")}
            </label>
            <Input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g., CNTT-K15"
              disabled={!!sessionId}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            {sessionId ? (
              <Button variant="destructive" onClick={stopSession}>
                {t("realtime.stopCamera")}
              </Button>
            ) : (
              <Button onClick={startSession} disabled={starting}>
                {starting ? t("common.loading") : t("realtime.startCamera")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Camera + list */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <RealtimeCamera
          active={!!sessionId && status === "open"}
          onToggle={handleToggle}
          wsStatus={status}
          processedFrame={processedFrame}
          fps={fps}
          sendFrame={sendFrame}
          captureIntervalMs={50}
        />
        <AttendanceList
          attended={attended}
          total={0}
          onExport={sessionId ? exportExcel : undefined}
        />
      </div>

      {/* Notification bar */}
      {lastNotification && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-3 flex items-center gap-3 text-sm border border-emerald-500/30"
        >
          <Bell className="h-4 w-4 text-emerald-500" />
          <Sparkles className="h-4 w-4 text-fuchsia-500" />
          <span>
            <strong className="font-mono">{lastNotification.student_id}</strong>{" "}
            - {lastNotification.name} đã điểm danh thành công lúc{" "}
            <strong>{lastNotification.time}</strong>
          </span>
        </motion.div>
      )}
    </div>
  );
}
