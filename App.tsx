import React, { useState, useEffect } from 'react';
import { ExamConfig, AppView, Question, QuizState, QuestionResult, ExamType, Subject } from './types';
import { streamTutorialContent, generateQuizQuestions, generateExplanations } from './services/geminiService';
import { 
  BookOpen, 
  Brain, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ChevronRight, 
  Award,
  Clock,
  Menu,
  Lightbulb,
  Check,
  AlertCircle,
  HelpCircle,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Home,
  Settings,
  Layers,
  Zap,
  Target,
  ArrowLeft,
  Search
} from 'lucide-react';

// --- Helpers ---

// Add window type extension for KaTeX
declare global {
  interface Window {
    katex: any;
  }
}

// Refined SmartText renderer with new styling and Math support
const SmartText = ({ text, className = "" }: { text: string, className?: string }) => {
  if (!text) return null;
  const lines = text.split('\n');

  // Determine styles based on context (dark mode/inverse or default)
  const isInverse = className.includes('text-white');
  
  // Logic updated: If inverse, inherit size/leading from parent (e.g. Header). If not, use standard text-lg.
  const baseTypography = isInverse 
    ? "!text-white !text-inherit !leading-inherit" 
    : "text-slate-600 text-lg";

  const boldColor = isInverse ? "!text-white" : "text-[#1A2C6E]";
  const headingColorPrimary = isInverse ? "!text-white" : "text-[#1A2C6E]";
  const headingColorSecondary = isInverse ? "!text-[#F6C667]" : "text-[#6A5AE0]";
  const codeBg = isInverse ? "bg-white/20 !text-white" : "bg-slate-100 text-[#6A5AE0]";

  const renderContent = (content: string) => {
    // Split by math delimiters ($...$)
    // The regex captures the delimiter $...$ to keep it in the array
    const parts = content.split(/(\$[^$]+\$)/g);
    
    return parts.map((part, index) => {
      // Check if this part is math
      if (part.startsWith('$') && part.endsWith('$')) {
        const mathContent = part.slice(1, -1);
        try {
          if (window.katex) {
            const html = window.katex.renderToString(mathContent, {
              throwOnError: false,
              displayMode: false
            });
            // Apply text color to math span to ensure visibility
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className={`inline-math font-serif mx-1 ${isInverse ? '!text-white' : ''}`} />;
          }
          return <code key={index} className={`px-1 rounded ${codeBg}`}>{mathContent}</code>;
        } catch (e) {
          return <span key={index} className="text-red-400">{part}</span>;
        }
      }

      // Handle Bold text (**text**)
      const boldParts = part.split(/(\*\*.*?\*\*)/g);
      return (
        <React.Fragment key={index}>
          {boldParts.map((subPart, subIndex) => {
            if (subPart.startsWith('**') && subPart.endsWith('**')) {
              return <strong key={subIndex} className={boldColor}>{subPart.slice(2, -2)}</strong>;
            }
            return subPart;
          })}
        </React.Fragment>
      );
    });
  };

  return (
    <div className={`prose max-w-none leading-relaxed ${className}`}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('### ')) return <h3 key={i} className={`text-xl font-bold mt-6 mb-3 ${headingColorSecondary}`}>{renderContent(trimmed.replace('### ', ''))}</h3>;
        if (trimmed.startsWith('## ')) return <h2 key={i} className={`text-2xl font-bold mt-8 mb-4 ${headingColorPrimary}`}>{renderContent(trimmed.replace('## ', ''))}</h2>;
        if (trimmed.startsWith('# ')) return <h1 key={i} className={`text-3xl font-extrabold mb-6 ${headingColorPrimary}`}>{renderContent(trimmed.replace('# ', ''))}</h1>;
        if (trimmed === '---') return <hr key={i} className={`my-8 ${isInverse ? 'border-white/20' : 'border-slate-200'}`} />;
        
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          return (
            <div key={i} className="flex items-start mb-3 ml-2">
              <span className={`mr-2 font-bold ${headingColorSecondary}`}>•</span>
              <span className={`flex-1 ${baseTypography}`}>{renderContent(trimmed.replace(/^[-•] /, ''))}</span>
            </div>
          );
        }

        // List numbering (1. )
        if (/^\d+\.\s/.test(trimmed)) {
             const number = trimmed.match(/^\d+\./)?.[0];
             const rest = trimmed.replace(/^\d+\.\s/, '');
             return (
                 <div key={i} className="flex items-start mb-3 ml-2">
                    <span className={`font-bold mr-2 ${headingColorPrimary}`}>{number}</span>
                    <span className={`flex-1 ${baseTypography}`}>{renderContent(rest)}</span>
                 </div>
             )
        }

        if (trimmed === '') return <br key={i} className="my-2" />;

        return (
          <p key={i} className={`mb-4 ${baseTypography}`}>
            {renderContent(line)}
          </p>
        );
      })}
    </div>
  );
};

// --- Components ---

const LoadingScreen = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-in fade-in duration-500">
    <div className="relative mb-10">
      <div className="absolute inset-0 bg-[#6A5AE0] rounded-full blur-xl opacity-20 animate-pulse"></div>
      <div className="relative bg-white p-6 rounded-3xl shadow-2xl border-4 border-[#F4F4F6]">
        <Zap className="h-12 w-12 text-[#6A5AE0] animate-bounce" />
      </div>
    </div>
    <div className="space-y-4 max-w-md">
      <h3 className="text-3xl font-extrabold text-[#1A2C6E] tracking-tight">{message}</h3>
      <p className="text-slate-500 font-medium text-lg">
        The AI is crafting unique content just for you...
      </p>
    </div>
    <div className="mt-10 w-64 h-3 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-[#6A5AE0] to-[#1BC7B1] rounded-full animate-[width_2s_ease-in-out_infinite]" style={{ width: '50%' }}></div>
    </div>
  </div>
);

const Navbar = ({ onHome, currentView }: { onHome: () => void, currentView: AppView }) => (
  <nav className="w-full px-4 pt-6 pb-2 flex justify-center z-50">
    <div className="bg-[#1A2C6E] text-white rounded-full shadow-xl shadow-[#1A2C6E]/20 px-6 py-3 flex items-center justify-between gap-8 max-w-4xl w-full border border-white/10">
      <div 
        className="flex items-center cursor-pointer group" 
        onClick={onHome}
      >
        <div className="bg-white/10 p-2 rounded-full mr-3 group-hover:bg-white/20 transition-all">
          <GraduationCap className="h-5 w-5 text-[#F6C667]" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-lg tracking-tight leading-none">ExamAI</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        {currentView !== 'HOME' && (
          <button onClick={onHome} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors">
            <Home className="h-5 w-5" />
          </button>
        )}
        <div className="hidden sm:flex items-center px-4 py-1.5 bg-[#6A5AE0] rounded-full border border-white/10 shadow-inner">
          <Zap className="h-3 w-3 text-[#F6C667] mr-2" />
          <span className="text-xs font-bold text-white tracking-wide">GEMINI FLASH</span>
        </div>
      </div>
    </div>
  </nav>
);

export default function App() {
  const [view, setView] = useState<AppView>('HOME');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const [config, setConfig] = useState<ExamConfig>({
    examType: 'WAEC',
    year: '2025',
    subject: 'Mathematics',
    topic: ''
  });

  const [tutorialContent, setTutorialContent] = useState<string>('');
  const [quizState, setQuizState] = useState<QuizState>({
    questions: [],
    currentQuestionIndex: 0,
    answers: {},
    isCompleted: false
  });
  
  const [results, setResults] = useState<QuestionResult[]>([]);
  // Store explanations by questionId to allow caching and single retrieval
  const [explanationCache, setExplanationCache] = useState<Record<number, string>>({});
  const [selectedQuestionForExplanation, setSelectedQuestionForExplanation] = useState<number | null>(null);
  const [explaining, setExplaining] = useState(false);
  
  // Results View State
  const [resultTab, setResultTab] = useState<'ALL' | 'INCORRECT' | 'CORRECT'>('INCORRECT');
  
  // Confirmation Modal State
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // --- Actions ---

  const handleGenerateTutorial = async () => {
    setLoading(true);
    setLoadingMessage(`Preparing ${config.subject} Masterclass`);
    setTutorialContent('');
    
    try {
      // Start streaming process
      const stream = streamTutorialContent(config);
      let isFirstChunk = true;

      for await (const chunk of stream) {
        if (isFirstChunk) {
          setLoading(false);
          setView('TUTORIAL');
          isFirstChunk = false;
        }
        setTutorialContent(prev => prev + chunk);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to generate tutorial. Check your internet connection.");
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    setLoading(true);
    setLoadingMessage(`Generating Unique ${config.examType} Questions`);
    try {
      const questions = await generateQuizQuestions(config);
      setQuizState({
        questions,
        currentQuestionIndex: 0,
        answers: {},
        isCompleted: false
      });
      // Clear cache for new exam
      setExplanationCache({});
      setView('QUIZ');
      setShowSubmitModal(false);
    } catch (error) {
      alert("Failed to generate quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    setShowSubmitModal(false);
    
    // Calculate results locally
    const calculatedResults: QuestionResult[] = quizState.questions.map(q => {
      const selected = quizState.answers[q.id];
      const selectedIndex = selected !== undefined ? selected : -1;
      
      return {
        questionId: q.id,
        questionText: q.questionText,
        selectedOptionIndex: selectedIndex,
        correctOptionIndex: q.correctOptionIndex,
        isCorrect: selectedIndex === q.correctOptionIndex
      };
    });
    
    const hasFailures = calculatedResults.some(r => !r.isCorrect);
    setResultTab(hasFailures ? 'INCORRECT' : 'CORRECT');
    setResults(calculatedResults);
    setView('RESULT');
    // NOTE: We no longer auto-generate explanations here to speed up loading
  };

  const handleViewExplanation = async (questionId: number) => {
    const result = results.find(r => r.questionId === questionId);
    if (!result) return;

    setSelectedQuestionForExplanation(questionId);
    setView('EXPLANATION_DETAIL');

    // Check Cache
    if (explanationCache[questionId]) {
        return;
    }

    // Generate if not cached
    setExplaining(true);
    try {
        const question = quizState.questions.find(q => q.id === questionId);
        const selectedText = result.selectedOptionIndex === -1 
            ? "Skipped" 
            : question?.options[result.selectedOptionIndex] || "Unknown";
        const correctText = question?.options[result.correctOptionIndex] || "Unknown";

        const failure = {
            question: result.questionText,
            selected: selectedText,
            correct: correctText
        };

        const explanations = await generateExplanations(config, [failure]);
        if (explanations && explanations.length > 0) {
            setExplanationCache(prev => ({
                ...prev,
                [questionId]: explanations[0]
            }));
        }
    } catch (error) {
        console.error("Failed to generate explanation", error);
    } finally {
        setExplaining(false);
    }
  };

  // --- Sub-Views ---

  const renderHome = () => (
    <div className="max-w-5xl mx-auto w-full pt-16 pb-12 px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Hero Header */}
      <div className="text-center mb-12 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#6A5AE0] rounded-full blur-[100px] opacity-10 pointer-events-none"></div>
        <h1 className="relative text-5xl md:text-7xl font-extrabold text-[#1A2C6E] mb-6 tracking-tight leading-tight">
          Ace Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6A5AE0] to-[#1BC7B1]">Exams</span>
          <br />With AI Power.
        </h1>
        <p className="relative text-xl text-slate-500 max-w-2xl mx-auto font-medium">
          Fresh questions every time. Personalized tutorials. 
          <br/>Unlimited practice for WAEC, NECO & GCE.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100 border border-white p-2">
        <div className="bg-[#F4F4F6] rounded-[2rem] p-8 md:p-12">
          
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-[#1A2C6E] flex items-center justify-center shadow-lg shadow-blue-900/20">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[#1A2C6E]">Setup Your Session</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            {/* Left Column */}
            <div className="space-y-6">
              <div className="group">
                <label className="block text-xs font-bold text-[#6A5AE0] uppercase tracking-wider mb-3">Exam Body</label>
                <div className="relative">
                  <select 
                    value={config.examType}
                    onChange={(e) => setConfig({...config, examType: e.target.value as ExamType})}
                    className="block w-full rounded-2xl border-0 bg-white p-5 text-lg text-[#1A2C6E] font-bold shadow-md ring-1 ring-black/5 hover:ring-[#6A5AE0] focus:ring-2 focus:ring-[#6A5AE0] transition-all appearance-none cursor-pointer"
                  >
                    <option value="WAEC">WAEC (West Africa)</option>
                    <option value="NECO">NECO (National)</option>
                    <option value="GCE">GCE (Private)</option>
                  </select>
                  <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                     <Award className="h-6 w-6 text-[#1BC7B1]" />
                  </div>
                </div>
              </div>

              <div className="group">
                <label className="block text-xs font-bold text-[#6A5AE0] uppercase tracking-wider mb-3">Year Focus</label>
                <div className="relative">
                  <select 
                    value={config.year}
                    onChange={(e) => setConfig({...config, year: e.target.value})}
                    className="block w-full rounded-2xl border-0 bg-white p-5 text-lg text-[#1A2C6E] font-bold shadow-md ring-1 ring-black/5 hover:ring-[#6A5AE0] focus:ring-2 focus:ring-[#6A5AE0] transition-all appearance-none cursor-pointer"
                  >
                    {Array.from({length: 16}, (_, i) => 2025 - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                     <Clock className="h-6 w-6 text-[#1BC7B1]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div className="group">
                <label className="block text-xs font-bold text-[#6A5AE0] uppercase tracking-wider mb-3">Subject</label>
                <div className="relative">
                  <select 
                    value={config.subject}
                    onChange={(e) => setConfig({...config, subject: e.target.value as Subject})}
                    className="block w-full rounded-2xl border-0 bg-white p-5 text-lg text-[#1A2C6E] font-bold shadow-md ring-1 ring-black/5 hover:ring-[#6A5AE0] focus:ring-2 focus:ring-[#6A5AE0] transition-all appearance-none cursor-pointer"
                  >
                    {[
                      'Mathematics', 'English Language', 'Biology', 'Physics', 'Chemistry', 
                      'Government', 'Economics', 'Civic Education', 'Literature in English'
                    ].map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                   <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                     <BookOpen className="h-6 w-6 text-[#1BC7B1]" />
                  </div>
                </div>
              </div>

               <div className="group">
                <label className="block text-xs font-bold text-[#6A5AE0] uppercase tracking-wider mb-3">Topic (Optional)</label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="e.g. Organic Chemistry"
                    value={config.topic}
                    onChange={(e) => setConfig({...config, topic: e.target.value})}
                    className="block w-full rounded-2xl border-0 bg-white p-5 text-lg text-[#1A2C6E] font-bold shadow-md ring-1 ring-black/5 hover:ring-[#6A5AE0] focus:ring-2 focus:ring-[#6A5AE0] transition-all placeholder:text-slate-300 placeholder:font-medium"
                  />
                  <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                     <Target className="h-6 w-6 text-[#1BC7B1]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <button
              onClick={handleGenerateTutorial}
              className="group flex items-center justify-center w-full px-6 py-5 bg-white border-2 border-transparent hover:border-[#6A5AE0] text-[#1A2C6E] font-extrabold rounded-2xl hover:bg-violet-50 transition-all shadow-lg shadow-slate-200"
            >
              <div className="mr-4 bg-violet-100 p-2 rounded-lg group-hover:bg-[#6A5AE0] group-hover:text-white transition-colors">
                <Layers className="h-6 w-6" />
              </div>
              <span className="text-lg">Generate Tutorial</span>
            </button>
            <button
              onClick={handleStartQuiz}
              className="group flex items-center justify-center w-full px-6 py-5 bg-gradient-to-r from-[#6A5AE0] to-[#1A2C6E] text-white font-extrabold rounded-2xl shadow-xl shadow-[#6A5AE0]/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <div className="mr-4 bg-white/20 p-2 rounded-lg">
                <Brain className="h-6 w-6" />
              </div>
              <span className="text-lg">Start Quiz Challenge</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTutorial = () => (
    <div className="max-w-5xl mx-auto w-full pt-10 pb-20 px-6 animate-in fade-in duration-500">
      
      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-[#1A2C6E]/10 overflow-hidden border border-white mb-8">
        {/* Header */}
        <div className="bg-[#6A5AE0] p-10 md:p-14 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-12 -translate-y-8">
            <BookOpen className="h-64 w-64 text-[#1A2C6E]" />
          </div>
          <div className="relative z-10 text-white">
             <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold tracking-wide uppercase mb-4">
                <span className="text-[#F6C667]">{config.examType}</span>
                <span className="w-1 h-1 bg-white rounded-full"></span>
                <span>{config.year}</span>
             </div>
            <h2 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight">{config.subject}</h2>
            <p className="text-xl text-violet-100 font-medium">{config.topic || 'Comprehensive Review'}</p>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-10 md:p-14 bg-white">
          {tutorialContent ? (
            <SmartText text={tutorialContent} />
          ) : (
             <div className="flex items-center gap-3 text-[#6A5AE0]">
               <div className="w-2 h-2 rounded-full bg-[#6A5AE0] animate-bounce"></div>
               <div className="w-2 h-2 rounded-full bg-[#6A5AE0] animate-bounce delay-75"></div>
               <div className="w-2 h-2 rounded-full bg-[#6A5AE0] animate-bounce delay-150"></div>
             </div>
          )}
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
        <button
          onClick={() => setView('HOME')}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-[#1A2C6E] bg-white border-2 border-[#1A2C6E]/10 hover:border-[#1A2C6E] hover:bg-slate-50 transition shadow-sm flex items-center justify-center"
        >
          <Home className="mr-2 h-5 w-5" />
          Back Home
        </button>
        
        <button 
          onClick={handleStartQuiz}
          className="w-full sm:w-auto bg-[#1A2C6E] text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-[#1A2C6E]/20 hover:bg-[#233580] hover:-translate-y-1 transition-all flex items-center justify-center"
        >
          <Brain className="mr-3 h-6 w-6 text-[#F6C667]" />
          Take Quiz Now
        </button>
      </div>
    </div>
  );

  const renderQuiz = () => {
    const currentQ = quizState.questions[quizState.currentQuestionIndex];
    const isLast = quizState.currentQuestionIndex === quizState.questions.length - 1;
    
    const answeredCount = Object.keys(quizState.answers).length;
    const totalQuestions = quizState.questions.length;
    const isComplete = answeredCount === totalQuestions;
    const missingCount = totalQuestions - answeredCount;

    return (
      <div className="max-w-7xl mx-auto w-full pt-10 pb-12 px-6 relative">
        
        {/* Top Header & Progress */}
        <div className="max-w-4xl mx-auto mb-10">
            <div className="flex justify-between items-end mb-8">
            <div>
                <h2 className="text-3xl font-extrabold text-[#1A2C6E] tracking-tight mb-2">Quiz Session</h2>
                <div className="flex items-center gap-2">
                    <span className="bg-[#E0E7FF] text-[#1A2C6E] px-3 py-1 rounded-lg text-sm font-bold">
                        Q{quizState.currentQuestionIndex + 1}
                    </span>
                    <span className="text-slate-400 font-bold text-sm uppercase">of {quizState.questions.length}</span>
                </div>
            </div>
            <div className="flex items-center text-[#6A5AE0] bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                <Clock className="h-5 w-5 mr-2" />
                <span className="font-bold">In Progress</span>
            </div>
            </div>
            
            {/* Colorful Progress Bar */}
            <div className="flex gap-1.5 mb-2 h-2">
                {quizState.questions.map((_, idx) => (
                    <div 
                        key={idx} 
                        className={`flex-1 rounded-full transition-all duration-300 ${
                            idx < quizState.currentQuestionIndex ? 'bg-[#1BC7B1]' : 
                            idx === quizState.currentQuestionIndex ? 'bg-[#6A5AE0]' : 'bg-slate-200'
                        }`}
                    />
                ))}
            </div>
        </div>

        {/* Main Content Area with Side Buttons */}
        <div className="flex items-center justify-center gap-8">
            
            {/* Left Button (Desktop) */}
            <button
                disabled={quizState.currentQuestionIndex === 0}
                onClick={() => setQuizState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex - 1 }))}
                className={`hidden md:flex h-20 w-20 rounded-full items-center justify-center transition-all duration-300 shadow-xl border-4 border-white ${
                    quizState.currentQuestionIndex === 0 
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-50' 
                    : 'bg-white text-[#1A2C6E] hover:bg-[#6A5AE0] hover:text-white hover:scale-110 hover:shadow-[#6A5AE0]/30 cursor-pointer'
                }`}
                title="Previous Question"
            >
                <ArrowLeft className="h-8 w-8" />
            </button>

            {/* Question Card */}
            <div className="flex-1 max-w-4xl w-full">
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 p-8 md:p-14 border-4 border-white/50 relative min-h-[400px]">
                    <div className="text-2xl md:text-3xl font-bold text-[#1D1D1F] mb-12 leading-relaxed font-feature-settings-cv11">
                        <SmartText text={currentQ.questionText} />
                    </div>
                    
                    <div className="space-y-4">
                        {currentQ.options.map((opt, idx) => {
                        const isSelected = quizState.answers[currentQ.id] === idx;
                        return (
                            <button
                            key={idx}
                            onClick={() => setQuizState(prev => ({
                                ...prev,
                                answers: { ...prev.answers, [currentQ.id]: idx }
                            }))}
                            className={`w-full text-left p-6 rounded-3xl border-2 transition-all duration-200 flex items-center group relative overflow-hidden ${
                                isSelected 
                                ? 'border-[#6A5AE0] bg-[#6A5AE0]/5 shadow-lg shadow-[#6A5AE0]/10 scale-[1.01] z-10' 
                                : 'border-slate-100 bg-white text-slate-600 hover:border-[#6A5AE0]/30 hover:bg-slate-50 hover:shadow-md'
                            }`}
                            >
                            <div className={`h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-2xl mr-6 text-lg font-bold transition-colors shadow-sm ${
                                isSelected ? 'bg-[#6A5AE0] text-white' : 'bg-[#F4F4F6] text-slate-400 group-hover:bg-white group-hover:text-[#6A5AE0]'
                            }`}>
                                {['A', 'B', 'C', 'D'][idx]}
                            </div>
                            <span className={`text-xl ${isSelected ? 'font-bold text-[#1A2C6E]' : 'font-medium text-slate-600'}`}>
                                <SmartText text={opt} />
                            </span>
                            
                            {isSelected && (
                                <div className="absolute right-6 text-[#6A5AE0] animate-in zoom-in spin-in-180 duration-300">
                                    <CheckCircle className="h-8 w-8" />
                                </div>
                            )}
                            </button>
                        );
                        })}
                    </div>
                </div>
            </div>

            {/* Right Button (Desktop) */}
            <div className="hidden md:block">
                {isLast ? (
                     <button
                        onClick={() => setShowSubmitModal(true)}
                        className="h-20 w-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl border-4 border-white bg-[#1BC7B1] text-white hover:bg-[#18b09d] hover:scale-110 hover:shadow-[#1BC7B1]/40 cursor-pointer"
                        title="Submit Exam"
                    >
                        <CheckCircle className="h-8 w-8" />
                    </button>
                ) : (
                    <button
                        onClick={() => setQuizState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }))}
                        className="h-20 w-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl border-4 border-white bg-[#1A2C6E] text-white hover:bg-[#6A5AE0] hover:scale-110 hover:shadow-[#1A2C6E]/40 cursor-pointer"
                        title="Next Question"
                    >
                        <ArrowRight className="h-8 w-8" />
                    </button>
                )}
            </div>

        </div>

        {/* Mobile Navigation (Bottom) */}
        <div className="md:hidden flex justify-between items-center gap-4 mt-8">
          <button
            disabled={quizState.currentQuestionIndex === 0}
            onClick={() => setQuizState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex - 1 }))}
            className={`flex-1 px-6 py-4 rounded-2xl font-bold transition flex items-center justify-center ${
              quizState.currentQuestionIndex === 0 ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-[#1A2C6E] bg-white shadow-sm border border-slate-100'
            }`}
          >
            <ArrowLeft className="mr-2 h-5 w-5" /> Back
          </button>
          
          {isLast ? (
             <button
                onClick={() => setShowSubmitModal(true)}
                className="flex-[1.5] px-6 py-4 rounded-2xl font-bold shadow-xl shadow-[#1BC7B1]/30 text-white bg-[#1BC7B1] flex items-center justify-center"
              >
                Submit Exam <CheckCircle className="ml-2 h-5 w-5" />
              </button>
          ) : (
            <button
              onClick={() => setQuizState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }))}
              className="flex-[1.5] bg-[#1A2C6E] text-white px-6 py-4 rounded-2xl font-bold shadow-xl shadow-[#1A2C6E]/30 flex items-center justify-center"
            >
              Next <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          )}
        </div>

        {/* Confirmation Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1A2C6E]/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 animate-in zoom-in-95 duration-200 text-center">
              <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg ${isComplete ? 'bg-[#1BC7B1]/10 text-[#1BC7B1]' : 'bg-[#F6C667]/10 text-[#F6C667]'}`}>
                 {isComplete ? <Check className="h-12 w-12" /> : <AlertTriangle className="h-12 w-12" />}
              </div>
              
              <h3 className="text-3xl font-extrabold text-[#1A2C6E] mb-3">
                {isComplete ? "All Done?" : "Wait up!"}
              </h3>
              
              <p className="text-slate-500 mb-10 text-lg font-medium leading-relaxed">
                {isComplete 
                  ? "You've answered every question. Ready to see your score?"
                  : `You skipped ${missingCount} question${missingCount > 1 ? 's' : ''}. They will be marked wrong if you submit.`}
              </p>
              
              <div className="space-y-4">
                 <button 
                  onClick={submitQuiz}
                  className="w-full py-4 rounded-2xl font-bold text-white bg-[#6A5AE0] hover:bg-[#5848c7] shadow-xl shadow-[#6A5AE0]/30 transition transform active:scale-95 text-lg"
                 >
                   {isComplete ? "Submit & Grade" : "Submit Anyway"}
                 </button>
                 <button 
                  onClick={() => setShowSubmitModal(false)}
                  className="w-full py-4 rounded-2xl font-bold text-slate-500 hover:text-[#1A2C6E] hover:bg-slate-50 transition"
                 >
                   Return to Quiz
                 </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderResult = () => {
    const score = results.filter(r => r.isCorrect).length;
    const total = results.length;
    const percentage = Math.round((score / total) * 100);
    const passed = percentage >= 50;
    
    const incorrectList = results.filter(r => !r.isCorrect);
    const correctList = results.filter(r => r.isCorrect);
    
    const displayList = resultTab === 'INCORRECT' ? incorrectList 
                      : resultTab === 'CORRECT' ? correctList 
                      : results;

    return (
      <div className="max-w-5xl mx-auto w-full pt-10 pb-20 px-6">
        
        {/* Score Card */}
        <div className="bg-[#1A2C6E] rounded-[3rem] shadow-2xl shadow-[#1A2C6E]/30 overflow-hidden mb-12 relative text-white p-10 md:p-14">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#6A5AE0] rounded-full blur-[100px] opacity-50 -translate-y-1/2 translate-x-1/3"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                <div className="text-center md:text-left space-y-4">
                    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                        {passed ? "Excellent Job!" : "Keep Practicing!"}
                    </h2>
                    <p className="text-blue-200 text-lg font-medium">
                        You scored <span className="text-[#F6C667] font-bold">{percentage}%</span> in {config.subject}.
                        <br/>Review your results below.
                    </p>
                    <div className="pt-4 flex flex-wrap gap-4 justify-center md:justify-start">
                        <button 
                            onClick={() => {
                                setConfig({...config, topic: ''}); 
                                setView('HOME');
                            }}
                            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold backdrop-blur-md border border-white/10 transition"
                        >
                            Back Home
                        </button>
                        <button 
                            onClick={handleStartQuiz}
                            className="px-6 py-3 bg-[#1BC7B1] text-white rounded-xl font-bold shadow-lg shadow-[#1BC7B1]/30 hover:bg-[#18b09d] transition flex items-center hover:-translate-y-1"
                        >
                            <RefreshCw className="mr-2 h-5 w-5" /> New Exam
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <div className="w-48 h-48 rounded-full border-[12px] border-[#ffffff]/10 flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full border-[12px] border-[#F6C667] border-t-transparent -rotate-45" style={{ opacity: percentage / 100 }}></div>
                        <div className="text-center">
                            <span className="block text-5xl font-black text-white">{score}</span>
                            <span className="text-blue-300 font-bold uppercase text-sm tracking-widest">of {total}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Filters */}
        <div className="flex justify-center mb-10">
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 inline-flex gap-2">
                {[
                  { id: 'INCORRECT', label: 'Review Needed', icon: AlertCircle, color: 'text-rose-500 bg-rose-50' },
                  { id: 'CORRECT', label: 'Mastered', icon: CheckCircle, color: 'text-[#1BC7B1] bg-[#1BC7B1]/10' },
                  { id: 'ALL', label: 'All Questions', icon: Layers, color: 'text-slate-600 bg-slate-100' },
                ].map((tab) => (
                   <button 
                    key={tab.id}
                    onClick={() => setResultTab(tab.id as any)}
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition flex items-center ${
                    resultTab === tab.id ? `${tab.color} shadow-sm` : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <tab.icon className="w-4 h-4 mr-2" />
                    {tab.label}
                </button>
                ))}
            </div>
        </div>

        {/* Results List */}
        <div className="space-y-8">
          {displayList.length === 0 ? (
            <div className="text-center py-20 px-6 rounded-[2.5rem] bg-white border-2 border-dashed border-slate-200">
                <div className="mx-auto h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                    <Sparkles className="h-8 w-8" />
                </div>
              <p className="text-slate-400 font-bold text-lg">No questions found in this category.</p>
            </div>
          ) : (
            displayList.map((result) => {
              const question = quizState.questions.find(q => q.id === result.questionId);

              return (
                <div key={result.questionId} className="bg-white rounded-[2.5rem] shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                  
                  {/* Card Header */}
                  <div className={`px-8 py-6 flex items-start justify-between ${result.isCorrect ? 'bg-[#1BC7B1]/5' : 'bg-rose-50'}`}>
                    <div className="flex gap-5">
                        <div className={`mt-1 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${result.isCorrect ? 'bg-[#1BC7B1] text-white' : 'bg-rose-500 text-white'}`}>
                            {result.isCorrect ? <Check className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Question {result.questionId}</span>
                            <p className="font-bold text-[#1A2C6E] text-xl leading-snug">
                                <SmartText text={result.questionText} />
                            </p>
                        </div>
                    </div>
                  </div>

                  <div className="p-8 md:p-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {/* User Choice */}
                      <div className={`p-6 rounded-2xl border-2 ${result.isCorrect ? 'bg-[#1BC7B1]/5 border-[#1BC7B1]/30' : 'bg-rose-50 border-rose-100'}`}>
                        <span className={`text-xs font-bold uppercase tracking-wider block mb-2 opacity-70 ${result.isCorrect ? 'text-[#1BC7B1]' : 'text-rose-600'}`}>
                          You Selected
                        </span>
                        <p className={`font-bold text-lg ${result.isCorrect ? 'text-[#159c8b]' : 'text-rose-700'}`}>
                          {result.selectedOptionIndex === -1 ? "Skipped" : <SmartText text={question?.options[result.selectedOptionIndex] || ''} />}
                        </p>
                      </div>

                      {/* Correct Choice (if wrong) */}
                      {!result.isCorrect && (
                         <div className="p-6 rounded-2xl bg-slate-50 border-2 border-slate-100">
                           <span className="text-xs font-bold uppercase tracking-wider block mb-2 text-slate-400">
                             Correct Answer
                           </span>
                           <p className="font-bold text-lg text-[#1A2C6E]">
                             <SmartText text={question?.options[result.correctOptionIndex] || ''} />
                           </p>
                         </div>
                      )}
                    </div>
                    
                    {/* View Explanation Button for Incorrect Answers */}
                    {!result.isCorrect && (
                        <button 
                            onClick={() => handleViewExplanation(result.questionId)}
                            className="w-full py-4 rounded-xl bg-[#6A5AE0]/10 hover:bg-[#6A5AE0]/20 text-[#6A5AE0] font-bold transition flex items-center justify-center gap-2 group"
                        >
                            <Sparkles className="h-5 w-5" />
                            <span>Analyze with AI</span>
                            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderExplanationDetail = () => {
    const questionId = selectedQuestionForExplanation;
    if (!questionId) return null;

    const result = results.find(r => r.questionId === questionId);
    const question = quizState.questions.find(q => q.id === questionId);
    const explanation = explanationCache[questionId];

    if (!result || !question) return null;

    return (
        <div className="max-w-4xl mx-auto w-full pt-10 pb-20 px-6 animate-in fade-in slide-in-from-right-4 duration-300">
             {/* Nav Back */}
            <button 
                onClick={() => setView('RESULT')}
                className="mb-8 flex items-center text-slate-500 hover:text-[#1A2C6E] font-bold transition group"
            >
                <div className="p-2 bg-white rounded-full mr-2 shadow-sm group-hover:shadow-md">
                    <ArrowLeft className="h-5 w-5" />
                </div>
                Back to Results
            </button>

            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100 border border-white overflow-hidden">
                <div className="bg-[#1A2C6E] p-12 text-white relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 text-white/5">
                        <Brain className="h-64 w-64" />
                    </div>
                    <div className="relative z-10">
                        <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-sm font-bold tracking-wide uppercase mb-6 inline-block text-[#F6C667]">
                            Question {questionId} Analysis
                        </span>
                        {/* Changed from h2 to div to allow valid block nesting of SmartText */}
                        <div className="text-2xl md:text-4xl font-extrabold leading-normal">
                            <SmartText text={question.questionText} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="p-10 md:p-14">
                    <div className="grid md:grid-cols-2 gap-10 mb-12">
                        <div>
                             <span className="text-sm font-bold uppercase tracking-wider block mb-3 text-rose-500 pl-1">Your Answer</span>
                             <div className="p-8 rounded-3xl bg-rose-50 border-2 border-rose-100 h-full flex items-center">
                                <div className="font-bold text-xl text-rose-700">
                                    {result.selectedOptionIndex === -1 ? "Skipped" : <SmartText text={question.options[result.selectedOptionIndex]} />}
                                </div>
                             </div>
                        </div>
                         <div>
                             <span className="text-sm font-bold uppercase tracking-wider block mb-3 text-[#159c8b] pl-1">Correct Answer</span>
                             <div className="p-8 rounded-3xl bg-[#1BC7B1]/10 border-2 border-[#1BC7B1]/20 h-full flex items-center">
                                <div className="font-bold text-xl text-[#159c8b]">
                                    <SmartText text={question.options[question.correctOptionIndex]} />
                                </div>
                             </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-10">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-[#6A5AE0] text-white p-3 rounded-2xl shadow-lg shadow-[#6A5AE0]/30">
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <h3 className="text-3xl font-extrabold text-[#1A2C6E]">AI Tutor Explanation</h3>
                        </div>
                        
                        <div className="bg-slate-50 rounded-[2rem] p-8 md:p-12 border border-slate-100 min-h-[200px]">
                            {explaining ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <div className="w-16 h-16 relative mb-4">
                                        <div className="absolute inset-0 bg-[#6A5AE0] rounded-full opacity-20 animate-ping"></div>
                                        <div className="relative bg-[#6A5AE0] text-white rounded-full h-full w-full flex items-center justify-center">
                                            <Brain className="h-8 w-8 animate-pulse" />
                                        </div>
                                    </div>
                                    <h4 className="text-xl font-bold text-[#1A2C6E] mb-2">Analyzing Problem...</h4>
                                    <p className="text-slate-500">Gemini is writing a step-by-step solution for you.</p>
                                </div>
                            ) : explanation ? (
                                <SmartText text={explanation} />
                            ) : (
                                <div className="text-center py-10 text-slate-400">
                                    <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                    <p>Could not load explanation. Please try again.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen relative overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] overflow-hidden">
         <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#6A5AE0] rounded-full blur-[120px] opacity-5 animate-float"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#1BC7B1] rounded-full blur-[150px] opacity-5 animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      <Navbar onHome={() => setView('HOME')} currentView={view} />
      
      <main className="flex-grow flex flex-col relative z-0">
        {loading ? (
          <LoadingScreen message={loadingMessage} />
        ) : (
          <>
            {view === 'HOME' && renderHome()}
            {view === 'TUTORIAL' && renderTutorial()}
            {view === 'QUIZ' && renderQuiz()}
            {view === 'RESULT' && renderResult()}
            {view === 'EXPLANATION_DETAIL' && renderExplanationDetail()}
          </>
        )}
      </main>

      <footer className="py-10 text-center">
         <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 border border-white/60 backdrop-blur-sm">
            <span className="text-slate-400 text-sm font-bold">Powered by</span>
            <span className="text-[#6A5AE0] font-black tracking-tight">Gemini Flash</span>
         </div>
      </footer>
    </div>
  );
}