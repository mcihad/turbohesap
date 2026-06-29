import { MigrationInterface, QueryRunner } from "typeorm";

// In-app feedback (istek/talep/öneri/hata): a note + optional annotated
// screenshot (referenced via the polymorphic files module), triaged through a
// status workflow by permitted users.
export class AddFeedback1782751646517 implements MigrationInterface {
    name = 'AddFeedback1782751646517'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "feedback" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "type" character varying NOT NULL DEFAULT 'request', "title" character varying NOT NULL DEFAULT '', "message" text NOT NULL, "status" character varying NOT NULL DEFAULT 'new', "priority" character varying NOT NULL DEFAULT 'normal', "page_url" text, "screenshot_file_id" uuid, "created_by_id" uuid NOT NULL, CONSTRAINT "PK_8389f9e087a57689cd5be8b2b13" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b58070b64dd68964f5a71ff021" ON "feedback" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_893fb77faae46fd1da19f8e6ed" ON "feedback" ("created_by_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_893fb77faae46fd1da19f8e6ed"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b58070b64dd68964f5a71ff021"`);
        await queryRunner.query(`DROP TABLE "feedback"`);
    }

}
