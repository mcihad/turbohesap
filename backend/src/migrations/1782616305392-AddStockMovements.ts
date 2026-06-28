import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStockMovements1782616305392 implements MigrationInterface {
    name = 'AddStockMovements1782616305392'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "inventory_stock_movements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "product_id" uuid NOT NULL, "variant_id" uuid, "branch_id" uuid, "movement_type_id" uuid NOT NULL, "direction" character varying NOT NULL, "quantity" numeric(18,4) NOT NULL DEFAULT '0', "unit" character varying NOT NULL DEFAULT 'Adet', "date" date NOT NULL, "description" text, "source_module" character varying, "source_id" uuid, CONSTRAINT "PK_798fae89496e9e99ce4614b7101" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3d331939433b148b7c27880902" ON "inventory_stock_movements" ("product_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_56795cb415110ef0776d9fe503" ON "inventory_stock_movements" ("branch_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_4fc25ac1254297ec8eaffba274" ON "inventory_stock_movements" ("source_module") `);
        await queryRunner.query(`CREATE TABLE "inventory_stock_movement_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "direction" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "is_system" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_d4f95916fb4b524cb8417220ec8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP TABLE "inventory_stock_movement_types"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4fc25ac1254297ec8eaffba274"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_56795cb415110ef0776d9fe503"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3d331939433b148b7c27880902"`);
        await queryRunner.query(`DROP TABLE "inventory_stock_movements"`);
    }

}
