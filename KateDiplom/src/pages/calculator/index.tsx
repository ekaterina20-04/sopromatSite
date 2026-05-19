import { useCallback, useMemo, useState } from 'react';
import type { BeamConfig, BeamResult } from '@entities/beam';
import { calculateBeam } from '@features/calculation';
import { TOOLTIP_CONDITIONS } from '@features/tooltips';
import { BeamEditor } from '@widgets/BeamEditor';
import { ChatAssistant } from '@widgets/ChatAssistant';
import { DiagramViewer } from '@widgets/DiagramViewer';
import { ExportPanel } from '@widgets/ExportPanel';
import { parseConfigFromUrl } from '@shared/lib';
import styles from './Calculator.module.css';

const DEFAULT_CONFIG: BeamConfig = {
  type: 'simply-supported',
  length: 4,
  loads: [
    {
      id: 'default-1',
      type: 'point',
      value: 5000,
      position: 2,
      direction: 'vertical',
    },
  ],
};

export default function CalculatorPage() {
  const [config, setConfig] = useState<BeamConfig>(() => {
    const fromUrl = parseConfigFromUrl();
    return fromUrl ?? DEFAULT_CONFIG;
  });

  const handleConfigChange = useCallback((next: BeamConfig) => {
    setConfig((prev) => {
      const merged = { ...prev, ...next };
      return merged;
    });
  }, []);

  let result: BeamResult | null = null;
  try {
    result = calculateBeam(config);
  } catch (e) {
    console.error('Ошибка расчёта:', e);
  }

  // Вычисляем активные контекстные подсказки
  const activeTooltips = useMemo(() => {
    if (!result) return [];
    return TOOLTIP_CONDITIONS.filter((cond) => cond.check(config, result));
  }, [config, result]);

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <BeamEditor config={config} onChange={handleConfigChange} />
        <ExportPanel config={config} result={result} />
      </aside>
      <section className={styles.viewer}>
        {result ? (
          <>
            {activeTooltips.length > 0 && (
              <div className={styles.hints}>
                {activeTooltips.map((tip) => (
                  <div key={tip.id} className={styles.hintCard}>
                    <span className={styles.hintLabel}>{tip.label}</span>
                    <p className={styles.hintText}>{tip.description}</p>
                  </div>
                ))}
              </div>
            )}
            <DiagramViewer config={config} result={result} />
          </>
        ) : (
          <div className={styles.errorMsg}>Ошибка расчёта. Проверьте параметры конфигурации.</div>
        )}
      </section>
      <ChatAssistant config={config} result={result} />
    </div>
  );
}
