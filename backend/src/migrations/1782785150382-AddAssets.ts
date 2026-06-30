import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAssets1782785150382 implements MigrationInterface {
    name = 'AddAssets1782785150382'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "inventory_assets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "code" character varying NOT NULL, "name" character varying NOT NULL, "asset_type_key" character varying, "barcode" character varying, "serial_no" character varying, "brand" character varying, "model" character varying, "purchase_date" date, "purchase_value" numeric(18,2) NOT NULL DEFAULT '0', "currency" character varying NOT NULL DEFAULT 'TRY', "supplier_contact_id" uuid, "warranty_end" date, "branch_id" uuid, "status" character varying NOT NULL DEFAULT 'depoda', "status_reason" character varying, "status_note" text, "status_changed_at" TIMESTAMP WITH TIME ZONE, "current_employee_id" uuid, "current_employee_name" character varying, "current_assignment_id" uuid, "is_vehicle" boolean NOT NULL DEFAULT false, "plate" character varying, "chassis_no" character varying, "engine_no" character varying, "model_year" integer, "fuel_type_key" character varying, "current_odometer" numeric(18,1), "notes" text, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_69fca6a655011be650cff9770c9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d7926c7ce96090e35a56ff7c1a" ON "inventory_assets" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_6a899ff0e2fbb535b2061e53e0" ON "inventory_assets" ("barcode") `);
        await queryRunner.query(`CREATE INDEX "IDX_6432c1bf2d9c449d7a84926e2c" ON "inventory_assets" ("supplier_contact_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_767fdaf8c45817fcbe392bbf65" ON "inventory_assets" ("branch_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_1a95dbf1ca352c0992d7046ce8" ON "inventory_assets" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_632298012ecfdcd934d0e1c283" ON "inventory_assets" ("current_employee_id") `);
        await queryRunner.query(`CREATE TABLE "inventory_asset_vehicle_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "asset_id" uuid NOT NULL, "kind" character varying NOT NULL DEFAULT 'yakit', "date" date NOT NULL, "odometer" numeric(18,1) NOT NULL DEFAULT '0', "liters" numeric(18,2), "unit_price" numeric(18,4), "total_cost" numeric(18,2), "currency" character varying NOT NULL DEFAULT 'TRY', "fuel_type_key" character varying, "is_full" boolean NOT NULL DEFAULT false, "station" character varying, "driver_employee_id" uuid, "driver_employee_name" character varying, "notes" text, CONSTRAINT "PK_e0e4877f08a77ca94ac7bc87f7c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b0fca9b0fdb5b2a6f0f43399e5" ON "inventory_asset_vehicle_logs" ("asset_id") `);
        await queryRunner.query(`CREATE TABLE "inventory_asset_transfers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "asset_id" uuid NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "from_employee_id" uuid, "from_employee_name" character varying, "to_employee_id" uuid, "to_employee_name" character varying, "accepted_by_employee_id" uuid, "accepted_by_employee_name" character varying, "initiated_by_id" uuid, "initiated_by_name" character varying, "token" character varying NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE, "accepted_at" TIMESTAMP WITH TIME ZONE, "notes" text, CONSTRAINT "PK_10761d646e4755cf2ce8fc4372c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5f97e568c52ec87110c41db6a3" ON "inventory_asset_transfers" ("asset_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_a9f221d1147203de322a0e5588" ON "inventory_asset_transfers" ("status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d69d790e10fb1699c79b28e40d" ON "inventory_asset_transfers" ("token") `);
        await queryRunner.query(`CREATE TABLE "inventory_asset_maintenance" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "asset_id" uuid NOT NULL, "type" character varying NOT NULL DEFAULT 'bakim', "status" character varying NOT NULL DEFAULT 'tamamlandi', "date" date NOT NULL, "cost" numeric(18,2) NOT NULL DEFAULT '0', "currency" character varying NOT NULL DEFAULT 'TRY', "vendor_contact_id" uuid, "odometer" numeric(18,1), "description" text, "next_due_date" date, "next_due_odometer" numeric(18,1), "notes" text, CONSTRAINT "PK_b181bdf604763df536c02cfb45b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_be45eaf8a066be2a854ade6cda" ON "inventory_asset_maintenance" ("asset_id") `);
        await queryRunner.query(`CREATE TABLE "inventory_asset_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "asset_id" uuid NOT NULL, "employee_id" uuid NOT NULL, "employee_name" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'active', "assigned_by_id" uuid, "assigned_by_name" character varying, "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL, "returned_at" TIMESTAMP WITH TIME ZONE, "transfer_id" uuid, "notes" text, CONSTRAINT "PK_766b033dd0c88575876d01f7f4c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3a4ecabd0ccd2ebe5f3525f133" ON "inventory_asset_assignments" ("asset_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_dbb3de84f7fa21a3e8da18e555" ON "inventory_asset_assignments" ("employee_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_a8b8ed4cee384ec442bbb1eb2e" ON "inventory_asset_assignments" ("status") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_a8b8ed4cee384ec442bbb1eb2e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dbb3de84f7fa21a3e8da18e555"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3a4ecabd0ccd2ebe5f3525f133"`);
        await queryRunner.query(`DROP TABLE "inventory_asset_assignments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_be45eaf8a066be2a854ade6cda"`);
        await queryRunner.query(`DROP TABLE "inventory_asset_maintenance"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d69d790e10fb1699c79b28e40d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a9f221d1147203de322a0e5588"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5f97e568c52ec87110c41db6a3"`);
        await queryRunner.query(`DROP TABLE "inventory_asset_transfers"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b0fca9b0fdb5b2a6f0f43399e5"`);
        await queryRunner.query(`DROP TABLE "inventory_asset_vehicle_logs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_632298012ecfdcd934d0e1c283"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1a95dbf1ca352c0992d7046ce8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_767fdaf8c45817fcbe392bbf65"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6432c1bf2d9c449d7a84926e2c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6a899ff0e2fbb535b2061e53e0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d7926c7ce96090e35a56ff7c1a"`);
        await queryRunner.query(`DROP TABLE "inventory_assets"`);
    }

}
