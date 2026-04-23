import type { BeamConfig } from '@entities/beam';

/**
 * Кодирует конфигурацию балки в base64 и возвращает URL для шаринга.
 */
export function generateShareUrl(config: BeamConfig): string {
  const json = JSON.stringify(config);
  const encoded = btoa(encodeURIComponent(json));
  const url = new URL(window.location.href);
  url.searchParams.set('c', encoded);
  url.pathname = '/calculator';
  return url.toString();
}

/**
 * Считывает параметр c из URL и восстанавливает BeamConfig.
 */
export function parseConfigFromUrl(): BeamConfig | null {
  try {
    const url = new URL(window.location.href);
    const encoded = url.searchParams.get('c');
    if (!encoded) return null;
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json) as BeamConfig;
  } catch {
    return null;
  }
}
