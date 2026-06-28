import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvoicePayments1782615052611 implements MigrationInterface {
    name = 'AddInvoicePayments1782615052611'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "invoice_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "invoice_id" uuid NOT NULL, "contact_id" uuid NOT NULL, "date" date NOT NULL, "amount" numeric(18,2) NOT NULL DEFAULT '0', "method" character varying NOT NULL DEFAULT 'cash', "cash_account_id" uuid, "bank_account_id" uuid, "description" text, "finance_transaction_id" uuid, "contact_transaction_id" uuid, CONSTRAINT "PK_e19c9ebfa432289f510de7b4e99" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e94fa427d3da279450dba6f4aa" ON "invoice_payments" ("invoice_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_eaf26e955067628fa9637bfbc5" ON "invoice_payments" ("contact_id") `);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eaf26e955067628fa9637bfbc5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e94fa427d3da279450dba6f4aa"`);
        await queryRunner.query(`DROP TABLE "invoice_payments"`);
    }

}
