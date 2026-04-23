import { Tooltip } from '@chakra-ui/react';
import type { BeamType } from '@entities/beam';
import { BEAM_TYPE_LABELS } from '@shared/config';
import styles from './BeamTypeSelector.module.css';
import { useNavigate } from 'react-router-dom';

interface Props {
  value: BeamType;
  onChange: (type: BeamType) => void;
}

const BEAM_TYPES: BeamType[] = ['cantilever', 'simply-supported', 'overhang'];

const BEAM_TOOLTIPS: Record<BeamType, string> = {
  cantilever: 'Балка, защемлённая с одного конца. Максимальный момент и реакция — в заделке.',
  'simply-supported': 'Балка на двух шарнирных опорах. Момент в опорах равен нулю.',
  overhang: 'Балка с консольным вылетом за опору. Момент меняет знак на пролёте и вылете.',
};

const BEAM_ICONS: Record<BeamType, string> = {
  cantilever: '⊢',
  'simply-supported': '△—△',
  overhang: '△—△—',
};

export function BeamTypeSelector({ value, onChange }: Props) {
  const navigate = useNavigate();

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.label}>Тип конструкции</span>
        <button
          className={styles.moreBtn}
          onClick={() => navigate('/theory#schemes')}
          type="button"
        >
          Подробнее →
        </button>
      </div>
      <div className={styles.grid}>
        {BEAM_TYPES.map((t) => (
          <Tooltip key={t} label={BEAM_TOOLTIPS[t]} hasArrow placement="top" openDelay={300}>
            <button
              className={`${styles.btn} ${value === t ? styles.active : ''}`}
              onClick={() => onChange(t)}
              type="button"
            >
              <span className={styles.icon}>{BEAM_ICONS[t]}</span>
              <span className={styles.name}>{BEAM_TYPE_LABELS[t]}</span>
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
