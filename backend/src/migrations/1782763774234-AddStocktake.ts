import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStocktake1782763774234 implements MigrationInterface {
    name = 'AddStocktake1782763774234'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "stock_counts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "kind" character varying NOT NULL DEFAULT 'full', "status" character varying NOT NULL DEFAULT 'draft', "branch_id" uuid, "blind" boolean NOT NULL DEFAULT false, "name" character varying NOT NULL DEFAULT '', "planned_date" date, "started_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "recount_threshold_pct" double precision NOT NULL DEFAULT '0', "scope_category_ids" jsonb NOT NULL DEFAULT '[]', "scope_product_ids" jsonb NOT NULL DEFAULT '[]', "abc_class" character varying, "allow_add_unlisted" boolean NOT NULL DEFAULT false, "count_unscanned_as_zero" boolean NOT NULL DEFAULT false, "created_by_id" uuid NOT NULL, "approved_by_id" uuid, "notes" text, CONSTRAINT "PK_75fe54546dc8247c6a33a1707c9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b29bda524b5a9356c72ce4370d" ON "stock_counts" ("kind") `);
        await queryRunner.query(`CREATE INDEX "IDX_4de46d2db344e171118ffa04f2" ON "stock_counts" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_a31ff03249fc9059288c3a94c3" ON "stock_counts" ("branch_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_c92fe060cd8b4f52ad92087b71" ON "stock_counts" ("created_by_id") `);
        await queryRunner.query(`CREATE TABLE "stock_count_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "count_id" uuid NOT NULL, "product_id" uuid NOT NULL, "variant_id" uuid, "code" character varying NOT NULL DEFAULT '', "name" character varying NOT NULL DEFAULT '', "barcode" character varying NOT NULL DEFAULT '', "unit" character varying NOT NULL DEFAULT '', "expected_qty" numeric(18,4) NOT NULL DEFAULT '0', "counted_qty" numeric(18,4) NOT NULL DEFAULT '0', "reason_code" character varying, "status" character varying NOT NULL DEFAULT 'pending', "recount_requested" boolean NOT NULL DEFAULT false, "counter_id" uuid, "last_counted_at" TIMESTAMP WITH TIME ZONE, "notes" text, CONSTRAINT "PK_526b5df4e6f4fa1d2408d7de772" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d835b0e568d3354c4cd2c4e0b3" ON "stock_count_lines" ("count_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_3767cee4e23d3053f7a1b721a3" ON "stock_count_lines" ("product_id") `);
        await queryRunner.query(`CREATE TABLE "stock_count_scans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "count_id" uuid NOT NULL, "line_id" uuid NOT NULL, "qty" numeric(18,4) NOT NULL DEFAULT '0', "scanned_by_id" uuid NOT NULL, CONSTRAINT "PK_381017de635512e050eb075a5f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0fbddb4e5e6d3042b9c79d6a96" ON "stock_count_scans" ("count_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_5656d41f474068448bbd50ed19" ON "stock_count_scans" ("line_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_5656d41f474068448bbd50ed19"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0fbddb4e5e6d3042b9c79d6a96"`);
        await queryRunner.query(`DROP TABLE "stock_count_scans"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3767cee4e23d3053f7a1b721a3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d835b0e568d3354c4cd2c4e0b3"`);
        await queryRunner.query(`DROP TABLE "stock_count_lines"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c92fe060cd8b4f52ad92087b71"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a31ff03249fc9059288c3a94c3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4de46d2db344e171118ffa04f2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b29bda524b5a9356c72ce4370d"`);
        await queryRunner.query(`DROP TABLE "stock_counts"`);
    }

}
