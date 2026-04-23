import { Tooltip } from '@chakra-ui/react';
import type { VerificationResult } from '@entities/beam';
import styles from './VerificationPanel.module.css';

interface Props {
  verification: VerificationResult;
}

function Check({ ok, label, tooltip, value }: { ok: boolean; label: string; tooltip: string; value?: string }) {
  return (
    <Tooltip label={tooltip} hasArrow placement="top">
      <div className={styles.check}>
        <span className={styles.icon}>{ok ? '\u2705' : '\u26a0\ufe0f'}</span>
        <span className={styles.checkLabel}>{label}</span>
        {value && <span className={styles.checkVal}>{value}</span>}
      </div>
    </Tooltip>
  );
}

export function VerificationPanel({ verification }: Props) {
  const v = verification;

  return (
    <div className={styles.panel}>
      <div className={styles.title}>
        Верификация (Журавский)
        <span className={v.allPassed ? styles.badgeOk : styles.badgeWarn}>
          {v.allPassed ? 'OK' : 'Внимание'}
        </span>
      </div>
      <div className={styles.grid}>
        <Check
          ok={v.dMdx_matches_Q}
          label="dM/dx = Q"
          tooltip={`Проверка дифференциальной зависимости: производная изгибающего момента равна поперечной силе. RMS-ошибка: ${(v.dMdx_rms_error * 100).toFixed(1)}%`}
          value={`${(v.dMdx_rms_error * 100).toFixed(1)}%`}
        />
        <Check
          ok={v.dQdx_matches_q}
          label="dQ/dx = -q"
          tooltip="Проверка: производная поперечной силы равна отрицательной интенсивности нагрузки."
        />
        <Check
          ok={v.extremum_M_at_Q_zero}
          label="max|M| при Q=0"
          tooltip="Экстремум изгибающего момента достигается в сечении, где поперечная сила обращается в ноль."
        />
        <Check
          ok={v.equilibrium_force_residual < 1}
          label={'\u03a3F = 0'}
          tooltip={`Проверка равновесия: сумма всех сил (включая реакции) должна быть равна нулю. Невязка: ${v.equilibrium_force_residual.toFixed(4)} Н`}
          value={`\u0394 = ${v.equilibrium_force_residual.toFixed(2)} \u041d`}
        />
        <Check
          ok={v.equilibrium_moment_residual < 1}
          label={'\u03a3M = 0'}
          tooltip={`Проверка равновесия моментов: сумма моментов всех сил относительно начала координат равна нулю. Невязка: ${v.equilibrium_moment_residual.toFixed(4)} Н\u00b7м`}
          value={`\u0394 = ${v.equilibrium_moment_residual.toFixed(2)} \u041d\u00b7\u043c`}
        />
      </div>
    </div>
  );
}
