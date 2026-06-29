import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHr1782761331532 implements MigrationInterface {
    name = 'AddHr1782761331532'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "hr_timesheets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, "year" integer NOT NULL, "month" integer NOT NULL, "worked_days" numeric(5,1) NOT NULL DEFAULT '30', "weekend_days" numeric(5,1) NOT NULL DEFAULT '0', "holiday_days" numeric(5,1) NOT NULL DEFAULT '0', "overtime_hours" numeric(6,1) NOT NULL DEFAULT '0', "absent_days" numeric(5,1) NOT NULL DEFAULT '0', "paid_leave_days" numeric(5,1) NOT NULL DEFAULT '0', "unpaid_leave_days" numeric(5,1) NOT NULL DEFAULT '0', "notes" text, CONSTRAINT "PK_e9e30174273becb23e3787bb0be" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_31fd7e56fb45dcb5bae3a4b654" ON "hr_timesheets" ("employee_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3a6e857ff9fd061b2e01af2a87" ON "hr_timesheets" ("employee_id", "year", "month") `);
        await queryRunner.query(`CREATE TABLE "hr_payslips" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "run_id" uuid NOT NULL, "employee_id" uuid NOT NULL, "year" integer NOT NULL, "month" integer NOT NULL, "days" numeric(5,1) NOT NULL DEFAULT '30', "brut" numeric(18,2) NOT NULL DEFAULT '0', "sgk_matrah" numeric(18,2) NOT NULL DEFAULT '0', "sgk_isci" numeric(18,2) NOT NULL DEFAULT '0', "issizlik_isci" numeric(18,2) NOT NULL DEFAULT '0', "gv_matrah" numeric(18,2) NOT NULL DEFAULT '0', "kumulatif_matrah_once" numeric(18,2) NOT NULL DEFAULT '0', "gelir_vergisi" numeric(18,2) NOT NULL DEFAULT '0', "damga" numeric(18,2) NOT NULL DEFAULT '0', "gv_istisna" numeric(18,2) NOT NULL DEFAULT '0', "damga_istisna" numeric(18,2) NOT NULL DEFAULT '0', "net" numeric(18,2) NOT NULL DEFAULT '0', "sgk_isveren" numeric(18,2) NOT NULL DEFAULT '0', "issizlik_isveren" numeric(18,2) NOT NULL DEFAULT '0', "isveren_maliyet" numeric(18,2) NOT NULL DEFAULT '0', "finance_transaction_id" uuid, "paid_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_886f17a5f9a4e37220067c153f5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0ba435ba0e91c25bd5915e4c62" ON "hr_payslips" ("run_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_6c9a42c48809db7ee9a8b16294" ON "hr_payslips" ("employee_id") `);
        await queryRunner.query(`CREATE TABLE "hr_payroll_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "year" integer NOT NULL, "month" integer NOT NULL, "status" character varying NOT NULL DEFAULT 'draft', "branch_id" uuid, "notes" text, CONSTRAINT "PK_8c02c0017885d19031d251016b7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f7e47f8ca59dfc26f63449c2f3" ON "hr_payroll_runs" ("branch_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_18a22c7cd67fc9308e81a9daba" ON "hr_payroll_runs" ("year", "month") `);
        await queryRunner.query(`CREATE TABLE "hr_payroll_params" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "year" integer NOT NULL, "params" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_bc8281815b3f7075086e559730f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_19ec9d215d2b559a16f7ebcc9a" ON "hr_payroll_params" ("year") `);
        await queryRunner.query(`CREATE TABLE "hr_leave_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL DEFAULT '', "paid" boolean NOT NULL DEFAULT true, "affects_annual_balance" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_c67fd1bb66d507148385b5810d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "hr_leave_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, "leave_type_id" uuid NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "days" numeric(6,1) NOT NULL DEFAULT '0', "reason" text, "status" character varying NOT NULL DEFAULT 'pending', "approved_by_id" uuid, CONSTRAINT "PK_ddbe5e3a2d42d0602d1a1a362db" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a0195bd3454ee9bcddd267b2d8" ON "hr_leave_requests" ("employee_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_35c29ceb7d7d623a304460a359" ON "hr_leave_requests" ("leave_type_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_9c15ceaad23202d86fce139071" ON "hr_leave_requests" ("status") `);
        await queryRunner.query(`CREATE TABLE "hr_employees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "first_name" character varying NOT NULL DEFAULT '', "last_name" character varying NOT NULL DEFAULT '', "tc_kimlik_no" character varying NOT NULL DEFAULT '', "birth_date" date, "hire_date" date NOT NULL, "termination_date" date, "department_key" character varying, "position_key" character varying, "employment_type" character varying NOT NULL DEFAULT 'full_time', "salary_type" character varying NOT NULL DEFAULT 'gross', "salary_amount" numeric(18,2) NOT NULL DEFAULT '0', "sgk_sicil_no" character varying, "sgk_status" character varying NOT NULL DEFAULT 'normal', "iban" character varying, "bank_name" character varying, "phone" character varying, "email" character varying, "address" text, "branch_id" uuid, "user_id" uuid, "annual_leave_days" integer NOT NULL DEFAULT '14', "is_active" boolean NOT NULL DEFAULT true, "notes" text, CONSTRAINT "PK_238fb586a0bc91ede937ef6f4c2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f25e77a1759f85b84285b20826" ON "hr_employees" ("branch_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_5bfb2b110f417c08db71a8f9d1" ON "hr_employees" ("user_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_5bfb2b110f417c08db71a8f9d1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f25e77a1759f85b84285b20826"`);
        await queryRunner.query(`DROP TABLE "hr_employees"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9c15ceaad23202d86fce139071"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_35c29ceb7d7d623a304460a359"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a0195bd3454ee9bcddd267b2d8"`);
        await queryRunner.query(`DROP TABLE "hr_leave_requests"`);
        await queryRunner.query(`DROP TABLE "hr_leave_types"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_19ec9d215d2b559a16f7ebcc9a"`);
        await queryRunner.query(`DROP TABLE "hr_payroll_params"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_18a22c7cd67fc9308e81a9daba"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f7e47f8ca59dfc26f63449c2f3"`);
        await queryRunner.query(`DROP TABLE "hr_payroll_runs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6c9a42c48809db7ee9a8b16294"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0ba435ba0e91c25bd5915e4c62"`);
        await queryRunner.query(`DROP TABLE "hr_payslips"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3a6e857ff9fd061b2e01af2a87"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_31fd7e56fb45dcb5bae3a4b654"`);
        await queryRunner.query(`DROP TABLE "hr_timesheets"`);
    }

}
