/**
 * Bus d'Événements du Domaine Vitalis Center EUP (@nestjs/event-emitter)
 * Permet le découplage asynchrone des flux métiers, notifications, génération PDF et invalidations de cache.
 */

export class CertificatDemandeAsyncEvent {
  constructor(
    public readonly formationId: string,
    public readonly utilisateurId: string,
    public readonly moyenne: number,
  ) {}
}

export class CertificatEmisAsyncEvent {
  constructor(
    public readonly certificatId: string,
    public readonly utilisateurId: string,
    public readonly numeroSerie: string,
    public readonly urlPdf: string,
  ) {}
}

export class CursusAjourneEvent {
  constructor(
    public readonly formationId: string,
    public readonly apprenantId: string,
    public readonly moyennePonderee: number,
    public readonly modulesEchoues: Array<{ id: string; titre: string; note: number | null }>,
  ) {}
}

export class RattrapagePlanifieEvent {
  constructor(
    public readonly sessionId: string,
    public readonly moduleId: string,
    public readonly formationId: string,
    public readonly formateurId: string,
    public readonly dateSession: Date,
  ) {}
}

export class NoteRattrapageSaisieEvent {
  constructor(
    public readonly inscriptionId: string,
    public readonly apprenantId: string,
    public readonly moduleId: string,
    public readonly formationId: string,
    public readonly noteInitiale: number,
    public readonly noteRattrapage: number,
    public readonly noteRetenue: number,
    public readonly nouvelleMoyennePonderee: number,
  ) {}
}

export class FormationTermineeEvent {
  constructor(
    public readonly formationId: string,
    public readonly apprenantId: string,
    public readonly moyennePonderee: number,
  ) {}
}

export class HabilitationAccordeeEvent {
  constructor(
    public readonly habilitationId: string,
    public readonly formateurId: string,
    public readonly discipline: string,
  ) {}
}

export class AffectationFormateurCreeeEvent {
  constructor(
    public readonly affectationId: string,
    public readonly moduleId: string,
    public readonly formateurId: string,
    public readonly volumeCmHeures: number,
    public readonly volumeTdHeures: number,
    public readonly volumeTpHeures: number,
  ) {}
}

export class EnqueteSatisfactionSoumiseEvent {
  constructor(
    public readonly enqueteId: string,
    public readonly formationId: string,
    public readonly formateurId: string,
    public readonly scoreGlobal: number,
    public readonly typeEnquete: 'A_CHAUD' | 'A_FROID',
  ) {}
}
