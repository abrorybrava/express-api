BEGIN TRY

BEGIN TRAN;

-- RenameIndex
EXEC SP_RENAME N'dbo.user.user_username_key', N'user_email_key', N'INDEX';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
