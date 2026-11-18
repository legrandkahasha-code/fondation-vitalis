/**
 * Tests unitaires pour displayedCampusList.
 * Importe la vraie logique directement depuis landing.component.ts.
 *
 * Spécifications validées :
 * 1. 5 ateliers publiés (3 avec afficherMobile: true, 2 avec afficherMobile: false) :
 *    - Desktop (isMobile = false) : retourne 4 éléments (slice(0, 4))
 *    - Mobile (isMobile = true)   : retourne 3 éléments (filtre afficherMobile === true, slice(0, 3))
 * 2. Liste vide : retourne [] (section masquée)
 * 3. Mobile : exige strictement afficherMobile === true (les valeurs falsy/null/undefined ou non-booléennes sont exclues)
 * 4. Tronquage mobile à 3 éléments maximum si > 3 éléments sont marqués afficherMobile: true
 */
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { filterCampusList } from './landing.component';

describe('displayedCampusList - logique réelle importée de LandingComponent', () => {
  // 5 ateliers publiés dont 2 non mobiles (afficherMobile: false)
  const cinqAteliers = [
    { id: 1, titre: 'Atelier Soudure',         afficherMobile: true },
    { id: 2, titre: 'Atelier Électricité',      afficherMobile: true },
    { id: 3, titre: 'Atelier Mécanique Auto',   afficherMobile: false },
    { id: 4, titre: 'Atelier Informatique',     afficherMobile: true },
    { id: 5, titre: 'Atelier Menuiserie',       afficherMobile: false },
  ];

  it('desktop : 5 ateliers publiés dont 2 non mobiles -> retourne 4 ateliers', () => {
    const result = filterCampusList(cinqAteliers, false);
    expect(result).toHaveLength(4);
    expect(result.map((item) => item.id)).toEqual([1, 2, 3, 4]);
  });

  it('mobile : 5 ateliers publiés dont 2 non mobiles -> retourne 3 ateliers (uniquement afficherMobile === true)', () => {
    const result = filterCampusList(cinqAteliers, true);
    expect(result).toHaveLength(3);
    // Seuls les ateliers 1, 2, 4 ont afficherMobile === true
    expect(result.map((item) => item.id)).toEqual([1, 2, 4]);
  });

  it('liste vide sur desktop -> retourne [] (section masquée)', () => {
    const result = filterCampusList([], false);
    expect(result).toEqual([]);
    expect(result.length).toBe(0);
  });

  it('liste vide sur mobile -> retourne [] (section masquée)', () => {
    const result = filterCampusList([], true);
    expect(result).toEqual([]);
    expect(result.length).toBe(0);
  });

  it('null ou undefined -> retourne []', () => {
    expect(filterCampusList(null, false)).toEqual([]);
    expect(filterCampusList(undefined, true)).toEqual([]);
  });

  it('filtre mobile : exige STRICTEMENT afficherMobile === true', () => {
    const ateliersValeursDiverses = [
      { id: 10, titre: 'Strict True',        afficherMobile: true },
      { id: 11, titre: 'Falsy false',        afficherMobile: false },
      { id: 12, titre: 'Falsy null',         afficherMobile: null as any },
      { id: 13, titre: 'Falsy undefined',    afficherMobile: undefined },
      { id: 14, titre: 'Truthy non-boolean', afficherMobile: 'true' as any }, // string truthy rejetée car !== true
      { id: 15, titre: 'Truthy 1',           afficherMobile: 1 as any },      // number truthy rejeté car !== true
    ];

    const result = filterCampusList(ateliersValeursDiverses, true);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(10);
  });

  it('mobile : plus de 3 ateliers marqués afficherMobile: true -> tronque à 3 au maximum', () => {
    const sixAteliersMobiles = [
      { id: 1, titre: 'A', afficherMobile: true },
      { id: 2, titre: 'B', afficherMobile: true },
      { id: 3, titre: 'C', afficherMobile: true },
      { id: 4, titre: 'D', afficherMobile: true },
      { id: 5, titre: 'E', afficherMobile: true },
    ];
    const result = filterCampusList(sixAteliersMobiles, true);
    expect(result).toHaveLength(3);
    expect(result.map((item) => item.id)).toEqual([1, 2, 3]);
  });
});
