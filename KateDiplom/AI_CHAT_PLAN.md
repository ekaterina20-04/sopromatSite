# План реализации виджета AI-чата (консультант по балкам)

## Общая архитектура

```
Браузер
    |
    | GET /           → nginx (frontend-контейнер) → отдаёт React-приложение
    | POST /api/chat  → nginx proxy_pass → backend-контейнер → OpenAI API
    |
    Docker-сеть (внутренняя, ключ снаружи недоступен)
```

Контекст балки (`BeamConfig` + сводка `BeamResult`) формируется на фронтенде
и передаётся в каждом запросе вместе с вопросом пользователя.

---

## Структура проекта

```
SOPROMAT_SITE/                          # корень репозитория
├── docker-compose.yml                  # поднимает оба контейнера
│
├── KateDiplom/                         # фронтенд (React + Vite)
│   ├── Dockerfile                      # сборка Vite → nginx раздаёт статику
│   ├── nginx.conf                      # конфиг nginx с proxy_pass на backend
│   └── src/
│       └── widgets/
│           └── ChatAssistant/
│               ├── index.ts            # реэкспорт
│               ├── ui/
│               │   ├── ChatAssistant.tsx
│               │   ├── ChatAssistant.module.css
│               │   ├── ChatWindow.tsx
│               │   ├── ChatWindow.module.css
│               │   └── ChatMessage.tsx
│               └── lib/
│                   └── buildBeamContext.ts
│
└── backend/                            # новая папка — Node.js сервер
    ├── Dockerfile                      # Node.js + Express
    ├── .env                            # OPENAI_API_KEY (в .gitignore!)
    ├── .env.example                    # шаблон для документации
    ├── package.json
    └── src/
        └── chat.ts                     # POST /api/chat → OpenAI
```

Изменяемые существующие файлы:
- `KateDiplom/src/pages/calculator/index.tsx` — добавить `<ChatAssistant config={config} result={result} />`

---

## Шаги реализации

### Шаг 1. Backend — `backend/src/chat.ts`

Express-сервер с единственным маршрутом `POST /api/chat`.

Что делает:
- Принимает тело `{ messages: [...], beamContext: "..." }`
- Добавляет системный промпт с ролью эксперта по сопромату
- Подставляет `beamContext` в системный промпт
- Проксирует запрос к OpenAI API с ключом из `process.env.OPENAI_API_KEY`
- Возвращает ответ клиенту

Системный промпт:
```
Ты — эксперт по сопротивлению материалов. Помогаешь студентам разобраться
с расчётом балок: эпюрами поперечных сил Q, изгибающих моментов M, прогибами.
Отвечай чётко, используй формулы в тексте, объясняй физический смысл.
Текущая конфигурация балки и результаты расчёта:

{beamContext}

Отвечай на вопросы пользователя, опираясь на эти данные.
```

Важно:
- Проверять наличие `OPENAI_API_KEY` и возвращать 500 если не задан
- Ограничить историю последними 10 сообщениями (экономия токенов)
- Установить `max_tokens: 1024`
- Добавить CORS-заголовки (нужны при локальной разработке без nginx)

`backend/package.json` — зависимости:
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "openai": "^4.0.0",
    "dotenv": "^16.0.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0"
  }
}
```

---

### Шаг 2. `backend/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npx", "ts-node", "src/chat.ts"]
```

---

### Шаг 3. `KateDiplom/Dockerfile`

Двухэтапная сборка: сначала Vite строит статику, затем nginx её раздаёт.

```dockerfile
# Этап 1: сборка
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Этап 2: nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

### Шаг 4. `KateDiplom/nginx.conf`

Nginx обслуживает статику и проксирует `/api/*` на backend-контейнер.

```nginx
server {
    listen 80;

    location /api/ {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

Имя `backend` — это имя сервиса в `docker-compose.yml`, Docker разрешает его
во внутренний IP автоматически.

---

### Шаг 5. `docker-compose.yml` в корне репозитория

```yaml
services:
  frontend:
    build: ./KateDiplom
    ports:
      - "80:80"
    depends_on:
      - backend

  backend:
    build: ./backend
    env_file:
      - ./backend/.env
    expose:
      - "3001"
```

Порт 3001 бэкенда **не публикуется** наружу (`expose` вместо `ports`) —
к нему может обратиться только nginx внутри Docker-сети.

---

### Шаг 6. Функция `buildBeamContext.ts`

Принимает `BeamConfig` и `BeamResult | null`, возвращает строку ~200-400 токенов.

**Из BeamConfig:**
- Тип балки (перевести на русский: `simply-supported` → "свободно опёртая")
- Длина L, при наличии — вылет overhang, высота рамы height
- Материал: название, E (ГПа), I (см⁴)
- Все нагрузки с параметрами:
  - Точечная: `F=5000 Н @ x=2.0 м`
  - Распределённая: `q=1000 Н/м [0.0–3.0 м], равномерная`
  - Момент: `M₀=3000 Н·м @ x=1.5 м`

**Из BeamResult (ключевые значения, не массивы):**
- Реакции опор (из `reactions`)
- Максимум и минимум Q с координатами
- Максимум и минимум M с координатами
- Максимальный прогиб `maxDeflection` и его координата `maxDeflectionPosition`
- Статус верификации `verification.allPassed`

Пример вывода:
```
=== Конфигурация балки ===
Тип: свободно опёртая
Длина: 4.0 м
Материал: Сталь, E=200 ГПа, I=8.33e-6 м⁴

Нагрузки:
- Сосредоточенная сила: F=5000 Н @ x=2.0 м (вниз)

=== Результаты расчёта ===
Реакции: Ra=2500 Н, Rb=2500 Н
Эпюра Q: max=2500 Н @ x=0.0 м, min=-2500 Н @ x=4.0 м
Эпюра M: max=5000 Н·м @ x=2.0 м, min=0 Н·м
Максимальный прогиб: 3.21 мм @ x=2.0 м
Верификация: пройдена
```

---

### Шаг 7. UI-компонент `ChatAssistant.tsx`

**Состояние компонента:**
```typescript
isOpen: boolean              // открыто/закрыто окно
messages: ChatMessage[]      // история { role: 'user'|'assistant', content: string }
inputValue: string           // текущий текст в поле ввода
isLoading: boolean           // ожидание ответа от API
```

**Интерфейс пропсов:**
```typescript
interface ChatAssistantProps {
  config: BeamConfig;
  result: BeamResult | null;
}
```

**Поведение:**
- Кнопка-триггер в правом нижнем углу (фиксированная позиция)
- При клике — анимированное раскрытие окна чата (через `framer-motion`, он уже в проекте)
- Первое сообщение от ассистента при открытии: приветствие + краткое описание текущей балки
- При отправке: добавить сообщение в историю, вызвать `fetch('/api/chat')`, добавить ответ
- Автоскролл к последнему сообщению
- Отключить кнопку отправки во время `isLoading`
- Кнопка "Очистить чат"

**Визуальный стиль:**
- CSS-переменные в духе тёмного дизайна (`#0f172a`, `#1e293b`, `#334155`)
- Ширина окна: ~360px, высота: ~480px
- Сообщения пользователя — правый пузырь (синий акцент)
- Сообщения ассистента — левый пузырь (тёмный фон)
- Иконка кнопки-триггера: символ чата (из Chakra Icons)

---

### Шаг 8. Интеграция в `CalculatorPage`

В `KateDiplom/src/pages/calculator/index.tsx`:
1. Импортировать `ChatAssistant` из `@widgets/ChatAssistant`
2. Добавить в JSX:
   ```tsx
   <ChatAssistant config={config} result={result} />
   ```
   Виджет позиционирован фиксировано, место в дереве не важно.

---

## Порядок работы

| # | Задача | Файл |
|---|--------|------|
| 1 | Создать структуру `backend/` с `package.json` | `backend/` |
| 2 | Написать Express-сервер `chat.ts` | `backend/src/chat.ts` |
| 3 | Создать `backend/Dockerfile` | `backend/Dockerfile` |
| 4 | Создать `KateDiplom/Dockerfile` и `nginx.conf` | `KateDiplom/` |
| 5 | Создать `docker-compose.yml` | корень репозитория |
| 6 | Создать `buildBeamContext.ts` | `KateDiplom/src/widgets/ChatAssistant/lib/` |
| 7 | Создать UI-компоненты чата | `KateDiplom/src/widgets/ChatAssistant/ui/` |
| 8 | Добавить `<ChatAssistant>` в `CalculatorPage` | `KateDiplom/src/pages/calculator/index.tsx` |
| 9 | Локальное тестирование: `docker-compose up --build` | — |

---

## Риски и ограничения

- **Стоимость**: `gpt-4o-mini` очень дёшев (~$0.15/1M токенов input), для дипломной демонстрации расход минимален. Рекомендуется установить лимит трат в OpenAI ($5–10).
- **Безопасность ключа**: `backend/.env` добавить в `.gitignore` — ключ никогда не попадёт в репозиторий.
- **Порт бэкенда**: используется `expose`, а не `ports` — снаружи Docker-сети бэкенд недоступен, только через nginx.
- **История сообщений**: хранится только в памяти компонента (при перезагрузке теряется). Для диплома — нормально.
- **Запуск**: `docker-compose up --build` в корне репозитория — приложение доступно на `http://localhost`.
