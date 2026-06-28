import { MigrationInterface, QueryRunner } from 'typeorm'

// Phase 2: in-app notifications, lead fields on contacts, and activity
// mentions/reminder bookkeeping.
export class AddNotificationsAndLeads1782621000000 implements MigrationInterface {
  name = 'AddNotificationsAndLeads1782621000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "crm_notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "type" character varying NOT NULL, "title" character varying NOT NULL, "body" text, "entity_type" character varying, "entity_id" uuid, "read_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_crm_notifications" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(`CREATE INDEX "IDX_crm_notifications_user" ON "crm_notifications" ("user_id")`)
    await queryRunner.query(
      `CREATE INDEX "IDX_crm_notifications_user_read" ON "crm_notifications" ("user_id", "read_at")`,
    )

    await queryRunner.query(`ALTER TABLE "contacts" ADD "lead_source" character varying`)
    await queryRunner.query(`ALTER TABLE "contacts" ADD "lead_status" character varying`)

    await queryRunner.query(
      `ALTER TABLE "contact_activities" ADD "mentions" jsonb NOT NULL DEFAULT '[]'`,
    )
    await queryRunner.query(
      `ALTER TABLE "contact_activities" ADD "reminded_at" TIMESTAMP WITH TIME ZONE`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "contact_activities" DROP COLUMN "reminded_at"`)
    await queryRunner.query(`ALTER TABLE "contact_activities" DROP COLUMN "mentions"`)
    await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "lead_status"`)
    await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "lead_source"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_crm_notifications_user_read"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_crm_notifications_user"`)
    await queryRunner.query(`DROP TABLE "crm_notifications"`)
  }
}
