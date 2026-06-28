import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPosAndModifiers1782637649860 implements MigrationInterface {
    name = 'AddPosAndModifiers1782637649860'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "pos_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "register_id" uuid NOT NULL, "branch_id" uuid NOT NULL, "opened_by_id" uuid NOT NULL, "opened_at" TIMESTAMP WITH TIME ZONE NOT NULL, "opening_cash" numeric(18,2) NOT NULL DEFAULT '0', "closed_at" TIMESTAMP WITH TIME ZONE, "closing_cash" numeric(18,2), "counted_cash" numeric(18,2), "status" character varying NOT NULL DEFAULT 'open', "notes" text, CONSTRAINT "PK_ea6a8d8a95103f03518a0f72c45" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5c496c2c00ad83e8e801473eb2" ON "pos_sessions" ("register_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_dc572ba714ecbd70081bc8d907" ON "pos_sessions" ("branch_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_5e28e797ad49d3d87e57641afe" ON "pos_sessions" ("status") `);
        await queryRunner.query(`CREATE TABLE "pos_registers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "code" character varying NOT NULL, "branch_id" uuid NOT NULL, "sales_channel_id" uuid, "default_cash_account_id" uuid, "settings" jsonb NOT NULL DEFAULT '{}', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_337c429f2be84a4bc0543a27256" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_024bbe1daeb4e5b93b639e9619" ON "pos_registers" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_ba024979f57eb3d0aba10bdf68" ON "pos_registers" ("branch_id") `);
        await queryRunner.query(`CREATE TABLE "pos_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "order_id" uuid NOT NULL, "method" character varying NOT NULL, "amount" numeric(18,2) NOT NULL DEFAULT '0', "change_given" numeric(18,2) NOT NULL DEFAULT '0', "cash_account_id" uuid, "bank_account_id" uuid, "contact_id" uuid, "finance_transaction_id" uuid, "contact_transaction_id" uuid, "client_ref" character varying NOT NULL, CONSTRAINT "PK_6afc9afb629169943944acf6d68" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_badb61a7c1e5b352330f47e49d" ON "pos_payments" ("order_id") `);
        await queryRunner.query(`CREATE TABLE "pos_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "client_ref" character varying NOT NULL, "session_id" uuid, "register_id" uuid NOT NULL, "branch_id" uuid NOT NULL, "sales_channel_id" uuid, "order_type" character varying NOT NULL DEFAULT 'takeaway', "table_id" uuid, "contact_id" uuid, "status" character varying NOT NULL DEFAULT 'open', "order_no" character varying NOT NULL DEFAULT '', "currency_code" character varying NOT NULL DEFAULT 'TRY', "subtotal" numeric(18,2) NOT NULL DEFAULT '0', "discount_total" numeric(18,2) NOT NULL DEFAULT '0', "tax_total" numeric(18,2) NOT NULL DEFAULT '0', "grand_total" numeric(18,2) NOT NULL DEFAULT '0', "paid_total" numeric(18,2) NOT NULL DEFAULT '0', "change_due" numeric(18,2) NOT NULL DEFAULT '0', "tax_inclusive" boolean NOT NULL DEFAULT true, "notes" text, "parent_order_id" uuid, CONSTRAINT "PK_fe63b2bc474b2dc257089d09485" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_1020ba192f13869a332cc83add" ON "pos_orders" ("client_ref") `);
        await queryRunner.query(`CREATE INDEX "IDX_5768d333630ec73898bb598ba8" ON "pos_orders" ("session_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_4f814cf74b89f67e2c64e1e983" ON "pos_orders" ("register_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_e4f862d167ac5c1ed6e8a0a01e" ON "pos_orders" ("branch_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_7a816480b8790f691d01767e0e" ON "pos_orders" ("status") `);
        await queryRunner.query(`CREATE TABLE "pos_order_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "order_id" uuid NOT NULL, "product_id" uuid, "variant_id" uuid, "name" character varying NOT NULL, "qty" numeric(18,4) NOT NULL DEFAULT '1', "unit_price" numeric(18,4) NOT NULL DEFAULT '0', "discount" numeric(5,2) NOT NULL DEFAULT '0', "tax_rate" numeric(5,2) NOT NULL DEFAULT '0', "line_total" numeric(18,2) NOT NULL DEFAULT '0', "kitchen_status" character varying NOT NULL DEFAULT 'new', "station_id" uuid, "notes" text, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_c61ba382090f2fdc1cd360809a4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d51e4001057118c44ba9a831c8" ON "pos_order_lines" ("order_id") `);
        await queryRunner.query(`CREATE TABLE "pos_order_line_modifiers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "line_id" uuid NOT NULL, "group_name_snapshot" character varying NOT NULL, "option_name_snapshot" character varying NOT NULL, "price_delta" numeric(18,2) NOT NULL DEFAULT '0', "group_id" uuid, "option_id" uuid, CONSTRAINT "PK_979d89f088b47c1e7c84663ecd2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_992aacdd9b2e42dc4e1456684a" ON "pos_order_line_modifiers" ("line_id") `);
        await queryRunner.query(`CREATE TABLE "inventory_modifier_options" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "group_id" uuid NOT NULL, "name" character varying NOT NULL, "price_delta" numeric(18,2) NOT NULL DEFAULT '0', "is_default" boolean NOT NULL DEFAULT false, "sort_order" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_8560994a69ed77587abe61000d4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8c6864fe6083beceb0755fc3f8" ON "inventory_modifier_options" ("group_id") `);
        await queryRunner.query(`CREATE TABLE "inventory_product_modifier_links" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "product_id" uuid NOT NULL, "group_id" uuid NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_4d8072661829dbe45e5caa007a9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2dfdcc4b897120aa0981e4711c" ON "inventory_product_modifier_links" ("product_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_c9146bdd9d541cd2a2b1c3b231" ON "inventory_product_modifier_links" ("group_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5624a35c043c8691300524428a" ON "inventory_product_modifier_links" ("product_id", "group_id") `);
        await queryRunner.query(`CREATE TABLE "inventory_modifier_groups" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "selection_type" character varying NOT NULL DEFAULT 'single', "required" boolean NOT NULL DEFAULT false, "min_select" integer NOT NULL DEFAULT '0', "max_select" integer, "sort_order" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_fce65b49b9cb66a0cc590160ccd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD "is_pos_user" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "pos_pin_hash" character varying`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "pos_pin_hash"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_pos_user"`);
        await queryRunner.query(`DROP TABLE "inventory_modifier_groups"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5624a35c043c8691300524428a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c9146bdd9d541cd2a2b1c3b231"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2dfdcc4b897120aa0981e4711c"`);
        await queryRunner.query(`DROP TABLE "inventory_product_modifier_links"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8c6864fe6083beceb0755fc3f8"`);
        await queryRunner.query(`DROP TABLE "inventory_modifier_options"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_992aacdd9b2e42dc4e1456684a"`);
        await queryRunner.query(`DROP TABLE "pos_order_line_modifiers"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d51e4001057118c44ba9a831c8"`);
        await queryRunner.query(`DROP TABLE "pos_order_lines"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7a816480b8790f691d01767e0e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e4f862d167ac5c1ed6e8a0a01e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4f814cf74b89f67e2c64e1e983"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5768d333630ec73898bb598ba8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1020ba192f13869a332cc83add"`);
        await queryRunner.query(`DROP TABLE "pos_orders"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_badb61a7c1e5b352330f47e49d"`);
        await queryRunner.query(`DROP TABLE "pos_payments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ba024979f57eb3d0aba10bdf68"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_024bbe1daeb4e5b93b639e9619"`);
        await queryRunner.query(`DROP TABLE "pos_registers"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5e28e797ad49d3d87e57641afe"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dc572ba714ecbd70081bc8d907"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5c496c2c00ad83e8e801473eb2"`);
        await queryRunner.query(`DROP TABLE "pos_sessions"`);
    }

}
