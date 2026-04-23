import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../lib/types';
import { ChatMessageBubble } from './ChatMessage';
import styles from './ChatWindow.module.css';

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => void;
  onClose: () => void;
  onClear: () => void;
}

export function ChatWindow({ messages, isLoading, onSend, onClose, onClear }: Props) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setInputValue('');
    onSend(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={styles.window}>
      <div className={styles.header}>
        <p className={styles.title}>AI-консультант по сопромату</p>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} onClick={onClear} title="Очистить чат">
            Очистить
          </button>
          <button className={styles.iconBtn} onClick={onClose} title="Закрыть">
            ✕
          </button>
        </div>
      </div>

      <div className={styles.messages}>
        {messages.map((msg, i) => (
          <ChatMessageBubble key={i} message={msg} />
        ))}
        {isLoading && (
          <div className={styles.loading}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <textarea
          className={styles.input}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Задайте вопрос... (Enter — отправить)"
          disabled={isLoading}
        />
        <button type="submit" className={styles.sendBtn} disabled={isLoading || !inputValue.trim()}>
          Отправить
        </button>
      </form>
    </div>
  );
}
