import type { BeamConfig, Load } from '@entities/beam';
import { BeamTypeSelector } from './ui/BeamTypeSelector';
import { GeometryPanel } from './ui/GeometryPanel';
import { LoadForm } from './ui/LoadForm';
import styles from './BeamEditor.module.css';

interface Props {
  config: BeamConfig;
  onChange: (config: BeamConfig) => void;
}

export function BeamEditor({ config, onChange }: Props) {
  function patch(partial: Partial<BeamConfig>) {
    const next: BeamConfig = { ...config, ...partial };
    onChange(next);
  }

  function addLoad(load: Load) {
    const next: BeamConfig = { ...config, loads: [...config.loads, load] };
    onChange(next);
  }

  function removeLoad(id: string) {
    const next: BeamConfig = { ...config, loads: config.loads.filter((l) => l.id !== id) };
    onChange(next);
  }

  function updateLoad(id: string, updated: Load) {
    const next: BeamConfig = {
      ...config,
      loads: config.loads.map((l) => (l.id === id ? updated : l)),
    };
    onChange(next);
  }

  const maxPosition =
    config.type === 'overhang'
      ? config.length + (config.overhang ?? 0)
      : config.length;

  return (
    <div className={styles.panel}>
      <BeamTypeSelector
        value={config.type}
        onChange={(type) =>
          patch({
            type,
            loads: [],
            overhang: type === 'overhang' ? 1 : undefined,
          })
        }
      />
      <GeometryPanel config={config} onChange={patch} />
      {/* <MaterialSelector value={config.material} onChange={(material) => patch({ material })} /> */}
      <LoadForm
        loads={config.loads}
        maxPosition={maxPosition}
        onAdd={addLoad}
        onRemove={removeLoad}
        onUpdateLoad={updateLoad}
      />
    </div>
  );
}
