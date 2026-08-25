export const GOURCE_ACTION_STEP_SECONDS = 0.72;
export const GOURCE_MIN_BLOOM_SECONDS = 4.6;
export const GOURCE_REST_SECONDS = 1.2;
export const GOURCE_MAX_FRAME_DELTA = 0.05;

export interface GourceMotionFrame {
  readonly actionIndex: number;
  readonly cycleAge: number;
  readonly cycleIndex: number;
  readonly delta: number;
  readonly elapsed: number;
  readonly kinetic: boolean;
  readonly looped: boolean;
}

function motionDurations(actionCount: number) {
  const normalizedActionCount = Math.max(1, Math.floor(actionCount));
  const bloomDuration = Math.max(
    GOURCE_MIN_BLOOM_SECONDS,
    normalizedActionCount * GOURCE_ACTION_STEP_SECONDS,
  );
  return {
    bloomDuration,
    cycleDuration: bloomDuration + GOURCE_REST_SECONDS,
    normalizedActionCount,
  };
}

export function advanceGourceMotion(
  elapsed: number,
  delta: number,
  actionCount: number,
): GourceMotionFrame {
  const boundedElapsed = Math.max(0, elapsed);
  const boundedDelta = Math.min(
    GOURCE_MAX_FRAME_DELTA,
    Math.max(0, delta),
  );
  const nextElapsed = boundedElapsed + boundedDelta;
  const { bloomDuration, cycleDuration, normalizedActionCount } =
    motionDurations(actionCount);
  const previousCycleIndex = Math.floor(boundedElapsed / cycleDuration);
  const cycleIndex = Math.floor(nextElapsed / cycleDuration);
  const cycleAge = nextElapsed - cycleIndex * cycleDuration;
  const actionTime = Math.min(
    cycleAge,
    Math.max(0, bloomDuration - Number.EPSILON),
  );

  return {
    actionIndex: Math.min(
      normalizedActionCount - 1,
      Math.floor(actionTime / GOURCE_ACTION_STEP_SECONDS),
    ),
    cycleAge,
    cycleIndex,
    delta: boundedDelta,
    elapsed: nextElapsed,
    kinetic: cycleAge < bloomDuration,
    looped: cycleIndex !== previousCycleIndex,
  };
}
