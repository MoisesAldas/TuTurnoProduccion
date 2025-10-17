# 🐛 Instrucciones para Debug y Solución

## Problema 1: Error al subir fotos (RLS)

### Error:
```
StorageApiError: new row violates row-level security policy
```

### ✅ Solución:

1. **Ejecutar el SQL de corrección en Supabase Dashboard**:
   - Ve a: Supabase Dashboard → SQL Editor
   - Copia y pega todo el contenido del archivo: `Database/fix_business_photos_rls.sql`
   - Haz clic en "Run"

2. **Verificar el bucket de storage** (ya debería existir):
   - Ve a: Supabase Dashboard → Storage
   - Busca el bucket: `business-images`
   - Este es el mismo bucket que usa logo/cover
   - Las fotos de galería se guardan en: `{business_id}/gallery/`

3. **Las políticas del bucket ya deberían estar configuradas** (del logo/cover):
   - Si ya puedes subir logo y cover, las fotos de galería también funcionarán
   - Usan el mismo bucket `business-images`, solo diferente subcarpeta

### 🔍 Debug:

Intenta subir una foto nuevamente y revisa la consola del navegador. Verás logs como:

```
🚀 Iniciando proceso de subida de foto...
👤 Usuario autenticado: [ID del usuario]
🏢 Negocio: [datos del negocio]
✅ Es dueño?: true
🗜️ Comprimiendo imagen...
📤 Subiendo archivo a storage: [ruta]
✅ Archivo subido al storage
💾 Guardando en base de datos...
```

Si hay error, los logs mostrarán exactamente dónde falló con detalles completos.

---

## Problema 2: Mapa no carga (se queda en "Cargando mapa...")

### 🔍 Debug:

1. **Abre la consola del navegador** (F12 o clic derecho → Inspeccionar → Console)

2. **Abre el modal del mapa** (clic en botón "Ver Ubicación")

3. **Revisa los logs en la consola**, deberías ver:

```
🗺️ LocationMapModal useEffect triggered
🔑 Mapbox token: Present
📍 Initializing map with coordinates: { latitude: X, longitude: Y }
✅ Map object created
✅ Map loaded successfully!
✅ Navigation controls added
✅ Attribution added
✅ Marker element created
✅ Marker added to map
```

### ❌ Posibles Errores:

#### Error 1: "Mapbox token: MISSING"
**Solución**: Verifica que `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` esté en tu archivo `.env.local`

```bash
# En .env.local
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=tu_token_aqui
```

Después, reinicia el servidor de desarrollo:
```bash
npm run dev
```

#### Error 2: Coordenadas undefined o null
**Logs mostrarán**: `latitude: undefined, longitude: undefined`

**Solución**: Verifica que tu negocio tenga coordenadas en la base de datos:

```sql
-- En Supabase Dashboard → SQL Editor
SELECT id, name, latitude, longitude
FROM businesses
WHERE owner_id = auth.uid();
```

Si `latitude` o `longitude` son NULL, necesitas actualizar tu negocio con coordenadas válidas.

#### Error 3: "Mapbox error: [algo]"
Los logs mostrarán el error específico de Mapbox. Copia el error y búscalo en la documentación de Mapbox.

Errores comunes:
- Token inválido o expirado
- Excediste el límite de requests gratuitos
- Problema de red/CORS

---

## 🧪 Pasos de Verificación:

### 1. Verificar que las tablas existen:
```sql
-- En Supabase Dashboard → SQL Editor
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'business_photos'
);
-- Debe retornar: true
```

### 2. Verificar políticas RLS:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'business_photos'
ORDER BY policyname;
```

Deberías ver 5 políticas:
1. Anyone can view active business photos
2. Business owners can view their photos
3. Business owners can insert photos
4. Business owners can update photos
5. Business owners can delete photos

### 3. Verificar tu negocio:
```sql
SELECT id, name, owner_id, latitude, longitude
FROM businesses
WHERE owner_id = auth.uid();
```

Debe mostrar tu negocio con `latitude` y `longitude` no nulos.

---

## 📞 Si sigues teniendo problemas:

1. **Captura de pantalla** de los logs de la consola
2. **Copia el error completo** (incluyendo code, message, details, hint)
3. **Verifica**:
   - ¿La tabla `business_photos` existe?
   - ¿El bucket `business-photos` existe y es público?
   - ¿Las políticas RLS están activas?
   - ¿Tu token de Mapbox es válido?
   - ¿Tu negocio tiene coordenadas?

---

## ✅ Todo funcionando correctamente cuando:

### Fotos:
- ✅ Puedes seleccionar una imagen
- ✅ Se abre el cropper
- ✅ Al guardar, muestra "Foto agregada correctamente"
- ✅ La foto aparece en la galería de configuración
- ✅ La foto aparece en el collage del perfil público

### Mapa:
- ✅ El botón "Ver Ubicación" aparece (solo si hay coordenadas)
- ✅ Al hacer clic, se abre el modal
- ✅ El mapa carga en 1-2 segundos
- ✅ Se ve el marcador naranja en la ubicación correcta
- ✅ Los 3 botones (Cómo Llegar, Google Maps, Waze) funcionan
