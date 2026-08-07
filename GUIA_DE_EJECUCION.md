# Cómo ejecutar Novel Platform en tu PC

Guía paso a paso para levantar el backend y el frontend en tu máquina, desde cero. Pensada para Windows, macOS o Linux.

---

## 1. Lo que necesitás instalar antes de empezar

| Herramienta | Versión | Para qué | Link |
|---|---|---|---|
| **Node.js** | 20.x (LTS) | Correr el backend y el frontend | https://nodejs.org |
| **Docker Desktop** | cualquier reciente | Levantar Postgres, Redis y MinIO sin instalarlos a mano | https://www.docker.com/products/docker-desktop |
| **Un editor de código** | el que prefieras | Ver/editar los archivos | VS Code recomendado: https://code.visualstudio.com |

### Verificar que están instalados

Abrí una terminal (en Windows, PowerShell o la terminal de VS Code) y corré:

```bash
node --version    # tiene que decir v20.x.x o más nuevo
npm --version     # viene junto con Node
docker --version  # tiene que responder algo, no un error
```

Si `docker --version` falla, abrí la aplicación **Docker Desktop** primero (tiene que quedar corriendo en segundo plano) y probá de nuevo.

> **Windows:** si nunca usaste Docker Desktop, te va a pedir activar WSL2 la primera vez. Seguí el asistente que te muestra la propia app — es automático.

---

## 2. Descomprimir el proyecto

Descomprimí el `.zip` que te compartí en una carpeta cómoda, por ejemplo `C:\proyectos\novel-platform` (Windows) o `~/proyectos/novel-platform` (macOS/Linux).

Deberías ver esta estructura:

```
novel-platform/
├── apps/
│   ├── api/      ← backend (NestJS)
│   └── web/      ← frontend (Next.js)
├── infra/
│   └── docker-compose.yml
├── packages/
│   └── prisma/   ← schema de base de datos, compartido
└── PROXIMOS_PASOS.md
```

Todo lo que sigue asume que abriste una terminal **parada dentro de esta carpeta** (`novel-platform/`). En VS Code: `Abrir carpeta` → seleccioná `novel-platform`, y abrí la terminal integrada con `` Ctrl+` `` (o `Cmd+`` en Mac).

---

## 3. Levantar la infraestructura (base de datos, cache, almacenamiento)

El backend necesita Postgres, Redis y MinIO corriendo. Docker Compose los levanta a todos con un solo comando — no necesitás instalar Postgres en tu PC.

```bash
cd infra
docker compose up -d postgres redis minio
cd ..
```

Esto descarga las imágenes la primera vez (puede tardar unos minutos) y después los deja corriendo en segundo plano.

**Verificá que están arriba:**

```bash
docker compose -f infra/docker-compose.yml ps
```

Deberías ver `postgres`, `redis` y `minio` con estado `running` o `healthy`.

> No levantamos `opensearch` a propósito — ningún endpoint lo usa todavía (la búsqueda de Investigación usa Postgres directamente), y es el servicio que más memoria consume. Si más adelante lo necesitás, `docker compose up -d opensearch`.

---

## 4. Configurar y arrancar el backend

### 4.1 Variables de entorno

```bash
cd apps/api
cp .env.example .env
```

Abrí `apps/api/.env` en tu editor y cambiá esta línea:

```
JWT_SECRET=cambiar-por-un-secreto-largo-y-aleatorio
```

Poné cualquier texto largo random, por ejemplo:

```
JWT_SECRET=a8f3k29dj4nx82jf01mzpqw casi cualquier string largo sirve para desarrollo local
```

**El resto de las variables ya están bien para desarrollo local** (`DATABASE_URL`, `REDIS_URL`, `S3_*` ya apuntan a lo que Docker Compose acaba de levantar). Dejá `GOOGLE_CLIENT_ID`, `GITHUB_CLIENT_ID` y `MICROSOFT_CLIENT_ID` vacíos — sin eso simplemente no vas a poder loguearte con Google/GitHub, pero el login con email sí funciona igual.

### 4.2 Instalar dependencias

Seguís parado en `apps/api`:

```bash
npm install
```

### 4.3 Crear las tablas de la base de datos

```bash
npm run prisma:migrate
```

Te va a pedir un nombre para la migración — escribí algo como `init` y Enter. Esto crea todas las tablas en Postgres según el schema.

### 4.4 Arrancar el servidor

```bash
npm run start:dev
```

Si todo salió bien, vas a ver algo como:

```
API lista en http://localhost:4000/api/v1
```

**Dejá esta terminal abierta** — el backend tiene que seguir corriendo. Para las siguientes instrucciones vas a necesitar una **segunda terminal**.

---

## 5. Configurar y arrancar el frontend

Abrí una **terminal nueva** (no cierres la del backend), parada en la carpeta raíz del proyecto:

```bash
cd apps/web
cp .env.example .env.local
```

`apps/web/.env.local` ya viene apuntando a `http://localhost:4000/api/v1`, que es donde está corriendo el backend que arrancaste en el paso anterior — no hace falta tocar nada.

```bash
npm install
npm run dev
```

Vas a ver algo como:

```
▲ Next.js 14.x.x
- Local:  http://localhost:3000
```

---

## 6. Probar que funciona

1. Abrí **http://localhost:3000** en el navegador.
2. Te va a redirigir a `/login`. Andá a **"Creá una"** (registro).
3. Completá nombre, email y una contraseña de al menos 8 caracteres.
4. Deberías caer en el dashboard, vacío. Creá un proyecto de prueba.
5. Entrá al proyecto → pestaña **Escribir** → creá una Parte, un Capítulo, una Escena, y escribí algo. Después de ~1 segundo debería aparecer "Guardado" arriba a la derecha del editor.

Si llegaste hasta acá y guardó, **todo está funcionando correctamente**.

---

## 7. Comandos para el día a día

Una vez que ya hiciste la instalación inicial (pasos 3 y 4.1-4.3 no hace falta repetirlos), para volver a trabajar otro día solo necesitás:

```bash
# Terminal 1 — infraestructura (si Docker Desktop no las dejó corriendo)
cd infra && docker compose up -d postgres redis minio

# Terminal 2 — backend
cd apps/api && npm run start:dev

# Terminal 3 — frontend
cd apps/web && npm run dev
```

Para **apagar todo** al terminar:

- `Ctrl+C` en las terminales del backend y frontend.
- `docker compose -f infra/docker-compose.yml stop` (apaga los contenedores sin borrar los datos — la próxima vez que hagas `up` vas a tener tu base de datos tal cual la dejaste).

---

## 8. Problemas comunes

### "Port 5432 is already in use" (o 6379, o 9000)
Ya tenés Postgres/Redis/MinIO corriendo en tu PC por otra razón (por ejemplo, otro proyecto). Opciones:
- Apagá ese otro servicio.
- O cambiá el puerto en `infra/docker-compose.yml` (por ejemplo `"5433:5432"` en vez de `"5432:5432"`) **y** actualizá `DATABASE_URL` en `apps/api/.env` para que coincida.

### El backend no arranca y el error menciona "clientID" o "OAuth2Strategy"
Ya está resuelto en esta versión del código (las estrategias de Google/GitHub solo se registran si configuraste esas credenciales). Si lo ves igual, asegurate de tener la última versión de `apps/api/src/auth/auth.module.ts` que te compartí.

### `npm run prisma:migrate` falla con un error de conexión
Casi seguro Postgres todavía no terminó de levantar. Esperá 10-15 segundos después de `docker compose up -d` y probá de nuevo. Podés confirmar que está listo con:
```bash
docker compose -f infra/docker-compose.yml ps
```
(tiene que decir `healthy`, no solo `running`).

### El frontend carga pero al loguearte no pasa nada / error de CORS en la consola del navegador
Confirmá que el backend está corriendo (`http://localhost:4000/api/v1` debería responder algo, aunque sea un error 404, no "no se puede conectar"). Si cambiaste el puerto del backend, actualizá `NEXT_PUBLIC_API_URL` en `apps/web/.env.local`.

### "Cannot find module '@prisma/client'" al arrancar el backend
Te faltó correr `npm run prisma:migrate` (paso 4.3), que genera el cliente de Prisma además de crear las tablas. Si ya corriste las migraciones antes y solo necesitás regenerar el cliente: `npm run prisma:generate`.

### Quiero borrar todo y empezar de cero
```bash
cd infra
docker compose down -v   # -v borra también los datos guardados (¡perdés todo lo que creaste!)
```
Después repetís desde el paso 3.

---

## 9. Qué NO vas a poder hacer todavía (a propósito)

Esta versión cubre el loop central (auth, proyectos, escritura, personajes/lugares/objetos, mundo, timeline, mapas, investigación) pero no todo lo del `PROXIMOS_PASOS.md`. En concreto, en tu PC:

- **No vas a poder subir imágenes de verdad** (fotos de personajes, portadas, mapas) — todos esos campos piden pegar una URL. MinIO está corriendo y el backend ya sabe generar URLs de subida, pero el frontend todavía no tiene el selector de archivo conectado.
- **No vas a poder loguearte con Google/GitHub** salvo que consigas credenciales OAuth propias y las pongas en `apps/api/.env`.
- **No hay drag & drop** para reordenar capítulos/escenas/eventos — se reordenan sí o sí desde el backend (por API), no desde la interfaz.

Todo esto está priorizado en `PROXIMOS_PASOS.md` si querés seguir construyendo con Claude Code.
