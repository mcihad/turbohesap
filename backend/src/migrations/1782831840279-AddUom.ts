import { MigrationInterface, QueryRunner } from "typeorm";

// Ölçü birimi (UoM) sistemi tabloları. NOT: `migration:generate` her seferinde
// PDKS'in raw-SQL GIST/partial-unique index'lerini "drift" sanıp DROP etmek ister;
// agy.md §14 gereği yalnızca bu özelliğin SQL'i bırakıldı.
export class AddUom1782831840279 implements MigrationInterface {
    name = 'AddUom1782831840279'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "inventory_uom_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "reference_uom_code" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_5ff1c45f8e5f9e0293b0149e8f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "inventory_uoms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "category_id" uuid NOT NULL, "code" character varying NOT NULL, "name" character varying NOT NULL, "factor_to_reference" numeric(18,8) NOT NULL DEFAULT '1', "rounding" numeric(18,8) NOT NULL DEFAULT '1', "is_reference" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_4b61b515e62ea4739d15939509c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d9a75b7895f41f5ea0c51b352c" ON "inventory_uoms" ("category_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_1b674a727b491617274cb1618f" ON "inventory_uoms" ("code") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_1b674a727b491617274cb1618f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d9a75b7895f41f5ea0c51b352c"`);
        await queryRunner.query(`DROP TABLE "inventory_uoms"`);
        await queryRunner.query(`DROP TABLE "inventory_uom_categories"`);
    }

}
