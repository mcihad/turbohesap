import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductSystem1782568396234 implements MigrationInterface {
    name = 'AddProductSystem1782568396234'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "inventory_product_variants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "code" character varying NOT NULL, "barcode" character varying NOT NULL DEFAULT '', "attribute_values" jsonb NOT NULL DEFAULT '{}', "price_extra" double precision NOT NULL DEFAULT '0', "sale_price" double precision, "purchase_price" double precision, "is_active" boolean NOT NULL DEFAULT true, "image_url" character varying NOT NULL DEFAULT '', "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a8fc6cb501c71db404975f623a4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6cc61738be1e22ec9b2d322824" ON "inventory_product_variants" ("product_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f4e8c97d25eb60fe7aadeaffd9" ON "inventory_product_variants" ("code") `);
        await queryRunner.query(`CREATE TABLE "inventory_product_stocks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "variant_id" uuid, "branch_id" uuid, "quantity" double precision NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3ed0ecba01477b4162ffaab7327" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_48caf34cae910637299ef22bec" ON "inventory_product_stocks" ("product_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_f9d5d7c965d2b29834ffd51b3c" ON "inventory_product_stocks" ("product_id", "variant_id", "branch_id") `);
        await queryRunner.query(`CREATE TABLE "inventory_product_packagings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "variant_id" uuid, "name" character varying NOT NULL, "unit" character varying NOT NULL DEFAULT '', "quantity" double precision NOT NULL DEFAULT '1', "barcode" character varying NOT NULL DEFAULT '', "sale_price" double precision, "purchase_price" double precision, "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3777cb94593e5d99792a5d29712" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1e729e4de3f3456d2de3fe9af8" ON "inventory_product_packagings" ("product_id") `);
        await queryRunner.query(`CREATE TABLE "inventory_product_channel_prices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "variant_id" uuid, "channel_id" uuid NOT NULL, "sale_price" double precision NOT NULL DEFAULT '0', "currency" character varying, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_23aa1ca513c8e11853a63cca12c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_64f02dd8c0f8bd724df3e0ff76" ON "inventory_product_channel_prices" ("product_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_48903e6a315bf6a1f2157be484" ON "inventory_product_channel_prices" ("channel_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_b055d3b35b00c9dc94bbf38f9f" ON "inventory_product_channel_prices" ("product_id", "variant_id", "channel_id") `);
        await queryRunner.query(`ALTER TABLE "inventory_products" ADD "type" character varying NOT NULL DEFAULT 'stockable'`);
        await queryRunner.query(`ALTER TABLE "inventory_products" ADD "track_stock" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "inventory_products" ADD "has_variants" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "inventory_products" ADD "variant_attributes" jsonb NOT NULL DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "inventory_products" ADD "weight" double precision`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "inventory_products" DROP COLUMN "weight"`);
        await queryRunner.query(`ALTER TABLE "inventory_products" DROP COLUMN "variant_attributes"`);
        await queryRunner.query(`ALTER TABLE "inventory_products" DROP COLUMN "has_variants"`);
        await queryRunner.query(`ALTER TABLE "inventory_products" DROP COLUMN "track_stock"`);
        await queryRunner.query(`ALTER TABLE "inventory_products" DROP COLUMN "type"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b055d3b35b00c9dc94bbf38f9f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_48903e6a315bf6a1f2157be484"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_64f02dd8c0f8bd724df3e0ff76"`);
        await queryRunner.query(`DROP TABLE "inventory_product_channel_prices"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1e729e4de3f3456d2de3fe9af8"`);
        await queryRunner.query(`DROP TABLE "inventory_product_packagings"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f9d5d7c965d2b29834ffd51b3c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_48caf34cae910637299ef22bec"`);
        await queryRunner.query(`DROP TABLE "inventory_product_stocks"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f4e8c97d25eb60fe7aadeaffd9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6cc61738be1e22ec9b2d322824"`);
        await queryRunner.query(`DROP TABLE "inventory_product_variants"`);
    }

}
