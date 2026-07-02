import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductCapabilityFlags1782981497626 implements MigrationInterface {
    name = 'AddProductCapabilityFlags1782981497626'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inventory_products" ADD "can_be_sold" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "inventory_products" ADD "can_be_purchased" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "inventory_products" ADD "can_be_manufactured" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inventory_products" DROP COLUMN "can_be_manufactured"`);
        await queryRunner.query(`ALTER TABLE "inventory_products" DROP COLUMN "can_be_purchased"`);
        await queryRunner.query(`ALTER TABLE "inventory_products" DROP COLUMN "can_be_sold"`);
    }

}
