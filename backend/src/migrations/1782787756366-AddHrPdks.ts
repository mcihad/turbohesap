import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHrPdks1782787756366 implements MigrationInterface {
    name = 'AddHrPdks1782787756366'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // PDKS giriş alanları PostGIS geometrisi kullanır (geom kolonları).
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
        await queryRunner.query(`CREATE TABLE "hr_shifts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "code" character varying NOT NULL DEFAULT '', "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "crosses_midnight" boolean NOT NULL DEFAULT false, "expected_minutes" integer NOT NULL DEFAULT '0', "late_grace_min" integer NOT NULL DEFAULT '0', "early_leave_grace_min" integer NOT NULL DEFAULT '0', "early_in_clamp_min" integer NOT NULL DEFAULT '0', "color" character varying NOT NULL DEFAULT '#2563eb', "is_day_off" boolean NOT NULL DEFAULT false, "breaks" jsonb NOT NULL DEFAULT '[]', "branch_id" uuid, "is_active" boolean NOT NULL DEFAULT true, "notes" text, CONSTRAINT "PK_ab17dc646abeecad9f255f573f7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_46fbf8c6a1b5e75f027a8973c7" ON "hr_shifts" ("branch_id") `);
        await queryRunner.query(`CREATE TABLE "hr_shift_rotations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "cycle_length_days" integer NOT NULL DEFAULT '1', "anchor_date" date NOT NULL, "days" jsonb NOT NULL DEFAULT '[]', "description" text, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_2b7071cdb2faab393cfd26d93ca" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "hr_employee_shifts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, "rotation_id" uuid, "rotation_offset" integer NOT NULL DEFAULT '0', "fixed_shift_id" uuid, "effective_from" date NOT NULL, "effective_to" date, CONSTRAINT "PK_490b50cdc7fdc5add2b84292767" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_dea322d086bbc4fc40740121a4" ON "hr_employee_shifts" ("employee_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_cbfc9aa3b8cfe218295c3a9073" ON "hr_employee_shifts" ("rotation_id") `);
        await queryRunner.query(`CREATE TABLE "hr_employee_shift_days" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, "work_date" date NOT NULL, "shift_id" uuid, "source" character varying NOT NULL DEFAULT 'rotation', "status" character varying NOT NULL DEFAULT 'draft', CONSTRAINT "PK_647583a4c6483e9999c4dbcca58" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1b99e610457c22075bdabb3c18" ON "hr_employee_shift_days" ("employee_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cc3f15f89b67adbcc2b2806021" ON "hr_employee_shift_days" ("employee_id", "work_date") `);
        await queryRunner.query(`CREATE TABLE "hr_employee_checkin_areas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, "area_id" uuid NOT NULL, CONSTRAINT "PK_997f94630dc81ce29a1232a9e87" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_cd44a9979c52d0fe85e7a98c1a" ON "hr_employee_checkin_areas" ("employee_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_8892a96f1e593131afd17c22ca" ON "hr_employee_checkin_areas" ("area_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_0a0224578755297261ded30971" ON "hr_employee_checkin_areas" ("employee_id", "area_id") `);
        await queryRunner.query(`CREATE TABLE "hr_employee_cards" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, "card_no" character varying NOT NULL, "external_personnel_id" character varying, "valid_from" date, "valid_to" date, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_57642395cc5b30d1012a2c87f65" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3a5b0623db3bf29a3d157238ff" ON "hr_employee_cards" ("employee_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_9538fa793ff1fd91994fcdda75" ON "hr_employee_cards" ("card_no") `);
        await queryRunner.query(`CREATE INDEX "IDX_234b88d142c247baf64804c73f" ON "hr_employee_cards" ("external_personnel_id") `);
        await queryRunner.query(`CREATE TABLE "hr_checkin_areas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "code" character varying NOT NULL DEFAULT '', "branch_id" uuid, "geom" geometry, "tolerance_meters" integer NOT NULL DEFAULT '100', "min_accuracy_meters" integer NOT NULL DEFAULT '100', "time_windows" jsonb NOT NULL DEFAULT '[]', "attributes" jsonb NOT NULL DEFAULT '{}', "require_inside" boolean NOT NULL DEFAULT true, "allow_mock_location" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "notes" text, CONSTRAINT "PK_886ad6ed580238658bd8b3c67e8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_57458b2611192799daaa76cd1d" ON "hr_checkin_areas" ("branch_id") `);
        await queryRunner.query(`CREATE TABLE "hr_card_sources" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "code" character varying NOT NULL DEFAULT '', "kind" character varying NOT NULL DEFAULT 'generic', "description" text, "config" jsonb NOT NULL DEFAULT '{}', "timezone" character varying NOT NULL DEFAULT 'Europe/Istanbul', "direction_mapping" jsonb NOT NULL DEFAULT '{}', "api_key" character varying, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_dbe638c0b987e35e7a8a40d8d34" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "hr_attendance_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid, "branch_id" uuid, "event_time" TIMESTAMP WITH TIME ZONE NOT NULL, "direction" character varying NOT NULL DEFAULT 'unknown', "method" character varying NOT NULL DEFAULT 'mobile_gps', "lat" numeric(9,6), "lng" numeric(9,6), "accuracy_meters" numeric(9,2), "geom" geometry(Point,4326), "area_id" uuid, "distance_meters" numeric(12,2), "within_geofence" boolean NOT NULL DEFAULT false, "within_time_window" boolean NOT NULL DEFAULT false, "is_mock_location" boolean NOT NULL DEFAULT false, "status" character varying NOT NULL DEFAULT 'valid', "flag_reason" character varying, "card_no" character varying, "source" character varying, "external_id" character varying, "device_info" jsonb, "shift_day_id" uuid, "raw" jsonb, "created_by_id" uuid, "notes" text, CONSTRAINT "PK_979decf2700d9fdaba683e01488" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9120b6e174be14d6f96c18847a" ON "hr_attendance_records" ("employee_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_25628aa5aac7e13b172e01d694" ON "hr_attendance_records" ("branch_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_db41f1c67c7db78aaad54b6468" ON "hr_attendance_records" ("area_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_6fb983807575c36702ab546cff" ON "hr_attendance_records" ("source") `);
        await queryRunner.query(`CREATE INDEX "IDX_0fea85c626409d6b48bb2d653c" ON "hr_attendance_records" ("employee_id", "event_time") `);
        await queryRunner.query(`ALTER TABLE "hr_employees" ADD "card_no" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_f20cf238ab6e492dd990e27ee0" ON "hr_employees" ("card_no") `);
        // Spatial GIST indexes for fast geofence (ST_DWithin) queries.
        await queryRunner.query(`CREATE INDEX "IDX_hr_checkin_areas_geom" ON "hr_checkin_areas" USING GIST ("geom")`);
        await queryRunner.query(`CREATE INDEX "IDX_hr_attendance_geom" ON "hr_attendance_records" USING GIST ("geom")`);
        // Card-access idempotency: one row per (source, externalId).
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_hr_attendance_source_external" ON "hr_attendance_records" ("source", "external_id") WHERE "external_id" IS NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_hr_attendance_source_external"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_hr_attendance_geom"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_hr_checkin_areas_geom"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f20cf238ab6e492dd990e27ee0"`);
        await queryRunner.query(`ALTER TABLE "hr_employees" DROP COLUMN "card_no"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0fea85c626409d6b48bb2d653c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6fb983807575c36702ab546cff"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_db41f1c67c7db78aaad54b6468"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_25628aa5aac7e13b172e01d694"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9120b6e174be14d6f96c18847a"`);
        await queryRunner.query(`DROP TABLE "hr_attendance_records"`);
        await queryRunner.query(`DROP TABLE "hr_card_sources"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_57458b2611192799daaa76cd1d"`);
        await queryRunner.query(`DROP TABLE "hr_checkin_areas"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_234b88d142c247baf64804c73f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9538fa793ff1fd91994fcdda75"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3a5b0623db3bf29a3d157238ff"`);
        await queryRunner.query(`DROP TABLE "hr_employee_cards"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0a0224578755297261ded30971"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8892a96f1e593131afd17c22ca"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cd44a9979c52d0fe85e7a98c1a"`);
        await queryRunner.query(`DROP TABLE "hr_employee_checkin_areas"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cc3f15f89b67adbcc2b2806021"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1b99e610457c22075bdabb3c18"`);
        await queryRunner.query(`DROP TABLE "hr_employee_shift_days"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cbfc9aa3b8cfe218295c3a9073"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dea322d086bbc4fc40740121a4"`);
        await queryRunner.query(`DROP TABLE "hr_employee_shifts"`);
        await queryRunner.query(`DROP TABLE "hr_shift_rotations"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_46fbf8c6a1b5e75f027a8973c7"`);
        await queryRunner.query(`DROP TABLE "hr_shifts"`);
    }

}
