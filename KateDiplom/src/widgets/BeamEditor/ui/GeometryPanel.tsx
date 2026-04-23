import { Tooltip } from '@chakra-ui/react';
import type { BeamConfig } from '@entities/beam';
import styles from './GeometryPanel.module.css';

interface Props {
  config: BeamConfig;
  onChange: (patch: Partial<BeamConfig>) => void;
}

export function GeometryPanel({ config, onChange }: Props) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.label}>Геометрия</span>
      </div>

      <div className={styles.grid}>
        <Tooltip label="Длина пролёта L (м). Прогиб пропорционален L⁴ для равномерной нагрузки." hasArrow>
          <label className={styles.fieldLabel}>
            Длина L, м
            <input
              className={styles.input}
              type="range"
              min={1}
              max={10}
              step={0.1}
              value={config.length}
              onChange={(e) => onChange({ length: Number(e.target.value) })}
            />
            <span className={styles.rangeVal}>{config.length.toFixed(1)} м</span>
          </label>
        </Tooltip>

        {config.type === 'overhang' && (
          <Tooltip label="Длина вылета c (м) — консольная часть за опорой B." hasArrow>
            <label className={styles.fieldLabel}>
              Вылет c, м
              <input
                className={styles.input}
                type="range"
                min={0}
                max={5}
                step={0.1}
                value={config.overhang ?? 0}
                onChange={(e) => onChange({ overhang: Number(e.target.value) })}
              />
              <span className={styles.rangeVal}>{(config.overhang ?? 0).toFixed(1)} м</span>
            </label>
          </Tooltip>
        )}


      </div>
    </div>
  );
}
