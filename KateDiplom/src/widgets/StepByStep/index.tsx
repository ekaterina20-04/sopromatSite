import { useState } from 'react';
import type {
  BeamConfig,
  BeamResult,
  PointLoad,
  DistributedLoad,
  MomentLoad,
} from '@entities/beam';
import styles from './StepByStep.module.css';

interface Props {
  config: BeamConfig;
  result: BeamResult;
}

interface Step {
  title: string;
  body: string;
}

function fmt(val: number, unit: string): string {
  if (Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(2)} М${unit}`;
  if (Math.abs(val) >= 1e3) return `${(val / 1e3).toFixed(2)} к${unit}`;
  return `${val.toFixed(2)} ${unit}`;
}

function generateSteps(config: BeamConfig, result: BeamResult): Step[] {
  const steps: Step[] = [];
  const { type, length: L, loads } = config;

  // Шаг 1: Определение расчётной схемы
  const typeNames: Record<string, string> = {
    cantilever: 'Консольная балка (защемление слева)',
    'simply-supported': 'Шарнирно-опёртая балка',
    overhang: `Балка с вылетом (пролёт L=${L} м, вылет c=${config.overhang ?? 0} м)`,
  };
  steps.push({
    title: 'Расчётная схема',
    body: `Тип: ${typeNames[type]}.\nДлина: L = ${L} м.\nМатериал: E = ${fmt(config.material.E, 'Па')}, I = ${config.material.I.toExponential(3)} м⁴.\nЖёсткость: EI = ${fmt(config.material.E * config.material.I, 'Н·м²')}.`,
  });

  // Шаг 2: Внешние нагрузки
  const loadDescs: string[] = [];
  for (const load of loads) {
    if (load.type === 'point') {
      const pl = load as PointLoad;
      loadDescs.push(
        `Сосредоточенная сила F = ${fmt(pl.value, 'Н')} в x = ${pl.position.toFixed(2)} м (${pl.direction === 'vertical' ? 'вертикальная' : 'горизонтальная'})`
      );
    } else if (load.type === 'distributed') {
      const dl = load as DistributedLoad;
      if (dl.distribution === 'uniform') {
        loadDescs.push(
          `Равномерная нагрузка q = ${fmt(dl.w1, 'Н/м')} на участке [${dl.start.toFixed(1)}; ${dl.end.toFixed(1)}] м`
        );
      } else {
        loadDescs.push(
          `Треугольная нагрузка w₁ = ${fmt(dl.w1, 'Н/м')}, w₂ = ${fmt(dl.w2 ?? dl.w1, 'Н/м')} на [${dl.start.toFixed(1)}; ${dl.end.toFixed(1)}] м`
        );
      }
    } else if (load.type === 'moment') {
      const ml = load as MomentLoad;
      loadDescs.push(
        `Сосредоточенный момент M₀ = ${fmt(ml.value, 'Н·м')} в x = ${ml.position.toFixed(2)} м`
      );
    }
  }
  steps.push({
    title: 'Внешние нагрузки',
    body: loadDescs.length > 0 ? loadDescs.join('\n') : 'Нагрузки не заданы.',
  });

  // Шаг 3: Определение опорных реакций
  const r = result.reactions;
  const reactionLines: string[] = [];

  if (type === 'cantilever') {
    reactionLines.push(`Метод: уравнения равновесия для консоли (ΣF = 0, ΣM₀ = 0).`);
    if ('R_fixed' in r)
      reactionLines.push(`R_зад = ${fmt(r.R_fixed, 'Н')} (вертикальная реакция заделки)`);
    if ('M_fixed' in r)
      reactionLines.push(`M_зад = ${fmt(r.M_fixed, 'Н·м')} (реактивный момент заделки)`);
  } else if (type === 'simply-supported' || type === 'overhang') {
    reactionLines.push(`Метод: ΣM_B = 0 → R_A; ΣM_A = 0 → R_B.`);
    if ('RA' in r) reactionLines.push(`R_A = ${fmt(r.RA, 'Н')}`);
    if ('RB' in r) reactionLines.push(`R_B = ${fmt(r.RB, 'Н')}`);
    reactionLines.push(`Проверка: R_A + R_B = ${fmt((r.RA || 0) + (r.RB || 0), 'Н')}`);
  }
  steps.push({
    title: 'Опорные реакции',
    body: reactionLines.join('\n'),
  });

  // Шаг 4: Метод сечений (ROSE)
  const sectionLines: string[] = [];
  sectionLines.push(`Алгоритм ROSE (Resect – Omit – Substitute – Equilibrate):`);
  sectionLines.push(`1. Рассекаем балку в произвольном сечении x.`);
  sectionLines.push(`2. Отбрасываем правую часть.`);
  sectionLines.push(`3. Заменяем действие отброшенной части внутренними силами: Q(x), M(x).`);
  sectionLines.push(`4. Составляем уравнения равновесия для левой части.`);

  // Разбиение на участки
  const boundaries = new Set<number>([0]);
  for (const load of loads) {
    if (load.type === 'point') boundaries.add((load as PointLoad).position);
    else if (load.type === 'distributed') {
      boundaries.add((load as DistributedLoad).start);
      boundaries.add((load as DistributedLoad).end);
    } else if (load.type === 'moment') boundaries.add((load as MomentLoad).position);
  }
  const totalLen =
    type === 'overhang'
      ? L + (config.overhang ?? 0)
      : L;
  boundaries.add(totalLen);
  const sorted = [...boundaries].sort((a, b) => a - b);
  sectionLines.push(
    `\nРазбиение на ${sorted.length - 1} участок(ов): ${sorted.map((b) => b.toFixed(1)).join(' → ')} м.`
  );

  steps.push({
    title: 'Метод сечений (ROSE)',
    body: sectionLines.join('\n'),
  });

  // Шаг 5: Характерные значения
  const maxQIdx = result.Q.reduce((b, v, i) => (Math.abs(v) > Math.abs(result.Q[b]) ? i : b), 0);
  const maxMIdx = result.M.reduce((b, v, i) => (Math.abs(v) > Math.abs(result.M[b]) ? i : b), 0);

  steps.push({
    title: 'Характерные значения',
    body: [
      `Q_max = ${fmt(result.Q[maxQIdx], 'Н')} при x = ${result.x[maxQIdx].toFixed(2)} м`,
      `M_max = ${fmt(result.M[maxMIdx], 'Н·м')} при x = ${result.x[maxMIdx].toFixed(2)} м`,
      `v_max = ${(result.maxDeflection * 1000).toFixed(4)} мм при x = ${result.maxDeflectionPosition.toFixed(2)} м`,
      `\nПроверка: dM/dx = Q ⟹ максимум M при Q = 0.`,
    ].join('\n'),
  });

  // Шаг 6: Деформации
  steps.push({
    title: 'Прогибы и углы поворота',
    body: [
      `Дифференциальное уравнение: EI·v″(x) = M(x).`,
      `Двойное интегрирование методом трапеций (500 точек).`,
      type === 'cantilever'
        ? `Граничные условия: v(0) = 0, θ(0) = 0 (заделка).`
        : type === 'simply-supported'
          ? `Граничные условия: v(0) = 0, v(L) = 0 (шарниры).`
          : `Граничные условия: v(0) = 0, v(L) = 0 (опоры A и B).`,
      `Максимальный прогиб: ${(result.maxDeflection * 1000).toFixed(4)} мм.`,
    ].join('\n'),
  });

  return steps;
}

export function StepByStep({ config, result }: Props) {
  const [expanded, setExpanded] = useState(false);
  const steps = generateSteps(config, result);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Пошаговое решение (метод ROSE)</span>
        <button className={styles.toggleBtn} onClick={() => setExpanded(!expanded)} type="button">
          {expanded ? 'Свернуть' : 'Развернуть'}
        </button>
      </div>
      {expanded && (
        <div className={styles.steps}>
          {steps.map((step, i) => (
            <div key={i} className={styles.step}>
              <div className={styles.stepHeader}>
                <span className={styles.stepNum}>{i + 1}</span>
                <span className={styles.stepTitle}>{step.title}</span>
              </div>
              <div className={styles.stepBody}>
                {step.body.split('\n').map((line, j) => (
                  <div key={j}>{line}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
