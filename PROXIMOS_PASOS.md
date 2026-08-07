# Próximos pasos — Novel Platform

Lista para llevar a Claude Code. Organizada por impacto real, no por orden de los módulos originales — lo primero es lo que más te bloquea para usar la app de verdad.

---

## 🔴 Prioridad 1 — Sin esto, la app no se siente terminada para uso diario

1. **Conectar la subida de archivos (S3) al frontend.**
   Backend listo (`POST /uploads/presigned-url`). Falta: un componente `<ImageUpload />` que tome un `<input type="file">`, pida la URL pre-firmada, haga el `PUT` directo a S3/MinIO, y guarde `fileUrl` en el campo correspondiente. Usarlo en: portada de proyecto, foto de personaje, imagen de mapa, archivos de Investigación.
   *Por qué primero:* hoy todos esos campos piden pegar una URL a mano — no es usable para nadie que no sea vos mismo probando.

2. **Drag & drop para reordenar.**
   Backend listo (`POST .../reorder` en Partes, Capítulos, Escenas, Timeline). Falta conectar una librería (`@dnd-kit/core` es la más liviana para esto) en `structure-tree.tsx` y en la lista de eventos del Timeline.
   *Por qué:* reordenar es una acción que un escritor hace todo el tiempo; sin esto, reorganizar un capítulo implica editar campos a mano.

3. **Menú contextual en el árbol de estructura:** mover / duplicar / fusionar / dividir capítulos y escenas.
   Backend 100% listo, cero UI. Es la funcionalidad más "Scrivener" que tenés y hoy está invisible.

4. **OAuth (Google/GitHub) conectado.**
   Backend expone `/auth/google` y `/auth/github`. Falta: botones en `login/page.tsx`, y una página `/auth/callback` que lea el `accessToken` del fragmento de la URL (`#token=...`) y llame `setAccessToken`.

---

## 🟡 Prioridad 2 — Completa lo que ya empezaste

5. **Relaciones entre personajes + árbol genealógico en la UI.**
   `POST /characters/:id/relationships` y `GET /characters/:id/family-tree` existen; la ficha de personaje no los muestra. Un buen primer paso: una sección nueva en `character-form.tsx` con la lista de relaciones + un botón para agregar, y una vista simple del árbol (podés usar el Visualizer o una librería de grafos tipo `react-flow`).

6. **Enlaces cruzados de World Building (`WorldEntryLink`).**
   Hoy solo se usa la jerarquía padre/hijo. Agregar una sección en `world-entry-form.tsx` para crear/ver enlaces tipo wiki entre entradas ("gobernado por", "en guerra con").

7. **Recorrido de personajes sobre el mapa.**
   `CharacterMovement` y `GET /maps/:id/characters/:id/path` existen; el visor de mapas (`map-viewer.tsx`) solo dibuja pines estáticos. Sumar: al seleccionar un personaje, dibujar una línea conectando sus puntos de movimiento en orden.

8. **Comentarios y comparación de versiones en el editor.**
   El backend de escenas ya versiona (`POST/GET /scenes/:id/versions`, `restore`). Falta un panel lateral en `scene-editor.tsx` para ver el historial y restaurar.

9. **Modo claro.**
   Los tokens `paper-*` ya están en `tailwind.config.ts`. Falta un toggle que agregue/quite la clase `light` en `<html>` (ver `globals.css`, ya tiene las reglas condicionales).

---

## 🟢 Prioridad 3 — Fase 4 del roadmap original (IA + RAG)

10. **Módulo 12 — IA con RAG.** El más grande que queda. Requiere:
    - Generar embeddings (API de Anthropic) para escenas/personajes/lugares/notas al guardarlos, usando la columna `vector` de `pgvector` que ya está en el schema de `Scene`.
    - Un endpoint de chat que arme el contexto recuperando los fragmentos más relevantes por similitud antes de llamar al modelo — nunca "inventar" datos del proyecto.
    - UI: un panel de chat lateral, disponible desde cualquier pantalla del proyecto.

11. **Módulo 13 — Grafo de relaciones visual.** Una vez que tengas 5, 6, 7 y World Building con datos reales, un endpoint que unifique todo (`WorldEntryLink` + `CharacterRelationship` + apariciones en escena) y una vista de grafo interactivo.

12. **Módulo 14 — Búsqueda semántica.** Depende de los embeddings del punto 10. Sin eso, hoy `research.service.ts` solo hace `ILIKE` de Postgres.

---

## 🔵 Prioridad 4 — Antes de producción (no bloquea seguir desarrollando)

13. Reemplazar el decodificado manual del refresh token en `auth.controller.ts` por un guard dedicado.
14. Tests e2e de auth y permisos por rol (hoy no hay ningún test escrito).
15. Rate-limiting específico en `/auth/login` contra fuerza bruta.
16. Mover el detector de inconsistencias del Timeline a un job en background si el proyecto crece a miles de eventos.
17. Kubernetes + CI/CD real (hoy Docker Compose alcanza, está en la arquitectura para cuando haga falta).

---

## Cómo usar esto en Claude Code

Le podés pasar este archivo tal cual y pedirle que arranque por el punto 1, o decirle "empezá por la Prioridad 1 en orden" — cada punto es lo bastante chico como para ser una sesión de trabajo razonable, y todos están anotados también en los README de `apps/api` y `apps/web` con más contexto técnico si Claude Code necesita profundizar.
