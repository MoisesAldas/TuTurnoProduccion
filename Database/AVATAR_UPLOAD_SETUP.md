# Avatar Upload System - Client Profile

## 📸 Feature Overview

Sistema completo de subida y actualización de fotos de perfil para clientes, con crop de imagen y optimización automática.

---

## 🎯 Funcionalidad

### Cliente puede:
- ✅ **Subir** una foto de perfil si no tiene una
- ✅ **Actualizar** su foto actual con una nueva
- ✅ **Crop/recortar** la imagen antes de subirla (ratio 1:1)
- ✅ **Rotar** y **zoom** para ajustar la imagen
- ✅ **Ver** su avatar en todo el dashboard

### Características:
- Crop circular 1:1 (cuadrado para avatares)
- Validación de tipo de archivo (solo imágenes)
- Validación de tamaño (máx 5MB)
- Optimización automática (400x400px @ 98% quality)
- Reemplazo automático de avatar anterior
- Feedback visual con toasts

---

## 🏗️ Arquitectura

### Frontend Components

**Archivo:** `src/app/dashboard/client/profile/page.tsx`

**Estados:**
```typescript
const [showAvatarDialog, setShowAvatarDialog] = useState(false)
const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
const [uploadingAvatar, setUploadingAvatar] = useState(false)
const fileInputRef = React.useRef<HTMLInputElement>(null)
```

**Funciones:**
- `handleAvatarClick()` - Abre file picker
- `handleFileSelect()` - Valida archivo y abre modal de crop
- `handleSaveAvatar()` - Sube imagen a Supabase Storage y actualiza DB
- `handleCancelAvatar()` - Cancela operación

**Componentes usados:**
- `ImageCropper` - Componente reutilizable para crop (src/components/ImageCropper.tsx)
- `Dialog` - Modal de shadcn/ui
- `Avatar` - Componente de shadcn/ui
- `Toast` - Notificaciones

---

## 🗄️ Database & Storage

### Supabase Storage Bucket

**Bucket Name:** `avatars` ✅ **YA EXISTE** (compartido con empleados)

**Configuración:**
- **Public:** Yes (para mostrar avatares en perfiles)
- **RLS:** Enabled con políticas específicas
- **Estructura:**
  - Empleados: `avatars/{business_id}/employees/{timestamp}.{ext}`
  - **Clientes:** `avatars/{user_id}/{timestamp}.{ext}` ← NUEVA

**Políticas RLS:**
1. **Public Read** - Cualquiera puede ver avatares
2. **User Upload** - Solo el usuario puede subir a su carpeta
3. **User Update** - Solo el usuario puede actualizar sus archivos
4. **User Delete** - Solo el usuario puede eliminar sus archivos

**Ver:** `Database/setup_avatars_storage.sql`

---

## 🚀 Deployment

### ✅ Paso 1: Verificar Bucket Existente

El bucket `avatars` **YA EXISTE** (se usa para empleados). Solo necesitas verificar:

1. Supabase Dashboard → Storage → `avatars`
2. Verificar que está marcado como **Public**
3. Verificar que tiene **RLS policies** habilitadas

**Si el bucket no existe o tiene problemas:**
Ejecuta `Database/setup_avatars_storage.sql` en SQL Editor

### Paso 2: Configurar File Size Limit (Opcional)

En Supabase Dashboard → Storage → avatars → Settings:
- **Max File Size:** 5MB
- **Allowed MIME Types:**
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `image/gif`

### Paso 3: Testing

1. Ve a `/dashboard/client/profile`
2. Click en el botón de cámara 📷 (esquina inferior derecha del avatar)
3. Selecciona una imagen
4. Ajusta crop/zoom/rotación
5. Click "Guardar"
6. Verifica que:
   - ✅ Se muestra loader "Subiendo imagen..."
   - ✅ Toast de éxito aparece
   - ✅ Avatar se actualiza inmediatamente
   - ✅ Imagen se guarda en Storage: `avatars/{user_id}/{timestamp}.ext`

---

## 🔄 Flujo de Subida

```
Usuario hace click en botón de cámara
  ↓
Abre file picker (input hidden)
  ↓
Usuario selecciona imagen
  ↓
Validaciones (tipo, tamaño)
  ↓
Abre modal con ImageCropper
  ↓
Usuario ajusta crop/zoom/rotación
  ↓
Click "Guardar"
  ↓
1. DELETE avatar anterior (si existe) ✅
2. UPLOAD nuevo archivo a Storage ✅
3. GET public URL del archivo ✅
4. UPDATE users.avatar_url en DB ✅
5. UPDATE estado local (UI) ✅
  ↓
Toast de éxito ✨
```

---

## 📁 Estructura de Archivos

### Modificados:
- `src/app/dashboard/client/profile/page.tsx` - Agregado upload de avatares

### Reutilizados:
- `src/components/ImageCropper.tsx` - Componente existente de crop

### Nuevos:
- `Database/setup_avatars_storage.sql` - Setup del bucket y políticas
- `Database/AVATAR_UPLOAD_SETUP.md` - Esta documentación

---

## 🐛 Troubleshooting

### Error: "Failed to upload"

**Causa:** Bucket no existe o RLS policy incorrecta

**Solución:**
1. Verifica que el bucket `avatars` existe en Storage
2. Ejecuta `setup_avatars_storage.sql`
3. Verifica políticas en Storage → avatars → Policies

### Error: "Failed to update profile"

**Causa:** Error al actualizar `users.avatar_url`

**Solución:**
1. Verifica que la tabla `users` tiene columna `avatar_url` (TEXT)
2. Verifica RLS policies en tabla `users`
3. Check logs en Supabase Dashboard

### Avatar no se muestra

**Causa:** Bucket no es público o URL incorrecta

**Solución:**
1. Verifica que el bucket `avatars` tiene "Public" enabled
2. Verifica que la URL en DB es válida
3. Abre la URL en el navegador (debe cargar la imagen)

### Imagen muy grande / lenta

**Causa:** ImageCropper genera imagen demasiado grande

**Solución:**
- ImageCropper ya está configurado para 400x400px @ 98% quality
- Si necesitas reducir más, edita `maxWidth` y `maxHeight` en el componente

---

## 🎨 Design Consistency

**Tema Cliente (Verde):**
- Botón de cámara: `bg-emerald-600 hover:bg-emerald-700`
- Avatar fallback: `bg-emerald-100 text-emerald-600`
- Loader durante upload: `text-emerald-600`

**Consistente con:**
- Design System (`CLAUDE.md`)
- Dual Theme System (Cliente = Verde, Negocio = Naranja)

---

## ✅ Checklist de Testing

- [ ] Bucket `avatars` existe en Supabase Storage
- [ ] Bucket es público (Public: Yes)
- [ ] RLS policies creadas y habilitadas
- [ ] Cliente puede subir una imagen (primera vez)
- [ ] Cliente puede actualizar su avatar (reemplazo)
- [ ] Validación rechaza archivos no-imagen
- [ ] Validación rechaza archivos >5MB
- [ ] Crop funciona correctamente
- [ ] Avatar se muestra en toda la app
- [ ] Avatar anterior se elimina del Storage
- [ ] Toasts muestran feedback correcto

---

**Fecha:** 2025-01-XX
**Feature:** Avatar Upload para Clientes
**Versión:** 1.0
