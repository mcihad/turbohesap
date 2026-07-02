import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductRecipeComponents1783017201658 implements MigrationInterface {
    name = 'AddProductRecipeComponents1783017201658'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "inventory_product_recipe_components" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "product_id" uuid NOT NULL, "component_product_id" uuid NOT NULL, "component_variant_id" uuid, "quantity" numeric(18,4) NOT NULL DEFAULT '1', "unit" character varying, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_12f3e5f21082f25385722662732" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d9cc141780c17805ac624948ce" ON "inventory_product_recipe_components" ("product_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_d9cc141780c17805ac624948ce"`);
        await queryRunner.query(`DROP TABLE "inventory_product_recipe_components"`);
    }

}
