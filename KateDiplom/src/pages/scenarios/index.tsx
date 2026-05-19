import { useNavigate } from 'react-router-dom';
import type { Scenario } from '@entities/beam';
import { generateShareUrl } from '@shared/lib';
import styles from './Scenarios.module.css';

const SCENARIOS: Scenario[] = [
  {
    id: 'bridge-truck',
    title: 'Мост под колёсами грузовика',
    description:
      'Шарнирно-опёртая балка моста длиной 12 м под действием двух осевых нагрузок грузового автомобиля (передняя ось 60 кН, задняя 120 кН). Анализ эпюр и максимального прогиба.',
    image: '🌉',
    config: {
      type: 'simply-supported',
      length: 12,
      loads: [
        { id: 'b1', type: 'point', value: 60000, position: 3, direction: 'vertical' },
        { id: 'b2', type: 'point', value: 120000, position: 7, direction: 'vertical' },
      ],
    },
  },
  {
    id: 'landing-gear',
    title: 'Шасси самолёта',
    description:
      'Консольная балка стойки шасси длиной 1.2 м с сосредоточенной нагрузкой от колеса 80 кН. Оцениваем максимальный момент и прогиб при посадке.',
    image: '✈️',
    config: {
      type: 'cantilever',
      length: 1.2,
      loads: [{ id: 'lg1', type: 'point', value: 80000, position: 1.2, direction: 'vertical' }],
    },
  },
  {
    id: 'rail-wheel',
    title: 'Рельс под колёсной нагрузкой',
    description:
      'Балка с вылетом — рельс длиной 6 м с вылетом 1 м. Нагрузка от колёсной пары 100 кН в середине пролёта. Анализ смены знака момента на вылете.',
    image: '🚆',
    config: {
      type: 'overhang',
      length: 6,
      overhang: 1,
      loads: [{ id: 'r1', type: 'point', value: 100000, position: 3, direction: 'vertical' }],
    },
  },
  {
    id: 'wagon-axle',
    title: 'Ось вагона с вылетом',
    description:
      'Ось железнодорожного вагона длиной 1.8 м с двумя колёсными нагрузками по 50 кН на расстоянии 0.35 м от опор. Равномерная нагрузка от веса вагона 8 кН/м.',
    image: '🚃',
    config: {
      type: 'simply-supported',
      length: 1.8,
      loads: [
        { id: 'w1', type: 'point', value: 50000, position: 0.35, direction: 'vertical' },
        { id: 'w2', type: 'point', value: 50000, position: 1.45, direction: 'vertical' },
        {
          id: 'w3',
          type: 'distributed',
          start: 0,
          end: 1.8,
          distribution: 'uniform',
          w1: 8000,
          w2: 8000,
        },
      ],
    },
  },
];

export default function ScenariosPage() {
  const navigate = useNavigate();

  function openScenario(scenario: Scenario) {
    const url = generateShareUrl(scenario.config);
    // Извлекаем только параметр c
    const u = new URL(url);
    navigate(`/calculator?c=${u.searchParams.get('c')}`);
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Готовые сценарии</h1>
      <p className={styles.subtitle}>
        Пять практических задач из реального машиностроения и строительства. Откройте любой сценарий
        в калькуляторе и изменяйте параметры.
      </p>

      <div className={styles.grid}>
        {SCENARIOS.map((scenario) => (
          <article key={scenario.id} className={styles.card}>
            <div className={styles.cardEmoji}>{scenario.image}</div>
            <h2 className={styles.cardTitle}>{scenario.title}</h2>
            <p className={styles.cardDesc}>{scenario.description}</p>
            <div className={styles.cardTags}>
              <span className={styles.tag}>
                {scenario.config.type === 'cantilever' && 'Консоль'}
                {scenario.config.type === 'simply-supported' && 'Шарнирная опора'}
                {scenario.config.type === 'overhang' && 'С вылетом'}
              </span>
              <span className={styles.tag}>L = {scenario.config.length} м</span>
            </div>
            <button
              className={styles.openBtn}
              onClick={() => openScenario(scenario)}
              type="button"
            >
              Открыть модель →
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
