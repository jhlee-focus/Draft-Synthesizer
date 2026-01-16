
import React, { useRef, useEffect, useState } from 'react';
import { Paragraph } from '../types';
import { GripVertical, X, PlusCircle, Check, Image as ImageIcon, Edit3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface Props {
  paragraphs: Paragraph[];
  onRemove: (id: string) => void;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  onUpdateText: (id: string, newText: string) => void;
  onAddNew: (paragraph: Paragraph, atIndex: number) => void;
}

const FinalColumn: React.FC<Props> = ({ paragraphs, onRemove, onReorder, onUpdateText, onAddNew }) => {
  const [dropIndicator, setDropIndicator] = useState<{ index: number; position: 'top' | 'bottom' | null }>({ index: -1, position: null });
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? 'top' : 'bottom';
    setDropIndicator({ index, position });
  };

  const handleDragLeave = () => {
    setDropIndicator({ index: -1, position: null });
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData('application/json');
    const files = e.dataTransfer.files;

    if (files && files.length > 0) {
      handleImageFiles(files, dropIndicator.position === 'bottom' ? dropIndex + 1 : dropIndex);
      setDropIndicator({ index: -1, position: null });
      return;
    }

    if (!dataStr) return;
    const data = JSON.parse(dataStr);
    const finalIndex = dropIndicator.position === 'bottom' ? dropIndex + 1 : dropIndex;

    if (data.type === 'new-paragraph') {
      onAddNew(data.paragraph, finalIndex);
    } else if (data.type === 'reorder-paragraph') {
      const sourceIndex = data.index;
      if (sourceIndex !== finalIndex && sourceIndex !== finalIndex - 1) {
        const targetIndex = sourceIndex < finalIndex ? finalIndex - 1 : finalIndex;
        onReorder(sourceIndex, targetIndex);
      }
    }
    setDropIndicator({ index: -1, position: null });
  };

  const handleMainDrop = (e: React.DragEvent) => {
    if (dropIndicator.index === -1) {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleImageFiles(files, paragraphs.length);
            return;
        }

        const dataStr = e.dataTransfer.getData('application/json');
        if (!dataStr) return;
        const data = JSON.parse(dataStr);
        if (data.type === 'new-paragraph') {
            onAddNew(data.paragraph, paragraphs.length);
        }
    }
  };

  const handleImageFiles = async (files: FileList, atIndex: number) => {
    const file = files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            const newParagraph: Paragraph = {
                id: `img-${Date.now()}`,
                text: `![${file.name}](${base64})`,
            };
            onAddNew(newParagraph, atIndex);
        };
        reader.readAsDataURL(file);
    }
  };

  return (
    <div 
        className="h-full flex flex-col rounded-xl border border-indigo-200 bg-white shadow-lg overflow-hidden"
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={handleMainDrop}
    >
      <div className="px-6 py-4 border-b border-indigo-100 bg-indigo-50/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div>
          <h3 className="font-bold text-indigo-900">최종 원고 (통합 영역)</h3>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={imageInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={(e) => e.target.files && handleImageFiles(e.target.files, paragraphs.length)}
          />
          <button 
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm active:scale-95"
          >
            <ImageIcon className="w-3.5 h-3.5" /> 이미지 추가
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar bg-slate-50/30">
        <div className="space-y-4 max-w-3xl mx-auto min-h-full pb-20">
          {paragraphs.map((p, index) => (
            <div 
                key={p.id}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                className="relative"
            >
              {dropIndicator.index === index && dropIndicator.position === 'top' && (
                <div className="absolute -top-2 left-0 right-0 h-1 bg-indigo-500 rounded-full z-10 animate-pulse" />
              )}
              
              <EditableParagraph 
                p={p} 
                index={index}
                onRemove={onRemove} 
                onUpdateText={onUpdateText} 
              />

              {dropIndicator.index === index && dropIndicator.position === 'bottom' && (
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-indigo-500 rounded-full z-10 animate-pulse" />
              )}
            </div>
          ))}

          {paragraphs.length === 0 && (
            <div 
                className="flex flex-col items-center justify-center py-20 px-10 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    const dataStr = e.dataTransfer.getData('application/json');
                    if (dataStr) {
                        const data = JSON.parse(dataStr);
                        if (data.type === 'new-paragraph') onAddNew(data.paragraph, 0);
                    } else if (e.dataTransfer.files.length > 0) {
                        handleImageFiles(e.dataTransfer.files, 0);
                    }
                }}
            >
              <div className="bg-indigo-100 text-indigo-500 p-4 rounded-full mb-4">
                <PlusCircle className="w-8 h-8" />
              </div>
              <h4 className="text-slate-700 font-semibold mb-2">통합할 준비가 되었습니다</h4>
              <p className="text-slate-500 text-sm leading-relaxed">단락이나 이미지를 이곳으로 드래그하여 배치하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EditableParagraph: React.FC<{
    p: Paragraph;
    index: number;
    onRemove: (id: string) => void;
    onUpdateText: (id: string, newText: string) => void;
}> = ({ p, index, onRemove, onUpdateText }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isEditing, setIsEditing] = useState(false);

    const getImageData = (text: string) => {
        const match = text.trim().match(/^!\[(.*?)\]\((data:image\/.*?;base64,.*?)\)$/s);
        if (match) return { alt: match[1], src: match[2] };
        return null;
    };

    const imageData = getImageData(p.text);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
            textareaRef.current.focus();
        }
    }, [isEditing]);

    const handleDragStart = (e: React.DragEvent) => {
        if (isEditing) return;
        e.dataTransfer.setData('application/json', JSON.stringify({ 
            type: 'reorder-paragraph',
            index: index,
            id: p.id
        }));
    };

    return (
        <div 
            className={`flex gap-3 lg:gap-4 group bg-white p-4 lg:p-5 rounded-xl border shadow-sm transition-all relative overflow-hidden 
                ${isEditing ? 'ring-2 ring-indigo-100 border-indigo-400' : 'hover:border-indigo-300 border-slate-200 cursor-text'}`}
            onClick={() => !isEditing && setIsEditing(true)}
        >
            <div 
                draggable={!isEditing}
                onDragStart={handleDragStart}
                className={`flex flex-col items-center gap-2 mt-1 shrink-0 ${isEditing ? 'opacity-30' : 'cursor-grab active:cursor-grabbing'}`}
            >
                {!isEditing && <GripVertical className="w-5 h-5 text-slate-300" />}
                {p.sourceDraftIndex !== undefined && (
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold ${
                        p.sourceDraftIndex === 0 ? 'bg-blue-100 text-blue-700' : 
                        p.sourceDraftIndex === 1 ? 'bg-emerald-100 text-emerald-700' : 
                        'bg-amber-100 text-amber-700'
                    }`}>
                        {p.sourceDraftIndex + 1}
                    </span>
                )}
            </div>
            
            <div className="flex-1 min-w-0">
                {imageData ? (
                    <div className="flex flex-col gap-2">
                        <img src={imageData.src} alt={imageData.alt} className="w-full h-auto rounded-lg border border-slate-200" />
                    </div>
                ) : isEditing ? (
                    <textarea
                        ref={textareaRef}
                        className="w-full text-slate-800 leading-relaxed text-sm lg:text-base bg-transparent border-none outline-none resize-none overflow-hidden p-0 font-sans"
                        value={p.text}
                        onChange={(e) => onUpdateText(p.id, e.target.value)}
                        onBlur={() => setIsEditing(false)}
                    />
                ) : (
                    <div className="text-slate-800 leading-relaxed text-sm lg:text-base markdown-content pointer-events-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{p.text}</ReactMarkdown>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all h-fit shrink-0 relative z-30">
                <button 
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation(); // Stop parent onClick from firing
                        onRemove(p.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                    <X className="w-4 h-4" />
                </button>
                {!isEditing && (
                    <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                        className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                        <Edit3 className="w-4 h-4" />
                    </button>
                )}
                {isEditing && (
                    <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setIsEditing(false); }}
                        className="p-1.5 bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg shadow-sm transition-all"
                    >
                        <Check className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default FinalColumn;
