import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lightweight reconnecting WebSocket hook.
 *
 * @param {string|null} url - ws:// url. Pass null to disable connection.
 * @param {{onMessage?: (msg:any)=>void, onOpen?: ()=>void, onClose?: ()=>void}} handlers
 */
export function useWebSocket(url, handlers = {}) {
  const wsRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | connecting | open | closed | error
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const send = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === "string" ? data : JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  const close = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (_) {
        // ignore
      }
      wsRef.current = null;
      setStatus("closed");
    }
  }, []);

  useEffect(() => {
    if (!url) return undefined;

    setStatus("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("open");
      handlersRef.current.onOpen?.();
    };

    ws.onmessage = (ev) => {
      let msg = ev.data;
      try {
        msg = JSON.parse(ev.data);
      } catch (_) {
        // keep as raw string
      }
      handlersRef.current.onMessage?.(msg);
    };

    ws.onerror = () => {
      setStatus("error");
    };

    ws.onclose = () => {
      setStatus("closed");
      handlersRef.current.onClose?.();
    };

    return () => {
      try {
        ws.close();
      } catch (_) {
        // ignore
      }
    };
  }, [url]);

  return { status, send, close };
}
