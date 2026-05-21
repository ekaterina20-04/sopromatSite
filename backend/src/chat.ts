import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT ?? 3001;
const PRIMARY_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
const PRIMARY_BASE_URL = process.env.OPENAI_BASE_URL ?? 'https://api.proxyapi.ru/openai/v1';
const FALLBACK_MODEL = process.env.FALLBACK_OPENAI_MODEL;
const FALLBACK_BASE_URL = process.env.FALLBACK_OPENAI_BASE_URL;
const FALLBACK_API_KEY = process.env.FALLBACK_OPENAI_API_KEY;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
  beamContext: string;
}

function buildSystemPrompt(beamContext?: string) {
  return `Ты — AI-консультант по сопротивлению материалов для учебного приложения по расчету балок.

Отвечай на русском языке, четко и структурированно. Обычно укладывайся в 1-2 коротких абзаца. Если вопрос требует расчета или пошагового объяснения, используй компактный список и приводи только необходимые формулы. Не растягивай ответ и не уходи за пределы сопромата, эпюр Q/M/N, реакций опор, нагрузок, моментов и прогибов.

Опирайся на текущие данные балки. Если данных недостаточно, прямо скажи, чего не хватает.

Текущая конфигурация балки и результаты расчета:

${beamContext || 'Данные о балке отсутствуют.'}`;
}

function createClient(apiKey: string, baseURL: string) {
  return new OpenAI({ apiKey, baseURL });
}

function isBalanceError(error: unknown) {
  const status = typeof error === 'object' && error !== null && 'status' in error
    ? (error as { status?: number }).status
    : undefined;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return status === 402 || message.includes('insufficient balance') || message.includes('balance');
}

async function requestCompletion(params: {
  apiKey: string;
  baseURL: string;
  model: string;
  messages: Message[];
  beamContext?: string;
}) {
  const client = createClient(params.apiKey, params.baseURL);

  const completion = await client.chat.completions.create({
    model: params.model,
    messages: [
      { role: 'system', content: buildSystemPrompt(params.beamContext) },
      ...params.messages.slice(-10),
    ],
    max_tokens: 500,
    temperature: 0.3,
  });

  return completion.choices[0]?.message?.content ?? '';
}

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENAI_API_KEY не задан' });
    return;
  }

  const { messages, beamContext } = req.body as ChatRequest;

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'Некорректный формат запроса' });
    return;
  }

  try {
    const content = await requestCompletion({
      apiKey,
      baseURL: PRIMARY_BASE_URL,
      model: PRIMARY_MODEL,
      messages,
      beamContext,
    });

    res.json({ content, model: PRIMARY_MODEL, provider: 'primary' });
  } catch (error) {
    console.error('Primary LLM error:', error);

    if (isBalanceError(error) && FALLBACK_API_KEY && FALLBACK_BASE_URL && FALLBACK_MODEL) {
      try {
        const content = await requestCompletion({
          apiKey: FALLBACK_API_KEY,
          baseURL: FALLBACK_BASE_URL,
          model: FALLBACK_MODEL,
          messages,
          beamContext,
        });

        res.json({ content, model: FALLBACK_MODEL, provider: 'fallback' });
        return;
      } catch (fallbackError) {
        console.error('Fallback LLM error:', fallbackError);
      }
    }

    const message = isBalanceError(error)
      ? 'Недостаточно баланса ProxyAPI для выполнения запроса'
      : 'Ошибка при обращении к LLM';

    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
  console.log(`Primary LLM: ${PRIMARY_MODEL} at ${PRIMARY_BASE_URL}`);
  if (FALLBACK_API_KEY && FALLBACK_BASE_URL && FALLBACK_MODEL) {
    console.log(`Fallback LLM: ${FALLBACK_MODEL} at ${FALLBACK_BASE_URL}`);
  }
});
