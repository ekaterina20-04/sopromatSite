/**
 * Расчёт шарнирно-опёртой балки.
 * Левая опора A (x=0), правая опора B (x=L).
 */
import type { BeamConfig, BeamResult, PointLoad, DistributedLoad, MomentLoad } from '@entities/beam';

const N_POINTS = 500;

function linspace(start: number, end: number, n: number): number[] {
  const arr: number[] = [];
  const step = (end - start) / (n - 1);
  for (let i = 0; i < n; i++) arr.push(start + i * step);
  return arr;
}

function trapz(y: number[], x: number[]): number[] {
  const result = new Array<number>(y.length).fill(0);
  for (let i = 1; i < y.length; i++) {
    result[i] = result[i - 1] + ((y[i - 1] + y[i]) / 2) * (x[i] - x[i - 1]);
  }
  return result;
}

export function calculateSimplySupported(config: BeamConfig): BeamResult {
  const { length: L, loads, material } = config;
  const EI = material.E * material.I;
  const xs = linspace(0, L, N_POINTS);

  let RA = 0; // реакция в A
  let RB = 0; // реакция в B
  let RA_point = 0; // вклад в RA только от point-нагрузок
  let RB_point = 0; // вклад в RB только от point-нагрузок

  // Сначала вычисляем реакции через принцип суперпозиции
  for (const load of loads) {
    if (load.type === 'point') {
      const pl = load as PointLoad;
      const F = pl.value;
      const a = pl.position;
      // Моментное уравнение относительно B: RA*L = F*(L-a)
      const ra = (F * (L - a)) / L;
      RA += ra;
      RB += F - ra;
      RA_point += ra;
      RB_point += F - ra;
    } else if (load.type === 'distributed') {
      const dl = load as DistributedLoad;
      const { start, end, w1, w2 = w1, distribution } = dl;
      const len = end - start;
      const totalF =
        distribution === 'uniform' ? w1 * len : ((w1 + w2) / 2) * len;
      const centroid =
        distribution === 'uniform'
          ? (start + end) / 2
          : start + len * (w1 + 2 * w2) / (3 * (w1 + w2 + 1e-12));
      // RA * L = totalF * (L - centroid)
      const ra = (totalF * (L - centroid)) / L;
      RA += ra;
      RB += totalF - ra;
    } else if (load.type === 'moment') {
      const ml = load as MomentLoad;
      const M0 = ml.value;
      // Момент: реакция RB = -M0/L, RA = M0/L
      const rb = -M0 / L;
      RB += rb;
      RA += M0 / L;
    }
  }

  // «Отображаемая» реакция A: вклад point-нагрузок инвертирован
  const RA_Q = RA - 2 * RA_point;

  // Строим Q(x) и M(x)
  const Q      = new Array<number>(N_POINTS).fill(0);
  const M      = new Array<number>(N_POINTS).fill(0);
  const M_phys = new Array<number>(N_POINTS).fill(0); // физический M для deformation

  for (let i = 0; i < N_POINTS; i++) {
    const x = xs[i];
    Q[i]      += RA_Q;      // инвертирован для point, не тронут для остальных
    M[i]      += RA_Q * x;
    M_phys[i] += RA * x;    // физическая реакция — для деформации
  }

  for (const load of loads) {
    if (load.type === 'point') {
      const pl = load as PointLoad;
      const F = pl.value;
      const a = pl.position;
      for (let i = 0; i < N_POINTS; i++) {
        const x = xs[i];
        if (x >= a) {
          Q[i]      += F;            // инвертирован для point
          M[i]      += F * (x - a); // инвертирован для point
          M_phys[i] -= F * (x - a); // физический знак — для деформации
        }
      }
    } else if (load.type === 'distributed') {
      const dl = load as DistributedLoad;
      const { start, end, w1, w2 = w1, distribution } = dl;
      const len = end - start;
      for (let i = 0; i < N_POINTS; i++) {
        const x = xs[i];
        if (x <= start) continue;
        const xEff = Math.min(x, end);
        const lenEff = xEff - start;
        if (distribution === 'uniform') {
          const dF = w1 * lenEff;
          const centroid = start + lenEff / 2;
          Q[i]      -= dF;
          M[i]      -= dF * (x - centroid);
          M_phys[i] -= dF * (x - centroid);
        } else {
          const t = lenEff / len;
          const wEnd = w1 + (w2 - w1) * t;
          const dF = (w1 + wEnd) / 2 * lenEff;
          const centroid = start + lenEff * (w1 + 2 * wEnd) / (3 * (w1 + wEnd + 1e-12));
          Q[i]      -= dF;
          M[i]      -= dF * (x - centroid);
          M_phys[i] -= dF * (x - centroid);
        }
      }
    } else if (load.type === 'moment') {
      const ml = load as MomentLoad;
      const M0 = ml.value;
      const a = ml.position;
      for (let i = 0; i < N_POINTS; i++) {
        const x = xs[i];
        if (x >= a) {
          M[i]      -= M0;
          M_phys[i] -= M0;
        }
      }
    }
  }

  // Интегрирование для θ(x) и v(x)
  // Граничные условия: v(0) = 0, v(L) = 0
  const MoverEI = M_phys.map((m) => m / EI);
  const thetaRaw = trapz(MoverEI, xs); // C1 = 0 (начальное условие)

  // Находим C1 из условия v(L) = 0
  // v(x) = ∫θ(x)dx = ∫(thetaRaw + C1)dx = vRaw + C1*x
  const vRaw = trapz(thetaRaw, xs);
  // v(L) = vRaw[L] + C1 * L = 0 => C1 = -vRaw[L] / L
  const C1 = -vRaw[N_POINTS - 1] / L;

  const theta = thetaRaw.map((t) => t + C1);
  const deformedY = vRaw.map((v, i) => v + C1 * xs[i]);

  const maxDeflection = Math.max(...deformedY.map(Math.abs));
  const maxDeflectionIdx = deformedY.reduce(
    (best, val, i) => (Math.abs(val) > Math.abs(deformedY[best]) ? i : best),
    0
  );

  return {
    x: xs,
    M,
    Q,
    theta,
    deformedY,
    reactions: { RA, RB },
    maxDeflection,
    maxDeflectionPosition: xs[maxDeflectionIdx],
  };
}
