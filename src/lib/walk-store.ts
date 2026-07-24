import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Coordinate } from "@/hooks/use-location";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A completed walk session stored in history. */
export interface WalkEntry {
  id: string;
  startedAt: string; // ISO-8601
  endedAt: string; // ISO-8601
  durationSeconds: number;
  distanceMetres: number;
  steps: number;
  /** Active calories burned, or `null` if unavailable. */
  calories: number | null;
  /** Breadcrumb trail. Empty for HealthKit-imported walks. */
  pathCoordinates: Coordinate[];
  /** Where this walk came from. */
  source: "gps" | "healthkit";
}

export interface WalkStore {
  /** All completed walks, newest first. */
  walks: WalkEntry[];
  /** Persist a completed walk. */
  addWalk: (walk: WalkEntry) => void;
  /** Remove a walk by id. */
  removeWalk: (id: string) => void;
  /** Upsert walks from HealthKit — skips duplicates by id or time overlap. */
  importWalks: (walks: WalkEntry[]) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useWalkStore = create<WalkStore>()(
  persist(
    (set, get) => ({
      walks: [],

      addWalk: (walk) =>
        set((state) => ({
          walks: [walk, ...state.walks],
        })),

      removeWalk: (id) =>
        set((state) => ({
          walks: state.walks.filter((w) => w.id !== id),
        })),

      importWalks: (incoming) =>
        set((state) => {
          const existing = state.walks;

          // Generate a compound key for deduplication: date range + distance
          // HealthKit workouts with overlapping time + similar distance to an
          // existing GPS walk are considered duplicates.
          const fresh = incoming.filter((hk) => {
            const hkStart = new Date(hk.startedAt).getTime();
            const hkEnd = new Date(hk.endedAt).getTime();

            return !existing.some((w) => {
              const wStart = new Date(w.startedAt).getTime();
              const wEnd = new Date(w.endedAt).getTime();

              // Overlap > 50% of the shorter walk.
              const overlapStart = Math.max(hkStart, wStart);
              const overlapEnd = Math.min(hkEnd, wEnd);
              const overlapMs = Math.max(0, overlapEnd - overlapStart);
              const shorterMs = Math.min(
                hkEnd - hkStart,
                wEnd - wStart,
              );
              return shorterMs > 0 && overlapMs / shorterMs > 0.5;
            });
          });

          if (fresh.length === 0) return state;

          // Merge fresh walks sorted by date (newest first).
          return {
            walks: [...fresh, ...existing].sort(
              (a, b) =>
                new Date(b.startedAt).getTime() -
                new Date(a.startedAt).getTime(),
            ),
          };
        }),
    }),
    {
      name: "treadpeak-walks",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// ---------------------------------------------------------------------------
// Convenience
// ---------------------------------------------------------------------------

/** Build a WalkEntry from the data collected during a GPS-tracked walk. */
export function createWalkEntry(params: {
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  distanceMetres: number;
  steps: number;
  calories?: number | null;
  pathCoordinates: Coordinate[];
  source?: "gps" | "healthkit";
}): WalkEntry {
  return {
    id: generateId(),
    calories: null,
    source: "gps",
    ...params,
  };
}
