import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  font,
  foregroundStyle,
  frame,
  monospacedDigit,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity, type LiveActivityEnvironment } from "expo-widgets";

/**
 * Props for the walk Live Activity. They are JSON.stringify'd before crossing
 * to the native extension, so only JSON primitives are allowed (the walk start
 * is an epoch-ms number, never a `Date`).
 *
 * Privacy: these props render on the Lock Screen, so they carry aggregate
 * stats only. Never add coordinates, paths, place names or user identity.
 */
export interface WalkActivityProps {
  /** Walk start time as epoch milliseconds; drives the native ticking timer. */
  startedAtMs: number;
  /** True once the walk has stopped; swaps the timer for a frozen duration. */
  isEnded: boolean;
  /** Final duration label (e.g. "12:34"); only shown once `isEnded` is true. */
  elapsedLabel: string;
  /** Pre-formatted step count (e.g. "1,234"). */
  stepsLabel: string;
  /** Pre-formatted distance (e.g. "0.06 mi" or "1.25 mi"). */
  distanceLabel: string;
  /** Pre-formatted pace (e.g. "18:30 /mi") or "--" when unknown. */
  paceLabel: string;
}

/**
 * Live Activity for an in-progress walk: Lock Screen banner plus Dynamic
 * Island compact, minimal and expanded presentations.
 *
 * The layout function runs in expo-widgets' isolated runtime. The bundler
 * serialises only the function body, and identifiers resolve by their exact
 * exported names from globals the runtime installs. That means: no import
 * aliases, no hooks, and no helpers or constants declared at module scope
 * (everything the layout needs is declared inside the function).
 *
 * The elapsed time uses SwiftUI's native `Text` timer (`date` + `dateStyle:
 * 'timer'`), so it keeps ticking while the app's JS is suspended in the
 * background. It is replaced with a static label once the walk has ended, or
 * the timer would keep counting after the walk stops.
 */
const WalkActivity = createLiveActivity<WalkActivityProps>(
  "TreadPeakWalk",
  (props: WalkActivityProps, environment: LiveActivityEnvironment) => {
    "widget";

    // App brand color; plain white on the dimmed always-on Lock Screen.
    const accent = environment.isLuminanceReduced ? "#FFFFFF" : "#208AEF";
    const title = props.isEnded ? "Walk complete" : "Walk in progress";

    const elapsed = (modifiers: any[]) =>
      props.isEnded ? (
        <Text modifiers={modifiers}>{props.elapsedLabel}</Text>
      ) : (
        <Text
          date={new Date(props.startedAtMs)}
          dateStyle="timer"
          modifiers={modifiers}
        />
      );

    return {
      banner: (
        <HStack spacing={12} modifiers={[padding({ all: 16 })]}>
          <Image systemName="figure.walk" size={28} color={accent} />
          <VStack spacing={2} alignment="leading">
            <Text
              modifiers={[
                font({ textStyle: "subheadline", weight: "semibold" }),
                foregroundStyle({ type: "hierarchical", style: "secondary" }),
              ]}
            >
              {title}
            </Text>
            {elapsed([
              font({ size: 34, weight: "bold", design: "rounded" }),
              monospacedDigit(),
            ])}
          </VStack>
          <Spacer />
          <VStack spacing={4} alignment="trailing">
            <Text
              modifiers={[font({ textStyle: "subheadline" }), monospacedDigit()]}
            >
              {props.stepsLabel + " steps"}
            </Text>
            <Text
              modifiers={[font({ textStyle: "subheadline" }), monospacedDigit()]}
            >
              {props.distanceLabel}
            </Text>
            <Text
              modifiers={[font({ textStyle: "subheadline" }), monospacedDigit()]}
            >
              {props.paceLabel}
            </Text>
          </VStack>
        </HStack>
      ),
      compactLeading: (
        <Image systemName="figure.walk" size={16} color={accent} />
      ),
      compactTrailing: elapsed([
        monospacedDigit(),
        frame({ width: 56, alignment: "trailing" }),
      ]),
      minimal: <Image systemName="figure.walk" size={16} color={accent} />,
      expandedLeading: (
        <VStack alignment="leading" spacing={2}>
          <Text
            modifiers={[
              font({ textStyle: "caption" }),
              foregroundStyle({ type: "hierarchical", style: "secondary" }),
            ]}
          >
            STEPS
          </Text>
          <Text
            modifiers={[
              font({ textStyle: "title3", weight: "bold" }),
              monospacedDigit(),
            ]}
          >
            {props.stepsLabel}
          </Text>
        </VStack>
      ),
      expandedCenter: (
        <HStack spacing={6}>
          <Image systemName="figure.walk" size={18} color={accent} />
          <Text modifiers={[font({ textStyle: "headline" })]}>{title}</Text>
        </HStack>
      ),
      expandedTrailing: (
        <VStack alignment="trailing" spacing={2}>
          <Text
            modifiers={[
              font({ textStyle: "caption" }),
              foregroundStyle({ type: "hierarchical", style: "secondary" }),
            ]}
          >
            TIME
          </Text>
          {elapsed([
            font({ textStyle: "title3", weight: "bold" }),
            monospacedDigit(),
          ])}
        </VStack>
      ),
      expandedBottom: (
        <HStack modifiers={[padding({ horizontal: 4 })]}>
          <Text
            modifiers={[font({ textStyle: "subheadline" }), monospacedDigit()]}
          >
            {props.distanceLabel}
          </Text>
          <Spacer />
          <Text
            modifiers={[font({ textStyle: "subheadline" }), monospacedDigit()]}
          >
            {props.paceLabel}
          </Text>
        </HStack>
      ),
    };
  },
);

export default WalkActivity;
