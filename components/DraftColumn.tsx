
import React, { useState, useRef, useEffect } from 'react';
import { ManuscriptDraft, Paragraph } from '../types';
import { PlusCircle, Eye, EyeOff, FileText, GripVertical, Check, Clipboard, Upload, Edit3, Save, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface Props {
  index: number;
  draft: ManuscriptDraft;
  onUpdateContent: (text: string) => void;
  onUpdateTitle: (newTitle: string) => void;
  onDeleteParagraph: (id: string) => void;
  onAddParagraph: (p: Paragraph) => void;
  reflectedIds: Set<string>;
  dismissedIds: Set<string>;
  onToggleDismiss: (id: string) => void;
  colorClass: string;
}

const DraftColumn: React.FC<Props> = ({ index, draft, onUpdateContent, onUpdateTitle, onDeleteParagraph, onAddParagraph, reflectedIds, dismissedIds, onToggleDismiss, colorClass }) => {
  const [isPreview, setIsPreview] = useState(false);
  const [isInputtingRaw, setIsInputtingRaw] = useState(false);
  const [rawText, setRawText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rawInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isInputtingRaw && rawInputRef.current) {
      rawInputRef.current.focus();
    }
  }, [isInputtingRaw]);

  const handleDragStart = (e: React.DragEvent, p: Paragraph) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ 
      type: 'new-paragraph',
      paragraph: p 
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleStartInput = () => {
    const currentText = draft.paragraphs.map(p => p.text).join('\n\n');
    setRawText(currentText);
    setIsInputtingRaw(true);
  };

  const handleFinishInput = () => {
    if (rawText.trim() !== '') {
      onUpdateContent(rawText);
    }
    setIsInputtingRaw(false);
  };

  const handlePaste = async () => {
    if (!isInputtingRaw) {
      handleStartInput();
      setTimeout(async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.readText) {
            const text = await navigator.clipboard.readText();
            if (text) setRawText(prev => (prev ? prev + '\n' + text : text));
          }
        } catch (err) {
          console.warn('Clipboard API access restricted');
        }
      }, 50);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        onUpdateContent(text);
        setIsInputtingRaw(false);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className={`h-full flex flex-col rounded-xl border shadow-sm ${colorClass} overflow-hidden transition-all duration-300`}>
      <div className="px-4 py-3 border-b flex flex-col gap-2 bg-white/60 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="font-bold text-slate-400 whitespace-nowrap text-sm">{draft.title}:</span>
            <input 
              type="text"
              value={draft.customTitle || ''}
              onChange={(e) => onUpdateTitle(e.target.value)}
              placeholder="별칭 입력..."
              className="bg-transparent border-none outline-none font-bold text-slate-700 text-sm placeholder:text-slate-300 placeholder:font-normal focus:bg-white/50 px-1.5 py-0.5 rounded transition-all min-w-0 flex-1"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button 
              type="button"
              onClick={handleStartInput}
              className={`p-1.5 rounded-md transition-all ${isInputtingRaw ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-indigo-600 hover:bg-white'}`}
              title="전체 텍스트 편집/입력"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
              <button 
                type="button"
                onClick={() => setIsPreview(false)}
                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${!isPreview ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                원본
              </button>
              <button 
                type="button"
                onClick={() => setIsPreview(true)}
                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${isPreview ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                미리보기
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex gap-1">
          <button 
            type="button"
            onClick={handlePaste}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white border border-slate-200 rounded-md text-[11px] font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
          >
            <Clipboard className="w-3 h-3" /> 붙여넣기
          </button>
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white border border-slate-200 rounded-md text-[11px] font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
          >
            <Upload className="w-3 h-3" /> 파일
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".txt,.md"
            onChange={handleFileUpload}
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative">
        {isInputtingRaw ? (
          <div className="h-full flex flex-col gap-3 animate-in fade-in duration-300">
            <textarea
              ref={rawInputRef}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="여기에 원고를 직접 입력하거나 붙여넣으세요..."
              className="flex-1 w-full p-4 text-sm bg-white border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 resize-none font-sans leading-relaxed text-slate-700 shadow-inner"
            />
            <button 
              type="button"
              onClick={handleFinishInput}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95"
            >
              <Save className="w-4 h-4" /> 입력 완료 및 분석
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {draft.paragraphs.map((p) => {
              const isReflected = reflectedIds.has(p.id);
              const isBlind = dismissedIds.has(p.id);
              const coordinate = `${p.sourceDraftIndex! + 1}-${p.sourceParaIndex! + 1}`;

              return (
                <div 
                  key={p.id}
                  draggable={!isBlind}
                  onDragStart={(e) => handleDragStart(e, p)}
                  onClick={() => !isBlind && onAddParagraph(p)}
                  className={`group relative bg-white p-4 pt-7 rounded-lg border shadow-sm transition-all duration-300
                    ${isBlind ? 'opacity-30 grayscale' : 'cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:ring-2 hover:ring-indigo-100'}
                    ${isReflected ? 'border-emerald-300 ring-1 ring-emerald-50 bg-emerald-50/10' : 'border-slate-200'}
                  `}
                >
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded border border-slate-200">
                    {coordinate}
                  </div>

                  <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
                    {isReflected && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded border border-emerald-200">
                        <Check className="w-2.5 h-2.5" /> 반영됨
                      </div>
                    )}
                    <button 
                      type="button"
                      onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation(); // Stop parent onClick from firing
                          onDeleteParagraph(p.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="단락 삭제"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onToggleDismiss(p.id);
                      }}
                      className={`p-1 rounded hover:bg-slate-100 transition-colors ${isBlind ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
                      title={isBlind ? "블라인드 해제" : "블라인드 처리"}
                    >
                      {isBlind ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="text-sm text-slate-700 leading-relaxed markdown-content">
                    {isPreview ? (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]} 
                        rehypePlugins={[rehypeKatex]}
                      >
                        {p.text}
                      </ReactMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap pointer-events-none">{p.text}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DraftColumn;
