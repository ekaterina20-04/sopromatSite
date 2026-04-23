/**
 * 15 контекстных подсказок по условиям сопромата.
 */
import type { BeamConfig, BeamResult } from '@entities/beam';

export interface TooltipCondition {
  id: string;
  label: string;
  description: string;
  check: (config: BeamConfig, result: BeamResult) => boolean;
}

export const TOOLTIP_CONDITIONS: TooltipCondition[] = [
  {
    id: 'symmetry-central',
    label: 'Симметрия при центральной нагрузке',
    description:
      'При центральной сосредоточенной силе на шарнирно-опёртой балке эпюра M(x) симметрична: M(x) = M(L−x). Реакции опор равны: R_A = R_B = F/2.',
    check: (config) => {
      if (config.type !== 'simply-supported') return false;
      const pts = config.loads.filter((l) => l.type === 'point');
      return pts.some((p) => 'position' in p && Math.abs((p as { position: number }).position - config.length / 2) < 0.15);
    },
  },
  {
    id: 'length-deflection',
    label: 'Прогиб и длина балки',
    description:
      'Прогиб пропорционален L³ (для сосредоточенной силы) или L⁴ (для равномерной нагрузки). Увеличение длины вдвое увеличивает прогиб в 8–16 раз!',
    check: (config) => config.length > 6,
  },
  {
    id: 'triangular-load',
    label: 'Эффект треугольной нагрузки',
    description:
      'Треугольная нагрузка (интенсивность растёт линейно) создаёт кубическую эпюру M(x). Максимальный момент смещён в сторону большей интенсивности.',
    check: (config) =>
      config.loads.some((l) => l.type === 'distributed' && (l as { distribution: string }).distribution === 'triangular'),
  },
  {
    id: 'cantilever-max',
    label: 'Максимальный момент в консоли',
    description:
      'В консольной балке максимальный изгибающий момент всегда возникает в заделке. Его значение равно F·a для сосредоточенной силы на расстоянии a от заделки.',
    check: (config) => config.type === 'cantilever',
  },
  {
    id: 'zero-moment-hinges',
    label: 'Нулевой момент на шарнирных опорах',
    description:
      'На шарнирных опорах изгибающий момент всегда равен нулю (по определению шарнира). Это фундаментальное граничное условие.',
    check: (config) => config.type === 'simply-supported',
  },
  {
    id: 'q-zero-max-m',
    label: 'Q=0 в точке максимального момента',
    description:
      'Так как dM/dx = Q(x), в точке экстремума M(x) поперечная сила Q(x) = 0. Ищите максимум M там, где Q меняет знак.',
    check: (_, result) => {
      const maxQ = Math.max(...result.Q.map(Math.abs));
      const signs = result.Q.map((q) => Math.sign(q));
      return signs.some((s, i) => i > 0 && s !== signs[i - 1] && maxQ > 100);
    },
  },
  {
    id: 'distributed-parabolic-m',
    label: 'Параболическая эпюра M от q=const',
    description:
      'Равномерная распределённая нагрузка создаёт параболическую эпюру M(x). Это связано с тем, что интеграл от постоянной q — это квадратная функция.',
    check: (config) =>
      config.loads.some(
        (l) => l.type === 'distributed' && (l as { distribution: string }).distribution === 'uniform'
      ),
  },
  {
    id: 'moment-jump',
    label: 'Скачок момента при сосредоточенном M₀',
    description:
      'Приложение сосредоточенного момента M₀ в точке x = a вызывает скачок на эпюре M(x) на величину M₀, но не влияет на эпюру Q(x).',
    check: (config) => config.loads.some((l) => l.type === 'moment'),
  },
  {
    id: 'overhang-sign-change',
    label: 'Смена знака момента на вылете',
    description:
      'В балке с вылетом эпюра момента меняет знак. На пролёте момент положительный (нижние волокна растянуты), на вылете — отрицательный (верхние волокна растянуты).',
    check: (config, result) => {
      if (config.type !== 'overhang') return false;
      const hasPos = result.M.some((m) => m > 0);
      const hasNeg = result.M.some((m) => m < 0);
      return hasPos && hasNeg;
    },
  },
  {
    id: 'ei-influence',
    label: 'Жёсткость EI и прогибы',
    description:
      'Прогиб обратно пропорционален жёсткости EI. Удвоение модуля упругости E или момента инерции I сечения уменьшает прогиб вдвое.',
    check: (config) => config.material.E < 1e10,
  },
  {
    id: 'superposition',
    label: 'Принцип суперпозиции',
    description:
      'При нескольких нагрузках эпюры складываются. Результирующая Q(x) = сумма вкладов всех нагрузок. Это справедливо только в зоне линейно-упругого поведения материала.',
    check: (config) => config.loads.length > 1,
  },
  {
    id: 'fixed-end-reaction',
    label: 'Реакции защемления',
    description:
      'Жёсткая заделка воспринимает не только вертикальную реакцию R, но и реактивный момент M_fixed. Его значение равно сумме моментов всех нагрузок относительно заделки.',
    check: (config) => config.type === 'cantilever',
  },
  {
    id: 'deflection-theta-zero',
    label: 'Максимальный прогиб и угол поворота',
    description:
      'Максимальный прогиб v_max достигается в точке, где угол поворота θ(x) = 0. Для симметричных нагрузок это всегда середина пролёта.',
    check: (_, result) => result.maxDeflection > 0,
  },
  {
    id: 'q-linear-uniform',
    label: 'Линейная Q(x) от равномерной нагрузки',
    description:
      'На участке с равномерной нагрузкой q = const поперечная сила Q(x) является линейной функцией. Из уравнения dQ/dx = −q следует Q(x) = Q₀ − q·x.',
    check: (config) =>
      config.loads.some(
        (l) =>
          l.type === 'distributed' &&
          (l as { distribution: string }).distribution === 'uniform' &&
          (l as { end: number; start: number }).end - (l as { start: number }).start > 0.5 * config.length
      ),
  },
  // ─── Адаптивные подсказки при типичных ошибках ────────────────────────
  {
    id: 'error-no-loads',
    label: 'Нагрузки не заданы',
    description:
      'Вы не добавили ни одной нагрузки. Без внешних сил эпюры Q(x) и M(x) равны нулю. Добавьте нагрузку на панели слева.',
    check: (config) => config.loads.length === 0,
  },
  {
    id: 'error-load-at-support',
    label: 'Нагрузка приложена прямо на опоре',
    description:
      'Сила приложена в точке опоры. В этом случае вся нагрузка передаётся непосредственно на опору и не создаёт изгибающего момента. Попробуйте сдвинуть нагрузку.',
    check: (config) => {
      if (config.type !== 'simply-supported') return false;
      return config.loads.some(
        (l) => l.type === 'point' && ('position' in l) && ((l as { position: number }).position < 0.01 || Math.abs((l as { position: number }).position - config.length) < 0.01)
      );
    },
  },
  {
    id: 'error-large-deflection',
    label: 'Очень большой прогиб!',
    description:
      'Максимальный прогиб превышает L/250 — конструкция работает за пределами допустимых деформаций. Увеличьте EI (больший профиль или более жёсткий материал) или уменьшите нагрузку.',
    check: (config, result) => {
      const limit = config.length / 250;
      return result.maxDeflection > limit;
    },
  },
  {
    id: 'error-verification-failed',
    label: 'Внимание: верификация не пройдена',
    description:
      'Проверка по зависимостям Журавского выявила отклонения. Это может быть вызвано сосредоточенными силами в граничных точках или особенностями численного метода. Проверьте расположение нагрузок.',
    check: (_, result) => {
      return result.verification !== undefined && !result.verification.allPassed;
    },
  },
  {
    id: 'hint-low-stiffness',
    label: 'Низкая жёсткость сечения',
    description:
      'Момент инерции I очень мал. При малом I деформации будут очень большими. Для реальных конструкций I обычно составляет от 10⁻⁶ до 10⁻³ м⁴.',
    check: (config) => config.material.I < 1e-7,
  },
  {
    id: 'hint-high-load',
    label: 'Высокая интенсивность нагрузки',
    description:
      'Одна из нагрузок превышает 100 кН. Убедитесь, что значение введено правильно. В учебных задачах типичные нагрузки: 1–50 кН (силы), 1–20 кН/м (распределённые).',
    check: (config) =>
      config.loads.some((l) => {
        if (l.type === 'point') return Math.abs((l as { value: number }).value) > 100000;
        if (l.type === 'distributed') return Math.abs((l as { w1: number }).w1) > 50000;
        return false;
      }),
  },
];
