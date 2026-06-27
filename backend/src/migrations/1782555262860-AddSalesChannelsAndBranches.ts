import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSalesChannelsAndBranches1782555262860 implements MigrationInterface {
    name = 'AddSalesChannelsAndBranches1782555262860'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "sales_channels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "name" character varying NOT NULL, "type" character varying NOT NULL DEFAULT 'other', "description" character varying NOT NULL DEFAULT '', "is_active" boolean NOT NULL DEFAULT true, "is_default" boolean NOT NULL DEFAULT false, "sort_order" integer NOT NULL DEFAULT '0', "commission_rate" double precision, "currency" character varying NOT NULL DEFAULT 'TRY', "website" character varying NOT NULL DEFAULT '', "contact_name" character varying NOT NULL DEFAULT '', "contact_title" character varying NOT NULL DEFAULT '', "contact_phone" character varying NOT NULL DEFAULT '', "contact_email" character varying NOT NULL DEFAULT '', "country" character varying NOT NULL DEFAULT 'Türkiye', "city" character varying NOT NULL DEFAULT '', "district" character varying NOT NULL DEFAULT '', "address_line" character varying NOT NULL DEFAULT '', "postal_code" character varying NOT NULL DEFAULT '', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2cc4a647500deae01e9f9ef0e47" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bce294faca9eb85b6491c9a8a0" ON "sales_channels" ("code") `);
        await queryRunner.query(`CREATE TABLE "org_branches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "name" character varying NOT NULL, "type" character varying NOT NULL DEFAULT 'branch', "description" character varying NOT NULL DEFAULT '', "is_active" boolean NOT NULL DEFAULT true, "phone" character varying NOT NULL DEFAULT '', "secondary_phone" character varying NOT NULL DEFAULT '', "fax" character varying NOT NULL DEFAULT '', "email" character varying NOT NULL DEFAULT '', "website" character varying NOT NULL DEFAULT '', "country" character varying NOT NULL DEFAULT 'Türkiye', "city" character varying NOT NULL DEFAULT '', "district" character varying NOT NULL DEFAULT '', "neighborhood" character varying NOT NULL DEFAULT '', "address_line" character varying NOT NULL DEFAULT '', "postal_code" character varying NOT NULL DEFAULT '', "latitude" double precision, "longitude" double precision, "manager_name" character varying NOT NULL DEFAULT '', "manager_title" character varying NOT NULL DEFAULT '', "manager_phone" character varying NOT NULL DEFAULT '', "manager_email" character varying NOT NULL DEFAULT '', "tax_office" character varying NOT NULL DEFAULT '', "tax_number" character varying NOT NULL DEFAULT '', "opening_date" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6c15444923c3b77a7140ac4516a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bcba429aea12b2d10af82c0412" ON "org_branches" ("code") `);
        await queryRunner.query(`CREATE TABLE "user_branches" ("users_id" uuid NOT NULL, "org_branches_id" uuid NOT NULL, CONSTRAINT "PK_e1917959f2d6c7d0be88b9fa8a2" PRIMARY KEY ("users_id", "org_branches_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_710221081644a91d4a8ff99968" ON "user_branches" ("users_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_8b8d70c40c07ac4fa3be8c0636" ON "user_branches" ("org_branches_id") `);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "user_branches" ADD CONSTRAINT "FK_710221081644a91d4a8ff999681" FOREIGN KEY ("users_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "user_branches" ADD CONSTRAINT "FK_8b8d70c40c07ac4fa3be8c06365" FOREIGN KEY ("org_branches_id") REFERENCES "org_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_branches" DROP CONSTRAINT "FK_8b8d70c40c07ac4fa3be8c06365"`);
        await queryRunner.query(`ALTER TABLE "user_branches" DROP CONSTRAINT "FK_710221081644a91d4a8ff999681"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8b8d70c40c07ac4fa3be8c0636"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_710221081644a91d4a8ff99968"`);
        await queryRunner.query(`DROP TABLE "user_branches"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bcba429aea12b2d10af82c0412"`);
        await queryRunner.query(`DROP TABLE "org_branches"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bce294faca9eb85b6491c9a8a0"`);
        await queryRunner.query(`DROP TABLE "sales_channels"`);
    }

}
