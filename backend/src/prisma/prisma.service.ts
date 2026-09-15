
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { join } from 'path';

const envFiles = [join(process.cwd(), '.env'), join(process.cwd(), 'backend', '.env')];
for (const envPath of envFiles) {
  dotenv.config({ path: envPath, override: false });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static pool: Pool;
  private static adapter: PrismaPg;
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    if (!PrismaService.pool) {
      const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL or DIRECT_URL must be defined in the environment.');
      }
      PrismaService.pool = new Pool({
        connectionString,
        connectionTimeoutMillis: 20000,
        idleTimeoutMillis: 30000,
        max: 20,
        keepAlive: true,
        ssl: { rejectUnauthorized: false },
      });
      // Éviter que les déconnexions transitoires du pooler Supabase (idle timeout) ne fassent planter l'application
      PrismaService.pool.on('error', (err) => {
        this.logger.warn(`Déconnexion transitoire du pool PostgreSQL (reconnexion automatique) : ${err.message}`);
      });
      PrismaService.adapter = new PrismaPg(PrismaService.pool);
    }
    super({ adapter: PrismaService.adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connecté à la base de données PostgreSQL (Supabase) avec succès.');
    } catch (err: any) {
      this.logger.error('Erreur de connexion à la base de données:', err?.message || err);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    if (PrismaService.pool) {
      await PrismaService.pool.end();
    }
  }
}
