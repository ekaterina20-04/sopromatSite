import type { BeamConfig, BeamResult } from '@entities/beam';

const BEAM_TYPE_LABELS: Record<string, string> = {
  cantilever: 'консольная',
  'simply-supported': 'свободно опёртая',
  overhang: 'с вылетом',
};

const MATERIAL_NAMES: Record<string, string> = {
  steel: 'Сталь',
  aluminum: 'Алюминий',
  wood: 'Дерево',
  custom: 'Кастомный',
};

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function findMaxMin(
  arr: number[],
  x: number[],
): { max: number; maxX: number; min: number; minX: number } {
  let maxIdx = 0;
  let minIdx = 0;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > arr[maxIdx]) maxIdx = i;
    if (arr[i] < arr[minIdx]) minIdx = i;
  }
  return { max: arr[maxIdx], maxX: x[maxIdx], min: arr[minIdx], minX: x[minIdx] };
}

export function buildBeamContext(config: BeamConfig, result: BeamResult | null): string {
  const lines: string[] = [];

  lines.push('=== Конфигурация балки ===');
  lines.push(`Тип: ${BEAM_TYPE_LABELS[config.type] ?? config.type}`);
  lines.push(`Длина: ${fmt(config.length)} м`);
  if (config.overhang) lines.push(`Вылет: ${fmt(config.overhang)} м`);

  const matName = MATERIAL_NAMES[config.material.name] ?? config.material.name;
  const E_GPa = (config.material.E / 1e9).toFixed(0);
  const I_cm4 = (config.material.I * 1e8).toFixed(2);
  lines.push(`Материал: ${matName}, E=${E_GPa} ГПа, I=${I_cm4} см⁴`);

  if (config.loads.length > 0) {
    lines.push('');
    lines.push('Нагрузки:');
    for (const load of config.loads) {
      if (load.type === 'point') {
        const dir = load.direction === 'vertical' ? 'вертикальная' : 'горизонтальная';
        lines.push(`  - Сосредоточенная сила: F=${load.value} Н @ x=${fmt(load.position)} м (${dir})`);
      } else if (load.type === 'distributed') {
        const dist = load.distribution === 'uniform' ? 'равномерная' : 'треугольная';
        lines.push(
          `  - Распределённая нагрузка: q=${load.w1} Н/м [${fmt(load.start)}–${fmt(load.end)} м], ${dist}`,
        );
      } else if (load.type === 'moment') {
        lines.push(`  - Сосредоточенный момент: M₀=${load.value} Н·м @ x=${fmt(load.position)} м`);
      }
    }
  } else {
    lines.push('Нагрузки: отсутствуют');
  }

  lines.push('');
  lines.push('=== Результаты расчёта ===');

  if (result) {
    const reactions = Object.entries(result.reactions)
      .map(([k, v]) => `${k}=${fmt(v)} Н`)
      .join(', ');
    lines.push(`Реакции: ${reactions}`);

    if (result.Q.length > 0) {
      const q = findMaxMin(result.Q, result.x);
      lines.push(
        `Эпюра Q: max=${fmt(q.max)} Н @ x=${fmt(q.maxX)} м, min=${fmt(q.min)} Н @ x=${fmt(q.minX)} м`,
      );
    }

    if (result.M.length > 0) {
      const m = findMaxMin(result.M, result.x);
      lines.push(
        `Эпюра M: max=${fmt(m.max)} Н·м @ x=${fmt(m.maxX)} м, min=${fmt(m.min)} Н·м @ x=${fmt(m.minX)} м`,
      );
    }

    const defl_mm = (result.maxDeflection * 1000).toFixed(3);
    lines.push(`Максимальный прогиб: ${defl_mm} мм @ x=${fmt(result.maxDeflectionPosition)} м`);

    if (result.verification) {
      lines.push(`Верификация: ${result.verification.allPassed ? 'пройдена' : 'не пройдена'}`);
    }
  } else {
    lines.push('Расчёт не выполнен или содержит ошибку.');
  }

  return lines.join('\n');
}
