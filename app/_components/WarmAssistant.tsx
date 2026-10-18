"use client";

import { useEffect } from "react";
import { fetchConfig } from "../assistant/lib/config";

// Wakes the backend and fills the config cache while the visitor is still on
// the landing page, so the demo opens without a wait.
export function WarmAssistant() {
  useEffect(() => {
    fetchConfig(null).catch(() => {});
  }, []);
  return null;
}
