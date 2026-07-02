import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCodePrefixes1783000322319 implements MigrationInterface {
    name = 'AddCodePrefixes1783000322319'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "lookup_code_prefixes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "context" character varying NOT NULL, "prefix" character varying NOT NULL, "padding" integer NOT NULL DEFAULT '4', "next_number" integer NOT NULL DEFAULT '1', "increment_on_save" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_774e30935d0039312cc3c59dec6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_38d656b96100eb93ccadea6133" ON "lookup_code_prefixes" ("context") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_lookup_code_prefix_context_prefix" ON "lookup_code_prefixes" ("context", "prefix") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_lookup_code_prefix_context_prefix"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_38d656b96100eb93ccadea6133"`);
        await queryRunner.query(`DROP TABLE "lookup_code_prefixes"`);
    }

}
