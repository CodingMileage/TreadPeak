import { useState, useCallback } from "react";
import { Text, View, Pressable, ScrollView } from "react-native";
import { MotiView, AnimatePresence } from "moti";

/**
 * Moti animation playground — press any demo to toggle or trigger.
 */
export default function TestScreen() {
  // ----- Toggle states -----
  const [visible, setVisible] = useState(true);
  const [rotated, setRotated] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-black"
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      <View className="px-4 pt-6">
        <Text className="mb-6 text-center text-2xl font-bold text-black dark:text-white">
          Moti Playground
        </Text>

        {/* ---- Fade + Scale Toggle ---- */}
        <Section label="Fade & Scale (spring)">
          <Pressable
            onPress={() => setVisible((v) => !v)}
            className="items-center"
          >
            <MotiView
              from={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              style={{ width: 80, height: 80 }}
              className="items-center justify-center rounded-2xl bg-blue-500"
            >
              <Text className="text-xs font-semibold text-white">Spring</Text>
            </MotiView>
          </Pressable>
          <Hint>Tap the blue box — it re-animates on mount only. Toggle the card below for enter/exit.</Hint>
        </Section>

        {/* ---- AnimatePresence Toggle ---- */}
        <Section label="AnimatePresence (enter + exit)">
          <Pressable
            onPress={() => setVisible((v) => !v)}
            className="items-center rounded-xl bg-gray-100 py-3 dark:bg-neutral-800"
          >
            <Text className="text-sm font-medium text-black dark:text-white">
              {visible ? "Tap to hide" : "Tap to show"}
            </Text>
          </Pressable>
          <AnimatePresence>
            {visible && (
              <MotiView
                key="presence-box"
                from={{ opacity: 0, translateY: -20 }}
                animate={{ opacity: 1, translateY: 0 }}
                exit={{ opacity: 0, translateY: -20 }}
                transition={{ type: "timing", duration: 300 }}
                className="mt-3 h-16 items-center justify-center rounded-xl bg-green-500"
              >
                <Text className="text-sm font-semibold text-white">
                  I enter & exit smoothly
                </Text>
              </MotiView>
            )}
          </AnimatePresence>
          <Hint>The green bar slides in/out with AnimatePresence. Its exit animation runs before unmounting.</Hint>
        </Section>

        {/* ---- Rotation ---- */}
        <Section label="Rotation (timing)">
          <Pressable
            onPress={() => setRotated((r) => !r)}
            className="items-center"
          >
            <MotiView
              animate={{ rotate: rotated ? "90deg" : "0deg" }}
              transition={{ type: "timing", duration: 400 }}
              className="h-20 w-20 items-center justify-center rounded-xl bg-orange-500"
            >
              <Text className="text-xs font-semibold text-white">90°</Text>
            </MotiView>
          </Pressable>
          <Hint>Tap to rotate 90° and back. Transform animations use string values like "90deg".</Hint>
        </Section>

        {/* ---- Pulsing Loop ---- */}
        <Section label="Infinite Pulse (repeat)">
          <MotiView
            from={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 1.15, opacity: 1 }}
            transition={{
              type: "timing",
              duration: 800,
              loop: true,
              repeatReverse: true,
            }}
            className="h-16 w-16 self-center rounded-full bg-purple-500"
          />
          <Hint>
            Loops forever with repeatReverse — scales up then back down, ping-pong style.
          </Hint>
        </Section>

        {/* ---- Translate Slide ---- */}
        <Section label="Translate (slide left/right)">
          <Pressable
            onPress={() => setExpanded((e) => !e)}
            className="items-center overflow-hidden rounded-xl bg-gray-100 py-3 dark:bg-neutral-800"
          >
            <Text className="text-sm font-medium text-black dark:text-white">
              {expanded ? "Tap to slide back" : "Tap to slide out"}
            </Text>
          </Pressable>
          <MotiView
            animate={{ translateX: expanded ? 200 : 0 }}
            transition={{ type: "spring", damping: 14 }}
            className="mt-3 h-12 w-12 self-center rounded-full bg-red-500"
          />
          <Hint>Spring-based translateX — notice the bounce at the endpoint.</Hint>
        </Section>

        {/* ---- Staggered List ---- */}
        <Section label="Staggered Reveal (delay)">
          <View className="flex-row justify-center gap-2">
            {["A", "B", "C", "D", "E"].map((letter, i) => (
              <Pressable key={letter} onPress={() => setSelected(i)}>
                <MotiView
                  from={{ opacity: 0, translateY: 20 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: "spring", delay: i * 80 }}
                  className="h-11 w-11 items-center justify-center rounded-lg bg-indigo-500"
                >
                  <Text className="text-xs font-bold text-white">{letter}</Text>
                </MotiView>
              </Pressable>
            ))}
          </View>
          <Hint>
            Each letter staggers in 80ms after the last. Tap any letter —{" "}
            {selected !== null ? `you selected "${String.fromCharCode(65 + selected)}".` : "they're pressable too."}
          </Hint>
        </Section>

        {/* ---- Wiggle on Press ---- */}
        <Section label="Wiggle on Press (keyframe via animate)">
          <Pressable
            onPressIn={() => setRotated(true)}
            onPressOut={() => setRotated(false)}
          >
            <MotiView
              animate={{ rotate: rotated ? "15deg" : "0deg" }}
              transition={{ type: "spring", damping: 3, stiffness: 200 }}
              className="h-16 w-48 self-center items-center justify-center rounded-xl bg-pink-500"
            >
              <Text className="text-sm font-semibold text-white">
                Press & Hold
              </Text>
            </MotiView>
          </Pressable>
          <Hint>
            Hold down to wiggle (spring with low damping = lots of bounce). Release snaps back.
          </Hint>
        </Section>
      </View>
    </ScrollView>
  );
}

// ----- Helpers -----

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-6 rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
      <Text className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </Text>
      {children}
    </View>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mt-2 text-center text-xs leading-relaxed text-gray-400 dark:text-gray-500">
      {children}
    </Text>
  );
}
