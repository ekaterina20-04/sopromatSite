/**
 * Расчёт балки с вылетом.
 * Опора A (x=0), опора B (x=L), вылет [L, L+c].
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

export function calculateOverhang(config: BeamConfig): BeamResult {
  const { length: L, overhang: c = 0, loads, material } = config;
  const EI = material.E * material.I;
  const totalLength = L + c;
  const xs = linspace(0, totalLength, N_POINTS);

  // Реакции: ΣM_A = 0, ΣM_B = 0
  let RA = 0;
  let RB = 0;
  let RA_point = 0; // вклад в RA только от point-нагрузок
  let RB_point = 0; // вклад в RB только от point-нагрузок

  for (const load of loads) {
    if (load.type === 'point') {
      const pl = load as PointLoad;
      const F = pl.value;
      const a = pl.position; // от x=0
      // ΣM_B = 0: RA*L + F*(a - L) = 0 => RA = F*(L - a)/L
      // (если a > L, то RA отрицательный — вниз)
      const ra = (F * (L - a)) / L;
      RA += ra;
      RB += F - ra;
      RA_point += ra;
      RB_point += F - ra;
    } else if (load.type === 'distributed') {
      const dl = load as DistributedLoad;
      const { start, end, w1, w2 = w1, distribution } = dl;
      const len = end - start;
      const totalF = distribution === 'uniform' ? w1 * len : ((w1 + w2) / 2) * len;
      const centroid =
        distribution === 'uniform'
          ? (start + end) / 2
          : start + len * (w1 + 2 * w2) / (3 * (w1 + w2 + 1e-12));
      const ra = (totalF * (L - centroid)) / L;
      RA += ra;
      RB += totalF - ra;
    } else if (load.type === 'moment') {
      const ml = load as MomentLoad;
      const M0 = ml.value;
      RB += -M0 / L;
      RA += M0 / L;
    }
  }

  // «Отображаемые» реакции: вклад point-нагрузок инвертирован
  const RA_Q = RA - 2 * RA_point;
  const RB_Q = RB - 2 * RB_point;

  const Q      = new Array<number>(N_POINTS).fill(0);
  const Marr   = new Array<number>(N_POINTS).fill(0);
  const M_phys = new Array<number>(N_POINTS).fill(0); // физический M для deformation

  // Добавляем реакцию A
  for (let i = 0; i < N_POINTS; i++) {
    const x = xs[i];
    Q[i]      += RA_Q;
    Marr[i]   += RA_Q * x;
    M_phys[i] += RA * x;
  }

  // Добавляем реакцию B
  for (let i = 0; i < N_POINTS; i++) {
    const x = xs[i];
    if (x >= L) {
      Q[i]      += RB_Q;
      Marr[i]   += RB_Q * (x - L);
      M_phys[i] += RB * (x - L);
    }
  }

  // Добавляем нагрузки
  for (const load of loads) {
    if (load.type === 'point') {
      const pl = load as PointLoad;
      const F = pl.value;
      const a = pl.position;
      for (let i = 0; i < N_POINTS; i++) {
        const x = xs[i];
        if (x >= a) {
          Q[i]      += F;            // инвертирован для point
          Marr[i]   += F * (x - a); // инвертирован для point
          M_phys[i] -= F * (x - a); // физический знак — для деформации
        }
      }
    } else if (load.type === 'distributed') {
      const dl = load as DistributedLoad;
      const { start, end, w1, w2 = w1, distribution } = dl;
      for (let i = 0; i < N_POINTS; i++) {
        const x = xs[i];
        if (x <= start) continue;
        const xEff = Math.min(x, end);
        const lenEff = xEff - start;
        if (distribution === 'uniform') {
          const dF = w1 * lenEff;
          const centroid = start + lenEff / 2;
          Q[i]      -= dF;
          Marr[i]   -= dF * (x - centroid);
          M_phys[i] -= dF * (x - centroid);
        } else {
          const len = end - start;
          const t = lenEff / len;
          const wEnd = w1 + (w2 - w1) * t;
          const dF = (w1 + wEnd) / 2 * lenEff;
          const centroid = start + lenEff * (w1 + 2 * wEnd) / (3 * (w1 + wEnd + 1e-12));
          Q[i]      -= dF;
          Marr[i]   -= dF * (x - centroid);
          M_phys[i] -= dF * (x - centroid);
        }
      }
    } else if (load.type === 'moment') {
      const ml = load as MomentLoad;
      const M0 = ml.value;
      const a = ml.position;
      for (let i = 0; i < N_POINTS; i++) {
        if (xs[i] >= a) {
          Marr[i]   -= M0;
          M_phys[i] -= M0;
        }
      }
    }
  }

  // Интегрирование
  const MoverEI = M_phys.map((m) => m / EI);
  const thetaRaw = trapz(MoverEI, xs);
  const vRaw = trapz(thetaRaw, xs);

  // Условие: v(0) = 0 (уже), v(L) = 0
  // Ищем индекс, ближайший к L
  const idxL = xs.reduce((best, x, i) => (Math.abs(x - L) < Math.abs(xs[best] - L) ? i : best), 0);
  const C1 = -vRaw[idxL] / L;

  const theta = thetaRaw.map((t) => t + C1);
  const deformedY = vRaw.map((v, i) => v + C1 * xs[i]);

  const maxDeflection = Math.max(...deformedY.map(Math.abs));
  const maxDeflectionIdx = deformedY.reduce(
    (best, val, i) => (Math.abs(val) > Math.abs(deformedY[best]) ? i : best),
    0
  );

  return {
    x: xs,
    M: Marr,
    Q,
    theta,
    deformedY,
    reactions: { RA, RB },
    maxDeflection,
    maxDeflectionPosition: xs[maxDeflectionIdx],
  };
}
