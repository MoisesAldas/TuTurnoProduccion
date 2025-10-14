# Exportación SQL de la Base de Datos

Esta es la exportación completa de la estructura de tu base de datos organizada en 6 archivos SQL.

## 📁 Archivos

### 1. `01_extensions.sql`
Contiene las extensiones de PostgreSQL instaladas:
- uuid-ossp (generación de UUIDs)
- pgcrypto (funciones criptográficas)
- pg_stat_statements (estadísticas SQL)
- pg_graphql (GraphQL)
- supabase_vault (Vault de Supabase)
- pg_net (funciones de red/HTTP)
- postgis (datos geoespaciales)

### 2. `02_types.sql`
Define los tipos ENUM personalizados:
- `appointment_status` - Estados de citas (pending, confirmed, completed, etc.)
- `invoice_status` - Estados de facturas (paid, pending, cancelled)
- `notification_type` - Tipos de notificaciones
- `payment_method` - Métodos de pago (cash, transfer)

### 3. `03_tables.sql`
Contiene la definición de todas las tablas con:
- Columnas y tipos de datos
- Claves primarias y foráneas
- Restricciones (checks, unique, etc.)
- Valores por defecto
- Comentarios descriptivos
- Índices para optimización

**Tablas principales:**
- users
- business_categories
- businesses
- business_hours
- employees
- employee_schedules
- services
- appointments
- invoices
- payments
- notifications
- y más...

### 4. `04_functions.sql`
Funciones de negocio y utilidad:

**Funciones de Trigger:**
- `generate_invoice_number()` - Genera números de factura únicos
- `calculate_appointment_total()` - Calcula total de citas
- `check_appointment_conflicts()` - Previene conflictos de horario
- `create_appointment_notification()` - Crea notificaciones
- `create_appointment_reminders()` - Programa recordatorios
- `create_invoice_on_completion()` - Genera facturas automáticas
- `update_invoice_status_on_payment()` - Actualiza estado de facturas
- `update_business_location()` - Sincroniza coordenadas geográficas
- `update_updated_at_column()` - Actualiza timestamps

**Funciones de Consulta:**
- `is_business_open()` - Verifica si un negocio está abierto
- `is_employee_available()` - Verifica disponibilidad de empleado
- `get_available_employees()` - Obtiene empleados disponibles

**Funciones de Reportes:**
- `get_business_sales_report()` - Reporte de ventas
- `get_employee_stats()` - Estadísticas de empleado

### 5. `05_triggers.sql`
Define todos los triggers que ejecutan automáticamente lógica de negocio:

**Triggers de Timestamps:**
- Actualizan `updated_at` en cada tabla

**Triggers de Lógica:**
- Verificación de conflictos en citas
- Creación de notificaciones
- Generación de facturas
- Cálculo de totales
- Sincronización de ubicación geográfica

### 6. `06_rls_policies.sql`
Políticas de Row Level Security (RLS) que controlan el acceso a datos:

**Políticas principales:**
- Los usuarios solo ven sus propios datos
- Los dueños de negocios administran sus negocios
- Clientes ven solo sus citas e facturas
- Público puede ver negocios y servicios activos

## 🚀 Cómo Usar

### Opción 1: Restaurar Base de Datos Completa
Para crear una base de datos nueva con toda la estructura:

```bash
# Ejecutar en orden
psql -d nombre_db -f 01_extensions.sql
psql -d nombre_db -f 02_types.sql
psql -d nombre_db -f 03_tables.sql
psql -d nombre_db -f 04_functions.sql
psql -d nombre_db -f 05_triggers.sql
psql -d nombre_db -f 06_rls_policies.sql
```

### Opción 2: Ejecutar Desde Supabase Dashboard
1. Ve a SQL Editor en tu proyecto Supabase
2. Copia y pega el contenido de cada archivo
3. Ejecuta en el orden indicado (01 → 06)

### Opción 3: Usar Supabase CLI
```bash
# Asegúrate de estar en la carpeta correcta
supabase db push
```

## ⚠️ Notas Importantes

1. **Orden de Ejecución**: Los archivos deben ejecutarse en el orden numérico (01 → 06) debido a las dependencias entre objetos.

2. **Extensiones**: Algunas extensiones requieren permisos de superusuario. En Supabase, estas ya están disponibles.

3. **Datos Existentes**: Estos scripts solo crean la estructura. No incluyen datos. Si tienes datos existentes, haz backup antes de ejecutar.

4. **PostGIS**: La extensión PostGIS es necesaria para las funciones de ubicación geográfica de los negocios.

5. **RLS**: Las políticas RLS están habilitadas. Asegúrate de tener las políticas correctas para tu caso de uso.

## 📊 Estructura de la Base de Datos

```
┌─────────────────┐
│     users       │
└────────┬────────┘
         │
         ├──────────────┐
         │              │
┌────────▼────────┐ ┌──▼──────────────┐
│   businesses    │ │  appointments   │
└────────┬────────┘ └──┬──────────────┘
         │             │
    ┌────┼────┐        │
    │    │    │        │
┌───▼──┐ │ ┌──▼───────▼─────┐
│hours │ │ │    services    │
└──────┘ │ └────────────────┘
         │
    ┌────▼─────┐
    │employees │
    └──────────┘
```

## 🔐 Seguridad

- **RLS Habilitado**: Todas las tablas tienen Row Level Security activado
- **Políticas Restrictivas**: Los usuarios solo acceden a sus datos
- **Funciones SECURITY DEFINER**: Algunas funciones se ejecutan con privilegios elevados cuando es necesario

## 📝 Customización

Puedes modificar estos archivos según tus necesidades:
- Agregar/quitar columnas
- Modificar restricciones
- Agregar nuevos índices
- Personalizar políticas RLS
- Crear nuevas funciones

## 🐛 Troubleshooting

**Error: "extension does not exist"**
- Solución: Asegúrate de ejecutar `01_extensions.sql` primero

**Error: "relation does not exist"**
- Solución: Ejecuta los archivos en orden correcto

**Error: "permission denied"**
- Solución: Verifica que tienes permisos adecuados en la base de datos

## 📞 Soporte

Si tienes preguntas sobre la estructura de la base de datos, revisa:
- Los comentarios en cada archivo SQL
- La documentación de Supabase: https://supabase.com/docs
- La documentación de PostgreSQL: https://www.postgresql.org/docs/

---

**Fecha de Exportación**: Octubre 2025
**Motor**: PostgreSQL 17
**Extensiones Principales**: PostGIS 3.3.7, Supabase Extensions
