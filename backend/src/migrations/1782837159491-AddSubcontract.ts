import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSubcontract1782837159491 implements MigrationInterface {
    name = 'AddSubcontract1782837159491'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "production_subcontract_dispatches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "dispatch_no" character varying NOT NULL, "manufacturing_order_id" uuid NOT NULL, "contact_id" uuid NOT NULL, "dispatch_date" date NOT NULL, "expected_return_date" date, "status" character varying NOT NULL DEFAULT 'draft', "service_cost" numeric(18,4) NOT NULL DEFAULT '0', "currency" character varying NOT NULL DEFAULT 'TRY', "notes" text, CONSTRAINT "PK_afb521845fd704abfc90d28f312" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_1193b5ba4a030e82635e1f207a" ON "production_subcontract_dispatches" ("dispatch_no") `);
        await queryRunner.query(`CREATE INDEX "IDX_398df1ad484c8d14778bdb4865" ON "production_subcontract_dispatches" ("manufacturing_order_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_69ebd30babb9b33bd8929e38a5" ON "production_subcontract_dispatches" ("contact_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_9fed5c31e605695cdece201cf8" ON "production_subcontract_dispatches" ("status") `);
        await queryRunner.query(`CREATE TABLE "production_subcontract_dispatch_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "dispatch_id" uuid NOT NULL, "component_product_id" uuid NOT NULL, "component_variant_id" uuid, "sent_quantity" numeric(18,4) NOT NULL DEFAULT '0', "returned_quantity" numeric(18,4) NOT NULL DEFAULT '0', "unit" character varying NOT NULL DEFAULT 'ADET', "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_c808a198192131b83eb094fe366" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_83f93d0cd6ee021669dc36f1a2" ON "production_subcontract_dispatch_lines" ("dispatch_id") `);
        await queryRunner.query(`ALTER TABLE "production_orders" ADD "subcontract_service_cost" numeric(18,4) NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "production_orders" DROP COLUMN "subcontract_service_cost"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_83f93d0cd6ee021669dc36f1a2"`);
        await queryRunner.query(`DROP TABLE "production_subcontract_dispatch_lines"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9fed5c31e605695cdece201cf8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_69ebd30babb9b33bd8929e38a5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_398df1ad484c8d14778bdb4865"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1193b5ba4a030e82635e1f207a"`);
        await queryRunner.query(`DROP TABLE "production_subcontract_dispatches"`);
    }

}
