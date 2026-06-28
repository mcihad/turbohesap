import { MigrationInterface, QueryRunner } from 'typeorm'

// CRM pipelines & stages (user-definable deal stages). Converts the fixed
// opportunity stage enum to a stage FK: creates the default "Satış Süreci"
// pipeline whose stage keys mirror the legacy enum, then backfills every
// existing opportunity. Also adds a sales owner to contacts.
const PIPELINE_ID = '0a000000-0000-4000-8000-000000000001'
const STAGES: Array<{ id: string; name: string; key: string; prob: number; type: string; color: string }> = [
  { id: '0a000000-0000-4000-8000-000000000011', name: 'Ön görüşme', key: 'prospecting', prob: 10, type: 'open', color: '#94a3b8' },
  { id: '0a000000-0000-4000-8000-000000000012', name: 'Niteleme', key: 'qualification', prob: 25, type: 'open', color: '#38bdf8' },
  { id: '0a000000-0000-4000-8000-000000000013', name: 'Teklif', key: 'proposal', prob: 50, type: 'open', color: '#6366f1' },
  { id: '0a000000-0000-4000-8000-000000000014', name: 'Pazarlık', key: 'negotiation', prob: 75, type: 'open', color: '#f59e0b' },
  { id: '0a000000-0000-4000-8000-000000000015', name: 'Kazanıldı', key: 'won', prob: 100, type: 'won', color: '#22c55e' },
  { id: '0a000000-0000-4000-8000-000000000016', name: 'Kaybedildi', key: 'lost', prob: 0, type: 'lost', color: '#ef4444' },
]

export class AddCrmPipelines1782620000000 implements MigrationInterface {
  name = 'AddCrmPipelines1782620000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "crm_pipelines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "description" text NOT NULL DEFAULT '', "is_default" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT 0, CONSTRAINT "PK_crm_pipelines" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "crm_pipeline_stages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "pipeline_id" uuid NOT NULL, "name" character varying NOT NULL, "key" character varying NOT NULL, "sort_order" integer NOT NULL DEFAULT 0, "probability" numeric(5,2) NOT NULL DEFAULT '0', "type" character varying NOT NULL DEFAULT 'open', "rotting_days" integer NOT NULL DEFAULT 0, "color" character varying NOT NULL DEFAULT '#6366f1', CONSTRAINT "PK_crm_pipeline_stages" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_crm_pipeline_stages_pipeline" ON "crm_pipeline_stages" ("pipeline_id")`,
    )

    // Opportunity stage FK columns.
    await queryRunner.query(`ALTER TABLE "contact_opportunities" ADD "pipeline_id" uuid`)
    await queryRunner.query(`ALTER TABLE "contact_opportunities" ADD "stage_id" uuid`)
    await queryRunner.query(
      `ALTER TABLE "contact_opportunities" ADD "stage_entered_at" TIMESTAMP WITH TIME ZONE`,
    )
    await queryRunner.query(`ALTER TABLE "contact_opportunities" ADD "win_reason" character varying`)
    await queryRunner.query(`ALTER TABLE "contact_opportunities" ADD "loss_reason" character varying`)
    await queryRunner.query(
      `CREATE INDEX "IDX_contact_opportunities_pipeline" ON "contact_opportunities" ("pipeline_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_contact_opportunities_stage_fk" ON "contact_opportunities" ("stage_id")`,
    )

    // Contact sales owner.
    await queryRunner.query(`ALTER TABLE "contacts" ADD "owner_id" uuid`)
    await queryRunner.query(`CREATE INDEX "IDX_contacts_owner" ON "contacts" ("owner_id")`)

    // Seed the default pipeline + its stages (fixed ids → deterministic).
    await queryRunner.query(
      `INSERT INTO "crm_pipelines" ("id", "name", "description", "is_default", "is_active", "sort_order") VALUES ($1, 'Satış Süreci', 'Varsayılan satış hattı', true, true, 0)`,
      [PIPELINE_ID],
    )
    for (let i = 0; i < STAGES.length; i++) {
      const s = STAGES[i]
      await queryRunner.query(
        `INSERT INTO "crm_pipeline_stages" ("id", "pipeline_id", "name", "key", "sort_order", "probability", "type", "rotting_days", "color") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [s.id, PIPELINE_ID, s.name, s.key, i, s.prob, s.type, 0, s.color],
      )
    }

    // Backfill existing opportunities into the default pipeline by stage key.
    await queryRunner.query(
      `UPDATE "contact_opportunities" SET "pipeline_id" = $1, "stage_entered_at" = "created_at" WHERE "pipeline_id" IS NULL`,
      [PIPELINE_ID],
    )
    await queryRunner.query(
      `UPDATE "contact_opportunities" o SET "stage_id" = s."id" FROM "crm_pipeline_stages" s WHERE s."pipeline_id" = $1 AND s."key" = o."stage" AND o."stage_id" IS NULL`,
      [PIPELINE_ID],
    )
    // Any opportunity with an unknown legacy stage → first (prospecting) stage.
    await queryRunner.query(
      `UPDATE "contact_opportunities" SET "stage_id" = $1 WHERE "stage_id" IS NULL`,
      [STAGES[0].id],
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_contacts_owner"`)
    await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "owner_id"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_contact_opportunities_stage_fk"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_contact_opportunities_pipeline"`)
    await queryRunner.query(`ALTER TABLE "contact_opportunities" DROP COLUMN "loss_reason"`)
    await queryRunner.query(`ALTER TABLE "contact_opportunities" DROP COLUMN "win_reason"`)
    await queryRunner.query(`ALTER TABLE "contact_opportunities" DROP COLUMN "stage_entered_at"`)
    await queryRunner.query(`ALTER TABLE "contact_opportunities" DROP COLUMN "stage_id"`)
    await queryRunner.query(`ALTER TABLE "contact_opportunities" DROP COLUMN "pipeline_id"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_crm_pipeline_stages_pipeline"`)
    await queryRunner.query(`DROP TABLE "crm_pipeline_stages"`)
    await queryRunner.query(`DROP TABLE "crm_pipelines"`)
  }
}
