import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFinancialInstruments1782994929678 implements MigrationInterface {
    name = 'AddFinancialInstruments1782994929678'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "finance_instruments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "instrument_type" character varying NOT NULL, "direction" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'open', "branch_id" uuid, "contact_id" uuid NOT NULL, "amount" numeric(18,2) NOT NULL DEFAULT '0', "currency_code" character varying NOT NULL DEFAULT 'TRY', "issue_date" date NOT NULL, "due_date" date NOT NULL, "instrument_no" character varying NOT NULL DEFAULT '', "bank_name" character varying, "bank_branch" character varying, "account_no" character varying, "drawer_name" character varying, "notes" text, "cash_account_id" uuid, "bank_account_id" uuid, "finance_transaction_id" uuid, "contact_transaction_id" uuid, "document_id" uuid, "created_by_id" uuid, CONSTRAINT "PK_0a15c5126531420c982f34ebe36" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5e24ab913d2217844ec74e2f89" ON "finance_instruments" ("instrument_type") `);
        await queryRunner.query(`CREATE INDEX "IDX_c92be6c3e5b64580b5c2de15b8" ON "finance_instruments" ("direction") `);
        await queryRunner.query(`CREATE INDEX "IDX_36ff69d4b2051323ad53d70bee" ON "finance_instruments" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_ea8323652961ae491c9d9e6422" ON "finance_instruments" ("branch_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_d81b57523a8e69b20068f5d0fa" ON "finance_instruments" ("contact_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_74378298d5be2e907f0b867c75" ON "finance_instruments" ("due_date") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_74378298d5be2e907f0b867c75"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d81b57523a8e69b20068f5d0fa"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ea8323652961ae491c9d9e6422"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_36ff69d4b2051323ad53d70bee"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c92be6c3e5b64580b5c2de15b8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5e24ab913d2217844ec74e2f89"`);
        await queryRunner.query(`DROP TABLE "finance_instruments"`);
    }

}
