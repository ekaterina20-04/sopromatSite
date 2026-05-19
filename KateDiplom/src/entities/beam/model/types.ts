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

/** Конфигурация балки */
export interface BeamConfig {
  type: BeamType;
  /** Длина пролёта L (м) */
  length: number;
  /** Длина вылета c (м) — для overhang */
  overhang?: number;
  loads: Load[];
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
}

/** Готовый сценарий */
export interface Scenario {
  id: string;
  title: string;
  description: string;
  image: string;
  config: BeamConfig;
}
