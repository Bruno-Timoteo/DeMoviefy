// src/core/stores/useUploadStore.ts

import { create } from "zustand";

interface UploadState {
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  uploading: false,
  setUploading: (uploading) => set({ uploading }),
}));