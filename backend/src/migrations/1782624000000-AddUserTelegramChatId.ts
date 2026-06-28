import { MigrationInterface, QueryRunner } from 'typeorm'

// Per-user Telegram chat id (direct notifications/messages to a user).
export class AddUserTelegramChatId1782624000000 implements MigrationInterface {
  name = 'AddUserTelegramChatId1782624000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "telegram_chat_id" character varying`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "telegram_chat_id"`)
  }
}
