-- ========================================
-- EXTENSIONES INSTALADAS
-- ========================================
-- Estas son las extensiones actualmente instaladas en la base de datos

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions VERSION '1.1';

-- Extensión para funciones criptográficas
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions VERSION '1.3';

-- Extensión para estadísticas de SQL
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" SCHEMA extensions VERSION '1.11';

-- Extensión para GraphQL
CREATE EXTENSION IF NOT EXISTS "pg_graphql" SCHEMA graphql VERSION '1.5.11';

-- Extensión Supabase Vault
CREATE EXTENSION IF NOT EXISTS "supabase_vault" SCHEMA vault VERSION '0.3.1';

-- Extensión para red/HTTP
CREATE EXTENSION IF NOT EXISTS "pg_net" SCHEMA public VERSION '0.19.5';

-- Extensión PostGIS para datos geoespaciales
CREATE EXTENSION IF NOT EXISTS "postgis" SCHEMA public VERSION '3.3.7';