import { MigrationInterface, QueryRunner } from 'typeorm'

// Phase 3: custom field definitions for CRM entities + `attributes` value bags
// on contacts and opportunities.
export class AddCrmFieldsAndAttributes1782622000000 implements MigrationInterface {
  name = 'AddCrmFieldsAndAttributes1782622000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "crm_field_defs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "entity" character varying NOT NULL, "fields" jsonb NOT NULL DEFAULT '[]', CONSTRAINT "PK_crm_field_defs" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_crm_field_defs_entity" ON "crm_field_defs" ("entity")`,
    )
    await queryRunner.query(`ALTER TABLE "contacts" ADD "attributes" jsonb NOT NULL DEFAULT '{}'`)
    await queryRunner.query(
      `ALTER TABLE "contact_opportunities" ADD "attributes" jsonb NOT NULL DEFAULT '{}'`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "contact_opportunities" DROP COLUMN "attributes"`)
    await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "attributes"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_crm_field_defs_entity"`)
    await queryRunner.query(`DROP TABLE "crm_field_defs"`)
  }
}
