BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[customers] ALTER COLUMN [created_at] DATETIME NULL;
ALTER TABLE [dbo].[customers] ALTER COLUMN [modified_at] DATETIME NULL;

-- CreateTable
CREATE TABLE [dbo].[categories] (
    [category_id] INT NOT NULL IDENTITY(1,1),
    [category_name] NVARCHAR(100) NOT NULL,
    CONSTRAINT [categories_pkey] PRIMARY KEY CLUSTERED ([category_id])
);

-- CreateTable
CREATE TABLE [dbo].[product_category] (
    [product_id] INT NOT NULL,
    [category_id] INT NOT NULL,
    CONSTRAINT [product_category_pkey] PRIMARY KEY CLUSTERED ([product_id],[category_id])
);

-- AddForeignKey
ALTER TABLE [dbo].[product_category] ADD CONSTRAINT [product_category_product_fk] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([product_id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[product_category] ADD CONSTRAINT [product_category_category_fk] FOREIGN KEY ([category_id]) REFERENCES [dbo].[categories]([category_id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
