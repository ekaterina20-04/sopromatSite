import { useState } from 'react';
import { Tooltip } from '@chakra-ui/react';
import type { Material } from '@entities/beam';
import { MATERIALS, MATERIAL_LABELS } from '@shared/config';
import styles from './MaterialSelector.module.css';
import { useNavigate } from 'react-router-dom';

interface Props {
  value: Material;
  onChange: (material: Material) => void;
}

const MATERIAL_TOOLTIPS: Record<string, string> = {
  steel: 'Сталь: E = 2.1×10¹¹ Па. Высокая жёсткость, минимальные прогибы.',
  aluminum: 'Алюминий: E = 0.7×10¹¹ Па. В 3 раза мягче стали, прогибы больше.',
  wood: 'Дерево: E = 0.1×10¹¹ Па. Самый податливый материал, значительные прогибы.',
  custom: 'Пользовательский материал: укажите свой модуль упругости E.',
};

export function MaterialSelector({ value, onChange }: Props) {
  const [customE, setCustomE] = useState(value.E);
  const navigate = useNavigate();

  function handleSelect(name: string) {
    if (name === 'custom') {
      onChange({ name: 'custom', E: customE, I: value.I });
    } else {
      onChange({ ...MATERIALS[name], I: value.I });
    }
  }

  function handleCustomE(raw: string) {
    const E = parseFloat(raw);
    if (!isNaN(E) && E >= 1e9 && E <= 1e12) {
      setCustomE(E);
      onChange({ name: 'custom', E, I: value.I });
    }
  }

  function handleI(raw: string) {
    const I = parseFloat(raw);
    if (!isNaN(I) && I > 0) {
      onChange({ ...value, I });
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.label}>Материал и сечение</span>
        <button className={styles.moreBtn} onClick={() => navigate('/theory#materials')} type="button">
          Подробнее →
        </button>
      </div>

      <div className={styles.tabs}>
        {['steel', 'aluminum', 'wood', 'custom'].map((name) => (
          <Tooltip key={name} label={MATERIAL_TOOLTIPS[name]} hasArrow placement="top" openDelay={300}>
            <button
              className={`${styles.tab} ${value.name === name ? styles.active : ''}`}
              onClick={() => handleSelect(name)}
              type="button"
            >
              {MATERIAL_LABELS[name]}
            </button>
          </Tooltip>
        ))}
      </div>

      {value.name === 'custom' && (
        <div className={styles.customRow}>
          <label className={styles.fieldLabel}>
            E (Па)
            <input
              className={styles.input}
              type="number"
              defaultValue={customE}
              min={1e9}
              max={1e12}
              step={1e9}
              onBlur={(e) => handleCustomE(e.target.value)}
            />
          </label>
        </div>
      )}

      <div className={styles.infoRow}>
        <span className={styles.infoLabel}>E = {(value.E / 1e9).toFixed(0)} ГПа</span>
        <Tooltip label="Момент инерции сечения I (м⁴). Влияет на жёсткость EI и величину прогибов." hasArrow>
          <label className={styles.fieldLabel}>
            I (м⁴)
            <input
              className={styles.input}
              type="number"
              defaultValue={value.I}
              min={1e-9}
              step={1e-7}
              onBlur={(e) => handleI(e.target.value)}
            />
          </label>
        </Tooltip>
      </div>
    </div>
  );
}
