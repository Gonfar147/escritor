# Web — Novel Platform (Fase 1, loop central)

Next.js 14 (App Router) + TypeScript + Tailwind + Tiptap. Cubre el loop mínimo usable de punta a punta: **login/registro → dashboard de proyectos → editor con árbol de estructura y autoguardado**.

## Setup

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

Necesita el backend corriendo en `http://localhost:4000` (ver `apps/api/README.md`).

## Sistema de diseño

- **Paleta:** `ink-950/900/800` (fondo/superficie oscuros), `paper-50` (modo claro, preparado en Tailwind pero el toggle todavía no está conectado a UI), `brass` (acento primario), `verdigris` (estados positivos), `brick` (error/eliminar).
- **Tipografía:** `Fraunces` (display, títulos y contenido del editor), `Inter` (UI), `IBM Plex Mono` (contadores, timestamps).
- **Elemento firma:** el árbol de estructura (`components/editor/structure-tree.tsx`) se dibuja con rebordes horizontales sutiles que simulan el lomo de un libro, y la escena activa lleva un indicador "estampado" en `brass`. Las tarjetas de proyecto (`components/project/project-card.tsx`) repiten el motivo con una franja de color en el borde izquierdo, como libros en un estante.
- Todos los tokens están en `tailwind.config.ts` — cambiar el diseño global es cambiar ese archivo, no ir componente por componente.

## Qué funciona hoy

- **Auth:** login, registro, refresh automático de token en cualquier request que devuelva 401 (`lib/api.ts`), logout.
- **Dashboard:** lista de proyectos, creación de proyecto.
- **Navegación del proyecto:** barra de pestañas (`projects/[projectId]/layout.tsx`) — Resumen, Escribir, Personajes, Lugares, Objetos, Mundo, Línea temporal, Mapas, Investigación.
- **Editor:** árbol Parte→Capítulo→Escena con creación inline de cada nivel; autoguardado con debounce de 1.2s contra `PATCH /scenes/:id`; contador de palabras en vivo; modo foco.
- **Overview de proyecto:** estadísticas básicas y barra de progreso contra `wordGoal`.
- **Personajes:** ficha completa (info general, apariencia, personalidad/arco) con autoguardado; lista con búsqueda.
- **Lugares y Objetos:** ficha con autoguardado; Objetos permite asignar dueño/ubicación reales (select conectado a Personajes/Lugares del proyecto).
- **World Building:** wiki filtrable por categoría, jerarquía padre/hijo, editor Tiptap para el artículo (reusa el mismo formato de documento que las escenas).
- **Línea temporal:** toggle cronológico/narrativo, banner de inconsistencias detectadas por el backend, ficha de evento con personajes vinculados (con ícono de calavera si el evento es de tipo Muerte).
- **Mapas:** visor con click-para-agregar-pin (coordenadas relativas), vínculo de cada pin a un Lugar o Personaje existente.
- **Investigación:** grilla filtrable por tipo/etiqueta/búsqueda, con campos que cambian según el tipo (link, nota, archivo).

## Qué falta a propósito (quedó fuera de este pase)

- **OAuth (Google/GitHub):** los botones no están — el backend ya expone `/auth/google`, `/auth/github`, falta conectarlos a un botón que redirija ahí y una página `/auth/callback` que lea el token del fragmento de la URL.
- **Drag & drop:** en ningún módulo se puede arrastrar para reordenar todavía (Partes/Capítulos/Escenas, eventos del Timeline) — todos los endpoints `.../reorder` del backend están listos y sin usar.
- **Mover/duplicar/fusionar/dividir capítulos y escenas:** el backend los tiene completos, falta el menú contextual en el árbol de estructura.
- **Subida de imágenes real:** `POST /uploads/presigned-url` existe en el backend, pero todos los campos de imagen del frontend (portada de proyecto, foto de personaje, imagen de mapa) hoy piden una URL pegada a mano en vez de un selector de archivo conectado al flujo de subida.
- **Modo claro:** los tokens de `paper-*` están definidos en Tailwind pero no hay toggle conectado — hoy la app es dark-only.
- **Comentarios, versionado visible, comparación de versiones:** el backend de escenas soporta versiones (`POST/GET /scenes/:id/versions`), pero no hay UI para verlas ni restaurarlas.
- **Recorrido de personajes sobre el mapa:** `CharacterMovement` y `GET /maps/:id/characters/:id/path` existen en el backend, pero el visor de mapas todavía no dibuja esa trayectoria — solo pines estáticos.
- **Relaciones entre personajes y árbol genealógico:** `POST /characters/:id/relationships` y `GET /characters/:id/family-tree` no tienen UI todavía (la ficha de personaje no muestra ni permite editar relaciones).
- **Enlaces cruzados de World Building** (`WorldEntryLink`, el grafo tipo wiki entre entradas) tampoco tienen UI — hoy solo se usa la jerarquía padre/hijo.

## Decisiones de implementación

- **Zustand** para el estado de auth — es la única pieza de estado verdaderamente global; todo lo demás (proyectos, estructura, escena activa) vive en el estado local de cada página con `useState`, sin librería de fetching (React Query, SWR) todavía. Si el árbol de datos crece mucho entre módulos, conviene sumar React Query antes de la Fase 2 del frontend, para no reimplementar caché/invalidación a mano en cada pantalla nueva.
- El access token vive en memoria + `sessionStorage` (no `localStorage`), y el refresh token en la cookie httpOnly que ya pone el backend — así un XSS no puede robar el refresh token, solo el access token de corta duración.
- `SceneEditor` usa `key={selectedScene.id}` en la página del editor para forzar que Tiptap se re-inicialice limpio al cambiar de escena, en vez de mutar el editor existente — es más simple y menos propenso a bugs de sincronización que manejarlo a mano con `setContent` solamente (aunque igual tiene ese efecto como respaldo).
