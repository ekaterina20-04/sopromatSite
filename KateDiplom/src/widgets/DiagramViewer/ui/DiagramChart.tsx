import { useMemo, useRef, useState } from 'react';
import { Tooltip } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import type { BeamResult, Load } from '@entities/beam';
import styles from './DiagramChart.module.css';

interface Props {
  result: BeamResult;
  /** Тип эпюры: 'M' | 'Q' | 'N' | 'def' */
  type: 'M' | 'Q' | 'N' | 'def';
  label: string;
  color: string;
  unit: string;
  /** Нагрузки балки для отрисовки границ участков */
  loads?: Load[];
}

const SVG_WIDTH = 600;
const SVG_HEIGHT = 280;
const PADDING = { top: 20, right: 20, bottom: 32, left: 60 };

function getPlotData(result: BeamResult, type: Props['type']): number[] {
  switch (type) {
    case 'M':
      return result.M;
    case 'Q':
      return result.Q;
    case 'N':
      return result.N ?? [];
    case 'def':
      return result.deformedY;
  }
}

function scaleX(xi: number, xMin: number, xMax: number): number {
  const plotW = SVG_WIDTH - PADDING.left - PADDING.right;
  return PADDING.left + ((xi - xMin) / (xMax - xMin)) * plotW;
}

function scaleY(val: number, yMin: number, yMax: number): number {
  const plotH = SVG_HEIGHT - PADDING.top - PADDING.bottom;
  const range = yMax - yMin || 1;
  // Инвертируем: большие значения — выше
  return PADDING.top + plotH - ((val - yMin) / range) * plotH;
}

function formatVal(val: number, unit: string): string {
  if (Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(2)} М${unit}`;
  if (Math.abs(val) >= 1e3) return `${(val / 1e3).toFixed(2)} к${unit}`;
  return `${val.toFixed(2)} ${unit}`;
}

export function DiagramChart({
  result,
  type,
  label,
  color,
  unit,
  loads,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<{
    x: number;
    y: number;
    val: number;
    xi: number;
    idx: number;
  } | null>(null);

  const values = getPlotData(result, type);

  const { xs, pathData, zeroY, yMin, yMax, xMin, xMax } = useMemo(() => {
    const xs = result.x;
    const xMin = xs[0];
    const xMax = xs[xs.length - 1];

    // Симметричная шкала: ноль всегда в середине графика.
    // Это гарантирует, что положительные значения — выше оси X,
    // отрицательные — ниже, независимо от знака данных.
    const absMax = Math.max(...values.map(Math.abs), 0.001);
    const yPad = absMax * 0.25;
    const yMin = -(absMax + yPad);
    const yMax = absMax + yPad;

    const zeroY = scaleY(0, yMin, yMax);

    let pathData = '';
    for (let i = 0; i < xs.length; i++) {
      const px = scaleX(xs[i], xMin, xMax);
      const py = scaleY(values[i], yMin, yMax);
      pathData += i === 0 ? `M ${px},${py}` : ` L ${px},${py}`;
    }

    return { xs, pathData, zeroY, yMin, yMax, xMin, xMax };
  }, [result, values]);

  if (!values.length) return null;

  // Область заливки
  const fillPath =
    pathData +
    ` L ${scaleX(xs[xs.length - 1], xMin, xMax)},${zeroY}` +
    ` L ${scaleX(xs[0], xMin, xMax)},${zeroY} Z`;

  // Максимальное по модулю значение
  const maxAbsIdx = values.reduce((b, v, i) => (Math.abs(v) > Math.abs(values[b]) ? i : b), 0);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;
    const plotW = SVG_WIDTH - PADDING.left - PADDING.right;
    const t = Math.max(0, Math.min(1, (mouseX - PADDING.left) / plotW));
    const idx = Math.round(t * (xs.length - 1));
    const svgX = scaleX(xs[idx], xMin, xMax);
    const svgY = scaleY(values[idx], yMin, yMax);
    setHovered({ x: svgX, y: svgY, val: values[idx], xi: xs[idx], idx });
  };

  return (
    <motion.div
      className={styles.wrapper}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className={styles.labelRow}>
        <span className={styles.label} style={{ color }}>
          {label}
        </span>
        {hovered && (
          <span className={styles.hoveredVal}>
            x = {hovered.xi.toFixed(2)} м: {formatVal(hovered.val, unit)}
            {' | Q = '}
            {formatVal(result.Q[hovered.idx], 'Н')}
            {', M = '}
            {formatVal(result.M[hovered.idx], 'Н·м')}
          </span>
        )}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className={styles.svg}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <clipPath id={`fill-clip-${type}`}>
            <path d={fillPath} />
          </clipPath>
        </defs>

        {/* Заливка */}
        <path d={fillPath} fill={color} fillOpacity={0.15} />

        {/* Сетка — обрезается по контуру эпюры */}
        <g clipPath={`url(#fill-clip-${type})`}>
          {/* Бледные вертикальные линии сетки */}
          {[
            0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8,
            0.85, 0.9, 0.95, 1,
          ].map((t) => {
            const px = scaleX(xMin + t * (xMax - xMin), xMin, xMax);
            return (
              <line
                key={t}
                x1={px}
                y1={PADDING.top}
                x2={px}
                y2={SVG_HEIGHT - PADDING.bottom}
                stroke="var(--color-text-dim)"
                strokeWidth={0.8}
                opacity={0.2}
              />
            );
          })}

          {/* Яркие вертикальные линии в точках приложения нагрузок */}
          {loads &&
            (() => {
              const positions = new Set<number>();
              for (const load of loads) {
                if (load.type === 'point' || load.type === 'moment') {
                  positions.add(load.position);
                } else if (load.type === 'distributed') {
                  positions.add(load.start);
                  positions.add(load.end);
                }
              }
              return Array.from(positions).map((pos) => {
                const px = scaleX(pos, xMin, xMax);
                return (
                  <line
                    key={pos}
                    x1={px}
                    y1={PADDING.top}
                    x2={px}
                    y2={SVG_HEIGHT - PADDING.bottom}
                    stroke="var(--color-text-dim)"
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    opacity={0.9}
                  />
                );
              });
            })()}
        </g>

        {/* Нулевая линия (ось Y=0) */}
        <line
          x1={PADDING.left}
          y1={zeroY}
          x2={SVG_WIDTH - PADDING.right}
          y2={zeroY}
          stroke="var(--color-text-dim)"
          strokeWidth={1.5}
          opacity={0.7}
        />

        {/* Кривая */}
        <path d={pathData} stroke={color} strokeWidth={2} fill="none" />

        {/* Подсветка максимума */}
        <Tooltip
          label={`Максимум: ${formatVal(values[maxAbsIdx], unit)} при x = ${xs[maxAbsIdx].toFixed(2)} м`}
          hasArrow
          placement="top"
          openDelay={100}
        >
          <circle
            cx={scaleX(xs[maxAbsIdx], xMin, xMax)}
            cy={scaleY(values[maxAbsIdx], yMin, yMax)}
            r={5}
            fill={color}
            stroke="white"
            strokeWidth={1.5}
            style={{ cursor: 'pointer' }}
          />
        </Tooltip>

        {/* Курсор */}
        {hovered && (
          <>
            <line
              x1={hovered.x}
              y1={PADDING.top}
              x2={hovered.x}
              y2={SVG_HEIGHT - PADDING.bottom}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="3 2"
              opacity={0.6}
            />
            <circle cx={hovered.x} cy={hovered.y} r={4} fill={color} />
          </>
        )}

        {/* Ось X — подписи */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const xVal = xMin + t * (xMax - xMin);
          const px = scaleX(xVal, xMin, xMax);
          return (
            <text
              key={t}
              x={px}
              y={SVG_HEIGHT - 6}
              textAnchor="middle"
              fontSize={10}
              fill="var(--color-text-dim)"
            >
              {xVal.toFixed(1)}
            </text>
          );
        })}

        {/* Ось Y — подписи */}
        {[yMin + (yMax - yMin) * 0.1, 0, yMax - (yMax - yMin) * 0.1].map((v, i) => (
          <text
            key={i}
            x={PADDING.left - 6}
            y={scaleY(v, yMin, yMax) + 4}
            textAnchor="end"
            fontSize={9}
            fill="var(--color-text-dim)"
          >
            {formatVal(v, '')}
          </text>
        ))}

        {/* Подпись оси X */}
        <text
          x={SVG_WIDTH / 2}
          y={SVG_HEIGHT - 2}
          textAnchor="middle"
          fontSize={9}
          fill="var(--color-text-dim)"
        >
          x, м
        </text>
      </svg>
    </motion.div>
  );
}
