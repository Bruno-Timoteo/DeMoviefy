// src/core/stores/useUploadStore.ts

import { create } from "zustand";

interface UploadState {
  uploading: boolean;
  message: string;
  hint: string;
  setUploading: (uploading: boolean) => void;
  setMessage: (message: string) => void;
  setHint: (hint: string) => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  uploading: false,
  message: "",
  hint: "",
  setUploading: (uploading) => set({ uploading }),
  setMessage: (message) => set({ message }),
  setHint: (hint) => set({ hint }),
}));