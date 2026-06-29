import { MigrationInterface, QueryRunner } from "typeorm";

// POS v2 — restaurant/stock features:
//  • modifier options can consume stock (e.g. "ekstra ketçap" → deduct ketchup)
//  • product bundle components (free/standard given items) handed out at POS
//  • POS order lines carry bundle/return state; line modifiers snapshot stock
//  • POS sessions store the aggregated finance postings created at close (vezne)
//  • finance transactions carry a source link (pos-session) for drill-down
export class AddPosV2RestaurantStock1782650000000 implements MigrationInterface {
    name = 'AddPosV2RestaurantStock1782650000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // A — modifier option stock consumption
        await queryRunner.query(`ALTER TABLE "inventory_modifier_options" ADD "stock_product_id" uuid`);
        await queryRunner.query(`ALTER TABLE "inventory_modifier_options" ADD "stock_variant_id" uuid`);
        await queryRunner.query(`ALTER TABLE "inventory_modifier_options" ADD "consume_qty" numeric(18,4) NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "inventory_modifier_options" ADD "deduct_stock" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "inventory_modifier_options" ADD "returnable" boolean NOT NULL DEFAULT true`);

        // B — product bundle components
        await queryRunner.query(`CREATE TABLE "inventory_product_bundle_components" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "product_id" uuid NOT NULL, "component_product_id" uuid NOT NULL, "component_variant_id" uuid, "qty" numeric(18,4) NOT NULL DEFAULT '1', "is_free" boolean NOT NULL DEFAULT true, "unit_price" numeric(18,2), "deduct_stock" boolean NOT NULL DEFAULT true, "returnable" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_inventory_product_bundle_components" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_bundle_components_product" ON "inventory_product_bundle_components" ("product_id") `);

        // A (snapshot) — line modifiers freeze the stock-consumption config
        await queryRunner.query(`ALTER TABLE "pos_order_line_modifiers" ADD "stock_product_id" uuid`);
        await queryRunner.query(`ALTER TABLE "pos_order_line_modifiers" ADD "stock_variant_id" uuid`);
        await queryRunner.query(`ALTER TABLE "pos_order_line_modifiers" ADD "consume_qty" numeric(18,4) NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "pos_order_line_modifiers" ADD "deduct_stock" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "pos_order_line_modifiers" ADD "returnable" boolean NOT NULL DEFAULT false`);

        // B/C — order line bundle + return state
        await queryRunner.query(`ALTER TABLE "pos_order_lines" ADD "is_bundle_child" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "pos_order_lines" ADD "bundle_parent_line_id" uuid`);
        await queryRunner.query(`ALTER TABLE "pos_order_lines" ADD "deduct_stock" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "pos_order_lines" ADD "returnable" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "pos_order_lines" ADD "returned_qty" numeric(18,4) NOT NULL DEFAULT '0'`);

        // D — session close finance (vezne)
        await queryRunner.query(`ALTER TABLE "pos_sessions" ADD "closed_by_id" uuid`);
        await queryRunner.query(`ALTER TABLE "pos_sessions" ADD "cash_finance_tx_id" uuid`);
        await queryRunner.query(`ALTER TABLE "pos_sessions" ADD "card_finance_tx_id" uuid`);

        // D — finance transaction source link (drill-down)
        await queryRunner.query(`ALTER TABLE "finance_transactions" ADD "source_module" character varying`);
        await queryRunner.query(`ALTER TABLE "finance_transactions" ADD "source_id" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_finance_tx_source_module" ON "finance_transactions" ("source_module") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_finance_tx_source_module"`);
        await queryRunner.query(`ALTER TABLE "finance_transactions" DROP COLUMN "source_id"`);
        await queryRunner.query(`ALTER TABLE "finance_transactions" DROP COLUMN "source_module"`);

        await queryRunner.query(`ALTER TABLE "pos_sessions" DROP COLUMN "card_finance_tx_id"`);
        await queryRunner.query(`ALTER TABLE "pos_sessions" DROP COLUMN "cash_finance_tx_id"`);
        await queryRunner.query(`ALTER TABLE "pos_sessions" DROP COLUMN "closed_by_id"`);

        await queryRunner.query(`ALTER TABLE "pos_order_lines" DROP COLUMN "returned_qty"`);
        await queryRunner.query(`ALTER TABLE "pos_order_lines" DROP COLUMN "returnable"`);
        await queryRunner.query(`ALTER TABLE "pos_order_lines" DROP COLUMN "deduct_stock"`);
        await queryRunner.query(`ALTER TABLE "pos_order_lines" DROP COLUMN "bundle_parent_line_id"`);
        await queryRunner.query(`ALTER TABLE "pos_order_lines" DROP COLUMN "is_bundle_child"`);

        await queryRunner.query(`ALTER TABLE "pos_order_line_modifiers" DROP COLUMN "returnable"`);
        await queryRunner.query(`ALTER TABLE "pos_order_line_modifiers" DROP COLUMN "deduct_stock"`);
        await queryRunner.query(`ALTER TABLE "pos_order_line_modifiers" DROP COLUMN "consume_qty"`);
        await queryRunner.query(`ALTER TABLE "pos_order_line_modifiers" DROP COLUMN "stock_variant_id"`);
        await queryRunner.query(`ALTER TABLE "pos_order_line_modifiers" DROP COLUMN "stock_product_id"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_bundle_components_product"`);
        await queryRunner.query(`DROP TABLE "inventory_product_bundle_components"`);

        await queryRunner.query(`ALTER TABLE "inventory_modifier_options" DROP COLUMN "returnable"`);
        await queryRunner.query(`ALTER TABLE "inventory_modifier_options" DROP COLUMN "deduct_stock"`);
        await queryRunner.query(`ALTER TABLE "inventory_modifier_options" DROP COLUMN "consume_qty"`);
        await queryRunner.query(`ALTER TABLE "inventory_modifier_options" DROP COLUMN "stock_variant_id"`);
        await queryRunner.query(`ALTER TABLE "inventory_modifier_options" DROP COLUMN "stock_product_id"`);
    }

}
