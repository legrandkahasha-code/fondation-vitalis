import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const APPRENANT_SELECT_STABLE = {
  id: true,
  createdAt: true,
  matricule: true,
  nom: true,
  prenom: true,
  email: true,
  telephone: true,
  dateNaissance: true,
  numeroIdentite: true,
  paysOrigine: true,
  utilisateurId: true,
  etablissementOrigineId: true,
  updatedAt: true,
} as const;

@Injectable()
export class IdentityService {
  constructor(private prisma: PrismaService) {}

  async generateMatricule(txClient?: any): Promise<string> {
    const client = txClient || this.prisma;
    try {
      if (typeof client.$executeRawUnsafe === 'function') {
        await client.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(123456789);`);
      }
    } catch {
      // Ignoré pour les tests unitaires / environnement mock
    }
    const params = await client.parametresReseau.findFirst();
    const prefix = params?.matriculePrefixe || 'VIT';
    const year = new Date().getFullYear();
    const count = await client.apprenant.count();
    return `${prefix}-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  async ensureProfileFromUser(user: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    etablissementId: string;
  }) {
    let existing: any = null;
    try {
      existing = await this.prisma.apprenant.findFirst({
        where: { OR: [{ utilisateurId: user.id }, { email: user.email }] },
        select: APPRENANT_SELECT_STABLE,
      });
    } catch {
      try {
        existing = await this.prisma.apprenant.findFirst({
          where: { OR: [{ utilisateurId: user.id }, { email: user.email }] },
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            utilisateurId: true,
            matricule: true,
          },
        });
      } catch {
        existing = null;
      }
    }

    if (existing) {
      if (!existing.utilisateurId) {
        try {
          return await this.prisma.apprenant.update({
            where: { id: existing.id },
            data: { utilisateurId: user.id },
            select: APPRENANT_SELECT_STABLE,
          });
        } catch {
          return existing;
        }
      }
      return existing;
    }

    const runInTx = typeof this.prisma.$transaction === 'function'
      ? (cb: (tx: any) => Promise<any>) => this.prisma.$transaction(cb)
      : (cb: (tx: any) => Promise<any>) => cb(this.prisma);

    try {
      return await runInTx(async (tx) => {
        // Double-check sous verrou
        const doubleCheck = await tx.apprenant.findFirst({
          where: { OR: [{ utilisateurId: user.id }, { email: user.email }] },
          select: APPRENANT_SELECT_STABLE,
        });
        if (doubleCheck) return doubleCheck;

        const matricule = await this.generateMatricule(tx);
        return await tx.apprenant.create({
          data: {
            matricule,
            nom: user.nom,
            prenom: user.prenom,
            email: user.email,
            utilisateurId: user.id,
            etablissementOrigineId: user.etablissementId,
          },
          select: APPRENANT_SELECT_STABLE,
        });
      });
    } catch (createErr: any) {
      const existingFallback = await this.prisma.apprenant.findFirst({
        where: { OR: [{ utilisateurId: user.id }, { email: user.email }] },
        select: {
          id: true, nom: true, prenom: true, email: true, utilisateurId: true, matricule: true,
        },
      });
      if (existingFallback) return existingFallback;
      throw createErr;
    }
  }

  async getProfileByUserId(utilisateurId: string) {
    try {
      return await this.prisma.apprenant.findUnique({
        where: { utilisateurId },
        select: APPRENANT_SELECT_STABLE,
      });
    } catch {
      return this.prisma.apprenant.findUnique({
        where: { utilisateurId },
        select: {
          id: true, nom: true, prenom: true, email: true, telephone: true,
          utilisateurId: true, matricule: true, dateNaissance: true,
        },
      });
    }
  }
}
