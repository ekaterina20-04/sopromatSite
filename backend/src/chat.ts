import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT ?? 3001;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
  beamContext: string;
}

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENAI_API_KEY (OpenRouter key) не задан' });
    return;
  }

  const { messages, beamContext } = req.body as ChatRequest;

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'Некорректный формат запроса' });
    return;
  }

  const systemPrompt = `Ты — эксперт по сопротивлению материалов. Помогаешь студентам разобраться с расчётом балок: эпюрами поперечных сил Q, изгибающих моментов M, прогибами. Отвечай чётко, используй формулы в тексте, объясняй физический смысл.

Текущая конфигурация балки и результаты расчёта:

${beamContext || 'Данные о балке отсутствуют.'}

Отвечай на вопросы пользователя, опираясь на эти данные.`;

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
  });

  try {
    const completion = await client.chat.completions.create({
      model: 'openrouter/free',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10),
      ],
      max_tokens: 1024,
    });

    const content = completion.choices[0]?.message?.content ?? '';
    res.json({ content });
  } catch (error) {
    console.error('OpenAI error:', error);
    res.status(500).json({ error: 'Ошибка при обращении к OpenAI' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
