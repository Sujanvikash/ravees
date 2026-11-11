/**
 * A printed document (a quotation or an invoice) as A4 pages, for its preview and as a PDF to download or share.
 * The document's parts (its top-level blocks, and a table's rows) are laid out at the printed width and shared out
 * over pages, never cut through; a table that runs onto another page has its heading row there too. The browser draws
 * each page's parts into a picture (html-to-image), page by page, so a page holds exactly its own parts. Each page gets
 * the watermark the print has (QUOTATION) and, when there are several, "page n of m". The PDF holds those pages as
 * pictures, so it looks exactly like the preview.
 */
const MM = 96 / 25.4; // CSS pixels per millimetre
// the `quote` page in styles/index.css: A4 with 14mm margins
const A4 = { width: 210, height: 297, margin: 14 };
export const CONTENT_WIDTH = `${A4.width - 2 * A4.margin}mm`;
const SCALE = 3; // picture pixels per CSS pixel: about 290 dpi, so small print stays sharp in the PDF
// what a page holds, in CSS pixels; the parts are shared out a little short of it, as a picture lays out a touch longer
const ROOM = (A4.height - 2 * A4.margin) * MM;
const FILL = 0.97;

const decoded = (el) => Promise.all([...el.querySelectorAll('img')].map((img) => img.decode().catch(() => {})));

const dataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

// The app's web fonts (Google Fonts, in index.html) as CSS with the font files inlined, for the pictures: a picture
// can't load fonts itself, and html-to-image can't read another site's stylesheet. Only the Latin sets (with ₹), once
// a session; without them (offline) the pictures fall back to the system's fonts.
let fonts = null;
const fontCSS = () =>
  (fonts ??= (async () => {
    const link = document.querySelector('link[rel="stylesheet"][href*="fonts.googleapis.com"]');
    if (!link) return '';
    const css = await (await fetch(link.href)).text();
    const faces = css
      .split('/*')
      .filter((block) => /^\s*latin(-ext)?\s*\*\//.test(block))
      .map((block) => block.slice(block.indexOf('*/') + 2));
    const files = new Map();
    const inline = (url) => files.get(url) ?? files.set(url, fetch(url).then((r) => r.blob()).then(dataUrl)).get(url);
    const inlined = await Promise.all(
      faces.map(async (face) => {
        const url = face.match(/url\(([^)]+)\)/)?.[1];
        return url ? face.replace(url, await inline(url)) : '';
      }),
    );
    return inlined.join('\n');
  })().catch(() => {
    fonts = null; // try again next time
    return '';
  }));

/** The document element (laid out at CONTENT_WIDTH, just off screen, inside a container) → its pages, as canvases.
 *  watermark: { text, color } drawn across every page; footer: the text before "page n of m". */
export const buildPages = async (el, { watermark, footer = '' } = {}) => {
  const { toCanvas } = await import('html-to-image');
  await document.fonts.ready;
  await decoded(el);
  const fontEmbedCSS = await fontCSS();
  const origin = el.getBoundingClientRect().top;
  const y = (node, edge = 'top') => node.getBoundingClientRect()[edge] - origin;

  // the parts: each top-level block, or a table's rows (its first row with the table's top, so a heading never ends a
  // page); an overlay (an invoice's CANCELLED) goes on every page
  const parts = [];
  for (const node of el.children) {
    if (getComputedStyle(node).position === 'absolute') continue;
    const rows = node.tagName === 'TABLE' ? [...node.tBodies].flatMap((body) => [...body.rows]) : [];
    if (rows.length) rows.forEach((row, i) => parts.push({ node: row, table: node, first: i === 0, top: i ? y(row) : y(node), bottom: y(row, 'bottom') }));
    else parts.push({ node, top: y(node), bottom: y(node, 'bottom') });
  }
  const groups = [];
  for (const part of parts) {
    const page = groups.at(-1);
    if (page && part.bottom - page.top + page.head <= ROOM * FILL) page.parts.push(part);
    else {
      const head = part.table && !part.first && part.table.tHead ? part.table.tHead.getBoundingClientRect().height : 0;
      groups.push({ top: part.top, head, parts: [part] });
    }
  }

  const shots = [];
  parts.forEach((part, i) => (part.node.dataset.part = i));
  try {
    for (const group of groups) {
      const mine = new Set(group.parts.map((part) => String(parts.indexOf(part))));
      const page = el.cloneNode(true);
      page.querySelectorAll('[data-part]').forEach((node) => !mine.has(node.dataset.part) && node.remove());
      page.querySelectorAll('table').forEach((table) => ![...table.tBodies].some((body) => body.rows.length) && table.remove());
      const lead = [...page.children].find((node) => getComputedStyle(node).position !== 'absolute');
      if (lead) lead.style.marginTop = '0';
      el.after(page);
      try {
        await decoded(page);
        // a little taller than it lays out here, so the picture's slightly longer layout isn't cut off at the foot
        const live = page.getBoundingClientRect().height;
        shots.push({ live, shot: await toCanvas(page, { pixelRatio: SCALE, fontEmbedCSS, height: Math.ceil(live * 1.05) + 8 }) });
      } finally {
        page.remove();
      }
    }
  } finally {
    parts.forEach((part) => delete part.node.dataset.part);
  }

  const width = Math.round(A4.width * MM * SCALE);
  const height = Math.round(A4.height * MM * SCALE);
  const margin = A4.margin * MM * SCALE;
  return shots.map(({ live, shot }, i) => {
    const page = Object.assign(document.createElement('canvas'), { width, height });
    const ctx = page.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    if (watermark) {
      // as the print's: outlined, large, turned 35°, behind the content
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate((-35 * Math.PI) / 180);
      ctx.font = `700 ${150 * SCALE}px "Libre Baskerville", Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 1.5 * SCALE;
      ctx.strokeStyle = watermark.color;
      ctx.strokeText(watermark.text, 0, 0);
      ctx.restore();
    }
    // a page taller than the room (one very long block) is made to fit; the picture's spare foot is left off
    const fit = Math.min(1, (ROOM * FILL) / live);
    const used = Math.min(shot.height, (ROOM / fit) * SCALE);
    ctx.drawImage(shot, 0, 0, shot.width, used, margin, margin, shot.width * fit, used * fit);
    if (shots.length > 1) {
      ctx.font = `${8 * SCALE}px Geist, ui-sans-serif, sans-serif`;
      ctx.fillStyle = '#71717a';
      ctx.textAlign = 'left';
      ctx.fillText(footer, margin, height - 7 * MM * SCALE);
      ctx.textAlign = 'right';
      ctx.fillText(`Page ${i + 1} of ${shots.length}`, width - margin, height - 7 * MM * SCALE);
    }
    return page;
  });
};

const jpeg = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92)).then((blob) => blob.arrayBuffer());

/** The pages as an A4 PDF: one JPEG picture filling each page. */
export const pdfOf = async (pages) => {
  const pictures = await Promise.all(pages.map(jpeg));
  const encoder = new TextEncoder();
  const parts = [];
  const offsets = [];
  let length = 0;
  const push = (chunk) => {
    const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : new Uint8Array(chunk);
    parts.push(bytes);
    length += bytes.length;
  };
  const object = (id, body) => {
    offsets[id] = length;
    push(`${id} 0 obj\n${body}\nendobj\n`);
  };
  const [w, h] = [595.28, 841.89]; // A4 in points
  push('%PDF-1.4\n%âãÏÓ\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  pages.forEach((canvas, i) => {
    const [page, content, image] = [3 + i * 3, 4 + i * 3, 5 + i * 3];
    object(page, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /P ${image} 0 R >> >> /Contents ${content} 0 R >>`);
    const draw = `q ${w} 0 0 ${h} 0 0 cm /P Do Q`;
    object(content, `<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);
    offsets[image] = length;
    push(
      `${image} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB ` +
        `/BitsPerComponent 8 /Filter /DCTDecode /Length ${pictures[i].byteLength} >>\nstream\n`,
    );
    push(pictures[i]);
    push('\nendstream\nendobj\n');
  });
  const xref = length;
  const size = offsets.length;
  push(
    `xref\n0 ${size}\n0000000000 65535 f \n${offsets
      .slice(1)
      .map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)
      .join('')}trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`,
  );
  return new Blob(parts, { type: 'application/pdf' });
};

/** Saves the file to the computer or phone (the browser's downloads). */
export const download = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

/** Whether this browser can hand a PDF to the phone's or computer's share sheet (WhatsApp, mail…). */
export const canShareFiles = () => {
  try {
    return Boolean(navigator.canShare?.({ files: [new File([''], 'x.pdf', { type: 'application/pdf' })] }));
  } catch {
    return false;
  }
};

/** Opens the share sheet with the PDF. Resolves false when the person closes it without sharing. */
export const share = async (blob, name) => {
  try {
    await navigator.share({ files: [new File([blob], name, { type: 'application/pdf' })], title: name });
    return true;
  } catch (err) {
    if (err?.name === 'AbortError') return false;
    throw err;
  }
};
