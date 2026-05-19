import { useState, useCallback } from 'react';
import type { BeamConfig, PointLoad, DistributedLoad } from '@entities/beam';
import { calculateBeam } from '@features/calculation';
import styles from './Trainer.module.css';

/* ─── Генератор случайных задач ─────────────────────────────────────────── */

function rand(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

interface TrainerTask {
  config: BeamConfig;
  description: string;
  expectedRA: number;
  expectedRB: number;
  expectedMmax: number;
  expectedQmax: number;
  hint: string;
}

function generateTask(): TrainerTask {
  const types = ['simply-supported', 'cantilever'] as const;
  const type = types[Math.floor(Math.random() * types.length)];
  const L = rand(3, 8);

  // Генерируем 1–2 нагрузки
  const numLoads = Math.random() > 0.5 ? 2 : 1;
  const loads: (PointLoad | DistributedLoad)[] = [];
  let description = '';

  for (let k = 0; k < numLoads; k++) {
    if (Math.random() > 0.4) {
      // Сосредоточенная сила
      const F = Math.round(rand(1, 20)) * 1000; // 1..20 кН
      const pos = rand(0.5, L - 0.5);
      loads.push({
        id: uid(),
        type: 'point',
        value: F,
        position: pos,
        direction: 'vertical',
      });
      description += `Сосредоточенная сила F = ${(F / 1000).toFixed(0)} кН в x = ${pos.toFixed(1)} м. `;
    } else {
      // Равномерная нагрузка
      const q = Math.round(rand(2, 15)) * 1000; // 2..15 кН/м
      const s = rand(0, L * 0.3);
      const e = rand(L * 0.6, L);
      loads.push({
        id: uid(),
        type: 'distributed',
        start: s,
        end: e,
        distribution: 'uniform',
        w1: q,
        w2: q,
      });
      description += `Равномерная нагрузка q = ${(q / 1000).toFixed(0)} кН/м на [${s.toFixed(1)}; ${e.toFixed(1)}] м. `;
    }
  }

  const config: BeamConfig = {
    type,
    length: L,
    loads,
  };

  const result = calculateBeam(config);
  const r = result.reactions;

  const maxMIdx = result.M.reduce((b, v, i) => (Math.abs(v) > Math.abs(result.M[b]) ? i : b), 0);
  const maxQIdx = result.Q.reduce((b, v, i) => (Math.abs(v) > Math.abs(result.Q[b]) ? i : b), 0);

  let expectedRA = 0;
  let expectedRB = 0;
  if (type === 'simply-supported') {
    expectedRA = r.RA ?? 0;
    expectedRB = r.RB ?? 0;
  } else {
    expectedRA = r.R_fixed ?? 0;
    expectedRB = r.M_fixed ?? 0;
  }

  const hint =
    type === 'simply-supported'
      ? `Используйте уравнения моментов: ΣM_B = 0 → R_A = Σ[F·(L−a)] / L. Затем ΣF = 0 → R_B = ΣF − R_A.`
      : `Для консоли: R_зад = ΣF (сумма всех вертикальных сил). M_зад = Σ(F·a) (сумма моментов сил относительно заделки).`;

  return {
    config,
    description: `${type === 'simply-supported' ? 'Шарнирно-опёртая балка' : 'Консольная балка'} длиной L = ${L} м. ${description}`,
    expectedRA,
    expectedRB,
    expectedMmax: result.M[maxMIdx],
    expectedQmax: result.Q[maxQIdx],
    hint,
  };
}

/* ─── Компонент страницы ────────────────────────────────────────────────── */

interface Answers {
  ra: string;
  rb: string;
  mmax: string;
  qmax: string;
}

interface CheckResult {
  ra: boolean;
  rb: boolean;
  mmax: boolean;
  qmax: boolean;
  allCorrect: boolean;
}

function checkAnswers(answers: Answers, task: TrainerTask): CheckResult {
  const tolerance = 0.05; // 5%
  const check = (ans: string, expected: number) => {
    const val = parseFloat(ans);
    if (isNaN(val)) return false;
    if (Math.abs(expected) < 1) return Math.abs(val - expected) < 1;
    return Math.abs((val - expected) / expected) < tolerance;
  };

  const ra = check(answers.ra, task.expectedRA);
  const rb = check(answers.rb, task.expectedRB);
  const mmax = check(answers.mmax, task.expectedMmax);
  const qmax = check(answers.qmax, task.expectedQmax);

  return { ra, rb, mmax, qmax, allCorrect: ra && rb && mmax && qmax };
}

function fmt(val: number, unit: string): string {
  if (Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(2)} М${unit}`;
  if (Math.abs(val) >= 1e3) return `${(val / 1e3).toFixed(2)} к${unit}`;
  return `${val.toFixed(2)} ${unit}`;
}

export default function TrainerPage() {
  const [task, setTask] = useState<TrainerTask>(() => generateTask());
  const [answers, setAnswers] = useState<Answers>({ ra: '', rb: '', mmax: '', qmax: '' });
  const [result, setResult] = useState<CheckResult | null>(null);
  const [showHint, setShowHint] = useState(false);

  const newTask = useCallback(() => {
    setTask(generateTask());
    setAnswers({ ra: '', rb: '', mmax: '', qmax: '' });
    setResult(null);
    setShowHint(false);
  }, []);

  const handleCheck = () => {
    setResult(checkAnswers(answers, task));
  };

  const isSimply = task.config.type === 'simply-supported';

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Тренажёр</h1>
      <p className={styles.subtitle}>
        Решайте случайные задачи на определение реакций опор и характерных значений эпюр. Точность
        проверки: 5%.
      </p>

      <div className={styles.taskCard}>
        <h2 className={styles.taskTitle}>Задание</h2>
        <p className={styles.taskDesc}>{task.description}</p>
        <div className={styles.taskParams}>
          <span className={styles.param}>L = {task.config.length} м</span>
        </div>

        <p className={styles.taskDesc}>Определите:</p>

        <div className={styles.inputGrid}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>{isSimply ? 'R_A (Н)' : 'R_зад (Н)'}</label>
            <input
              className={
                result ? (result.ra ? styles.inputCorrect : styles.inputWrong) : styles.input
              }
              type="number"
              value={answers.ra}
              onChange={(e) => setAnswers({ ...answers, ra: e.target.value })}
              placeholder="Например: 5000"
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>{isSimply ? 'R_B (Н)' : 'M_зад (Н·м)'}</label>
            <input
              className={
                result ? (result.rb ? styles.inputCorrect : styles.inputWrong) : styles.input
              }
              type="number"
              value={answers.rb}
              onChange={(e) => setAnswers({ ...answers, rb: e.target.value })}
              placeholder="Например: 3000"
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>M_max (Н·м)</label>
            <input
              className={
                result ? (result.mmax ? styles.inputCorrect : styles.inputWrong) : styles.input
              }
              type="number"
              value={answers.mmax}
              onChange={(e) => setAnswers({ ...answers, mmax: e.target.value })}
              placeholder="Например: 12000"
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Q_max (Н)</label>
            <input
              className={
                result ? (result.qmax ? styles.inputCorrect : styles.inputWrong) : styles.input
              }
              type="number"
              value={answers.qmax}
              onChange={(e) => setAnswers({ ...answers, qmax: e.target.value })}
              placeholder="Например: 8000"
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.checkBtn} onClick={handleCheck} type="button">
            Проверить
          </button>
          <button className={styles.newBtn} onClick={newTask} type="button">
            Новая задача
          </button>
          <button className={styles.newBtn} onClick={() => setShowHint(!showHint)} type="button">
            {showHint ? 'Скрыть подсказку' : 'Подсказка'}
          </button>
        </div>

        {showHint && (
          <div className={styles.hint}>
            <div className={styles.hintTitle}>Подсказка</div>
            <div className={styles.hintText}>{task.hint}</div>
          </div>
        )}
      </div>

      {result && (
        <div className={styles.resultCard}>
          <div className={result.allCorrect ? styles.resultOk : styles.resultFail}>
            {result.allCorrect ? 'Все ответы верны!' : 'Есть ошибки — проверьте решение'}
          </div>
          <div className={styles.resultGrid}>
            <div className={styles.resultRow}>
              <span className={styles.resultIcon}>{result.ra ? '\u2705' : '\u274c'}</span>
              <span className={styles.resultLabel}>{isSimply ? 'R_A' : 'R_зад'}:</span>
              <span className={styles.resultVal}>
                ваш {answers.ra || '—'} | верный {fmt(task.expectedRA, isSimply ? 'Н' : 'Н')}
              </span>
            </div>
            <div className={styles.resultRow}>
              <span className={styles.resultIcon}>{result.rb ? '\u2705' : '\u274c'}</span>
              <span className={styles.resultLabel}>{isSimply ? 'R_B' : 'M_зад'}:</span>
              <span className={styles.resultVal}>
                ваш {answers.rb || '—'} | верный {fmt(task.expectedRB, isSimply ? 'Н' : 'Н·м')}
              </span>
            </div>
            <div className={styles.resultRow}>
              <span className={styles.resultIcon}>{result.mmax ? '\u2705' : '\u274c'}</span>
              <span className={styles.resultLabel}>M_max:</span>
              <span className={styles.resultVal}>
                ваш {answers.mmax || '—'} | верный {fmt(task.expectedMmax, 'Н·м')}
              </span>
            </div>
            <div className={styles.resultRow}>
              <span className={styles.resultIcon}>{result.qmax ? '\u2705' : '\u274c'}</span>
              <span className={styles.resultLabel}>Q_max:</span>
              <span className={styles.resultVal}>
                ваш {answers.qmax || '—'} | верный {fmt(task.expectedQmax, 'Н')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
