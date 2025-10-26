
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Award, BarChart3, BookOpen, Brain, BrainCircuit, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Download, Flame, Folder, FolderOpen, Lightbulb, Moon, Play, Plus, RefreshCw, Settings, Sparkles, Square, Star, Sun, Target, ThumbsDown, ThumbsUp, Trash2, Trophy, Upload, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { EnhancedSpacedRepetition } from './enhanced-spaced-repetition';
import BlankPaperMode from './components/BlankPaperMode';
import LeitnerBoxVisualization from './components/LeitnerBoxVisualization';
import EnhancedStudyModeSelector from './components/EnhancedStudyModeSelector';
import CalendarView from './components/CalendarView';
import ABTestingDashboard from './components/ABTestingDashboard';
import OpenEndedMode from './components/OpenEndedMode';


// Define interfaces for our data structures for better type safety
interface StudyRecord {
    confidence: string;
    id: number;
    date: string;
}

interface Topic {
    id: number;
    question: string;
    answer: string;
    studies: StudyRecord[];
    isAI: boolean;
    // New fields for enhanced spaced repetition
    stability?: number;
    interval?: number;
    repetitions?: number;
    dueDate?: string;
    algorithm?: string;
    // New fields from enhanced AI questions
    difficulty?: 'easy' | 'medium' | 'hard' | string | number;
    type?: 'concept' | 'application' | 'analysis' | 'evaluation' | string;
    createdAt?: string;
    chapterId?: number;
    feedback?: 'good' | 'bad' | null;
}

interface Chapter {
    id: number;
    name: string;
    topics: Topic[];
    feynmanNotes: string;
}

interface Subject {
    id: number;
    name: string;
    chapters: Chapter[];
}

interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface Badge {
    id: string;
    name: string;
    description: string;
    icon: React.ElementType;
    unlocked: boolean;
    date?: string;
}

// A/B Testing Interfaces for AI Prompts
interface AIPromptVersion {
  id: string;
  name: string;
  prompt: string;
  qualityScore: number;
  usageCount: number;
  positiveFeedback: number;
  negativeFeedback: number;
}

interface AIQuestionQuality {
  promptVersion: string;
  topicId: number;
  feedback: 'good' | 'bad' | null;
  userRating?: number;
  autoQualityScore: number;
}


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


    // Gamification State
    const [totalXP, setTotalXP] = useState(0);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [lastStudyDate, setLastStudyDate] = useState<string | null>(null);
    const [level, setLevel] = useState(1);
    
    // New Gamification Features
    const [badges, setBadges] = useState<{[key: string]: Badge}>({});
    const [badgeNotification, setBadgeNotification] = useState<Badge | null>(null);


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
      }
    ]);

    const [aiQuestionQuality, setAiQuestionQuality] = useState<AIQuestionQuality[]>([]);
    const [currentPromptVersion, setCurrentPromptVersion] = useState('v1');
    
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


    const confidenceLevels = [
        { value: 'red', label: 'Rất yếu', color: 'bg-red-100 text-red-800 hover:bg-red-200', emoji: '😫', xp: 10, performance: 1 },
        { value: 'orange', label: 'Yếu', color: 'bg-orange-100 text-orange-800 hover:bg-orange-200', emoji: '😕', xp: 25, performance: 2 },
        { value: 'yellow', label: 'Tốt', color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200', emoji: '😊', xp: 50, performance: 3 },
        { value: 'green', label: 'Xuất sắc', color: 'bg-green-100 text-green-800 hover:bg-green-200', emoji: '🎉', xp: 100, performance: 4 },
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


     useEffect(() => {
        let interval: number;
        if (isPomodoroActive && pomodoroTime > 0) {
            interval = window.setInterval(() => {
                setPomodoroTime(time => time - 1);
            }, 1000);
        } else if (isPomodoroActive && pomodoroTime === 0) {
            setIsPomodoroActive(false);
            if (isAudioOn) {
                const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
                audio.play();
            }
            
            if (pomodoroSessionType === 'work') {
                alert('Pomodoro hoàn thành! Nghỉ ngơi thôi!');
                setPomodoroSessionType('break');
                setPomodoroTime(pomodoroBreakDuration * 60);
            } else {
                alert('Hết giờ nghỉ! Quay lại làm việc nào!');
                setPomodoroSessionType('work');
                setPomodoroTime(pomodoroWorkDuration * 60);
            }
        }
        return () => clearInterval(interval);
    }, [isPomodoroActive, pomodoroTime, isAudioOn, pomodoroSessionType, pomodoroWorkDuration, pomodoroBreakDuration]);


    useEffect(() => {
        loadData();
         // Cleanup timeout on component unmount
         return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        saveData();
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


    const saveData = () => {
        try {
            const data = { subjects, totalXP, currentStreak, lastStudyDate, badges, level, darkMode, pomodoroWorkDuration, pomodoroBreakDuration, aiPromptVersions, aiQuestionQuality };
            localStorage.setItem('cornell-data', JSON.stringify(data));
        } catch (e) {
            console.error('Error saving:', e);
        }
    };

    const loadData = () => {
        try {
            // Load main data
            const result = localStorage.getItem('cornell-data');
            if (result) {
                const data = JSON.parse(result);
                setSubjects(data.subjects?.map((s: Subject) => ({
                    ...s,
                    chapters: s.chapters.map((c: Chapter) => ({
                        ...c,
                        feynmanNotes: c.feynmanNotes || '' // Handle old data without feynmanNotes
                    }))
                })) || []);
                setTotalXP(data.totalXP || 0);
                setCurrentStreak(data.currentStreak || 0);
                setLastStudyDate(data.lastStudyDate || null);
                
                const initialBadges: {[key: string]: Badge} = {};
                ALL_BADGES.forEach(b => {
                    initialBadges[b.id] = { ...b, unlocked: false };
                });
                
                if (Array.isArray(data.badges)) {
                    data.badges.forEach((b: any) => {
                       if (b && initialBadges[b.id]) {
                           initialBadges[b.id] = { ...initialBadges[b.id], ...b, unlocked: true };
                       }
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
                setPomodoroTime((data.pomodoroWorkDuration || 25) * 60);

                if (data.aiPromptVersions) setAiPromptVersions(data.aiPromptVersions);
                if (data.aiQuestionQuality) setAiQuestionQuality(data.aiQuestionQuality);

            } else {
                const initialBadges: {[key: string]: Badge} = {};
                ALL_BADGES.forEach(b => {
                    initialBadges[b.id] = { ...b, unlocked: false };
                });
                setBadges(initialBadges);
            }

        } catch (e) {
            console.log('No saved data or parse error');
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
                    alert('Nhập dữ liệu thành công!');
                }
            } catch (e) {
                const message = e instanceof Error ? e.message : "Đã xảy ra lỗi không xác định.";
                alert(`Nhập thất bại: ${message}`);
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };
    
    const checkAndAwardBadges = (event?: { type: string, score?: number, time?: number }) => {
        const newBadges: string[] = [];
        
        const award = (badgeId: string) => {
            if (!badges[badgeId] || !badges[badgeId].unlocked) {
                newBadges.push(badgeId);
            }
        };

        // 1. Newbie: First subject
        if (subjects.length > 0) award('newbie');
        
        // 2. First Study
        const hasStudied = subjects.some(s => s.chapters.some(c => c.topics.some(t => t.studies.length > 0)));
        if (hasStudied) award('first_study');

        // 3. AI Scholar
        const hasAITopic = subjects.some(s => s.chapters.some(c => c.topics.some(t => t.isAI)));
        if (hasAITopic) award('ai_scholar');
        
        // 4. Streak 3 days
        if (currentStreak >= 3) award('streak_3');
        if (currentStreak >= 7) award('on_fire');


        // 5. Expert
        const hasMasteredTopic = subjects.some(s => s.chapters.some(c => c.topics.some(t => enhancedSpacedRepetition.getMasteryLevel(t) === 5)));
        if (hasMasteredTopic) award('expert');

        // 6. Collector
        const totalTopics = subjects.reduce((acc, s) => acc + s.chapters.reduce((cAcc, c) => cAcc + c.topics.length, 0), 0);
        if (totalTopics >= 50) award('collector');
        
        // 7. Chapter Master
        const hasMasteredChapter = subjects.some(s => s.chapters.some(c => 
            c.topics.length > 5 && c.topics.every(t => enhancedSpacedRepetition.getMasteryLevel(t) >= 4)
        ));
        if (hasMasteredChapter) award('chapter_master');

        
        // Event-based badges
        if (event) {
            if (event.type === 'quiz' && event.score === 1) {
                award('perfect_score');
            }
        }


        if (newBadges.length > 0) {
            const unlockedBadges: {[key: string]: Badge} = { ...badges };
            const today = new Date().toISOString().split('T')[0];
            
            newBadges.forEach(badgeId => {
                const badgeInfo = ALL_BADGES.find(b => b.id === badgeId);
                if (badgeInfo) {
                    const newBadge: Badge = { ...badgeInfo, unlocked: true, date: today };
                    unlockedBadges[badgeId] = newBadge;
                    
                    if (newBadges.indexOf(badgeId) === 0) {
                        setBadgeNotification(newBadge);
                        setTimeout(() => setBadgeNotification(null), 5000);
                    }
                }
            });
            setBadges(unlockedBadges);
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
                    const totalFeedback = p.positiveFeedback + p.negativeFeedback;
                    
                    const currentTotalValue = p.qualityScore * totalFeedback;
                    const newValue = feedback === 'good' ? 1 : 0.2;
                    const newQualityScore = (currentTotalValue + newValue) / (totalFeedback + 1);
                    
                    return {
                        ...p,
                        positiveFeedback: p.positiveFeedback + positiveIncrement,
                        negativeFeedback: p.negativeFeedback + negativeIncrement,
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
    
    // A/B testing function to select a prompt version
    const getRandomPromptVersion = (): AIPromptVersion => {
        const weights = aiPromptVersions.map(v => 
            v.usageCount === 0 ? 2 : (v.qualityScore * (1 + v.positiveFeedback / (v.positiveFeedback + v.negativeFeedback + 1)))
        );
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalWeight;
      
        for (let i = 0; i < aiPromptVersions.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return aiPromptVersions[i];
            }
        }
      
        return aiPromptVersions[0];
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


    const enhancedAIQuestions = async (notesText: string, subjectId: number, chapterId: number, difficulty: 'mixed' | 'easy' | 'medium' | 'hard') => {
        if (!notesText.trim()) {
            alert('Vui lòng nhập ghi chú!');
            return;
        }
    
        setGeneratingQuestions(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            const promptVersion = getRandomPromptVersion();
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
              model: "gemini-2.5-flash",
              contents: enhancedPrompt,
            });
    
            const generatedText = response.text;
            const questions = parseEnhancedAIQuestions(generatedText);
            
            if (questions.length === 0) {
              alert('Không tạo được câu hỏi từ AI. Vui lòng thử lại với nội dung khác!');
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
            alert(`✅ Đã tạo ${questions.length} câu hỏi chất lượng cao bằng AI (${promptVersion.name})!`);
            
        } catch (e) {
            console.error('Enhanced AI Error:', e);
            alert('Lỗi AI nâng cao: ' + (e instanceof Error ? e.message : 'Unknown error'));
        } finally {
            setGeneratingQuestions(false);
        }
    };
    
    const parseEnhancedAIQuestions = (aiText: string): Topic[] => {
        const lines = aiText.split('\n').filter(line => line.trim());
        const questions: Topic[] = [];
        
        lines.forEach(line => {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length >= 4) { // Handle optional Bloom level
                const [question, answer, difficulty, type] = parts;
                if (question.length > 5 && answer.length > 3) {
                    questions.push({
                        id: Date.now() + Math.random(),
                        question,
                        answer,
                        difficulty: difficulty as any,
                        type: type as any,
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

    const parseCornellNotes = (subjectId: number, chapterId: number, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!notesInput.trim()) {
            alert('Vui lòng nhập ghi chú!');
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
                    alert('Không tìm thấy câu hỏi hợp lệ.');
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
                alert('Đã tạo ' + questions.length + ' câu hỏi!');

            } catch (e) {
                alert('Lỗi: ' + (e instanceof Error ? e.message : "Unknown error"));
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
                        const newStudyRecord: StudyRecord = { confidence, id: Date.now(), date: today };
                        const studies = [...t.studies, newStudyRecord];
                        const topicForSr = {...t, studies};
                        const srData = enhancedSpacedRepetition.calculateNextReview(topicForSr, performance);
                        return { 
                            ...t, 
                            studies,
                            ...srData 
                        };
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
          const totalTopics = subject.chapters?.reduce((sum: number, ch: Chapter) => sum + ch.topics.length, 0) || 0;
          message = `Xóa môn "${subject.name}"? Sẽ mất ${totalTopics} câu hỏi trong ${subject.chapters?.length || 0} chương!`;
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
           setTimeout(() => alert(`✅ Đã xóa môn "${subjectName}"`), 100);

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
          setTimeout(() => alert(`✅ Đã xóa chương "${chapterName}"`), 100);
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
                alert('🎉 Tuyệt vời! Hiện không có câu hỏi nào cần ôn tập trong chương này!');
                return;
            }
        } else {
            topicsToStudy = [...chapter.topics];
        }

        topicsToStudy = topicsToStudy.sort(() => Math.random() - 0.5);
        setStudyMode({ subjectId, chapterId, topics: topicsToStudy, mode });
        setCurrentCardIndex(0);
        setRevealed(false);
    };

    const getDueTopics = (subject: Subject): Topic[] => {
        const today = new Date().toISOString().split('T')[0];
        return subject.chapters.flatMap(c => 
            c.topics.filter(t => t.dueDate && t.dueDate <= today)
        );
    };
    
    const getWeakestTopics = (subject: Subject): Topic[] => {
        const allTopics = subject.chapters.flatMap(c => c.topics);
        return allTopics.sort((a, b) => 
            (a.stability || 4) - (b.stability || 4)
        ).slice(0, 20); // Get 20 weakest topics
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
        }
      
        if (topicsToStudy.length === 0) {
          alert('Không có câu hỏi phù hợp cho chế độ học này!');
          return;
        }

        const topicsWithChapterId = subject.chapters.flatMap(c =>
            c.topics.filter(t => topicsToStudy.some(ts => ts.id === t.id))
            .map(t => ({...t, chapterId: c.id}))
        );
      
        setStudyMode({ 
          subjectId: subject.id, 
          topics: topicsWithChapterId.sort(() => Math.random() - 0.5), 
          mode: 'enhanced',
          enhancedType: mode 
        });
        setCurrentCardIndex(0);
        setRevealed(false);
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
            alert('Môn học này chưa có câu hỏi nào để học.');
            return;
        }

        const topicsWithChapterId = subject.chapters.flatMap(c =>
            c.topics.map(t => ({ ...t, chapterId: c.id }))
        );

        setStudyMode({ subjectId, topics: topicsWithChapterId.sort(() => Math.random() - 0.5), mode: 'interleaved' });
        setCurrentCardIndex(0);
        setRevealed(false);
    };

    const goToNextCard = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    
        if (!studyMode) return;

        if (currentCardIndex < studyMode.topics.length - 1) {
            setCurrentCardIndex(currentCardIndex + 1);
            setRevealed(false);
            setIsAwaitingNext(false);
            setSelectedConfidence(null);
        } else {
            exitStudyMode();
            alert('🎊 Hoàn thành! Bạn đã học rất chăm chỉ!');
        }
    };

    const exitStudyMode = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setStudyMode(null);
        setRevealed(false);
        setIsAwaitingNext(false);
        setSelectedConfidence(null);
    };

    const handleConfidenceSelect = (confidence: string) => {
        if (isAwaitingNext || !studyMode) return;

        setRevealed(true);
        setSelectedConfidence(confidence);
        setIsAwaitingNext(true);

        const { subjectId, chapterId, topics } = studyMode;
        const topic = topics[currentCardIndex];
        const currentChapterId = studyMode.mode === 'interleaved' || studyMode.mode === 'enhanced' ? topic.chapterId! : chapterId;
        recordStudy(subjectId, currentChapterId, topic.id, confidence);

        timeoutRef.current = window.setTimeout(goToNextCard, 4000); // 4 second delay
    };

    const startPracticeTest = (subjectId: number, chapterId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const subject = subjects.find(s => s.id === subjectId);
        const chapter = subject?.chapters.find(c => c.id === chapterId);
        if (!chapter || chapter.topics.length === 0) {
            alert('Chương này không có câu hỏi nào để kiểm tra.');
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
            alert('Chương này không có câu hỏi để chơi.');
            return;
        }

        const questions = chapter.topics
            .map(generateBlankQuestion)
            .filter(q => q.correctBlank.trim() !== '') // Ensure a blank was created
            .sort(() => 0.5 - Math.random())
            .slice(0, 10); // Max 10 questions per session

        if (questions.length === 0) {
            alert('Không thể tạo câu hỏi điền vào chỗ trống từ chương này.');
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
                alert(`Trò chơi kết thúc! Điểm của bạn: ${fillBlanksMode.score + (isCorrect ? 1 : 0)}/${fillBlanksMode.questions.length}`);
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

        setChatMessages(prev => [...prev, newUserMessage]);
        setUserMessage('');
        setIsChatLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const totalQuestions = subjects.reduce((sum, s) => sum + s.chapters.reduce((cSum, c) => cSum + c.topics.length, 0), 0);
            const userContext = `
# AI LEARNING COACH - SYSTEM INSTRUCTIONS

## 🎯 VAI TRÒ & NHIỆM VỤ
Bạn là AI Coach Học Tập Thông Minh, chuyên gia về khoa học học tập (Learning Science). 
Nhiệm vụ của bạn là hướng dẫn, động viên và thử thách người dùng để họ hiểu sâu kiến thức, không chỉ là học thuộc.

## 📐 NGUYÊN TẮC CỐT LÕI
1.  **Động Lực Nội Tại:** Khen "quá trình tư duy" ("Cách bạn phân tích từng bước rất logic"), không khen chung chung ("Giỏi lắm!"). Kết nối việc học với mục tiêu cá nhân của người dùng.
2.  **Metacognition (Nhận thức về nhận thức):** Luôn hỏi "Tại sao bạn nghĩ vậy?" sau mỗi câu trả lời. KHÔNG BAO GIỜ đưa ra đáp án trực tiếp. Thay vào đó, hãy dùng câu hỏi gợi mở để người dùng tự tìm ra lỗi sai.
3.  **Desirable Difficulty (Độ khó vừa phải):** Giữ cho các câu hỏi ở mức "vất vả nhưng làm được". Nếu người dùng trả lời đúng dễ dàng, hãy hỏi câu hỏi sâu hơn để kiểm tra mức độ hiểu.

## 🎨 RESPONSE FORMAT (Cách Trả Lời)

### Khi Học Sinh Trả Lời SAI:
1.  **Tìm phần TỐT:** "Hmm, cách tiếp cận của bạn ở [phần A] rất logic!"
2.  **Chỉ ra phần CẦN ĐIỀU CHỈNH (không nói 'sai'):** "Tuy nhiên, ở [phần B] có vẻ cần xem xét thêm..."
3.  **Gợi ý HƯỚNG SUY NGHĨ (không cho đáp án):** "Thử nghĩ lại xem: Nếu [điều kiện X] thay đổi, [kết quả Y] sẽ ra sao?"
4.  **Cho thêm cơ hội:** "Hãy thử lại với gợi ý này nhé!"

### Khi Học Sinh Trả Lời ĐÚNG:
1.  **Xác nhận + Hỏi "Tại sao?":** "Chính xác! Bạn có thể giải thích tại sao [X] lại dẫn đến [Y] không?"
2.  **Yêu cầu ví dụ thực tế:** "Tuyệt! Bạn có thể cho 1 ví dụ trong đời sống về [khái niệm này]?"
3.  **Kiểm tra transfer (chuyển hóa):** "Nếu thay đổi [điều kiện], kết quả sẽ thế nào?"

### Khi Giải Thích Khái Niệm Mới (Dùng CPA Model):
1.  **C - CONCRETE (Ví dụ cụ thể trước):** "Hãy tưởng tượng bạn mua táo 5k/quả..."
2.  **P - PRINCIPLE (Nguyên lý sau):** "Hàm số là một quy tắc..."
3.  **A - APPLICATION (Áp dụng ngay):** "Bây giờ bạn thử tính..."

## 🎭 TONE & PERSONALITY
- **Như người bạn học:** Dùng "mình/bạn", thân thiện, khuyến khích.
- **Growth Mindset:** "Chưa hiểu là bình thường, đó là dấu hiệu não đang tạo kết nối mới".
- **Không phán xét.**

---
## NGỮ CẢNH HỌC TẬP HIỆN TẠI CỦA TÔI:
- Môn học: ${subjects.map(s => s.name).join(', ') || 'Chưa có'}
- Level: ${level}, XP: ${totalXP}, Streak: ${currentStreak} ngày
- Tổng số câu hỏi đã tạo: ${totalQuestions}

## CÂU HỎI CỦA TÔI: 
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


    // RENDER LOGIC
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
            <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100'} p-6 flex items-center justify-center`}>
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
                        <p className="text-2xl" dangerouslySetInnerHTML={{ __html: currentQuestion.blankedAnswer.replace('[___]', '<span class="font-bold text-indigo-500">[___]</span>') }} />
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
        const subject = subjects.find(s => s.id === studyMode.subjectId);
        const progress = ((currentCardIndex + 1) / studyMode.topics.length) * 100;

        return (
            <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100'} p-6 flex items-center justify-center`}>
                <div className="w-full max-w-3xl">
                    <div className={`mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow-lg`}>
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-2xl font-bold">{subject?.name}</h2>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-sm ${studyMode.mode === 'review' ? 'bg-yellow-500 text-white' : studyMode.mode === 'interleaved' ? 'bg-purple-500 text-white' : 'bg-indigo-500 text-white'}`}>
                                    {studyMode.mode === 'review' ? '🔄 Ôn Tập' : studyMode.mode === 'interleaved' ? '🔀 Tổng Hợp' : studyMode.mode === 'enhanced' ? `🚀 ${studyMode.enhancedType}` : '📚 Học Mới'}
                                </span>
                                <button onClick={exitStudyMode} className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-red-600 hover:text-red-800'}`}>
                                    <X size={28} />
                                </button>
                            </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: progress + '%' }}></div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Câu {currentCardIndex + 1} / {studyMode.topics.length}</p>
                    </div>

                    <div
                        className={`mb-8 p-12 rounded-2xl shadow-2xl min-h-[24rem] flex items-center justify-center transition ${revealed
                                ? `${darkMode ? 'bg-gradient-to-br from-green-900 to-green-800 border-green-600' : 'bg-gradient-to-br from-green-100 to-green-50 border-4 border-green-400'}`
                                : `${darkMode ? 'bg-gradient-to-br from-blue-900 to-indigo-900 border-indigo-600 text-white' : 'bg-gradient-to-br from-blue-600 to-indigo-700 border-4 border-indigo-800 text-white'}`
                            }`}
                    >
                        <div className="text-center w-full px-6">
                            <p className="text-sm uppercase opacity-75 mb-6">{revealed ? 'Trả Lời' : 'Câu Hỏi'}</p>
                            <p className="text-3xl font-bold">{revealed ? currentTopic.answer : currentTopic.question}</p>
                            {currentTopic.isAI && (
                                <p className={`mt-4 text-sm opacity-75 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>🤖 Được tạo bởi AI</p>
                            )}
                            <p className="mt-8 text-sm opacity-75">{revealed ? 'So sánh với câu trả lời của bạn.' : 'Tự trả lời câu hỏi, sau đó chọn mức độ tự tin của bạn.'}</p>
                        </div>
                    </div>

                    <div className="h-36 flex items-center justify-center">
                        {isAwaitingNext ? (
                            <div className="flex justify-center">
                                <button
                                    onClick={goToNextCard}
                                    className={`inline-flex items-center gap-3 px-10 py-4 rounded-lg font-bold text-lg transition shadow-xl transform hover:scale-105 ${
                                        darkMode
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    } focus:outline-none focus:ring-4 focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 animate-pulse`}
                                >
                                    Tiếp theo <ChevronRight size={24} />
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                                {confidenceLevels.map((level) => {
                                    const isSelected = selectedConfidence === level.value;
                                    return (
                                        <button
                                            key={level.value}
                                            onClick={() => handleConfidenceSelect(level.value)}
                                            disabled={isAwaitingNext}
                                            className={`p-4 rounded-lg font-bold text-lg transition ${level.color} flex flex-col items-center justify-center space-y-2 h-32 hover:scale-105 transform ${isAwaitingNext ? 'cursor-not-allowed opacity-50' : ''} ${isSelected ? 'ring-4 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-900' : ''}`}
                                        >
                                            <span className="text-4xl">{level.emoji}</span>
                                            <span>{level.label}</span>
                                            <span className="text-xs opacity-80">+{level.xp} XP</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (practiceTestMode) {
        const currentTopic = practiceTestMode.topics[currentCardIndex];
        const subject = subjects.find(s => s.id === practiceTestMode.subjectId);
        const chapter = subject?.chapters.find(c => c.id === practiceTestMode.chapterId);
        const progress = ((currentCardIndex + 1) / practiceTestMode.topics.length) * 100;

        return (
            <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100'} p-6 flex items-center justify-center`}>
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
                            <button key={level.value} onClick={() => handlePracticeTestAnswer(level.value)} className={`px-6 py-4 rounded-lg font-bold text-lg transition ${level.color}`}>
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
            <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100'} p-6`}>
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
                                    <p className={`mt-2 text-sm p-2 rounded inline-block ${confidence?.color}`}>
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
        <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100'} pb-24`}>
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
            
             {/* Badge Notification */}
            {badgeNotification && (
                <div className="fixed bottom-24 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-lg shadow-2xl z-50 flex items-center gap-4 animate-bounce">
                    <div className="bg-white p-2 rounded-full">
                        <badgeNotification.icon size={24} className="text-orange-500" />
                    </div>
                    <div>
                        <h4 className="font-bold">Huy hiệu mới!</h4>
                        <p className="text-sm">{badgeNotification.name}</p>
                    </div>
                    <button onClick={() => setBadgeNotification(null)} className="absolute top-1 right-1 text-white opacity-70 hover:opacity-100">
                        <X size={16} />
                    </button>
                </div>
            )}
            
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
                <div className={`fixed bottom-4 right-4 w-96 h-[500px] ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} border rounded-2xl shadow-2xl z-50 flex flex-col`}>
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
                                <p className={`text-3xl font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>{subjects.reduce((sum, s) => sum + s.chapters.reduce((cSum, c) => cSum + c.topics.length, 0), 0)}</p>
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

            {/* Header */}
            <header className={`${darkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-indigo-600 to-indigo-800'} text-white p-6 sticky top-0 z-30 shadow-lg`}>
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-3xl font-bold flex items-center gap-2"><BrainCircuit /> Cornell Notes Pro</h1>
                        <div className="flex gap-3">
                            <button onClick={() => setShowCalendarView(true)} className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition"><CalendarDays size={20} /></button>
                            <button onClick={() => setShowSettings(true)} className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition"><Settings size={20} /></button>
                            <button onClick={() => setShowStats(true)} className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition"><BarChart3 size={20} /></button>
                            <button onClick={() => setShowABTesting(true)} className="flex items-center gap-1 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-2 rounded-lg transition text-sm">
                                <BarChart3 size={16} /> A/B
                            </button>
                            <button onClick={() => setShowTechnique(true)} className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition"><BookOpen size={20} /></button>
                            <button onClick={exportData} className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition"><Download size={20} /></button>
                            <label className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition cursor-pointer">
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
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-8 mb-8`}>
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
                            const totalTopics = subject.chapters?.reduce((sum, ch) => sum + ch.topics.length, 0) || 0;
                            const algorithmStats = enhancedSpacedRepetition.getAlgorithmComparison();
                          
                            return (
                                <div key={subject.id} className={`border-2 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} rounded-xl overflow-hidden hover:shadow-lg transition`}>
                                    <div
                                        onClick={(e) => handleExpandSubject(subject.id, e)}
                                        className={`${darkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'} p-4 cursor-pointer relative group`}
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
                                                        {totalChapters} chương • {totalTopics} câu hỏi
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
        </div>
    );
}

export default App;