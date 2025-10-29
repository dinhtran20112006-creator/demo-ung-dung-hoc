import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Award, BarChart3, BookOpen, Brain, BrainCircuit, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Download, Flame, Folder, FolderOpen, Lightbulb, Moon, Play, Plus, RefreshCw, Settings, Sparkles, Square, Star, Sun, Target, ThumbsDown, ThumbsUp, Trash2, Trophy, Upload, Volume2, VolumeX, X, Zap, Check, AlertTriangle, Info, HelpCircle, Palette, Mic, MicOff, ShieldCheck, Eye, UploadCloud } from 'lucide-react';
import { EnhancedSpacedRepetition } from './enhanced-spaced-repetition';
import BlankPaperMode from './components/BlankPaperMode';
import LeitnerBoxVisualization from './components/LeitnerBoxVisualization';
import EnhancedStudyModeSelector from './components/EnhancedStudyModeSelector';
import CalendarView from './components/CalendarView';
import ABTestingDashboard from './components/ABTestingDashboard';
import OpenEndedMode from './components/OpenEndedMode';
import AIPromptManager from './components/AIPromptManager';
import { Subject, Chapter, Topic, AIPromptVersion, AIQuestionQuality, Badge, ChatMessage, QuizConfig, QuizSession, QuizResult } from './interfaces/quiz';
import { QuizEngine } from './utils/quiz-engine';
import QuizConfigurator from './components/QuizConfigurator';
import EnhancedQuizSession from './components/EnhancedQuizSession';
import AdvancedQuizResults from './components/AdvancedQuizResults';
import ModernFlashcard from './components/ModernFlashcard';


// Helper function to validate the structure of imported data
const isValidImportData = (data: any): boolean => {
    if (typeof data !== 'object' || data === null) return false;
    
    // A basic check for the main 'subjects' array
    if (!('subjects' in data) || !Array.isArray(data.subjects)) {
        return false;
    }

    // Optional checks for other properties to ensure basic type safety
    const optionalProps: { [key: string]: string } = {
        totalXP: 'number',
        currentStreak: 'number',
        lastStudyDate: 'string', // can also be null
        level: 'number',
        darkMode: 'boolean',
        pomodoroWorkDuration: 'number',
        pomodoroBreakDuration: 'number',
    };

    for (const prop in optionalProps) {
        if (prop in data && data[prop] !== null && typeof data[prop] !== optionalProps[prop]) {
            return false;
        }
    }
    
    if ('badges' in data && typeof data.badges !== 'object') return false; // Badges are an object now


    // Could add deeper validation for subjects/chapters/topics if needed
    return true;
};

// Mock Leaderboard Data
const mockLeaderboard = [
    { rank: 1, avatar: '🐉', username: 'StudyDragon', xp: 3450, badges: ['🏆', '🔥 12'] },
    { rank: 2, avatar: '🧠', username: 'Brainiac', xp: 2890, badges: ['⚡', '🔥 9'] },
    { rank: 3, avatar: '🦉', username: 'NightOwl', xp: 2150, badges: ['🌙', '🔥 7'] },
    { rank: 4, avatar: '⚛️', username: 'QuantumLeap', xp: 1550, badges: ['🔥 4'] },
];

interface AIDecisionLogEntry {
    id: number;
    timestamp: Date;
    action: string;
    reason: string;
    decision: string;
    icon: React.ElementType;
}


const App = () => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [expandedSubject, setExpandedSubject] = useState<number | null>(null);
    const [expandedChapters, setExpandedChapters] = useState<{ [key: number]: boolean }>({});
    const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
    const [studyMode, setStudyMode] = useState<any | null>(null);
    const [practiceTestMode, setPracticeTestMode] = useState<any | null>(null);
    const [practiceTestAnswers, setPracticeTestAnswers] = useState<any[]>([]);
    const [practiceTestSummary, setPracticeTestSummary] = useState<any | null>(null);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [revealed, setRevealed] = useState(false);
    const [notesInput, setNotesInput] = useState('');
    const [generatingQuestions, setGeneratingQuestions] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [showTechnique, setShowTechnique] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isAudioOn, setIsAudioOn] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [showABTesting, setShowABTesting] = useState(false);
    const [showPromptManager, setShowPromptManager] = useState(false);


    // Gamification State
    const [totalXP, setTotalXP] = useState(0);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [lastStudyDate, setLastStudyDate] = useState<string | null>(null);
    const [level, setLevel] = useState(1);
    
    // New Gamification Features
    const [badges, setBadges] = useState<{[key: string]: Badge}>({});
    const [badgeNotifications, setBadgeNotifications] = useState<Badge[]>([]);
    const [achievementToast, setAchievementToast] = useState<{title: string, description: string, icon: string, xp: number} | null>(null);


    const [subjectInput, setSubjectInput] = useState('');
    const [newChapterName, setNewChapterName] = useState('');

    // Enhanced Learning Features State
    const [blankPaperMode, setBlankPaperMode] = useState<{ subject: Subject } | null>(null);
    const [openEndedMode, setOpenEndedMode] = useState<{ subject: Subject, chapter: Chapter } | null>(null);
    const enhancedSpacedRepetition = useMemo(() => new EnhancedSpacedRepetition(), []);

    // AI Chatbot State
    const [showAIChatbot, setShowAIChatbot] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [userMessage, setUserMessage] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);

    // Study Mode Enhancement State
    const [isAwaitingNext, setIsAwaitingNext] = useState(false);
    const [selectedConfidence, setSelectedConfidence] = useState<string | null>(null);
    const timeoutRef = useRef<number | null>(null);
    const saveTimeoutRef = useRef<number | null>(null);
    const [confettiPieces, setConfettiPieces] = useState<any[]>([]);
    const [swipeState, setSwipeState] = useState({ x: 0, y: 0, rotation: 0, feedback: '', moving: false });
    const cardRef = useRef<HTMLDivElement>(null);
    const gestureState = useRef({ startX: 0, startY: 0, isDragging: false });
    const [cardAnimationClass, setCardAnimationClass] = useState('card-enter');
    const [showKeyboardHint, setShowKeyboardHint] = useState(true);
    const [showShortcutsModal, setShowShortcutsModal] = useState(false);
    const [hintState, setHintState] = useState({ level: 0, text: '', show: false, isPulsing: false });
    const autoHintTimerRef = useRef<number | null>(null);
    const [studyTheme, setStudyTheme] = useState('default');
    const [comboCount, setComboCount] = useState(0);
    const [comboBonus, setComboBonus] = useState(0);
    const [cardStep, setCardStep] = useState('recall'); // recall, front, assess, confidence
    const recallTimeoutRef = useRef<number | null>(null);
    const [memoryStrength, setMemoryStrength] = useState({ level: 0, nextReview: '', display: false });
    const [showChapterHeader, setShowChapterHeader] = useState(false);
    const [studySessionStats, setStudySessionStats] = useState<{startTime: number, cards: {confidence: string, responseTime: number}[], duration: number, cardCount: number} | null>(null);
    const [isVoiceControlOn, setIsVoiceControlOn] = useState(false);
    const recognitionRef = useRef<any>(null);

    // New Advanced Features State
    const [showBurnoutIntervention, setShowBurnoutIntervention] = useState(false);
    const [showAIDecisionLog, setShowAIDecisionLog] = useState(false);
    const [aiDecisionLog, setAiDecisionLog] = useState<AIDecisionLogEntry[]>([]);
    const [showDiagramAnalysis, setShowDiagramAnalysis] = useState(false);
    const [biasCheckResult, setBiasCheckResult] = useState<string | null>(null);
    const [isCheckingBias, setIsCheckingBias] = useState(false);

     // Accessibility State
    const [srAnnouncement, setSrAnnouncement] = useState('');
    
    // AI Generation & Filtering State
    const [aiDifficulty, setAiDifficulty] = useState<'mixed' | 'easy' | 'medium' | 'hard'>('mixed');
    const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard' | 'none'>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'concept' | 'application' | 'analysis' | 'evaluation'>('all');

    // Calendar View State
    const [showCalendarView, setShowCalendarView] = useState(false);

    // Enhanced Pomodoro Timer State
    const [pomodoroWorkDuration, setPomodoroWorkDuration] = useState(25);
    const [pomodoroBreakDuration, setPomodoroBreakDuration] = useState(5);
    const [pomodoroSessionType, setPomodoroSessionType] = useState<'work' | 'break'>('work');
    const [pomodoroTime, setPomodoroTime] = useState(pomodoroWorkDuration * 60);
    const [isPomodoroActive, setIsPomodoroActive] = useState(false);
    const [isPomodoroMinimized, setIsPomodoroMinimized] = useState(false);
    const [pomodoroPosition, setPomodoroPosition] = useState<{ x: number, y: number } | null>(null);
    const [isPomodoroDragging, setIsPomodoroDragging] = useState(false);
    const [pomodoroDragOffset, setPomodoroDragOffset] = useState({ x: 0, y: 0 });
    const pomodoroRef = useRef<HTMLDivElement>(null);

    // Fill in the Blanks State
    const [fillBlanksMode, setFillBlanksMode] = useState<any | null>(null);
    const [fillBlanksAnswer, setFillBlanksAnswer] = useState('');
    const [fillBlanksStatus, setFillBlanksStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');

    // AI Prompt A/B Testing State
    const [aiPromptVersions, setAiPromptVersions] = useState<AIPromptVersion[]>([
      {
        id: 'v1',
        name: 'Prompt Cơ Bản',
        prompt: `Bạn là một chuyên gia sư phạm và khoa học học tập. Nhiệm vụ của bạn là tạo ra 8-12 câu hỏi CHẤT LƯỢNG CAO từ nội dung sau, tập trung vào **Active Recall** và **hiểu sâu**.

**NỘI DUNG GỐC:**
{notes}

**QUY TRÌNH BẮT BUỘC:**
1.  **PHÂN TÍCH & HIỂU SÂU:** Đọc kỹ nội dung và xác định các khái niệm cốt lõi.
2.  **TẠO CÂU HỎI MỞ:** Tạo các câu hỏi buộc người học phải giải thích, so sánh, hoặc áp dụng kiến thức.
    -   **NÊN DÙNG:** "Giải thích tại sao...", "So sánh X và Y...", "Nếu... thì sao?", "Làm thế nào để áp dụng...", "Hãy giải thích [khái niệm X] bằng ngôn ngữ của bạn".
    -   **TRÁNH DÙNG:** Các câu hỏi chỉ cần trả lời "Có/Không" hoặc định nghĩa đơn giản.
3.  **PHÂN LOẠI & ĐÁNH GIÁ:** Với MỖI câu hỏi, hãy phân loại và đánh giá độ khó.
    -   **Loại:** 'concept' (hiểu khái niệm), 'application' (ứng dụng), 'analysis' (phân tích), 'evaluation' (đánh giá).
    -   **Độ khó:** 'easy', 'medium', 'hard'. {difficulty}
4.  **ĐỊNH DẠNG ĐẦU RA (CỰC KỲ QUAN TRỌNG):**
    -   Trả về KẾT QUẢ CUỐI CÙNG dưới dạng danh sách.
    -   Mỗi mục trên một dòng riêng.
    -   TUÂN THỦ NGHIÊM NGẶT định dạng:
        "Câu hỏi? | Đáp án | Độ khó | Loại"`,
        qualityScore: 0.8,
        usageCount: 0,
        positiveFeedback: 0,
        negativeFeedback: 0
      },
      {
        id: 'v2',
        name: 'Prompt Nâng Cao - Bloom Taxonomy',
        prompt: `Bạn là chuyên gia sư phạm. Phân tích nội dung sau và tạo câu hỏi theo thang Bloom:
        **NỘI DUNG:** {notes}
        1. Nhớ (20%): Ghi nhớ thông tin cơ bản
        2. Hiểu (30%): Giải thích, diễn giải
        3. Áp dụng (25%): Vận dụng vào tình huống mới
        4. Phân tích (15%): Phân tích mối quan hệ
        5. Đánh giá (10%): Đưa ra nhận xét, đánh giá
        
        Định dạng: "Câu hỏi? | Đáp án | Độ khó | Loại | Bloom Level"
        Độ khó yêu cầu: {difficulty}
        Đảm bảo đa dạng và cân bằng các cấp độ...`,
        qualityScore: 0.85, // Start with a slightly higher initial score
        usageCount: 0,
        positiveFeedback: 0,
        negativeFeedback: 0
      },
      {
        id: 'v3', 
        name: 'Prompt Thực Tế - Case Study',
        prompt: `Tập trung vào ứng dụng thực tế từ nội dung: {notes}
        - 40% câu hỏi tình huống thực tế
        - 30% câu hỏi giải quyết vấn đề  
        - 20% câu hỏi phân tích case study
        - 10% câu hỏi đánh giá hiệu quả
        Độ khó yêu cầu: {difficulty}
        Mỗi câu hỏi phải liên quan đến ứng dụng trong đời sống/công việc...
        Định dạng: "Câu hỏi? | Đáp án | Độ khó | Loại"
        `,
        qualityScore: 0.82,
        usageCount: 0,
        positiveFeedback: 0,
        negativeFeedback: 0
      },
      {
        id: 'v4',
        name: 'Prompt Feynman - Giản Hóa',
        prompt: `Bạn là một chuyên gia áp dụng Kỹ thuật Feynman. Nhiệm vụ của bạn là tạo ra các câu hỏi từ nội dung sau, tập trung vào việc **giản lược hóa khái niệm** và **tìm ra lỗ hổng kiến thức**.

**NỘI DUNG:**
{notes}

**QUY TRÌNH BẮT BUỘC:**
1.  **Giả Lập Giảng Dạy:** Đọc kỹ nội dung và tưởng tượng bạn phải dạy nó cho một người hoàn toàn mới.
2.  **TẠO CÂU HỎI "Giản Lược Hóa":** Tạo các câu hỏi yêu cầu người học phải giải thích các ý tưởng phức tạp bằng ngôn từ đơn giản nhất, hoặc dùng ví dụ/phép ẩn dụ.
    -   **NÊN DÙNG:** "Giải thích [chủ đề X] trong một câu duy nhất.", "Hãy đưa ra một phép ví von trong đời thực cho [khái niệm Y]."
3.  **TẠO CÂU HỎI "Tìm Lỗ Hổng":** Tạo các câu hỏi nhắm vào những điểm mà sự hiểu biết có thể còn hời hợt.
    -   **NÊN DÙNG:** "Sai lầm phổ biến nhất khi nghĩ về [chủ đề Z] là gì?", "Nếu phải loại bỏ một chi tiết khỏi lời giải thích này, đó sẽ là gì và tại sao?"
4.  **Phân Loại & Định Dạng:** Với MỖI câu hỏi, xác định độ khó và loại.
    -   **Độ khó:** 'easy', 'medium', 'hard'. Bám sát yêu cầu độ khó: {difficulty}.
    -   **Loại:** 'concept', 'application', 'analysis', 'evaluation'.
5.  **ĐỊNH DẠNG ĐẦU RA (CỰC KỲ QUAN TRỌNG):**
    -   Trả về KẾT QUẢ CUỐI CÙNG dưới dạng danh sách.
    -   Mỗi mục trên một dòng riêng.
    -   TUÂN THỦ NGHIÊM NGẶT định dạng:
        "Câu hỏi? | Đáp án | Độ khó | Loại"`,
        qualityScore: 0.83,
        usageCount: 0,
        positiveFeedback: 0,
        negativeFeedback: 0
      }
    ]);

    const [aiQuestionQuality, setAiQuestionQuality] = useState<AIQuestionQuality[]>([]);
    const [currentPromptVersion, setCurrentPromptVersion] = useState('v1');
    const [toasts, setToasts] = useState<Array<{
        id: number;
        message: string;
        type: 'success' | 'error' | 'info' | 'warning';
    }>>([]);
    
    // Deletion Confirmation State
    const [deleteConfirm, setDeleteConfirm] = useState<{
      show: boolean;
      type: 'subject' | 'chapter' | '';
      data: any;
      message: string;
    }>({
      show: false,
      type: '',
      data: null,
      message: ''
    });

    // Advanced Quiz State
    const quizEngine = useMemo(() => {
        if (subjects.length > 0) {
            return new QuizEngine(subjects);
        }
        return null;
    }, [subjects]
    );
    const [quizConfigurator, setQuizConfigurator] = useState(false);
    const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
    const [quizResult, setQuizResult] = useState<QuizResult | null>(null);


    const confidenceLevels = [
        { value: 'red', label: 'Rất yếu', className: 'confidence-red', emoji: '😫', xp: 10, performance: 1 },
        { value: 'orange', label: 'Yếu', className: 'confidence-orange', emoji: '😕', xp: 25, performance: 2 },
        { value: 'yellow', label: 'Tốt', className: 'confidence-yellow', emoji: '😊', xp: 50, performance: 3 },
        { value: 'green', label: 'Xuất sắc', className: 'confidence-green', emoji: '🎉', xp: 100, performance: 4 },
    ];
    
     const ALL_BADGES: Omit<Badge, 'unlocked' | 'date'>[] = useMemo(() => [
        { id: 'newbie', name: 'Tân Binh', description: 'Thêm môn học đầu tiên của bạn.', icon: Star },
        { id: 'first_study', name: 'Người Bắt Đầu', description: 'Hoàn thành buổi học đầu tiên.', icon: Play },
        { id: 'ai_scholar', name: 'Học Giả AI', description: 'Tạo câu hỏi đầu tiên bằng AI.', icon: Lightbulb },
        { id: 'streak_3', name: 'Nhà Vô Địch Streak', description: 'Đạt được chuỗi 3 ngày học.', icon: Flame },
        { id: 'expert', name: 'Chuyên Gia', description: 'Thành thạo một câu hỏi.', icon: Trophy },
        { id: 'collector', name: 'Nhà Sưu Tầm', description: 'Tạo tổng cộng 50 câu hỏi.', icon: Folder },
        { id: 'chapter_master', name: 'Bậc Thầy Chương', description: 'Thành thạo tất cả câu hỏi trong một chương.', icon: Award },
        { id: 'on_fire', name: 'On Fire', description: 'Đạt chuỗi 7 ngày học liên tục.', icon: Flame },
        { id: 'perfect_score', name: 'Perfect Score', description: 'Đạt 100% trong một bài quiz.', icon: Target },
    ], []);

    const totalTopics = useMemo(() => 
        subjects.reduce((sum, s) => 
            sum + s.chapters.reduce((cSum, c) => cSum + c.topics.length, 0), 0
        ), [subjects]
    );

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const handlePomodoroComplete = useCallback(() => {
        if (isAudioOn) {
            try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.1;
                
                oscillator.start();
                setTimeout(() => {
                    oscillator.stop();
                    audioContext.close();
                }, 1000);
            } catch (e) {
                console.log('Audio not supported');
            }
        }
        
        if (pomodoroSessionType === 'work') {
            showToast('Pomodoro hoàn thành! Nghỉ ngơi thôi!', 'success');
            setPomodoroSessionType('break');
            setPomodoroTime(pomodoroBreakDuration * 60);
        } else {
            showToast('Hết giờ nghỉ! Quay lại làm việc nào!', 'info');
            setPomodoroSessionType('work');
            setPomodoroTime(pomodoroWorkDuration * 60);
        }
    }, [isAudioOn, pomodoroSessionType, pomodoroBreakDuration, pomodoroWorkDuration, showToast]);

     useEffect(() => {
        let interval: number | undefined;
        
        if (isPomodoroActive && pomodoroTime > 0) {
            interval = window.setInterval(() => {
                setPomodoroTime(time => {
                    if (time <= 1) {
                        clearInterval(interval!);
                        setIsPomodoroActive(false);
                        handlePomodoroComplete();
                        return 0;
                    }
                    return time - 1;
                });
            }, 1000);
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isPomodoroActive, pomodoroTime, handlePomodoroComplete]);


    useEffect(() => {
        const init = async () => {
            await loadData();
        };
        init();
        
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
             // Cleanup voice recognition
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    useEffect(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        
        saveTimeoutRef.current = window.setTimeout(() => {
            saveData();
        }, 1000);
        
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [subjects, totalXP, currentStreak, lastStudyDate, badges, darkMode, pomodoroWorkDuration, pomodoroBreakDuration, aiPromptVersions, aiQuestionQuality]);

    useEffect(() => {
        const newLevel = Math.floor(totalXP / 500) + 1;
        setLevel(newLevel);
    }, [totalXP]);

    // Initialize chatbot with a welcome message
    useEffect(() => {
        if (showAIChatbot && chatMessages.length === 0) {
            setChatMessages([
                {
                    id: 1,
                    role: 'assistant',
                    content: 'Xin chào! Tôi là AI Coach Học Tập. Hôm nay chúng ta cùng học gì nhé? Mục tiêu của bạn sau buổi học này là gì?',
                    timestamp: new Date()
                }
            ]);
        }
    }, [showAIChatbot]);
    
    const addAIDecisionLog = (action: string, reason: string, decision: string, icon: React.ElementType) => {
        const newEntry: AIDecisionLogEntry = {
            id: Date.now(),
            timestamp: new Date(),
            action,
            reason,
            decision,
            icon,
        };
        setAiDecisionLog(prev => [newEntry, ...prev].slice(0, 20)); // Keep last 20 entries
    };

    const saveData = async () => {
        try {
            const data = { subjects, totalXP, currentStreak, lastStudyDate, badges, level, darkMode, pomodoroWorkDuration, pomodoroBreakDuration, aiPromptVersions, aiQuestionQuality };
            await (window as any).storage?.set('cornell-data', JSON.stringify(data));
        } catch (e) {
            console.error('Error saving:', e);
            showToast('Lỗi lưu dữ liệu', 'error');
        }
    };

    const initializeDefaultData = () => {
        const initialBadges: {[key: string]: Badge} = {};
        ALL_BADGES.forEach(b => {
            initialBadges[b.id] = { ...b, unlocked: false };
        });
        setBadges(initialBadges);
    };

    const loadData = async () => {
        try {
            const result = await (window as any).storage?.get('cornell-data');
            
            if (!result || !result.value) {
                console.log('No saved data found, initializing defaults');
                initializeDefaultData();
                return;
            }
            
            let data;
            try {
                data = JSON.parse(result.value);
            } catch (parseError) {
                console.error('Failed to parse saved data:', parseError);
                showToast('⚠️ Dữ liệu bị lỗi. Khởi tạo lại.', 'error');
                initializeDefaultData();
                return;
            }
            
            if (!isValidImportData(data)) {
                console.error('Invalid data structure');
                showToast('⚠️ Cấu trúc dữ liệu không hợp lệ. Khởi tạo lại.', 'warning');
                initializeDefaultData();
                return;
            }
            
            setSubjects(data.subjects?.map((s: Subject) => ({
                ...s,
                chapters: s.chapters?.map((c: Chapter) => ({
                    ...c,
                    feynmanNotes: c.feynmanNotes || '',
                    topics: c.topics || []
                })) || []
            })) || []);
            
            setTotalXP(Number(data.totalXP) || 0);
            setCurrentStreak(Number(data.currentStreak) || 0);
            setLastStudyDate(data.lastStudyDate || null);
            setLevel(Number(data.level) || 1);
            setDarkMode(Boolean(data.darkMode));
            setPomodoroWorkDuration(Number(data.pomodoroWorkDuration) || 25);
            setPomodoroBreakDuration(Number(data.pomodoroBreakDuration) || 5);
            setPomodoroTime((Number(data.pomodoroWorkDuration) || 25) * 60);
            
            const initialBadges: {[key: string]: Badge} = {};
            ALL_BADGES.forEach(b => {
                initialBadges[b.id] = { 
                    ...b, 
                    unlocked: false,
                    date: undefined 
                };
            });
            
            if (data.badges) {
                if (Array.isArray(data.badges)) {
                    data.badges.forEach((b: any) => {
                        if (b && b.id && initialBadges[b.id]) {
                            initialBadges[b.id] = { 
                                ...initialBadges[b.id], 
                                ...b, 
                                unlocked: Boolean(b.unlocked) 
                            };
                        }
                    });
                } else if (typeof data.badges === 'object' && data.badges !== null) {
                    Object.keys(data.badges).forEach(badgeId => {
                        if (initialBadges[badgeId] && data.badges[badgeId]?.unlocked) {
                            initialBadges[badgeId] = { 
                                ...initialBadges[badgeId], 
                                ...data.badges[badgeId] 
                            };
                        }
                    });
                }
            }
            setBadges(initialBadges);

            if (data.aiPromptVersions) setAiPromptVersions(data.aiPromptVersions);
            if (data.aiQuestionQuality) setAiQuestionQuality(data.aiQuestionQuality);

        } catch (error) {
            console.error('Critical error loading data:', error);
            showToast('❌ Không thể tải dữ liệu.', 'error');
            initializeDefaultData();
        }
    };

    const exportData = () => {
        const data = { subjects, totalXP, currentStreak, lastStudyDate, badges, level, darkMode, pomodoroWorkDuration, pomodoroBreakDuration, aiPromptVersions, aiQuestionQuality };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cornell-backup-full.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                if (!e.target?.result) throw new Error("Không thể đọc tệp.");

                const data = JSON.parse(e.target.result as string);

                if (!isValidImportData(data)) {
                    throw new Error("Nội dung tệp không hợp lệ hoặc có cấu trúc không chính xác.");
                }

                if (confirm('Import sẽ ghi đè dữ liệu hiện tại của bạn. Bạn có muốn tiếp tục không?')) {
                    setSubjects(data.subjects || []);
                    setTotalXP(data.totalXP || 0);
                    setCurrentStreak(data.currentStreak || 0);
                    setLastStudyDate(data.lastStudyDate || null);
                     const initialBadges: {[key: string]: Badge} = {};
                    ALL_BADGES.forEach(b => {
                        initialBadges[b.id] = { ...b, unlocked: false };
                    });
                     if (Array.isArray(data.badges)) {
                        data.badges.forEach((b: any) => {
                           if (b && initialBadges[b.id]) initialBadges[b.id] = { ...initialBadges[b.id], ...b, unlocked: true };
                        });
                    } else if (typeof data.badges === 'object' && data.badges !== null) {
                        Object.keys(data.badges).forEach(badgeId => {
                            if (initialBadges[badgeId] && data.badges[badgeId]?.unlocked) {
                                initialBadges[badgeId] = { ...initialBadges[badgeId], ...data.badges[badgeId] };
                            }
                        });
                    }
                    setBadges(initialBadges);
                    setLevel(data.level || 1);
                    setDarkMode(data.darkMode || false);
                    setPomodoroWorkDuration(data.pomodoroWorkDuration || 25);
                    setPomodoroBreakDuration(data.pomodoroBreakDuration || 5);
                    if (data.aiPromptVersions) setAiPromptVersions(data.aiPromptVersions);
                    if (data.aiQuestionQuality) setAiQuestionQuality(data.aiQuestionQuality);
                    showToast('Nhập dữ liệu thành công!', 'success');
                }
            } catch (e) {
                const message = e instanceof Error ? e.message : "Đã xảy ra lỗi không xác định.";
                showToast(`Nhập thất bại: ${message}`, 'error');
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };
    
    const checkAndAwardBadges = (event?: { type: string, score?: number, time?: number }) => {
        const newBadges: string[] = [];
        
        const award = (badgeId: string) => {
            if (!badges[badgeId]?.unlocked) {
                newBadges.push(badgeId);
            }
        };

        if (subjects.length > 0) award('newbie');
        
        const hasStudied = subjects.some(s => s.chapters.some(c => c.topics.some(t => t.studies.length > 0)));
        if (hasStudied) award('first_study');

        const hasAITopic = subjects.some(s => s.chapters.some(c => c.topics.some(t => t.isAI)));
        if (hasAITopic) award('ai_scholar');
        
        if (currentStreak >= 3) award('streak_3');
        if (currentStreak >= 7) award('on_fire');

        const hasMasteredTopic = subjects.some(s => s.chapters.some(c => c.topics.some(t => enhancedSpacedRepetition.getMasteryLevel(t) === 5)));
        if (hasMasteredTopic) award('expert');

        if (totalTopics >= 50) award('collector');
        
        const hasMasteredChapter = subjects.some(s => s.chapters.some(c => 
            c.topics.length > 5 && c.topics.every(t => enhancedSpacedRepetition.getMasteryLevel(t) >= 4)
        ));
        if (hasMasteredChapter) award('chapter_master');

        if (event) {
            if (event.type === 'quiz' && event.score === 1) {
                award('perfect_score');
            }
        }


        if (newBadges.length > 0) {
            const unlockedBadges: {[key: string]: Badge} = { ...badges };
            const today = new Date().toISOString().split('T')[0];
            const notifications: Badge[] = [];
            
            newBadges.forEach(badgeId => {
                const badgeInfo = ALL_BADGES.find(b => b.id === badgeId);
                if (badgeInfo) {
                    const newBadge: Badge = { ...badgeInfo, unlocked: true, date: today };
                    unlockedBadges[badgeId] = newBadge;
                    notifications.push(newBadge);
                }
            });
            setBadges(unlockedBadges);

            if (notifications.length > 0) {
                setBadgeNotifications(prev => [...prev, ...notifications]);
                notifications.forEach((badge, index) => {
                    setTimeout(() => {
                        setBadgeNotifications(prev => prev.filter(b => b.id !== badge.id));
                    }, 5000 + (index * 1000));
                });
            }
        }
    };
    
    useEffect(() => {
        checkAndAwardBadges();
    }, [subjects, currentStreak]);

    const addSubject = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        if (subjectInput.trim()) {
            const updatedSubjects = [...subjects, { id: Date.now(), name: subjectInput, chapters: [] }];
            setSubjects(updatedSubjects);
            setSubjectInput('');
        }
    };

    const addChapter = (subjectId: number, e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        if (newChapterName.trim()) {
            const newChapter: Chapter = { id: Date.now(), name: newChapterName, topics: [], feynmanNotes: '' };
            const updatedSubjects = subjects.map(s =>
                s.id === subjectId
                    ? { ...s, chapters: [...s.chapters, newChapter] }
                    : s
            );
            setSubjects(updatedSubjects);
            setNewChapterName('');
        }
    };

    const handleNotesInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        e.stopPropagation();
        setNotesInput(e.target.value);
    };

    const handleFeynmanNotesChange = (subjectId: number, chapterId: number, newNotes: string) => {
        const updatedSubjects = subjects.map(s =>
            s.id === subjectId
                ? {
                    ...s,
                    chapters: s.chapters.map(c =>
                        c.id === chapterId ? { ...c, feynmanNotes: newNotes } : c
                    )
                }
                : s
        );
        setSubjects(updatedSubjects);
    };

    const getInputClasses = () => {
        const base = "px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors w-full";
        return `${base} ${darkMode
            ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400'
            : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500'}`;
    };

    const getTextareaClasses = () => {
        const base = "w-full px-3 py-2 border-2 rounded-lg h-32 mb-3 resize-none focus:outline-none focus:border-indigo-500 text-sm transition-colors";
        return `${base} ${darkMode
            ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400'
            : 'bg-white text-gray-900 border-indigo-300 placeholder-gray-500'}`;
    };

    const handleExpandSubject = (subjectId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedSubject(prev => (prev === subjectId ? null : subjectId));
    };

    const toggleChapter = (chapterId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedChapters(prev => ({ ...prev, [chapterId]: !prev[chapterId] }));
        setSelectedChapter(chapterId);
    };

    const handleDeleteTopic = (subjectId: number, chapterId: number, topicId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const updatedSubjects = subjects.map(s =>
            s.id === subjectId
                ? {
                    ...s,
                    chapters: s.chapters.map(c =>
                        c.id === chapterId
                            ? { ...c, topics: c.topics.filter(t => t.id !== topicId) }
                            : c
                    )
                }
                : s
        );
        setSubjects(updatedSubjects);
    };
    
    const handleAIFeedback = (topicId: number, feedback: 'good' | 'bad') => {
        const qualityRecord = aiQuestionQuality.find(q => q.topicId === topicId);
        if (!qualityRecord) return;
    
        const promptVersionId = qualityRecord.promptVersion;
      
        setAiPromptVersions(prev => 
            prev.map(p => {
                if (p.id === promptVersionId) {
                    const positiveIncrement = feedback === 'good' ? 1 : 0;
                    const negativeIncrement = feedback === 'bad' ? 1 : 0;
                    
                    const currentPositive = p.positiveFeedback || 0;
                    const currentNegative = p.negativeFeedback || 0;
                    
                    const newPositive = currentPositive + positiveIncrement;
                    const newNegative = currentNegative + negativeIncrement;
                    const totalFeedback = newPositive + newNegative;
                    
                    const newQualityScore = totalFeedback > 0 
                        ? (newPositive / totalFeedback) 
                        : p.qualityScore;
                    
                    return {
                        ...p,
                        positiveFeedback: newPositive,
                        negativeFeedback: newNegative,
                        qualityScore: parseFloat(newQualityScore.toFixed(4))
                    };
                }
                return p;
            })
        );
    
        setAiQuestionQuality(prev =>
            prev.map(q => 
                q.topicId === topicId ? { ...q, feedback } : q
            )
        );
    };

    const handleTopicFeedback = (subjectId: number, chapterId: number, topicId: number, feedback: 'good' | 'bad') => {
        const topic = subjects
            .find(s => s.id === subjectId)
            ?.chapters.find(c => c.id === chapterId)
            ?.topics.find(t => t.id === topicId);

        if (topic?.isAI) {
            handleAIFeedback(topicId, feedback);
        }

        setSubjects(prevSubjects => prevSubjects.map(s => 
            s.id === subjectId ? {
                ...s,
                chapters: s.chapters.map(c => 
                    c.id === chapterId ? {
                        ...c,
                        topics: c.topics.map(t => 
                            t.id === topicId ? {
                                ...t,
                                feedback: t.feedback === feedback ? null : feedback
                            } : t
                        )
                    } : c
                )
            } : s
        ));
    };
    
    // Multi-Armed Bandit prompt selection
    const getBestPromptVersion = (): AIPromptVersion => {
        const totalUses = aiPromptVersions.reduce((sum, v) => sum + v.usageCount, 0);

        let bestPrompt = aiPromptVersions[0];
        let maxScore = -1;

        aiPromptVersions.forEach(variant => {
            const exploitationTerm = variant.qualityScore;
            // Add a small epsilon to avoid division by zero
            const explorationBonus = Math.sqrt((2 * Math.log(totalUses + 1)) / (variant.usageCount + 1e-5));
            const score = exploitationTerm + explorationBonus;

            if (score > maxScore) {
                maxScore = score;
                bestPrompt = variant;
            }
        });

        addAIDecisionLog(
            'Chọn Prompt AI',
            `Tổng sử dụng: ${totalUses}, Quality: ${bestPrompt.qualityScore.toFixed(2)}, Lượt dùng: ${bestPrompt.usageCount}`,
            `Chọn "${bestPrompt.name}" với điểm bandit là ${maxScore.toFixed(2)}`,
            Zap
        );

        return bestPrompt;
    };

    // Auto-quality scoring for generated questions
    const calculateAutoQualityScore = (topic: Topic, promptVersion: string): number => {
        let score = 0;
        if (topic.question.length > 20 && topic.question.length < 200) score += 0.3;
        if (topic.answer.length > 5) score += 0.3;
        if (topic.difficulty && topic.type) score += 0.2;
        if (topic.question.trim().endsWith('?')) score += 0.1;
        const unwantedKeywords = ['đơn giản', 'dễ hiểu', 'câu hỏi là', 'trả lời là'];
        if (!unwantedKeywords.some(keyword => topic.question.toLowerCase().includes(keyword) || topic.answer.toLowerCase().includes(keyword))) score += 0.1;
        return parseFloat(score.toFixed(4));
    };

    // FIX: Moved parseEnhancedAIQuestions before its usage in enhancedAIQuestions to fix block-scoped variable error.
    const parseEnhancedAIQuestions = (aiText: string): Topic[] => {
        const lines = aiText.split('\n').filter(line => line.trim());
        const questions: Topic[] = [];
    
        const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];
        const VALID_TYPES = ['concept', 'application', 'analysis', 'evaluation'];
    
        lines.forEach(line => {
            const parts = line.split('|').map(p => p.trim());
    
            if (parts.length >= 4) {
                const [question, answer, rawDifficulty, rawType] = parts;
    
                const difficulty = VALID_DIFFICULTIES.includes(rawDifficulty.toLowerCase())
                    ? rawDifficulty.toLowerCase() as 'easy' | 'medium' | 'hard'
                    : 'medium';
    
                const type = VALID_TYPES.includes(rawType.toLowerCase())
                    ? rawType.toLowerCase() as 'concept' | 'application' | 'analysis' | 'evaluation'
                    : 'concept';
    
                if (question.length > 5 && answer.length > 3) {
                    questions.push({
                        id: Date.now() + Math.random(),
                        question: question.trim(),
                        answer: answer.trim(),
                        difficulty,
                        type,
                        studies: [],
                        isAI: true,
                        createdAt: new Date().toISOString(),
                        feedback: null,
                    });
                }
            }
        });
    
        return questions;
    };

    // FIX: Corrected the type definition for the 'difficulty' parameter.
    const enhancedAIQuestions = async (notesText: string, subjectId: number, chapterId: number, difficulty: 'mixed' | 'easy' | 'medium' | 'hard') => {
        if (!notesText.trim()) {
            showToast('Vui lòng nhập ghi chú!', 'warning');
            return;
        }
    
        setGeneratingQuestions(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            const promptVersion = getBestPromptVersion();
            setCurrentPromptVersion(promptVersion.id);
            
            setAiPromptVersions(prev => 
              prev.map(p => 
                p.id === promptVersion.id 
                  ? { ...p, usageCount: p.usageCount + 1 }
                  : p
              )
            );
    
            let difficultyInstruction: string;
            switch(difficulty) {
                case 'easy':
                    difficultyInstruction = `TẤT CẢ các câu hỏi phải có độ khó là 'easy'.`;
                    break;
                case 'medium':
                    difficultyInstruction = `TẤT CẢ các câu hỏi phải có độ khó là 'medium'.`;
                    break;
                case 'hard':
                    difficultyInstruction = `TẤT CẢ các câu hỏi phải có độ khó là 'hard'.`;
                    break;
                default:
                    difficultyInstruction = `Hãy cố gắng tạo ra sự pha trộn cân bằng giữa các mức độ khó.`;
            }
            const enhancedPrompt = promptVersion.prompt.replace('{notes}', notesText).replace('{difficulty}', difficultyInstruction);
    
            const response = await ai.models.generateContent({
              model: "gemini-2.5-pro",
              contents: enhancedPrompt,
              config: {
                thinkingConfig: { thinkingBudget: 32768 }
              }
            });
    
            const generatedText = response.text;
            const questions = parseEnhancedAIQuestions(generatedText);
            
            if (questions.length === 0) {
              showToast('AI không tạo được câu hỏi. Thử lại với nội dung khác!', 'warning');
              return;
            }
    
            const newQualityRecords: AIQuestionQuality[] = [];
            const questionsWithIds = questions.map(q => ({...q, id: Date.now() + Math.random()}));

            questionsWithIds.forEach((question) => {
              const qualityScore = calculateAutoQualityScore(question, promptVersion.id);
              newQualityRecords.push({
                promptVersion: promptVersion.id,
                topicId: question.id,
                feedback: null,
                autoQualityScore: qualityScore
              });
            });
            setAiQuestionQuality(prev => [...prev, ...newQualityRecords]);
    
            const updatedSubjects = subjects.map(s =>
              s.id === subjectId ? { 
                ...s, 
                chapters: s.chapters.map(c => 
                  c.id === chapterId ? { 
                    ...c, 
                    topics: [...c.topics, ...questionsWithIds] 
                  } : c
                )
              } : s
            );
            setSubjects(updatedSubjects);
    
            setNotesInput('');
            showToast(`✅ Đã tạo ${questions.length} câu hỏi bằng AI (${promptVersion.name})!`, 'success');
            
        } catch (e) {
            console.error('Enhanced AI Error:', e);
            showToast('Lỗi AI: ' + (e instanceof Error ? e.message : 'Unknown error'), 'error');
        } finally {
            setGeneratingQuestions(false);
        }
    };
    
    const parseCornellNotes = (subjectId: number, chapterId: number, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!notesInput.trim()) {
            showToast('Vui lòng nhập ghi chú!', 'warning');
            return;
        }

        setGeneratingQuestions(true);
        setTimeout(() => {
            try {
                const lines = notesInput.split('\n').filter(l => l.trim());
                const questions: Topic[] = [];
                let i = 0;
                while (i < lines.length && questions.length < 50) {
                    const line = lines[i].trim();
                    const pipeMatch = line.match(/^(.+?)\s*\|\s*(.+)$/);
                    if (pipeMatch) {
                        const q = pipeMatch[1];
                        const a = pipeMatch[2];
                        if (q.trim().length > 3 && a.trim().length > 3) {
                            questions.push({
                                id: Date.now() + Math.random(),
                                question: q.trim(),
                                answer: a.trim(),
                                studies: [],
                                isAI: false,
                                feedback: null,
                            });
                        }
                        i++;
                        continue;
                    }
                    if (line.endsWith('?') && line.length > 5) {
                        let answer = '';
                        i++;
                        let answerLines = 0;
                        while (i < lines.length && answerLines < 5) {
                            const nextLine = lines[i].trim();
                            if (nextLine.endsWith('?')) break;
                            answer += (nextLine + ' ');
                            i++;
                            answerLines++;
                        }
                        if (answer.trim().length > 3) {
                            questions.push({
                                id: Date.now() + Math.random(),
                                question: line,
                                answer: answer.trim(),
                                studies: [],
                                isAI: false,
                                feedback: null,
                            });
                            continue;
                        }
                    }
                    i++;
                }
                if (questions.length === 0) {
                    showToast('Không tìm thấy câu hỏi hợp lệ.', 'warning');
                    setGeneratingQuestions(false);
                    return;
                }

                const updatedSubjects = subjects.map(s =>
                    s.id === subjectId
                        ? {
                            ...s,
                            chapters: s.chapters.map(c =>
                                c.id === chapterId ? { ...c, topics: [...c.topics, ...questions] } : c
                            )
                        }
                        : s
                );
                setSubjects(updatedSubjects);
                setNotesInput('');
                showToast('Đã tạo ' + questions.length + ' câu hỏi!', 'success');

            } catch (e) {
                showToast('Lỗi: ' + (e instanceof Error ? e.message : "Unknown error"), 'error');
            } finally {
                setGeneratingQuestions(false);
            }
        }, 300);
    };

    const updateStreak = () => {
        const today = new Date().toISOString().split('T')[0];
        if (lastStudyDate) {
            const lastDate = new Date(lastStudyDate);
            const todayDate = new Date(today);
            const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                setCurrentStreak(currentStreak + 1);
            } else if (diffDays > 1) {
                setCurrentStreak(1);
            }
        } else {
            setCurrentStreak(1);
        }
        setLastStudyDate(today);
    };

    const recordStudy = (subjectId: number, chapterId: number, topicId: number, confidence: string) => {
        const confidenceLevel = confidenceLevels.find(c => c.value === confidence);
        if (!confidenceLevel) return;
    
        const xpGain = confidenceLevel.xp;
        const performance = confidenceLevel.performance;
        const today = new Date().toISOString().split('T')[0];
    
        setTotalXP(prev => prev + xpGain);
        updateStreak();
    
        const updatedSubjects = subjects.map(s =>
            s.id === subjectId ? { ...s, chapters: s.chapters.map(c =>
                c.id === chapterId ? { ...c, topics: c.topics.map(t => {
                    if (t.id === topicId) {
                        const newStudyRecord = { confidence, id: Date.now(), date: today };
                        const studies = [...t.studies, newStudyRecord];
                        const topicForSr = {...t, studies};
                        try {
                            const srData = enhancedSpacedRepetition.calculateNextReview(topicForSr, performance);
                            return { 
                                ...t, 
                                studies,
                                ...srData 
                            };
                        } catch (error) {
                            console.error('Error calculating spaced repetition:', error);
                            return { ...t, studies };
                        }
                    }
                    return t;
                })} : c
            )} : s
        );
        setSubjects(updatedSubjects);
    };

    const confirmDelete = (type: 'subject' | 'chapter', data: any, e: React.MouseEvent) => {
        e.stopPropagation();
        let message = '';
        
        if (type === 'subject') {
          const subject = data;
          const totalTopicsInSubject = subject.chapters?.reduce((sum: number, ch: Chapter) => sum + ch.topics.length, 0) || 0;
          message = `Xóa môn "${subject.name}"? Sẽ mất ${totalTopicsInSubject} câu hỏi trong ${subject.chapters?.length || 0} chương!`;
        } else if (type === 'chapter') {
          const { chapter } = data;
          message = `Xóa chương "${chapter.name}"? Sẽ mất ${chapter.topics.length} câu hỏi!`;
        }
        
        setDeleteConfirm({
          show: true,
          type,
          data,
          message
        });
    };
    
    const handleConfirmedDelete = () => {
        const { type, data } = deleteConfirm;
      
        if (type === 'subject') {
          const subjectId = data.id;
          const subjectName = data.name;
          setSubjects(subjects.filter(s => s.id !== subjectId));
          if (expandedSubject === subjectId) {
            setExpandedSubject(null);
            setSelectedChapter(null);
          }
           showToast(`✅ Đã xóa môn "${subjectName}"`, 'success');

        } else if (type === 'chapter') {
          const { subjectId, chapter } = data;
          const chapterId = chapter.id;
          const chapterName = chapter.name;

          const updatedSubjects = subjects.map(subject =>
            subject.id === subjectId
              ? {
                  ...subject,
                  chapters: subject.chapters.filter(ch => ch.id !== chapterId)
                }
              : subject
          );
          setSubjects(updatedSubjects);
      
          if (selectedChapter === chapterId) {
            setSelectedChapter(null);
          }
          setExpandedChapters(prev => {
            const newExpanded = { ...prev };
            delete newExpanded[chapterId];
            return newExpanded;
          });
          showToast(`✅ Đã xóa chương "${chapterName}"`, 'success');
        }
      
        setDeleteConfirm({ show: false, type: '', data: null, message: '' });
    };

    const getTopicsForReview = (subjectId: number, chapterId: number): Topic[] => {
        const subject = subjects.find(s => s.id === subjectId);
        const chapter = subject?.chapters.find(c => c.id === chapterId);
        if (!chapter) return [];

        const today = new Date().toISOString().split('T')[0];
        return chapter.topics.filter(topic => topic.dueDate && topic.dueDate <= today);
    };

    const startStudyMode = (subjectId: number, chapterId: number, mode = 'normal', e?: React.MouseEvent) => {
        e?.stopPropagation();
        const subject = subjects.find(s => s.id === subjectId);
        const chapter = subject?.chapters.find(c => c.id === chapterId);
        if (!chapter?.topics.length) return;

        let topicsToStudy;
        if (mode === 'review') {
            topicsToStudy = getTopicsForReview(subjectId, chapterId);
            if (topicsToStudy.length === 0) {
                showToast('🎉 Tuyệt vời! Không có câu hỏi nào cần ôn tập!', 'info');
                return;
            }
        } else {
            topicsToStudy = [...chapter.topics];
        }

        topicsToStudy = topicsToStudy.sort(() => Math.random() - 0.5);
        setStudyMode({ subjectId, chapterId, topics: topicsToStudy, mode });
        setCurrentCardIndex(0);
        setRevealed(false);
        setCardAnimationClass('card-enter');
        setShowKeyboardHint(true);
        setCardStep('recall');
        setStudySessionStats({ startTime: Date.now(), cards: [], duration: 0, cardCount: 0 });
        setSrAnnouncement(`Bắt đầu chế độ học cho chương ${chapter.name}.`);
    };

    const getDueTopics = (subject: Subject): Topic[] => {
        const today = new Date().toISOString().split('T')[0];
        return subject.chapters.flatMap(c => 
            c.topics.filter(t => t.dueDate && t.dueDate <= today)
        );
    };
    
    const getWeakestTopics = (subject: Subject, count = 20): Topic[] => {
        const allTopics = subject.chapters.flatMap(c => c.topics);
        return allTopics.sort((a, b) => 
            (a.stability || 4) - (b.stability || 4)
        ).slice(0, count);
    };

    const startEnhancedStudyMode = (subjectId: number, mode: 'spaced-repetition' | 'weakest-first') => {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return;
    
        let topicsToStudy: Topic[];
    
        switch (mode) {
            case 'spaced-repetition':
                topicsToStudy = getDueTopics(subject);
                break;
            case 'weakest-first':
                topicsToStudy = getWeakestTopics(subject);
                break;
            default:
                topicsToStudy = [];
        }
    
        if (topicsToStudy.length === 0) {
            showToast('Không có câu hỏi phù hợp cho chế độ học này!', 'info');
            return;
        }
    
        const topicsWithChapterId = subject.chapters.flatMap(c =>
            c.topics
                .filter(t => topicsToStudy.some(ts => ts.id === t.id))
                .map(t => ({
                    ...t,
                    chapterId: c.id,
                    chapterName: c.name
                }))
        );
    
        setStudyMode({
            subjectId: subject.id,
            topics: topicsWithChapterId.sort(() => Math.random() - 0.5),
            mode: 'enhanced',
            enhancedType: mode
        });
        setCurrentCardIndex(0);
        setRevealed(false);
        setCardAnimationClass('card-enter');
        setShowKeyboardHint(true);
        setCardStep('recall');
        setStudySessionStats({ startTime: Date.now(), cards: [], duration: 0, cardCount: 0 });
    };

    const handleStudyModeSelect = (subjectId: number, modeId: string) => {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return;

        switch (modeId) {
          case 'free-recall':
            setBlankPaperMode({ subject });
            break;
          case 'spaced-repetition':
            startEnhancedStudyMode(subjectId, 'spaced-repetition');
            break;
          case 'weakest-first':
            startEnhancedStudyMode(subjectId, 'weakest-first');
            break;
          case 'interleaved':
            startInterleavedStudy(subjectId);
            break;
          default:
            console.warn(`Unknown study mode: ${modeId}`);
        }
    };
    
    const startInterleavedStudy = (subjectId: number) => {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return;

        const allTopics = subject.chapters.flatMap(c => c.topics);
        if (allTopics.length === 0) {
            showToast('Môn học này chưa có câu hỏi nào.', 'warning');
            return;
        }

        const topicsWithChapterId = subject.chapters.flatMap(c =>
            c.topics.map(t => ({ ...t, chapterId: c.id, chapterName: c.name }))
        );

        setStudyMode({ subjectId, topics: topicsWithChapterId.sort(() => Math.random() - 0.5), mode: 'interleaved' });
        setCurrentCardIndex(0);
        setRevealed(false);
        setCardAnimationClass('card-enter');
        setShowKeyboardHint(true);
        setCardStep('recall');
        setStudySessionStats({ startTime: Date.now(), cards: [], duration: 0, cardCount: 0 });
    };

    const exitStudyMode = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (recallTimeoutRef.current) clearTimeout(recallTimeoutRef.current);
        if (autoHintTimerRef.current) clearTimeout(autoHintTimerRef.current);
        
        setStudyMode(null);
        setRevealed(false);
        setIsAwaitingNext(false);
        setSelectedConfidence(null);
        setHintState({ level: 0, text: '', show: false, isPulsing: false });
        setComboCount(0);
        setStudySessionStats(null);
    }, []);


    const goToNextCard = useCallback(() => {
        if (!studyMode) return;
        setSwipeState({ x: 0, y: 0, rotation: 0, feedback: '', moving: false });

        if (currentCardIndex < studyMode.topics.length - 1) {
            setCardAnimationClass('card-enter-next');
            setCurrentCardIndex(currentCardIndex + 1);
            setRevealed(false);
            setIsAwaitingNext(false);
            setSelectedConfidence(null);
            setHintState({ level: 0, text: '', show: false, isPulsing: false });
            setCardStep('recall');
            setSrAnnouncement(`Câu hỏi tiếp theo. ${studyMode.topics[currentCardIndex + 1].question}`);
        } else {
            exitStudyMode();
            showToast('🎊 Hoàn thành! Bạn đã học rất chăm chỉ!', 'success');
        }
    }, [studyMode, currentCardIndex, exitStudyMode, showToast]);
    
    const goToPreviousCard = useCallback(() => {
        if (!studyMode || currentCardIndex === 0) return;
        setCardAnimationClass('');
        setCurrentCardIndex(prev => prev - 1);
        setRevealed(false);
        setIsAwaitingNext(false);
        setSelectedConfidence(null);
        setHintState({ level: 0, text: '', show: false, isPulsing: false });
        setCardStep('recall');
         setSrAnnouncement(`Quay lại câu hỏi trước. ${studyMode.topics[currentCardIndex - 1].question}`);
    }, [studyMode, currentCardIndex]);

    const createConfetti = () => {
        const colors = ['#22c55e', '#16a34a', '#fde047', '#facc15'];
        const newPieces = Array.from({ length: 30 }).map(() => ({
          id: Math.random(),
          style: {
            left: `${40 + Math.random() * 20}%`,
            top: `${40 + Math.random() * 20}%`,
            transform: `rotate(${Math.random() * 360}deg)`,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            animationDelay: `${Math.random() * 0.2}s`,
          },
        }));
        setConfettiPieces(newPieces);
        setTimeout(() => setConfettiPieces([]), 2000);
      };

    const flipCard = useCallback(() => {
        if (isAwaitingNext || !studyMode) return;
        
        const currentTopic = studyMode.topics[currentCardIndex];
        const newRevealedState = !revealed;
        
        setRevealed(newRevealedState);
        
        if (newRevealedState) {
            setCardStep('assess');
            setSrAnnouncement(`Đáp án: ${currentTopic.answer}`);
        } else {
            setCardStep('front'); 
            setSrAnnouncement(`Câu hỏi: ${currentTopic.question}`);
        }
        
        setCardAnimationClass('flipping');
        setTimeout(() => setCardAnimationClass(''), 300);
    }, [revealed, isAwaitingNext, studyMode, currentCardIndex]);

    const handleConfidenceSelect = useCallback((confidence: string) => {
        if (isAwaitingNext || !studyMode) return;
        
        const isCorrect = confidence === 'green' || confidence === 'yellow';
        
        if(isCorrect) {
            setComboCount(prev => prev + 1);
            if (comboCount + 1 >= 2) {
                const bonus = (comboCount + 1) * 2;
                setComboBonus(bonus);
                setTotalXP(prev => prev + bonus);
            }
        } else {
            setComboCount(0);
        }

        if (confidence === 'green') {
            createConfetti();
        }

        setRevealed(true);
        setSelectedConfidence(confidence);
        setIsAwaitingNext(true);
        setCardStep('confidence');

        const { subjectId, topics } = studyMode;
        const topic = topics[currentCardIndex];
        const currentChapterId = studyMode.mode === 'interleaved' || studyMode.mode === 'enhanced' ? topic.chapterId! : studyMode.chapterId!;
        recordStudy(subjectId, currentChapterId, topic.id, confidence);
        setSrAnnouncement(`Đã chọn ${confidenceLevels.find(c => c.value === confidence)?.label}.`);

        if (studySessionStats) {
            const cardResponseTime = (Date.now() - (studySessionStats.startTime + studySessionStats.duration * 1000)) / 1000;
            const newCards = [...studySessionStats.cards, { confidence, responseTime: cardResponseTime }];

            if (newCards.length >= 5) {
                const last5Cards = newCards.slice(-5);
                const incorrectCount = last5Cards.filter(c => c.confidence === 'red' || c.confidence === 'orange').length;
                if (incorrectCount >= 4) {
                    setShowBurnoutIntervention(true);
                     addAIDecisionLog(
                        'Phát hiện Burnout',
                        `${incorrectCount}/5 câu trả lời gần nhất có độ tự tin thấp.`,
                        'Hiển thị gợi ý nghỉ ngơi.',
                        AlertTriangle
                    );
                }
            }

            setStudySessionStats(prev => prev ? {
                ...prev,
                cards: newCards,
                duration: (Date.now() - prev.startTime) / 1000
            } : null);
        }

        const exitClass = `card-exit-${confidence}`;
        setCardAnimationClass(exitClass);

        timeoutRef.current = window.setTimeout(() => {
            goToNextCard();
        }, 800);
    }, [isAwaitingNext, studyMode, comboCount, goToNextCard, studySessionStats, confidenceLevels]);


    const startPracticeTest = (subjectId: number, chapterId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const subject = subjects.find(s => s.id === subjectId);
        const chapter = subject?.chapters.find(c => c.id === chapterId);
        if (!chapter || chapter.topics.length === 0) {
            showToast('Chương này không có câu hỏi để kiểm tra.', 'warning');
            return;
        }
        setPracticeTestMode({ subjectId, chapterId, topics: [...chapter.topics].sort(() => Math.random() - 0.5) });
        setPracticeTestAnswers(Array(chapter.topics.length).fill(null));
        setCurrentCardIndex(0);
    };

    const handlePracticeTestAnswer = (confidence: string) => {
        const newAnswers = [...practiceTestAnswers];
        newAnswers[currentCardIndex] = confidence;
        setPracticeTestAnswers(newAnswers);

        if (currentCardIndex < practiceTestMode.topics.length - 1) {
            setCurrentCardIndex(currentCardIndex + 1);
        } else {
            const summary = {
                ...practiceTestMode,
                userAnswers: newAnswers
            }
            setPracticeTestSummary(summary);
            setPracticeTestMode(null);
            setPracticeTestAnswers([]);
        }
    };
    
    // Fill in the blanks logic
    const generateBlankQuestion = (topic: Topic) => {
        // Simple strategy: find a keyword from the question in the answer and blank it.
        const questionWords = topic.question.toLowerCase().replace(/[^a-z0-9\s]/gi, '').split(/\s+/);
        const answerWords = topic.answer.split(/\s+/);
        let blankedWord = null;
        let blankedAnswer = topic.answer;

        for (const word of questionWords) {
            if (word.length > 3) { // Avoid common short words
                const regex = new RegExp(`\\b(${word})\\b`, 'i');
                if (regex.test(topic.answer)) {
                    blankedWord = topic.answer.match(regex)?.[0];
                    if (blankedWord) {
                        blankedAnswer = topic.answer.replace(regex, '[___]');
                        break;
                    }
                }
            }
        }

        // Fallback: blank the last word if no keyword found
        if (!blankedWord && answerWords.length > 1) {
            blankedWord = answerWords.pop();
            blankedAnswer = answerWords.join(' ') + ' [___]';
        }

        return {
            ...topic,
            questionWithContext: topic.question,
            blankedAnswer: blankedAnswer,
            correctBlank: blankedWord || ''
        };
    };

    const startFillBlanksMode = (subjectId: number, chapterId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const subject = subjects.find(s => s.id === subjectId);
        const chapter = subject?.chapters.find(c => c.id === chapterId);
        if (!chapter?.topics || chapter.topics.length === 0) {
            showToast('Chương này không có câu hỏi để chơi.', 'warning');
            return;
        }

        const questions = chapter.topics
            .map(generateBlankQuestion)
            .filter(q => q.correctBlank.trim() !== '') // Ensure a blank was created
            .sort(() => 0.5 - Math.random())
            .slice(0, 10); // Max 10 questions per session

        if (questions.length === 0) {
            showToast('Không thể tạo câu hỏi điền vào chỗ trống.', 'warning');
            return;
        }

        setFillBlanksMode({
            subjectId,
            chapterId,
            questions,
            currentIndex: 0,
            score: 0,
        });
        setFillBlanksAnswer('');
        setFillBlanksStatus('idle');
    };

    const handleFillBlanksSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (fillBlanksStatus !== 'idle' || !fillBlanksMode) return;

        const currentQuestion = fillBlanksMode.questions[fillBlanksMode.currentIndex];
        const isCorrect = fillBlanksAnswer.trim().toLowerCase() === currentQuestion.correctBlank.toLowerCase();

        if (isCorrect) {
            setFillBlanksStatus('correct');
            setFillBlanksMode({ ...fillBlanksMode, score: fillBlanksMode.score + 1 });
            setTotalXP(xp => xp + 20); // Award XP
        } else {
            setFillBlanksStatus('incorrect');
        }

        setTimeout(() => {
            if (fillBlanksMode.currentIndex < fillBlanksMode.questions.length - 1) {
                setFillBlanksMode({ ...fillBlanksMode, currentIndex: fillBlanksMode.currentIndex + 1 });
                setFillBlanksAnswer('');
                setFillBlanksStatus('idle');
            } else {
                showToast(`Trò chơi kết thúc! Điểm: ${fillBlanksMode.score + (isCorrect ? 1 : 0)}/${fillBlanksMode.questions.length}`, 'info');
                exitFillBlanksMode();
            }
        }, 2000);
    };

    const exitFillBlanksMode = () => {
        setFillBlanksMode(null);
        setFillBlanksAnswer('');
        setFillBlanksStatus('idle');
    };


    const startPomodoro = () => {
        if (pomodoroTime === 0) {
             const duration = pomodoroSessionType === 'work' ? pomodoroWorkDuration : pomodoroBreakDuration;
             setPomodoroTime(duration * 60);
        }
        setIsPomodoroActive(true);
    };

    const pausePomodoro = () => {
        setIsPomodoroActive(false);
    };

    const resetPomodoro = () => {
        setIsPomodoroActive(false);
        setPomodoroSessionType('work');
        setPomodoroTime(pomodoroWorkDuration * 60);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Pomodoro Dragging Logic
    const handlePomodoroMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (pomodoroRef.current) {
            setIsPomodoroDragging(true);
            const rect = pomodoroRef.current.getBoundingClientRect();
            setPomodoroDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
        }
    };

    useEffect(() => {
        const handlePomodoroMouseMove = (e: MouseEvent) => {
            if (!isPomodoroDragging) return;
            setPomodoroPosition({
                x: e.clientX - pomodoroDragOffset.x,
                y: e.clientY - pomodoroDragOffset.y,
            });
        };

        const handlePomodoroMouseUp = () => {
            setIsPomodoroDragging(false);
        };

        if (isPomodoroDragging) {
            window.addEventListener('mousemove', handlePomodoroMouseMove);
            window.addEventListener('mouseup', handlePomodoroMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handlePomodoroMouseMove);
            window.removeEventListener('mouseup', handlePomodoroMouseUp);
        };
    }, [isPomodoroDragging, pomodoroDragOffset]);

    // Chatbot functions
    const sendMessageToAI = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!userMessage.trim()) return;

        const newUserMessage: ChatMessage = {
            id: Date.now(),
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        };

        const currentMessages = [...chatMessages, newUserMessage];
        setChatMessages(currentMessages);
        setUserMessage('');
        setIsChatLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const userContext = `
# SYSTEM INSTRUCTIONS: SOCRATIC TUTOR AI

## 🎯 YOUR ROLE
You are an expert Socratic tutor and learning scientist. Your goal is NOT to give answers, but to guide the user to discover the answers themselves through critical thinking. You must be encouraging, patient, and curious.

## 📝 CORE PRINCIPLES
1.  **NEVER Give Direct Answers:** When asked a question, respond with a clarifying or guiding question.
2.  **Probe for Understanding:** Always ask "Why do you think that?" or "Can you explain your reasoning?" to uncover the user's thought process.
3.  **Use Analogies & Examples:** If the user is stuck, provide a simple analogy or a concrete example to reframe the problem.
4.  **Embrace "I Don't Know":** If the user says they don't know, praise their honesty and break the problem down into a smaller, more manageable first step.
5.  **Identify Misconceptions:** Gently challenge incorrect assumptions. Instead of saying "You're wrong," say "That's an interesting way to look at it. What if we considered this factor...?"
6.  **Praise the Process, Not Just the Answer:** Compliment their thinking, e.g., "I like how you connected those two ideas," or "That's a great question to ask."

## 💬 CONVERSATION FLOW
- **If User Asks a Factual Question (e.g., "What is photosynthesis?"):**
  - **DON'T:** Define photosynthesis.
  - **DO:** Ask a leading question. "Great question! Let's start with the basics. What do you think plants need to live, just like humans need food?"
- **If User Gives a Correct Answer:**
  - **DON'T:** Say "Correct!" and move on.
  - **DO:** Deepen their understanding. "Exactly! Now, can you explain *why* that happens? What's the mechanism behind it?" or "Excellent. Can you think of a real-world example of that?"
- **If User Gives an Incorrect Answer:**
  - **DON'T:** Say "That's wrong. The correct answer is..."
  - **DO:** Find the logical flaw and probe it. "I see your logic. You connected X and Y. But what about Z? How does that fit into your explanation?"

## 📚 CURRENT LEARNING CONTEXT
- **Subjects:** ${subjects.map(s => s.name).join(', ') || 'None yet'}
- **Current Level:** ${level}, XP: ${totalXP}, Streak: ${currentStreak} days
- **Recent Chat History:**
${currentMessages.slice(-5).map(m => `${m.role === 'user' ? 'USER' : 'AI'}: ${m.content}`).join('\n')}

---
**USER'S LATEST MESSAGE:**
${userMessage}
`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: userContext,
            });

            const aiResponse = response.text;

            const newAIMessage: ChatMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date()
            };
            setChatMessages(prev => [...prev, newAIMessage]);
        } catch (e) {
            console.error('Chatbot Error:', e);
            const errorMessage: ChatMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: 'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.',
                timestamp: new Date()
            };
            setChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsChatLoading(false);
        }
    };
    
    const quickQuestions = [
        "Làm sao để học thuộc nhanh hơn?",
        "Cách ghi nhớ kiến thức lâu hơn?",
        "Phương pháp Cornell Notes là gì?",
        "Tôi nên ôn tập như thế nào?",
        "Cách tạo câu hỏi hiệu quả từ ghi chú?"
    ];
    
    const handleQuickQuestion = (question: string) => {
        setUserMessage(question);
    };

    const difficultyOptions = [
        { id: 'mixed', label: 'Tổng hợp' },
        { id: 'easy', label: 'Dễ' },
        { id: 'medium', label: 'Trung bình' },
        { id: 'hard', label: 'Khó' }
    ];

    const getDifficultyClass = (difficulty?: string | number) => {
        switch (difficulty) {
            case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200';
        }
    };

    const getTypeClass = (type?: string) => {
        switch (type) {
            case 'concept': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case 'application': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
            case 'analysis': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300';
            case 'evaluation': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200';
        }
    };
    
    const getTypeText = (type?: string) => {
        switch (type) {
            case 'concept': return 'Khái niệm';
            case 'application': return 'Ứng dụng';
            case 'analysis': return 'Phân tích';
            case 'evaluation': return 'Đánh giá';
            default: return type || 'N/A';
        }
    }

    const filterOptions = [
        { id: 'all', label: 'Tất cả' },
        { id: 'easy', label: 'Dễ' },
        { id: 'medium', label: 'Trung bình' },
        { id: 'hard', label: 'Khó' },
        { id: 'none', label: 'Chưa phân loại' },
    ];

    const typeFilterOptions = [
        { id: 'all', label: 'Tất cả các loại' },
        { id: 'concept', label: 'Khái niệm' },
        { id: 'application', label: 'Ứng dụng' },
        { id: 'analysis', label: 'Phân tích' },
        { id: 'evaluation', label: 'Đánh giá' },
    ];

    // Quiz Handlers
    const handleCreateQuiz = (config: QuizConfig) => {
        if (!quizEngine) {
            showToast('Quiz engine chưa sẵn sàng', 'error');
            return;
        }
        try {
            const session = quizEngine.createQuiz(config);
            setQuizSession(session);
            setQuizConfigurator(false);
            setQuizResult(null);
        } catch (error) {
            console.error('Error creating quiz:', error);
            showToast('Có lỗi xảy ra khi tạo quiz. Vui lòng thử lại.', 'error');
        }
    };

    const handleQuizAnswer = (questionId: string, answer: string, timeSpent: number) => {
        if (!quizSession || !quizEngine) return;

        try {
            quizEngine.submitAnswer(quizSession.id, questionId, answer, timeSpent);
            
            const updatedEngineSession = quizEngine.getSession(quizSession.id);
            if (!updatedEngineSession) return;

            if (updatedEngineSession.currentQuestionIndex < updatedEngineSession.questions.length - 1) {
                const nextSessionState = {
                    ...updatedEngineSession,
                    currentQuestionIndex: updatedEngineSession.currentQuestionIndex + 1
                };
                setQuizSession(nextSessionState);
            } else {
                handleCompleteQuiz();
            }
        } catch (error) {
            console.error('Error submitting answer:', error);
        }
    };

    const handleCompleteQuiz = () => {
        if (!quizSession || !quizEngine) return;
        try {
            const result = quizEngine.completeQuiz(quizSession.id);
            setQuizResult(result);
            setQuizSession(null);
            
            setTotalXP(prev => prev + Math.floor(result.totalScore / 2));
            updateStreak();
            checkAndAwardBadges({ type: 'quiz', score: result.accuracy / 100 });
        } catch (error) {
            console.error('Error completing quiz:', error);
        }
    };

    const performBiasCheck = async () => {
        setIsCheckingBias(true);
        setBiasCheckResult(null);
        try {
            const allTopics = subjects.flatMap(s => s.chapters.flatMap(c => c.topics)).filter(t => t.isAI);
            if (allTopics.length < 10) {
                setBiasCheckResult("Không đủ câu hỏi do AI tạo ra (cần ít nhất 10) để thực hiện kiểm tra thiên vị có ý nghĩa.");
                return;
            }

            const sample = allTopics.sort(() => 0.5 - Math.random()).slice(0, 20);
            const questionsText = sample.map((t, i) => `${i + 1}. ${t.question}`).join('\n');

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `Bạn là một chuyên gia về đạo đức AI. Hãy phân tích danh sách câu hỏi sau đây để tìm kiếm các dấu hiệu thiên vị (bias) tiềm ẩn, bao gồm thiên vị về giới tính, văn hóa, hoặc các định kiến tiêu cực khác.
            
            DANH SÁCH CÂU HỎI:
            ${questionsText}
            
            Hãy đưa ra một bản tóm tắt ngắn gọn về kết quả phân tích của bạn. Nếu không tìm thấy vấn đề gì đáng kể, hãy nêu rõ điều đó.`;

            const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
            setBiasCheckResult(response.text);

        } catch (e) {
            setBiasCheckResult("Đã xảy ra lỗi khi thực hiện kiểm tra thiên vị.");
        } finally {
            setIsCheckingBias(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
          if (!studyMode) return;
          
          switch(e.code) {
            case 'Space':
              e.preventDefault();
              if (!revealed) {
                flipCard();
              }
              break;
            case 'Escape':
              exitStudyMode();
              break;
            case 'ArrowLeft':
              if (currentCardIndex > 0) goToPreviousCard();
              break;
            case 'ArrowRight':
              if (revealed) goToNextCard();
              break;
            case 'Digit1':
              if (revealed) handleConfidenceSelect('red');
              break;
            case 'Digit2':
              if (revealed) handleConfidenceSelect('orange');
              break;
            case 'Digit3':
              if (revealed) handleConfidenceSelect('yellow');
              break;
            case 'Digit4':
              if (revealed) handleConfidenceSelect('green');
              break;
            case 'KeyH':
              e.preventDefault();
              if (!revealed) {
                const hintButton = document.querySelector('[title="Gợi ý"]');
                if (hintButton) (hintButton as HTMLElement).click();
              }
              break;
            case 'KeyR':
              e.preventDefault();
              const resetButton = document.querySelector('[title="Đặt lại"]');
              if (resetButton) (resetButton as HTMLElement).click();
              break;
          }
        };
      
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [studyMode, revealed, currentCardIndex, flipCard, exitStudyMode, goToPreviousCard, goToNextCard, handleConfidenceSelect]);


    // RENDER LOGIC
    if (quizSession) {
        return (
            <EnhancedQuizSession
                session={quizSession}
                onAnswer={handleQuizAnswer}
                onComplete={handleCompleteQuiz}
                onExit={() => setQuizSession(null)}
                darkMode={darkMode}
            />
        );
    }

    if (quizResult) {
        return (
            <AdvancedQuizResults
                result={quizResult}
                onRetry={() => {
                    if (!quizEngine) return;
                    try {
                        const newSession = quizEngine.createQuiz(quizResult.session.config);
                        setQuizSession(newSession);
                        setQuizResult(null);
                    } catch (error) {
                        console.error('Error retrying quiz:', error);
                    }
                }}
                onReview={() => {
                    setQuizResult(null);
                    alert('Chức năng xem lại chi tiết đang được phát triển');
                }}
                onNewQuiz={() => {
                    setQuizConfigurator(true);
                    setQuizResult(null);
                }}
                darkMode={darkMode}
            />
        );
    }


    if (fillBlanksMode) {
        const currentQuestion = fillBlanksMode.questions[fillBlanksMode.currentIndex];
        const progress = ((fillBlanksMode.currentIndex + 1) / fillBlanksMode.questions.length) * 100;
        
        let inputBorderColor = 'border-gray-300 focus:border-indigo-500 dark:border-gray-600';
        if (fillBlanksStatus === 'correct') {
            inputBorderColor = 'border-green-500 ring-2 ring-green-300';
        } else if (fillBlanksStatus === 'incorrect') {
            inputBorderColor = 'border-red-500 ring-2 ring-red-300';
        }

        return (
            <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800'} p-6 flex items-center justify-center`}>
                <div className="w-full max-w-2xl">
                    <div className={`mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow-lg`}>
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-2xl font-bold">Điền vào chỗ trống</h2>
                            <button onClick={exitFillBlanksMode} className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-red-600 hover:text-red-800'}`}>
                                <X size={28} />
                            </button>
                        </div>
                         <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                            <div className="bg-green-600 h-full rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500">
                           <span>Câu {fillBlanksMode.currentIndex + 1} / {fillBlanksMode.questions.length}</span>
                           <span>Điểm: {fillBlanksMode.score}</span>
                        </div>
                    </div>

                    <div className={`p-8 rounded-2xl shadow-xl min-h-[16rem] flex flex-col justify-center text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <p className="text-sm uppercase text-gray-500 mb-2">Gợi ý:</p>
                        <p className="text-lg font-semibold mb-6">{currentQuestion.questionWithContext}</p>
                        <p className="text-2xl">
                          {currentQuestion.blankedAnswer.split('[___]').map((part: string, index: number, array: string[]) => (
                            <React.Fragment key={index}>
                              {part}
                              {index < array.length - 1 && (
                                <span className="font-bold text-indigo-500">[___]</span>
                              )}
                            </React.Fragment>
                          ))}
                        </p>
                    </div>
                    
                    <form onSubmit={handleFillBlanksSubmit} className="mt-8">
                         <input
                            type="text"
                            value={fillBlanksAnswer}
                            onChange={(e) => setFillBlanksAnswer(e.target.value)}
                            placeholder="Nhập câu trả lời..."
                            disabled={fillBlanksStatus !== 'idle'}
                            className={`w-full text-center text-xl p-4 border-2 rounded-lg focus:outline-none transition-all ${inputBorderColor} ${darkMode ? 'bg-gray-700' : ''}`}
                        />
                        {fillBlanksStatus === 'incorrect' && (
                            <p className="text-center mt-3 text-red-500">
                                Đáp án đúng là: <strong className="font-bold">{currentQuestion.correctBlank}</strong>
                            </p>
                        )}
                         {fillBlanksStatus === 'correct' && (
                            <p className="text-center mt-3 text-green-500 font-bold">
                                Chính xác! +20 XP
                            </p>
                        )}
                        <button type="submit" disabled={fillBlanksStatus !== 'idle'} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-bold text-lg transition">
                            Kiểm tra
                        </button>
                    </form>
                </div>
            </div>
        );
    }
    
    if (studyMode) {
        const currentTopic = studyMode.topics[currentCardIndex];
        
        return (
          <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800'} p-4 flex items-center justify-center relative`}>
            
            {/* Burnout Intervention Modal */}
            {showBurnoutIntervention && (
              <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-md w-full p-8 shadow-2xl text-center`}>
                  <div className="text-5xl mb-4">🧠</div>
                  <h3 className="text-2xl font-bold mb-2">Có vẻ bạn đang hơi mệt!</h3>
                  <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
                    Nghỉ ngơi một chút sẽ giúp não bộ củng cố kiến thức tốt hơn. Bạn có muốn tạm dừng buổi học này không?
                  </p>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setShowBurnoutIntervention(false)} 
                      className={`flex-1 py-3 rounded-lg font-semibold transition ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                    >
                      Học tiếp
                    </button>
                    <button 
                      onClick={() => { setShowBurnoutIntervention(false); exitStudyMode(); }} 
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold transition"
                    >
                      Nghỉ ngơi
                    </button>
                  </div>
                </div>
              </div>
            )}
      
            {/* Combo System */}
            <div className={`combo-system fixed top-4 left-4 z-10 ${comboCount >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'} transition-all duration-300`}>
              <div className="combo-display bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg">
                <span className="text-xl">🔥</span>
                <span>x{comboCount}</span>
              </div>
              {comboBonus > 0 && (
                <div className="combo-multiplier absolute -top-8 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-2 py-1 rounded text-sm font-bold animate-bounce">
                  +{comboBonus} XP
                </div>
              )}
            </div>
      
            {/* Modern Flashcard Component */}
            <ModernFlashcard
              question={currentTopic.question}
              answer={currentTopic.answer}
              revealed={revealed}
              onReveal={flipCard}
              onNext={goToNextCard}
              onPrevious={goToPreviousCard}
              onExit={exitStudyMode}
              currentIndex={currentCardIndex}
              totalCards={studyMode.topics.length}
              darkMode={darkMode}
              onConfidenceSelect={handleConfidenceSelect}
              isAI={currentTopic.isAI}
              difficulty={currentTopic.difficulty as string}
              type={currentTopic.type as string}
            />
          </div>
        );
    }

    if (practiceTestMode) {
        const currentTopic = practiceTestMode.topics[currentCardIndex];
        const subject = subjects.find(s => s.id === practiceTestMode.subjectId);
        const chapter = subject?.chapters.find(c => c.id === practiceTestMode.chapterId);
        const progress = ((currentCardIndex + 1) / practiceTestMode.topics.length) * 100;

        return (
            <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800'} p-6 flex items-center justify-center`}>
                <div className="w-full max-w-3xl">
                    <div className={`mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow-lg`}>
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-2xl font-bold">{subject?.name} - {chapter?.name}</h2>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-1 rounded text-sm bg-red-500 text-white">📝 Kiểm Tra</span>
                                <button onClick={() => setPracticeTestMode(null)} className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-red-600 hover:text-red-800'}`}>
                                    <X size={28} />
                                </button>
                            </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div className="bg-red-600 h-full rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Câu {currentCardIndex + 1} / {practiceTestMode.topics.length}</p>
                    </div>
                    <div className={`mb-8 p-12 rounded-2xl shadow-2xl min-h-[24rem] flex items-center justify-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <div className="text-center w-full px-6">
                            <p className="text-sm uppercase text-gray-500 mb-6">Câu Hỏi</p>
                            <p className="text-3xl font-bold">{currentTopic.question}</p>
                            {currentTopic.isAI && <p className="mt-4 text-sm text-gray-500">🤖 Được tạo bởi AI</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {confidenceLevels.map((level) => (
                            <button key={level.value} onClick={() => handlePracticeTestAnswer(level.value)} className={`px-6 py-4 rounded-lg font-bold text-lg transition confidence-btn ${level.className}`}>
                                {level.emoji} {level.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (practiceTestSummary) {
        const subject = subjects.find(s => s.id === practiceTestSummary.subjectId);
        const chapter = subject?.chapters.find(c => c.id === practiceTestSummary.chapterId);

        return (
            <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800'} p-6`}>
                <div className={`w-full max-w-4xl mx-auto ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-8`}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold">Kết Quả Kiểm Tra: {chapter?.name}</h2>
                        <button onClick={() => setPracticeTestSummary(null)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">
                            Hoàn thành
                        </button>
                    </div>
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                        {practiceTestSummary.topics.map((topic: Topic, index: number) => {
                            const userAnswer = practiceTestSummary.userAnswers[index];
                            const confidence = confidenceLevels.find(c => c.value === userAnswer);
                            return (
                                <div key={topic.id} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                    <p className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{index + 1}. {topic.question}</p>
                                    <p className={`mt-2 p-2 rounded ${darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`}>
                                        <strong>Đáp án:</strong> {topic.answer}
                                    </p>
                                    <p className={`mt-2 text-sm p-2 rounded inline-block ${confidence?.className}`}>
                                        <strong>Bạn đã chọn:</strong> {confidence?.emoji} {confidence?.label}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800'} pb-24`}>
            {quizConfigurator && (
                <QuizConfigurator
                    subjects={subjects}
                    onCreateQuiz={handleCreateQuiz}
                    onClose={() => setQuizConfigurator(false)}
                    darkMode={darkMode}
                />
            )}
            {openEndedMode && (
                <OpenEndedMode
                    subject={openEndedMode.subject}
                    chapter={openEndedMode.chapter}
                    onClose={() => setOpenEndedMode(null)}
                    darkMode={darkMode}
                />
            )}
            
            {blankPaperMode && (
                <BlankPaperMode
                    subject={blankPaperMode.subject}
                    onClose={() => setBlankPaperMode(null)}
                    darkMode={darkMode}
                />
            )}

            {showCalendarView && (
                <CalendarView
                    subjects={subjects}
                    darkMode={darkMode}
                    onClose={() => setShowCalendarView(false)}
                    getWeakestTopics={getWeakestTopics}
                />
            )}

            {showABTesting && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto p-8`}>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold">🔬 A/B Testing Dashboard</h2>
                    <button onClick={() => setShowABTesting(false)} className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                      <X size={28} />
                    </button>
                  </div>
                  <ABTestingDashboard 
                    enhancedSpacedRepetition={enhancedSpacedRepetition}
                    aiPromptVersions={aiPromptVersions}
                    darkMode={darkMode}
                  />
                </div>
              </div>
            )}
             
            {showPromptManager && (
                <AIPromptManager
                    prompts={aiPromptVersions}
                    setPrompts={setAiPromptVersions}
                    onClose={() => setShowPromptManager(false)}
                    darkMode={darkMode}
                />
            )}
            
            {deleteConfirm.show && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-2xl max-w-md w-full p-6 shadow-2xl`}>
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                        <Trash2 className="text-red-600 dark:text-red-400" size={24} />
                        </div>
                        <div>
                        <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Xác nhận xóa</h3>
                        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Hành động này không thể hoàn tác.</p>
                        </div>
                    </div>
                    
                    <p className={`my-6 text-center p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>{deleteConfirm.message}</p>
                    
                    <div className="flex gap-3">
                        <button
                        onClick={() => setDeleteConfirm({ show: false, type: '', data: null, message: '' })}
                        className={`flex-1 py-2.5 rounded-lg font-semibold transition ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                        >
                        Hủy
                        </button>
                        <button
                        onClick={handleConfirmedDelete}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg font-semibold transition"
                        >
                        Xóa
                        </button>
                    </div>
                    </div>
                </div>
            )}
            
             {/* Badge Notifications */}
            {badgeNotifications.map((badge, index) => (
                <div 
                    key={badge.id} 
                    className="fixed right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-lg shadow-2xl z-50 flex items-center gap-4 animate-slide-in"
                    style={{ bottom: `${(index * 5) + 6}rem` }} // 6rem base + 5rem spacing
                >
                    <div className="bg-white p-2 rounded-full">
                        <badge.icon size={24} className="text-orange-500" />
                    </div>
                    <div>
                        <h4 className="font-bold">Huy hiệu mới!</h4>
                        <p className="text-sm">{badge.name}</p>
                    </div>
                    <button 
                        onClick={() => setBadgeNotifications(prev => prev.filter(b => b.id !== badge.id))} 
                        className="absolute top-1 right-1 text-white opacity-70 hover:opacity-100"
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
            
            {/* AI Chatbot Floating Button */}
            {!showAIChatbot && (
                <button
                onClick={() => setShowAIChatbot(true)}
                className="fixed bottom-24 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-full shadow-2xl z-40 hover:scale-110 transition-transform duration-300 group"
                title="Trợ lý AI học tập"
                >
                <Sparkles size={24} />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold animate-pulse">
                    AI
                </div>
                </button>
            )}

            {/* AI Chatbot Modal */}
            {showAIChatbot && (
                <div className={`fixed bottom-4 right-4 w-96 h-[500px] ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-800'} border rounded-2xl shadow-2xl z-50 flex flex-col`}>
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-t-2xl flex justify-between items-center">
                    <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <Sparkles size={16} className="text-purple-500" />
                    </div>
                    <div>
                        <h3 className="font-bold">AI Learning Coach</h3>
                        <p className="text-xs opacity-80">Hỏi đáp thông minh</p>
                    </div>
                    </div>
                    <button 
                    onClick={() => setShowAIChatbot(false)}
                    className="text-white hover:text-gray-200 transition-colors"
                    >
                    <X size={18} />
                    </button>
                </div>

                {/* Messages */}
                <div className={`flex-1 p-3 overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                    {chatMessages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`mb-3 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
                    >
                        <div
                        className={`inline-block max-w-[80%] p-3 rounded-2xl ${
                            msg.role === 'user'
                            ? 'bg-blue-500 text-white rounded-br-none'
                            : `${darkMode ? 'bg-gray-700' : 'bg-white border border-gray-200'} rounded-bl-none shadow-sm`
                        }`}
                        >
                        <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                        <div className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                            })}
                        </div>
                        </div>
                    </div>
                    ))}
                    {isChatLoading && (
                    <div className="text-left mb-3">
                        <div className={`inline-block max-w-[80%] p-3 rounded-2xl ${darkMode ? 'bg-gray-700' : 'bg-white'} border ${darkMode ? 'border-gray-600': 'border-gray-200'} rounded-bl-none shadow-sm`}>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                            Đang suy nghĩ...
                        </div>
                        </div>
                    </div>
                    )}
                </div>

                {/* Quick Questions */}
                {chatMessages.length === 1 && (
                    <div className={`px-3 pb-2 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                    <div className="text-xs text-gray-500 mb-2">Câu hỏi nhanh:</div>
                    <div className="flex flex-wrap gap-1">
                        {quickQuestions.map((question, index) => (
                        <button
                            key={index}
                            onClick={() => handleQuickQuestion(question)}
                            className={`text-xs ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} px-2 py-1 rounded-full transition-colors`}
                        >
                            {question}
                        </button>
                        ))}
                    </div>
                    </div>
                )}

                {/* Input */}
                <form onSubmit={sendMessageToAI} className={`p-3 border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200'}`}>
                    <div className="flex gap-2">
                    <input
                        type="text"
                        value={userMessage}
                        onChange={(e) => setUserMessage(e.target.value)}
                        placeholder="Nhập câu hỏi của bạn..."
                        className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'border-gray-300'}`}
                        disabled={isChatLoading}
                    />
                    <button
                        type="submit"
                        disabled={isChatLoading || !userMessage.trim()}
                        className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                        Gửi
                    </button>
                    </div>
                </form>
                </div>
            )}
            
            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-2xl w-full p-8`}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-3xl font-bold">⚙️ Cài Đặt</h2>
                            <button onClick={() => setShowSettings(false)} className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                                <X size={28} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold">🔊 Âm thanh</p>
                                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Bật/tắt âm thanh thông báo</p>
                                </div>
                                <button onClick={() => setIsAudioOn(!isAudioOn)} className={`p-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                    {isAudioOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold">{darkMode ? '🌙' : '☀️'} Chế độ tối</p>
                                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Chuyển đổi giao diện sáng/tối</p>
                                </div>
                                <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                                </button>
                            </div>
                             <div className="border-t pt-6 mt-6 border-gray-200 dark:border-gray-700">
                                <h3 className="font-bold mb-4 text-lg">⏰ Cài đặt Pomodoro</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Thời gian làm việc (phút)</label>
                                        <input
                                            type="number"
                                            value={pomodoroWorkDuration}
                                            onChange={(e) => setPomodoroWorkDuration(Math.max(1, parseInt(e.target.value) || 1))}
                                            className={getInputClasses()}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Thời gian nghỉ (phút)</label>
                                        <input
                                            type="number"
                                            value={pomodoroBreakDuration}
                                            onChange={(e) => setPomodoroBreakDuration(Math.max(1, parseInt(e.target.value) || 1))}
                                            className={getInputClasses()}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="border-t pt-6 mt-6 border-gray-200 dark:border-gray-700">
                                <h3 className="font-bold mb-4 text-lg">🛡️ Đạo đức & An toàn AI</h3>
                                <button onClick={performBiasCheck} disabled={isCheckingBias} className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2">
                                    {isCheckingBias ? <><RefreshCw size={16} className="animate-spin" /> Đang kiểm tra...</> : <><ShieldCheck size={16} /> Kiểm tra Thiên vị AI</>}
                                </button>
                                {biasCheckResult && (
                                    <div className={`mt-4 p-3 rounded-lg text-sm ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                        <h4 className="font-semibold mb-2">Kết quả kiểm tra:</h4>
                                        <p className="whitespace-pre-wrap">{biasCheckResult}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Pomodoro Timer */}
            <div
                ref={pomodoroRef}
                className={`fixed z-40 transition-all ${pomodoroPosition ? '' : 'bottom-4 right-4'}`}
                style={pomodoroPosition ? { left: `${pomodoroPosition.x}px`, top: `${pomodoroPosition.y}px` } : {}}
            >
                {isPomodoroMinimized ? (
                    <button 
                        onClick={() => setIsPomodoroMinimized(false)}
                        className={`flex items-center gap-2 p-2 rounded-full shadow-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} border-2 ${
                            isPomodoroActive 
                                ? (pomodoroSessionType === 'work' ? (darkMode ? 'border-red-500' : 'border-red-400') : (darkMode ? 'border-blue-500' : 'border-blue-400'))
                                : (darkMode ? 'border-gray-600' : 'border-gray-300')
                        }`}
                    >
                        <Clock size={20} className={isPomodoroActive ? 'animate-pulse' : ''} />
                        <span className="font-mono text-sm">{formatTime(pomodoroTime)}</span>
                        <ChevronUp size={16} />
                    </button>
                ) : (
                    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg w-56 border-2 ${
                        isPomodoroActive 
                            ? (pomodoroSessionType === 'work' ? (darkMode ? 'border-red-500' : 'border-red-400') : (darkMode ? 'border-blue-500' : 'border-blue-400'))
                            : (darkMode ? 'border-gray-600' : 'border-gray-300')
                    }`}>
                        <div
                            onMouseDown={handlePomodoroMouseDown}
                            className={`flex justify-between items-center p-2 cursor-move ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-t-md`}
                        >
                            <p className="font-bold text-sm select-none">⏰ Pomodoro ({pomodoroSessionType === 'work' ? 'Work' : 'Break'})</p>
                            <button onClick={() => setIsPomodoroMinimized(true)} className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}>
                                <ChevronDown size={16} />
                            </button>
                        </div>
                        <div className="p-4 text-center">
                            <p className="text-4xl font-mono mb-3">{formatTime(pomodoroTime)}</p>
                            <div className="flex gap-2 justify-center">
                                {!isPomodoroActive ? (
                                    <button onClick={startPomodoro} className="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded text-sm font-semibold">
                                        Bắt đầu
                                    </button>
                                ) : (
                                    <button onClick={pausePomodoro} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-1 rounded text-sm font-semibold">
                                        Tạm dừng
                                    </button>
                                )}
                                <button onClick={resetPomodoro} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-1 rounded text-sm">
                                    Đặt lại
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Modal */}
            {showStats && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto`}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-3xl font-bold">📊 Thống Kê</h2>
                            <button onClick={() => setShowStats(false)} className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                                <X size={28} />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className={`${darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} p-4 rounded-lg`}>
                                <p className={`${darkMode ? 'text-indigo-300' : 'text-gray-600'} text-sm`}>Tổng câu hỏi</p>
                                <p className={`text-3xl font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>{totalTopics}</p>
                            </div>
                            <div className={`${darkMode ? 'bg-green-900' : 'bg-green-100'} p-4 rounded-lg`}>
                                <p className={`${darkMode ? 'text-green-300' : 'text-gray-600'} text-sm`}>Level</p>
                                <p className={`text-3xl font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>{level}</p>
                            </div>
                            <div className={`${darkMode ? 'bg-yellow-900' : 'bg-yellow-100'} p-4 rounded-lg`}>
                                <p className={`${darkMode ? 'text-yellow-300' : 'text-gray-600'} text-sm`}>XP</p>
                                <p className={`text-3xl font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>{totalXP}</p>
                            </div>
                            <div className={`${darkMode ? 'bg-red-900' : 'bg-red-100'} p-4 rounded-lg`}>
                                <p className={`${darkMode ? 'text-red-300' : 'text-gray-600'} text-sm`}>Streak</p>
                                <p className={`text-3xl font-bold ${darkMode ? 'text-red-400' : 'text-red-700'}`}>{currentStreak} 🔥</p>
                            </div>
                        </div>
                        <div className="mb-6">
                             <h3 className="text-xl font-bold mb-4">🏆 Huy hiệu</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {ALL_BADGES.map(badgeInfo => {
                                    const badge = badges[badgeInfo.id];
                                    const isUnlocked = badge?.unlocked;
                                    const Icon = badgeInfo.icon;
                                    return (
                                        <div key={badgeInfo.id} title={isUnlocked ? `${badgeInfo.name} - Mở khóa ngày ${new Date(badge.date + 'T00:00:00').toLocaleDateString('vi-VN')}` : `${badgeInfo.name} - Chưa mở khóa`} className={`p-4 rounded-lg text-center transition ${isUnlocked ? (darkMode ? 'bg-yellow-900/50' : 'bg-yellow-100') : (darkMode ? 'bg-gray-700' : 'bg-gray-100')}`}>
                                            <Icon size={32} className={`mx-auto mb-2 ${isUnlocked ? 'text-yellow-500' : 'text-gray-400'}`} />
                                            <p className={`font-bold text-sm ${isUnlocked ? '' : 'opacity-50'}`}>{badgeInfo.name}</p>
                                            <p className={`text-xs mt-1 ${isUnlocked ? (darkMode ? 'text-gray-400' : 'text-gray-600') : 'opacity-50'}`}>{badgeInfo.description}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        <LeitnerBoxVisualization subjects={subjects} darkMode={darkMode} />
                        
                        <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <h4 className="font-bold mb-3">So sánh với cộng đồng (ẩn danh)</h4>
                            <div className="space-y-3">
                                <div className="community-benchmark-item">
                                    <span className="text-sm font-medium">Tốc độ học</span>
                                    <div className="benchmark-progress-bar">
                                        <div className="benchmark-progress-fill" style={{ width: '65%' }}></div>
                                        <div className="benchmark-compare-marker" style={{ left: '50%' }} title="Trung bình cộng đồng"></div>
                                    </div>
                                    <span className="text-sm font-bold text-green-500">Nhanh hơn 15%</span>
                                </div>
                                <div className="community-benchmark-item">
                                    <span className="text-sm font-medium">Độ khó ưa thích</span>
                                    <div className="flex-1 text-center">
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Khó</span>
                                    </div>
                                    <span className="text-sm font-bold text-blue-500">Top 20%</span>
                                </div>
                            </div>
                        </div>

                          <div className={`leaderboard-section ${darkMode ? 'dark' : ''}`}>
                            <h3 className="text-xl font-bold mb-4">🏆 Bảng xếp hạng tuần</h3>
                            <div className="space-y-2">
                                {mockLeaderboard.map(item => (
                                    <div key={item.rank} className="leaderboard-item">
                                        <div className="leaderboard-rank">{item.rank}</div>
                                        <div className="leaderboard-user">
                                            <div className="leaderboard-avatar">{item.avatar}</div>
                                            <div>
                                                <div className="leaderboard-username">{item.username}</div>
                                                <div className="leaderboard-xp">{item.xp.toLocaleString()} XP</div>
                                            </div>
                                        </div>
                                        <div className="leaderboard-badges">
                                            {item.badges.map((badge, i) => <span key={i} className="leaderboard-badge">{badge}</span>)}
                                        </div>
                                    </div>
                                ))}
                                <div className="leaderboard-item you">
                                    <div className="leaderboard-rank">--</div>
                                    <div className="leaderboard-user">
                                        <div className="leaderboard-avatar">👤</div>
                                        <div>
                                            <div className="leaderboard-username">Bạn</div>
                                            <div className="leaderboard-xp">{totalXP.toLocaleString()} XP</div>
                                        </div>
                                    </div>
                                    <div className="leaderboard-badges">
                                        <span className="leaderboard-badge">🔥 {currentStreak}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Technique Guide Modal */}
            {showTechnique && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className={`${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-800'} rounded-2xl max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto`}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-3xl font-bold">📖 Phương Pháp Học Tập Hiệu Quả</h2>
                            <button onClick={() => setShowTechnique(false)} className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                                <X size={28} />
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div className={`${darkMode ? 'bg-yellow-900/50 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} p-4 rounded-lg border-2`}>
                                <h3 className="font-bold text-lg mb-2">💡 Rule Vàng: Active Recall + Spaced Repetition</h3>
                                <p>Đây là combo chiếm 80% hiệu quả học tập. <strong>Học Mới</strong> & <strong>Ôn Tập</strong> (Flashcards) trong app được xây dựng dựa trên nguyên tắc này.</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-xl mb-3">🏆 Phương Pháp Platinum (Hiểu Sâu & Toàn Diện)</h3>
                                <ol className="list-decimal list-inside space-y-2">
                                    <li><strong>Học Mới (Feynman Technique):</strong> Dùng khu vực <strong>Ghi chú Feynman</strong> trong mỗi chương để diễn giải kiến thức bằng ngôn ngữ của bạn. Mục tiêu là hiểu sâu gốc rễ vấn đề.</li>
                                    <li><strong>Củng Cố (Anki Flashcards):</strong> Dùng AI hoặc tự tạo câu hỏi. Sau đó, sử dụng chế độ <strong>Học Mới</strong> để ghi nhớ và <strong>Ôn Tập</strong> để củng cố dài hạn.</li>
                                    <li><strong>Kiểm Tra (Practice Tests):</strong> Hàng tuần, sử dụng chế độ <strong>Kiểm Tra</strong> để thi thử và đánh giá lại kiến thức một cách khách quan.</li>
                                </ol>
                            </div>
                            <div>
                                <h3 className="font-bold text-xl mb-3">🥇 Phương Pháp Gold (Tiết Kiệm Thời Gian)</h3>
                                <ol className="list-decimal list-inside space-y-2">
                                    <li><strong>Active Recall:</strong> Sau mỗi chương, vào mục <strong>Ghi chú Feynman</strong> và thực hiện "Free Recall" - viết lại mọi thứ bạn nhớ mà không nhìn tài liệu.</li>
                                    <li><strong>Spaced Repetition:</strong> Chỉ tạo flashcard cho các điểm quan trọng hoặc khó nhớ nhất, sau đó dùng chế độ <strong>Ôn Tập</strong>.</li>
                                </ol>
                            </div>
                            <div>
                                <h3 className="font-bold text-xl mb-3">🎯 Tùy chỉnh theo Mục tiêu</h3>
                                <ul className="list-disc list-inside space-y-2">
                                    <li><strong>Thi trắc nghiệm:</strong> Tập trung vào <strong>Học Mới</strong> (Flashcards) và <strong>Kiểm Tra</strong>. Dùng <strong>Học Tổng Hợp</strong> để quen với việc chuyển đổi chủ đề.</li>
                                    <li><strong>Thi tự luận:</strong> Tập trung vào <strong>Ghi chú Feynman</strong> và Free Recall. Luyện viết câu trả lời hoàn chỉnh.</li>
                                    <li><strong>Học ngôn ngữ:</strong> Flashcards là vua. Dùng chế độ <strong>Học Mới</strong> và <strong>Ôn Tập</strong> hàng ngày.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {showAIDecisionLog && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-2xl w-full max-h-[80vh] p-8 flex flex-col`}>
                         <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-2"><Eye size={24} /> Nhật ký Quyết định AI</h2>
                            <button onClick={() => setShowAIDecisionLog(false)} className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}><X size={28} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-4">
                        {aiDecisionLog.length > 0 ? (
                            aiDecisionLog.map(entry => (
                                <div key={entry.id} className="ai-decision-log-entry">
                                     <div className={`log-icon ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}><entry.icon size={14} className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`} /></div>
                                    <time className={`text-xs font-semibold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{entry.timestamp.toLocaleTimeString()}</time>
                                    <h4 className="font-bold mt-1">{entry.action}</h4>
                                    <p className={`text-sm mt-1 p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                        <strong className="font-semibold">Lý do:</strong> {entry.reason}<br/>
                                        <strong className="font-semibold">Quyết định:</strong> {entry.decision}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500">Chưa có quyết định nào được ghi lại.</p>
                        )}
                        </div>
                    </div>
                 </div>
            )}

            {showDiagramAnalysis && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-2xl w-full p-8 text-center`}>
                        <UploadCloud size={48} className="mx-auto text-blue-500 mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Phân tích Sơ đồ bằng AI</h2>
                        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
                            Tính năng này đang được phát triển. Hãy tưởng tượng bạn có thể tải lên một hình ảnh sơ đồ, và AI sẽ tự động xác định các thành phần, giải thích mối quan hệ và tạo câu hỏi ôn tập từ đó!
                        </p>
                         <button onClick={() => setShowDiagramAnalysis(false)} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold">
                            Đã hiểu
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className={`${darkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-indigo-600 to-indigo-800'} text-white p-6 sticky top-0 z-30 shadow-lg`}>
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-3xl font-bold flex items-center gap-2"><BrainCircuit /> Cornell Notes Pro</h1>
                        <div className="flex gap-3">
                             <button 
                                onClick={() => setQuizConfigurator(true)}
                                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all transform hover:scale-105"
                                >
                                <Target size={18} />
                                Quiz Nâng Cao
                            </button>
                            <div className="relative group">
                                <button aria-label="Study Themes" title="Study Themes" className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition"><Palette size={20} /></button>
                                <div className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-gray-700 rounded-lg shadow-xl p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-10">
                                    <button onClick={() => setStudyTheme('default')} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">Default</button>
                                    <button onClick={() => setStudyTheme('zen')} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">🧘 Zen</button>
                                    <button onClick={() => setStudyTheme('speed')} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">⚡ Speed</button>
                                    <button onClick={() => setStudyTheme('night')} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">🌙 Night</button>
                                </div>
                            </div>
                            <button onClick={() => setShowCalendarView(true)} aria-label="Mở lịch ôn tập" title="Lịch ôn tập" className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition"><CalendarDays size={20} /></button>
                            <button onClick={() => setShowSettings(true)} aria-label="Mở cài đặt" title="Cài đặt" className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition"><Settings size={20} /></button>
                            <button onClick={() => setShowStats(true)} aria-label="Mở thống kê" title="Thống kê" className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition"><BarChart3 size={20} /></button>
                            <button onClick={() => setShowAIDecisionLog(true)} aria-label="AI Decision Log" title="AI Decision Log" className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition"><Eye size={20} /></button>
                            <button onClick={() => setShowPromptManager(true)} aria-label="Manage AI Prompts" title="Manage AI Prompts" className="flex items-center gap-1 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-2 rounded-lg transition text-sm">
                                <Zap size={16} /> Prompts
                            </button>
                            <button onClick={() => setShowABTesting(true)} aria-label="Mở bảng điều khiển A/B testing" title="A/B Testing" className="flex items-center gap-1 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-2 rounded-lg transition text-sm">
                                <BarChart3 size={16} /> A/B
                            </button>
                            <button onClick={() => setShowTechnique(true)} aria-label="Mở hướng dẫn phương pháp học" title="Phương pháp học" className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition"><BookOpen size={20} /></button>
                            <button onClick={exportData} aria-label="Xuất dữ liệu" title="Xuất dữ liệu" className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition"><Download size={20} /></button>
                            <label className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition cursor-pointer" aria-label="Nhập dữ liệu" title="Nhập dữ liệu">
                                <Upload size={20} />
                                <input type="file" accept=".json" onChange={importData} className="hidden" />
                            </label>
                        </div>
                    </div>
                    <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                            <Zap size={20} className="text-yellow-400" />
                            <span className="font-bold">{totalXP} XP</span>
                            <span className="text-sm opacity-75">Lv {level}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Flame size={20} className="text-red-400" />
                            <span className="font-bold">{currentStreak}</span>
                            <span className="text-sm opacity-75">Streak</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-6">
                <div className={`${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800'} rounded-2xl shadow-xl p-8 mb-8`}>
                    <h2 className="text-2xl font-bold mb-4">➕ Thêm Môn Học Mới</h2>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            placeholder="Ví dụ: Lịch sử Đảng..."
                            value={subjectInput}
                            onChange={(e) => setSubjectInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addSubject(e)}
                            className={getInputClasses()}
                        />
                        <button onClick={addSubject} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold">
                            <Plus size={20} />
                        </button>
                    </div>
                </div>

                {subjects.length === 0 ? (
                    <div className={`text-center py-12 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg`}>
                        <Folder size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-lg`}>Chưa có môn học nào. Hãy bắt đầu ngay!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {subjects.map((subject) => {
                            const reviewCount = getDueTopics(subject).length;
                            const totalChapters = subject.chapters?.length || 0;
                            const totalTopicsInSubject = subject.chapters?.reduce((sum, ch) => sum + ch.topics.length, 0) || 0;
                            const algorithmStats = enhancedSpacedRepetition.getAlgorithmComparison();
                          
                            return (
                                <div key={subject.id} className={`border-2 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} rounded-xl overflow-hidden hover:shadow-lg transition`}>
                                    <div
                                        onClick={(e) => handleExpandSubject(subject.id, e)}
                                        className={`${darkMode ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-100' : 'bg-gray-50 hover:bg-gray-100 text-gray-800'} p-4 cursor-pointer relative group`}
                                    >
                                        <button
                                          onClick={(e) => confirmDelete('subject', subject, e)}
                                          className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                          title={`Xóa môn ${subject.name}`}
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                        
                                        <div className="flex justify-between items-center pr-6">
                                            <div className="flex items-center gap-3">
                                                <ChevronRight 
                                                size={20} 
                                                className={`transition-transform ${expandedSubject === subject.id ? 'rotate-90' : ''}`}
                                                />
                                                <div>
                                                    <h3 className="text-lg font-bold">{subject.name}</h3>
                                                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        {totalChapters} chương • {totalTopicsInSubject} câu hỏi
                                                        {reviewCount > 0 && ` • ${reviewCount} cần ôn`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {reviewCount > 0 && (
                                                <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold">
                                                    🔄 {reviewCount}
                                                </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {expandedSubject === subject.id && (
                                        <div className={`p-4 ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50/50'}`}>
                                             <div className="mb-6">
                                                <EnhancedStudyModeSelector
                                                    subject={subject}
                                                    onSelectMode={(mode) => handleStudyModeSelect(subject.id, mode)}
                                                    darkMode={darkMode}
                                                    algorithmStats={algorithmStats}
                                                />
                                            </div>
                                            
                                            <div className="mb-6">
                                                <h4 className="font-semibold mb-3">Thêm chương mới</h4>
                                                <div className="flex gap-2">
                                                    <input
                                                    type="text"
                                                    placeholder="Tên chương mới..."
                                                    value={newChapterName}
                                                    onChange={(e) => setNewChapterName(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && addChapter(subject.id, e)}
                                                    className={`flex-1 ${getInputClasses()}`}
                                                    />
                                                    <button
                                                        onClick={(e) => addChapter(subject.id, e)}
                                                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        
                                            <div className="space-y-3">
                                            {subject.chapters?.map((chapter) => {
                                                const reviewCount = getTopicsForReview(subject.id, chapter.id).length;
                                                return (
                                                <div
                                                    key={chapter.id}
                                                    className={`rounded-lg border transition-all group ${
                                                    selectedChapter === chapter.id
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                        : `border-gray-200 dark:border-gray-700 ${darkMode ? 'bg-gray-800' : 'bg-white'}`
                                                    }`}
                                                >
                                                    <div className="p-3 cursor-pointer flex justify-between items-center" onClick={(e) => toggleChapter(chapter.id, e)}>
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            {expandedChapters[chapter.id] ? 
                                                            <FolderOpen size={16} className="text-blue-500" /> : 
                                                            <Folder size={16} className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                                            }
                                                            <div className="flex-1 min-w-0">
                                                                <h5 className="font-medium truncate">{chapter.name}</h5>
                                                                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                    {chapter.topics.length} câu hỏi
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {reviewCount > 0 && <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold">Ôn: {reviewCount}</span>}
                                                            <button
                                                                onClick={(e) => confirmDelete('chapter', { subjectId: subject.id, chapter }, e)}
                                                                className="p-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                title={`Xóa chương ${chapter.name}`}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                            <ChevronDown 
                                                                size={16} 
                                                                className={`text-gray-400 transition-transform ${expandedChapters[chapter.id] ? 'rotate-180' : ''}`}
                                                            />
                                                        </div>
                                                    </div>

                                                    {expandedChapters[chapter.id] && (
                                                    <div className={`p-4 border-t ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200'}`}>
                                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                                                            <button onClick={(e) => startStudyMode(subject.id, chapter.id, 'normal', e)} disabled={chapter.topics.length === 0} className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-2 rounded-lg font-bold transition text-sm">Flashcards ({chapter.topics.length})</button>
                                                            <button onClick={(e) => startStudyMode(subject.id, chapter.id, 'review', e)} disabled={reviewCount === 0} className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white py-2 rounded-lg font-bold transition text-sm">Ôn Tập ({reviewCount})</button>
                                                            <button onClick={(e) => { e.stopPropagation(); setOpenEndedMode({ subject, chapter }); }} disabled={chapter.topics.length === 0} className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white py-2 rounded-lg font-bold transition text-sm">Tự trả lời</button>
                                                            <button onClick={(e) => startFillBlanksMode(subject.id, chapter.id, e)} disabled={chapter.topics.length === 0} className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-2 rounded-lg font-bold transition text-sm">Điền chỗ trống</button>
                                                            <button onClick={(e) => startPracticeTest(subject.id, chapter.id, e)} disabled={chapter.topics.length === 0} className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white py-2 rounded-lg font-bold transition text-sm">Kiểm tra</button>
                                                        </div>

                                                        <div className={`mb-6 p-4 rounded-lg border-2 ${darkMode ? 'bg-blue-900/50 border-indigo-700' : 'bg-blue-50 border-indigo-200'}`}>
                                                            <p className={`font-bold mb-3 ${darkMode ? 'text-blue-200' : 'text-gray-700'}`}>🤖 AI Thông Minh - Tạo Câu Hỏi</p>
                                                            <textarea placeholder="Dán nội dung ghi chú ở đây..." value={notesInput} onChange={handleNotesInput} className={getTextareaClasses()} />
                                                             <div className="mb-3">
                                                                <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Chọn độ khó:</p>
                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                                    {difficultyOptions.map(opt => (
                                                                        <button key={opt.id} onClick={() => setAiDifficulty(opt.id as any)} className={`px-3 py-2 text-sm font-semibold rounded-lg transition ${aiDifficulty === opt.id ? 'bg-indigo-600 text-white ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-800' : `${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}`}>
                                                                            {opt.label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <button onClick={(e) => parseCornellNotes(subject.id, chapter.id, e)} disabled={generatingQuestions} className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white py-2 rounded font-bold transition text-sm">{generatingQuestions ? '⚙️...' : '📝 Thêm Thủ Công'}</button>
                                                                <button onClick={() => enhancedAIQuestions(notesInput, subject.id, chapter.id, aiDifficulty)} disabled={generatingQuestions || !notesInput.trim()} className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-2 rounded font-bold transition text-sm">{generatingQuestions ? '🤖 AI...' : '🚀 Tạo với AI'}</button>
                                                            </div>
                                                        </div>

                                                        <div className={`space-y-2 max-h-72 overflow-y-auto pr-2`}>
                                                            {chapter.topics.length > 0 ? chapter.topics.map((topic, idx) => {
                                                                const masteryLevel = enhancedSpacedRepetition.getMasteryLevel(topic);
                                                                const masteryColor = enhancedSpacedRepetition.getMasteryColor(masteryLevel);
                                                                return (
                                                                    <div key={topic.id} className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} p-3 rounded flex justify-between items-start group/topic`}>
                                                                        <div className="flex-1 text-sm">
                                                                            <div className="flex items-start gap-2">
                                                                                <span title={enhancedSpacedRepetition.getMasteryLabel(masteryLevel)} className={`w-3 h-3 mt-1 rounded-full ${masteryColor} flex-shrink-0`}></span>
                                                                                <p className={`font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{idx + 1}. {topic.question}</p>
                                                                            </div>
                                                                            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-xs mt-1 pl-5`}>{topic.answer}</p>
                                                                            <div className="flex items-center gap-2 flex-wrap mt-2 pl-5">
                                                                                {topic.isAI && <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">AI</span>}
                                                                                {topic.difficulty && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getDifficultyClass(topic.difficulty)}`}>{typeof topic.difficulty === 'number' ? topic.difficulty.toFixed(1) : topic.difficulty}</span>}
                                                                                {topic.type && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getTypeClass(topic.type)}`}>{getTypeText(topic.type)}</span>}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col items-center gap-2 ml-2 flex-shrink-0 opacity-0 group-hover/topic:opacity-100 transition-opacity">
                                                                            {topic.isAI && (
                                                                                <div className="flex gap-2">
                                                                                    <button onClick={() => handleTopicFeedback(subject.id, chapter.id, topic.id, 'good')} title="Câu hỏi tốt"><ThumbsUp size={14} className={topic.feedback === 'good' ? 'text-green-500' : 'text-gray-400 hover:text-green-500'} /></button>
                                                                                    <button onClick={() => handleTopicFeedback(subject.id, chapter.id, topic.id, 'bad')} title="Câu hỏi chưa tốt"><ThumbsDown size={14} className={topic.feedback === 'bad' ? 'text-red-500' : 'text-gray-400 hover:text-red-500'} /></button>
                                                                                </div>
                                                                            )}
                                                                            <button onClick={(e) => handleDeleteTopic(subject.id, chapter.id, topic.id, e)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            }) : (
                                                                <p className={`text-center text-sm py-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Chưa có câu hỏi nào trong chương này.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    )}
                                                </div>
                                                );
                                            })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
            {toasts.length > 0 && (
                <div className="fixed top-20 right-4 z-50 space-y-2">
                    {toasts.map(toast => (
                        <div
                            key={toast.id}
                            className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[250px] animate-slide-in ${
                                toast.type === 'success' ? 'bg-green-500' :
                                toast.type === 'error' ? 'bg-red-500' :
                                toast.type === 'warning' ? 'bg-yellow-500' :
                                'bg-blue-500'
                            } text-white`}
                        >
                            {toast.type === 'success' && <Check size={20} />}
                            {toast.type === 'error' && <X size={20} />}
                            {toast.type === 'warning' && <AlertTriangle size={20} />}
                            {toast.type === 'info' && <Info size={20} />}
                            <span className="flex-1">{toast.message}</span>
                            <button 
                                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                                className="hover:opacity-75"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
             {achievementToast && (
                <div className={`achievement-toast ${achievementToast ? 'show' : ''}`}>
                    <div className="achievement-icon">{achievementToast.icon}</div>
                    <div>
                        <div className="achievement-title">{achievementToast.title}</div>
                        <div className="achievement-desc">{achievementToast.description}</div>
                        <div className="achievement-xp">+{achievementToast.xp} XP</div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;