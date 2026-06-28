import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvoices1782598542966 implements MigrationInterface {
    name = 'AddInvoices1782598542966'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "type" character varying NOT NULL DEFAULT 'sales', "series" character varying NOT NULL DEFAULT '', "number" character varying NOT NULL DEFAULT '', "ettn" character varying, "date" date NOT NULL, "due_date" date, "contact_id" uuid NOT NULL, "branch_id" uuid, "currency_code" character varying NOT NULL DEFAULT 'TRY', "exchange_rate" numeric(18,6) NOT NULL DEFAULT '1', "status" character varying NOT NULL DEFAULT 'draft', "e_doc_type" character varying NOT NULL DEFAULT 'none', "fatura_tipi" character varying NOT NULL DEFAULT 'SATIS', "senaryo" character varying NOT NULL DEFAULT 'TEMELFATURA', "notes" text, "subtotal" numeric(18,2) NOT NULL DEFAULT '0', "discount_total" numeric(18,2) NOT NULL DEFAULT '0', "vat_base" numeric(18,2) NOT NULL DEFAULT '0', "vat_total" numeric(18,2) NOT NULL DEFAULT '0', "withholding_total" numeric(18,2) NOT NULL DEFAULT '0', "grand_total" numeric(18,2) NOT NULL DEFAULT '0', "vat_summary" jsonb NOT NULL DEFAULT '[]', CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2b9bec0c008a1c631aa6d68d71" ON "invoices" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_6b20aa66f2a835a4f2fbde4872" ON "invoices" ("number") `);
        await queryRunner.query(`CREATE INDEX "IDX_e77a60f5d7e813639d8ba05e6e" ON "invoices" ("contact_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_f8b468df52fb45053ad0c4ca38" ON "invoices" ("branch_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_ac0f09364e3701d9ed35435288" ON "invoices" ("status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ee2378236442ad3ff80bcfba39" ON "invoices" ("series", "number") WHERE "number" <> ''`);
        await queryRunner.query(`CREATE TABLE "invoice_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "invoice_id" uuid NOT NULL, "product_id" uuid, "description" character varying NOT NULL DEFAULT '', "quantity" numeric(18,4) NOT NULL DEFAULT '0', "unit" character varying NOT NULL DEFAULT 'Adet', "unit_price" numeric(18,4) NOT NULL DEFAULT '0', "discount_rate" numeric(7,4) NOT NULL DEFAULT '0', "vat_rate" integer NOT NULL DEFAULT '0', "withholding_code" character varying, "line_net" numeric(18,2) NOT NULL DEFAULT '0', "line_vat" numeric(18,2) NOT NULL DEFAULT '0', "line_withholding" numeric(18,2) NOT NULL DEFAULT '0', "line_total" numeric(18,2) NOT NULL DEFAULT '0', "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_3d18eb48142b916f581f0c21a65" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2da95dc86a54a00ff20ce46d0f" ON "invoice_lines" ("invoice_id") `);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2da95dc86a54a00ff20ce46d0f"`);
        await queryRunner.query(`DROP TABLE "invoice_lines"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ee2378236442ad3ff80bcfba39"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ac0f09364e3701d9ed35435288"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f8b468df52fb45053ad0c4ca38"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e77a60f5d7e813639d8ba05e6e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6b20aa66f2a835a4f2fbde4872"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2b9bec0c008a1c631aa6d68d71"`);
        await queryRunner.query(`DROP TABLE "invoices"`);
    }

}
