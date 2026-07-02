import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQualityLot1782973176541 implements MigrationInterface {
    name = 'AddQualityLot1782973176541'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "production_quality_checks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "manufacturing_order_id" uuid NOT NULL, "work_order_id" uuid, "operation_id" uuid, "check_type" character varying NOT NULL DEFAULT 'operation', "result" character varying NOT NULL, "inspected_quantity" numeric(18,4) NOT NULL DEFAULT '0', "passed_quantity" numeric(18,4) NOT NULL DEFAULT '0', "rejected_quantity" numeric(18,4) NOT NULL DEFAULT '0', "inspector_employee_id" uuid, "notes" text, "checked_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_b1db5f1ba1299b7ba0645f91c2d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4f4bf6837ce96a2b327345e13a" ON "production_quality_checks" ("manufacturing_order_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_3deeae27813dae37ae182e2b91" ON "production_quality_checks" ("work_order_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_529a2030bcd43eb6149ea1fdd2" ON "production_quality_checks" ("result") `);
        await queryRunner.query(`CREATE TABLE "production_order_lots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "manufacturing_order_id" uuid NOT NULL, "lot_id" uuid NOT NULL, "role" character varying NOT NULL, "product_id" uuid NOT NULL, "quantity" numeric(18,4) NOT NULL DEFAULT '0', CONSTRAINT "PK_f2abfedc45d9fad248ccd881808" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_97c56aacc3e46862d9cb8a8827" ON "production_order_lots" ("manufacturing_order_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_c2f4a1073b03226520c3daca99" ON "production_order_lots" ("lot_id") `);
        await queryRunner.query(`CREATE TABLE "production_lots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "product_id" uuid NOT NULL, "variant_id" uuid, "lot_no" character varying NOT NULL, "kind" character varying NOT NULL DEFAULT 'lot', "notes" text, CONSTRAINT "PK_3d783318ec12719d81906f2f0fd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8ced0b08fb5670a091d9026042" ON "production_lots" ("product_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_production_lots_product_no" ON "production_lots" ("product_id", "lot_no") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_production_lots_product_no"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8ced0b08fb5670a091d9026042"`);
        await queryRunner.query(`DROP TABLE "production_lots"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c2f4a1073b03226520c3daca99"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97c56aacc3e46862d9cb8a8827"`);
        await queryRunner.query(`DROP TABLE "production_order_lots"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_529a2030bcd43eb6149ea1fdd2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3deeae27813dae37ae182e2b91"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4f4bf6837ce96a2b327345e13a"`);
        await queryRunner.query(`DROP TABLE "production_quality_checks"`);
    }

}
