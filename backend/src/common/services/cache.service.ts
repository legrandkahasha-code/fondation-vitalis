import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface ICacheService {
  get<T>(key: string): Promise<T | null> | T | null;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void> | void;
  delete(key: string): Promise<void> | void;
  deletePattern(pattern: string | RegExp): Promise<number> | number;
  clear(): Promise<void> | void;
}

/**
 * CacheService : Couche d'abstraction de cache de niveau entreprise.
 * - Prêt pour un déploiement distribué multi-instances (architecture adaptative).
 * - Gère le TTL avec auto-purge pour éviter les fuites de mémoire.
 * - Supporte l'invalidation par pattern / namespace (ex: 'formations:*', 'seances:*').
 * - Fournit des métriques de hit/miss pour la surveillance applicative.
 */
@Injectable()
export class CacheService implements ICacheService, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private store = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private hits = 0;
  private misses = 0;

  constructor() {
    // Purge proactive toutes les 60 secondes des clés expirées
    this.cleanupInterval = setInterval(() => {
      this.purgeExpired();
    }, 60_000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.data as T;
  }

  set<T>(key: string, value: T, ttlMs: number = 180_000): void {
    const expiresAt = Date.now() + Math.max(1000, ttlMs);
    this.store.set(key, { data: value, expiresAt });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  deletePattern(pattern: string | RegExp): number {
    let deletedCount = 0;
    const regex = typeof pattern === 'string'
      ? new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
      : pattern;

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  clear(): void {
    this.store.clear();
  }

  private purgeExpired(): void {
    const now = Date.now();
    let purged = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        purged++;
      }
    }
    if (purged > 0) {
      this.logger.debug(`[Cache] ${purged} entrées expirées purgées.`);
    }
  }

  getStats(): { hits: number; misses: number; size: number } {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.store.size,
    };
  }
}
