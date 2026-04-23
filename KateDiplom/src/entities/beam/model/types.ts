/** Тип балки/рамы */
export type BeamType = 'cantilever' | 'simply-supported' | 'overhang';

/** Сосредоточенная нагрузка */
export interface PointLoad {
  id: string;
  type: 'point';
  /** Сила (Н) */
  value: number;
  /** Координата от левой опоры (м) */
  position: number;
  direction: 'vertical' | 'horizontal';
}

/** Распределённая нагрузка */
export interface DistributedLoad {
  id: string;
  type: 'distributed';
  /** Начало участка (м) */
  start: number;
  /** Конец участка (м) */
  end: number;
  distribution: 'uniform' | 'triangular';
  /** Интенсивность на начале (Н/м) */
  w1: number;
  /** Интенсивность на конце (Н/м); для uniform равна w1 */
  w2?: number;
}

/** Сосредоточенный момент */
export interface MomentLoad {
  id: string;
  type: 'moment';
  /** Момент (Н·м) */
  value: number;
  /** Координата приложения (м) */
  position: number;
}

export type Load = PointLoad | DistributedLoad | MomentLoad;

/** Материал балки */
export interface Material {
  name: 'steel' | 'aluminum' | 'wood' | 'custom';
  /** Модуль упругости (Па) */
  E: number;
  /** Момент инерции сечения (м⁴) */
  I: number;
}

/** Конфигурация балки */
export interface BeamConfig {
  type: BeamType;
  /** Длина пролёта L (м) */
  length: number;
  /** Длина вылета c (м) — для overhang */
  overhang?: number;
  loads: Load[];
  material: Material;
}

/** Результат верификации по Журавскому */
export interface VerificationResult {
  /** dM/dx ≈ Q — проверка пройдена */
  dMdx_matches_Q: boolean;
  /** dQ/dx ≈ -q — проверка пройдена */
  dQdx_matches_q: boolean;
  /** Экстремум M при Q=0 */
  extremum_M_at_Q_zero: boolean;
  /** Невязка ΣF (должна быть ≈ 0) */
  equilibrium_force_residual: number;
  /** Невязка ΣM (должна быть ≈ 0) */
  equilibrium_moment_residual: number;
  /** Среднеквадратичная ошибка dM/dx vs Q */
  dMdx_rms_error: number;
  /** Все проверки пройдены */
  allPassed: boolean;
}

/** Результаты расчёта */
export interface BeamResult {
  /** Координаты (500 точек) */
  x: number[];
  /** Изгибающий момент M(x) */
  M: number[];
  /** Поперечная сила Q(x) */
  Q: number[];
  /** Продольная сила N(x) */
  N?: number[];
  /** Угол поворота θ(x) */
  theta: number[];
  /** Прогиб v(x) */
  deformedY: number[];
  /** Реакции опор */
  reactions: Record<string, number>;
  /** Максимальный прогиб */
  maxDeflection: number;
  /** Координата максимального прогиба */
  maxDeflectionPosition: number;
  /** Результат верификации по Журавскому */
  verification?: VerificationResult;
}

/** Готовый сценарий */
export interface Scenario {
  id: string;
  title: string;
  description: string;
  image: string;
  config: BeamConfig;
}
