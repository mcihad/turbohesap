import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDocumentsModule1782994000684 implements MigrationInterface {
    name = 'AddDocumentsModule1782994000684'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "category_id" uuid, "title" character varying NOT NULL, "code" character varying NOT NULL DEFAULT '', "description" character varying NOT NULL DEFAULT '', "attributes" jsonb NOT NULL DEFAULT '{}', "tags" jsonb NOT NULL DEFAULT '[]', "metadata" jsonb NOT NULL DEFAULT '{}', "ocr_text" text, "ocr_status" character varying, "is_time_bound" boolean NOT NULL DEFAULT false, "issue_date" date, "expiry_date" date, "reminder_days_before" integer, "is_private" boolean NOT NULL DEFAULT false, "owner_id" uuid, "related_entity_type" character varying, "related_entity_id" uuid, "created_by_id" uuid, CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b89e90c19762165e9647686650" ON "documents" ("category_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_87352da21f61815c048b4cf46f" ON "documents" ("expiry_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_8429c6a1674431d3025a105795" ON "documents" ("is_private") `);
        await queryRunner.query(`CREATE INDEX "IDX_888a4852e27627d1ebd8a094e9" ON "documents" ("owner_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_0610e41b015922896815230689" ON "documents" ("related_entity_type", "related_entity_id") `);
        await queryRunner.query(`CREATE TABLE "document_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "parent_id" uuid, "name" character varying NOT NULL, "code" character varying NOT NULL DEFAULT '', "description" character varying NOT NULL DEFAULT '', "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', "is_private" boolean NOT NULL DEFAULT false, "owner_id" uuid, "field_defs" jsonb NOT NULL DEFAULT '[]', CONSTRAINT "PK_672faab02d41a41ffd92ecd69e1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2db272897a5c77322617882261" ON "document_categories" ("parent_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_2db272897a5c77322617882261"`);
        await queryRunner.query(`DROP TABLE "document_categories"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0610e41b015922896815230689"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_888a4852e27627d1ebd8a094e9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8429c6a1674431d3025a105795"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_87352da21f61815c048b4cf46f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b89e90c19762165e9647686650"`);
        await queryRunner.query(`DROP TABLE "documents"`);
    }

}
