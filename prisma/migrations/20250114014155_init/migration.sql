BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[customers] (
    [customer_id] INT NOT NULL IDENTITY(1,1),
    [customer_name] NVARCHAR(1000) NOT NULL,
    [customer_email] NVARCHAR(1000) NOT NULL,
    [customer_phone] NVARCHAR(1000),
    [customer_status] INT NOT NULL,
    CONSTRAINT [customers_pkey] PRIMARY KEY CLUSTERED ([customer_id])
);

-- CreateTable
CREATE TABLE [dbo].[products] (
    [product_id] INT NOT NULL IDENTITY(1,1),
    [product_name] NVARCHAR(1000) NOT NULL,
    [product_price] DECIMAL(32,16) NOT NULL,
    [product_qty] INT NOT NULL,
    [product_img] VARCHAR(max),
    [product_status] INT NOT NULL,
    CONSTRAINT [products_pkey] PRIMARY KEY CLUSTERED ([product_id])
);

-- CreateTable
CREATE TABLE [dbo].[orders] (
    [order_id] INT NOT NULL IDENTITY(1,1),
    [customer_id] INT NOT NULL,
    [order_date] DATETIME2 NOT NULL CONSTRAINT [orders_order_date_df] DEFAULT CURRENT_TIMESTAMP,
    [total_price] DECIMAL(32,16) NOT NULL,
    CONSTRAINT [orders_pkey] PRIMARY KEY CLUSTERED ([order_id])
);

-- CreateTable
CREATE TABLE [dbo].[order_details] (
    [order_detail_id] INT NOT NULL IDENTITY(1,1),
    [order_id] INT NOT NULL,
    [product_id] INT NOT NULL,
    [quantity] INT NOT NULL,
    [price_per_unit] DECIMAL(32,16) NOT NULL,
    CONSTRAINT [order_details_pkey] PRIMARY KEY CLUSTERED ([order_detail_id])
);

-- AddForeignKey
ALTER TABLE [dbo].[orders] ADD CONSTRAINT [orders_customer_id_fkey] FOREIGN KEY ([customer_id]) REFERENCES [dbo].[customers]([customer_id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[order_details] ADD CONSTRAINT [order_details_order_id_fkey] FOREIGN KEY ([order_id]) REFERENCES [dbo].[orders]([order_id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[order_details] ADD CONSTRAINT [order_details_product_id_fkey] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([product_id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
