# Test de Emails - Diagnóstico

## ❌ Problema: Emails no llegan (ni cliente ni negocio)

**Síntoma:**
- API devuelve success: `{ success: true, data: { id: '...' } }`
- Resend acepta el request
- Pero los emails NO llegan a ningún destinatario

---

## 🔍 Diagnóstico

### 1. Verificar estado en Resend Dashboard

**URL:** https://resend.com/emails

**Buscar estos IDs:**
- `9c094ca8-4ff0-49c1-99bc-78c8be62b8cf`
- `5a98da92-0ea6-4529-83f8-b37123c3a9a3`

**Estados posibles:**
- ✅ **Delivered** - Email enviado correctamente
- ⏳ **Queued** - Email en cola (debería enviarse en segundos)
- ❌ **Failed** - Falló el envío (ver error)
- 🚫 **Bounced** - Email rebotado (destinatario no existe)

---

### 2. Verificar Dominio en Resend

**URL:** https://resend.com/domains

**Verificar `turnoapp.org`:**
- ✅ Debe tener status "Verified"
- ❌ Si dice "Pending" o "Not Verified" → Los emails NO se enviarán

**Registros DNS requeridos:**
```
Type: TXT
Name: @
Value: resend-verification=xxxxx

Type: MX
Name: @
Priority: 10
Value: feedback-smtp.resend.com
```

---

### 3. Verificar Edge Function Logs

**Supabase Dashboard:**
1. Edge Functions → `send-rescheduled-email`
2. Click "Logs"
3. Buscar errores recientes

**Buscar:**
- `❌ Resend API error:`
- `401 Unauthorized`
- `403 Forbidden`
- `Domain not verified`

---

### 4. Prueba Rápida con Email de Prueba

Temporalmente usa el email de prueba de Resend para verificar que todo funciona:

**En tus Edge Functions, cambia temporalmente:**

```typescript
// ANTES (en producción)
from: 'TuTurno <citas@turnoapp.org>'

// DESPUÉS (para testing)
from: 'Acme <onboarding@resend.dev>'
```

**Luego prueba:**
- Cancela/reprograma una cita
- ¿Ahora sí llegan los emails?

**Si llegan:** El problema es tu dominio `turnoapp.org`
**Si NO llegan:** El problema es la API key o configuración de Resend

---

### 5. Verificar API Key en Supabase

**Supabase Dashboard:**
1. Edge Functions → Secrets
2. Verificar `RESEND_API_KEY`

**Probar API key manualmente:**

```bash
curl -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer re_tu_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Acme <onboarding@resend.dev>",
    "to": ["tu-email@gmail.com"],
    "subject": "Test",
    "html": "<strong>Test email</strong>"
  }'
```

**Resultado esperado:**
```json
{
  "id": "xxxxx-xxxxx-xxxxx"
}
```

---

## 🛠️ Soluciones Comunes

### Problema 1: Dominio no verificado

**Solución:**
1. Ve a Resend Dashboard → Domains
2. Click en `turnoapp.org`
3. Copia los registros DNS (TXT, MX, DKIM)
4. Agrégalos en tu proveedor de DNS (GoDaddy, Namecheap, etc.)
5. Espera 24-48 horas para propagación
6. Click "Verify" en Resend

**Mientras tanto (temporal):**
Usa `onboarding@resend.dev` como remitente

### Problema 2: API Key inválida

**Solución:**
1. Ve a Resend Dashboard → API Keys
2. Crea una nueva API key
3. Cópiala
4. En Supabase: Edge Functions → Secrets
5. Actualiza `RESEND_API_KEY`
6. Redeploy las funciones:
   ```bash
   npx supabase functions deploy send-rescheduled-email
   npx supabase functions deploy send-rescheduled-business-notification
   ```

### Problema 3: Emails en spam

**Solución:**
- Revisa carpeta de spam en Gmail/Outlook
- Marca como "No es spam"
- Agrega `citas@turnoapp.org` a contactos

### Problema 4: Límite de rate alcanzado

**Resend Free Tier:**
- 100 emails/día
- 3,000 emails/mes

**Solución:**
- Verifica uso en Resend Dashboard
- Upgrade plan si es necesario

---

## ✅ Checklist de Verificación

- [ ] Dominio `turnoapp.org` está verificado en Resend
- [ ] Registros DNS (TXT, MX, DKIM) están configurados
- [ ] API key es válida y está en Supabase Secrets
- [ ] Edge Functions están desplegadas correctamente
- [ ] No se alcanzó límite de rate (100/día)
- [ ] Emails no están en spam
- [ ] Destinatarios son válidos (no typos en email)

---

## 🧪 Test Manual

**Script para probar directamente:**

```typescript
// test-email.ts
const RESEND_API_KEY = 'tu_api_key_aqui'

const testEmail = async () => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Acme <onboarding@resend.dev>',
      to: ['tu-email@gmail.com'],
      subject: 'Test TuTurno',
      html: '<strong>Este es un email de prueba</strong>'
    })
  })

  const result = await response.json()
  console.log('Response:', result)
}

testEmail()
```

**Si este test funciona pero tus Edge Functions no:**
→ El problema está en las Edge Functions o en el flujo de datos

**Si este test NO funciona:**
→ El problema está en Resend (API key, dominio, etc.)

---

## 📞 Siguiente Paso

**Por favor verifica:**
1. ¿Qué ves en Resend Dashboard cuando buscas los IDs de los emails?
2. ¿Está `turnoapp.org` verificado en Resend?
3. ¿Qué dicen los logs de las Edge Functions en Supabase?

Con esa info puedo darte la solución exacta.
