import { Injectable } from '@nestjs/common';
import JSZip from 'jszip';
import { randomUUID } from 'crypto';
import { Manuscript, ExportOptions } from './manuscript-assembler.service';
import { Block, TextRun } from './tiptap-to-blocks.util';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function runsToHtml(runs: TextRun[]): string {
  return runs
    .map((r) => {
      let t = escapeXml(r.text).replace(/\n/g, '<br/>');
      if (r.bold) t = `<strong>${t}</strong>`;
      if (r.italic) t = `<em>${t}</em>`;
      if (r.underline) t = `<u>${t}</u>`;
      if (r.strike) t = `<s>${t}</s>`;
      return t;
    })
    .join('');
}

function blockToHtml(block: Block): string {
  switch (block.type) {
    case 'paragraph':
      return `<p>${runsToHtml(block.runs)}</p>`;
    case 'heading':
      return `<h${block.level + 1}>${runsToHtml(block.runs)}</h${block.level + 1}>`; // h2/h3/h4: h1 queda reservado al título de capítulo
    case 'blockquote':
      return `<blockquote><p>${runsToHtml(block.runs)}</p></blockquote>`;
    case 'bulletItem':
      return `<li>${runsToHtml(block.runs)}</li>`;
    case 'orderedItem':
      return `<li>${runsToHtml(block.runs)}</li>`;
    case 'sceneBreak':
      return `<p class="scene-break">· · ·</p>`;
  }
}

/** Agrupa bullet/ordered items consecutivos dentro de un <ul>/<ol>. */
function blocksToHtml(blocks: Block[]): string {
  const html: string[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.type === 'bulletItem' || b.type === 'orderedItem') {
      const tag = b.type === 'bulletItem' ? 'ul' : 'ol';
      const items: string[] = [];
      while (i < blocks.length && blocks[i].type === b.type) {
        items.push(blockToHtml(blocks[i]));
        i++;
      }
      html.push(`<${tag}>${items.join('')}</${tag}>`);
    } else {
      html.push(blockToHtml(b));
      i++;
    }
  }
  return html.join('\n');
}

const CSS = `
body { font-family: serif; line-height: 1.5; margin: 1em; }
h1 { text-align: center; font-size: 1.6em; margin-bottom: 1.5em; }
h2, h3, h4 { margin-top: 1.2em; }
p { margin: 0 0 0.8em 0; text-indent: 1.2em; }
p.scene-break { text-align: center; text-indent: 0; margin: 1.5em 0; }
blockquote { margin: 1em 2em; font-style: italic; }
.titlepage { text-align: center; margin-top: 30%; }
.titlepage .subtitle { font-size: 1.1em; margin-top: 0.5em; }
.titlepage .author { margin-top: 2em; }
`;

interface ChapterFile {
  id: string;
  filename: string;
  title: string;
  html: string;
}

@Injectable()
export class EpubExporter {
  async export(manuscript: Manuscript, opts: ExportOptions): Promise<Buffer> {
    const zip = new JSZip();
    const bookId = `urn:uuid:${randomUUID()}`;
    const multiplePartTitles = manuscript.parts.length > 1;

    // El primer archivo del zip EPUB debe ser "mimetype", sin comprimir.
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    zip.file(
      'META-INF/container.xml',
      `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
    );

    const chapters: ChapterFile[] = [];

    let chapterCounter = 0;
    for (const part of manuscript.parts) {
      if (opts.includePartTitles && multiplePartTitles) {
        chapterCounter++;
        chapters.push({
          id: `part-${chapterCounter}`,
          filename: `part-${chapterCounter}.xhtml`,
          title: part.title,
          html: `<h1>${escapeXml(part.title)}</h1>`,
        });
      }

      for (const chapter of part.chapters) {
        chapterCounter++;
        const bodyParts: string[] = [`<h1>${escapeXml(chapter.title)}</h1>`];

        chapter.scenes.forEach((scene, idx) => {
          if (idx > 0) bodyParts.push('<p class="scene-break">· · ·</p>');
          if (opts.includeSceneTitles) bodyParts.push(`<h3>${escapeXml(scene.title)}</h3>`);
          bodyParts.push(blocksToHtml(scene.blocks));
        });

        chapters.push({
          id: `chapter-${chapterCounter}`,
          filename: `chapter-${chapterCounter}.xhtml`,
          title: chapter.title,
          html: bodyParts.join('\n'),
        });
      }
    }

    // Página de título
    const titleHtml = `<div class="titlepage">
  <h1>${escapeXml(manuscript.title)}</h1>
  ${manuscript.subtitle ? `<p class="subtitle">${escapeXml(manuscript.subtitle)}</p>` : ''}
  ${manuscript.author ? `<p class="author">${escapeXml(manuscript.author)}</p>` : ''}
</div>`;

    zip.file('OEBPS/styles.css', CSS);
    zip.file('OEBPS/title.xhtml', xhtmlPage('Portada', titleHtml));
    for (const ch of chapters) {
      zip.file(`OEBPS/${ch.filename}`, xhtmlPage(ch.title, ch.html));
    }

    zip.file('OEBPS/nav.xhtml', navDocument(manuscript.title, chapters));
    zip.file('OEBPS/toc.ncx', tocNcx(bookId, manuscript.title, chapters));
    zip.file('OEBPS/content.opf', contentOpf(bookId, manuscript, chapters));

    return zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip' });
  }
}

function xhtmlPage(title: string, bodyHtml: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

function navDocument(bookTitle: string, chapters: ChapterFile[]): string {
  const items = chapters.map((c) => `<li><a href="${c.filename}">${escapeXml(c.title)}</a></li>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>${escapeXml(bookTitle)}</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Índice</h1>
    <ol>
${items}
    </ol>
  </nav>
</body>
</html>`;
}

function tocNcx(bookId: string, bookTitle: string, chapters: ChapterFile[]): string {
  const points = chapters
    .map(
      (c, i) => `<navPoint id="navpoint-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${escapeXml(c.title)}</text></navLabel>
      <content src="${c.filename}"/>
    </navPoint>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
  </head>
  <docTitle><text>${escapeXml(bookTitle)}</text></docTitle>
  <navMap>
${points}
  </navMap>
</ncx>`;
}

function contentOpf(bookId: string, manuscript: Manuscript, chapters: ChapterFile[]): string {
  const manifestItems = [
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
    `<item id="css" href="styles.css" media-type="text/css"/>`,
    `<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>`,
    ...chapters.map((c) => `<item id="${c.id}" href="${c.filename}" media-type="application/xhtml+xml"/>`),
  ].join('\n');

  const spineItems = [`<itemref idref="title"/>`, ...chapters.map((c) => `<itemref idref="${c.id}"/>`)].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${bookId}</dc:identifier>
    <dc:title>${escapeXml(manuscript.title)}</dc:title>
    <dc:language>es</dc:language>
    ${manuscript.author ? `<dc:creator>${escapeXml(manuscript.author)}</dc:creator>` : ''}
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
${manifestItems}
  </manifest>
  <spine>
${spineItems}
  </spine>
</package>`;
}
