import { useMemo } from 'react';
import { Tooltip } from '@chakra-ui/react';
import type { BeamConfig, BeamResult } from '@entities/beam';
import styles from './BeamScheme.module.css';

interface Props {
  config: BeamConfig;
  result: BeamResult;
}

const SVG_W = 600;
const SVG_H = 160;
const BEAM_Y = 90;
const BEAM_H = 10;
const PAD_L = 60;
const PAD_R = 40;
const PLOT_W = SVG_W - PAD_L - PAD_R;

function xToSvg(x: number, xMax: number): number {
  return PAD_L + (x / xMax) * PLOT_W;
}

export function BeamScheme({ config, result }: Props) {
  const { length: L, type, overhang: c = 0, loads } = config;
  const totalL = type === 'overhang' ? L + c : L;

  // Вычисляем масштаб деформации
  const actualScale = useMemo(() => {
    const maxDef = Math.max(...result.deformedY.map(Math.abs));

    return maxDef > 0 ? 40 / maxDef : 1;
  }, [result.deformedY]);

  // Цветовые сегменты деформированной формы: красный (растяжение M>0), синий (сжатие M<0)
  const deformedSegments = useMemo(() => {
    if (!result.deformedY.length) return [];
    const segments: { d: string; color: string }[] = [];
    let currentSign = Math.sign(result.M[0]) || 1;
    let currentPath = '';

    for (let i = 0; i < result.x.length; i++) {
      const px = xToSvg(result.x[i], totalL);
      const py = BEAM_Y + result.deformedY[i] * actualScale;
      const sign = Math.sign(result.M[i]) || currentSign;

      if (i === 0) {
        currentPath = `M ${px},${py}`;
        currentSign = sign;
      } else if (sign !== currentSign) {
        // Смена знака — сохраняем текущий сегмент
        segments.push({
          d: currentPath,
          color: currentSign > 0 ? '#ef4444' : '#3b82f6',
        });
        // Начинаем новый сегмент с предыдущей точки
        const prevPx = xToSvg(result.x[i - 1], totalL);
        const prevPy = BEAM_Y + result.deformedY[i - 1] * actualScale;
        currentPath = `M ${prevPx},${prevPy} L ${px},${py}`;
        currentSign = sign;
      } else {
        currentPath += ` L ${px},${py}`;
      }
    }
    // Последний сегмент
    if (currentPath) {
      segments.push({
        d: currentPath,
        color: currentSign > 0 ? '#ef4444' : '#3b82f6',
      });
    }
    return segments;
  }, [result, totalL, actualScale]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.title}>Расчётная схема и деформированная форма</div>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className={styles.svg}>
        {/* Балка */}
        <rect
          x={PAD_L}
          y={BEAM_Y - BEAM_H / 2}
          width={PLOT_W}
          height={BEAM_H}
          rx={2}
          fill="var(--color-bg-elevated)"
          stroke="var(--color-text-muted)"
          strokeWidth={1.5}
        />

        {/* Опоры */}
        {type === 'cantilever' && (
          // Защемление слева
          <g>
            {[-12, -6, 0, 6, 12].map((dy) => (
              <line
                key={dy}
                x1={PAD_L - 12}
                y1={BEAM_Y + dy}
                x2={PAD_L}
                y2={BEAM_Y + dy}
                stroke="var(--color-text-muted)"
                strokeWidth={1}
              />
            ))}
            <line
              x1={PAD_L - 12}
              y1={BEAM_Y - 14}
              x2={PAD_L - 12}
              y2={BEAM_Y + 14}
              stroke="var(--color-text-muted)"
              strokeWidth={2}
            />
          </g>
        )}

        {(type === 'simply-supported' || type === 'overhang') && (
          <>
            {/* Опора A — двустепенная (шарнирно-неподвижная, треугольник) */}
            <polygon
              points={`${PAD_L},${BEAM_Y + BEAM_H / 2} ${PAD_L - 10},${BEAM_Y + BEAM_H / 2 + 18} ${PAD_L + 10},${BEAM_Y + BEAM_H / 2 + 18}`}
              fill="none"
              stroke="var(--color-text-muted)"
              strokeWidth={1.5}
            />
            {/* Линия земли под опорой A */}
            <line
              x1={PAD_L - 14}
              y1={BEAM_Y + BEAM_H / 2 + 18}
              x2={PAD_L + 14}
              y2={BEAM_Y + BEAM_H / 2 + 18}
              stroke="var(--color-text-muted)"
              strokeWidth={1.5}
            />
            {/* Опора B — одностепенная (шарнирно-подвижная, вертикальная палка) */}
            <line
              x1={PAD_L + (L / totalL) * PLOT_W}
              y1={BEAM_Y + BEAM_H / 2}
              x2={PAD_L + (L / totalL) * PLOT_W}
              y2={BEAM_Y + BEAM_H / 2 + 18}
              stroke="var(--color-text-muted)"
              strokeWidth={2}
            />
            <line
              x1={PAD_L + (L / totalL) * PLOT_W - 10}
              y1={BEAM_Y + BEAM_H / 2 + 18}
              x2={PAD_L + (L / totalL) * PLOT_W + 10}
              y2={BEAM_Y + BEAM_H / 2 + 18}
              stroke="var(--color-text-muted)"
              strokeWidth={1.5}
            />
          </>
        )}

        {/* Нагрузки */}
        {loads.map((load) => {
          if (load.type === 'point') {
            const px = xToSvg(load.position, totalL);
            const arrowLen = 30;
            const isPositive = load.value >= 0;
            const arrowY1 = isPositive ? BEAM_Y - BEAM_H / 2 : BEAM_Y - BEAM_H / 2 - arrowLen;
            const arrowY2 = isPositive ? BEAM_Y - BEAM_H / 2 - arrowLen : BEAM_Y - BEAM_H / 2;
            return (
              <Tooltip
                key={load.id}
                label={`Сосредоточенная сила F = ${load.value.toLocaleString('ru')} Н`}
                hasArrow
              >
                <g style={{ cursor: 'help' }}>
                  <line
                    x1={px}
                    y1={arrowY1}
                    x2={px}
                    y2={arrowY2}
                    stroke="#60a5fa"
                    strokeWidth={2}
                    markerEnd="url(#arrowhead)"
                  />
                  <text
                    x={px}
                    y={BEAM_Y - BEAM_H / 2 - arrowLen - 4}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#60a5fa"
                  >
                    F
                  </text>
                </g>
              </Tooltip>
            );
          }
          if (load.type === 'distributed') {
            const pxStart = xToSvg(load.start, totalL);
            const pxEnd = xToSvg(load.end, totalL);
            const qH = 24;
            const isPositive = load.w1 >= 0;
            const numArrows = Math.max(2, Math.floor((pxEnd - pxStart) / 25));
            const arrowXPositions = Array.from(
              { length: numArrows },
              (_, i) => pxStart + ((pxEnd - pxStart) * (i + 0.5)) / numArrows
            );
            const arrowY1 = isPositive ? BEAM_Y - BEAM_H / 2 - qH : BEAM_Y - BEAM_H / 2;
            const arrowY2 = isPositive ? BEAM_Y - BEAM_H / 2 : BEAM_Y - BEAM_H / 2 - qH;
            return (
              <Tooltip
                key={load.id}
                label={`Распределённая нагрузка: ${load.w1.toLocaleString('ru')} Н/м`}
                hasArrow
              >
                <g style={{ cursor: 'help' }}>
                  <rect
                    x={pxStart}
                    y={BEAM_Y - BEAM_H / 2 - qH}
                    width={pxEnd - pxStart}
                    height={qH}
                    fill="#a78bfa"
                    fillOpacity={0.3}
                    stroke="#a78bfa"
                    strokeWidth={1}
                  />
                  {arrowXPositions.map((ax, i) => (
                    <line
                      key={i}
                      x1={ax}
                      y1={arrowY1}
                      x2={ax}
                      y2={arrowY2}
                      stroke="#a78bfa"
                      strokeWidth={1.5}
                      markerEnd="url(#arrowhead-dist)"
                    />
                  ))}
                  <text
                    x={(pxStart + pxEnd) / 2}
                    y={BEAM_Y - BEAM_H / 2 - qH - 4}
                    textAnchor="middle"
                    fontSize={16}
                    fill="#fb923c"
                  >
                    q
                  </text>
                </g>
              </Tooltip>
            );
          }
          if (load.type === 'moment') {
            const px = xToSvg(load.position, totalL);
            return (
              <Tooltip
                key={load.id}
                label={`Сосредоточенный момент M₀ = ${load.value.toLocaleString('ru')} Н·м`}
                hasArrow
              >
                <g style={{ cursor: 'help' }}>
                  <text
                    x={px}
                    y={BEAM_Y - BEAM_H / 2 - 8}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#a78bfa"
                  >
                    {load.value >= 0 ? '↺' : '↻'}
                  </text>
                  <text
                    x={px}
                    y={BEAM_Y - BEAM_H / 2 - 24}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#fb923c"
                  >
                    M₀
                  </text>
                </g>
              </Tooltip>
            );
          }
          return null;
        })}

        {/* Деформированная форма с цветовой индикацией растяжения/сжатия */}
        {deformedSegments.length > 0 && (
          <Tooltip
            label={`Максимальный прогиб: ${(result.maxDeflection * 1000).toFixed(3)} мм при x = ${result.maxDeflectionPosition.toFixed(2)} м | Красный — растяжение (M>0), Синий — сжатие (M<0)`}
            hasArrow
          >
            <g style={{ cursor: 'help' }}>
              {deformedSegments.map((seg, i) => (
                <path
                  key={i}
                  d={seg.d}
                  stroke={seg.color}
                  strokeWidth={2.5}
                  fill="none"
                  strokeDasharray="6 3"
                />
              ))}
            </g>
          </Tooltip>
        )}

        {/* Определение маркеров стрелок */}
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <polygon points="0 0, 8 4, 0 8" fill="#60a5fa" />
          </marker>
          <marker
            id="arrowhead-dist"
            markerWidth="6"
            markerHeight="6"
            refX="3"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 6 3, 0 6" fill="#a78bfa" />
          </marker>
        </defs>

        {/* Размерная линия */}
        <line
          x1={PAD_L}
          y1={BEAM_Y + 40}
          x2={PAD_L + PLOT_W}
          y2={BEAM_Y + 40}
          stroke="var(--color-text-dim)"
          strokeWidth={1}
        />
        <text
          x={(PAD_L + PAD_L + PLOT_W) / 2}
          y={BEAM_Y + 52}
          textAnchor="middle"
          fontSize={11}
          fill="var(--color-text-muted)"
        >
          L = {totalL.toFixed(1)} м
        </text>

        {/* Легенда деформированной формы */}
        <line
          x1={PAD_L}
          y1={12}
          x2={PAD_L + 20}
          y2={12}
          stroke="#ef4444"
          strokeWidth={2.5}
          strokeDasharray="6 3"
        />
        <text x={PAD_L + 24} y={16} fontSize={9} fill="var(--color-text-muted)">
          растяжение
        </text>
        <line
          x1={PAD_L + 90}
          y1={12}
          x2={PAD_L + 110}
          y2={12}
          stroke="#3b82f6"
          strokeWidth={2.5}
          strokeDasharray="6 3"
        />
        <text x={PAD_L + 114} y={16} fontSize={9} fill="var(--color-text-muted)">
          сжатие
        </text>
      </svg>
    </div>
  );
}
