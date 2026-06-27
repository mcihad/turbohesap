import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFinanceAccounts1782592394428 implements MigrationInterface {
    name = 'AddFinanceAccounts1782592394428'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "finance_cash_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "currency" character varying NOT NULL, "opening_balance" double precision NOT NULL DEFAULT '0', "description" character varying NOT NULL DEFAULT '', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_0832277627accdb27167ba66c5b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "finance_bank_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "bank_name" character varying NOT NULL, "branch_name" character varying NOT NULL DEFAULT '', "branch_code" character varying NOT NULL DEFAULT '', "account_number" character varying NOT NULL DEFAULT '', "iban" character varying NOT NULL, "currency" character varying NOT NULL, "opening_balance" double precision NOT NULL DEFAULT '0', "description" character varying NOT NULL DEFAULT '', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_977e3e5782eb5f51c036b8bbf68" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP TABLE "finance_bank_accounts"`);
        await queryRunner.query(`DROP TABLE "finance_cash_accounts"`);
    }

}
