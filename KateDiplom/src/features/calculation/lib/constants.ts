export const BASE_MATERIAL = {
  E: 2.1e11,
  I: 8.356e-6,
} as const;

export const BASE_FLEXURAL_RIGIDITY = BASE_MATERIAL.E * BASE_MATERIAL.I;
