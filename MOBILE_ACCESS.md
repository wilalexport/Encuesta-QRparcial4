# 📱 Cómo acceder a las encuestas desde tu celular

## Problema
El QR muestra `localhost:5173` que solo funciona en tu computadora.

## Solución: Usar tu IP de red local

### Paso 1: Obtener tu IP local

**En Windows (PowerShell):**
```powershell
ipconfig
```
Busca "Dirección IPv4" en tu adaptador de red WiFi/Ethernet.
Ejemplo: `192.168.1.100`

**Alternativa rápida:**
```powershell
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"}).IPAddress
```

### Paso 2: Iniciar Vite con acceso a la red

**Opción A: Editar package.json (RECOMENDADO)**

Abre `package.json` y cambia:
```json
"scripts": {
  "dev": "vite --host"
}
```

**Opción B: Comando directo**
```powershell
npm run dev -- --host
```

### Paso 3: Acceder desde el celular

1. Asegúrate que tu celular esté en la **misma red WiFi** que tu computadora
2. Abre el navegador del celular
3. Ve a: `http://TU-IP-LOCAL:5173`
   - Ejemplo: `http://192.168.1.100:5173`

### Paso 4: Generar nuevo QR

1. Reinicia el servidor con `--host`
2. Ve a tus encuestas publicadas
3. El QR ahora tendrá tu IP local en lugar de localhost
4. Escanea el QR desde tu celular ✅

## ⚠️ Notas Importantes

### Firewall de Windows
Si no puedes acceder, permite el puerto 5173:

```powershell
New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
```

### IP Dinámica
Tu IP puede cambiar. Si el QR deja de funcionar:
1. Verifica tu IP actual: `ipconfig`
2. Reinicia el servidor si cambió
3. Regenera los QR de tus encuestas

### Para Producción (Vercel/Netlify)
Cuando despliegues en producción, el QR usará automáticamente tu dominio real:
- Ejemplo: `https://encuestas-qr.vercel.app/s/mi-encuesta`
- Este QR funcionará desde cualquier lugar del mundo 🌍

## 🚀 Comandos Útiles

```powershell
# Ver tu IP
ipconfig

# Iniciar servidor con acceso a red
npm run dev -- --host

# Ver qué dispositivos están conectados
arp -a
```

## 📋 Checklist Rápido

- [ ] Obtener IP local
- [ ] Agregar `--host` al comando dev
- [ ] Permitir en firewall si es necesario
- [ ] Conectar celular a misma WiFi
- [ ] Acceder desde celular: `http://IP:5173`
- [ ] Generar nuevos QR
- [ ] Escanear y probar ✅
