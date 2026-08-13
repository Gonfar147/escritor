import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Server as HttpServer } from 'http';
import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import { Hocuspocus } from '@hocuspocus/server';
import { TiptapTransformer } from '@hocuspocus/transformer';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { IndexingService } from '../indexing/indexing.service';
import { countWordsInTiptapDoc } from '../common/word-count.util';
import { extractTextFromTiptapDoc } from '../indexing/text-chunking.util';
import { parseDocumentName } from './document-name.util';
import { collaborationExtensions } from './collaboration-tiptap-extensions';

/** Nombre del fragmento Yjs que usa @tiptap/extension-collaboration por defecto. */
const YJS_FIELD = 'default';

/** Ruta de upgrade WebSocket para la colaboración — no pasa por el prefijo global de la API REST. */
const COLLABORATION_PATH = '/collaboration';

interface AuthContext {
  userId: string;
  projectId: string;
  sceneId: string;
  userName: string;
  userColor: string;
}

/**
 * Colores estables por usuario para cursores/avatares de presencia, tomados
 * directamente de la paleta "spine" del frontend (brass/verdigris/brick,
 * tailwind.config.ts) para que la UI de colaboración no desentone con el resto.
 */
const PRESENCE_COLORS = ['#B8944F', '#D3B678', '#3E7C74', '#5D9C93', '#B5533C', '#CC7962'];

function colorForUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return PRESENCE_COLORS[hash % PRESENCE_COLORS.length];
}

@Injectable()
export class CollaborationService implements OnModuleDestroy {
  private readonly logger = new Logger(CollaborationService.name);
  private readonly hocuspocus: Hocuspocus;
  private wss?: WebSocketServer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly indexing: IndexingService,
    private readonly jwt: JwtService,
  ) {
    this.hocuspocus = new Hocuspocus({
      // Igual al default de la librería, mencionado acá a propósito: cuánto se
      // espera de inactividad de escritura antes de persistir (debounce 2s),
      // con un tope duro (maxDebounce 10s) para no postergar el guardado
      // indefinidamente si hay escritura continua.
      debounce: 2000,
      maxDebounce: 10000,
      extensions: this.buildExtensions(),
      onAuthenticate: (data) => this.onAuthenticate(data),
      onLoadDocument: (data) => this.onLoadDocument(data),
      onStoreDocument: (data) => this.onStoreDocument(data),
    });
  }

  /**
   * Extensiones opcionales del servidor Hocuspocus (hoy: ninguna). Redis
   * (@hocuspocus/extension-redis) queda preparado acá pero apagado por
   * default — se activa recién si el proyecto escala a más de una instancia
   * del backend, seteando COLLAB_USE_REDIS=true además de REDIS_URL.
   */
  private buildExtensions() {
    const extensions: any[] = [];
    if (process.env.COLLAB_USE_REDIS === 'true' && process.env.REDIS_URL) {
      // Import perezoso: si el flag está apagado, no hace falta ni tener Redis
      // corriendo para que el resto del backend arranque.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Redis } = require('@hocuspocus/extension-redis');
      extensions.push(new Redis({ url: process.env.REDIS_URL }));
      this.logger.log('Colaboración: extensión Redis activada (multi-instancia)');
    }
    return extensions;
  }

  /**
   * Cuelga el servidor de colaboración del mismo http.Server que ya usa Nest/Express
   * (sin puerto propio, sin servicio nuevo). Solo intercepta upgrades a /collaboration;
   * cualquier otro upgrade se descarta explícitamente para no dejar sockets colgados.
   */
  attach(httpServer: HttpServer) {
    this.wss = new WebSocketServer({ noServer: true });

    httpServer.on('upgrade', (request, socket, head) => {
      const { pathname } = new URL(request.url ?? '', 'http://localhost');
      if (pathname !== COLLABORATION_PATH) {
        return; // otro handler (o ninguno) se encarga de este upgrade
      }
      this.wss!.handleUpgrade(request, socket, head, (ws) => {
        this.wss!.emit('connection', ws, request);
      });
    });

    this.wss.on('connection', (ws, request) => {
      this.hocuspocus.handleConnection(ws as any, request);
    });

    this.logger.log(`Colaboración en tiempo real escuchando en ${COLLABORATION_PATH} (mismo proceso HTTP)`);
  }

  async onModuleDestroy() {
    await this.hocuspocus.destroy();
  }

  // ---- Hooks de Hocuspocus ----

  /**
   * Cadena de autorización: token -> usuario -> sceneId (parseado del nombre de
   * documento) -> projectId real (resuelto en BD, nunca confiando en el que venga
   * en el nombre) -> membership -> rol. Sin esto, conocer un sceneId alcanzaría
   * para conectarse a la sala; con esto, hace falta además ser miembro real del
   * proyecto dueño de esa escena.
   */
  private async onAuthenticate(data: {
    token: string;
    documentName: string;
    connection: { readOnly: boolean };
  }): Promise<AuthContext> {
    const parsed = parseDocumentName(data.documentName);
    if (!parsed) {
      throw new Error('Nombre de documento colaborativo inválido');
    }

    if (!data.token) {
      throw new Error('Falta token de autenticación');
    }

    let payload: { sub: string };
    try {
      payload = this.jwt.verify(data.token);
    } catch {
      throw new Error('Token inválido o expirado');
    }
    const userId = payload.sub;

    // Nunca confiamos en el projectId embebido en el nombre del documento: se
    // resuelve siempre desde la escena real en la base de datos.
    const realProjectId = await this.access.projectIdForScene(parsed.sceneId);
    if (realProjectId !== parsed.projectId) {
      throw new Error('El documento no corresponde al proyecto de la escena');
    }

    // Lanza ForbiddenException (que Hocuspocus traduce en cierre de conexión)
    // si el usuario no es miembro del proyecto — así, conocer el sceneId no
    // alcanza para conectarse si no se pertenece al proyecto.
    const membership = await this.access.assertMember(userId, realProjectId);

    const canWrite = (ProjectAccessService.WRITE_ROLES as readonly string[]).includes(membership.role);
    if (!canWrite) {
      data.connection.readOnly = true;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    return {
      userId,
      projectId: realProjectId,
      sceneId: parsed.sceneId,
      userName: user?.name ?? 'Autor/a',
      userColor: colorForUserId(userId),
    };
  }

  /**
   * Hidrata el Y.Doc al abrir la sala por primera vez en este proceso:
   * - si ya existe `ydocState` guardado, restaura el CRDT completo tal cual quedó;
   * - si es la primera vez que esta escena se abre en modo colaborativo, convierte
   *   el `Scene.content` (JSON Tiptap) actual a Y.Doc, para no perder nada de lo
   *   ya escrito con el autoguardado anterior.
   */
  private async onLoadDocument(data: { documentName: string }): Promise<Y.Doc | undefined> {
    const parsed = parseDocumentName(data.documentName);
    if (!parsed) return undefined;

    const scene = await this.prisma.scene.findUnique({
      where: { id: parsed.sceneId },
      select: { content: true, ydocState: true },
    });
    if (!scene) return undefined;

    if (scene.ydocState) {
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, new Uint8Array(scene.ydocState));
      return ydoc;
    }

    return TiptapTransformer.toYdoc(scene.content ?? {}, YJS_FIELD, collaborationExtensions);
  }

  /**
   * Persiste el estado tras cada ráfaga de cambios (debounced por Hocuspocus):
   * escribe Scene.content (JSON, lo que sigue leyendo el resto del sistema) y
   * Scene.ydocState (binario, para reconstruir el CRDT en la próxima carga).
   * Nunca crea una SceneVersion acá — las versiones siguen siendo snapshots
   * explícitos vía POST /scenes/:id/versions, tal cual ya funcionaba.
   */
  private async onStoreDocument(data: {
    documentName: string;
    document: Y.Doc;
    context: AuthContext;
  }) {
    const parsed = parseDocumentName(data.documentName);
    if (!parsed) return;

    const content = TiptapTransformer.fromYdoc(data.document, YJS_FIELD);
    const wordCount = countWordsInTiptapDoc(content);
    const ydocState = Buffer.from(Y.encodeStateAsUpdate(data.document));

    const scene = await this.prisma.scene.update({
      where: { id: parsed.sceneId },
      data: { content, wordCount, ydocState },
      select: { id: true, title: true, content: true },
    });

    const projectId = data.context?.projectId ?? (await this.access.projectIdForScene(parsed.sceneId));
    this.indexing.indexEntityAsync(projectId, 'SCENE', scene.id, scene.title, extractTextFromTiptapDoc(scene.content));
  }
}
