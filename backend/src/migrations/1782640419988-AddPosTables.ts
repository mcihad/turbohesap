import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPosTables1782640419988 implements MigrationInterface {
    name = 'AddPosTables1782640419988'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "pos_tables" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "floor_id" uuid NOT NULL, "branch_id" uuid, "name" character varying NOT NULL, "seats" integer NOT NULL DEFAULT '0', "pos_x" integer NOT NULL DEFAULT '0', "pos_y" integer NOT NULL DEFAULT '0', "sort_order" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_f0742f11f30886426014a016e35" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0f6c21cd23d81eefdc8d27ca29" ON "pos_tables" ("floor_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_412e438b888eab082259adb322" ON "pos_tables" ("branch_id") `);
        await queryRunner.query(`CREATE TABLE "pos_floors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "branch_id" uuid, "sort_order" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_588adfc8873d5f7a8a84bb9ec04" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c396f316e05cec72eec1a6f06f" ON "pos_floors" ("branch_id") `);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c396f316e05cec72eec1a6f06f"`);
        await queryRunner.query(`DROP TABLE "pos_floors"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_412e438b888eab082259adb322"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0f6c21cd23d81eefdc8d27ca29"`);
        await queryRunner.query(`DROP TABLE "pos_tables"`);
    }

}
