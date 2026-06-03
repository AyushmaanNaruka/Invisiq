/**
 * export-service.ts — Phase 4 / Sprint 16
 *
 * Exports conversations in JSON, Markdown, plain text, or PDF formats.
 * PDF uses Electron's webContents.printToPDF() via a temporary hidden BrowserWindow.
 * The PDF window does NOT get setContentProtection(true) — it's hidden, shows only text.
 */

import { BrowserWindow, app } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import { loadConversation } from './conversations';
import type { Conversation, ChatMessage, ExportFormat } from '@shared/types';

// ── Formatters ────────────────────────────────────────────────────────────────

function toMarkdown(conv: Conversation): string {
  const lines: string[] = [
    `# ${conv.title}`,
    ``,
    `**Mode:** ${conv.mode} | **Model:** ${conv.model}`,
    `**Created:** ${new Date(conv.createdAt).toLocaleString()}`,
    `**Updated:** ${new Date(conv.updatedAt).toLocaleString()}`,
    `**Tokens:** ${conv.totalTokens.toLocaleString()} | **Cost:** $${conv.estimatedCost.toFixed(4)}`,
    ``,
    `---`,
    ``,
  ];

  for (const msg of conv.messages) {
    if (msg.role === 'system') continue;
    const speaker = msg.role === 'user' ? '**You**' : msg.role === 'assistant' ? '**InvisiQ**' : '*Error*';
    const ts = new Date(msg.timestamp).toLocaleTimeString();
    lines.push(`### ${speaker} — ${ts}`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
    if (msg.images && msg.images.length > 0) {
      lines.push(`*${msg.images.length} image(s) attached*`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function toPlainText(conv: Conversation): string {
  const lines: string[] = [
    `${conv.title}`,
    `${'='.repeat(conv.title.length)}`,
    ``,
    `Mode: ${conv.mode} | Model: ${conv.model}`,
    `Created: ${new Date(conv.createdAt).toLocaleString()}`,
    ``,
  ];

  for (const msg of conv.messages) {
    if (msg.role === 'system') continue;
    const speaker = msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'InvisiQ' : 'Error';
    lines.push(`[${speaker}] ${new Date(msg.timestamp).toLocaleTimeString()}`);
    lines.push(msg.content);
    lines.push('');
  }

  return lines.join('\n');
}

function toJSON(conv: Conversation): string {
  return JSON.stringify(conv, null, 2);
}

function toHTML(conv: Conversation): string {
  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const msgHTML = conv.messages
    .filter((m: ChatMessage) => m.role !== 'system')
    .map((m: ChatMessage) => {
      const speaker = m.role === 'user' ? 'You' : m.role === 'assistant' ? 'InvisiQ' : 'Error';
      const ts = new Date(m.timestamp).toLocaleString();
      return `
      <div style="margin-bottom:24px">
        <div style="font-size:12px;color:#64748B;margin-bottom:4px">${speaker} · ${ts}</div>
        <div style="background:${m.role === 'user' ? '#1E3A5F' : '#1C222E'};padding:12px 16px;border-radius:8px;white-space:pre-wrap;font-size:14px;line-height:1.6">
          ${escapeHtml(m.content)}
        </div>
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(conv.title)}</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0B0E14; color: #E2E8F0; padding: 32px; max-width: 800px; margin: 0 auto; }
  h1 { color: #14B8A6; font-size: 24px; margin-bottom: 8px; }
  .meta { color: #64748B; font-size: 12px; margin-bottom: 32px; }
</style>
</head>
<body>
<h1>${escapeHtml(conv.title)}</h1>
<div class="meta">${conv.mode} · ${conv.model} · ${new Date(conv.createdAt).toLocaleString()}</div>
${msgHTML}
</body>
</html>`;
}

async function toPDF(conv: Conversation): Promise<Buffer> {
  const html = toHTML(conv);

  const pdfWin = new BrowserWindow({
    show: false,
    width: 800,
    height: 1200,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  // NOTE: intentionally NO setContentProtection — this window is hidden and shows only text

  await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await new Promise((r) => setTimeout(r, 500)); // Let renderer paint

  const pdfBuffer = await pdfWin.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
  });
  pdfWin.destroy();
  return pdfBuffer;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function exportConversationFile(
  id: string,
  format: ExportFormat
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const conv = await loadConversation(id);
    if (!conv) return { success: false, error: 'Conversation not found' };

    const safeTitle = conv.title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'conversation';
    const timestamp = new Date().toISOString().slice(0, 10);
    const downloadsDir = app.getPath('downloads');

    let content: string | Buffer;
    let ext: string;

    switch (format) {
      case 'markdown':
        content = toMarkdown(conv);
        ext = 'md';
        break;
      case 'text':
        content = toPlainText(conv);
        ext = 'txt';
        break;
      case 'json':
        content = toJSON(conv);
        ext = 'json';
        break;
      case 'pdf':
        content = await toPDF(conv);
        ext = 'pdf';
        break;
      default:
        return { success: false, error: `Unsupported format: ${format}` };
    }

    const filePath = path.join(downloadsDir, `${safeTitle}-${timestamp}.${ext}`);
    await fs.writeFile(filePath, content);
    return { success: true, path: filePath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}
