import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlanning1782972591237 implements MigrationInterface {
    name = 'AddPlanning1782972591237'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "production_reorder_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "product_id" uuid NOT NULL, "variant_id" uuid, "branch_id" uuid, "min_qty" numeric(18,4) NOT NULL DEFAULT '0', "max_qty" numeric(18,4) NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_9298a263b67d764cf469e2ad494" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2bead4ae01758953dc33d7064b" ON "production_reorder_rules" ("product_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_0ba1a6ca20e432540d1a97fb4b" ON "production_reorder_rules" ("product_id", "variant_id", "branch_id") `);
        await queryRunner.query(`CREATE TABLE "production_planning_suggestions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "run_id" uuid NOT NULL, "product_id" uuid NOT NULL, "variant_id" uuid, "branch_id" uuid, "suggestion_type" character varying NOT NULL DEFAULT 'manufacture', "reason" character varying NOT NULL DEFAULT 'reorder', "required_quantity" numeric(18,4) NOT NULL DEFAULT '0', "unit" character varying NOT NULL DEFAULT 'ADET', "suggested_date" date, "level" integer NOT NULL DEFAULT '0', "source_ref" character varying, "status" character varying NOT NULL DEFAULT 'pending', "created_manufacturing_order_id" uuid, CONSTRAINT "PK_e846b3fc394af6abee5bd106f02" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c8ef130dceb3cdf5764068abe7" ON "production_planning_suggestions" ("run_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_232d28320decb4460f0c38d7ac" ON "production_planning_suggestions" ("status") `);
        await queryRunner.query(`CREATE TABLE "production_planning_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "run_no" character varying NOT NULL, "run_date" date NOT NULL, "status" character varying NOT NULL DEFAULT 'draft', "horizon_days" integer NOT NULL DEFAULT '30', "branch_id" uuid, "notes" text, CONSTRAINT "PK_e305af513d181e78481a977c5d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cec93ebcabf047c383ed349d59" ON "production_planning_runs" ("run_no") `);
        await queryRunner.query(`CREATE INDEX "IDX_84fe4cca46a33721055cbb0f12" ON "production_planning_runs" ("status") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_84fe4cca46a33721055cbb0f12"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cec93ebcabf047c383ed349d59"`);
        await queryRunner.query(`DROP TABLE "production_planning_runs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_232d28320decb4460f0c38d7ac"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c8ef130dceb3cdf5764068abe7"`);
        await queryRunner.query(`DROP TABLE "production_planning_suggestions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0ba1a6ca20e432540d1a97fb4b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2bead4ae01758953dc33d7064b"`);
        await queryRunner.query(`DROP TABLE "production_reorder_rules"`);
    }

}
