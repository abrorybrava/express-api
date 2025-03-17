/*
  Warnings:

  - You are about to drop the `customers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `order_details` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `orders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `products` table. If the table is not empty, all the data it contains will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[order_details] DROP CONSTRAINT [order_details_order_id_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[order_details] DROP CONSTRAINT [order_details_product_id_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[orders] DROP CONSTRAINT [orders_customer_id_fkey];

-- DropTable
DROP TABLE [dbo].[customers];

-- DropTable
DROP TABLE [dbo].[order_details];

-- DropTable
DROP TABLE [dbo].[orders];

-- DropTable
DROP TABLE [dbo].[products];

-- CreateTable
CREATE TABLE [dbo].[user] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [username] NVARCHAR(1000) NOT NULL,
    [password] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [user_role_df] DEFAULT 'user',
    CONSTRAINT [user_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [user_username_key] UNIQUE NONCLUSTERED ([username])
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
