// All choreography is expressed in seconds so it survives a frame-rate change.
export function operatingArcTiming(fps) {
  return {
    signalStart: fps / 3,
    signalSegment: (fps * 2) / 3,
    entranceDuration: fps * 0.6,
    entranceStagger: fps * 0.12,
    emphasisLead: fps * (8 / 30),
    emphasisPeak: fps * (4 / 30),
    emphasisSettle: fps * 0.6,
    exitStart: fps * 4.15,
    exitEnd: fps * 4.4,
  };
}
