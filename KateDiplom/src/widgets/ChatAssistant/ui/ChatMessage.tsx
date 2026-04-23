import type { ChatMessage } from '../lib/types';
import styles from './ChatWindow.module.css';

interface Props {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: Props) {
  return (
    <div className={`${styles.message} ${styles[message.role]}`}>
      <p className={styles.messageText}>{message.content}</p>
    </div>
  );
}
