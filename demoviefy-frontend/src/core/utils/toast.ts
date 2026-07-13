// src/core/utils/toast.ts
type ToastListener = (message: string) => void;

let listener: ToastListener | null = null;

export const toast = {
  show(message: string) {
    listener?.(message);
  },
  subscribe(fn: ToastListener) {
    listener = fn;
    return () => { listener = null; };
  },
};