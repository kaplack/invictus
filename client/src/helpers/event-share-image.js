// The same public QR shown in the modal is embedded in the downloadable card.
export async function downloadEventShareImage({event, organizer, date, colors}) {
 const image = new Image();
 await new Promise((resolve, reject) => {
  image.onload = resolve;
  image.onerror = () => reject(new Error('No se pudo cargar el QR. Intenta nuevamente.'));
  image.src = event.qrDataUrl;
 });
 await document.fonts?.ready;
 const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
 if (!ctx) throw new Error('No se pudo generar la imagen en este navegador.');
 const width = 1080, padding = 88, contentWidth = width - padding * 2;
 const font = getComputedStyle(document.body).fontFamily || 'sans-serif';
 function lines(text, size, weight) {
  ctx.font = `${weight} ${size}px ${font}`;
  const result = []; let line = '';
  for (const word of String(text).trim().split(/\s+/)) {
   const candidate = line ? `${line} ${word}` : word;
   if (line && ctx.measureText(candidate).width > contentWidth) {
    result.push(line); line = '';
   }
   // Split only a word that cannot fit even on an empty line.
   if (ctx.measureText(word).width > contentWidth) {
    for (const char of word) {
     if (line && ctx.measureText(line + char).width > contentWidth) {
      result.push(line); line = '';
     }
     line += char;
    }
   } else line = line ? `${line} ${word}` : word;
  }
  if (line.trim()) result.push(line.trim());
  return result;
 }
 const title = lines(event.title, 58, 750);
 const organization = lines(organizer ? `Organizado por ${organizer}` : 'Organizador por confirmar', 32, 400);
 const dates = lines(date, 36, 650);
 const qrSize = 620;
 const qrY = 96 + title.length * 72 + 32 + organization.length * 44 + 28 + dates.length * 48 + 56;
 canvas.width = width; canvas.height = qrY + qrSize + 196;
 ctx.fillStyle = colors.background; ctx.fillRect(0, 0, width, canvas.height);
 ctx.fillStyle = colors.gold; ctx.fillRect(padding, 48, contentWidth, 6);
 ctx.textAlign = 'center'; ctx.textBaseline = 'top';
 function write(rows, y, size, weight, color, lineHeight) {
  ctx.font = `${weight} ${size}px ${font}`; ctx.fillStyle = color;
  rows.forEach((text, index) => ctx.fillText(text, width / 2, y + index * lineHeight));
 }
 write(title, 96, 58, 750, colors.text, 72);
 const organizerY = 96 + title.length * 72 + 32;
 write(organization, organizerY, 32, 400, colors.muted, 44);
 write(dates, organizerY + organization.length * 44 + 28, 36, 650, colors.gold, 48);
 ctx.imageSmoothingEnabled = false;
 ctx.drawImage(image, (width - qrSize) / 2, qrY, qrSize, qrSize);
 write(['Escanea para ver el evento'], qrY + qrSize + 28, 28, 400, colors.muted, 36);
 ctx.fillStyle = colors.gold; ctx.fillRect(padding, canvas.height - 88, contentWidth, 2);
 write(['Powered by invictus.com.pe'], canvas.height - 60, 28, 650, colors.gold, 36);
 const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
 if (!blob) throw new Error('No se pudo generar la imagen. Intenta nuevamente.');
 const url = URL.createObjectURL(blob), link = document.createElement('a');
 link.href = url; link.download = `${event.publicSlug}-evento.png`;
 document.body.append(link); link.click(); link.remove();
 setTimeout(() => URL.revokeObjectURL(url), 60000);
}
