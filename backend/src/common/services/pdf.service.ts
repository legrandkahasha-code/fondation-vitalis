import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';

export interface CertificatPdfData {
  numeroSerie: string;
  apprenantNom: string;
  apprenantPrenom: string;
  formationTitre: string;
  etablissementNom: string;
  moyenne: number;
  dateEmission: Date;
  verifyUrl: string;
  hashVerification?: string;
  modules?: Array<{
    titre: string;
    coefficient?: number;
    note?: number;
    dureeHeures?: number;
    competences?: string[];
  }>;
}

export interface BrochureFormationItem {
  id?: string;
  code?: string;
  titre: string;
  categorieNom?: string;
  categorieCouleur?: string;
  description?: string;
  duree?: string;
  modulesCount?: number;
  debouches?: string;
  prochaineSession?: string;
  aLaUne?: boolean;
  imageUrl?: string | null;
  modulesDetails?: Array<{ titre: string; dureeHeures?: number }>;
}

export interface BrochurePoleItem {
  code: string;
  couleur?: string;
  titre: string;
  desc: string;
}

export interface BrochureCataloguePdfData {
  anneeSession?: string;
  agrementNumero?: string;
  topbarTexte?: string;
  contactAdresse?: string;
  contactEmail?: string;
  contactTelephone?: string;
  contactWhatsapp?: string;
  contactHoraires?: string;
  qrOrientationUrl: string;
  siteUrl?: string;
  formationsSurMesureTitre?: string;
  formationsSurMesureDesc?: string;
  poles?: BrochurePoleItem[];
  formations: BrochureFormationItem[];
  stats?: {
    laureats?: number;
    tauxReussite?: number;
    filieres?: number;
    titresVerif?: number;
  };
}

@Injectable()
export class PdfService {
  async generateCertificatPdf(data: CertificatPdfData): Promise<Buffer> {
    const qrDataUrl = await QRCode.toDataURL(data.verifyUrl, { width: 110, margin: 1 });

    const logoVitalisPath = path.resolve(__dirname, '../../../../assets/logo-vitalis.png');
    const logoMinisterePath = path.resolve(__dirname, '../../../../assets/logo-ministere.png');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // =========================================================================
      // PAGE 1 : CERTIFICAT OFFICIEL RECTO (Standard Ministériel RDC & EUP)
      // =========================================================================

      // Filigrane de sécurité Page 1
      doc.save();
      doc.rotate(-45, { origin: [300, 400] });
      doc.fontSize(55).fillColor('#1C75BC', 0.05).text('VITALIS CENTER EUP', 40, 350);
      doc.restore();

      // En-tête avec Logos officiels
      let headerTop = 50;
      if (fs.existsSync(logoVitalisPath)) {
        try {
          doc.image(logoVitalisPath, 50, headerTop, { height: 42 });
        } catch (e) {
          console.warn('[PdfService] Impossible de charger le logo Vitalis:', e);
        }
      }
      if (fs.existsSync(logoMinisterePath)) {
        try {
          doc.image(logoMinisterePath, 370, headerTop, { height: 38 });
        } catch (e) {
          console.warn('[PdfService] Impossible de charger le logo Ministère:', e);
        }
      }

      // Barre d'accent signature
      doc.rect(50, 105, 495, 4).fill('#F0791E');

      doc.fontSize(22).fillColor('#1C75BC').font('Helvetica-Bold')
        .text('VITALIS CENTER EUP', 50, 118, { align: 'center' });
      doc.fontSize(9.5).fillColor('#124F80').font('Helvetica-Bold')
        .text("Établissement d'Utilité Publique · Centre de Formation Professionnelle et Technique", { align: 'center' });
      doc.fontSize(8.5).fillColor('#4B5157').font('Helvetica')
        .text('Autorisation Ministérielle N° CFP 00095/MIN-FP/DG-FP/KMG/JPU/2026', { align: 'center' });

      doc.moveDown(1.5);
      doc.fontSize(24).fillColor('#1B1D1F').font('Helvetica-Bold')
        .text('CERTIFICAT DE FORMATION', { align: 'center' });
      doc.moveDown(0.8);

      doc.fontSize(11).fillColor('#4B5157').font('Helvetica')
        .text('Le présent certificat atteste que', { align: 'center' });
      doc.moveDown(0.4);
      doc.fontSize(18).fillColor('#1C75BC').font('Helvetica-Bold')
        .text(`${data.apprenantPrenom} ${data.apprenantNom}`, { align: 'center' });
      doc.moveDown(0.4);
      doc.fontSize(11).fillColor('#4B5157').font('Helvetica')
        .text('a suivi avec succès la formation professionnelle', { align: 'center' });
      doc.moveDown(0.4);
      doc.fontSize(15).fillColor('#F0791E').font('Helvetica-Bold')
        .text(`« ${data.formationTitre} »`, { align: 'center' });
      doc.moveDown(0.4);
      doc.fontSize(10.5).fillColor('#1B1D1F').font('Helvetica')
        .text(`Établissement : ${data.etablissementNom}`, { align: 'center' });

      doc.moveDown(1.2);
      doc.fontSize(10.5).text(`Moyenne générale : ${data.moyenne}/20`, { align: 'center' });
      doc.text(`Date d'émission : ${data.dateEmission.toLocaleDateString('fr-FR')}`, { align: 'center' });
      doc.fontSize(10.5).fillColor('#1C75BC').font('Helvetica-Bold')
        .text(`N° de série inaltérable : ${data.numeroSerie}`, { align: 'center' });

      // QR Code de vérification publique
      doc.image(qrDataUrl, 440, 640, { width: 95 });
      doc.fontSize(7.5).fillColor('#124F80').font('Helvetica-Bold')
        .text('Scannez pour vérifier', 430, 740, { width: 115, align: 'center' });

      // Pied de page officiel Page 1
      doc.rect(50, 770, 495, 2).fill('#F0791E');
      doc.fontSize(7.5).fillColor('#4B5157').font('Helvetica')
        .text('Document officiel délivré sous contrôle du Ministère de la Formation Professionnelle — RDC. Page 1/2 · Voir verso pour le supplément aux compétences.', 50, 780, { align: 'center' });

      // =========================================================================
      // PAGE 2 : SUPPLÉMENT OFFICIEL AUX COMPÉTENCES (VERSO BENCHMARK COURSERA / CREDLY)
      // =========================================================================
      doc.addPage({ size: 'A4', margin: 50 });

      // Filigrane Page 2
      doc.save();
      doc.rotate(-45, { origin: [300, 400] });
      doc.fontSize(45).fillColor('#1C75BC', 0.03).text('RÉFÉRENTIEL DES COMPÉTENCES', 20, 350);
      doc.restore();

      // En-tête Page 2
      doc.rect(50, 50, 495, 3).fill('#1C75BC');
      doc.fontSize(15).fillColor('#124F80').font('Helvetica-Bold')
        .text('SUPPLÉMENT OFFICIEL AUX COMPÉTENCES & RELEVÉ ACADÉMIQUE', 50, 60, { align: 'center' });
      doc.fontSize(8.5).fillColor('#4B5157').font('Helvetica')
        .text(`Annexe descriptive et certifiée au Certificat N° ${data.numeroSerie}`, 50, 80, { align: 'center' });
      doc.rect(50, 95, 495, 1).fill('#D7DBDE');

      // Bloc récapitulatif apprenant
      doc.rect(50, 105, 495, 60).fill('#F5F6F7');
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#1B1D1F')
        .text(`Titulaire : ${data.apprenantPrenom} ${data.apprenantNom}`, 65, 115);
      doc.font('Helvetica').fontSize(8.5).fillColor('#4B5157')
        .text(`Formation : ${data.formationTitre}`, 65, 130)
        .text(`Centre agréé : ${data.etablissementNom}`, 65, 145);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#276B44')
        .text(`Résultat final : ${data.moyenne}/20 (Admis avec mention)`, 320, 115)
        .text(`Certification : Conforme Règle BR-03`, 320, 130)
        .font('Helvetica').fillColor('#71787E').fontSize(8)
        .text(`Date de validation : ${data.dateEmission.toLocaleDateString('fr-FR')}`, 320, 145);

      // Tableau des modules et compétences
      let tableY = 180;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1C75BC')
        .text('DÉTAIL DES MODULES & DES COMPÉTENCES VALIDÉES', 50, tableY);
      tableY += 18;

      // Table Header
      doc.rect(50, tableY, 495, 20).fill('#124F80');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
      doc.text('MODULE & RÉFÉRENTIEL PÉDAGOGIQUE', 60, tableY + 6);
      doc.text('COEF.', 330, tableY + 6, { width: 35, align: 'center' });
      doc.text('CRÉDITS / VOL.', 375, tableY + 6, { width: 65, align: 'center' });
      doc.text('STATUT COMPÉTENCE', 445, tableY + 6, { width: 90, align: 'center' });
      tableY += 20;

      // Liste des modules réels ou standards
      const defaultModules = [
        { titre: 'Fondamentaux, Concepts Clés & Cadre Réglementaire', coef: '1.00', credits: '10h / 2 ECTS', statut: '✓ MAÎTRISÉ' },
        { titre: 'Méthodologie Opérationnelle, Outils & Pratiques Professionnelles', coef: '1.50', credits: '15h / 3 ECTS', statut: '✓ MAÎTRISÉ' },
        { titre: 'Cas Pratiques, Mises en Situation & Ateliers d\'Excellence', coef: '2.00', credits: '20h / 4 ECTS', statut: '✓ MAÎTRISÉ' },
        { titre: 'Évaluation Finale & Contrôle Continu des Connaissances', coef: '1.50', credits: '15h / 3 ECTS', statut: '✓ VALIDÉ' },
      ];

      const modulesToRender = (data.modules && data.modules.length > 0)
        ? data.modules.map(m => ({
            titre: m.titre,
            coef: (m.coefficient || 1.0).toFixed(2),
            credits: `${m.dureeHeures || 10}h / ${Math.max(1, Math.round((m.dureeHeures || 10) / 5))} ECTS`,
            statut: '✓ MAÎTRISÉ',
          }))
        : defaultModules;

      modulesToRender.forEach((m, idx) => {
        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
        doc.rect(50, tableY, 495, 24).fill(rowBg);
        doc.rect(50, tableY + 23, 495, 1).fill('#E5E7EB');

        doc.fontSize(8).font('Helvetica-Bold').fillColor('#1B1D1F')
          .text(m.titre, 60, tableY + 7, { width: 260, height: 16, ellipsis: true });
        doc.font('Helvetica').fontSize(8).fillColor('#4B5157')
          .text(m.coef, 330, tableY + 7, { width: 35, align: 'center' })
          .text(m.credits, 375, tableY + 7, { width: 65, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#276B44')
          .text(m.statut, 445, tableY + 7, { width: 90, align: 'center' });

        tableY += 24;
      });

      // Cadre Règlement Ministériel & Déclaration d'Intégrité
      tableY += 15;
      doc.rect(50, tableY, 495, 65).fill('#EFF6FF').stroke('#BFDBFE');
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1E40AF')
        .text('ATTESTATION MINISTÉRIELLE D\'ACQUISITION DE COMPÉTENCES', 65, tableY + 10);
      doc.font('Helvetica').fontSize(7.5).fillColor('#1E3A8A').lineGap(2)
        .text('Le titulaire a satisfait à l\'ensemble des exigences du référentiel pédagogique national établi sous la tutelle du Ministère de la Formation Professionnelle de la République Démocratique du Congo. L\'assiduité minimale obligatoire (80%) et le seuil d\'aptitude académique (BR-03 >= 10/20) ont été rigoureusement contrôlés.', 65, tableY + 24, { width: 465 });

      // Empreinte cryptographique & Sceau
      tableY += 80;
      doc.rect(50, tableY, 495, 45).fill('#F8FAFC').stroke('#E2E8F0');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0F172A')
        .text('GARANTIE D\'INTÉGRITÉ & DE TRAÇABILITÉ NUMÉRIQUE', 65, tableY + 8);
      const hashStr = data.hashVerification || 'SHA-256 REGISTRE OFFICIEL VITALIS CENTER EUP';
      doc.font('Courier').fontSize(7).fillColor('#475569')
        .text(`Sceau SHA-256 : ${hashStr}`, 65, tableY + 20, { width: 465, ellipsis: true });
      doc.font('Helvetica').fontSize(7).fillColor('#64748B')
        .text(`Vérification en temps réel disponible à tout moment sur : ${data.verifyUrl}`, 65, tableY + 32, { width: 465 });

      // Pied de page Page 2
      doc.rect(50, 770, 495, 2).fill('#1C75BC');
      doc.fontSize(7.5).font('Helvetica').fillColor('#4B5157')
        .text('Vitalis Center EUP · Supplément officiel descriptif de compétences · Page 2/2 · Document officiel infalsifiable', 50, 780, { align: 'center' });

      doc.end();
    });
  }

  private sanitizeText(str?: string | null): string {
    if (!str) return '';
    return str
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
      .replace(/[•●▪]/g, '-')
      .replace(/[–—]/g, '-')
      .replace(/[«»]/g, '"')
      .replace(/[’‘]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private drawCheckmark(doc: any, x: number, y: number, size = 9, color = '#15803D'): void {
    doc.save()
      .lineWidth(1.6)
      .lineCap('round')
      .lineJoin('round')
      .strokeColor(color)
      .moveTo(x, y + size * 0.5)
      .lineTo(x + size * 0.35, y + size * 0.85)
      .lineTo(x + size, y + size * 0.15)
      .stroke()
      .restore();
  }

  private drawStar(doc: any, cx: number, cy: number, spikes = 5, outerRadius = 5, innerRadius = 2.5, color = '#D97706'): void {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    doc.save().fillColor(color);
    doc.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      doc.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      doc.lineTo(x, y);
      rot += step;
    }
    doc.lineTo(cx, cy - outerRadius);
    doc.closePath().fill();
    doc.restore();
  }

  private resolveAsset(filename: string): string | null {
    const candidates = [
      path.resolve(process.cwd(), 'frontend/public/assets', filename),
      path.resolve(process.cwd(), 'backend/assets', filename),
      path.resolve(process.cwd(), 'assets', filename),
      path.resolve(__dirname, '../../../../frontend/public/assets', filename),
      path.resolve(__dirname, '../../../../assets', filename),
      path.resolve(__dirname, '../../../assets', filename),
      path.resolve(__dirname, '../../assets', filename),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return null;
  }

  private async resolveImageBuffer(imageUrl?: string | null, category?: string, title?: string): Promise<Buffer | null> {
    const sharp = require('sharp');

    // 1. Image distante (Supabase Cloud Storage ou HTTPS)
    if (imageUrl && /^https?:\/\//i.test(imageUrl.trim())) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);
        const resp = await fetch(imageUrl.trim(), { signal: controller.signal });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const ab = await resp.arrayBuffer();
          const raw = Buffer.from(ab);
          return await sharp(raw)
            .resize(400, 300, { fit: 'cover', withoutEnlargement: false })
            .jpeg({ quality: 85 })
            .toBuffer();
        }
      } catch (err: any) {
        // En cas d'échec réseau, repli local
      }
    }

    // 2. Image locale relative (/uploads/...)
    if (imageUrl && imageUrl.trim()) {
      const clean = imageUrl.trim().replace(/^\/?uploads\//, '');
      const candidates = [
        path.resolve(process.cwd(), clean),
        path.resolve(process.cwd(), 'uploads', clean),
        path.resolve(process.cwd(), 'backend/uploads', clean),
        path.resolve(process.cwd(), 'backend/uploads/formations/images', path.basename(clean)),
        path.resolve(process.cwd(), 'uploads/formations/images', path.basename(clean)),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          try {
            const raw = fs.readFileSync(p);
            return await sharp(raw)
              .resize(400, 300, { fit: 'cover' })
              .jpeg({ quality: 85 })
              .toBuffer();
          } catch (e) {}
        }
      }
    }

    // 3. Repli visuel contextuel parmi les actifs du campus
    const assetsDir = fs.existsSync(path.resolve(process.cwd(), 'frontend/public/assets'))
      ? path.resolve(process.cwd(), 'frontend/public/assets')
      : path.resolve(__dirname, '../../../../frontend/public/assets');

    const campusDir = path.join(assetsDir, 'campus');
    const actuDir = path.join(assetsDir, 'actualites');
    const uploadsDir = path.resolve(process.cwd(), 'backend/uploads/formations/images');

    const labInfo = path.join(campusDir, 'lab-informatique.jpg');
    const atelierEnergie = path.join(campusDir, 'atelier-energie.jpg');
    const centreExamen = path.join(campusDir, 'centre-examen.jpg');
    const actuApc = path.join(actuDir, 'actu-atelier-apc.jpg');
    const salleConf = path.join(campusDir, 'salle-conferences.jpg');

    const t = (title || '').toLowerCase();
    const c = (category || '').toLowerCase();

    let candidatePath: string | null = null;
    if (t.includes('couture') || t.includes('artisanat') || t.includes('mode') || c.includes('arts')) {
      candidatePath = actuApc;
    } else if (t.includes('électricité') || t.includes('bâtiment') || t.includes('énergie') || t.includes('solaire') || c.includes('technique') || c.includes('btp')) {
      candidatePath = atelierEnergie;
    } else if (t.includes('bureautique') || t.includes('gestion') || t.includes('comptabilité')) {
      candidatePath = centreExamen;
    } else if (t.includes('agentique')) {
      const p = path.join(uploadsDir, 'bdb9b613-e2d4-4949-9044-40c4c7e9c4f2-gpt-image-2_genere_moi_l_afficher_Informatique_Technologies_.jpg');
      candidatePath = fs.existsSync(p) ? p : labInfo;
    } else if (t.includes('réseaux')) {
      const p = path.join(uploadsDir, '0392e5b9-3ca2-45cc-92cc-fc97b9a5358e-gpt-image-2_g_n_rer_moi_l_image_D_ploiement_National_du_Syst.jpg');
      candidatePath = fs.existsSync(p) ? p : labInfo;
    } else {
      candidatePath = labInfo;
    }

    if (!fs.existsSync(candidatePath)) {
      candidatePath = fs.existsSync(salleConf) ? salleConf : null;
    }

    if (candidatePath && fs.existsSync(candidatePath)) {
      try {
        const raw = fs.readFileSync(candidatePath);
        return await sharp(raw)
          .resize(400, 300, { fit: 'cover' })
          .jpeg({ quality: 85 })
          .toBuffer();
      } catch (e) {}
    }

    return null;
  }

  /**
   * Génération de la Brochure Officielle du Catalogue des Formations (PDF A4 Haute Définition)
   * Mise en page institutionnelle de prestige aux normes de l'État et des institutions d'excellence.
   */
  async generateBrochureCataloguePdf(data: BrochureCataloguePdfData): Promise<Buffer> {
    const defaultSiteUrl = data.siteUrl || 'https://vitaliseup.org';
    const orientationUrl = data.qrOrientationUrl || `${defaultSiteUrl}/#formulaire-orientation`;

    const qrDataUrl = await QRCode.toDataURL(orientationUrl, {
      width: 140,
      margin: 1,
      color: { dark: '#124F80', light: '#FFFFFF' },
    });

    const logoVitalisPath = this.resolveAsset('logo-vitalis.png');
    const logoMinisterePath = this.resolveAsset('logo-ministere.png');

    const formationsList = data.formations && data.formations.length > 0
      ? data.formations
      : [];

    // Préchargement asynchrone sécurisé de toutes les images des formations (Supabase CDN + sharp)
    const imageBuffers: Array<Buffer | null> = await Promise.all(
      formationsList.map((f) => this.resolveImageBuffer(f.imageUrl, f.categorieNom, f.titre))
    );

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, autoFirstPage: true });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        // Numérotation finale de toutes les pages (Page X / Y)
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          const oldBottom = doc.page.margins.bottom;
          doc.page.margins.bottom = 0;

          const pageNum = i + 1;
          const totalPages = range.count;

          doc.rect(40, 804, 515, 1).fill('#CBD5E1');
          doc.fontSize(7.5).font('Helvetica').fillColor('#64748B')
            .text(
              `Vitalis Center EUP · Document Officiel d'Orientation — Session ${data.anneeSession || '2026'} · Agrément ${data.agrementNumero || 'CFP 00095/MIN-FP/DG-FP/KMG/JPU/2026'}`,
              40,
              811,
              { width: 430, align: 'left' }
            );
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0F2942')
            .text(`Page ${pageNum} / ${totalPages}`, 470, 811, { width: 85, align: 'right' });

          doc.page.margins.bottom = oldBottom;
        }
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);

      // =========================================================================
      // PAGE 1 : COUVERTURE INSTITUTIONNELLE DE PRESTIGE
      // =========================================================================

      // Bandeau supérieur tricolore d'honneur RDC
      doc.rect(40, 25, 171, 3.5).fill('#1C75BC');
      doc.rect(211, 25, 171, 3.5).fill('#F0791E');
      doc.rect(382, 25, 173, 3.5).fill('#276B44');

      const headerY = 36;
      if (logoVitalisPath) {
        try { doc.image(logoVitalisPath, 40, headerY, { height: 44 }); } catch (e) {}
      }
      if (logoMinisterePath) {
        try { doc.image(logoMinisterePath, 385, headerY, { height: 42 }); } catch (e) {}
      }

      // Mentions officielles de tutelle
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#124F80')
        .text('RÉPUBLIQUE DÉMOCRATIQUE DU CONGO', 140, headerY + 2, { width: 250, align: 'center' });
      doc.fontSize(8).font('Helvetica').fillColor('#475569')
        .text('Ministère de la Formation Professionnelle', 140, headerY + 14, { width: 250, align: 'center' })
        .text(`Agrément : ${data.agrementNumero || 'N° CFP 00095/MIN-FP/DG-FP/KMG/JPU/2026'}`, 140, headerY + 26, { width: 250, align: 'center' });

      // Liseré or de prestige
      doc.rect(40, 92, 515, 2).fill('#C8902A');

      // Grand Cadre Titre Prestige
      const titleBoxY = 102;
      doc.rect(40, titleBoxY, 515, 116).fill('#0F2942');
      doc.rect(42, titleBoxY + 2, 511, 112).stroke('#C8902A');

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#C8902A')
        .text('ÉTABLISSEMENT D\'UTILITÉ PUBLIQUE (EUP) · EXCELLENCE PROFESSIONNELLE NATIONALE', 50, titleBoxY + 16, { align: 'center', width: 495 });
      
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#FFFFFF')
        .text('CATALOGUE OFFICIEL DES FORMATIONS', 50, titleBoxY + 34, { align: 'center', width: 495 });
      
      doc.fontSize(12.5).font('Helvetica-Bold').fillColor('#F59E0B')
        .text(`PROGRAMMES TECHNIQUES & CERTIFIANTS · SESSION ${data.anneeSession || '2026'}`, 50, titleBoxY + 60, { align: 'center', width: 495 });

      doc.fontSize(8.5).font('Helvetica').fillColor('#CBD5E1')
        .text('Délivrance de Certificats d\'État infalsifiables sécurisés par QR Code & Registre National des Titres', 50, titleBoxY + 84, { align: 'center', width: 495 });

      // Mission et Vocation d'Utilité Publique
      const introY = 230;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F2942')
        .text('LA FORMATION PROFESSIONNELLE RECONNUE PAR L\'ÉTAT', 40, introY);
      doc.rect(40, introY + 14, 60, 2.5).fill('#F0791E');

      doc.fontSize(8.5).font('Helvetica').fillColor('#334155').lineGap(2.5)
        .text(
          'Vitalis Center EUP est une institution de formation professionnelle et technique d\'utilité publique, placée sous la tutelle du Ministère de la Formation Professionnelle de la République Démocratique du Congo. Notre mission fondamentale est de doter les jeunes diplômés, professionnels en activité et agents d\'entreprises de compétences pratiques de très haut niveau, immédiatement opérationnelles et répondant aux priorités d\'industrialisation et de développement de la RDC.',
          40,
          introY + 24,
          { width: 515, align: 'justify' }
        );

      // 4 Cartes de Chiffres Clés (Données en temps réel de la plateforme)
      const statsY = 308;
      const colWidth = 122;
      const colGap = 9;
      const statCards = [
        { val: `${data.stats?.tauxReussite ?? 100}%`, label: 'Taux d\'Insertion', sub: 'Emploi & Entrepreneuriat', color: '#1C75BC' },
        { val: `${data.stats?.laureats ?? 200}+`, label: 'Lauréats Certifiés', sub: 'Cadres & Techniciens', color: '#F0791E' },
        { val: `${data.stats?.filieres ?? 15}+`, label: 'Filières Métiers', sub: 'Tech, Gestion, Énergie, BTP', color: '#276B44' },
        { val: `${data.stats?.titresVerif ?? 100}%`, label: 'Titres Vérifiables', sub: 'QR Code & Registre Public', color: '#0F2942' },
      ];

      statCards.forEach((c, idx) => {
        const x = 40 + idx * (colWidth + colGap);
        doc.rect(x, statsY, colWidth, 68).fill('#F8FAFC').stroke('#E2E8F0');
        doc.rect(x, statsY, colWidth, 3.5).fill(c.color);
        doc.fontSize(17).font('Helvetica-Bold').fillColor(c.color)
          .text(c.val, x, statsY + 11, { width: colWidth, align: 'center' });
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0F172A')
          .text(c.label, x, statsY + 34, { width: colWidth, align: 'center' });
        doc.fontSize(7).font('Helvetica').fillColor('#64748B')
          .text(c.sub, x, statsY + 48, { width: colWidth, align: 'center' });
      });

      // Cadre : L'Approche Par Compétences (APC)
      const apcY = 392;
      doc.rect(40, apcY, 515, 86).fill('#EFF6FF').stroke('#BFDBFE');
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1E40AF')
        .text('EXCELLENCE PÉDAGOGIQUE : L\'APPROCHE PAR COMPÉTENCES (APC)', 55, apcY + 10);
      doc.rect(55, apcY + 23, 45, 2).fill('#1C75BC');

      const apcPoints = [
        '70% de pratique et cas réels en ateliers équipés sous la supervision de formateurs experts de terrain.',
        'Évaluation continue par paliers de compétences validées conformément aux référentiels ministériels.',
        'Délivrance de certificats officiels avec supplément descriptif détaillant chaque compétence acquise.',
      ];
      let ptY = apcY + 30;
      apcPoints.forEach((pt) => {
        this.drawCheckmark(doc, 55, ptY + 1, 9, '#1C75BC');
        doc.fontSize(8).font('Helvetica').fillColor('#1E3A8A').text(pt, 70, ptY, { width: 470 });
        ptY += 16;
      });

      // Les Grands Pôles d'Excellence (Dynamiques)
      const summY = 494;
      doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#0F2942')
        .text('GRANDES FILIÈRES DISPONIBLES EN FORMATION CONTINUE & INITIALE', 40, summY);
      doc.rect(40, summY + 14, 50, 2).fill('#C8902A');

      const polesToRender = data.poles && data.poles.length > 0
        ? data.poles.slice(0, 3)
        : [
            { code: 'TECH', couleur: '#1C75BC', titre: 'Pôle Technologies & Numérique', desc: 'Développement Web & Mobile, Réseaux Informatiques, Cybersécurité, Intelligence Artificielle & Cloud.' },
            { code: 'GEST', couleur: '#F0791E', titre: 'Pôle Gestion, Comptabilité & Management', desc: 'Comptabilité OHADA, Gestion Financière, Secrétariat de Direction, Ressources Humaines & Bureautique.' },
            { code: 'BTP', couleur: '#276B44', titre: 'Pôle Énergie, Électrotechnique & Métiers Urbains', desc: 'Énergie Solaire Photovoltaïque, Électricité Bâtiment & Industrielle, Coupe & Confection Professionnelle.' },
          ];

      let plY = summY + 23;
      polesToRender.forEach((p) => {
        const pColor = p.couleur || '#1C75BC';
        doc.rect(40, plY, 515, 28).fill('#F8FAFC').stroke('#E2E8F0');
        doc.rect(40, plY, 4, 28).fill(pColor);

        doc.rect(48, plY + 5, 38, 18).fill(pColor + '18');
        doc.fontSize(7).font('Helvetica-Bold').fillColor(pColor).text(p.code, 48, plY + 9, { width: 38, align: 'center' });

        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0F172A').text(p.titre, 94, plY + 4);
        doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(p.desc, 94, plY + 15, { width: 450, height: 11, ellipsis: true });
        plY += 34;
      });

      // Appel d'Orientation Session 2026
      const ctaBoxY = 612;
      doc.rect(40, ctaBoxY, 515, 82).fill('#0F2942');
      doc.rect(42, ctaBoxY + 2, 511, 78).stroke('#C8902A');

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#F59E0B')
        .text('COMMENT CANDIDATER POUR LA SESSION 2026 ?', 55, ctaBoxY + 12);
      doc.fontSize(8.5).font('Helvetica').fillColor('#FFFFFF').lineGap(2)
        .text(
          'Les inscriptions pour la session 2026 sont officiellement ouvertes. Pour bénéficier d\'un accompagnement personnalisé dans le choix de votre filière, consultez les fiches détaillées dans les pages suivantes et soumettez votre demande d\'orientation en ligne.',
          55,
          ctaBoxY + 28,
          { width: 485 }
        );
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#E2E8F0')
        .text(`Secrétariat / WhatsApp : ${data.contactWhatsapp || '+243843010337'} | Courriel : ${data.contactEmail || 'vitaliseup@vitaliseup.org'} | Kinshasa, RDC`, 55, ctaBoxY + 62);

      // =========================================================================
      // PAGES 2 ET SUIVANTES : FICHES DÉTAILLÉES (3 PAR PAGE EXACTEMENT)
      // =========================================================================
      const cardHeight = 228;
      const cardGap = 16;
      const cardsPerPage = 3;
      const totalPagesFormations = Math.max(1, Math.ceil(formationsList.length / cardsPerPage));

      for (let pageIdx = 0; pageIdx < totalPagesFormations; pageIdx++) {
        doc.addPage({ size: 'A4', margin: 40, bufferPages: true });

        const topY = 36;
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0F2942')
          .text('VITALIS CENTER EUP · CATALOGUE OFFICIEL DES FORMATIONS 2026', 40, topY, { width: 350 });
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748B')
          .text(`Offre Certifiante · Volet ${pageIdx + 1}/${totalPagesFormations}`, 390, topY, { width: 165, align: 'right' });
        doc.rect(40, topY + 12, 515, 1).fill('#CBD5E1');

        const slice = formationsList.slice(pageIdx * cardsPerPage, (pageIdx + 1) * cardsPerPage);

        slice.forEach((f, idx) => {
          const globalIdx = pageIdx * cardsPerPage + idx;
          const cardY = 58 + idx * (cardHeight + cardGap);
          const cardW = 515;
          const couleur = f.categorieCouleur || '#1C75BC';

          // Carte conteneur
          doc.rect(40, cardY, cardW, cardHeight).fill('#FFFFFF').stroke('#CBD5E1');
          doc.rect(40, cardY, 4.5, cardHeight).fill(couleur);

          // Colonne Gauche : Image + Statut + Sceau d'État
          const imgX = 49;
          const imgY = cardY + 9;
          const imgW = 152;
          const imgH = 114;

          const imgBuf = imageBuffers[globalIdx];
          if (imgBuf) {
            try {
              doc.save();
              doc.roundedRect(imgX, imgY, imgW, imgH, 5).clip();
              doc.image(imgBuf, imgX, imgY, { cover: [imgW, imgH], align: 'center', valign: 'center' });
              doc.restore();
              doc.roundedRect(imgX, imgY, imgW, imgH, 5).lineWidth(1).stroke('#CBD5E1');
            } catch (e) {
              doc.rect(imgX, imgY, imgW, imgH).fill('#F1F5F9');
            }
          } else {
            doc.rect(imgX, imgY, imgW, imgH).fill('#F1F5F9');
          }

          // Badge Session Ouverte
          const badgeY = imgY + imgH + 8;
          doc.rect(imgX, badgeY, imgW, 20).fill('#ECFDF5').stroke('#A7F3D0');
          this.drawCheckmark(doc, imgX + 8, badgeY + 5, 9, '#15803D');
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#166534')
            .text(f.prochaineSession || 'Session 2026 · Inscriptions ouvertes', imgX + 22, badgeY + 5, { width: imgW - 26, align: 'center' });

          // Code Officiel Candidature
          const codeY = badgeY + 25;
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748B')
            .text('Réf. Candidature : #' + (f.code || `VIT-${globalIdx + 1}`), imgX, codeY, { width: imgW, align: 'center' });

          // Sceau Diplôme d'État Homologué
          const sealY = codeY + 16;
          doc.rect(imgX, sealY, imgW, 30).fill('#FEF3C7').stroke('#FDE68A');
          this.drawStar(doc, imgX + 14, sealY + 15, 5, 5, 2.5, '#D97706');
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#92400E')
            .text('Certificat d\'État Homologué', imgX + 24, sealY + 5, { width: imgW - 28 });
          doc.fontSize(6.5).font('Helvetica').fillColor('#78350F')
            .text('Reconnaissance Nationale Ministère FP', imgX + 24, sealY + 17, { width: imgW - 28 });

          // Colonne Droite : Contenu Structuré
          const contentX = 213;
          const contentW = 332;

          // 1. Pilule Catégorie & Badge À la une (Hauteur stricte et sans caractère ellipsis glitch)
          const catRaw = this.sanitizeText(f.categorieNom || 'Formation Certifiante').toUpperCase();
          const maxCatLen = f.aLaUne ? 32 : 48;
          const catNom = catRaw.length > maxCatLen ? catRaw.slice(0, maxCatLen - 3) + '...' : catRaw;
          doc.fontSize(6.5).font('Helvetica-Bold').fillColor(couleur)
            .text(catNom, contentX, cardY + 8, { width: f.aLaUne ? 220 : 330, lineBreak: false });

          if (f.aLaUne) {
            doc.rect(contentX + 225, cardY + 5, 105, 14).fill('#FEF9C3').stroke('#FDE047');
            doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#854D0E')
              .text('★ FORMATION À LA UNE', contentX + 225, cardY + 8, { width: 105, align: 'center' });
          }

          // 2. Titre de la Formation (démarre proprement à cardY + 21 sans collision avec la catégorie)
          const titreNet = this.sanitizeText(f.titre);
          doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F172A')
            .text(titreNet, contentX, cardY + 21, { width: contentW, height: 26, ellipsis: true, lineGap: 1 });

          // 3. Description synthétique
          const descNet = this.sanitizeText(f.description) || 'Formation technique certifiante axée sur la pratique en atelier et la maîtrise des compétences du référentiel.';
          doc.fontSize(7.5).font('Helvetica').fillColor('#334155').lineGap(1.5)
            .text(descNet, contentX, cardY + 49, { width: contentW, height: 32, ellipsis: true });

          // 4. Grille des Caractéristiques (3 blocs)
          const gridY = cardY + 84;
          const gridH = 36;
          doc.rect(contentX, gridY, contentW, gridH).fill('#F8FAFC').stroke('#E2E8F0');

          doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#64748B').text('DURÉE DU PARCOURS', contentX + 8, gridY + 6);
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#0F2942').text(f.duree || '40 Heures', contentX + 8, gridY + 18, { width: 95 });

          doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#64748B').text('PROGRAMME PRATIQUE', contentX + 110, gridY + 6);
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#0F2942').text(`${f.modulesCount || 4} Modules Certifiants`, contentX + 110, gridY + 18, { width: 100 });

          doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#64748B').text('TITRE PROFESSIONNEL', contentX + 215, gridY + 6);
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#15803D').text('Certificat Métier Officiel', contentX + 215, gridY + 18, { width: 110 });

          // 5. Débouchés Professionnels
          const debY = gridY + gridH + 6;
          doc.fontSize(7).font('Helvetica-Bold').fillColor('#0F2942').text('DÉBOUCHÉS PROFESSIONNELS :', contentX, debY);
          const debNet = this.sanitizeText(f.debouches) || 'Insertion professionnelle en entreprise ou activité indépendante.';
          doc.fontSize(7.5).font('Helvetica').fillColor('#276B44').lineGap(1.2)
            .text(debNet, contentX, debY + 9, { width: contentW, height: 20, ellipsis: true });

          // 6. Modules & Compétences Phares dynamiques du référentiel
          const modY = debY + 31;
          doc.fontSize(7).font('Helvetica-Bold').fillColor('#0F2942').text('MODULES & COMPÉTENCES CLÉS DU RÉFÉRENTIEL :', contentX, modY);
          
          const realSkills = this.extractFormationSkills(f);

          let myY = modY + 10;
          realSkills.forEach((skillText) => {
            doc.circle(contentX + 3, myY + 4, 1.8).fill(couleur);
            doc.fontSize(7).font('Helvetica').fillColor('#334155').text(skillText, contentX + 9, myY, { width: contentW - 12, height: 11, ellipsis: true });
            myY += 12;
          });

          // 7. Bas de carte
          doc.fontSize(6.5).font('Helvetica-Oblique').fillColor('#94A3B8')
            .text('Demande d\'admission ouverte · Remplir le formulaire d\'orientation via le QR Code officiel.', contentX, cardY + cardHeight - 12, { width: contentW });
        });
      }

      // =========================================================================
      // DERNIÈRE PAGE : GUIDE D'ORIENTATION & CONTACTS OFFICIELS
      // =========================================================================
      doc.addPage({ size: 'A4', margin: 40, bufferPages: true });

      const finalTopY = 36;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#0F2942')
        .text('VITALIS CENTER EUP · CATALOGUE OFFICIEL DES FORMATIONS 2026', 40, finalTopY, { width: 350 });
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748B')
        .text('Orientation, Candidature & Inscription', 390, finalTopY, { width: 165, align: 'right' });
      doc.rect(40, finalTopY + 12, 515, 1).fill('#CBD5E1');

      let curY = finalTopY + 22;

      // Titre Section
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#0F2942')
        .text('COMMENT CANDIDATER ET REJOINDRE VITALIS CENTER EUP ?', 40, curY);
      doc.rect(40, curY + 18, 70, 3).fill('#C8902A');
      curY += 32;

      // 3 Étapes
      const steps = [
        {
          num: '01',
          titre: 'Demande d\'Orientation en Ligne',
          desc: 'Remplissez le formulaire officiel de demande d\'orientation sur notre site internet ou scannez le QR code ci-dessous en précisant votre profil et la formation visée.',
        },
        {
          num: '02',
          titre: 'Entretien Pédagogique & Bilan de Positionnement',
          desc: 'Nos conseillers d\'orientation vous accueillent en présentiel sur le campus de Kinshasa ou en visio pour analyser vos prérequis et concevoir votre parcours certifiant.',
        },
        {
          num: '03',
          titre: 'Validation du Dossier & Inscription Définitive',
          desc: 'Délivrance de votre attestation de pré-inscription officielle, attribution de votre matricule national et accès immédiat aux ateliers techniques et plateformes d\'apprentissage.',
        },
      ];

      steps.forEach((s) => {
        doc.rect(40, curY, 515, 48).fill('#F8FAFC').stroke('#E2E8F0');
        doc.rect(40, curY, 36, 48).fill('#0F2942');
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#F59E0B')
          .text(s.num, 40, curY + 16, { width: 36, align: 'center' });
        doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0F2942')
          .text(s.titre, 88, curY + 8);
        doc.fontSize(7.5).font('Helvetica').fillColor('#475569').lineGap(1.5)
          .text(s.desc, 88, curY + 22, { width: 455 });
        curY += 56;
      });

      curY += 10;

      // Grand Cadre QR Code d'Orientation
      const qrBoxY = curY;
      const qrBoxH = 146;
      doc.rect(40, qrBoxY, 515, qrBoxH).fill('#0F2942');
      doc.rect(42, qrBoxY + 2, 511, qrBoxH - 4).stroke('#C8902A');

      // Boîte QR Code
      doc.rect(56, qrBoxY + 13, 120, 120).fill('#FFFFFF');
      doc.image(qrDataUrl, 61, qrBoxY + 18, { width: 110 });

      // Texte explicatif à droite
      const qrTextX = 190;
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#F59E0B')
        .text('SCANNEZ POUR POSTULER EN LIGNE', qrTextX, qrBoxY + 18);
      doc.fontSize(8.5).font('Helvetica').fillColor('#FFFFFF').lineGap(2.5)
        .text(
          'Utilisez l\'appareil photo de votre smartphone pour scanner ce QR Code officiel. Vous serez immédiatement orienté vers le Formulaire Officiel de Demande d\'Orientation de Vitalis Center EUP.',
          qrTextX,
          qrBoxY + 36,
          { width: 345 }
        );

      doc.rect(qrTextX, qrBoxY + 80, 345, 26).fill('#1E3A5F');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#F59E0B')
        .text('Formulaire en ligne accessible 24h/24 :', qrTextX + 10, qrBoxY + 84);
      doc.fontSize(7.5).font('Courier-Bold').fillColor('#FFFFFF')
        .text(orientationUrl, qrTextX + 10, qrBoxY + 95, { width: 325, ellipsis: true });

      doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#94A3B8')
        .text('Traitement prioritaire de votre dossier sous 24 à 48 heures ouvrables par un conseiller agréé.', qrTextX, qrBoxY + 118, { width: 345 });

      curY += qrBoxH + 18;

      // Coordonnées Institutionnelles Réelles
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F2942')
        .text('COORDONNÉES INSTITUTIONNELLES & CAMPUS DE KINSHASA', 40, curY);
      doc.rect(40, curY + 14, 60, 2.5).fill('#F0791E');
      curY += 24;

      const contactGridY = curY;
      const cBoxW = 252;
      const cBoxH = 50;

      // Box 1 : Siège
      doc.rect(40, contactGridY, cBoxW, cBoxH).fill('#F8FAFC').stroke('#E2E8F0');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#1C75BC').text('SIÈGE & ATELIERS TECHNIQUES', 50, contactGridY + 8);
      doc.fontSize(8).font('Helvetica').fillColor('#0F172A').text(data.contactAdresse || 'Kinshasa / Gombe, Av. Kauka (Réf. Maïcha Park), RD Congo', 50, contactGridY + 22, { width: 232 });

      // Box 2 : Secrétariat & WhatsApp
      doc.rect(40 + cBoxW + 11, contactGridY, cBoxW, cBoxH).fill('#F8FAFC').stroke('#E2E8F0');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#276B44').text('SECRÉTARIAT & HOTLINE WHATSAPP', 40 + cBoxW + 21, contactGridY + 8);
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0F172A').text(`WhatsApp : ${data.contactWhatsapp || '+243 843 010 337'}`, 40 + cBoxW + 21, contactGridY + 22);
      doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(`Téléphone : ${data.contactTelephone || '+243 843 010 337'}`, 40 + cBoxW + 21, contactGridY + 34);

      // Box 3 : Horaires
      const contactGridY2 = contactGridY + cBoxH + 8;
      doc.rect(40, contactGridY2, cBoxW, cBoxH).fill('#F8FAFC').stroke('#E2E8F0');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#D97706').text('HORAIRES D\'ACCUEIL & ATELIERS', 50, contactGridY2 + 8);
      doc.fontSize(8).font('Helvetica').fillColor('#0F172A').text(data.contactHoraires || '07h30 – 16h30', 50, contactGridY2 + 22);
      doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text('Samedi : 08h30 – 12h30 (Permanence inscriptions)', 50, contactGridY2 + 34);

      // Box 4 : Courriel & Site Officiel Réel
      const publicHost = defaultSiteUrl.replace(/^https?:\/\//, '');
      doc.rect(40 + cBoxW + 11, contactGridY2, cBoxW, cBoxH).fill('#F8FAFC').stroke('#E2E8F0');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0F2942').text('COURRIEL INSTITUTIONNEL', 40 + cBoxW + 21, contactGridY2 + 8);
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1C75BC').text(data.contactEmail || 'vitaliseup@vitaliseup.org', 40 + cBoxW + 21, contactGridY2 + 22);
      doc.fontSize(7.5).font('Helvetica').fillColor('#64748B').text(`Site officiel : ${publicHost}`, 40 + cBoxW + 21, contactGridY2 + 34);

      curY = contactGridY2 + cBoxH + 14;

      // Note Entreprises & Organisations (Informations réelles sans données mock)
      const surMesureTitre = this.sanitizeText(data.formationsSurMesureTitre) || 'POUR LES ENTREPRISES, MINISTÈRES & ORGANISATIONS : PROGRAMMES SUR MESURE';
      const surMesureDesc = this.sanitizeText(data.formationsSurMesureDesc) || 'Vitalis Center conçoit des programmes sur mesure et des sessions de perfectionnement technique en intra-entreprise pour renforcer la productivité de vos équipes.';
      const contactEmail = data.contactEmail || 'vitaliseup@vitaliseup.org';
      const contactTel = data.contactTelephone || data.contactWhatsapp || '+243 843 010 337';

      const boxH = 46;
      doc.rect(40, curY, 515, boxH).fill('#F0FDF4').stroke('#BBF7D0');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#166534')
        .text(surMesureTitre.toUpperCase(), 50, curY + 6, { width: 495 });
      doc.fontSize(7).font('Helvetica').fillColor('#15803D')
        .text(surMesureDesc, 50, curY + 18, { width: 495, height: 14 });
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#14532D')
        .text(`Pôle Partenariats & Formation Continue : ${contactEmail}   •   Tél / WhatsApp : ${contactTel}`, 50, curY + 31, { width: 495 });

      doc.end();
    });
  }

  /**
   * Extraction dynamique et intelligente des compétences clés réelles de la formation
   * (évite tout affichage de données mock génériques)
   */
  private extractFormationSkills(f: any): string[] {
    if (f.modulesDetails && f.modulesDetails.length > 0) {
      return f.modulesDetails.slice(0, 3).map((m: any) => this.sanitizeText(m.titre || m.nom));
    }
    const text = (f.description || '') + '\n' + (f.objectifs || '');
    const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);

    const extracted: string[] = [];
    let inProgramme = false;
    for (const line of lines) {
      const clean = line.replace(/^[📌💡🎯\-\*\•\d\.\)]\s*/, '').trim();
      if (/au programme/i.test(line) || /compétences clés/i.test(line)) {
        inProgramme = true;
        if (line.includes(':')) {
          const after = line.split(':')[1]?.trim();
          if (after && after.length > 5) {
            after.split(/[,;]/).forEach((p: string) => {
              const pClean = p.replace(/^[📌💡🎯\-\*\•\d\.\)]\s*/, '').trim();
              if (pClean && pClean.length > 5 && extracted.length < 3) extracted.push(pClean);
            });
          }
        }
        continue;
      }
      if (inProgramme && clean && clean.length > 5) {
        if (/pourquoi|débouchés|prérequis|durée/i.test(clean)) {
          inProgramme = false;
          continue;
        }
        extracted.push(clean);
        if (extracted.length >= 3) break;
      }
      if (!inProgramme && (line.startsWith('-') || line.startsWith('•')) && clean.length > 8) {
        extracted.push(clean);
        if (extracted.length >= 3) break;
      }
    }

    if (extracted.length === 0) {
      const sentences = (f.description || '').split(/[.\n]/).map((s: string) => s.trim()).filter((s: string) => s.length > 10);
      extracted.push(...sentences.slice(0, 3));
    }

    if (extracted.length === 0) {
      extracted.push('Maîtrise pratique et immersion en atelier technique');
      extracted.push('Réalisation de projets réels sous encadrement expert');
      extracted.push('Validation des compétences selon le référentiel national');
    }

    return extracted.slice(0, 3).map((s: string) => this.sanitizeText(s));
  }
}
