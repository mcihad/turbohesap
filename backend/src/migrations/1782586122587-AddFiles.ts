import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFiles1782586122587 implements MigrationInterface {
    name = 'AddFiles1782586122587'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "files" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "original_name" character varying NOT NULL, "stored_name" character varying NOT NULL, "mime_type" character varying NOT NULL, "extension" character varying NOT NULL DEFAULT '', "size" bigint NOT NULL DEFAULT '0', "kind" character varying NOT NULL DEFAULT 'file', "is_image" boolean NOT NULL DEFAULT false, "storage" character varying NOT NULL DEFAULT 'local', "entity_type" character varying, "entity_id" uuid, "sort_order" integer NOT NULL DEFAULT '0', "uploaded_by_id" uuid, CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_dea1609c1d56367529ace1e153" ON "files" ("stored_name") `);
        await queryRunner.query(`CREATE INDEX "IDX_ab1f0cfcf9c2868ab525191b4d" ON "files" ("entity_type", "entity_id") `);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ab1f0cfcf9c2868ab525191b4d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dea1609c1d56367529ace1e153"`);
        await queryRunner.query(`DROP TABLE "files"`);
    }

}
