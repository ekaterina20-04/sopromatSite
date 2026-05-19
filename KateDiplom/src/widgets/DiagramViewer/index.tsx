import type { BeamConfig, BeamResult } from '@entities/beam';
import { BeamScheme } from './ui/BeamScheme';
import { DiagramChart } from './ui/DiagramChart';
import { ReactionsPanel } from './ui/ReactionsPanel';
import { StepByStep } from '@widgets/StepByStep';
import styles from './DiagramViewer.module.css';

interface Props {
  config: BeamConfig;
  result: BeamResult;
}

export function DiagramViewer({ config, result }: Props) {
  const hasN = result.N && result.N.some((v) => Math.abs(v) > 0.001);

  return (
    <div className={styles.container} id="diagram-export-container">
      <ReactionsPanel result={result} />
      <StepByStep config={config} result={result} />
      <BeamScheme config={config} result={result} />

      <DiagramChart
        result={result}
        type="M"
        label="Эпюра изгибающих моментов M(x)"
        color="var(--color-m)"
        unit="Н·м"
        loads={config.loads}
      />
      <DiagramChart
        result={result}
        type="Q"
        label="Эпюра поперечных сил Q(x)"
        color="var(--color-q)"
        unit="Н"
        loads={config.loads}
      />
      {hasN && (
        <DiagramChart
          result={result}
          type="N"
          label="Эпюра продольных сил N(x)"
          color="var(--color-n)"
          unit="Н"
          loads={config.loads}
        />
      )}
    </div>
  );
}
