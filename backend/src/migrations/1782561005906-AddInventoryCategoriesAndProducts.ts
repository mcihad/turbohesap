import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInventoryCategoriesAndProducts1782561005906 implements MigrationInterface {
    name = 'AddInventoryCategoriesAndProducts1782561005906'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "inventory_products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying NOT NULL DEFAULT '', "barcode" character varying NOT NULL DEFAULT '', "brand" character varying NOT NULL DEFAULT '', "category_id" uuid, "unit" character varying NOT NULL DEFAULT '', "purchase_price" double precision, "sale_price" double precision, "tax_rate" double precision, "currency" character varying NOT NULL DEFAULT 'TRY', "quantity" double precision NOT NULL DEFAULT '0', "min_quantity" double precision NOT NULL DEFAULT '0', "image_url" character varying NOT NULL DEFAULT '', "is_active" boolean NOT NULL DEFAULT true, "attributes" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f0025e3643d268bfda5f6cf9028" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_022233a9293ebd6c76671d3ebc" ON "inventory_products" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_882b52ba8ef5057481e3445ced" ON "inventory_products" ("category_id") `);
        await queryRunner.query(`CREATE TABLE "inventory_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "parent_id" uuid, "name" character varying NOT NULL, "code" character varying NOT NULL DEFAULT '', "description" character varying NOT NULL DEFAULT '', "image_url" character varying NOT NULL DEFAULT '', "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', "field_defs" jsonb NOT NULL DEFAULT '[]', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9903ce18e20acdba3c32c997dc7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d422a4504f18ec1598bbaa3fbb" ON "inventory_categories" ("parent_id") `);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d422a4504f18ec1598bbaa3fbb"`);
        await queryRunner.query(`DROP TABLE "inventory_categories"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_882b52ba8ef5057481e3445ced"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_022233a9293ebd6c76671d3ebc"`);
        await queryRunner.query(`DROP TABLE "inventory_products"`);
    }

}
