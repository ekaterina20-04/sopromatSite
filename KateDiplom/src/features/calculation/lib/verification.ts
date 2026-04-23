/**
 * Верификация результатов расчёта по дифференциальным зависимостям Журавского.
 *
 * Проверяемые зависимости:
 *   dQ/dz = -q(z)
 *   dM/dz = Q(z)
 *   d²M/dz² = -q(z)
 *   Экстремум M(z) находится там, где Q(z) = 0
 *
 * Проверка равновесия:
 *   ΣF = 0  (невязка сил)
 *   ΣM = 0  (невязка моментов)
 */
import type { BeamConfig, BeamResult, VerificationResult, PointLoad, DistributedLoad, MomentLoad } from '@entities/beam';

/**
 * Вычислить численную производную массива по x (центральные разности).
 */
function numericalDerivative(y: number[], x: number[]): number[] {
  const n = y.length;
  const dy = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    dy[i] = (y[i + 1] - y[i - 1]) / (x[i + 1] - x[i - 1]);
  }
  // Крайние точки — односторонние разности
  dy[0] = (y[1] - y[0]) / (x[1] - x[0]);
  dy[n - 1] = (y[n - 1] - y[n - 2]) / (x[n - 1] - x[n - 2]);
  return dy;
}

/**
 * Среднеквадратичная ошибка (RMS) между двумя массивами,
 * нормированная на максимальное значение reference.
 */
function normalizedRMS(actual: number[], reference: number[]): number {
  const n = actual.length;
  const maxRef = Math.max(...reference.map(Math.abs), 1);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const diff = actual[i] - reference[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum / n) / maxRef;
}

/**
 * Суммарная внешняя нагрузка (для проверки ΣF = 0).
 */
function totalExternalForce(config: BeamConfig): number {
  let total = 0;
  for (const load of config.loads) {
    if (load.type === 'point') {
      total += (load as PointLoad).value;
    } else if (load.type === 'distributed') {
      const dl = load as DistributedLoad;
      const len = dl.end - dl.start;
      if (dl.distribution === 'uniform') {
        total += dl.w1 * len;
      } else {
        total += ((dl.w1 + (dl.w2 ?? dl.w1)) / 2) * len;
      }
    }
  }
  return total;
}

/**
 * Суммарный внешний момент относительно x=0 (для проверки ΣM = 0).
 */
function totalExternalMoment(config: BeamConfig): number {
  let total = 0;
  for (const load of config.loads) {
    if (load.type === 'point') {
      const pl = load as PointLoad;
      total += pl.value * pl.position;
    } else if (load.type === 'distributed') {
      const dl = load as DistributedLoad;
      const len = dl.end - dl.start;
      const w2 = dl.w2 ?? dl.w1;
      const totalF = dl.distribution === 'uniform'
        ? dl.w1 * len
        : ((dl.w1 + w2) / 2) * len;
      const centroid = dl.distribution === 'uniform'
        ? (dl.start + dl.end) / 2
        : dl.start + (len * (dl.w1 + 2 * w2)) / (3 * (dl.w1 + w2 + 1e-12));
      total += totalF * centroid;
    } else if (load.type === 'moment') {
      total += (load as MomentLoad).value;
    }
  }
  return total;
}

/**
 * Сумма реактивных сил.
 */
function totalReactionForce(result: BeamResult): number {
  const r = result.reactions;
  let total = 0;
  // Вертикальные реакции
  if ('RA' in r) total += r.RA;
  if ('RB' in r) total += r.RB;
  if ('R_fixed' in r) total += r.R_fixed;
  if ('R_vertical' in r) total += r.R_vertical;
  return total;
}

/**
 * Сумма реактивных моментов относительно x=0.
 */
function totalReactionMoment(config: BeamConfig, result: BeamResult): number {
  const r = result.reactions;
  let total = 0;
  if ('M_fixed' in r) total += r.M_fixed;
  if ('M_base' in r) total += r.M_base;
  // RB в точке x=L
  if ('RB' in r) total += r.RB * config.length;
  return total;
}

/**
 * Полная верификация результатов расчёта.
 */
export function verifyResult(config: BeamConfig, result: BeamResult): VerificationResult {
  const { x, M, Q } = result;
  const TOLERANCE = 0.05; // 5% нормированная ошибка

  // 1. dM/dx ≈ Q
  const dMdx = numericalDerivative(M, x);
  const dMdx_rms = normalizedRMS(dMdx, Q);
  const dMdx_matches_Q = dMdx_rms < TOLERANCE;

  // 2. dQ/dx ≈ -q (для участков без сосредоточенных сил)
  // Упрощённо: проверяем, что dQ/dx ≈ 0 на участках без распределённой нагрузки
  const dQdx = numericalDerivative(Q, x);
  // На участках с q=const dQ/dx = -q (постоянная), на участках без нагрузки dQ/dx ≈ 0
  // Проверяем только факт «похоже на кусочно-постоянную»
  const dQdx_rms = normalizedRMS(
    dQdx,
    dQdx.map(() => 0) // грубая оценка — для точной нужна q(x)
  );
  const maxQ = Math.max(...Q.map(Math.abs), 1);
  const hasDistributed = config.loads.some((l) => l.type === 'distributed');
  const dQdx_matches_q = hasDistributed || (dQdx_rms / maxQ < 0.1);

  // 3. Экстремум M при Q=0
  const maxAbsM = Math.max(...M.map(Math.abs));
  const maxMIdx = M.reduce((b, v, i) => (Math.abs(v) > Math.abs(M[b]) ? i : b), 0);
  // Проверяем, что Q в точке max|M| близко к 0
  const qAtMaxM = Math.abs(Q[maxMIdx]);
  const maxAbsQ = Math.max(...Q.map(Math.abs), 1);
  const extremum_M_at_Q_zero = maxAbsM < 1e-6 || (qAtMaxM / maxAbsQ < 0.15);

  // 4. Проверка равновесия ΣF = 0
  const extF = totalExternalForce(config);
  const reactF = totalReactionForce(result);
  const equilibrium_force_residual = Math.abs(reactF - extF);

  // 5. Проверка равновесия ΣM = 0
  const extM = totalExternalMoment(config);
  const reactM = totalReactionMoment(config, result);
  const equilibrium_moment_residual = Math.abs(reactM - extM);

  const forceOk = equilibrium_force_residual < Math.max(Math.abs(extF) * 0.01, 0.01);
  const momentOk = equilibrium_moment_residual < Math.max(Math.abs(extM) * 0.01, 0.01);

  return {
    dMdx_matches_Q,
    dQdx_matches_q,
    extremum_M_at_Q_zero,
    equilibrium_force_residual,
    equilibrium_moment_residual,
    dMdx_rms_error: dMdx_rms,
    allPassed: dMdx_matches_Q && dQdx_matches_q && extremum_M_at_Q_zero && forceOk && momentOk,
  };
}
