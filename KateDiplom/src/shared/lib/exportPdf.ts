/**
 * Экспорт эпюр в PDF формата A4 альбомная ориентация.
 * Включает: эпюры, таблицу характерных значений, результат верификации.
 */
import type { BeamConfig, BeamResult } from '@entities/beam';

function fmt(val: number, unit: string): string {
  if (Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(2)} M${unit}`;
  if (Math.abs(val) >= 1e3) return `${(val / 1e3).toFixed(2)} k${unit}`;
  return `${val.toFixed(2)} ${unit}`;
}

export async function exportDiagramsToPDF(
  container: HTMLElement,
  config?: BeamConfig,
  result?: BeamResult,
): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Заголовок
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SopromatLab – otchet po raschyotu balki', pageWidth / 2, 15, { align: 'center' });

  // Дата
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const now = new Date();
  const dateStr = now.toLocaleString('ru-RU');
  pdf.text(`Data: ${dateStr}`, pageWidth / 2, 22, { align: 'center' });

  // Изображение диаграмм
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height / canvas.width) * imgWidth;
  let yOffset = 28;

  if (imgHeight + yOffset <= pageHeight - 40) {
    pdf.addImage(imgData, 'PNG', 10, yOffset, imgWidth, imgHeight);
    yOffset += imgHeight + 5;
  } else {
    const scale = (pageHeight - yOffset - 40) / imgHeight;
    pdf.addImage(imgData, 'PNG', 10, yOffset, imgWidth * scale, imgHeight * scale);
    yOffset += imgHeight * scale + 5;
  }

  // Таблица характерных значений
  if (config && result) {
    // Если не хватает места — новая страница
    if (yOffset > pageHeight - 50) {
      pdf.addPage();
      yOffset = 15;
    }

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Kharakternyye znacheniya', 10, yOffset);
    yOffset += 6;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    const maxMIdx = result.M.reduce((b, v, i) => (Math.abs(v) > Math.abs(result.M[b]) ? i : b), 0);
    const maxQIdx = result.Q.reduce((b, v, i) => (Math.abs(v) > Math.abs(result.Q[b]) ? i : b), 0);

    const rows = [
      [`Tip: ${config.type}`, `L = ${config.length} m`, `E = ${fmt(config.material.E, 'Pa')}`, `I = ${config.material.I.toExponential(3)} m^4`],
      [`Q_max = ${fmt(result.Q[maxQIdx], 'N')} pri x=${result.x[maxQIdx].toFixed(2)} m`, `M_max = ${fmt(result.M[maxMIdx], 'N*m')} pri x=${result.x[maxMIdx].toFixed(2)} m`, `v_max = ${(result.maxDeflection * 1000).toFixed(4)} mm`, ``],
    ];

    // Реакции
    const reactionParts: string[] = [];
    for (const [k, v] of Object.entries(result.reactions)) {
      reactionParts.push(`${k} = ${fmt(v, k.includes('M') || k.includes('m') ? 'N*m' : 'N')}`);
    }
    rows.push(reactionParts);

    for (const row of rows) {
      const lineText = row.filter(Boolean).join('    ');
      pdf.text(lineText, 10, yOffset);
      yOffset += 4.5;
    }

    // Верификация
    if (result.verification) {
      yOffset += 3;
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Verifikatsiya (Zhuravskiy): ${result.verification.allPassed ? 'OK' : 'WARN'}`, 10, yOffset);
      yOffset += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.text(`dM/dx = Q: RMS ${(result.verification.dMdx_rms_error * 100).toFixed(1)}%`, 10, yOffset);
      yOffset += 4;
      pdf.text(`SumF residual: ${result.verification.equilibrium_force_residual.toFixed(4)} N`, 10, yOffset);
      yOffset += 4;
      pdf.text(`SumM residual: ${result.verification.equilibrium_moment_residual.toFixed(4)} N*m`, 10, yOffset);
    }
  }

  pdf.save(`sopromat-report-${Date.now()}.pdf`);
}
