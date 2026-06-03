/**
 * memory.ts — Phase 4 / Sprint 17
 *
 * TF-IDF based local memory store for InvisiQ.
 * Storage: userData/memory.json (atomic write: tmp file + rename)
 * Max 500 facts. Index rebuild <5ms for 500 facts.
 */

import { app } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { MemoryFact, MemorySearchResult, MemoryStats } from '@shared/types';

// ── Stop words to exclude from TF-IDF ────────────────────────────────────────
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and',
  'or', 'but', 'not', 'this', 'that', 'with', 'was', 'are', 'be', 'been',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could',
  'should', 'may', 'might', 'shall', 'i', 'you', 'he', 'she', 'we', 'they',
  'my', 'your', 'his', 'her', 'its', 'our', 'their', 'me', 'him', 'us', 'them',
  'from', 'by', 'as', 'up', 'out', 'so', 'if', 'then', 'than', 'when', 'also',
  'just', 'more', 'very', 'about', 'into', 'like', 'some', 'what', 'which',
]);

// Heuristic patterns that indicate a memorable fact
const MEMORY_PATTERNS = [
  /\bi\s+(am|prefer|like|love|hate|always|never|use|work|live)\b/i,
  /\bmy\s+(name|job|role|company|language|framework|favorite|preferred)\b/i,
  /\bremember\s+that\b/i,
  /\bi\s+(want|need|don'?t\s+want)\b/i,
  /\balways\s+(use|do|prefer|avoid)\b/i,
];

const CORRECTION_PATTERNS = [
  /\bactually\b/i,
  /\bno,?\s+that'?s\s+wrong\b/i,
  /\bincorrect\b/i,
  /\bto\s+correct\b/i,
];

// ── Tokenizer ─────────────────────────────────────────────────────────────────
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

// ── TF-IDF calculations ───────────────────────────────────────────────────────
function tf(token: string, tokens: string[]): number {
  const count = tokens.filter((t) => t === token).length;
  return count / tokens.length;
}

function idf(token: string, corpus: Map<string, number>, totalDocs: number): number {
  const docCount = corpus.get(token) ?? 0;
  return Math.log(totalDocs / (1 + docCount));
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, scoreA] of a.entries()) {
    const scoreB = b.get(term) ?? 0;
    dotProduct += scoreA * scoreB;
    normA += scoreA * scoreA;
  }
  for (const score of b.values()) {
    normB += score * score;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

// ── MemoryStore ───────────────────────────────────────────────────────────────
const MAX_FACTS = 500;
const MEMORY_FILE = 'memory.json';

export class MemoryStore {
  private facts: MemoryFact[] = [];
  private filePath: string;
  // corpus: term → number of documents containing that term
  private corpus: Map<string, number> = new Map();

  constructor() {
    this.filePath = path.join(app.getPath('userData'), MEMORY_FILE);
  }

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      this.facts = JSON.parse(raw) as MemoryFact[];
      this.rebuildIndex();
    } catch {
      this.facts = [];
    }
  }

  private async persist(): Promise<void> {
    const tmpPath = `${this.filePath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(this.facts, null, 2), 'utf-8');
    await fs.rename(tmpPath, this.filePath);
  }

  private rebuildIndex(): void {
    this.corpus.clear();
    for (const fact of this.facts) {
      const tokens = new Set(tokenize(fact.content));
      for (const token of tokens) {
        this.corpus.set(token, (this.corpus.get(token) ?? 0) + 1);
      }
    }
  }

  private getTFIDF(tokens: string[]): Map<string, number> {
    const tfidf = new Map<string, number>();
    const totalDocs = Math.max(1, this.facts.length);
    const termSet = new Set(tokens);
    for (const term of termSet) {
      const score = tf(term, tokens) * idf(term, this.corpus, totalDocs);
      if (score > 0) tfidf.set(term, score);
    }
    return tfidf;
  }

  async search(query: string, limit: number = 5): Promise<MemorySearchResult[]> {
    if (this.facts.length === 0) return [];

    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const queryVec = this.getTFIDF(queryTokens);

    const scored = this.facts
      .map((fact) => {
        const factTokens = tokenize(fact.content);
        const factVec = this.getTFIDF(factTokens);
        const score = cosineSimilarity(queryVec, factVec);
        return { fact, score };
      })
      .filter(({ score }) => score > 0.01)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map(({ fact, score }) => ({
      fact,
      score,
      relevantSnippet: fact.content.slice(0, 120),
    }));
  }

  async add(
    content: string,
    source: MemoryFact['source'] = 'user',
    tags: string[] = []
  ): Promise<string> {
    // Enforce max
    if (this.facts.length >= MAX_FACTS) {
      // Remove oldest fact
      const removed = this.facts.shift()!;
      const removedTokens = new Set(tokenize(removed.content));
      for (const token of removedTokens) {
        const cnt = this.corpus.get(token) ?? 1;
        if (cnt <= 1) this.corpus.delete(token);
        else this.corpus.set(token, cnt - 1);
      }
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const fact: MemoryFact = {
      id,
      content: content.trim(),
      source,
      extractedAt: now,
      tags,
      accessCount: 0,
      lastAccessed: now,
    };

    this.facts.push(fact);

    // Update corpus
    const tokens = new Set(tokenize(content));
    for (const token of tokens) {
      this.corpus.set(token, (this.corpus.get(token) ?? 0) + 1);
    }

    await this.persist();
    return id;
  }

  async delete(id: string): Promise<boolean> {
    const idx = this.facts.findIndex((f) => f.id === id);
    if (idx < 0) return false;

    const [removed] = this.facts.splice(idx, 1);
    const removedTokens = new Set(tokenize(removed.content));
    for (const token of removedTokens) {
      const cnt = this.corpus.get(token) ?? 1;
      if (cnt <= 1) this.corpus.delete(token);
      else this.corpus.set(token, cnt - 1);
    }

    await this.persist();
    return true;
  }

  async list(page: number = 1, limit: number = 20): Promise<{ facts: MemoryFact[]; total: number }> {
    const total = this.facts.length;
    const offset = (page - 1) * limit;
    const pageFacts = [...this.facts].reverse().slice(offset, offset + limit);
    return { facts: pageFacts, total };
  }

  async clearAll(): Promise<number> {
    const count = this.facts.length;
    this.facts = [];
    this.corpus.clear();
    await this.persist();
    return count;
  }

  async stats(): Promise<MemoryStats> {
    const sorted = [...this.facts].sort(
      (a, b) => new Date(a.extractedAt).getTime() - new Date(b.extractedAt).getTime()
    );
    return {
      totalFacts: this.facts.length,
      totalSize: JSON.stringify(this.facts).length,
      oldestFact: sorted[0]?.extractedAt ?? '',
      newestFact: sorted[sorted.length - 1]?.extractedAt ?? '',
    };
  }

  /**
   * Auto-extract memorable facts from a loaded conversation.
   * Uses heuristic sentence matching.
   */
  async extractFromConversation(conversationId: string): Promise<number> {
    try {
      const { loadConversation } = await import('./conversations');
      const conv = await loadConversation(conversationId);
      if (!conv) return 0;

      let extracted = 0;
      for (const msg of conv.messages) {
        if (msg.role !== 'user' && msg.role !== 'assistant') continue;

        const sentences = msg.content
          .split(/[.!?]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 15 && s.length < 300);

        for (const sentence of sentences) {
          const isMemoryWorthy = MEMORY_PATTERNS.some((p) => p.test(sentence));
          const isCorrection = CORRECTION_PATTERNS.some((p) => p.test(sentence));

          if (isMemoryWorthy && !isCorrection) {
            // Avoid duplicates
            const existing = await this.search(sentence, 1);
            if (existing.length === 0 || existing[0].score < 0.9) {
              await this.add(sentence, 'conversation', []);
              extracted++;
            }
          }
        }
      }

      return extracted;
    } catch (err) {
      console.error('[memory] extractFromConversation failed:', err);
      return 0;
    }
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────────
let _store: MemoryStore | null = null;

export async function initMemoryStore(): Promise<MemoryStore> {
  if (!_store) {
    _store = new MemoryStore();
    await _store.load();
  }
  return _store;
}

export function getMemoryStore(): MemoryStore | null {
  return _store;
}
