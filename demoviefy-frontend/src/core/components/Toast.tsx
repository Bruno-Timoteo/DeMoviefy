// src/core/components/Toast.tsx
import { useEffect, useState } from "react";
import { toast } from "src/core/utils/toast";

export function Toast() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    return toast.subscribe((msg) => {
      setMessage(msg);
    });
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return (
    <div className="toast">
      <p>{message}</p>
      <button type="button" onClick={() => setMessage("")}>✕</button>
    </div>
  );
}