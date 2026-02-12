import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ManuscriptDraft, Paragraph } from './types';
import DraftColumn from './components/DraftColumn';
import FinalColumn from './components/FinalColumn';
import { Download, Layout, Trash2, FolderOpen, Save } from 'lucide-react';

const STORAGE_KEY = 'draft-synthesizer-v1';

const App: React.FC = () => {
  // --- State Initialization from LocalStorage ---
  const [drafts, setDrafts] = useState<ManuscriptDraft[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.drafts) return parsed.drafts;
      } catch (e) {
        console.error("Failed to parse drafts from storage", e);
      }
    }
    return [
      { id: 1, title: '초안 1', customTitle: '', paragraphs: [] },
      { id: 2, title: '초안 2', customTitle: '', paragraphs: [] },
      { id: 3, title: '초안 3', customTitle: '', paragraphs: [] },
    ];
  });

  const [finalParagraphs, setFinalParagraphs] = useState<Paragraph[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.finalParagraphs) return parsed.finalParagraphs;
      } catch (e) {
        console.error("Failed to parse finalParagraphs from storage", e);
      }
    }
    return [];
  });

  const [dismissedParagraphIds, setDismissedParagraphIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.dismissedParagraphIds) return new Set(parsed.dismissedParagraphIds);
      } catch (e) {
        console.error("Failed to parse dismissedParagraphIds from storage", e);
      }
    }
    return new Set();
  });

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const globalFileInputRef = useRef<HTMLInputElement>(null);

  // --- Persistence Effect ---
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      const stateToSave = {
        drafts,
        finalParagraphs,
        dismissedParagraphIds: Array.from(dismissedParagraphIds)
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      setSaveStatus('saved');
    }, 500); // Debounce saves

    return () => clearTimeout(timer);
  }, [drafts, finalParagraphs, dismissedParagraphIds]);

  /**
   * Parses text into paragraphs using two or more newlines as the separator.
   */
  const parseTextToParagraphs = (text: string, draftIndex: number): Paragraph[] => {
    return text
      .split(/\n\s*\n+/)
      .map(p => p.trim())
      .filter(p => p !== '')
      .map((paraText, pIdx) => {
        const id = `draft-${draftIndex}-${pIdx}-${Date.now()}-${Math.random()}`;
        return {
          id,
          text: paraText,
          sourceDraftIndex: draftIndex,
          sourceParaIndex: pIdx,
          originalId: id
        };
      });
  };

  const updateDraftContent = useCallback((idx: number, text: string) => {
    setDrafts(prev => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        paragraphs: parseTextToParagraphs(text, idx)
      };
      return next;
    });
  }, []);

  const updateDraftTitle = useCallback((idx: number, newCustomTitle: string) => {
    setDrafts(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], customTitle: newCustomTitle };
      return next;
    });
  }, []);

  const removeParagraphFromDraft = useCallback((draftIdx: number, paraId: string) => {
    setDrafts(prev => prev.map((draft, i) => 
      i === draftIdx 
        ? { ...draft, paragraphs: draft.paragraphs.filter(p => p.id !== paraId) }
        : draft
    ));
  }, []);

  const handleGlobalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newDrafts = [...drafts];
    const sortedFiles = (Array.from(files) as File[]).sort((a, b) => a.name.localeCompare(b.name));

    for (let i = 0; i < Math.min(sortedFiles.length, 3); i++) {
      const file = sortedFiles[i];
      const text = await file.text();
      newDrafts[i] = {
        ...newDrafts[i],
        paragraphs: parseTextToParagraphs(text, i)
      };
    }
    setDrafts(newDrafts);
    if (globalFileInputRef.current) globalFileInputRef.current.value = '';
  };

  const addParagraphToFinal = useCallback((paragraph: Paragraph, atIndex?: number) => {
    const newPara = { 
      ...paragraph, 
      id: `final-${Date.now()}-${Math.random()}`,
      originalId: paragraph.originalId || paragraph.id 
    };
    setFinalParagraphs(prev => {
      if (atIndex !== undefined) {
        const next = [...prev];
        next.splice(atIndex, 0, newPara);
        return next;
      }
      return [...prev, newPara];
    });
  }, []);

  const reflectedIds = useMemo(() => {
    return new Set(finalParagraphs.map(p => p.originalId).filter(Boolean));
  }, [finalParagraphs]);

  const addAllFromDraft = useCallback((draftIdx: number) => {
    const sourceDraft = drafts[draftIdx];
    const toAdd = sourceDraft.paragraphs.filter(p => !reflectedIds.has(p.id));
    
    setFinalParagraphs(prev => {
      const newEntries = toAdd.map(p => ({
        ...p,
        id: `final-${Date.now()}-${Math.random()}`,
        originalId: p.id
      }));
      return [...prev, ...newEntries];
    });
  }, [drafts, reflectedIds]);

  const removeAllFromDraft = useCallback((draftIdx: number) => {
    setFinalParagraphs(prev => prev.filter(p => p.sourceDraftIndex !== draftIdx));
  }, []);

  const removeParagraphFromFinal = useCallback((id: string) => {
    setFinalParagraphs(prev => prev.filter(p => p.id !== id));
  }, []);

  const updateFinalParagraphText = useCallback((id: string, newText: string) => {
    setFinalParagraphs(prev => prev.map(p => p.id === id ? { ...p, text: newText } : p));
  }, []);

  const moveParagraphInFinal = useCallback((dragIndex: number, hoverIndex: number) => {
    setFinalParagraphs(prev => {
      const updated = [...prev];
      const [removed] = updated.splice(dragIndex, 1);
      updated.splice(hoverIndex, 0, removed);
      return updated;
    });
  }, []);

  const toggleDismissParagraph = useCallback((id: string) => {
    setDismissedParagraphIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearFinal = () => {
    if (window.confirm('최종 원고를 모두 삭제하시겠습니까?')) {
      setFinalParagraphs([]);
    }
  };

  const exportText = () => {
    const fullText = finalParagraphs.map(p => p.text).join('\n\n');
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'final_manuscript.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-50">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Layout className="text-white w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">Draft Synthesizer <span className="text-indigo-600">Pro</span></h1>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'saved' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
              <span className="text-slate-400 font-medium uppercase tracking-wider">
                {saveStatus === 'saved' ? '브라우저에 저장됨' : '저장 중...'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={globalFileInputRef}
            className="hidden"
            multiple
            accept=".txt,.md"
            onChange={handleGlobalFileUpload}
          />
          <button 
            onClick={() => globalFileInputRef.current?.click()}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95"
            title="여러 파일을 한 번에 불러와 초안들에 배정합니다"
          >
            <FolderOpen className="w-4 h-4 text-indigo-500" />
            전체 파일 불러오기
          </button>
          
          <div className="w-px h-6 bg-slate-200 mx-1"></div>

          <button 
            onClick={exportText}
            disabled={finalParagraphs.length === 0}
            className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 shadow-sm"
          >
            <Download className="w-4 h-4" /> 내보내기
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col overflow-hidden">
        <div className="flex flex-1 gap-4 overflow-x-auto overflow-y-hidden pb-2 h-full">
          {drafts.map((draft, idx) => (
            <div key={draft.id} className="min-w-[320px] max-w-[400px] flex-1 flex flex-col h-full">
              <DraftColumn 
                index={idx}
                draft={draft} 
                onUpdateContent={(text) => updateDraftContent(idx, text)}
                onUpdateTitle={(newTitle) => updateDraftTitle(idx, newTitle)}
                onDeleteParagraph={(paraId) => removeParagraphFromDraft(idx, paraId)}
                onAddParagraph={addParagraphToFinal} 
                onAddAll={() => addAllFromDraft(idx)}
                onRemoveAll={() => removeAllFromDraft(idx)}
                reflectedIds={reflectedIds}
                dismissedIds={dismissedParagraphIds}
                onToggleDismiss={toggleDismissParagraph}
                colorClass={idx === 0 ? 'border-blue-200 bg-blue-50/30' : idx === 1 ? 'border-emerald-200 bg-emerald-50/30' : 'border-amber-200 bg-amber-50/30'}
              />
            </div>
          ))}
          <div className="min-w-[480px] flex-[1.5] flex flex-col h-full relative">
            <div className="absolute top-4 right-8 z-10 flex items-center gap-2">
              <button 
                onClick={clearFinal}
                className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-400 hover:text-red-500 hover:border-red-100 transition-colors shadow-sm"
                title="전체 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <FinalColumn 
              paragraphs={finalParagraphs} 
              onRemove={removeParagraphFromFinal} 
              onReorder={moveParagraphInFinal}
              onUpdateText={updateFinalParagraphText}
              onAddNew={addParagraphToFinal}
            />
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-6 py-2 text-[10px] text-slate-400 text-center shrink-0">
        © 2024 Draft Synthesizer Pro - Unified Manuscript Workspace
      </footer>
    </div>
  );
};

export default App;