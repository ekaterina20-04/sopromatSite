/**
 * Расчёт консольной балки.
 * Защемление — у левого конца (x=0), свободный конец — x=L.
 */
import type {
  BeamConfig,
  BeamResult,
  PointLoad,
  DistributedLoad,
  MomentLoad,
} from '@entities/beam';

const N_POINTS = 500;

function linspace(start: number, end: number, n: number): number[] {
  const arr: number[] = [];
  const step = (end - start) / (n - 1);
  for (let i = 0; i < n; i++) arr.push(start + i * step);
  return arr;
}

/** Трапециевидное интегрирование */
function trapz(y: number[], x: number[]): number[] {
  const result = new Array<number>(y.length).fill(0);
  for (let i = 1; i < y.length; i++) {
    result[i] = result[i - 1] + ((y[i - 1] + y[i]) / 2) * (x[i] - x[i - 1]);
  }
  return result;
}

/**
 * Расчёт консольной балки.
 * Координата x=0 — заделка, x=L — свободный конец.
 *
 * Правила знаков (по Еляшевичу, Раздел 6):
 *   Q > 0: сумма левых поперечных сил направлена вверх
 *   M > 0: нижнее волокно растянуто (балка «улыбается»)
 *
 * На консоли с нагрузкой ↓: M ≤ 0 везде (верхнее волокно растянуто).
 * Метод сечений от ПРАВОЙ части: нагрузка ↓ справа от сечения →
 *   создаёт CCW момент → M отрицательный.
 */
export function calculateCantilever(config: BeamConfig): BeamResult {
  const { length: L, loads, material } = config;
  const EI = material.E * material.I;
  const xs = linspace(0, L, N_POINTS);

  const Q      = new Array<number>(N_POINTS).fill(0);
  const M      = new Array<number>(N_POINTS).fill(0);
  const M_phys = new Array<number>(N_POINTS).fill(0); // физический M для deformation (оригинальный знак)

  let R_fixed   = 0; // физическая вертикальная реакция (для reactions + deformation)
  let M_fixed   = 0; // физический реакционный момент (для reactions)
  let R_fixed_Q = 0; // реакция для отображаемой Q (знак point-нагрузки инвертирован)

  for (const load of loads) {
    if (load.type === 'point') {
      const pl = load as PointLoad;
      const F = pl.value;
      const a = pl.position; // координата приложения силы

      // Физическая реакция (оригинальный знак — нужна для deformation и reactions)
      R_fixed   += F;
      M_fixed   += F * a;
      // Реакция для отображаемой Q: знак инвертирован (Q < 0 при F > 0)
      R_fixed_Q -= F;

      for (let i = 0; i < N_POINTS; i++) {
        const x = xs[i];
        // Q отображаемая: инвертированный знак → Q[i] += F (убирается реакцией R_fixed_Q = -F)
        if (x >= a) {
          Q[i] += F;
        }
        // M отображаемая: инвертированный знак → M > 0 при F > 0
        if (x <= a) {
          M[i]      += F * (a - x);
          M_phys[i] -= F * (a - x); // физический M (оригинальный знак) — для deformation
        }
      }
    } else if (load.type === 'distributed') {
      const dl = load as DistributedLoad;
      const { start, end, w1, w2 = w1, distribution } = dl;

      for (let i = 0; i < N_POINTS; i++) {
        const x = xs[i];

        if (distribution === 'uniform') {
          const w = w1;
          const totalF = w * (end - start);
          // Q — метод ЛЕВОЙ части: вычитаем нагрузку, уже прошедшую левее x
          // M — метод ПРАВОЙ части: нагрузка правее x создаёт CCW момент → M отрицательный
          if (x <= start) {
            // Весь груз правее x: Q не трогаем (R_fixed покроет), M — правая часть
            const center = (start + end) / 2;
            M[i]      -= totalF * (center - x);
            M_phys[i] -= totalF * (center - x);
          } else if (x >= end) {
            // Весь груз левее x: вычитаем из Q, M = 0
            Q[i] -= totalF;
          } else {
            // x внутри [start, end]:
            // Q: нагрузка слева от x = w*(x-start)
            Q[i] -= w * (x - start);
            // M: нагрузка правее x от x до end
            const partF = w * (end - x);
            const center = (x + end) / 2;
            M[i]      -= partF * (center - x);
            M_phys[i] -= partF * (center - x);
          }
        } else {
          // Треугольная нагрузка: w(t) = w1 + (w2 - w1)*(t - start)/(end - start)
          const len = end - start;
          if (len <= 0) continue;

          const totalF = ((w1 + w2) / 2) * len;

          if (x <= start) {
            // Весь груз правее x: Q не трогаем, M — правая часть
            const centroid = start + (len * (w1 + 2 * w2)) / (3 * (w1 + w2 + 1e-12));
            M[i]      -= totalF * (centroid - x);
            M_phys[i] -= totalF * (centroid - x);
          } else if (x >= end) {
            // Весь груз левее x: вычитаем весь из Q, M = 0
            Q[i] -= totalF;
          } else {
            // x внутри [start, end]
            const t = (x - start) / len;
            const wx = w1 + (w2 - w1) * t; // интенсивность в точке x
            // Q: нагрузка СЛЕВА от x (от start до x, трапеция w1→wx)
            const leftF = ((w1 + wx) / 2) * (x - start);
            Q[i] -= leftF;
            // M: нагрузка СПРАВА от x (от x до end, трапеция wx→w2)
            const lenRight = end - x;
            const partF = ((wx + w2) / 2) * lenRight;
            const centroid = x + (lenRight * (wx + 2 * w2)) / (3 * (wx + w2 + 1e-12));
            M[i]      -= partF * (centroid - x);
            M_phys[i] -= partF * (centroid - x);
          }
        }
      }

      // Обновляем реакции
      const totalLoad =
        distribution === 'uniform' ? w1 * (end - start) : ((w1 + w2) / 2) * (end - start);
      const len = end - start;
      const centroid =
        distribution === 'uniform'
          ? (start + end) / 2
          : start + (len * (w1 + 2 * (w2 ?? w1))) / (3 * (w1 + (w2 ?? w1) + 1e-12));
      R_fixed   += totalLoad;
      M_fixed   += totalLoad * centroid;
      R_fixed_Q += totalLoad; // знак не меняем (distributed не инвертируется)
    } else if (load.type === 'moment') {
      const ml = load as MomentLoad;
      const M0 = ml.value;
      const a = ml.position;

      M_fixed += M0;

      for (let i = 0; i < N_POINTS; i++) {
        const x = xs[i];
        if (x <= a) {
          M[i]      += M0; // знак инвертирован, согласованно с point-нагрузкой
          M_phys[i] -= M0; // физический знак для деформаций — не трогаем
        }
      }
    }
  }

  // Добавляем вклад реакции заделки в отображаемую Q
  // R_fixed_Q = -F_point + totalDist (инвертирован для point, не тронут для distributed)
  for (let i = 0; i < N_POINTS; i++) {
    Q[i] += R_fixed_Q;
  }

  // Интегрирование для θ(x) и v(x)
  // EI * d²v/dx² = M(x)
  // EI * θ(x) = EI * dv/dx = ∫M(x)dx + C1
  // EI * v(x) = ∫∫M(x)dx + C1*x + C2
  // Граничные условия: v(0) = 0, θ(0) = 0 => C1 = 0, C2 = 0

  // Деформация считается из физического M (оригинальный знак),
  // чтобы прогиб не менял направление при инвертированном M_display
  const MoverEI = M_phys.map((m) => m / EI);
  const thetaEI = trapz(MoverEI, xs);
  // theta(0) = 0 — уже выполнено (начинаем с 0)
  const theta = thetaEI; // рад

  const deformedY = trapz(thetaEI, xs);
  // v(0) = 0 — уже выполнено

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
    reactions: { R_fixed, M_fixed },
    maxDeflection,
    maxDeflectionPosition: xs[maxDeflectionIdx],
  };
}
