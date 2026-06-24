import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditAndErrorLogs1782302088714 implements MigrationInterface {
    name = 'AddAuditAndErrorLogs1782302088714'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "error_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "hash" character varying NOT NULL, "origin" character varying NOT NULL DEFAULT 'server', "module" character varying, "message" text NOT NULL, "exception_type" character varying NOT NULL, "stack_trace" text, "source" character varying, "file_name" character varying, "line_number" integer, "http_method" character varying, "path" character varying, "query_string" text, "status_code" integer NOT NULL DEFAULT '500', "ip_address" character varying, "user_agent" text, "headers" jsonb, "user_id" character varying, "user_name" character varying, "status" character varying NOT NULL DEFAULT 'new', "developer_notes" text, "occurrence_count" integer NOT NULL DEFAULT '1', "first_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL, "last_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_6840885d7eb78406fa7d358be72" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_747b4eb0a0ea24f3b2ee96e37a" ON "error_logs" ("last_seen_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_20f018b25127ce148c4aee8cfc" ON "error_logs" ("origin") `);
        await queryRunner.query(`CREATE INDEX "IDX_103749e891b5300f41ae56959d" ON "error_logs" ("status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_aac54649e0fb4b2952af88aedf" ON "error_logs" ("hash") `);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "entity_type" character varying NOT NULL, "entity_id" character varying, "table_name" character varying, "module" character varying, "action" character varying NOT NULL, "changes" jsonb NOT NULL DEFAULT '[]'::jsonb, "ip_address" character varying, "user_id" character varying, "user_name" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2cd10fda8276bb995288acfbfb" ON "audit_logs" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_7421efc125d95e413657efa3c6" ON "audit_logs" ("entity_type", "entity_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_7421efc125d95e413657efa3c6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2cd10fda8276bb995288acfbfb"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aac54649e0fb4b2952af88aedf"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_103749e891b5300f41ae56959d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_20f018b25127ce148c4aee8cfc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_747b4eb0a0ea24f3b2ee96e37a"`);
        await queryRunner.query(`DROP TABLE "error_logs"`);
    }

}
