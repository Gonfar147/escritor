# API — Novel Platform (Fase 1)

Backend NestJS: Auth (email + OAuth Google/GitHub/Microsoft) y Proyectos.

## Setup

```bash
cd apps/api
cp .env.example .env        # completar JWT_SECRET y credenciales OAuth
npm install
docker compose -f ../../infra/docker-compose.yml up -d postgres redis
npm run prisma:migrate      # crea las tablas
npm run start:dev
```

API disponible en `http://localhost:4000/api/v1`.

## Endpoints implementados

**Auth**
- `POST /auth/register` — email + password
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout` (requiere Bearer token)
- `GET /auth/google`, `/auth/google/callback`
- `GET /auth/github`, `/auth/github/callback`
- `GET /auth/microsoft`, `/auth/microsoft/callback` *(requiere instalar `passport-microsoft` y descomentar en `auth.module.ts`)*

**Projects** (todos requieren Bearer token)
- `POST /projects`
- `GET /projects`
- `GET /projects/:id`
- `PATCH /projects/:id`
- `DELETE /projects/:id`

**Structure — Parts** (todos requieren Bearer token)
- `POST /projects/:projectId/parts`
- `GET /projects/:projectId/parts`
- `PATCH /parts/:id`
- `DELETE /parts/:id`
- `POST /projects/:projectId/parts/reorder`

**Structure — Chapters**
- `POST /parts/:partId/chapters`
- `GET /parts/:partId/chapters`
- `PATCH /chapters/:id`
- `DELETE /chapters/:id`
- `POST /parts/:partId/chapters/reorder`
- `POST /chapters/:id/move` — mover a otra parte
- `POST /chapters/:id/duplicate` — duplica capítulo + todas sus escenas
- `POST /chapters/merge` — fusiona varios capítulos (concatena sus escenas)

**Structure — Scenes**
- `POST /chapters/:chapterId/scenes`
- `GET /chapters/:chapterId/scenes`
- `GET /scenes/:id`
- `PATCH /scenes/:id` — autoguardado: recibe `content` (documento Tiptap JSON) y recalcula `wordCount`
- `DELETE /scenes/:id`
- `POST /chapters/:chapterId/scenes/reorder`
- `POST /scenes/:id/move`
- `POST /scenes/:id/duplicate`
- `POST /scenes/merge` — concatena el contenido de varias escenas en una
- `POST /scenes/:id/split` — divide una escena en dos por índice de nodo
- `POST /scenes/:id/versions` — snapshot explícito (no en cada autoguardado)
- `GET /scenes/:id/versions`
- `POST /scenes/:id/versions/:versionId/restore` — restaura, guardando el estado actual como nueva versión antes de sobreescribir

**Characters** (Módulo 5)
- `POST /projects/:projectId/characters`
- `GET /projects/:projectId/characters`
- `GET /characters/:id` — incluye relaciones, objetos que posee, y estadísticas de aparición (primera/última escena, capítulos, "tiempo en pantalla" aproximado por palabras)
- `PATCH /characters/:id`
- `DELETE /characters/:id`
- `POST /characters/:id/relationships` — familia, aliado, enemigo, mentor, pareja, otro
- `DELETE /characters/:id/relationships/:relationshipId`
- `GET /characters/:id/family-tree?depth=3` — árbol genealógico (BFS sobre relaciones tipo FAMILY, no duplica datos)
- `POST /characters/:id/scenes` — vincular a una escena donde aparece
- `DELETE /characters/:id/scenes/:sceneId`

**Locations** (Módulo 6)
- `POST /projects/:projectId/locations`
- `GET /projects/:projectId/locations`
- `GET /locations/:id` — incluye escenas asociadas y personajes que pasaron por ahí (derivado, no se guarda a mano)
- `PATCH /locations/:id`
- `DELETE /locations/:id`
- `POST /locations/:id/scenes` / `DELETE /locations/:id/scenes/:sceneId`

**Objects** (Módulo 7)
- `POST /projects/:projectId/objects` — soporta `ownerCharacterId` y `locationId`
- `GET /projects/:projectId/objects`
- `GET /objects/:id` — primera/última aparición calculadas a partir de las escenas vinculadas
- `PATCH /objects/:id`
- `DELETE /objects/:id`
- `POST /objects/:id/scenes` / `DELETE /objects/:id/scenes/:sceneId`

**World Building** (Módulo 8) — wiki flexible por categoría (país, ciudad, cultura, economía, religión, historia, raza, criatura, idioma, política, tecnología, magia, calendario, moneda, ley, organización)
- `POST /projects/:projectId/world-entries`
- `GET /projects/:projectId/world-entries?category=COUNTRY` — lista, filtrable por categoría
- `GET /projects/:projectId/world-entries/tree?category=COUNTRY` — estructura jerárquica (ej. Países → Ciudades)
- `GET /world-entries/:id` — incluye padre, hijos, y enlaces cruzados en ambas direcciones
- `PATCH /world-entries/:id`
- `DELETE /world-entries/:id`
- `POST /world-entries/:id/links` — enlace tipo wiki a otra entrada, con relación libre ("gobernado por", "en guerra con")
- `DELETE /world-entries/:id/links/:linkId`

> Los árboles genealógicos **no viven acá** — se calculan desde `GET /characters/:id/family-tree`, reusando las relaciones `FAMILY` del Módulo 5. World Building solo referencia personajes/lugares vía enlaces (`WorldEntryLink`) cuando hace falta, en vez de duplicar sus datos.

**Timeline** (Módulo 10)
- `POST /projects/:projectId/timeline/events`
- `GET /projects/:projectId/timeline/events?order=chronological` (default) — orden en que pasaron los hechos (`sortKey`/`date`)
- `GET /projects/:projectId/timeline/events?order=narrative` — orden en que el lector se entera, derivado de las escenas enlazadas (Parte→Capítulo→Escena), nunca guardado a mano
- `GET /projects/:projectId/timeline/inconsistencies` — detecta automáticamente: personaje apareciendo después de su propia muerte, y personaje en el mismo instante en lugares distintos
- `POST /projects/:projectId/timeline/events/reorder`
- `GET /timeline/events/:id`
- `PATCH /timeline/events/:id`
- `DELETE /timeline/events/:id`
- `POST /timeline/events/:id/characters` / `DELETE /timeline/events/:id/characters/:characterId`
- `POST /timeline/events/:id/scenes` / `DELETE /timeline/events/:id/scenes/:sceneId`

**Maps** (Módulo 11)
- `POST /projects/:projectId/maps` — `imageUrl` debe ser una URL ya subida a S3/MinIO (ver nota de pendientes)
- `GET /projects/:projectId/maps?mapType=CITY`
- `GET /projects/:projectId/maps/tree` — jerarquía Mundo → Ciudad → Edificio
- `GET /maps/:id` — incluye pines (con Lugar/Personaje vinculado) y sub-mapas
- `PATCH /maps/:id` / `DELETE /maps/:id`
- `POST /maps/:id/pins` — `x`/`y` son relativos (0..1), no píxeles, para no romperse si cambia la imagen
- `PATCH /pins/:id` / `DELETE /pins/:id`
- `POST /maps/:id/movements` — punto del recorrido de un personaje, opcionalmente atado a una escena o a un evento del Timeline
- `DELETE /movements/:id`
- `GET /maps/:id/characters/:characterId/path` — recorrido completo de un personaje sobre ese mapa, ordenado narrativamente cuando hay escena ancla

**Uploads** — flujo de subida directa a S3/MinIO (el archivo nunca pasa por la API)
- `POST /uploads/presigned-url` — body `{ projectId, filename, contentType }`, devuelve `{ uploadUrl, fileUrl, key }`. El frontend hace `PUT` directo a `uploadUrl` con el binario, y guarda `fileUrl` en el recurso correspondiente (`ResearchItem.fileUrl`, `MapAsset.imageUrl`, `Character.photoUrl`, etc.)
- Tipos de archivo permitidos: imágenes (png/jpeg/webp/gif), PDF, Word, Excel, audio (mp3/wav/m4a), video (mp4/mov/webm) — ver `ALLOWED_CONTENT_TYPES` en `uploads/dto/presigned-url.dto.ts`
- La URL pre-firmada expira en 5 minutos

**Research** (Módulo 9)
- `POST /projects/:projectId/research` — `type` determina qué campo es obligatorio: `LINK`→`linkUrl`, `NOTE`/`CLIPPING`→`content`, el resto→`fileUrl` (subido antes vía `/uploads/presigned-url`)
- `GET /projects/:projectId/research?type=PDF&tag=mitologia&search=dragon` — todos los filtros son opcionales y combinables
- `GET /projects/:projectId/research/tags` — todas las etiquetas usadas, para armar el filtro del frontend
- `GET /research/:id` / `PATCH /research/:id` / `DELETE /research/:id`

## Notas de seguridad

- Passwords con **argon2** (no bcrypt) — mejor resistencia a ataques GPU.
- Refresh tokens rotados en cada uso y guardados **hasheados** en DB, nunca en texto plano.
- `RolesGuard` verifica membresía + rol por proyecto antes de cualquier mutación (se aplica módulo a módulo con el decorador `@Roles(...)`).

## Pendiente antes de producción

- Reemplazar el decodificado manual del refresh token en `auth.controller.ts` (`refresh()`) por un guard `JwtRefreshStrategy` dedicado.
- Agregar tests e2e de los flujos de auth y de permisos por rol.
- Configurar rate-limiting específico en `/auth/login` (fuerza bruta).
- El autoguardado de escenas (`PATCH /scenes/:id`) hoy no crea versiones — decidir si el frontend dispara `POST /scenes/:id/versions` cada N minutos o solo al cerrar la escena, para no llenar la tabla `SceneVersion` con un snapshot por cada tecleo.
- `merge`/`split` de escenas asumen documentos Tiptap con la forma `{ type: 'doc', content: [...] }`; si el editor final genera otra estructura, ajustar `word-count.util.ts` y la lógica de fusión.
- "Primera aparición", "última aparición" y "tiempo en pantalla" de personajes/objetos se calculan en cada request a partir de `SceneCharacter`/`SceneObject`, no se guardan como columnas — evita que queden desactualizados, pero si el proyecto crece mucho (miles de escenas) conviene cachear esto en Redis en vez de recalcularlo siempre.
- Falta el módulo de **etiquetas y color por personaje/lugar/objeto** y la asociación a **líneas argumentales** (esa última depende del módulo de Timeline, Fase 3) — quedan para cuando construyamos esos módulos.
- `WorldEntry.content` usa el mismo formato Tiptap que `Scene.content` a propósito — el editor de escenas se puede reusar tal cual para escribir artículos de la wiki, sin construir un editor aparte.
- No agregué UI ni endpoint de "grafo completo del proyecto" (Módulo 13) todavía — hoy podés armar el grafo del lado del cliente combinando `WorldEntryLink`, `CharacterRelationship` y las tablas `Scene*`; un endpoint dedicado que devuelva todo unificado lo dejamos para cuando construyamos ese módulo específicamente.
- El detector de inconsistencias del Timeline (`findInconsistencies`) implementa 2 reglas simples (aparición después de la muerte, mismo instante en lugares distintos) recorriendo todos los eventos en memoria — con miles de eventos por proyecto conviene moverlo a un job en background (BullMQ/Redis, ya está en la arquitectura) en vez de calcularlo en cada request.
- `sortKey` es un entero manual (como `order` en Partes/Capítulos/Escenas), no una fecha real — a propósito, porque en fantasía/ciencia ficción rara vez hay un calendario real comparable. Si el proyecto usa fechas reales, `date` sí se puede usar para ordenar/mostrar, pero `sortKey` sigue siendo la fuente de verdad para el orden.
- ~~Falta el endpoint real de subida de archivos~~ **Resuelto:** `POST /uploads/presigned-url`. Sigue pendiente conectarlo del lado del frontend (subir con `fetch(uploadUrl, { method: 'PUT', body: file })` y recién ahí guardar `fileUrl` en el recurso).
- `x`/`y` en pines y movimientos son relativos (0..1) a propósito, para que no se rompan si más adelante subís una versión de mayor resolución del mismo mapa.
- La búsqueda de texto en `research.service.ts` (`findAll` con `search`) usa `contains`/`insensitive` de Postgres — funciona bien para un proyecto individual, pero no es la búsqueda semántica real que pide el Módulo 14 (esa necesita OpenSearch/embeddings, ya previstos en la arquitectura, y se implementa junto con el módulo de IA).
