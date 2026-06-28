import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFinanceModule1782593202004 implements MigrationInterface {
    name = 'AddFinanceModule1782593202004'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "finance_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "cash_account_id" uuid, "bank_account_id" uuid, "type" character varying NOT NULL, "amount" numeric(18,2) NOT NULL, "date" TIMESTAMP WITH TIME ZONE NOT NULL, "description" character varying NOT NULL DEFAULT '', CONSTRAINT "PK_afa9437df81e95c4295cd52f15f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_676e72fd0bb8403e99ab74a185" ON "finance_transactions" ("cash_account_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_328c4b8e20929b4a08bc53a395" ON "finance_transactions" ("bank_account_id") `);
        await queryRunner.query(`CREATE TABLE "finance_cash_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "currency" character varying NOT NULL, "opening_balance" numeric(18,2) NOT NULL DEFAULT '0', "description" character varying NOT NULL DEFAULT '', "is_active" boolean NOT NULL DEFAULT true, "branch_id" uuid, CONSTRAINT "PK_0832277627accdb27167ba66c5b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b302c47744fb3036d959e9a21b" ON "finance_cash_accounts" ("branch_id") `);
        await queryRunner.query(`CREATE TABLE "finance_bank_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "bank_name" character varying NOT NULL, "branch_name" character varying NOT NULL DEFAULT '', "branch_code" character varying NOT NULL DEFAULT '', "account_number" character varying NOT NULL DEFAULT '', "iban" character varying NOT NULL, "currency" character varying NOT NULL, "opening_balance" numeric(18,2) NOT NULL DEFAULT '0', "description" character varying NOT NULL DEFAULT '', "is_active" boolean NOT NULL DEFAULT true, "branch_id" uuid, CONSTRAINT "PK_977e3e5782eb5f51c036b8bbf68" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_316333d4138200c39f571252c0" ON "finance_bank_accounts" ("branch_id") `);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_316333d4138200c39f571252c0"`);
        await queryRunner.query(`DROP TABLE "finance_bank_accounts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b302c47744fb3036d959e9a21b"`);
        await queryRunner.query(`DROP TABLE "finance_cash_accounts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_328c4b8e20929b4a08bc53a395"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_676e72fd0bb8403e99ab74a185"`);
        await queryRunner.query(`DROP TABLE "finance_transactions"`);
    }

}
