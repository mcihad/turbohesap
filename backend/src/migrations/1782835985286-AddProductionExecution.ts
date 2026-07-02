import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductionExecution1782835985286 implements MigrationInterface {
    name = 'AddProductionExecution1782835985286'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "production_work_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "manufacturing_order_id" uuid NOT NULL, "operation_id" uuid, "sequence" integer NOT NULL DEFAULT '10', "name" character varying NOT NULL, "work_center_id" uuid NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "planned_quantity" numeric(18,4) NOT NULL DEFAULT '0', "produced_quantity" numeric(18,4) NOT NULL DEFAULT '0', "rejected_quantity" numeric(18,4) NOT NULL DEFAULT '0', "unit" character varying NOT NULL DEFAULT 'ADET', "planned_setup_minutes" numeric(12,2) NOT NULL DEFAULT '0', "planned_run_minutes" numeric(12,2) NOT NULL DEFAULT '0', "actual_minutes" numeric(12,2) NOT NULL DEFAULT '0', "assigned_employee_id" uuid, "started_at" TIMESTAMP WITH TIME ZONE, "finished_at" TIMESTAMP WITH TIME ZONE, "quality_check_required" boolean NOT NULL DEFAULT false, "notes" text, CONSTRAINT "PK_d7e4f9c23894a3c1ce4977078c3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_42496e69ab3e292461e3e8526f" ON "production_work_orders" ("manufacturing_order_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_4ef30e3709d0c7fe441bd9c133" ON "production_work_orders" ("work_center_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_5aa3b2f98e50be69a21e47c7a5" ON "production_work_orders" ("status") `);
        await queryRunner.query(`CREATE TABLE "production_work_order_time_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "work_order_id" uuid NOT NULL, "employee_id" uuid, "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ended_at" TIMESTAMP WITH TIME ZONE, "duration_minutes" numeric(12,2) NOT NULL DEFAULT '0', "note" text, CONSTRAINT "PK_3cf4d414254e4195acd40ef86c8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_937b6e052ed1d7617b337b261c" ON "production_work_order_time_logs" ("work_order_id") `);
        await queryRunner.query(`CREATE TABLE "production_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "order_no" character varying NOT NULL, "product_id" uuid NOT NULL, "variant_id" uuid, "bom_id" uuid, "bom_code" character varying, "bom_version" integer, "type" character varying NOT NULL DEFAULT 'standard', "source_mode" character varying NOT NULL DEFAULT 'mts', "sales_order_line_id" uuid, "planned_quantity" numeric(18,4) NOT NULL DEFAULT '0', "produced_quantity" numeric(18,4) NOT NULL DEFAULT '0', "scrapped_quantity" numeric(18,4) NOT NULL DEFAULT '0', "unit" character varying NOT NULL DEFAULT 'ADET', "status" character varying NOT NULL DEFAULT 'draft', "priority" character varying NOT NULL DEFAULT 'normal', "component_source_branch_id" uuid, "target_branch_id" uuid, "wip_branch_id" uuid, "subcontractor_contact_id" uuid, "consumption_mode" character varying NOT NULL DEFAULT 'backflush', "planned_start_date" date, "planned_end_date" date, "actual_start_date" TIMESTAMP WITH TIME ZONE, "actual_end_date" TIMESTAMP WITH TIME ZONE, "due_date" date, "responsible_employee_id" uuid, "std_material_cost" numeric(18,4) NOT NULL DEFAULT '0', "std_operation_cost" numeric(18,4) NOT NULL DEFAULT '0', "std_overhead_cost" numeric(18,4) NOT NULL DEFAULT '0', "actual_material_cost" numeric(18,4) NOT NULL DEFAULT '0', "actual_operation_cost" numeric(18,4) NOT NULL DEFAULT '0', "actual_overhead_cost" numeric(18,4) NOT NULL DEFAULT '0', "byproduct_credit" numeric(18,4) NOT NULL DEFAULT '0', "total_cost" numeric(18,4) NOT NULL DEFAULT '0', "unit_cost" numeric(18,4) NOT NULL DEFAULT '0', "currency" character varying NOT NULL DEFAULT 'TRY', "notes" text, CONSTRAINT "PK_44d72e026027e3448b5d655e16e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_695ab28f3ffe7201c2c8200dc0" ON "production_orders" ("order_no") `);
        await queryRunner.query(`CREATE INDEX "IDX_aa4adcdbd67b8aab503bba420a" ON "production_orders" ("product_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_4136b0764498a0c7e7ed4309bb" ON "production_orders" ("status") `);
        await queryRunner.query(`CREATE TABLE "production_order_components" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "order_id" uuid NOT NULL, "component_product_id" uuid NOT NULL, "component_variant_id" uuid, "required_quantity" numeric(18,4) NOT NULL DEFAULT '0', "reserved_quantity" numeric(18,4) NOT NULL DEFAULT '0', "consumed_quantity" numeric(18,4) NOT NULL DEFAULT '0', "unit" character varying NOT NULL DEFAULT 'ADET', "scrap_rate" numeric(7,4) NOT NULL DEFAULT '0', "operation_id" uuid, "source_branch_id" uuid, "consumption_type" character varying NOT NULL DEFAULT 'auto', "is_optional" boolean NOT NULL DEFAULT false, "unit_cost" numeric(18,4), "total_cost" numeric(18,4), "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_5ffe7bcf7fdd3e03fefce07cef8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b11dfd300e4e49a5e7e0d1b346" ON "production_order_components" ("order_id") `);
        await queryRunner.query(`CREATE TABLE "production_order_byproducts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "order_id" uuid NOT NULL, "product_id" uuid NOT NULL, "variant_id" uuid, "quantity" numeric(18,4) NOT NULL DEFAULT '0', "produced_quantity" numeric(18,4) NOT NULL DEFAULT '0', "unit" character varying NOT NULL DEFAULT 'ADET', "cost_share_rate" numeric(7,4) NOT NULL DEFAULT '0', "unit_cost" numeric(18,4), "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_73aed54acbcae2b81ef485f5267" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d833a2194be2802c13bcbd299b" ON "production_order_byproducts" ("order_id") `);
        await queryRunner.query(`CREATE TABLE "inventory_stock_reservations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "product_id" uuid NOT NULL, "variant_id" uuid, "branch_id" uuid, "quantity" numeric(18,4) NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'active', "source_module" character varying NOT NULL, "source_id" uuid NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_f3955d076c223ace78208e0c789" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f62cb8bfa1a01d6384beff6a0f" ON "inventory_stock_reservations" ("product_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_809d1f456f65626501916c4152" ON "inventory_stock_reservations" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_483b5ef3b54c307528c97aec22" ON "inventory_stock_reservations" ("source_module") `);
        await queryRunner.query(`CREATE TABLE "inventory_product_costs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "product_id" uuid NOT NULL, "variant_id" uuid, "branch_id" uuid, "method" character varying NOT NULL DEFAULT 'moving_avg', "avg_cost" numeric(18,4) NOT NULL DEFAULT '0', "currency" character varying NOT NULL DEFAULT 'TRY', CONSTRAINT "PK_be6e984c6f7e1dfc2f014d2cf79" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9a412cfbc10b9a3868151b2afb" ON "inventory_product_costs" ("product_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_8b53377669f1cf12b038f5eceb" ON "inventory_product_costs" ("product_id", "variant_id", "branch_id") `);
        await queryRunner.query(`ALTER TABLE "inventory_stock_movements" ADD "unit_cost" numeric(18,4)`);
        await queryRunner.query(`ALTER TABLE "inventory_product_stocks" ADD "reserved_qty" double precision NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inventory_product_stocks" DROP COLUMN "reserved_qty"`);
        await queryRunner.query(`ALTER TABLE "inventory_stock_movements" DROP COLUMN "unit_cost"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8b53377669f1cf12b038f5eceb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9a412cfbc10b9a3868151b2afb"`);
        await queryRunner.query(`DROP TABLE "inventory_product_costs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_483b5ef3b54c307528c97aec22"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_809d1f456f65626501916c4152"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f62cb8bfa1a01d6384beff6a0f"`);
        await queryRunner.query(`DROP TABLE "inventory_stock_reservations"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d833a2194be2802c13bcbd299b"`);
        await queryRunner.query(`DROP TABLE "production_order_byproducts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b11dfd300e4e49a5e7e0d1b346"`);
        await queryRunner.query(`DROP TABLE "production_order_components"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4136b0764498a0c7e7ed4309bb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aa4adcdbd67b8aab503bba420a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_695ab28f3ffe7201c2c8200dc0"`);
        await queryRunner.query(`DROP TABLE "production_orders"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_937b6e052ed1d7617b337b261c"`);
        await queryRunner.query(`DROP TABLE "production_work_order_time_logs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5aa3b2f98e50be69a21e47c7a5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4ef30e3709d0c7fe441bd9c133"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_42496e69ab3e292461e3e8526f"`);
        await queryRunner.query(`DROP TABLE "production_work_orders"`);
    }

}
