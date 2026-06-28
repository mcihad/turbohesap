import { MigrationInterface, QueryRunner } from 'typeorm'

// Phase 4: CRM integration connections (email/Telegram/WhatsApp/SMS/AI).
export class AddCrmIntegrations1782623000000 implements MigrationInterface {
  name = 'AddCrmIntegrations1782623000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "crm_integrations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "type" character varying NOT NULL, "name" character varying NOT NULL DEFAULT '', "is_active" boolean NOT NULL DEFAULT false, "config" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_crm_integrations" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_crm_integrations_type" ON "crm_integrations" ("type")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_crm_integrations_type"`)
    await queryRunner.query(`DROP TABLE "crm_integrations"`)
  }
}
