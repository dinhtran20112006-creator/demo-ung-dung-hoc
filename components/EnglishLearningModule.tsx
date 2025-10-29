

import React, { useState, useMemo, useRef, useEffect } from 'react';
// FIX: Imported 'FileText' and 'BookCopy' to resolve reference errors.
import { X, Volume2, ChevronRight, Play, BookOpen, Lock, ChevronLeft, Gamepad2, Brain, History, Target, Puzzle, Clock, CheckCircle, Lightbulb, Sparkles, BrainCircuit, RotateCcw, BookOpenCheck, Copy, SpellCheck, Search, Mic, Crosshair, Shuffle, HelpCircle, Combine, Users, PenSquare, Voicemail, CheckCircle2, Link, Milestone, ArrowRightLeft, AudioLines, Image, Youtube, Bot, TrendingUp, CalendarCheck, RefreshCw, Map, FileText, BookCopy, CalendarDays } from 'lucide-react';
import { EnhancedSpacedRepetition } from '../enhanced-spaced-repetition';
import { PRE_LOADED_LISTS } from './english-vocab-data';
import { GoogleGenAI, Type } from "@google/genai";


// Interfaces
interface StudyRecord {
    confidence: string;
    id: number;
    date: string;
}

export interface VocabularyWord {
  id: number;
  word: string;
  meaning: string;
  pronunciation: string;
  partOfSpeech: string;
  example: string;
  translation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  mastered: boolean;
  studies?: StudyRecord[];
  stability?: number;
  interval?: number;
  repetitions?: number;
  dueDate?: string;
  category?: string;
  // FIX: Added optional 'level' property to support CEFR level from AI-generated lists.
  level?: string;
}

export interface VocabularyList {
  id: number;
  name: string;
  description: string;
  icon: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Mixed';
  // FIX: Added 'idioms' to the category type to allow for idiom-specific vocabulary lists.
  category: 'vocabulary' | 'grammar' | 'phrases' | 'business' | 'ielts' | 'toeic' | 'idioms' | 'ai-generated';
  totalWords: number;
  words: VocabularyWord[];
  unlocks?: number; // Which list this one unlocks
  isAI?: boolean;
}

export interface UserProgress {
    [listId: number]: {
        wordsLearned: number[];
        wordsMastered: number[];
        totalWords: number;
        lastStudied?: string;
    }
}

export interface EnglishLearningData {
    vocabularyLists: VocabularyList[];
    userProgress: UserProgress;
    unlockedLists: number[];
}


interface ConfidenceLevel {
    value: string;
    label: string;
    color: string;
    emoji: string;
    xp: number;
    performance: number;
}

interface EnglishModuleProps {
    englishData: EnglishLearningData;
    setEnglishData: React.Dispatch<React.SetStateAction<EnglishLearningData | null>>;
    onClose: () => void;
    darkMode: boolean;
    setTotalXP: React.Dispatch<React.SetStateAction<number>>;
    updateStreak: () => void;
    confidenceLevels: ConfidenceLevel[];
    checkAndAwardBadges: (event?: { type: string, score?: number, time?: number }) => void;
}

type EnglishView = 'browse' | 'listDetail' | 'flashcards' | 'matching' | 'quiz' | 'aiGenerator' | 'aiResult' | 'anagram' | 'sentenceScramble' | 'spellingBee' | 'guessTheWord' | 'pronunciationChallenge' | 'dictation' | 'wordSearch' | 'crossword' | 'shadowing' | 'errorCorrection' | 'synonymAntonym' | 'collocations';


export const createInitialEnglishData = (): EnglishLearningData => {
    const initialProgress: UserProgress = {};
    PRE_LOADED_LISTS.forEach(list => {
        initialProgress[list.id] = {
            wordsLearned: [],
            wordsMastered: [],
            totalWords: list.totalWords,
        };
    });

    return {
        vocabularyLists: PRE_LOADED_LISTS,
        userProgress: initialProgress,
        unlockedLists: [1], // Unlock the first list by default
    };
};


// Word Search Types
interface WordSearchData {
    grid: string[][];
    words: { word: string; found: boolean }[];
    wordLocations: { [word: string]: { row: number, col: number }[] };
}

interface Cell {
    row: number;
    col: number;
    letter: string;
}


// Crossword Types
interface CrosswordClue {
    number: number;
    word: string;
    clue: string;
    orientation: 'across' | 'down';
    row: number;
    col: number;
}
interface CrosswordData {
    grid: (string | null)[][];
    clues: {
        across: CrosswordClue[];
        down: CrosswordClue[];
    };
}
interface UserCrosswordGrid {
    [key: string]: string;
}

interface ErrorCorrectionData {
    wordId: number;
    incorrectSentence: string;
    correctSentence: string;
}

interface SynonymAntonymData {
    wordId: number;
    word: string;
    type: 'synonym' | 'antonym';
    options: string[];
    correctAnswer: string;
}

interface CollocationsData {
    wordId: number;
    word: string;
    sentencePart1: string;
    sentencePart2: string;
    options: string[];
    correctAnswer: string;
}

const EnglishLearningModule: React.FC<EnglishModuleProps> = ({
    englishData,
    setEnglishData,
    onClose,
    darkMode,
    setTotalXP,
    updateStreak,
    confidenceLevels,
    checkAndAwardBadges,
}) => {
    const [view, setView] = useState<EnglishView>('browse');
    const [selectedList, setSelectedList] = useState<VocabularyList | null>(null);
     // Voice selection state
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);
    const [gameLoadingState, setGameLoadingState] = useState({ isLoading: false, message: '' });


    // Flashcard State
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [revealed, setRevealed] = useState(false);
    const [isAwaitingNext, setIsAwaitingNext] = useState(false);
    const [selectedConfidence, setSelectedConfidence] = useState<string | null>(null);
    const timeoutRef = useRef<number | null>(null);
    const enhancedSpacedRepetition = useMemo(() => new EnhancedSpacedRepetition(), []);

    // Generic Game State
    const [gameWords, setGameWords] = useState<VocabularyWord[]>([]);
    const [currentGameIndex, setCurrentGameIndex] = useState(0);
    const [gameScore, setGameScore] = useState(0);
    const [gameFinished, setGameFinished] = useState(false);

    // Matching Game State
    const [matchingWords, setMatchingWords] = useState<{ id: number; word: string; }[]>([]);
    const [matchingMeanings, setMatchingMeanings] = useState<{ id: number; meaning: string; }[]>([]);
    const [selectedWord, setSelectedWord] = useState<{ id: number; word: string; } | null>(null);
    const [selectedMeaning, setSelectedMeaning] = useState<{ id: number; meaning: string; } | null>(null);
    const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
    const [incorrectPair, setIncorrectPair] = useState<number[] | null>(null);
    const [matchingTime, setMatchingTime] = useState(0);
    const [matchingTimerActive, setMatchingTimerActive] = useState(false);
    const [matchingBonusXP, setMatchingBonusXP] = useState(0);

    // Quiz State
    const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
    const [quizAnswered, setQuizAnswered] = useState<number | null>(null);
    const [isQuizCorrect, setIsQuizCorrect] = useState<boolean | null>(null);
    
    // AI Generator State
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiWordCount, setAiWordCount] = useState(20);
    const [aiLevel, setAiLevel] = useState('auto');
    const [isGeneratingList, setIsGeneratingList] = useState(false);
    const [aiGeneratedList, setAiGeneratedList] = useState<VocabularyList | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<string>('');
    
    // Anagram State
    const [anagramLetters, setAnagramLetters] = useState<string[]>([]);
    const [anagramAnswer, setAnagramAnswer] = useState('');
    const [anagramStatus, setAnagramStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');

    // Sentence Scramble State
    const [scrambledWords, setScrambledWords] = useState<string[]>([]);
    const [sentenceAnswer, setSentenceAnswer] = useState<string[]>([]);

    // Spelling Bee & Dictation State
    const [userInput, setUserInput] = useState('');
    const [inputStatus, setInputStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');

    // Guess the Word State
    const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
    const [mistakes, setMistakes] = useState(0);
    const maxMistakes = 6;

    // Pronunciation & Shadowing State
    const [isRecording, setIsRecording] = useState(false);
    const [userTranscript, setUserTranscript] = useState('');
    const [feedback, setFeedback] = useState('');
    const recognitionRef = useRef<any>(null);

    // Word Search State
    const [wordSearchData, setWordSearchData] = useState<WordSearchData | null>(null);
    const [selectedCells, setSelectedCells] = useState<Cell[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    // Crossword State
    const [crosswordData, setCrosswordData] = useState<CrosswordData | null>(null);
    const [userCrosswordGrid, setUserCrosswordGrid] = useState<UserCrosswordGrid>({});
    const [activeCell, setActiveCell] = useState<{ row: number, col: number } | null>(null);
    const [activeClue, setActiveClue] = useState<CrosswordClue | null>(null);
    const [crosswordCorrectWords, setCrosswordCorrectWords] = useState<string[]>([]);

    // Error Correction State
    const [errorCorrectionData, setErrorCorrectionData] = useState<ErrorCorrectionData[]>([]);
    const [userCorrection, setUserCorrection] = useState('');
    const [correctionStatus, setCorrectionStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');

    // Synonym/Antonym State
    const [synonymAntonymData, setSynonymAntonymData] = useState<SynonymAntonymData[]>([]);
    const [saStatus, setSAStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
    const [saSelectedAnswer, setSASelectedAnswer] = useState<string | null>(null);
    
    // Collocations State
    const [collocationsData, setCollocationsData] = useState<CollocationsData[]>([]);
    const [collocationsStatus, setCollocationsStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
    const [collocationsSelected, setCollocationsSelected] = useState<string | null>(null);


    // --- Voice Synthesis Setup ---
    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            if (availableVoices.length > 0) {
                const englishVoices = availableVoices.filter(voice => voice.lang.startsWith('en-'));
                setVoices(englishVoices);
                
                const savedVoiceURI = localStorage.getItem('english-voice-uri');
                const savedVoice = englishVoices.find(v => v.voiceURI === savedVoiceURI);
                
                const defaultUSVoice = englishVoices.find(v => v.lang === 'en-US' && v.name.includes('Google'));
                const defaultUKVoice = englishVoices.find(v => v.lang === 'en-GB' && v.name.includes('Google'));
                const anyDefault = englishVoices.find(v => v.default);
                
                const defaultVoice = savedVoice || defaultUSVoice || defaultUKVoice || anyDefault || englishVoices[0];
                
                if (defaultVoice) {
                    setSelectedVoiceURI(defaultVoice.voiceURI);
                }
            }
        };

        if ('speechSynthesis' in window) {
            loadVoices();
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                 window.speechSynthesis.onvoiceschanged = loadVoices;
            }
        }

        return () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.onvoiceschanged = null;
            }
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    // --- Utility Functions ---
    const shuffleArray = (array: any[]) => [...array].sort(() => Math.random() - 0.5);

    const handlePronounce = (text: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
            if (selectedVoice) utterance.voice = selectedVoice;
            else utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
        } else {
            alert('Text-to-Speech is not supported by your browser.');
        }
    };
    
    const updateWordProgress = (wordId: number, performance: number, listId: number) => {
        setEnglishData(prevData => {
            if (!prevData) return prevData;
            
            updateStreak();

            const newData: EnglishLearningData = JSON.parse(JSON.stringify(prevData));
            const listToUpdate = newData.vocabularyLists.find(l => l.id === listId);
            const wordToUpdate = listToUpdate?.words.find(w => w.id === wordId);

            if (wordToUpdate) {
                const today = new Date().toISOString().split('T')[0];
                const confidence = performance >= 3 ? 'green' : (performance === 2 ? 'yellow' : 'red');
                const newStudyRecord: StudyRecord = { confidence, id: Date.now(), date: today };
                wordToUpdate.studies = [...(wordToUpdate.studies || []), newStudyRecord];
                const srData = enhancedSpacedRepetition.calculateNextReview(wordToUpdate, performance);
                Object.assign(wordToUpdate, srData);
                wordToUpdate.mastered = enhancedSpacedRepetition.getMasteryLevel(wordToUpdate) >= 4;

                const progressToUpdate = newData.userProgress[listId];
                if (progressToUpdate) {
                    if (!progressToUpdate.wordsLearned.includes(wordId)) {
                        progressToUpdate.wordsLearned.push(wordId);
                    }
                    if (wordToUpdate.mastered && !progressToUpdate.wordsMastered.includes(wordId)) {
                        progressToUpdate.wordsMastered.push(wordId);
                    }
                    progressToUpdate.lastStudied = today;
                }
            }
            return newData;
        });
    };
    
    // --- Navigation ---
    const handleSelectList = (list: VocabularyList) => {
        setSelectedList(list);
        setView('listDetail');
    };
    
    const handleBackToLists = () => {
        setSelectedList(null);
        setView('browse');
    };
    
    const resetAllGameStates = () => {
        setGameWords([]);
        setCurrentGameIndex(0);
        setGameScore(0);
        setGameFinished(false);
        setUserInput('');
        setInputStatus('idle');
        setAnagramAnswer('');
        setAnagramLetters([]);
        setAnagramStatus('idle');
        setScrambledWords([]);
        setSentenceAnswer([]);
        setGuessedLetters([]);
        setMistakes(0);
        setMatchingWords([]);
        setMatchingMeanings([]);
        setMatchedPairs([]);
        setSelectedWord(null);
        setSelectedMeaning(null);
        setQuizQuestions([]);
        setWordSearchData(null);
        setSelectedCells([]);
        setCrosswordData(null);
        setUserCrosswordGrid({});
        setActiveCell(null);
        setActiveClue(null);
        setCrosswordCorrectWords([]);
        // Add resets for all other game states here...
    };

    const handleBackToListDetail = () => {
        resetAllGameStates();
        setView('listDetail');
    };
    
    // --- Generic Game Logic ---
    const setupGame = (list: VocabularyList, viewType: EnglishView, numWords = 10) => {
        const words = shuffleArray(list.words).slice(0, numWords);
        setGameWords(words);
        setCurrentGameIndex(0);
        setGameScore(0);
        setGameFinished(false);
        setView(viewType);
        return words;
    };
    
    const nextGameItem = (isCorrect: boolean) => {
        if (isCorrect) {
            setGameScore(prev => prev + 1);
            setTotalXP(prev => prev + 20);
            updateWordProgress(gameWords[currentGameIndex].id, 4, selectedList!.id);
        } else {
             updateWordProgress(gameWords[currentGameIndex].id, 1, selectedList!.id);
        }
        
        setTimeout(() => {
            if (currentGameIndex < gameWords.length - 1) {
                setCurrentGameIndex(prev => prev + 1);
                // Reset states for the next item
                setUserInput('');
                setInputStatus('idle');
                setAnagramAnswer('');
                setAnagramStatus('idle');
                setGuessedLetters([]);
                setMistakes(0);
            } else {
                setGameFinished(true);
            }
        }, 2000);
    };


    // --- AI Content Generation ---
    const generateAIContent = async (prompt: string, isJson = true) => {
        setGameLoadingState({ isLoading: true, message: 'Asking AI for a fun challenge...' });
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const config: any = isJson ? { responseMimeType: "application/json" } : {};
            const response = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: prompt,
                config: {
                  ...config,
                  thinkingConfig: { thinkingBudget: 32768 }
                },
            });
            const text = response.text.trim();
            return isJson ? JSON.parse(text) : text;
        } catch (e) {
            console.error("AI Generation Error:", e);
            alert("Sorry, the AI couldn't generate content for this game. Please try another one.");
            handleBackToListDetail();
            return null;
        } finally {
            setGameLoadingState({ isLoading: false, message: '' });
        }
    };


    // --- Voice Selection ---
     const handleVoiceChange = (uri: string) => {
        setSelectedVoiceURI(uri);
        localStorage.setItem('english-voice-uri', uri);
    };

    // --- Flashcard Logic ---
    const startFlashcards = (list: VocabularyList) => {
        if (list && list.words.length > 0) {
            setSelectedList(list);
            setCurrentCardIndex(0);
            setRevealed(false);
            setIsAwaitingNext(false);
            setSelectedConfidence(null);
            setView('flashcards');
        }
    };

    const exitFlashcardMode = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        handleBackToListDetail();
    };

    const goToNextCard = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (!selectedList) return;

        if (currentCardIndex < selectedList.words.length - 1) {
            setCurrentCardIndex(currentCardIndex + 1);
            setRevealed(false);
            setIsAwaitingNext(false);
            setSelectedConfidence(null);
        } else {
            exitFlashcardMode();
            alert('🎊 Hoàn thành bài học! Làm tốt lắm!');
        }
    };

    const handleConfidenceSelect = (confidence: string) => {
        if (isAwaitingNext || !selectedList || !englishData) return;

        setRevealed(true);
        setSelectedConfidence(confidence);
        setIsAwaitingNext(true);

        const confidenceLevel = confidenceLevels.find(c => c.value === confidence);
        if (!confidenceLevel) return;

        setTotalXP(prev => prev + confidenceLevel.xp);
        updateWordProgress(selectedList.words[currentCardIndex].id, confidenceLevel.performance, selectedList.id);
        
        timeoutRef.current = window.setTimeout(goToNextCard, 4000);
    };
    
    // --- Matching Game Logic ---
    const startMatchingGame = (list: VocabularyList) => {
        const gameWords = shuffleArray(list.words).slice(0, 10);
        setMatchingWords(shuffleArray(gameWords.map(w => ({ id: w.id, word: w.word }))));
        setMatchingMeanings(shuffleArray(gameWords.map(w => ({ id: w.id, meaning: w.meaning }))));
        setMatchedPairs([]);
        setIncorrectPair(null);
        setSelectedWord(null);
        setSelectedMeaning(null);
        setMatchingBonusXP(0);
        setMatchingTime(0);
        setMatchingTimerActive(true);
        setView('matching');
    };

    useEffect(() => {
        let timer: number;
        if (matchingTimerActive) {
            timer = window.setInterval(() => setMatchingTime(prev => prev + 1), 1000);
        }
        return () => clearInterval(timer);
    }, [matchingTimerActive]);

    useEffect(() => {
        if (selectedWord && selectedMeaning) {
            if (selectedWord.id === selectedMeaning.id) {
                setMatchedPairs(prev => [...prev, selectedWord.id]);
                setTotalXP(prev => prev + 15);
                updateWordProgress(selectedWord.id, 3, selectedList!.id);
                setSelectedWord(null);
                setSelectedMeaning(null);
            } else {
                setIncorrectPair([selectedWord.id, selectedMeaning.id]);
                setTimeout(() => {
                    setIncorrectPair(null);
                    setSelectedWord(null);
                    setSelectedMeaning(null);
                }, 1000);
            }
        }
    }, [selectedWord, selectedMeaning, setTotalXP, selectedList, updateWordProgress]);
    
    useEffect(() => {
        if (matchingWords.length > 0 && matchedPairs.length === matchingWords.length) {
            setMatchingTimerActive(false);
            checkAndAwardBadges({ type: 'matching', time: matchingTime });
            let bonus = (matchingTime <= 30) ? 100 : (matchingTime <= 60) ? 50 : 0;
            if (bonus > 0) {
                setTotalXP(prev => prev + bonus);
                setMatchingBonusXP(bonus);
            }
        }
    }, [matchedPairs, matchingWords, matchingTime, checkAndAwardBadges, setTotalXP]);


    // --- Multiple Choice Quiz Logic ---
    const startQuiz = (list: VocabularyList) => {
        const questions = shuffleArray(list.words).slice(0, 10).map(correctWord => {
            const distractors = shuffleArray(list.words.filter(w => w.id !== correctWord.id)).slice(0, 3);
            const options = shuffleArray([correctWord, ...distractors]);
            return {
                question: correctWord.word,
                pronunciation: correctWord.pronunciation,
                options: options.map(o => o.meaning),
                correctAnswer: correctWord.meaning,
                wordId: correctWord.id,
            };
        });
        setQuizQuestions(questions);
        setCurrentGameIndex(0);
        setGameScore(0);
        setQuizAnswered(null);
        setIsQuizCorrect(null);
        setGameFinished(false);
        setView('quiz');
    };

    const handleQuizAnswer = (answer: string, index: number) => {
        if (quizAnswered !== null) return;

        setQuizAnswered(index);
        const currentQuestion = quizQuestions[currentGameIndex];
        const isCorrect = answer === currentQuestion.correctAnswer;
        
        if (isCorrect) {
            setIsQuizCorrect(true);
            setGameScore(prev => prev + 1);
            setTotalXP(prev => prev + 25);
        } else {
            setIsQuizCorrect(false);
        }

        updateWordProgress(currentQuestion.wordId, isCorrect ? 4 : 1, selectedList!.id);

        setTimeout(() => {
            if (currentGameIndex < quizQuestions.length - 1) {
                setCurrentGameIndex(prev => prev + 1);
                setQuizAnswered(null);
                setIsQuizCorrect(null);
            } else {
                checkAndAwardBadges({ type: 'quiz', score: (gameScore + (isCorrect ? 1 : 0)) / quizQuestions.length });
                setGameFinished(true);
            }
        }, 2000);
    };

    // --- Spelling Bee & Dictation Logic ---
    const startSpellingBee = (list: VocabularyList) => {
        const words = setupGame(list, 'spellingBee');
        setTimeout(() => handlePronounce(words[0].word), 500);
    };
    
    const startDictation = (list: VocabularyList) => {
        const words = setupGame(list, 'dictation');
        setTimeout(() => handlePronounce(words[0].example), 500);
    };

    const handleSpellingSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const currentWord = gameWords[currentGameIndex];
        const answer = (view === 'spellingBee') ? currentWord.word : currentWord.example;
        const isCorrect = userInput.trim().toLowerCase() === answer.toLowerCase();
        
        setInputStatus(isCorrect ? 'correct' : 'incorrect');
        nextGameItem(isCorrect);
        if (currentGameIndex < gameWords.length - 1) {
            setTimeout(() => handlePronounce(gameWords[currentGameIndex + 1][view === 'spellingBee' ? 'word' : 'example']), 2500);
        }
    };
    
    // --- Anagram Logic ---
    const startAnagram = (list: VocabularyList) => {
        const words = setupGame(list, 'anagram');
        setAnagramLetters(shuffleArray(words[0].word.split('')));
    };

    const handleAnagramSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const isCorrect = anagramAnswer.toLowerCase() === gameWords[currentGameIndex].word.toLowerCase();
        setAnagramStatus(isCorrect ? 'correct' : 'incorrect');
        nextGameItem(isCorrect);
        if (currentGameIndex < gameWords.length - 1) {
            setAnagramLetters(shuffleArray(gameWords[currentGameIndex + 1].word.split('')));
        }
    };

    // --- Sentence Scramble ---
    const startSentenceScramble = (list: VocabularyList) => {
        const words = setupGame(list, 'sentenceScramble');
        setScrambledWords(shuffleArray(words[0].example.replace(/[.?,!]/g, '').split(' ')));
        setSentenceAnswer([]);
    };

    const handleWordSelect = (word: string, index: number) => {
        setSentenceAnswer(prev => [...prev, word]);
        setScrambledWords(prev => prev.filter((_, i) => i !== index));
    };

    const handleWordDeselect = (word: string, index: number) => {
        setScrambledWords(prev => [...prev, word]);
        setSentenceAnswer(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        if (view === 'sentenceScramble' && gameWords.length > 0) {
            const originalSentence = gameWords[currentGameIndex].example.replace(/[.?,!]/g, '');
            if (sentenceAnswer.join(' ') === originalSentence) {
                nextGameItem(true);
                if (currentGameIndex < gameWords.length - 1) {
                    const nextWord = gameWords[currentGameIndex + 1];
                    setScrambledWords(shuffleArray(nextWord.example.replace(/[.?,!]/g, '').split(' ')));
                    setSentenceAnswer([]);
                }
            }
        }
    }, [sentenceAnswer, view, gameWords, currentGameIndex, nextGameItem]);
    
    // --- Guess the Word ---
    const startGuessTheWord = (list: VocabularyList) => {
        setupGame(list, 'guessTheWord');
    };

    const handleLetterGuess = (letter: string) => {
        if (guessedLetters.includes(letter)) return;
        setGuessedLetters(prev => [...prev, letter]);
        if (!gameWords[currentGameIndex].word.toLowerCase().includes(letter)) {
            setMistakes(prev => prev + 1);
        }
    };
    
    useEffect(() => {
        if (view === 'guessTheWord' && gameWords.length > 0) {
            const currentWord = gameWords[currentGameIndex].word.toLowerCase();
            const won = currentWord.split('').every(letter => guessedLetters.includes(letter));
            const lost = mistakes >= maxMistakes;

            if (won || lost) {
                nextGameItem(won);
            }
        }
    }, [guessedLetters, mistakes, view, gameWords, currentGameIndex, nextGameItem]);
    
    // --- Pronunciation & Shadowing Logic ---
    const analyzePronunciation = async (transcript: string, targetText: string) => {
        setFeedback('AI is analyzing...');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `As an English pronunciation coach, compare the user's speech to the target phrase. Provide concise, helpful feedback.
            - Target: "${targetText}"
            - User said: "${transcript}"
            
            Analyze for clarity, missed words, or phonetic errors. Keep feedback to 1-2 sentences. Example: "Good attempt! You said 'wery' instead of 'very'. Focus on the 'v' sound."`;

            const response = await ai.models.generateContent({model: "gemini-2.5-flash", contents: prompt});
            
            const aiFeedback = response.text;
            const isCorrect = aiFeedback.toLowerCase().includes("good") || aiFeedback.toLowerCase().includes("excellent");
            
            setFeedback(aiFeedback);
            updateWordProgress(gameWords[currentGameIndex].id, isCorrect ? 4 : 2, selectedList!.id);
            if (isCorrect) setTotalXP(p => p + 30);

        } catch (error) {
            console.error("Pronunciation analysis error:", error);
            setFeedback("Couldn't analyze pronunciation. Please try again.");
        }
    };

    const setupSpeechRecognition = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech Recognition is not supported by your browser.");
            return;
        }
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.interimResults = false;
        recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setUserTranscript(transcript);
            setIsRecording(false);
            
            const targetText = view === 'shadowing' ? gameWords[currentGameIndex].example : gameWords[currentGameIndex].word;
            analyzePronunciation(transcript, targetText);
        };
        recognitionRef.current.onerror = (event: any) => {
            console.error("Speech Recognition Error", event.error);
            setFeedback("Sorry, I didn't catch that. Please try again.");
            setIsRecording(false);
        };
    };

    const startPronunciationChallenge = (list: VocabularyList) => {
        setupGame(list, 'pronunciationChallenge');
        setupSpeechRecognition();
    };
    
    const startShadowing = (list: VocabularyList) => {
        setupGame(list, 'shadowing');
        setupSpeechRecognition();
    };

    const toggleRecording = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
        } else {
            setUserTranscript('');
            setFeedback('');
            recognitionRef.current?.start();
            setIsRecording(true);
        }
    };
    
    // --- Word Search Logic ---
    const generateWordSearchGrid = (words: string[], gridSize: number) => {
        const grid: string[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));
        const wordLocations: { [word: string]: { row: number, col: number }[] } = {};

        const directions = [
            { dr: 0, dc: 1 },  // Horizontal
            { dr: 1, dc: 0 },  // Vertical
            { dr: 1, dc: 1 },  // Diagonal down-right
        ];

        words.forEach(word => {
            word = word.toUpperCase();
            let placed = false;
            for (let i = 0; i < 100; i++) { // 100 placement attempts
                const dir = directions[Math.floor(Math.random() * directions.length)];
                const row = Math.floor(Math.random() * gridSize);
                const col = Math.floor(Math.random() * gridSize);

                if (canPlaceWord(word, grid, row, col, dir)) {
                    placeWord(word, grid, row, col, dir, wordLocations);
                    placed = true;
                    break;
                }
            }
        });

        // Fill empty cells
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (grid[r][c] === '') {
                    grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
                }
            }
        }
        return { grid, wordLocations };
    };

    const canPlaceWord = (word: string, grid: string[][], row: number, col: number, dir: { dr: number, dc: number }) => {
        const gridSize = grid.length;
        for (let i = 0; i < word.length; i++) {
            const r = row + i * dir.dr;
            const c = col + i * dir.dc;
            if (r < 0 || r >= gridSize || c < 0 || c >= gridSize || (grid[r][c] !== '' && grid[r][c] !== word[i])) {
                return false;
            }
        }
        return true;
    };
    
    const placeWord = (word: string, grid: string[][], row: number, col: number, dir: { dr: number, dc: number }, locations: any) => {
        locations[word] = [];
        for (let i = 0; i < word.length; i++) {
            const r = row + i * dir.dr;
            const c = col + i * dir.dc;
            grid[r][c] = word[i];
            locations[word].push({ row: r, col: c });
        }
    };
    
    const startWordSearch = (list: VocabularyList) => {
        const words = shuffleArray(list.words).slice(0, 8).map(w => w.word.toUpperCase());
        const { grid, wordLocations } = generateWordSearchGrid(words, 12);
        setWordSearchData({
            grid,
            words: words.map(w => ({ word: w, found: false })),
            wordLocations
        });
        setView('wordSearch');
    };
    
    useEffect(() => {
        if (!isDragging && selectedCells.length > 0 && wordSearchData) {
            const selectedWord = selectedCells.map(c => c.letter).join('');
            const foundWord = wordSearchData.words.find(w => !w.found && (w.word === selectedWord || w.word === selectedWord.split('').reverse().join('')));

            if (foundWord) {
                setWordSearchData(prev => {
                    if (!prev) return null;
                    const newData = { ...prev };
                    const wordToUpdate = newData.words.find(w => w.word === foundWord.word)!;
                    wordToUpdate.found = true;
                    
                    // FIX: Changed 'list' to 'selectedList' to use the correct state variable.
                    const originalWord = selectedList!.words.find(w => w.word.toUpperCase() === foundWord.word)!;
                    setTotalXP(p => p + 30);
                    // FIX: Changed 'list' to 'selectedList' to use the correct state variable.
                    updateWordProgress(originalWord.id, 4, selectedList!.id);

                    return newData;
                });
            }
            setSelectedCells([]);
        }
    // FIX: Added dependencies to useEffect to prevent stale closures and ensure correct behavior.
    }, [isDragging, selectedCells, wordSearchData, selectedList, setTotalXP, updateWordProgress]);

    const handleCellInteraction = (cell: Cell, type: 'start' | 'move' | 'end') => {
        if (type === 'start') {
            setIsDragging(true);
            setSelectedCells([cell]);
        } else if (type === 'move' && isDragging) {
            if (!selectedCells.some(c => c.row === cell.row && c.col === cell.col)) {
                 setSelectedCells(prev => [...prev, cell]);
            }
        } else if (type === 'end') {
            setIsDragging(false);
        }
    };
    
    // --- AI-Powered Games ---
    const startCrossword = async (list: VocabularyList) => {
        const words = shuffleArray(list.words).slice(0, 8);
        const prompt = `Based on this vocabulary list: ${words.map(w => `"${w.word}": "${w.meaning}"`).join(', ')}, create a small crossword puzzle. Output ONLY a valid JSON object with this structure: { "grid": string[][], "clues": { "across": Clue[], "down": Clue[] } }. 'grid' is a 2D array representing the solved puzzle. 'Clue' has: { "number": number, "word": string, "clue": string, "orientation": "across" | "down", "row": number, "col": number }`;
        const data = await generateAIContent(prompt);
        if (data) {
            setCrosswordData(data);
            setView('crossword');
        }
    };
    
    const startErrorCorrection = async (list: VocabularyList) => {
        const words = setupGame(list, 'errorCorrection');
        const prompt = `For each of these English words: ${words.map(w => `"${w.word}"`).join(', ')}, create one sentence that uses the word INCORRECTLY with a common grammar mistake, and provide the CORRECTED version. Output ONLY a valid JSON array of objects: [{ "wordId": number, "incorrectSentence": string, "correctSentence": string }]. Use these IDs: ${words.map(w => w.id).join(', ')}`;
        const data = await generateAIContent(prompt);
        if (data) {
            const mergedData = data.map((item: any) => ({ ...item, word: words.find(w => w.id === item.wordId)?.word }));
            setErrorCorrectionData(mergedData);
        }
    };
    
    const startSynonymAntonym = async (list: VocabularyList) => {
        const words = setupGame(list, 'synonymAntonym', 10);
        const prompt = `For each English word: ${words.map(w => `"${w.word}"`).join(', ')}, provide one synonym, one antonym, and two random distractor words. Output ONLY a valid JSON array: [{ "wordId": number, "word": string, "synonym": string, "antonym": string, "distractors": [string, string] }]. Use these IDs: ${words.map(w => w.id).join(', ')}`;
        const data = await generateAIContent(prompt);
        if (data) {
// FIX: Completed the flatMap function to correctly structure synonym/antonym questions.
            const questions = data.flatMap((item: any) => [
                { wordId: item.wordId, word: item.word, type: 'synonym', options: shuffleArray([item.synonym, ...item.distractors]), correctAnswer: item.synonym },
                { wordId: item.wordId, word: item.word, type: 'antonym', options: shuffleArray([item.antonym, ...item.distractors]), correctAnswer: item.antonym }
            ]);
            setSynonymAntonymData(questions);
        }
    };

    // --- Render Logic ---

    const renderGameContainer = (title: string, children: React.ReactNode) => (
        <div className="max-w-3xl mx-auto">
            <div className={`text-center mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className="text-2xl font-bold">{title}</h2>
                <div className="flex justify-center gap-8 mt-2 text-sm">
                    <span>Score: {gameScore}</span>
                    <span>Question: {currentGameIndex + 1} / {gameWords.length}</span>
                </div>
            </div>
            {gameFinished ? (
                 <div className={`text-center p-8 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <h3 className="text-3xl font-bold mb-4">Game Over!</h3>
                    <p className="text-xl mb-6">Your final score is: <span className="font-bold text-green-500">{gameScore} / {gameWords.length}</span></p>
                    <button onClick={handleBackToListDetail} className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold">Back to List</button>
                </div>
            ) : (
                <div className={`p-8 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    {children}
                </div>
            )}
        </div>
    );


    const renderContent = () => {
        if (!englishData) return <div className="text-center p-8">Loading data...</div>;

        switch (view) {
            case 'browse':
                return (
                    <div>
                        <h2 className="text-3xl font-bold mb-6">Vocabulary Lists</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {englishData.vocabularyLists.map(list => (
                                <button key={list.id} onClick={() => handleSelectList(list)} className={`p-4 rounded-lg text-left ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                    <h3 className="font-bold">{list.name}</h3>
                                    <p className="text-sm opacity-75">{list.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 'listDetail':
                if (!selectedList) return null;
                return (
                    <div>
                        <h2 className="text-3xl font-bold mb-2">{selectedList.name}</h2>
                        <p className="mb-6 opacity-75">{selectedList.description}</p>
                        <h3 className="font-bold mb-2">Study Modes</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <button onClick={() => startFlashcards(selectedList)} className="p-4 rounded-lg bg-blue-500 text-white font-semibold">Flashcards</button>
                            <button onClick={() => startMatchingGame(selectedList)} className="p-4 rounded-lg bg-green-500 text-white font-semibold">Matching</button>
                            <button onClick={() => startQuiz(selectedList)} className="p-4 rounded-lg bg-purple-500 text-white font-semibold">Quiz</button>
                            <button onClick={() => startSpellingBee(selectedList)} className="p-4 rounded-lg bg-yellow-500 text-white font-semibold">Spelling</button>
                        </div>
                        <h3 className="font-bold mb-2">Words in this list ({selectedList.words.length})</h3>
                        <div className="space-y-2">
                             {selectedList.words.map(word => (
                                <div key={word.id} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                                    <p><strong className="font-semibold">{word.word}</strong>: {word.meaning}</p>
                                </div>
                             ))}
                        </div>
                    </div>
                );
            case 'flashcards':
                if (!selectedList) return null;
                const currentWord = selectedList.words[currentCardIndex];
                return (
                    <div className="max-w-2xl mx-auto text-center">
                        <div className={`w-full h-80 rounded-2xl p-8 flex items-center justify-center cursor-pointer transition-transform duration-500 relative [transform-style:preserve-3d] ${revealed ? '[transform:rotateY(180deg)]' : ''} ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
                             onClick={() => setRevealed(!revealed)}
                        >
                            <div className="absolute w-full h-full flex flex-col items-center justify-center [backface-visibility:hidden]">
                                <p className="text-4xl font-bold">{currentWord.word}</p>
                                <p className="mt-2 text-lg opacity-75">/{currentWord.pronunciation}/</p>
                            </div>
                            <div className="absolute w-full h-full flex flex-col items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                                <p className="text-2xl font-semibold">{currentWord.meaning}</p>
                                <p className="mt-4 italic">"{currentWord.example}"</p>
                            </div>
                        </div>
                        
                        {revealed && (
                            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                                {confidenceLevels.map(level => (
                                    <button key={level.value} onClick={() => handleConfidenceSelect(level.value)}
                                            className={`p-4 rounded-lg font-bold bg-opacity-80 hover:bg-opacity-100 text-white`} style={{backgroundColor: level.color}}>
                                        {level.emoji} {level.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'spellingBee':
                return renderGameContainer('Spelling Bee', (
                    <form onSubmit={handleSpellingSubmit}>
                        <p className="text-center mb-4">Listen to the word and spell it correctly.</p>
                        <button type="button" onClick={() => handlePronounce(gameWords[currentGameIndex].word)} className={`mx-auto flex items-center justify-center w-20 h-20 rounded-full mb-6 ${darkMode ? 'bg-blue-800' : 'bg-blue-100'}`}><Volume2 size={32} className="text-blue-500" /></button>
                        <input type="text" value={userInput} onChange={e => setUserInput(e.target.value)} className={`w-full text-center p-3 text-xl rounded-lg border-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'border-gray-300'}`} />
                        <button type="submit" className="mt-4 w-full bg-indigo-500 text-white p-3 rounded-lg font-semibold">Check</button>
                         {inputStatus === 'correct' && <p className="text-green-500 mt-2 text-center">Correct!</p>}
                         {inputStatus === 'incorrect' && <p className="text-red-500 mt-2 text-center">Incorrect. The answer is: {gameWords[currentGameIndex].word}</p>}
                    </form>
                ));
            default:
                return <div>Unhandled view: {view}</div>;
        }
    };
    
    return (
        <div className={`fixed inset-0 z-50 flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
            <header className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 shadow-md flex justify-between items-center`}>
                <div className="flex items-center gap-2">
                    {view !== 'browse' && <button onClick={view === 'listDetail' ? handleBackToLists : handleBackToListDetail}><ChevronLeft size={24} /></button>}
                    <h1 className="text-xl font-bold">{view === 'browse' ? 'English Learning' : selectedList?.name || 'Game'}</h1>
                </div>
                <button onClick={onClose}><X size={24} /></button>
            </header>
            <main className="flex-1 overflow-y-auto p-6">{renderContent()}</main>
        </div>
    );
};