import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLookupItems1782557953340 implements MigrationInterface {
    name = 'AddLookupItems1782557953340'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "lookup_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "list" character varying NOT NULL, "key" character varying NOT NULL, "value" character varying NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2b0e0240c0ad7e09926a7cc867a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_24c238065c0c74bc1686733c90" ON "lookup_items" ("list") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_lookup_list_key" ON "lookup_items" ("list", "key") `);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP INDEX "public"."UQ_lookup_list_key"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_24c238065c0c74bc1686733c90"`);
        await queryRunner.query(`DROP TABLE "lookup_items"`);
    }

}
