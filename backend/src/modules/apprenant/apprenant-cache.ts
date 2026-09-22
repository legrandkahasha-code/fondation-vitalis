/**
 * Helper de cache mémoire RAM 100% indépendant, destiné à être appelé
 * depuis PedagogieService (écritures) SANS créer de cycle d'imports.
 *
 * Partagé avec ApprenantService qui est seul à lire le cache.
 */
export class ApprenantCache {
  private static readonly store = new Map<string, { data: any; expiry: number }>();
  private static readonly DEFAULT_TTL_MS = 60 * 1000;

  // ---------------------------------------------------------------------------
  // Accesseurs bas-niveau (utilisés seulement par ApprenantService)
  // ---------------------------------------------------------------------------
  static getRawStore() {
    return ApprenantCache.store;
  }

  static get<T>(key: string): T | null {
    const entry = ApprenantCache.store.get(key);
    if (entry && entry.expiry > Date.now()) {
      return entry.data as T;
    }
    ApprenantCache.store.delete(key);
    return null;
  }

  static set<T>(key: string, data: T, ttlMs = ApprenantCache.DEFAULT_TTL_MS): T {
    ApprenantCache.store.set(key, { data, expiry: Date.now() + ttlMs });
    return data;
  }

  // ---------------------------------------------------------------------------
  // Invalidateurs (appelés depuis PedagogieService / toute écriture)
  // ---------------------------------------------------------------------------

  /**
   * Purge totale (ex: markComplete)
   */
  static invalidateAll() {
    ApprenantCache.store.clear();
  }

  /**
   * Purge ciblée par établissement — évite de jeter le cache des autres
   * antennes lorsqu'une sync ne touche qu'une ou plusieurs formations.
   */
  static invalidateParEtablissement(etablissementIds: string[]) {
    if (!etablissementIds || etablissementIds.length === 0) {
      ApprenantCache.store.clear();
      return;
    }
    const keysToDelete: string[] = [];
    for (const key of ApprenantCache.store.keys()) {
      for (const etabId of etablissementIds) {
        if (key.includes(etabId)) {
          keysToDelete.push(key);
          break;
        }
      }
    }
    for (const k of keysToDelete) ApprenantCache.store.delete(k);
  }

  /**
   * Purge par utilisateur (ex: lors d'une inscription/soumission)
   */
  static invalidateParUtilisateur(userId: string) {
    for (const key of ApprenantCache.store.keys()) {
      if (key.includes(userId)) {
        ApprenantCache.store.delete(key);
      }
    }
  }
}
