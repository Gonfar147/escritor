'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { Part, Scene } from '@/types/api';
import { StructureTree } from '@/components/editor/structure-tree';
import { SceneEditor } from '@/components/editor/scene-editor';

export default function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [parts, setParts] = useState<Part[] | null>(null);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  const loadParts = useCallback(async () => {
    const data = await api.get<Part[]>(`/projects/${projectId}/parts`);
    setParts(data);
    return data;
  }, [projectId]);

  useEffect(() => {
    loadParts().then((data) => {
      const firstScene = data[0]?.chapters[0]?.scenes[0];
      if (firstScene) selectScene(firstScene.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function selectScene(sceneId: string) {
    setSelectedSceneId(sceneId);
    const scene = await api.get<Scene>(`/scenes/${sceneId}`);
    setSelectedScene(scene);
  }

  async function addPart() {
    await api.post(`/projects/${projectId}/parts`, { title: 'Nueva parte' });
    loadParts();
  }

  async function addChapter(partId: string) {
    await api.post(`/parts/${partId}/chapters`, { title: 'Nuevo capítulo' });
    loadParts();
  }

  async function addScene(chapterId: string) {
    const scene = await api.post<Scene>(`/chapters/${chapterId}/scenes`, { title: 'Nueva escena' });
    await loadParts();
    selectScene(scene.id);
  }

  function onWordCountChange(sceneId: string, wordCount: number) {
    setParts((prev) =>
      prev
        ? prev.map((part) => ({
            ...part,
            chapters: part.chapters.map((ch) => ({
              ...ch,
              scenes: ch.scenes.map((s) => (s.id === sceneId ? { ...s, wordCount } : s)),
            })),
          }))
        : prev,
    );
  }

  return (
    <div className="grid h-full grid-cols-[260px_1fr]">
      {parts && (
        <StructureTree
          parts={parts}
          selectedSceneId={selectedSceneId}
          onSelectScene={(sceneId) => selectScene(sceneId)}
          onAddPart={addPart}
          onAddChapter={addChapter}
          onAddScene={addScene}
        />
      )}

      {selectedScene ? (
        <SceneEditor
          key={selectedScene.id}
          scene={selectedScene}
          onWordCountChange={(n) => onWordCountChange(selectedScene.id, n)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center text-muted">
          <FileText className="mb-3 h-8 w-8" strokeWidth={1.5} />
          <p className="font-display text-lg text-ink_text">Elegí una escena</p>
          <p className="mt-1 max-w-xs text-sm">O creá una parte nueva para empezar a organizar tu novela.</p>
        </div>
      )}
    </div>
  );
}
