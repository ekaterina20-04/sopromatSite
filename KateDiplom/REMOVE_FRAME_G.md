# Удаление Г-образной рамы из проекта

## Общий принцип

Г-образная рама (`frame-g`) — отдельный тип балки со своим файлом расчёта, условными ответвлениями в UI и сценарием. Она не используется как базовый класс и не является родителем для других типов. Удаление проходит по принципу: **удалить файл расчёта → убрать тип из системы типов → убрать все ветки `if type === 'frame-g'` → убрать UI-специфику**.

Эпюры Q, M, N для **консоли**, **балки на двух опорах** и **балки с консольным свесом** работают через собственные файлы и не зависят от `frameG.ts` никак.

---

## Шаг 1. Удалить файл расчёта

**Файл:** `src/features/calculation/lib/frameG.ts`

**Действие:** Удалить файл целиком.

Этот файл содержит функцию `calculateFrameG()`. Она нигде не используется напрямую, кроме диспетчера `calculateBeam.ts` (следующий шаг).

---

## Шаг 2. Убрать вызов расчёта из диспетчера

**Файл:** `src/features/calculation/model/calculateBeam.ts`

**Что убрать:**
- Импорт `calculateFrameG` из `./lib/frameG`
- Ветку `if (config.type === 'frame-g')` с вызовом `calculateFrameG(config)`

**Что оставить:** Ветки для `'cantilever'`, `'simply-supported'`, `'overhang'` — не трогать.

---

## Шаг 3. Убрать тип из системы типов

**Файл:** `src/entities/beam/model/types.ts`

**Что убрать:**
- `'frame-g'` из union-типа `BeamType`:
  ```ts
  // Было:
  type BeamType = 'cantilever' | 'simply-supported' | 'overhang' | 'frame-g';
  // Стало:
  type BeamType = 'cantilever' | 'simply-supported' | 'overhang';
  ```
- Поле `height?: number` из интерфейса `BeamConfig` — оно используется только для frame-g (высота стойки H). Если оно встречается в других местах как необязательное поле, убедиться, что другие типы его не используют, и тогда удалить.

**Что оставить:** Поле `overhang?: number` — оно нужно для типа `'overhang'`.

---

## Шаг 4. Убрать кнопку выбора типа и иконку

**Файл:** `src/widgets/BeamEditor/ui/BeamTypeSelector.tsx`

**Что убрать:**
- Запись `'frame-g': 'Г-образная рама: ...'` из объекта `BEAM_TOOLTIPS`
- Запись `'frame-g': '⌐'` из объекта `BEAM_ICONS`

**Что оставить:** Массив `BEAM_TYPES` уже не содержит `'frame-g'` — он и сейчас скрыт. Но объекты `BEAM_TOOLTIPS` и `BEAM_ICONS` содержат записи для него — их нужно убрать, чтобы не было лишних ссылок на удалённый тип.

---

## Шаг 5. Убрать слайдер высоты H в панели геометрии

**Файл:** `src/widgets/BeamEditor/ui/GeometryPanel.tsx`

**Что убрать:**
- Весь блок условного рендера:
  ```tsx
  {config.type === 'frame-g' && (
    <label className={styles.fieldLabel}>
      Высота H, м
      <input type="range" min={1} max={8} step={0.1} value={config.height ?? 3} />
    </label>
  )}
  ```

**Что оставить:** Слайдер длины `L` и слайдер свеса `overhang` — они нужны для остальных типов.

---

## Шаг 6. Убрать расчёт maxPosition для frame-g

**Файл:** `src/widgets/BeamEditor/index.tsx`

**Что убрать:** Ветку frame-g в вычислении `maxPosition`:
```ts
// Было:
const maxPosition =
  config.type === 'frame-g'
    ? config.length + (config.height ?? 3)
    : config.length;

// Стало:
const maxPosition = config.length;
```

**Что оставить:** Использование `maxPosition` для ограничения диапазона позиций нагрузок — логика остаётся, меняется только значение.

---

## Шаг 7. Убрать метку в чат-ассистенте

**Файл:** `src/widgets/ChatAssistant/lib/buildBeamContext.ts`

**Что убрать:** Запись `'frame-g': 'Г-образная рама'` из объекта `BEAM_TYPE_LABELS`.

**Что оставить:** Записи для `'cantilever'`, `'simply-supported'`, `'overhang'`.

---

## Шаг 8. Убрать метку в UI чат-ассистента (если дублируется)

**Файл:** `src/widgets/ChatAssistant/ui/ChatAssistant.tsx`

**Что убрать:** Если здесь есть отдельная константа или switch/if с меткой `'Г-образная рама'` — удалить её.

**Что оставить:** Всю остальную логику чат-ассистента.

---

## Шаг 9. Убрать обработку frame-g в пошаговом решении

**Файл:** `src/widgets/StepByStep/index.tsx`

**Шаг 1 — тип схемы:**

Убрать ветку:
```ts
'frame-g': `Г-образная рама (H=${config.height ?? 3} м, L=${L} м)`
```

**Шаг 3 — реакции:**

Убрать блок:
```ts
else if (type === 'frame-g') {
  reactionLines.push(`Защемление у основания стойки.`);
  if ('R_horizontal' in r) reactionLines.push(`R_гор = ${fmt(r.R_horizontal, 'Н')}`);
  if ('R_vertical' in r) reactionLines.push(`R_верт = ${fmt(r.R_vertical, 'Н')}`);
  if ('M_base' in r) reactionLines.push(`M_осн = ${fmt(r.M_base, 'Н·м')}`);
}
```

**Что оставить:** Ветки для `'cantilever'`, `'simply-supported'`, `'overhang'` — не трогать.

---

## Шаг 10. Убрать подсказки (tooltips) для frame-g

**Файл:** `src/features/tooltips/model/tooltipConditions.ts`

**Что убрать:**

1. Весь объект подсказки `frame-axial`:
   ```ts
   {
     id: 'frame-axial',
     label: 'Продольная сила в рамах',
     description: 'В Г-образной раме ...',
     check: (config) => config.type === 'frame-g',
   }
   ```

2. Исключение `frame-g` из подсказки `error-no-loads`:
   ```ts
   // Было:
   check: (config) => config.loads.length === 0 && config.type !== 'frame-g',
   // Стало:
   check: (config) => config.loads.length === 0,
   ```

**Что оставить:** Все остальные подсказки.

---

## Шаг 11. Убрать раздел теории о Г-образной раме

**Файл:** `src/pages/theory/index.tsx`

**Что убрать:** Раздел (секцию / абзац / карточку) о Г-образной раме в разделе "Расчётные схемы балок". Найти по тексту `"Г-образная рама"` или `"frame-g"`.

**Что оставить:** Разделы про консоль, балку на двух опорах, балку с консольным свесом.

---

## Шаг 12. Убрать готовый сценарий «Кронштейн двигателя»

**Файл:** `src/pages/scenarios/index.tsx`

**Что убрать:** Сценарий #4 — `"Кронштейн крепления двигателя"` (тип `frame-g`, H=0.5 м, L=0.8 м, нагрузка 5 кН).

Найти объект сценария по `type: 'frame-g'` или по описанию и удалить его из массива сценариев целиком.

**Что оставить:** Остальные 4 сценария (сценарии для cantilever, simply-supported, overhang).

---

## Шаг 13. Убрать закомментированную метку из конфига

**Файл:** `src/shared/config/materials.ts`

**Что убрать:** Строку:
```ts
// 'frame-g': 'Г-образная рама'
```

Это закомментированный остаток — убрать, чтобы не вводить в заблуждение.

---

## Итоговая таблица

| Файл | Действие |
|------|----------|
| `src/features/calculation/lib/frameG.ts` | **Удалить файл** |
| `src/features/calculation/model/calculateBeam.ts` | Удалить импорт и ветку `frame-g` |
| `src/entities/beam/model/types.ts` | Удалить `'frame-g'` из `BeamType`, удалить поле `height?` |
| `src/widgets/BeamEditor/ui/BeamTypeSelector.tsx` | Удалить записи `frame-g` из `BEAM_TOOLTIPS` и `BEAM_ICONS` |
| `src/widgets/BeamEditor/ui/GeometryPanel.tsx` | Удалить блок со слайдером высоты H |
| `src/widgets/BeamEditor/index.tsx` | Упростить `maxPosition` — убрать ветку frame-g |
| `src/widgets/ChatAssistant/lib/buildBeamContext.ts` | Удалить запись `'frame-g'` из меток |
| `src/widgets/ChatAssistant/ui/ChatAssistant.tsx` | Удалить метку `'Г-образная рама'` (если есть) |
| `src/widgets/StepByStep/index.tsx` | Удалить ветки frame-g в шагах 1 и 3 |
| `src/features/tooltips/model/tooltipConditions.ts` | Удалить подсказку `frame-axial`, исправить `error-no-loads` |
| `src/pages/theory/index.tsx` | Удалить раздел о Г-образной раме |
| `src/pages/scenarios/index.tsx` | Удалить сценарий «Кронштейн двигателя» |
| `src/shared/config/materials.ts` | Удалить закомментированную строку |

---

## Что НЕ трогать

- `src/features/calculation/lib/cantilever.ts` — не трогать
- `src/features/calculation/lib/simplySupported.ts` — не трогать
- `src/features/calculation/lib/overhang.ts` — не трогать
- `src/features/calculation/lib/verification.ts` — не трогать (работает обобщённо)
- `src/widgets/DiagramViewer/` — не трогать (рендер эпюр не зависит от типа рамы)
- `src/widgets/ExportPanel/` — не трогать
- Все стили и прочие файлы, не содержащие ссылок на `frame-g`

---

## Проверка после удаления

1. Проект компилируется без ошибок TypeScript (особенно после изменения `BeamType` — TS укажет все места, где тип используется, если что-то пропущено).
2. Выбор типов балки предлагает только 3 варианта: консоль, две опоры, свес.
3. Страница сценариев содержит не более 4 сценариев (без кронштейна двигателя).
4. Страница теории не содержит упоминаний Г-образной рамы.
5. Эпюры для консоли, балки на двух опорах и балки со свесом строятся корректно.
