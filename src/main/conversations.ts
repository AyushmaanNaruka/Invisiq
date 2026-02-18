import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import type { Conversation, ConversationMeta } from '@shared/types';

// ══════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════

const CONVERSATIONS_DIR = path.join(app.getPath('userData'), 'conversations');
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ══════════════════════════════════════
//  DIRECTORY SETUP
// ══════════════════════════════════════

export async function ensureConversationsDir(): Promise<void> {
  await fs.mkdir(CONVERSATIONS_DIR, { recursive: true });
}

// ══════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════

function isValidId(id: string): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

function conversationPath(id: string): string {
  return path.join(CONVERSATIONS_DIR, `${id}.json`);
}

function generateTitle(firstUserMessage: string): string {
  const trimmed = firstUserMessage.trim();
  if (trimmed.length <= 50) return trimmed;

  const truncated = trimmed.substring(0, 50);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 20) {
    return truncated.substring(0, lastSpace) + '...';
  }
  return truncated + '...';
}

function extractPreview(conversation: Conversation): string {
  const firstAiMessage = conversation.messages.find((m) => m.role === 'assistant' && m.content);
  if (!firstAiMessage) return '';
  return firstAiMessage.content.substring(0, 100).replace(/\n/g, ' ');
}

function buildMeta(conversation: Conversation): ConversationMeta {
  const totalTokens = conversation.messages.reduce(
    (sum, m) => sum + (m.usage?.totalTokens || 0),
    0
  );

  return {
    id: conversation.id,
    title: conversation.title,
    preview: extractPreview(conversation),
    mode: conversation.mode,
    model: conversation.model,
    messageCount: conversation.messages.filter((m) => m.role !== 'error').length,
    tokenCount: totalTokens,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

// ══════════════════════════════════════
//  CRUD OPERATIONS
// ══════════════════════════════════════

export async function saveConversation(conversation: Conversation): Promise<void> {
  if (!isValidId(conversation.id)) {
    throw new Error('Invalid conversation ID');
  }

  // Auto-generate title if empty
  if (!conversation.title || conversation.title.trim() === '') {
    const firstUserMsg = conversation.messages.find((m) => m.role === 'user');
    conversation.title = firstUserMsg ? generateTitle(firstUserMsg.content) : 'Untitled';
  }

  conversation.updatedAt = new Date().toISOString();

  const filePath = conversationPath(conversation.id);
  const data = JSON.stringify(conversation, null, 2);
  await fs.writeFile(filePath, data, 'utf-8');
}

export async function loadConversation(id: string): Promise<Conversation | null> {
  if (!isValidId(id)) {
    throw new Error('Invalid conversation ID');
  }

  const filePath = conversationPath(id);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as Conversation;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function listConversations(): Promise<ConversationMeta[]> {
  await ensureConversationsDir();

  let files: string[];
  try {
    files = await fs.readdir(CONVERSATIONS_DIR);
  } catch {
    return [];
  }

  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  const metas: ConversationMeta[] = [];

  for (const file of jsonFiles) {
    try {
      const filePath = path.join(CONVERSATIONS_DIR, file);
      const data = await fs.readFile(filePath, 'utf-8');
      const conversation = JSON.parse(data) as Conversation;
      metas.push(buildMeta(conversation));
    } catch {
      // Skip corrupted files
      continue;
    }
  }

  // Sort by updatedAt descending (most recent first)
  metas.sort((a, b) => {
    const dateA = new Date(a.updatedAt).getTime();
    const dateB = new Date(b.updatedAt).getTime();
    return dateB - dateA;
  });

  return metas;
}

export async function deleteConversation(id: string): Promise<boolean> {
  if (!isValidId(id)) {
    throw new Error('Invalid conversation ID');
  }

  const filePath = conversationPath(id);
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

export async function searchConversations(query: string): Promise<ConversationMeta[]> {
  if (!query || query.trim().length === 0) {
    return listConversations();
  }

  const lowerQuery = query.toLowerCase().trim();
  await ensureConversationsDir();

  let files: string[];
  try {
    files = await fs.readdir(CONVERSATIONS_DIR);
  } catch {
    return [];
  }

  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  const results: ConversationMeta[] = [];

  for (const file of jsonFiles) {
    try {
      const filePath = path.join(CONVERSATIONS_DIR, file);
      const data = await fs.readFile(filePath, 'utf-8');
      const conversation = JSON.parse(data) as Conversation;

      // Search title
      const titleMatch = conversation.title.toLowerCase().includes(lowerQuery);

      // Search message content
      const contentMatch = conversation.messages.some(
        (m) => m.content.toLowerCase().includes(lowerQuery)
      );

      if (titleMatch || contentMatch) {
        results.push(buildMeta(conversation));
      }
    } catch {
      continue;
    }
  }

  results.sort((a, b) => {
    const dateA = new Date(a.updatedAt).getTime();
    const dateB = new Date(b.updatedAt).getTime();
    return dateB - dateA;
  });

  return results;
}

export async function exportConversation(
  id: string,
  format: 'markdown' = 'markdown'
): Promise<{ content: string; filename: string } | null> {
  const conversation = await loadConversation(id);
  if (!conversation) return null;

  if (format === 'markdown') {
    const lines: string[] = [];
    lines.push(`# ${conversation.title || 'Untitled Conversation'}`);
    lines.push('');
    lines.push(`**Mode:** ${conversation.mode} | **Model:** ${conversation.model}`);
    lines.push(`**Created:** ${new Date(conversation.createdAt).toLocaleString()}`);
    lines.push(`**Updated:** ${new Date(conversation.updatedAt).toLocaleString()}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    for (const msg of conversation.messages) {
      if (msg.role === 'error') continue;

      const label = msg.role === 'user' ? '**You**' : '**AI**';
      const time = new Date(msg.timestamp).toLocaleTimeString();
      lines.push(`### ${label} — ${time}`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');

      if (msg.usage) {
        lines.push(
          `*${msg.usage.totalTokens} tokens | $${msg.usage.estimatedCostUSD.toFixed(4)}*`
        );
        lines.push('');
      }
    }

    const safeTitle = (conversation.title || 'conversation')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    const filename = `${safeTitle}-${conversation.id.substring(0, 8)}.md`;

    return { content: lines.join('\n'), filename };
  }

  return null;
}

export async function deleteAllConversations(): Promise<number> {
  await ensureConversationsDir();

  let files: string[];
  try {
    files = await fs.readdir(CONVERSATIONS_DIR);
  } catch {
    return 0;
  }

  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  let deleted = 0;

  for (const file of jsonFiles) {
    try {
      await fs.unlink(path.join(CONVERSATIONS_DIR, file));
      deleted++;
    } catch {
      continue;
    }
  }

  return deleted;
}
