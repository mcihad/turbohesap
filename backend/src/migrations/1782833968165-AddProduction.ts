import { MigrationInterface, QueryRunner } from "typeorm";

// Üretim modülü Wave 1: iş merkezleri + ürün reçeteleri (BOM header/components/
// byproducts/operations). NOT: generate'in PDKS raw-SQL GIST/partial-unique
// index'lerini "drift" sanıp DROP eden satırları (agy.md §14) çıkarıldı.
export class AddProduction1782833968165 implements MigrationInterface {
    name = 'AddProduction1782833968165'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "production_work_centers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "code" character varying NOT NULL, "name" character varying NOT NULL, "branch_id" uuid, "cost_per_hour" numeric(18,2) NOT NULL DEFAULT '0', "setup_cost_per_hour" numeric(18,2), "currency" character varying NOT NULL DEFAULT 'TRY', "capacity_per_hour" numeric(18,4), "parallel_capacity" integer NOT NULL DEFAULT '1', "efficiency_rate" numeric(7,4) NOT NULL DEFAULT '1', "setup_time_minutes" numeric(9,2) NOT NULL DEFAULT '0', "cleanup_time_minutes" numeric(9,2) NOT NULL DEFAULT '0', "alternate_work_center_id" uuid, "cost_account_code" character varying, "is_active" boolean NOT NULL DEFAULT true, "notes" text, CONSTRAINT "PK_24b21ef7481bc5161eeabdd7174" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_dd78947a753ca878d27a50d45a" ON "production_work_centers" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_2f61528af48816cb01efcf374b" ON "production_work_centers" ("branch_id") `);
        await queryRunner.query(`CREATE TABLE "production_boms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "product_id" uuid NOT NULL, "variant_id" uuid, "code" character varying NOT NULL, "name" character varying NOT NULL DEFAULT '', "type" character varying NOT NULL DEFAULT 'manufacture', "output_quantity" numeric(18,4) NOT NULL DEFAULT '1', "unit" character varying NOT NULL DEFAULT 'ADET', "version" integer NOT NULL DEFAULT '1', "revision" character varying, "valid_from" date, "valid_to" date, "consumption_policy" character varying NOT NULL DEFAULT 'warn', "manuf_lead_time_days" numeric(7,2), "is_active" boolean NOT NULL DEFAULT true, "notes" text, CONSTRAINT "PK_bc6ef9868c37b3b6835b05fd339" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_58ea6392154ca09b1de87e712b" ON "production_boms" ("product_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_212b9edcf0a52de738e56975af" ON "production_boms" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_cc0383ccb31ac9f21e139e8d11" ON "production_boms" ("is_active") `);
        await queryRunner.query(`CREATE TABLE "production_bom_operations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "bom_id" uuid NOT NULL, "sequence" integer NOT NULL DEFAULT '10', "name" character varying NOT NULL, "work_center_id" uuid NOT NULL, "setup_time_minutes" numeric(9,2) NOT NULL DEFAULT '0', "time_per_unit_minutes" numeric(9,4) NOT NULL DEFAULT '0', "time_basis" character varying NOT NULL DEFAULT 'per_unit', "instructions" text, "quality_check_required" boolean NOT NULL DEFAULT false, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_d45cf83e8c5bf3ab4879032faba" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e90f8b3c5515304259d25f4341" ON "production_bom_operations" ("bom_id") `);
        await queryRunner.query(`CREATE TABLE "production_bom_components" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "bom_id" uuid NOT NULL, "component_product_id" uuid NOT NULL, "component_variant_id" uuid, "quantity" numeric(18,4) NOT NULL DEFAULT '0', "unit" character varying NOT NULL DEFAULT 'ADET', "scrap_rate" numeric(7,4) NOT NULL DEFAULT '0', "operation_id" uuid, "consumption_type" character varying NOT NULL DEFAULT 'auto', "is_optional" boolean NOT NULL DEFAULT false, "apply_on_variant_id" uuid, "notes" text, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_61650549bd8e8eca0bfb6d384b1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_abbebfcf8f3afe557451e37da9" ON "production_bom_components" ("bom_id") `);
        await queryRunner.query(`CREATE TABLE "production_bom_byproducts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "bom_id" uuid NOT NULL, "product_id" uuid NOT NULL, "variant_id" uuid, "quantity" numeric(18,4) NOT NULL DEFAULT '0', "unit" character varying NOT NULL DEFAULT 'ADET', "cost_share_rate" numeric(7,4) NOT NULL DEFAULT '0', "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_9c1321ea2710ebcb1e7a8b4fd03" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_750f548b1b98a9b96e172c982b" ON "production_bom_byproducts" ("bom_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_750f548b1b98a9b96e172c982b"`);
        await queryRunner.query(`DROP TABLE "production_bom_byproducts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_abbebfcf8f3afe557451e37da9"`);
        await queryRunner.query(`DROP TABLE "production_bom_components"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e90f8b3c5515304259d25f4341"`);
        await queryRunner.query(`DROP TABLE "production_bom_operations"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_212b9edcf0a52de738e56975af"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_58ea6392154ca09b1de87e712b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cc0383ccb31ac9f21e139e8d11"`);
        await queryRunner.query(`DROP TABLE "production_boms"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dd78947a753ca878d27a50d45a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2f61528af48816cb01efcf374b"`);
        await queryRunner.query(`DROP TABLE "production_work_centers"`);
    }

}
