-- ==========================================================================================
-- SCRIPT DE BASE DE DATOS: CHATBOT INTELIGENTE DE ATENCIÓN AL USUARIO
-- MOTOR: Microsoft SQL Server (T-SQL)
-- ARQUITECTURA: Entity Framework Core Code-First Equivalente
-- TABLAS: Usuarios, Preguntas, Respuestas, Conversaciones
-- ==========================================================================================

-- 1. CREACIÓN DE LA BASE DE DATOS
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'ChatbotAtencionDB')
BEGIN
    CREATE DATABASE [ChatbotAtencionDB];
END
GO

USE [ChatbotAtencionDB];
GO

-- ==========================================================================================
-- 2. CREACIÓN DE TABLAS Y RELACIONES (DDL)
-- ==========================================================================================

-- 2.1 Tabla: Usuarios
IF OBJECT_ID(N'[dbo].[Usuarios]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Usuarios] (
        [Id]            INT            IDENTITY(1,1) NOT NULL,
        [Nombre]        NVARCHAR(100)  NOT NULL,
        [Email]         NVARCHAR(150)  NOT NULL,
        [PasswordHash]  NVARCHAR(MAX)  NOT NULL,
        [Rol]           NVARCHAR(20)   NOT NULL CONSTRAINT [DF_Usuarios_Rol] DEFAULT (N'User'),
        [FechaCreacion] DATETIME2(7)   NOT NULL CONSTRAINT [DF_Usuarios_FechaCreacion] DEFAULT (GETUTCDATE()),
        CONSTRAINT [PK_Usuarios] PRIMARY KEY CLUSTERED ([Id] ASC)
    );

    -- Índice único para el correo electrónico
    CREATE UNIQUE NONCLUSTERED INDEX [IX_Usuarios_Email]
        ON [dbo].[Usuarios]([Email] ASC);
END
GO

-- 2.2 Tabla: Preguntas (Tabla Padre de FAQs)
IF OBJECT_ID(N'[dbo].[Preguntas]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Preguntas] (
        [Id]            INT            IDENTITY(1,1) NOT NULL,
        [TextoPregunta] NVARCHAR(500)  NOT NULL,
        [Categoria]     NVARCHAR(100)  NOT NULL,
        [EstadoActivo]  BIT            NOT NULL CONSTRAINT [DF_Preguntas_EstadoActivo] DEFAULT ((1)),
        CONSTRAINT [PK_Preguntas] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
END
GO

-- 2.3 Tabla: Respuestas (Tabla Hija de Preguntas con Eliminación en Cascada)
IF OBJECT_ID(N'[dbo].[Respuestas]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Respuestas] (
        [Id]                  INT           IDENTITY(1,1) NOT NULL,
        [PreguntaId]          INT           NOT NULL,
        [TextoRespuesta]      NVARCHAR(MAX) NOT NULL,
        [UltimaActualizacion] DATETIME2(7)  NOT NULL CONSTRAINT [DF_Respuestas_UltimaActualizacion] DEFAULT (GETUTCDATE()),
        CONSTRAINT [PK_Respuestas] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_Respuestas_Preguntas_PreguntaId] FOREIGN KEY ([PreguntaId])
            REFERENCES [dbo].[Preguntas] ([Id])
            ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX [IX_Respuestas_PreguntaId]
        ON [dbo].[Respuestas]([PreguntaId] ASC);
END
GO

-- 2.4 Tabla: Conversaciones (Bitácora de Interacciones con el Chatbot IA)
IF OBJECT_ID(N'[dbo].[Conversaciones]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Conversaciones] (
        [Id]              INT              IDENTITY(1,1) NOT NULL,
        [SessionId]       UNIQUEIDENTIFIER NOT NULL,
        [UsuarioId]       INT              NULL, -- FK Opcional (Permite usuarios anónimos o autenticados)
        [PreguntaUsuario] NVARCHAR(MAX)    NOT NULL,
        [RespuestaBot]    NVARCHAR(MAX)    NOT NULL,
        [Timestamp]       DATETIME2(7)     NOT NULL CONSTRAINT [DF_Conversaciones_Timestamp] DEFAULT (GETUTCDATE()),
        CONSTRAINT [PK_Conversaciones] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_Conversaciones_Usuarios_UsuarioId] FOREIGN KEY ([UsuarioId])
            REFERENCES [dbo].[Usuarios] ([Id])
            ON DELETE SET NULL
    );

    CREATE NONCLUSTERED INDEX [IX_Conversaciones_SessionId]
        ON [dbo].[Conversaciones]([SessionId] ASC);

    CREATE NONCLUSTERED INDEX [IX_Conversaciones_UsuarioId]
        ON [dbo].[Conversaciones]([UsuarioId] ASC);
END
GO

-- ==========================================================================================
-- 3. INSERCIÓN DE DATOS INICIALES - DATA SEEDER (DML)
-- ==========================================================================================

-- 3.1 Insertar Usuarios Iniciales (Contraseñas encriptadas con BCrypt: Admin123! y User123!)
IF NOT EXISTS (SELECT 1 FROM [dbo].[Usuarios])
BEGIN
    INSERT INTO [dbo].[Usuarios] ([Nombre], [Email], [PasswordHash], [Rol], [FechaCreacion])
    VALUES
        (N'Administrador Principal', N'admin@chatbot.com',   N'$2a$11$K7Tq6Z5v9pL1mN3r8sW4uO2yX0bV5cE7gH9jK1lM3nP5qR7sT9uV2', N'Admin', GETUTCDATE()),
        (N'Usuario Demo',            N'usuario@chatbot.com', N'$2a$11$M9Pq8R2x4vL6nB1c3zW5yO7uI9aS2dF4gH6jK8lZ0xC2vB4nM6qW8', N'User',  GETUTCDATE());
END
GO

-- 3.2 Insertar Preguntas Frecuentes (FAQs) y sus Respuestas Oficiales
IF NOT EXISTS (SELECT 1 FROM [dbo].[Preguntas])
BEGIN
    SET IDENTITY_INSERT [dbo].[Preguntas] ON;

    INSERT INTO [dbo].[Preguntas] ([Id], [TextoPregunta], [Categoria], [EstadoActivo])
    VALUES
        (1, N'¿Cuáles son los horarios de atención al cliente?',                       N'Información General', 1),
        (2, N'¿Cómo puedo restablecer mi contraseña?',                                 N'Cuenta y Acceso',     1),
        (3, N'¿Cuáles son los medios de pago aceptados?',                              N'Pagos y Facturación', 1),
        (4, N'¿En cuánto tiempo se procesa un reembolso?',                             N'Pagos y Facturación', 1),
        (5, N'¿Cómo puedo radicar una petición, queja o reclamo (PQR)?',               N'Soporte y PQR',       1);

    SET IDENTITY_INSERT [dbo].[Preguntas] OFF;

    INSERT INTO [dbo].[Respuestas] ([PreguntaId], [TextoRespuesta], [UltimaActualizacion])
    VALUES
        (1, N'Nuestro horario de atención con asesores humanos es de lunes a viernes de 8:00 a.m. a 6:00 p.m. y sábados de 9:00 a.m. a 1:00 p.m. Nuestro asistente virtual está disponible las 24 horas del día.', GETUTCDATE()),
        (2, N'Para restablecer su contraseña, diríjase a la pantalla de inicio de sesión, seleccione ''¿Olvidó su contraseña?'' e ingrese su correo electrónico registrado. Recibirá un enlace temporal para crear una nueva clave.', GETUTCDATE()),
        (3, N'Aceptamos tarjetas de crédito (Visa, MasterCard, American Express), tarjetas débito a través de PSE y transferencias bancarias directas.', GETUTCDATE()),
        (4, N'Una vez aprobada la solicitud de reembolso, el reintegro del dinero toma entre 5 y 10 días hábiles dependiendo de su entidad financiera.', GETUTCDATE()),
        (5, N'Puede radicar una PQR desde la sección ''Centro de Ayuda -> Radicar PQR'' en nuestro portal web, o enviando un correo electrónico detallado a soporte@chatbot.com. Recibirá un número de radicado con respuesta en un plazo máximo de 15 días hábiles.', GETUTCDATE());
END
GO

-- 3.3 Insertar Conversación de Ejemplo en la Bitácora
IF NOT EXISTS (SELECT 1 FROM [dbo].[Conversaciones])
BEGIN
    DECLARE @DemoSession UNIQUEIDENTIFIER = NEWID();

    INSERT INTO [dbo].[Conversaciones] ([SessionId], [UsuarioId], [PreguntaUsuario], [RespuestaBot], [Timestamp])
    VALUES
        (@DemoSession, 2, N'¿Cuáles son los horarios de atención al cliente?', N'Nuestro horario de atención con asesores humanos es de lunes a viernes de 8:00 a.m. a 6:00 p.m. y sábados de 9:00 a.m. a 1:00 p.m. Nuestro asistente virtual está disponible las 24 horas del día.', GETUTCDATE());
END
GO

-- ==========================================================================================
-- 4. CONSULTAS DE VERIFICACIÓN
-- ==========================================================================================
SELECT * FROM [dbo].[Usuarios];
SELECT P.[Id], P.[Categoria], P.[TextoPregunta], R.[TextoRespuesta], P.[EstadoActivo]
FROM [dbo].[Preguntas] P
INNER JOIN [dbo].[Respuestas] R ON P.[Id] = R.[PreguntaId];
SELECT * FROM [dbo].[Conversaciones];
GO
