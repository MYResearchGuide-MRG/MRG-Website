import { isLocalPreview } from "@/components/admin/local-preview"

// Explicit build flag + localhost + preview access mode. No production demo route.
export const feedbackDemoEnabled =
  import.meta.env.VITE_FEEDBACK_DEMO === "true" &&
  import.meta.env.VITE_ACCESS_MODE === "preview" &&
  isLocalPreview
