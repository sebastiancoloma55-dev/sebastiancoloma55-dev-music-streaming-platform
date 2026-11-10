# SONARA — Cloudflare Preview

SONARA se prepara para Cloudflare Workers usando OpenNext. La rama de trabajo es `feat/sonara-web-preview`.

## Requisitos
- Cuenta Cloudflare en el plan Free.
- Node.js 22 o superior.
- Variables de entorno de Supabase configuradas en Cloudflare para Preview, nunca en Git.

## Build y prueba local
```bash
npm ci
npm run build:cloudflare
npm run preview:cloudflare
```

## Configuración de Workers Builds
- Repositorio: `sebastiancoloma55-dev/sebastiancoloma55-dev-music-streaming-platform`
- Rama de producción reservada: `main`
- Rama de desarrollo/Preview: `feat/sonara-web-preview`
- Build command: `npm run build:cloudflare`
- Preview command: `npm run preview:cloudflare`
- No activar despliegues de producción ni cambiar la rama principal.

Configurar estas variables como secretos/variables del entorno Preview en Cloudflare:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key)

La clave publishable/anon está diseñada para cliente, pero la protección real de datos depende de RLS. Nunca agregar `service_role` ni claves secretas a variables `NEXT_PUBLIC_`.

## Publicación
No ejecutar `npm run deploy:cloudflare` sin autorización expresa del propietario.
