export interface SirPoint {
  day: number;
  s: number;
  i: number;
  r: number;
}

export interface SirParams {
  r0: number; // 1.0 to 4.0
  infectiousDurationDays: number; // 3 to 21
  population?: number;
  initialInfected?: number;
  days?: number;
}

export function simulateIllustrativeSir({
  r0,
  infectiousDurationDays,
  population = 1_000_000,
  initialInfected = 10,
  days = 90,
}: SirParams): SirPoint[] {
  const gamma = 1 / Math.max(1, infectiousDurationDays);
  const beta = r0 * gamma;
  const N = population;

  let s = N - initialInfected;
  let i = initialInfected;
  let r = 0;

  const points: SirPoint[] = [{ day: 0, s, i, r }];
  const dt = 0.5; // Half-day RK4 step
  const stepsPerDay = Math.round(1 / dt);

  // Derivs function
  const derivatives = (curS: number, curI: number) => {
    const dS = (-beta * curS * curI) / N;
    const dI = (beta * curS * curI) / N - gamma * curI;
    const dR = gamma * curI;
    return { dS, dI, dR };
  };

  for (let d = 1; d <= days; d++) {
    for (let step = 0; step < stepsPerDay; step++) {
      // RK4 integration
      const k1 = derivatives(s, i);
      const k2 = derivatives(s + 0.5 * dt * k1.dS, i + 0.5 * dt * k1.dI);
      const k3 = derivatives(s + 0.5 * dt * k2.dS, i + 0.5 * dt * k2.dI);
      const k4 = derivatives(s + dt * k3.dS, i + dt * k3.dI);

      s += (dt / 6) * (k1.dS + 2 * k2.dS + 2 * k3.dS + k4.dS);
      i += (dt / 6) * (k1.dI + 2 * k2.dI + 2 * k3.dI + k4.dI);
      r += (dt / 6) * (k1.dR + 2 * k2.dR + 2 * k3.dR + k4.dR);

      // Clamp negatives
      s = Math.max(0, s);
      i = Math.max(0, i);
      r = Math.max(0, r);
    }

    points.push({
      day: d,
      s: Math.round(s),
      i: Math.round(i),
      r: Math.round(r),
    });
  }

  return points;
}
