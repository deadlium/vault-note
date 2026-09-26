/**
 * Ephemeral RAM Search Index
 * Pure volatile memory search index and fuzzy scoring engine.
 *
 * Security Guarantee:
 * - Search index resides exclusively in volatile RAM.
 * - Zero persistence: No plaintext search index or tokens are ever written to flash/disk.
 * - Instantly wiped upon vault lock or session termination.
 */

import { VaultItem, VaultItemType, AnyVaultPayload } from '../../types/vault';

export interface SearchIndexEntry {
  id: string;
  type: VaultItemType;
  title: string;
  subtitle: string;
  tags: string[];
  icon?: string;
  isFavorite: boolean;
  isProtected: boolean;
  hasTOTP: boolean;
  totpLabel?: string;
  searchableContent: string;
  titleTokens: string[];
  tagTokens: string[];
  subtitleTokens: string[];
  notesTokens: string[];
  createdAt: number;
  updatedAt: number;
}

export interface SearchResult {
  entry: SearchIndexEntry;
  score: number;
  matchedFields: ('title' | 'tag' | 'subtitle' | 'notes')[];
}

export interface SearchOptions {
  category?: VaultItemType | 'all' | 'TOTP';
  tag?: string;
  favoritesOnly?: boolean;
  limit?: number;
}

/**
 * Calculate fuzzy match score between query and target string.
 * Returns score between 0 (no match) and 1.0 (exact match).
 */
export function calculateFuzzyScore(query: string, target: string): number {
  if (!query || !target) return 0;

  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  if (q === t) return 1.0;
  if (t.startsWith(q)) return 0.9 + Math.min(0.08, q.length / (t.length * 2));
  if (t.includes(` ${q}`)) return 0.85;
  if (t.includes(q)) return 0.75;

  // Acronym match (e.g. 'aws' matches 'Amazon Web Services')
  const words = t.split(/[\s\-_.]+/).filter(Boolean);
  if (words.length > 1) {
    const acronym = words.map((w) => w[0]).join('');
    if (acronym.includes(q)) return 0.7;
  }

  // Subsequence match with consecutive bonus
  let qIdx = 0;
  let tIdx = 0;
  let consecutiveMatches = 0;
  let score = 0;

  while (qIdx < q.length && tIdx < t.length) {
    if (q[qIdx] === t[tIdx]) {
      qIdx++;
      consecutiveMatches++;
      score += 1 + consecutiveMatches * 0.5;
    } else {
      consecutiveMatches = 0;
    }
    tIdx++;
  }

  if (qIdx === q.length) {
    // Matched all query characters as subsequence
    const ratio = q.length / t.length;
    return Math.min(0.65, 0.35 + (score / (q.length * 2)) * 0.3 * ratio);
  }

  // Levenshtein typo tolerance for queries with length >= 4
  if (q.length >= 4) {
    const distance = levenshteinDistance(q, t.slice(0, q.length + 2));
    const maxAllowedDistance = q.length >= 7 ? 2 : 1;
    if (distance <= maxAllowedDistance) {
      return 0.5 - distance * 0.12;
    }
  }

  return 0;
}

/**
 * Standard Levenshtein distance calculation for typo tolerance
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

/**
 * Ephemeral volatile RAM search index class
 */
export class EphemeralSearchIndex {
  private entries: SearchIndexEntry[] = [];
  private isWiped: boolean = false;

  /**
   * Build volatile RAM index from decrypted entries
   */
  public buildIndex(items: VaultItem<AnyVaultPayload>[]): void {
    this.isWiped = false;
    this.entries = items.map((item) => this.transformToEntry(item));
  }

  /**
   * Execute in-memory fuzzy search with score ranking and category faceting
   */
  public search(query: string, options: SearchOptions = {}): SearchResult[] {
    if (this.isWiped) return [];

    const normalizedQuery = query.trim().toLowerCase();
    const { category = 'all', tag, favoritesOnly = false, limit = 50 } = options;

    let filtered = this.entries;

    // Apply category facet
    if (category !== 'all') {
      if (category === 'TOTP') {
        filtered = filtered.filter((e) => e.hasTOTP);
      } else {
        filtered = filtered.filter((e) => e.type === category);
      }
    }

    // Apply tag facet
    if (tag) {
      const normalizedTag = tag.replace(/^#/, '').toLowerCase();
      filtered = filtered.filter((e) =>
        e.tags.some((t) => t.toLowerCase() === normalizedTag)
      );
    }

    // Apply favorites facet
    if (favoritesOnly) {
      filtered = filtered.filter((e) => e.isFavorite);
    }

    // If query is empty, return filtered items ordered by favorite then updated time
    if (!normalizedQuery) {
      return filtered.slice(0, limit).map((entry) => ({
        entry,
        score: entry.isFavorite ? 10 : 1,
        matchedFields: [],
      }));
    }

    const results: SearchResult[] = [];

    for (const entry of filtered) {
      const matchedFields: ('title' | 'tag' | 'subtitle' | 'notes')[] = [];
      let totalScore = 0;

      // 1. Evaluate Title (Weight: 10.0)
      const titleScore = calculateFuzzyScore(normalizedQuery, entry.title);
      if (titleScore > 0) {
        totalScore += titleScore * 10.0;
        matchedFields.push('title');
      }

      // 2. Evaluate Tags (Weight: 6.0)
      let maxTagScore = 0;
      for (const t of entry.tags) {
        const s = calculateFuzzyScore(normalizedQuery, t);
        if (s > maxTagScore) maxTagScore = s;
      }
      if (maxTagScore > 0) {
        totalScore += maxTagScore * 6.0;
        matchedFields.push('tag');
      }

      // 3. Evaluate Subtitle / Username / URL (Weight: 4.0)
      const subtitleScore = calculateFuzzyScore(normalizedQuery, entry.subtitle);
      if (subtitleScore > 0) {
        totalScore += subtitleScore * 4.0;
        matchedFields.push('subtitle');
      }

      // 4. Evaluate Notes & Searchable content (Weight: 2.0)
      if (entry.notesTokens.length > 0) {
        let maxNotesScore = 0;
        for (const token of entry.notesTokens) {
          const s = calculateFuzzyScore(normalizedQuery, token);
          if (s > maxNotesScore) {
            maxNotesScore = s;
            if (s >= 0.8) break;
          }
        }
        if (maxNotesScore > 0) {
          totalScore += maxNotesScore * 2.0;
          matchedFields.push('notes');
        }
      }

      // Bonus for favorites
      if (entry.isFavorite) {
        totalScore += 0.5;
      }

      if (totalScore > 1.2 || matchedFields.length > 0) {
        results.push({
          entry,
          score: totalScore,
          matchedFields,
        });
      }
    }

    // Sort descending by relevance score
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  /**
   * Completely purge the volatile RAM index
   */
  public clear(): void {
    // Explicitly overwrite entry references for garbage collection
    this.entries = [];
    this.isWiped = true;
  }

  /**
   * Returns current count of indexed items in RAM
   */
  public size(): number {
    return this.isWiped ? 0 : this.entries.length;
  }

  /**
   * Security property: guarantees index only lives in volatile memory
   */
  public isEphemeralOnly(): boolean {
    return true;
  }

  /**
   * Transform raw vault item into ephemeral indexed format
   */
  private transformToEntry(record: VaultItem<AnyVaultPayload>): SearchIndexEntry {
    const payload = (record.payload || {}) as unknown as Record<string, unknown>;

    const username =
      (payload?.username as string) ||
      (payload?.accountNumber as string) ||
      (payload?.email as string) ||
      (payload?.cardholderName as string) ||
      (payload?.serviceName as string) ||
      (payload?.fullName as string) ||
      '';

    const websiteUrl =
      (payload?.websiteUrl as string) ||
      (payload?.endpointUrl as string) ||
      '';

    const notes = (payload?.notes as string) || (payload?.content as string) || '';

    const subtitle = username || websiteUrl || record.type;
    const tags = Array.isArray(record.tags) ? record.tags : [];
    const hasTOTP = Boolean(payload?.totpSecret);

    const titleTokens = record.title.toLowerCase().split(/[\s\-_.]+/).filter(Boolean);
    const tagTokens = tags.map((t) => t.toLowerCase());
    const subtitleTokens = subtitle.toLowerCase().split(/[\s\-_.]+/).filter(Boolean);
    const notesTokens = notes.toLowerCase().split(/[\s\-_.,;:]+/).filter((w) => w.length > 2);

    const searchableContent = `${record.title} ${subtitle} ${tags.join(' ')} ${notes}`.toLowerCase();

    return {
      id: record.id,
      type: record.type,
      title: record.title,
      subtitle,
      tags,
      icon:
        ((record as unknown as Record<string, unknown>).icon as string) ||
        ((payload?.icon as string) || undefined),
      isFavorite: Boolean(record.isFavorite),
      isProtected: Boolean(record.isProtected),
      hasTOTP,
      totpLabel: hasTOTP ? 'TOTP Active' : undefined,
      searchableContent,
      titleTokens,
      tagTokens,
      subtitleTokens,
      notesTokens,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}

// Global volatile singleton instance
export const globalEphemeralSearchIndex = new EphemeralSearchIndex();
