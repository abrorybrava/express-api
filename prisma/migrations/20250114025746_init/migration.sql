/*
  Warnings:

  - You are about to drop the column `username` on the `user` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `user` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `user` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- DropIndex
ALTER TABLE [dbo].[user] DROP CONSTRAINT [user_username_key];

-- AlterTable
ALTER TABLE [dbo].[user] DROP COLUMN [username];
ALTER TABLE [dbo].[user] ADD [email] NVARCHAR(1000) NOT NULL;

-- CreateIndex
ALTER TABLE [dbo].[user] ADD CONSTRAINT [user_username_key] UNIQUE NONCLUSTERED ([email]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
