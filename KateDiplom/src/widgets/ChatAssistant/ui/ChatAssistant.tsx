import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { BeamConfig, BeamResult } from '@entities/beam';
import { buildBeamContext } from '../lib/buildBeamContext';
import type { ChatMessage } from '../lib/types';
import { ChatWindow } from './ChatWindow';
import styles from './ChatAssistant.module.css';

const BEAM_TYPE_LABELS: Record<string, string> = {
  cantilever: 'консольная',
  'simply-supported': 'свободно опёртая',
  overhang: 'с вылетом',
};

interface ChatAssistantProps {
  config: BeamConfig;
  result: BeamResult | null;
}

export function ChatAssistant({ config, result }: ChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpen = () => {
    if (messages.length === 0) {
      const typeLabel = BEAM_TYPE_LABELS[config.type] ?? config.type;
      setMessages([
        {
          role: 'assistant',
          content: `Привет! Я консультант по сопромату. Вижу вашу балку: ${typeLabel}, L = ${config.length} м. Задайте вопрос — объясню расчёты, эпюры или прогиб.`,
        },
      ]);
    }
    setIsOpen(true);
  };

  const handleSend = async (text: string) => {
    const userMessage: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const beamContext = buildBeamContext(config, result);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.slice(-10),
          beamContext,
        }),
      });

      if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);

      const data = (await response.json()) as { content: string };
      setMessages((prev) => [...prev, { role: 'assistant', content: data.content }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Произошла ошибка. Проверьте подключение и попробуйте снова.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-window"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            <ChatWindow
              messages={messages}
              isLoading={isLoading}
              onSend={handleSend}
              onClose={() => setIsOpen(false)}
              onClear={() => setMessages([])}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        className={styles.trigger}
        onClick={isOpen ? () => setIsOpen(false) : handleOpen}
        title="AI-консультант"
        aria-label="Открыть AI-консультант"
      >
        {isOpen ? '✕' : '💬'}
      </button>
    </div>
  );
}
