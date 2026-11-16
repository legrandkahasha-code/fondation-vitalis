/**
 * Tests unitaires pour displayedCampusList (logique computed Angular).
 *
 * Reproduit la logique exacte de landing.component.ts lignes 623-632 :
 *   - Mobile  : filtre afficherMobile === true, slice(0, 3)
 *   - Desktop : slice(0, 4)
 *   - Liste vide : retourne []
 *
 * Aucune dépendance Angular TestBed, aucune base de données.
 */
import { describe, it, expect } from 'vitest';
import { signal, computed } from '@angular/core';

interface CampusItem {
  id: number;
  titre: string;
  afficherMobile: boolean;
}

/**
 * Reproduit fidèlement la logique du composant.
 */
function createDisplayedCampusList(
  rawCampusList: ReturnType<typeof signal<CampusItem[]>>,
  isMobileScreen: ReturnType<typeof signal<boolean>>
) {
  return computed(() => {
    const list = rawCampusList();
    if (!list || list.length === 0) return [];
    if (isMobileScreen()) {
      return list.filter((item) => Boolean(item.afficherMobile)).slice(0, 3);
    }
    return list.slice(0, 4);
  });
}

describe('displayedCampusList', () => {
  // 5 ateliers publiés : 3 avec afficherMobile=true, 2 avec afficherMobile=false
  const cinqAteliers: CampusItem[] = [
    { id: 1, titre: 'Atelier Soudure',         afficherMobile: true },
    { id: 2, titre: 'Atelier Électricité',      afficherMobile: true },
    { id: 3, titre: 'Atelier Mécanique Auto',   afficherMobile: false },
    { id: 4, titre: 'Atelier Informatique',     afficherMobile: true },
    { id: 5, titre: 'Atelier Menuiserie',       afficherMobile: false },
  ];

  it('desktop : retourne 4 éléments maximum sur 5', () => {
    const rawCampusList = signal<CampusItem[]>(cinqAteliers);
    const isMobileScreen = signal(false);
    const displayed = createDisplayedCampusList(rawCampusList, isMobileScreen);

    const result = displayed();
    expect(result).toHaveLength(4);
    expect(result.map((r) => r.id)).toEqual([1, 2, 3, 4]);
  });

  it('mobile : retourne uniquement les 3 éléments afficherMobile=true', () => {
    const rawCampusList = signal<CampusItem[]>(cinqAteliers);
    const isMobileScreen = signal(true);
    const displayed = createDisplayedCampusList(rawCampusList, isMobileScreen);

    const result = displayed();
    expect(result).toHaveLength(3);
    // Seuls les id 1, 2, 4 ont afficherMobile=true
    expect(result.map((r) => r.id)).toEqual([1, 2, 4]);
  });

  it('liste vide : retourne [] (section masquée)', () => {
    const rawCampusList = signal<CampusItem[]>([]);
    const isMobileScreen = signal(false);
    const displayed = createDisplayedCampusList(rawCampusList, isMobileScreen);

    expect(displayed()).toEqual([]);
    expect(displayed().length).toBe(0);
  });

  it('liste vide sur mobile : retourne [] (section masquée)', () => {
    const rawCampusList = signal<CampusItem[]>([]);
    const isMobileScreen = signal(true);
    const displayed = createDisplayedCampusList(rawCampusList, isMobileScreen);

    expect(displayed()).toEqual([]);
  });

  it('mobile avec plus de 3 éléments afficherMobile : tronque à 3', () => {
    const sixAteliers: CampusItem[] = [
      { id: 1, titre: 'A', afficherMobile: true },
      { id: 2, titre: 'B', afficherMobile: true },
      { id: 3, titre: 'C', afficherMobile: true },
      { id: 4, titre: 'D', afficherMobile: true },
      { id: 5, titre: 'E', afficherMobile: true },
      { id: 6, titre: 'F', afficherMobile: false },
    ];
    const rawCampusList = signal<CampusItem[]>(sixAteliers);
    const isMobileScreen = signal(true);
    const displayed = createDisplayedCampusList(rawCampusList, isMobileScreen);

    expect(displayed()).toHaveLength(3);
    expect(displayed().map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it('mobile sans aucun élément afficherMobile : retourne []', () => {
    const tousDesktop: CampusItem[] = [
      { id: 1, titre: 'A', afficherMobile: false },
      { id: 2, titre: 'B', afficherMobile: false },
    ];
    const rawCampusList = signal<CampusItem[]>(tousDesktop);
    const isMobileScreen = signal(true);
    const displayed = createDisplayedCampusList(rawCampusList, isMobileScreen);

    expect(displayed()).toEqual([]);
  });
});
