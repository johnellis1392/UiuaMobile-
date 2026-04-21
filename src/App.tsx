/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Play, 
  Save, 
  Trash2, 
  BookOpen, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  Delete,
  ChevronDown,
  Info,
  History,
  Code as CodeIcon,
  Maximize2,
  Minimize2,
  Keyboard,
  Grid,
  X,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { evaluateUiua, type StackValue, type EvalResult } from './lib/interpreter';

// --- Types ---

type Category = 'Keys' | 'Math' | 'Array' | 'Stack' | 'Logic' | 'Misc';

interface UiuaFunction {
  symbol: string;
  name: string;
  description: string;
  category: Category;
  longDoc?: string;
}

interface SavedCode {
  id: string;
  name: string;
  code: string;
  inputs: string;
  timestamp: number;
}

// --- Data ---
const UIUA_FUNCTIONS: UiuaFunction[] = [
  // Math - Yellow
  { symbol: '+', name: 'add', description: 'Add two values', category: 'Math' },
  { symbol: '-', name: 'sub', description: 'Subtract two values', category: 'Math' },
  { symbol: '×', name: 'mul', description: 'Multiply two values', category: 'Math' },
  { symbol: '÷', name: 'div', description: 'Divide two values', category: 'Math' },
  { symbol: 'ⁿ', name: 'pow', description: 'Power of two values', category: 'Math' },
  { symbol: '◿', name: 'mod', description: 'Modulo of two values', category: 'Math' },
  { symbol: '√', name: 'sqrt', description: 'Square root', category: 'Math' },
  { symbol: '∠', name: 'atan2', description: 'Arctangent of two values', category: 'Math' },
  { symbol: '⌵', name: 'abs', description: 'Absolute value', category: 'Math' },
  { symbol: '⌊', name: 'floor', description: 'Floor', category: 'Math' },
  { symbol: '⌈', name: 'ceil', description: 'Ceiling', category: 'Math' },
  
  // Array - Blue/Cyan
  { symbol: '△', name: 'shape', description: 'Get the shape of an array', category: 'Array' },
  { symbol: '↯', name: 'reshape', description: 'Reshape an array', category: 'Array' },
  { symbol: '♭', name: 'deshape', description: 'Flatten an array', category: 'Array' },
  { symbol: '≗', name: 'reverse', description: 'Reverse an array along its first axis', category: 'Array' },
  { symbol: '⧉', name: 'windows', description: 'Get windows of an array', category: 'Array' },
  { symbol: '↻', name: 'rotate', description: 'Rotate array elements', category: 'Array' },
  { symbol: '⊂', name: 'join', description: 'Join two arrays', category: 'Array' },
  { symbol: '⊏', name: 'select', description: 'Select elements by index', category: 'Array' },
  { symbol: '⊡', name: 'pick', description: 'Pick an element at a coordinate', category: 'Array' },
  { symbol: '≡', name: 'rows', description: 'Apply a function to each row', category: 'Array' },
  { symbol: '⊞', name: 'table', description: 'Outer product / table', category: 'Array' },
  { symbol: '⊕', name: 'partition', description: 'Partition or group an array', category: 'Array' },
  { symbol: '⊸', name: 'by', description: 'Apply a function to the top value and a copy of the next', category: 'Array' },
  { symbol: '⟜', name: 'on', description: 'Apply a function to the next value and a copy of the top', category: 'Array' },
  { symbol: '⊣', name: 'first', description: 'First element of an array', category: 'Array' },
  { symbol: '⊢', name: 'last', description: 'Last element of an array', category: 'Array' },
  { symbol: '⇌', name: 'reverse', description: 'Reverse an array', category: 'Array' },
  
  // Stack - Red/Orange
  { symbol: '.', name: 'duplicate', description: 'Duplicate the top value', category: 'Stack' },
  { symbol: ',', name: 'over', description: 'Copy the second value to the top', category: 'Stack' },
  { symbol: ':', name: 'flip', description: 'Swap the top two values', category: 'Stack' },
  { symbol: '◌', name: 'pop', description: 'Discard the top value', category: 'Stack' },
  { symbol: '⊙', name: 'dip', description: 'Execute a function below the top value', category: 'Stack' },
  { symbol: '⍜', name: 'under', description: 'Apply a function, then its inverse', category: 'Stack' },
  { symbol: '⊓', name: 'bracket', description: 'Execute two functions independently', category: 'Stack' },
  { symbol: '∩', name: 'both', description: 'Apply a function to the top two values separately', category: 'Stack' },
  { symbol: '⍥', name: 'repeat', description: 'Repeat a function n times', category: 'Stack' },
  { symbol: '⍣', name: 'retry', description: 'Execute a function, and retry if it fails', category: 'Stack' },
  { symbol: '☇', name: 'un', description: 'The inverse of a function', category: 'Stack' },
  
  // Logic/Comparison - Purple
  { symbol: '=', name: 'equals', description: 'Check equality', category: 'Logic' },
  { symbol: '≠', name: 'not equals', description: 'Check inequality', category: 'Logic' },
  { symbol: '>', name: 'greater', description: 'Greater than', category: 'Logic' },
  { symbol: '<', name: 'less', description: 'Less than', category: 'Logic' },
  { symbol: '¬', name: 'not', description: 'Logical NOT', category: 'Logic' },
  { symbol: '↥', name: 'max', description: 'Maximum of two values', category: 'Logic' },
  { symbol: '↧', name: 'min', description: 'Minimum of two values', category: 'Logic' },
  { symbol: '⍤', name: 'assert', description: 'Throw an error if a condition is false', category: 'Logic' },
  { symbol: '∘', name: 'identity', description: 'Identity function (does nothing)', category: 'Logic' },
  
  // Misc
  { symbol: '⟪⟫', name: 'box', description: 'Box a value', category: 'Misc' },
  { symbol: '⊔', name: 'unbox', description: 'Unbox a value', category: 'Misc' },
  { symbol: '⍧', name: 'find', description: 'Find occurrences of an array in another', category: 'Misc' },
  { symbol: '⦾', name: 'member', description: 'Check if elements are members of an array', category: 'Misc' },
  { symbol: '⊗', name: 'indexof', description: 'Get the first index of elements in an array', category: 'Misc' },
  { symbol: '?', name: 'trace', description: 'Print the top value to the console', category: 'Misc' },
  { symbol: '$', name: 'string', description: 'Start a multiline string', category: 'Misc' },
  { symbol: '#', name: 'comment', description: 'Add a comment', category: 'Misc' },
];

const CATEGORIES: Category[] = ['Keys', 'Math', 'Array', 'Stack', 'Logic', 'Misc'];

const CATEGORY_COLORS: Record<Category, string> = {
  Keys: 'text-white',
  Math: 'text-glyph-math',
  Array: 'text-glyph-array',
  Stack: 'text-glyph-stack',
  Logic: 'text-purple-400',
  Misc: 'text-ui-text-dim'
};

const CATEGORY_BG: Record<Category, string> = {
  Keys: 'bg-white/5 border-white/10',
  Math: 'bg-glyph-math/10 border-glyph-math/20',
  Array: 'bg-glyph-array/10 border-glyph-array/20',
  Stack: 'bg-glyph-stack/10 border-glyph-stack/20',
  Logic: 'bg-purple-400/10 border-purple-400/20',
  Misc: 'bg-ui-text-dim/10 border-white/5'
};

const QWERTY_LAYOUT = [
  "1 2 3 4 5 6 7 8 9 0".split(" "),
  "q w e r t y u i o p".split(" "),
  "a s d f g h j k l @".split(" "),
  "z x c v b n m ( )".split(" "),
  "space $ / ' \"".split(" ")
];

const KEYBOARD_FUNCTIONS: UiuaFunction[] = QWERTY_LAYOUT.flat().map(key => ({
  symbol: key,
  name: key === " " ? "space" : key,
  description: `Insert character '${key}'`,
  category: 'Keys'
}));

// --- Evaluation Logic removed (moved to lib) ---

// --- Components ---

export default function App() {
  const [code, setCode] = useState('');
  const [inputs, setInputs] = useState('');
  const [stack, setStack] = useState<StackValue[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>('Math');
  const [activeBottomTab, setActiveBottomTab] = useState<'keyboard' | 'functions' | 'output'>('keyboard');
  const [showPalette, setShowPalette] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<UiuaFunction | null>(null);
  const [savedSnippets, setSavedSnippets] = useState<SavedCode[]>([]);
  const [title, setTitle] = useState('New Program');
  const [showHistory, setShowHistory] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [isShifted, setIsShifted] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load saved snippets
  useEffect(() => {
    const saved = localStorage.getItem('uiua_snippets');
    if (saved) {
      setSavedSnippets(JSON.parse(saved));
    }
  }, []);

  const saveSnippet = () => {
    const newSnippet: SavedCode = {
      id: Date.now().toString(),
      name: title,
      code,
      inputs,
      timestamp: Date.now()
    };
    const updated = [newSnippet, ...savedSnippets];
    setSavedSnippets(updated);
    localStorage.setItem('uiua_snippets', JSON.stringify(updated));
  };

  const loadSnippet = (s: SavedCode) => {
    setCode(s.code);
    setInputs(s.inputs);
    setTitle(s.name);
    setShowHistory(false);
  };

  const deleteSnippet = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedSnippets.filter(s => s.id !== id);
    setSavedSnippets(updated);
    localStorage.setItem('uiua_snippets', JSON.stringify(updated));
  };

  const handleInsert = (symbol: string) => {
    if (!textareaRef.current) return;
    
    let charToInsert = symbol === 'space' ? ' ' : symbol;
    if (activeCategory === 'Keys' && isShifted && /^[a-z]$/.test(charToInsert)) {
      charToInsert = charToInsert.toUpperCase();
    }

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newCode = code.substring(0, start) + charToInsert + code.substring(end);
    setCode(newCode);
    const newPos = start + charToInsert.length;
    setCursorPos(newPos);
    
    if (isShifted) setIsShifted(false);

    // Set focus back and move cursor
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const evaluateCode = async () => {
    if (!code.trim()) return;
    setIsEvaluating(true);
    setWarnings([]);
    setLogs([]);
    setActiveBottomTab('output');
    try {
      const result = await evaluateUiua(code, inputs);
      setStack(result.stack);
      setLogs(result.output);
      setWarnings(result.warnings);
      
      if (result.error) {
        setLogs(prev => [`Error: ${result.error}`, ...prev]);
      }
    } catch (e: any) {
      setLogs([`Error: Technical failure. ${e.message}`]);
    } finally {
      setIsEvaluating(false);
    }
  };

  const moveCursor = (dir: 'left' | 'right' | 'start' | 'end') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    let newPos = start;

    if (dir === 'left') newPos = Math.max(0, start - 1);
    else if (dir === 'right') newPos = Math.min(code.length, start + 1);
    else if (dir === 'start') newPos = 0;
    else if (dir === 'end') newPos = code.length;

    textareaRef.current.setSelectionRange(newPos, newPos);
    setCursorPos(newPos);
    textareaRef.current.focus();
  };

  const handleDeleteForward = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    
    if (start === end && start < code.length) {
      const newCode = code.substring(0, start) + code.substring(start + 1);
      setCode(newCode);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(start, start);
          textareaRef.current.focus();
        }
      }, 0);
    } else if (start !== end) {
      handleBackspace();
    }
  };

  const handleBackspace = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    
    if (start === end && start > 0) {
      const newCode = code.substring(0, start - 1) + code.substring(end);
      setCode(newCode);
      setCursorPos(start - 1);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(start - 1, start - 1);
          textareaRef.current.focus();
        }
      }, 0);
    } else if (start !== end) {
      const newCode = code.substring(0, start) + code.substring(end);
      setCode(newCode);
      setCursorPos(start);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(start, start);
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  const updateCursor = () => {
    if (textareaRef.current) {
      setCursorPos(textareaRef.current.selectionStart);
    }
  };

  const filteredFunctions = useMemo(() => {
    return UIUA_FUNCTIONS.filter(f => f.category === activeCategory);
  }, [activeCategory]);

  const toggleKeyboard = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setShowPalette(true);
  };

  return (
    <div className="fixed inset-0 bg-ui-bg text-[#E0E0E0] font-sans selection:bg-ui-accent selection:text-[#0C0C0E] flex flex-col overflow-hidden">
      {/* Top Navigation */}
      <header className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-ui-bg z-20">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ rotate: 15 }}
            className="w-10 h-10 rounded-xl bg-ui-surface border border-white/5 flex items-center justify-center shadow-2xl"
          >
            <span className="font-mono font-black text-ui-accent text-xl italic drop-shadow-[0_0_8px_rgba(78,211,255,0.4)]">U</span>
          </motion.div>
          <div className="flex flex-col">
            <input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent border-none focus:ring-0 font-bold text-sm outline-none w-32 md:w-48 placeholder:text-white/10 uppercase tracking-widest text-ui-accent"
              placeholder="Program Name"
            />
            <span className="text-[10px] uppercase tracking-[0.3em] font-mono text-ui-text-dim">Studio</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2.5 rounded-xl transition-all ${showHistory ? 'bg-ui-accent/20 text-ui-accent' : 'hover:bg-white/5 text-ui-text-dim'}`}
          >
            <History size={20} />
          </button>
          <button 
            onClick={saveSnippet}
            className="px-4 py-2 bg-ui-surface hover:bg-white/10 rounded-xl text-white font-bold text-xs uppercase tracking-widest transition-colors border border-white/5"
          >
            Save
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button 
            onClick={evaluateCode}
            disabled={isEvaluating}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black transition-all shadow-2xl ${
              isEvaluating 
                ? 'bg-white/5 opacity-50' 
                : 'bg-ui-accent text-ui-bg hover:scale-[1.02] active:scale-95 shadow-[0_10px_30px_rgba(78,211,255,0.1)] uppercase tracking-widest text-xs'
            }`}
          >
            {isEvaluating ? (
              <div className="w-4 h-4 border-2 border-ui-bg/30 border-t-ui-bg rounded-full animate-spin" />
            ) : (
              <Play size={14} fill="currentColor" />
            )}
            Run
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Editor Area */}
        <section className="flex-1 flex flex-col bg-ui-bg relative group">
          <div className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-[0.05]" 
              style={{ backgroundImage: 'radial-gradient(circle, #4ED3FF 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
            />
            
            <div className="absolute inset-0 p-8 font-mono text-xl md:text-2xl leading-relaxed whitespace-pre-wrap break-words pointer-events-none z-0">
              {code.split("").map((char, i) => {
                const isCursor = i === cursorPos;
                const fn = UIUA_FUNCTIONS.find(f => f.symbol === char);
                let element = <span key={i} className="text-[#E0E0E0]">{char}</span>;
                
                if (fn) {
                  element = <span key={i} className={CATEGORY_COLORS[fn.category]}>{char}</span>;
                } else {
                  const keyFn = KEYBOARD_FUNCTIONS.find(f => f.symbol === char);
                  if (keyFn) element = <span key={i} className="text-white">{char}</span>;
                }

                if (isCursor) {
                  return (
                    <React.Fragment key={i}>
                      <span className="bg-ui-accent w-[2px] h-full inline-block align-middle" style={{ height: '1.2em', verticalAlign: 'middle', marginTop: '-0.2em' }} />
                      {element}
                    </React.Fragment>
                  );
                }
                return element;
              })}
              {cursorPos === code.length && (
                <span className="bg-ui-accent w-[2px] h-full inline-block align-middle" style={{ height: '1.2em', verticalAlign: 'middle', marginTop: '-0.2em' }} />
              )}
            </div>
            
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => { setCode(e.target.value); setCursorPos(e.target.selectionStart); }}
              onSelect={updateCursor}
              onKeyUp={updateCursor}
              onClick={updateCursor}
              placeholder="Type or use symbols below..."
              className="w-full h-full bg-transparent p-8 font-mono text-xl md:text-2xl resize-none focus:outline-none placeholder:text-white/5 leading-relaxed relative z-10 text-transparent caret-transparent"
              spellCheck={false}
              autoFocus
            />
            
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
              <button 
                onClick={toggleKeyboard}
                className="p-3 bg-ui-surface border border-white/10 rounded-2xl text-white/40 shadow-2xl hover:text-ui-accent transition-colors"
                title="Toggle Palette/Keyboard"
              >
                <Keyboard size={20} />
              </button>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="px-8 py-2 bg-ui-bg border-t border-white/5 flex items-center justify-center gap-4">
             <button onClick={() => moveCursor('start')} className="p-2 text-ui-text-dim hover:text-ui-accent transition-colors" title="Move to Start"><SkipBack size={18}/></button>
             <button onClick={() => moveCursor('left')} className="p-2 text-ui-text-dim hover:text-ui-accent transition-colors" title="Move Left"><ChevronLeft size={20}/></button>
             <div className="flex bg-ui-surface p-1 rounded-xl gap-1">
               <button onClick={handleBackspace} className="p-2 text-ui-error/50 hover:text-ui-error transition-colors" title="Backspace"><Delete size={20}/></button>
               <button onClick={handleDeleteForward} className="p-2 text-ui-error/50 hover:text-ui-error transition-colors transform rotate-180" title="Delete Forward"><Delete size={20}/></button>
             </div>
             <button onClick={() => moveCursor('right')} className="p-2 text-ui-text-dim hover:text-ui-accent transition-colors" title="Move Right"><ChevronRight size={20}/></button>
             <button onClick={() => moveCursor('end')} className="p-2 text-ui-text-dim hover:text-ui-accent transition-colors" title="Move to End"><SkipForward size={18}/></button>
          </div>

          <div className="px-8 py-4 bg-[#222226] border-t border-white/5 relative z-20">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest font-black text-ui-text-dim">Input Variables (stack)</label>
              <div className="flex items-center gap-3 bg-[#121214] border border-white/5 rounded-xl px-4 py-2.5 shadow-inner transition-colors focus-within:border-ui-accent/30">
                <input 
                  value={inputs}
                  onChange={(e) => setInputs(e.target.value)}
                  placeholder="e.g. [1 2 3]"
                  className="flex-1 bg-transparent text-sm font-mono outline-none border-none focus:ring-0 placeholder:text-white/5 text-ui-accent"
                />
                <Settings size={14} className="text-white/10" />
              </div>
            </div>
          </div>

          <AnimatePresence>
            {warnings.length > 0 && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="absolute bottom-32 left-8 right-8 z-30"
              >
                {warnings.map((w, idx) => (
                  <div key={idx} className="bg-ui-warning/10 border border-ui-warning/20 rounded-xl px-4 py-3 flex items-start gap-3 text-ui-warning text-xs shadow-2xl backdrop-blur-xl mb-2">
                    <Info size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Bottom Pane (Palette & Output) */}
      <section className={`bg-ui-surface border-t-4 border-ui-accent flex flex-col transition-all duration-500 ease-out z-40 ${showPalette ? 'h-[55vh]' : 'h-0 -translate-y-4 opacity-0 pointer-events-none'}`}>
        <div className="flex flex-col h-full">
          {/* Main Tabs */}
          <div className="h-14 border-b border-white/5 flex items-center bg-ui-bg px-2">
            <div className="flex-1 flex gap-1 sm:gap-2">
              <button 
                onClick={() => setActiveBottomTab('keyboard')}
                className={`flex-1 max-w-[140px] py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeBottomTab === 'keyboard' ? 'bg-ui-accent text-ui-bg' : 'text-ui-text-dim hover:bg-white/5'}`}
              >
                <Keyboard size={14} />
                <span className="hidden xs:inline">Keys</span>
              </button>
              <button 
                onClick={() => setActiveBottomTab('functions')}
                className={`flex-1 max-w-[140px] py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeBottomTab === 'functions' ? 'bg-ui-accent text-ui-bg' : 'text-ui-text-dim hover:bg-white/5'}`}
              >
                <Grid size={14} />
                <span className="hidden xs:inline">Functions</span>
              </button>
              <button 
                onClick={() => setActiveBottomTab('output')}
                className={`flex-1 max-w-[140px] py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center justify-center gap-2 ${activeBottomTab === 'output' ? 'bg-ui-accent text-ui-bg' : 'text-ui-text-dim hover:bg-white/5'}`}
              >
                <CodeIcon size={14} />
                <span className="hidden xs:inline">Output</span>
                {(stack.length > 0 || logs.length > 0) && activeBottomTab !== 'output' && (
                  <span className="absolute top-1 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            </div>
            <button 
              onClick={() => setShowPalette(false)}
              className="p-2 text-ui-text-dim hover:text-white transition-colors ml-2"
            >
              <X size={20} />
            </button>
          </div>

          {activeBottomTab === 'keyboard' && (
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#0A0A0C] flex flex-col justify-center">
              <div className="flex flex-col gap-2 max-w-xl mx-auto w-full">
                {QWERTY_LAYOUT.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex justify-center gap-1">
                    {rowIdx === 3 && (
                      <button 
                        onClick={() => setIsShifted(!isShifted)}
                        className={`flex-1 min-w-[40px] h-10 rounded-lg flex items-center justify-center font-bold text-[10px] uppercase tracking-widest transition-all ${isShifted ? 'bg-ui-accent text-ui-bg' : 'bg-white/5 text-ui-text-dim border border-white/10'}`}
                      >
                        Shift
                      </button>
                    )}
                    {row.map(char => {
                      const isLetter = /^[a-z]$/.test(char);
                      const displayChar = isShifted && isLetter ? char.toUpperCase() : (char === 'space' ? 'Space' : char);
                      return (
                        <button
                          key={char}
                          onClick={() => handleInsert(char)}
                          className={`h-10 rounded-lg flex items-center justify-center font-mono text-sm border border-white/10 bg-[#1A1A1D] hover:border-white/20 active:scale-90 transition-all ${char === 'space' ? 'flex-[3] text-[10px] uppercase font-black tracking-widest' : 'flex-1 min-w-[30px]'}`}
                        >
                          {displayChar}
                        </button>
                      );
                    })}
                    {rowIdx === 3 && <div className="flex-1" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeBottomTab === 'functions' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Category Sub-tabs */}
              <div className="h-10 border-b border-white/5 flex items-center bg-black/20 overflow-hidden">
                <div className="flex-1 flex items-center justify-center px-3 gap-1 grid grid-cols-5 w-full">
                  {CATEGORIES.filter(c => c !== 'Keys').map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`py-1 rounded-lg text-[8px] sm:text-[9px] uppercase font-black tracking-tighter transition-all ${
                        activeCategory === cat ? 'bg-white/10 text-white shadow-inner' : 'text-ui-text-dim hover:text-white/40'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#0A0A0C]">
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
                  {filteredFunctions.map((fn: UiuaFunction) => (
                    <FunctionButton 
                      key={fn.symbol} 
                      fn={fn} 
                      onClick={() => handleInsert(fn.symbol)}
                      onLongPress={() => { setSelectedDoc(fn); }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeBottomTab === 'output' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-black/40">
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                {stack.length === 0 && logs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-white/5 text-center gap-6">
                    <CodeIcon size={48} strokeWidth={1} />
                    <p className="max-w-[200px] leading-relaxed text-[10px] uppercase tracking-[0.2em] font-black opacity-30 italic">No output yet. Run your program to see stack results.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Stack Visualization */}
                    {stack.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <label className="text-[10px] uppercase tracking-widest font-black text-ui-accent/50 ml-1">Current Stack</label>
                        <div className="flex flex-wrap items-end gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 shadow-inner min-h-[80px]">
                          {stack.map((val, i) => (
                            <StackItem key={`stack-${i}`} val={val} i={stack.length - 1 - i} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Console Output */}
                    {logs.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <label className="text-[10px] uppercase tracking-widest font-black text-ui-text-dim ml-1">Console</label>
                        <div className="space-y-2 font-mono text-sm">
                          {logs.map((line, i) => (
                            <div key={i} className={`flex gap-3 leading-relaxed ${line.startsWith('Error') ? 'text-ui-error' : 'text-ui-text-dim'}`}>
                              <span className="font-bold opacity-30">#</span>
                              <span>{line}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-white/5 flex items-center justify-end">
                <button onClick={() => { setStack([]); setLogs([]); }} className="flex items-center gap-2 px-4 py-2 text-[10px] uppercase font-black tracking-widest text-ui-text-dim hover:text-ui-error transition-colors">
                  <Trash2 size={14} /> Reset Output
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {!showPalette && (
        <button 
          onClick={() => setShowPalette(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-ui-accent rounded-full shadow-2xl flex items-center justify-center text-ui-bg z-50 hover:scale-105 active:scale-90 transition-all border-4 border-ui-bg"
        >
          <Grid size={24} />
        </button>
      )}

      {/* History Slide-out */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed inset-y-0 right-0 w-80 bg-ui-surface border-l border-white/5 z-[60] shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold uppercase tracking-[0.2em] text-xs flex items-center gap-2 text-ui-accent">
                <History size={16} />
                Library
              </h3>
              <button onClick={() => setShowHistory(false)} className="text-white/20 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {savedSnippets.length === 0 ? (
                <div className="text-center py-20 text-white/10 text-xs italic">
                  No saved programs yet.
                </div>
              ) : (
                savedSnippets.map(s => (
                  <div 
                    key={s.id}
                    onClick={() => loadSnippet(s)}
                    className="group bg-black/20 border border-white/5 p-5 rounded-2xl cursor-pointer hover:border-ui-accent/50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-gray-200 uppercase tracking-wider">{s.name}</span>
                      <button onClick={(e) => deleteSnippet(s.id, e)} className="opacity-0 group-hover:opacity-100 p-1 text-ui-error/50 hover:text-ui-error transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <code className="text-[10px] text-ui-accent/40 font-mono block truncate mb-1">{s.code}</code>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showHistory && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55]" onClick={() => setShowHistory(false)} />
      )}

      {/* Doc Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setSelectedDoc(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`border-l-4 rounded-2xl p-8 max-w-sm w-full shadow-[0_0_100px_rgba(78,211,255,0.05)] relative overflow-hidden bg-ui-surface ${CATEGORY_BG[selectedDoc.category]}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start gap-5 mb-8 relative z-10">
                <div className={`text-5xl bg-black/40 w-24 h-24 rounded-2xl flex items-center justify-center font-mono border border-white/5 shadow-2xl ${CATEGORY_COLORS[selectedDoc.category]}`}>
                  {selectedDoc.symbol}
                </div>
                <div className="flex flex-col pt-2">
                  <h3 className="text-2xl font-black font-mono tracking-tight text-white mb-1 uppercase italic">{selectedDoc.name}</h3>
                  <div className={`self-start text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-current ${CATEGORY_COLORS[selectedDoc.category]}`}>
                    {selectedDoc.category}
                  </div>
                </div>
              </div>
              
              <div className="relative z-10">
                <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#808080] mb-2">Detailed Reference</h4>
                <p className="text-[#E0E0E0] leading-relaxed font-normal text-sm md:text-base">
                  {selectedDoc.description}
                </p>
              </div>

              <div className="mt-10 relative z-10">
                <button 
                  onClick={() => setSelectedDoc(null)}
                  className="w-full py-4 bg-ui-accent text-ui-bg font-black uppercase tracking-[0.2em] text-xs rounded-xl active:scale-95 transition-all shadow-xl"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
}

interface FunctionButtonProps {
  key?: React.Key;
  fn: UiuaFunction;
  onClick: () => void;
  onLongPress: () => void;
}

function FunctionButton({ fn, onClick, onLongPress }: FunctionButtonProps) {
  const timerRef = useRef<any>(null);
  const [isPressing, setIsPressing] = useState(false);

  const handleStart = () => {
    setIsPressing(true);
    timerRef.current = setTimeout(() => {
      onLongPress();
      setIsPressing(false);
    }, 600);
  };

  const handleEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsPressing(false);
  };

  return (
    <button
      onClick={onClick}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      className={`relative aspect-square bg-[#1A1A1D] border border-white/10 rounded-lg flex flex-col items-center justify-center transition-all group active:scale-[0.85] active:bg-black ${
        isPressing ? 'border-ui-accent ring-2 ring-ui-accent/20 bg-black' : 'hover:border-white/20'
      }`}
    >
      <span className={`text-2xl font-mono transition-all group-hover:scale-110 ${CATEGORY_COLORS[fn.category]}`}>
        {fn.symbol}
      </span>
      <span className="text-[7px] uppercase mt-1 text-ui-text-dim font-black tracking-tighter overflow-hidden text-ellipsis whitespace-nowrap w-4/5 text-center transition-colors">
        {fn.name}
      </span>
      {isPressing && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute inset-0 bg-ui-accent/10 rounded-lg border border-ui-accent/30"
        />
      )}
    </button>
  );
}

function StackItem({ val, i }: { key?: string | number, val: StackValue, i: number }) {
  const colorClass = val.type === 'number' ? 'text-glyph-math' : 
                     val.type === 'array' ? 'text-glyph-array' : 
                     val.type === 'string' ? 'text-purple-400' : 'text-glyph-stack';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`min-w-[40px] px-3 py-2 bg-black/40 border border-white/5 rounded-xl flex items-center justify-center font-mono text-sm shadow-lg ${colorClass}`}>
        {val.type === 'array' ? `[${val.data.join(' ')}]` : val.data}
      </div>
      <span className="text-[8px] font-black text-ui-text-dim/40 uppercase">Index {i}</span>
    </div>
  );
}
