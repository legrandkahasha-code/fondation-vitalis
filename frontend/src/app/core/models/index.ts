export type UUID = string;

export interface Etablissement {
  id: string;
  nom: string;
  codeAntenne?: string;
  adresse?: string;
  pays?: string;
  statut?: 'ACTIF' | 'SUSPENDU' | 'FERME' | string;
  typeEtablissement?: string;
  parentEtablissementId?: string | null;
  parent?: { id: string; nom: string } | null;
  createdAt?: string;
  _count?: { utilisateurs: number; formations: number };
}

export interface Utilisateur {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  etablissementId: string;
  actif?: boolean;
  createdAt?: string;
  etablissement?: { nom: string };
}

export interface Formation {
  id: string;
  titre: string;
  description?: string;
  etablissementId: string;
  modules?: Module[];
  etablissement?: { nom: string };
}

export interface Module {
  id: string;
  titre: string;
  ordre: number;
  coefficient?: number;
  cours?: Cours[];
  evaluations?: Evaluation[];
  _count?: { cours: number };
}

export interface Cours {
  id: string;
  titre: string;
  contenu?: string;
  fileUrl?: string;
  moduleId?: string;
  complete?: boolean;
  module?: { formation?: Formation };
}

export interface Evaluation {
  id: string;
  titre: string;
  noteMaximale?: number;
  moduleId?: string;
  notes?: Note[];
}

export interface Note {
  id: string;
  valeur: number;
  utilisateurId: string;
  evaluationId: string;
}

export interface Certificat {
  id: string;
  numeroSerie: string;
  urlPdfS3: string;
  moyenneGenerale: number;
  dateEmission: string;
  formation?: { titre: string };
}

export interface Seance {
  id: string;
  titreActivite: string;
  typeSession: string;
  dateHeureDebut: string;
  dateHeureFin: string;
  salleOuLien?: string;
  moduleId: string;
  formateur?: { nom: string; prenom: string };
  module?: { formation?: { titre: string } };
  presences?: Presence[];
  _count?: { presences: number };
}

export interface Presence {
  seanceId: string;
  utilisateurId: string;
  statut: 'PRESENT' | 'ABSENT' | 'RETARD' | 'JUSTIFIE';
  remarqueJustification?: string;
  utilisateur?: { id: string; nom: string; prenom: string; email: string };
}

export interface KpiGlobal {
  etablissements: number;
  apprenants: number;
  formateurs: number;
  formations: number;
  certificatsEmis: number;
  seancesPlanifiees: number;
}

export interface KpiEtablissement {
  etablissementId: string;
  apprenants: number;
  formations: number;
  certificatsEmis: number;
  tauxAssiduite: number;
  tauxCompletion: number;
  moyenneGenerale: number;
}

export interface ProgressInfo {
  totalCours: number;
  totalObligatoire: number;
  completedObligatoire: number;
  completionRate: number;
}

export interface LandingPageSettings {
  id?: string;
  heroTitre: string;
  heroSousTitre: string;
  heroNumeroAgrement: string;
  heroImage?: string;
  heroBadge1Texte?: string;
  heroBadge2Texte?: string;
  heroBadge3Texte?: string;
  topbarTexte?: string;
  statsLaureats: number;
  statsTauxReussite: number;
  statsFilieres: number;
  statsTitresVerif: number;
  ctaTitre: string;
  ctaSousTitre: string;
  formationsSurMesureTitre?: string;
  formationsSurMesureDescription?: string;
  verifTitre?: string;
  verifSousTitre?: string;
  verifExempleNumero?: string;
  contactAdresse: string;
  contactEmail: string;
  contactHoraires: string;
  contactTelephone: string;
  contactWhatsapp?: string;
  whatsappMessage?: string;
  whatsappActif?: boolean;
  footerDescription?: string;
  footerTutelleTexte?: string;
  footerCopyright?: string;
  footerBarreTexte?: string;
  updatedAt?: string;
}

export interface WhatsappWidget {
  actif: boolean;
  url: string;
  numero?: string | null;
}

export interface LandingPageSection {
  id?: string;
  typeSection: 'avantage' | 'pedagogie' | 'admission' | 'secteur' | 'faq' | string;
  titre: string;
  sousTitre?: string;
  description?: string;
  ordre: number;
  couleur?: string;
  icone?: string;
  actif?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LandingPageTemoignage {
  id?: string;
  nom: string;
  initiales: string;
  role: string;
  promotion?: string;
  citation: string;
  couleur?: string;
  ordre: number;
  actif?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LandingPageActualite {
  id?: string;
  titre: string;
  chapeau?: string;
  contenu?: string;
  categorie?: string;
  imageUrl?: string;
  videoUrl?: string;
  badgeCouleur?: string;
  datePublication?: string | Date;
  auteur?: string;
  aLaUne?: boolean;
  ordre: number;
  actif?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicLandingData {
  settings: LandingPageSettings;
  sections: {
    avantages: LandingPageSection[];
    pedagogie: LandingPageSection[];
    admission: LandingPageSection[];
    secteurs: LandingPageSection[];
    faq: LandingPageSection[];
  };
  temoignages?: LandingPageTemoignage[];
  actualites?: LandingPageActualite[];
  formations: Array<{
    id: string;
    titre: string;
    description: string;
    modulesCount: number;
    createdAt?: string;
  }>;
}

export interface ContactMessageItem {
  id: string;
  nom: string;
  telephone: string;
  filiere?: string | null;
  message?: string | null;
  createdAt: string;
}

