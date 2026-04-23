import type { Material } from '@entities/beam';

export const MATERIALS: Record<string, Material> = {
  steel: {
    name: 'steel',
    E: 2.1e11,
    I: 8.356e-6, // IPE 200
  },
  aluminum: {
    name: 'aluminum',
    E: 0.7e11,
    I: 8.356e-6,
  },
  wood: {
    name: 'wood',
    E: 0.1e11,
    I: 8.356e-6,
  },
};

export const MATERIAL_LABELS: Record<string, string> = {
  steel: 'Сталь',
  aluminum: 'Алюминий',
  wood: 'Дерево',
  custom: 'Кастомный',
};

export const BEAM_TYPE_LABELS: Record<string, string> = {
  cantilever: 'Консольная балка',
  'simply-supported': 'Шарнирно-опёртая',
  overhang: 'Балка с вылетом',
};
