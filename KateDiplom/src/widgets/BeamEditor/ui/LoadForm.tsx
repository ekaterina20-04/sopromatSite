import { useState, useEffect } from 'react';
import { Tooltip } from '@chakra-ui/react';
import type { Load, PointLoad, DistributedLoad, MomentLoad } from '@entities/beam';
import styles from './LoadForm.module.css';
import { useNavigate } from 'react-router-dom';

export interface LoadFormProps {
  loads: Load[];
  maxPosition: number;
  onAdd: (load: Load) => void;
  onRemove: (id: string) => void;
  onUpdateLoad: (id: string, load: Load) => void;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const LOAD_TYPE_LABELS = {
  point: 'Сила',
  distributed: 'Распределённая',
  moment: 'Момент',
};

const LOAD_TOOLTIPS = {
  point: 'Сосредоточенная сила F (Н). Вызывает скачок на эпюре Q и излом на эпюре M.',
  distributed: 'Равномерная или треугольная нагрузка q (Н/м). На участке нагрузки Q меняется линейно, M — параболически.',
  moment: 'Сосредоточенный момент M₀ (Н·м). Вызывает скачок на эпюре M, но не влияет на Q.',
};

export function LoadForm({ loads, maxPosition, onAdd, onRemove, onUpdateLoad }: LoadFormProps) {
  const [selectedLoadId, setSelectedLoadId] = useState<string | null>(() => loads[0]?.id ?? null);
  const [loadType, setLoadType] = useState<Load['type']>('point');
  const [value, setValue] = useState(1000);
  const [position, setPosition] = useState(maxPosition / 2);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(maxPosition);
  const [distribution, setDistribution] = useState<'uniform' | 'triangular'>('uniform');
  const [w1, setW1] = useState(500);
  const [w2, setW2] = useState(0);
  const navigate = useNavigate();

  const selectedLoad = loads.find((l) => l.id === selectedLoadId) ?? null;
  const isEditMode = selectedLoad !== null;
  const effectiveLoadType: Load['type'] = isEditMode && selectedLoad ? selectedLoad.type : loadType;

  useEffect(() => {
    if (loads.length === 0) {
      setSelectedLoadId(null);
      return;
    }
    // Если выбранная нагрузка была удалена — вернуться в режим новой нагрузки
    if (selectedLoadId !== null && !loads.some((l) => l.id === selectedLoadId)) {
      setSelectedLoadId(null);
    }
  }, [loads, selectedLoadId]);

  function handleAdd() {
    let load: Load;
    if (isEditMode && selectedLoad) {
      load = { ...selectedLoad, id: uid() };
    } else if (loadType === 'point') {
      load = {
        id: uid(),
        type: 'point',
        value,
        position: Math.min(position, maxPosition),
        direction: 'vertical',
      } as PointLoad;
    } else if (loadType === 'distributed') {
      load = {
        id: uid(),
        type: 'distributed',
        start: Math.min(start, end),
        end: Math.max(start, end),
        distribution,
        w1,
        w2: distribution === 'triangular' ? w2 : w1,
      } as DistributedLoad;
    } else {
      load = {
        id: uid(),
        type: 'moment',
        value,
        position: Math.min(position, maxPosition),
      } as MomentLoad;
    }
    onAdd(load);
    setSelectedLoadId(null);
  }

  function theoryLink() {
    if (effectiveLoadType === 'point') navigate('/theory#point-load');
    else if (effectiveLoadType === 'distributed') navigate('/theory#distributed-load');
    else navigate('/theory#moment-load');
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.label}>Нагрузки</span>
        <button className={styles.moreBtn} onClick={theoryLink} type="button">
          Подробнее →
        </button>
      </div>

      {/* Тип нагрузки (в режиме редактирования показываем только текущий тип) */}
      <div className={styles.typeTabs}>
        {(['point', 'distributed', 'moment'] as Load['type'][]).map((t) => (
          <Tooltip key={t} label={LOAD_TOOLTIPS[t]} hasArrow placement="top" openDelay={300}>
            <button
              className={`${styles.typeTab} ${effectiveLoadType === t ? styles.active : ''}`}
              onClick={() => !isEditMode && setLoadType(t)}
              type="button"
              disabled={isEditMode}
              title={isEditMode ? 'Сначала выберите «Новая нагрузка» для смены типа' : undefined}
            >
              {LOAD_TYPE_LABELS[t]}
            </button>
          </Tooltip>
        ))}
      </div>

      {/* Форма ввода */}
      <div className={styles.formGrid}>
        {effectiveLoadType === 'point' && (
          <>
            <label className={styles.fieldLabel}>
              F, Н
              <Tooltip label="Сосредоточенная сила (Н). Положительное — вниз, отрицательное — вверх." hasArrow>
                <input
                  className={styles.input}
                  type="number"
                  min={-100000}
                  max={100000}
                  step={100}
                  value={isEditMode && selectedLoad?.type === 'point' ? (selectedLoad as PointLoad).value : value}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (isEditMode && selectedLoad?.type === 'point' && selectedLoadId) {
                      onUpdateLoad(selectedLoadId, { ...selectedLoad, value: v } as PointLoad);
                    } else {
                      setValue(v);
                    }
                  }}
                />
              </Tooltip>
            </label>
            <label className={styles.fieldLabel}>
              Позиция, м
              <input
                className={styles.input}
                type="range"
                min={0}
                max={maxPosition}
                step={0.1}
                value={isEditMode && selectedLoad?.type === 'point' ? (selectedLoad as PointLoad).position : position}
                onChange={(e) => {
                  const p = Number(e.target.value);
                  if (isEditMode && selectedLoad?.type === 'point' && selectedLoadId) {
                    onUpdateLoad(selectedLoadId, { ...selectedLoad, position: Math.min(p, maxPosition) } as PointLoad);
                  } else {
                    setPosition(p);
                  }
                }}
              />
              <span className={styles.rangeVal}>
                {(isEditMode && selectedLoad?.type === 'point' ? (selectedLoad as PointLoad).position : position).toFixed(1)} м
              </span>
            </label>
          </>
        )}

        {effectiveLoadType === 'distributed' && (
          <>
            <div className={styles.distTypeTabs}>
              <Tooltip label="Равномерная нагрузка постоянной интенсивности w (Н/м) на участке." hasArrow>
                <button
                  className={`${styles.distTab} ${(isEditMode && selectedLoad?.type === 'distributed' ? (selectedLoad as DistributedLoad).distribution : distribution) === 'uniform' ? styles.active : ''}`}
                  onClick={() => {
                    if (isEditMode && selectedLoad?.type === 'distributed' && selectedLoadId) {
                      onUpdateLoad(selectedLoadId, { ...selectedLoad, distribution: 'uniform' } as DistributedLoad);
                    } else {
                      setDistribution('uniform');
                    }
                  }}
                  type="button"
                >
                  Равномерная
                </button>
              </Tooltip>
              <Tooltip label="Треугольная нагрузка — интенсивность меняется от w₁ до w₂ на участке." hasArrow>
                <button
                  className={`${styles.distTab} ${(isEditMode && selectedLoad?.type === 'distributed' ? (selectedLoad as DistributedLoad).distribution : distribution) === 'triangular' ? styles.active : ''}`}
                  onClick={() => {
                    if (isEditMode && selectedLoad?.type === 'distributed' && selectedLoadId) {
                      onUpdateLoad(selectedLoadId, { ...selectedLoad, distribution: 'triangular' } as DistributedLoad);
                    } else {
                      setDistribution('triangular');
                    }
                  }}
                  type="button"
                >
                  Треугольная
                </button>
              </Tooltip>
            </div>
            <label className={styles.fieldLabel}>
              w₁, Н/м
              <Tooltip label="Интенсивность нагрузки (Н/м). Положительное — вниз, отрицательное — вверх." hasArrow>
                <input
                  className={styles.input}
                  type="number"
                  min={-50000}
                  max={50000}
                  step={100}
                  value={isEditMode && selectedLoad?.type === 'distributed' ? (selectedLoad as DistributedLoad).w1 : w1}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (isEditMode && selectedLoad?.type === 'distributed' && selectedLoadId) {
                      onUpdateLoad(selectedLoadId, { ...selectedLoad, w1: v, w2: (selectedLoad as DistributedLoad).distribution === 'triangular' ? (selectedLoad as DistributedLoad).w2 : v } as DistributedLoad);
                    } else {
                      setW1(v);
                    }
                  }}
                />
              </Tooltip>
            </label>
            {(isEditMode && selectedLoad?.type === 'distributed' ? (selectedLoad as DistributedLoad).distribution : distribution) === 'triangular' && (
              <label className={styles.fieldLabel}>
                w₂, Н/м
                <Tooltip label="Интенсивность нагрузки в конце участка (Н/м). Отрицательное — вверх." hasArrow>
                  <input
                    className={styles.input}
                    type="number"
                    min={-50000}
                    max={50000}
                    step={100}
                    value={isEditMode && selectedLoad?.type === 'distributed' ? ((selectedLoad as DistributedLoad).w2 ?? (selectedLoad as DistributedLoad).w1) : w2}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (isEditMode && selectedLoad?.type === 'distributed' && selectedLoadId) {
                        onUpdateLoad(selectedLoadId, { ...selectedLoad, w2: v } as DistributedLoad);
                      } else {
                        setW2(v);
                      }
                    }}
                  />
                </Tooltip>
              </label>
            )}
            <label className={styles.fieldLabel}>
              Начало, м
              <input
                className={styles.input}
                type="range"
                min={0}
                max={maxPosition}
                step={0.1}
                value={isEditMode && selectedLoad?.type === 'distributed' ? (selectedLoad as DistributedLoad).start : start}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (isEditMode && selectedLoad?.type === 'distributed' && selectedLoadId) {
                    const L = selectedLoad as DistributedLoad;
                    onUpdateLoad(selectedLoadId, { ...L, start: v, end: Math.max(L.end, v) } as DistributedLoad);
                  } else {
                    setStart(v);
                  }
                }}
              />
              <span className={styles.rangeVal}>
                {(isEditMode && selectedLoad?.type === 'distributed' ? (selectedLoad as DistributedLoad).start : start).toFixed(1)} м
              </span>
            </label>
            <label className={styles.fieldLabel}>
              Конец, м
              <input
                className={styles.input}
                type="range"
                min={0}
                max={maxPosition}
                step={0.1}
                value={isEditMode && selectedLoad?.type === 'distributed' ? (selectedLoad as DistributedLoad).end : end}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (isEditMode && selectedLoad?.type === 'distributed' && selectedLoadId) {
                    const L = selectedLoad as DistributedLoad;
                    onUpdateLoad(selectedLoadId, { ...L, end: v, start: Math.min(L.start, v) } as DistributedLoad);
                  } else {
                    setEnd(v);
                  }
                }}
              />
              <span className={styles.rangeVal}>
                {(isEditMode && selectedLoad?.type === 'distributed' ? (selectedLoad as DistributedLoad).end : end).toFixed(1)} м
              </span>
            </label>
          </>
        )}

        {effectiveLoadType === 'moment' && (
          <>
            <label className={styles.fieldLabel}>
              M₀, Н·м
              <Tooltip label="Сосредоточенный момент. Положительный — по часовой стрелке." hasArrow>
                <input
                  className={styles.input}
                  type="number"
                  min={-100000}
                  max={100000}
                  step={100}
                  value={isEditMode && selectedLoad?.type === 'moment' ? (selectedLoad as MomentLoad).value : value}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (isEditMode && selectedLoad?.type === 'moment' && selectedLoadId) {
                      onUpdateLoad(selectedLoadId, { ...selectedLoad, value: v } as MomentLoad);
                    } else {
                      setValue(v);
                    }
                  }}
                />
              </Tooltip>
            </label>
            <label className={styles.fieldLabel}>
              Позиция, м
              <input
                className={styles.input}
                type="range"
                min={0}
                max={maxPosition}
                step={0.1}
                value={isEditMode && selectedLoad?.type === 'moment' ? (selectedLoad as MomentLoad).position : position}
                onChange={(e) => {
                  const p = Number(e.target.value);
                  if (isEditMode && selectedLoad?.type === 'moment' && selectedLoadId) {
                    onUpdateLoad(selectedLoadId, { ...selectedLoad, position: Math.min(p, maxPosition) } as MomentLoad);
                  } else {
                    setPosition(p);
                  }
                }}
              />
              <span className={styles.rangeVal}>
                {(isEditMode && selectedLoad?.type === 'moment' ? (selectedLoad as MomentLoad).position : position).toFixed(1)} м
              </span>
            </label>
          </>
        )}
      </div>

      <button className={styles.addBtn} onClick={handleAdd} type="button">
        + Добавить нагрузку
      </button>

      {/* Режим: редактировать выбранную или новую */}
      {loads.length > 0 && (
        <div className={styles.modeHint}>
          <button
            type="button"
            className={!isEditMode ? styles.modeBtnActive : styles.modeBtn}
            onClick={() => setSelectedLoadId(null)}
          >
            Новая нагрузка
          </button>
          <span className={styles.modeLabel}>или выберите ниже для редактирования</span>
        </div>
      )}

      {/* Список нагрузок */}
      {loads.length > 0 && (
        <div className={styles.loadList}>
          {loads.map((load) => (
            <div
              key={load.id}
              className={`${styles.loadItem} ${selectedLoadId === load.id ? styles.loadItemSelected : ''}`}
              onClick={() => setSelectedLoadId(load.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedLoadId(load.id)}
              aria-pressed={selectedLoadId === load.id}
            >
              <span className={styles.loadDesc}>
                {load.type === 'point' && `F = ${(load as PointLoad).value.toLocaleString('ru')} Н @ x=${(load as PointLoad).position.toFixed(1)} м`}
                {load.type === 'distributed' && `q = ${(load as DistributedLoad).w1.toLocaleString('ru')} Н/м [${(load as DistributedLoad).start.toFixed(1)}–${(load as DistributedLoad).end.toFixed(1)} м]`}
                {load.type === 'moment' && `M₀ = ${(load as MomentLoad).value.toLocaleString('ru')} Н·м @ x=${(load as MomentLoad).position.toFixed(1)} м`}
              </span>
              <button
                className={styles.removeBtn}
                onClick={(e) => { e.stopPropagation(); onRemove(load.id); }}
                type="button"
                aria-label="Удалить нагрузку"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
