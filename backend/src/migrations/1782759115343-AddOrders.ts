import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrders1782759115343 implements MigrationInterface {
    name = 'AddOrders1782759115343'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "order_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "kind" character varying NOT NULL DEFAULT 'quote', "direction" character varying NOT NULL DEFAULT 'sales', "status" character varying NOT NULL DEFAULT 'draft', "series" character varying NOT NULL DEFAULT '', "number" character varying NOT NULL DEFAULT '', "contact_id" uuid NOT NULL, "branch_id" uuid, "date" date NOT NULL, "valid_until" date, "due_date" date, "currency_code" character varying NOT NULL DEFAULT 'TRY', "exchange_rate" numeric(18,6) NOT NULL DEFAULT '1', "notes" text, "subtotal" numeric(18,2) NOT NULL DEFAULT '0', "discount_total" numeric(18,2) NOT NULL DEFAULT '0', "vat_base" numeric(18,2) NOT NULL DEFAULT '0', "vat_total" numeric(18,2) NOT NULL DEFAULT '0', "withholding_total" numeric(18,2) NOT NULL DEFAULT '0', "grand_total" numeric(18,2) NOT NULL DEFAULT '0', "vat_summary" jsonb NOT NULL DEFAULT '[]', "source_doc_id" uuid, "target_doc_id" uuid, "invoice_id" uuid, CONSTRAINT "PK_aeccb279d4128dec46b2d690c2a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e34634b5ffea5374707aacaede" ON "order_documents" ("kind") `);
        await queryRunner.query(`CREATE INDEX "IDX_f3041d726197665d621ee7a28a" ON "order_documents" ("direction") `);
        await queryRunner.query(`CREATE INDEX "IDX_d73643869338fb0b77ba6f70d1" ON "order_documents" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_3de06a5c6d4648c16edbd48653" ON "order_documents" ("number") `);
        await queryRunner.query(`CREATE INDEX "IDX_9df0bf36674c7d7bcbf4aa222f" ON "order_documents" ("contact_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_ade1d659bca7f655d3a08a89b0" ON "order_documents" ("branch_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2c281d80b30471a9c243661434" ON "order_documents" ("kind", "direction", "series", "number") WHERE "number" <> ''`);
        await queryRunner.query(`CREATE TABLE "order_document_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "document_id" uuid NOT NULL, "product_id" uuid, "variant_id" uuid, "description" character varying NOT NULL DEFAULT '', "quantity" numeric(18,4) NOT NULL DEFAULT '0', "unit" character varying NOT NULL DEFAULT 'Adet', "unit_price" numeric(18,4) NOT NULL DEFAULT '0', "discount_rate" numeric(7,4) NOT NULL DEFAULT '0', "vat_rate" integer NOT NULL DEFAULT '0', "withholding_code" character varying, "line_net" numeric(18,2) NOT NULL DEFAULT '0', "line_vat" numeric(18,2) NOT NULL DEFAULT '0', "line_withholding" numeric(18,2) NOT NULL DEFAULT '0', "line_total" numeric(18,2) NOT NULL DEFAULT '0', "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_117bc7fba13c426cc7e3aee8c96" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9ea6c8813f9dd64a410765fe0d" ON "order_document_lines" ("document_id") `);
        await queryRunner.query(`ALTER TABLE "invoices" ADD "posts_stock" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "posts_stock"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9ea6c8813f9dd64a410765fe0d"`);
        await queryRunner.query(`DROP TABLE "order_document_lines"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2c281d80b30471a9c243661434"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ade1d659bca7f655d3a08a89b0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9df0bf36674c7d7bcbf4aa222f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3de06a5c6d4648c16edbd48653"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d73643869338fb0b77ba6f70d1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f3041d726197665d621ee7a28a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e34634b5ffea5374707aacaede"`);
        await queryRunner.query(`DROP TABLE "order_documents"`);
    }

}
