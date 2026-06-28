import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContactsModule1782596406031 implements MigrationInterface {
    name = 'AddContactsModule1782596406031'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "contact_opportunities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "contact_id" uuid NOT NULL, "contact_person_id" uuid, "name" character varying NOT NULL, "stage" character varying NOT NULL DEFAULT 'prospecting', "amount" numeric(18,2) NOT NULL DEFAULT '0', "currency_code" character varying NOT NULL DEFAULT 'TRY', "probability" numeric(5,2) NOT NULL DEFAULT '0', "expected_close_date" date, "source" character varying, "owner_id" uuid, "notes" text, CONSTRAINT "PK_c476b73e3f76f55779830116c99" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5471f01403129d816fe68cb5b1" ON "contact_opportunities" ("contact_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_0a716075a37fb635a6012639e0" ON "contact_opportunities" ("stage") `);
        await queryRunner.query(`CREATE TABLE "contacts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "code" character varying NOT NULL, "contact_type" character varying NOT NULL DEFAULT 'company', "role" character varying NOT NULL DEFAULT 'customer', "name" character varying NOT NULL, "tax_office" character varying, "tax_number" character varying, "national_id" character varying, "email" character varying, "phone" character varying, "mobile" character varying, "website" character varying, "currency_code" character varying NOT NULL DEFAULT 'TRY', "opening_balance" numeric(18,2) NOT NULL DEFAULT '0', "opening_balance_side" character varying NOT NULL DEFAULT 'debit', "credit_limit" numeric(18,2) NOT NULL DEFAULT '0', "payment_term_days" integer NOT NULL DEFAULT '0', "group_id" uuid, "tags" jsonb NOT NULL DEFAULT '[]', "iban" character varying, "bank_name" character varying, "branch_id" uuid, "notes" text, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_b99cd40cfd66a99f1571f4f72e6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6a3c521e3f44d7daa126aa5b26" ON "contacts" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_8916c32e740c9c320da960a95d" ON "contacts" ("role") `);
        await queryRunner.query(`CREATE INDEX "IDX_82e70145f0669e778561f3877f" ON "contacts" ("name") `);
        await queryRunner.query(`CREATE INDEX "IDX_88d76c7088dbd1c5213814dd61" ON "contacts" ("group_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_56002fd906becb9a6fccb8b46f" ON "contacts" ("branch_id") `);
        await queryRunner.query(`CREATE TABLE "contact_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "contact_id" uuid NOT NULL, "date" date NOT NULL, "document_type" character varying NOT NULL DEFAULT 'invoice', "document_no" character varying, "description" text, "debit" numeric(18,2) NOT NULL DEFAULT '0', "credit" numeric(18,2) NOT NULL DEFAULT '0', "currency_code" character varying NOT NULL DEFAULT 'TRY', "exchange_rate" numeric(18,6) NOT NULL DEFAULT '1', "due_date" date, "source_module" character varying, "source_id" uuid, CONSTRAINT "PK_02e33889265e29c7890c7682383" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_806d84aec12375eaedd6eb1f43" ON "contact_transactions" ("contact_id") `);
        await queryRunner.query(`CREATE TABLE "contact_persons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "contact_id" uuid NOT NULL, "first_name" character varying NOT NULL, "last_name" character varying NOT NULL DEFAULT '', "title" character varying, "department" character varying, "email" character varying, "phone" character varying, "mobile" character varying, "is_primary" boolean NOT NULL DEFAULT false, "notes" text, CONSTRAINT "PK_7ac4bdd4703f21ec369f9418d98" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1e8d4b5358788fbeae2ab3db8f" ON "contact_persons" ("contact_id") `);
        await queryRunner.query(`CREATE TABLE "contact_groups" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "parent_id" uuid, "name" character varying NOT NULL, "code" character varying NOT NULL DEFAULT '', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_90a24a920e8e63180026d9821af" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ca2b38540f243d037df19ad617" ON "contact_groups" ("parent_id") `);
        await queryRunner.query(`CREATE TABLE "contact_addresses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "contact_id" uuid NOT NULL, "address_type" character varying NOT NULL DEFAULT 'billing', "title" character varying, "line1" character varying NOT NULL, "line2" character varying, "district" character varying, "city" character varying NOT NULL DEFAULT '', "postal_code" character varying, "country" character varying NOT NULL DEFAULT 'Türkiye', "phone" character varying, "is_primary_billing" boolean NOT NULL DEFAULT false, "is_primary_shipping" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_fddfe10cf61bcdac225f7c00a58" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0bd8c1f3042aeec27522dffb83" ON "contact_addresses" ("contact_id") `);
        await queryRunner.query(`CREATE TABLE "contact_activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "contact_id" uuid, "contact_person_id" uuid, "opportunity_id" uuid, "activity_type" character varying NOT NULL DEFAULT 'note', "subject" character varying NOT NULL, "description" text, "status" character varying NOT NULL DEFAULT 'open', "priority" character varying NOT NULL DEFAULT 'normal', "due_date" TIMESTAMP WITH TIME ZONE, "start_at" TIMESTAMP WITH TIME ZONE, "end_at" TIMESTAMP WITH TIME ZONE, "owner_id" uuid, "completed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_5b62f1e02330a83373cae01cae4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_cdc241d98bade7333751debe8c" ON "contact_activities" ("contact_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_d50f6154bc891b589dcab2609b" ON "contact_activities" ("opportunity_id") `);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d50f6154bc891b589dcab2609b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cdc241d98bade7333751debe8c"`);
        await queryRunner.query(`DROP TABLE "contact_activities"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0bd8c1f3042aeec27522dffb83"`);
        await queryRunner.query(`DROP TABLE "contact_addresses"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ca2b38540f243d037df19ad617"`);
        await queryRunner.query(`DROP TABLE "contact_groups"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1e8d4b5358788fbeae2ab3db8f"`);
        await queryRunner.query(`DROP TABLE "contact_persons"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_806d84aec12375eaedd6eb1f43"`);
        await queryRunner.query(`DROP TABLE "contact_transactions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_56002fd906becb9a6fccb8b46f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_88d76c7088dbd1c5213814dd61"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_82e70145f0669e778561f3877f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8916c32e740c9c320da960a95d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6a3c521e3f44d7daa126aa5b26"`);
        await queryRunner.query(`DROP TABLE "contacts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0a716075a37fb635a6012639e0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5471f01403129d816fe68cb5b1"`);
        await queryRunner.query(`DROP TABLE "contact_opportunities"`);
    }

}
