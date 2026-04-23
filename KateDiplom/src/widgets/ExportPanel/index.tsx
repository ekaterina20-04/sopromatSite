import { useState } from 'react';
import { Tooltip } from '@chakra-ui/react';
import type { BeamConfig, BeamResult } from '@entities/beam';
import { generateShareUrl, exportDiagramsToPDF } from '@shared/lib';
import styles from './ExportPanel.module.css';

interface Props {
  config: BeamConfig;
  result?: BeamResult | null;
}

export function ExportPanel({ config, result }: Props) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleCopyLink() {
    const url = generateShareUrl(config);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleExportPDF() {
    const container = document.getElementById('diagram-export-container');
    if (!container) return;
    setExporting(true);
    try {
      await exportDiagramsToPDF(container as HTMLElement, config, result ?? undefined);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={styles.panel}>
      <Tooltip label="Скопировать ссылку на текущую конфигурацию балки для отправки другу." hasArrow>
        <button className={styles.btn} onClick={handleCopyLink} type="button">
          {copied ? '✓ Скопировано!' : '🔗 Поделиться'}
        </button>
      </Tooltip>
      <Tooltip label="Экспортировать эпюры и схему в PDF-отчёт (A4, альбомная ориентация)." hasArrow>
        <button
          className={`${styles.btn} ${styles.pdfBtn}`}
          onClick={handleExportPDF}
          disabled={exporting}
          type="button"
        >
          {exporting ? 'Экспорт...' : '📄 Экспорт PDF'}
        </button>
      </Tooltip>
    </div>
  );
}
