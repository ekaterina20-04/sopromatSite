/**
 * Главная функция расчёта балки.
 * Диспетчеризует по типу конструкции.
 * После расчёта выполняет верификацию по зависимостям Журавского.
 */
import type { BeamConfig, BeamResult } from '@entities/beam';
import { calculateCantilever } from '../lib/cantilever';
import { calculateSimplySupported } from '../lib/simplySupported';
import { calculateOverhang } from '../lib/overhang';
import { verifyResult } from '../lib/verification';

/**
 * Вычисляет реакции опор, эпюры Q(x), M(x), N(x) и деформированную форму v(x)
 * для заданной конфигурации балки/рамы.
 * После расчёта автоматически проводит верификацию по дифференциальным
 * зависимостям Журавского и проверку равновесия.
 * @param config - конфигурация балки
 * @returns результаты расчёта с верификацией
 */
export function calculateBeam(config: BeamConfig): BeamResult {
  let result: BeamResult;
  switch (config.type) {
    case 'cantilever':
      result = calculateCantilever(config);
      break;
    case 'simply-supported':
      result = calculateSimplySupported(config);
      break;
    case 'overhang':
      result = calculateOverhang(config);
      break;
    default:
      throw new Error(`Неизвестный тип балки: ${(config as BeamConfig).type}`);
  }

  // Верификация по Журавскому + проверка равновесия
  result.verification = verifyResult(config, result);

  return result;
}
