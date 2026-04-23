import { Tooltip } from '@chakra-ui/react';
import type { BeamResult } from '@entities/beam';
import styles from './ReactionsPanel.module.css';

interface Props {
  result: BeamResult;
}

const REACTION_LABELS: Record<string, string> = {
  RA: 'Реакция в опоре A',
  RB: 'Реакция в опоре B',
  R_fixed: 'Реакция заделки',
  M_fixed: 'Реактивный момент заделки',
  R_horizontal: 'Горизонтальная реакция',
  R_vertical: 'Вертикальная реакция',
  M_base: 'Опорный момент',
};

function formatReaction(val: number, key: string): string {
  const isM = key.toLowerCase().includes('m');
  const unit = isM ? 'Н·м' : 'Н';
  if (Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(3)} МН${isM ? '·м' : ''}`;
  if (Math.abs(val) >= 1e3) return `${(val / 1e3).toFixed(2)} кН${isM ? '·м' : ''}`;
  return `${val.toFixed(2)} ${unit}`;
}

export function ReactionsPanel({ result }: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.title}>Опорные реакции</div>
      <div className={styles.grid}>
        {Object.entries(result.reactions).map(([key, val]) => (
          <Tooltip
            key={key}
            label={REACTION_LABELS[key] ?? key}
            hasArrow
            placement="top"
          >
            <div className={styles.item}>
              <span className={styles.key}>{key.replace('_', '<sub>')}:</span>
              <span className={styles.val}>{formatReaction(val, key)}</span>
            </div>
          </Tooltip>
        ))}
        <Tooltip
          label="Максимальный прогиб балки под действием нагрузок. Зависит от жёсткости EI и вида нагрузки."
          hasArrow
          placement="top"
        >
          <div className={styles.item}>
            <span className={styles.key}>v_max:</span>
            <span className={styles.val} style={{ color: 'var(--color-def)' }}>
              {(result.maxDeflection * 1000).toFixed(4)} мм @ x = {result.maxDeflectionPosition.toFixed(2)} м
            </span>
          </div>
        </Tooltip>
      </div>
    </div>
  );
}
