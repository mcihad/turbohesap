import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFinanceTxContact1782597359536 implements MigrationInterface {
    name = 'AddFinanceTxContact1782597359536'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "finance_transactions" ADD "contact_id" uuid`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`CREATE INDEX "IDX_b712fe9be9548d14c8080e1464" ON "finance_transactions" ("contact_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_b712fe9be9548d14c8080e1464"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "finance_transactions" DROP COLUMN "contact_id"`);
    }

}
