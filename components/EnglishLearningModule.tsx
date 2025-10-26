

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
            const config = isJson ? { responseMimeType: "application/json" } : {};
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config,
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
    const setupSpeechRecognition = () => {
        // FIX: Cast window to `any` to access non-standard SpeechRecognition APIs and prevent TypeScript errors.
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
            
            // Simple check
            const isCorrect = transcript.toLowerCase().includes(targetText.toLowerCase().replace(/[.?,!]/g, ''));
            setFeedback(isCorrect ? "Great job!" : `You said: "${transcript}". Try again!`);
            
            if(isCorrect) {
                setTotalXP(prev => prev + 30);
                updateWordProgress(gameWords[currentGameIndex].id, 4, selectedList!.id);
            } else {
                updateWordProgress(gameWords[currentGameIndex].id, 2, selectedList!.id);
            }
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
                    const newData = { ...prev! };
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
            const questions = data.flatMap((item: any) => [
                { wordId: item.wordId, word: item.word, type: 'synonym', options: shuffleArray([item.synonym, ...item.distractors]), correctAnswer: item.synonym },
                { wordId: item.wordId, word: item.word, type: 'antonym', options: shuffleArray([item.antonym, ...item.distractors]), correctAnswer: item.antonym }
            ]);
            setSynonymAntonymData(shuffleArray(questions));
        }
    };

    const startCollocations = async (list: VocabularyList) => {
        const words = setupGame(list, 'collocations');
        const prompt = `For each English word: ${words.map(w => `"${w.word}"`).join(', ')}, create a fill-in-the-blank sentence that tests a common collocation. Provide 3 incorrect options. Output ONLY a valid JSON array: [{ "wordId": number, "word": string, "sentencePart1": "...", "sentencePart2": "...", "correctAnswer": "collocation word", "options": ["...", "...", "..."] }]. Use these IDs: ${words.map(w => w.id).join(', ')}`;
        const data = await generateAIContent(prompt);
        if (data) {
            const questions = data.map((item: any) => ({
                ...item,
                options: shuffleArray([...item.options, item.correctAnswer])
            }));
            setCollocationsData(questions);
        }
    };
    

    // --- AI Generator Logic ---
    const parseAIVocabularyResponse = (responseText: string) => {
        let analysis = "AI did not provide an analysis.";
        const analysisMatch = responseText.match(/\[ANALYSIS\]([\s\S]*?)\[\/ANALYSIS\]/);
        if (analysisMatch) {
            analysis = analysisMatch[1].trim();
        }

        const lines = responseText.split('\n').filter(line => line.trim() && !line.startsWith('[ANALYSIS]') && !line.endsWith('[/ANALYSIS]'));
        const words: VocabularyWord[] = [];
        lines.forEach(line => {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length === 9) {
                const [word, meaning, pronunciation, example, translation, partOfSpeech, level, difficulty, category] = parts;
                if (word && meaning && example) {
                    words.push({
                        id: Date.now() + Math.random(),
                        word,
                        meaning,
                        pronunciation,
                        example,
                        translation,
                        partOfSpeech,
                        level: level as any,
                        difficulty: difficulty as any,
                        category,
                        mastered: false,
                        studies: [],
                    });
                }
            }
        });
        return { words, analysis };
    };

    const handleGenerateList = async () => {
        if (!aiPrompt.trim()) {
            alert("Please describe what you want to learn.");
            return;
        }
        setIsGeneratingList(true);
        setAiGeneratedList(null);
        setAiAnalysis('');
        try {
            const prompt = `You are an expert English teacher and vocabulary curriculum designer. USER REQUEST: "${aiPrompt}". SETTINGS: Number of words: ${aiWordCount}, Level: ${aiLevel === 'auto' ? 'auto-detect appropriate level' : aiLevel}. TASK: Generate a comprehensive vocabulary list. OUTPUT FORMAT (one word per line): word | Vietnamese meaning | IPA pronunciation | example sentence | Vietnamese translation of example | part of speech | CEFR level | difficulty (easy/medium/hard) | category/topic. REQUIREMENTS: Words must be relevant. Examples must be practical. Accurate translations. Appropriate CEFR level. IMPORTANT: Start your response with a brief analysis of the generated list inside [ANALYSIS]...[/ANALYSIS] tags, then provide the word list. Generate ${aiWordCount} words now:`;
            const responseText = await generateAIContent(prompt, false);

            if (!responseText) throw new Error("AI did not return a valid response.");

            const { words, analysis } = parseAIVocabularyResponse(responseText);

            if (words.length === 0) {
                throw new Error("AI did not return any valid words. Please try a different prompt.");
            }

            const newList: VocabularyList = {
                id: Date.now(),
                name: `AI: ${aiPrompt.substring(0, 20)}...`,
                description: `A custom list generated for: "${aiPrompt}"`,
                icon: "🤖",
                level: "Mixed",
                category: "ai-generated",
                totalWords: words.length,
                words: words,
                isAI: true,
            };

            setAiGeneratedList(newList);
            setAiAnalysis(analysis);
            setView('aiResult');

        } catch (error) {
            console.error("AI Generation Error:", error);
            alert("An error occurred while generating the list. Please try again.");
        } finally {
            setIsGeneratingList(false);
        }
    };
    
    const handleSaveAIList = () => {
        if (!aiGeneratedList || !englishData) return;

        setEnglishData(prevData => {
            if (!prevData) return prevData;
            
            const newData = { ...prevData };
            newData.vocabularyLists.push(aiGeneratedList);
            newData.userProgress[aiGeneratedList.id] = {
                wordsLearned: [],
                wordsMastered: [],
                totalWords: aiGeneratedList.totalWords,
            };
            newData.unlockedLists.push(aiGeneratedList.id);
            return newData;
        });

        checkAndAwardBadges();
        handleSelectList(aiGeneratedList);
    };

    // --- RENDER FUNCTIONS ---
    const renderBrowseScreen = () => {
        if (!englishData) return null;
        
        return (
             <div className="max-w-7xl mx-auto w-full p-6">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold">English Vocabulary 🇬🇧</h2>
                    <button onClick={() => setView('aiGenerator')} className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-2 px-4 rounded-lg hover:scale-105 transition-transform">
                        <Sparkles size={16}/> Create with AI ✨
                    </button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {englishData.vocabularyLists.map((list) => {
                        const progress = englishData.userProgress[list.id];
                        const learnedPercent = progress ? (progress.wordsLearned.length / progress.totalWords) * 100 : 0;
                        const isUnlocked = englishData.unlockedLists.includes(list.id);

                        return (
                            <div key={list.id} className={`rounded-2xl shadow-lg flex flex-col transition-all duration-300 ${isUnlocked ? (darkMode ? 'bg-gray-800' : 'bg-white') : (darkMode ? 'bg-gray-800/50' : 'bg-gray-100')} ${!isUnlocked && 'filter grayscale opacity-60'}`}>
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`text-6xl ${!isUnlocked && 'opacity-50'}`}>{list.icon}</div>
                                        {isUnlocked ? (
                                             <span className={`px-3 py-1 text-xs font-semibold rounded-full ${list.isAI ? (darkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-800') : (darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800')}`}>
                                                {list.isAI ? 'AI' : list.level}
                                            </span>
                                        ) : (
                                            <div className="p-2 bg-gray-500 rounded-full"><Lock size={16} className="text-white"/></div>
                                        )}
                                    </div>
                                    <h3 className={`text-xl font-bold mb-2 ${!isUnlocked && 'opacity-50'}`}>{list.name}</h3>
                                    <p className={`text-sm mb-4 h-10 ${darkMode ? 'text-gray-400' : 'text-gray-600'} ${!isUnlocked && 'opacity-50'}`}>{list.description}</p>
                                    <div className={`w-full rounded-full h-2.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                        <div className="bg-green-500 h-2.5 rounded-full" style={{width: `${learnedPercent}%`}}></div>
                                    </div>
                                    <p className={`text-xs text-right mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{progress.wordsLearned.length} / {progress.totalWords} learned</p>
                                </div>
                                <div className={`mt-auto p-4 ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-b-2xl`}>
                                    <button
                                        onClick={() => handleSelectList(list)}
                                        disabled={!isUnlocked}
                                        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition"
                                    >
                                        <Play size={16} /> {progress?.wordsLearned.length > 0 ? 'Continue' : 'Start Learning'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                 </div>
             </div>
        )
    };
    
    const GameWrapper = ({ title, children, onExit }: { title: string, children: React.ReactNode, onExit: () => void }) => (
        <div className={`p-4 sm:p-6 flex flex-col items-center justify-center min-h-full ${darkMode ? 'bg-gray-800' : 'bg-blue-50'}`}>
            <div className={`w-full max-w-2xl`}>
                 <div className={`mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow-lg`}>
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-2xl font-bold">{title}</h2>
                        <button onClick={onExit} className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-red-600 hover:text-red-800'}`}><X size={28} /></button>
                    </div>
                    {!gameFinished && (
                         <>
                         <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                            <div className="bg-green-600 h-full rounded-full transition-all" style={{ width: `${((currentGameIndex + 1) / gameWords.length) * 100}%` }}></div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500">
                           <span>Câu {currentGameIndex + 1} / {gameWords.length}</span>
                           <span>Điểm: {gameScore}</span>
                        </div>
                        </>
                    )}
                </div>
                 <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} p-6 rounded-2xl shadow-xl`}>
                    {gameFinished ? (
                         <div className="text-center py-8">
                            <h3 className="text-3xl font-bold text-green-500 mb-4">Hoàn thành!</h3>
                            <p className="text-2xl mb-2">Điểm của bạn: <span className="font-bold">{gameScore} / {gameWords.length}</span></p>
                            <p className="text-lg mb-6">Bạn nhận được <span className="font-bold text-yellow-500">{gameScore * 20} XP!</span></p>
                            <button onClick={onExit} className="bg-blue-500 text-white px-6 py-3 rounded-lg font-bold">Quay lại</button>
                         </div>
                    ) : children}
                 </div>
            </div>
        </div>
    );
    
    const renderListDetailScreen = () => {
        if (!selectedList || !englishData) return null;
        const progress = englishData.userProgress[selectedList.id];
        const learnedPercent = progress ? (progress.wordsLearned.length / progress.totalWords) * 100 : 0;
        
        const allLearningModes = [
            // Core
            { id: 'flashcards', name: 'Flashcards', description: 'Ôn tập từ vựng cốt lõi.', icon: BookOpen, action: () => startFlashcards(selectedList), category: 'Core', disabled: false },
            { id: 'quiz', name: 'Quiz', description: 'Kiểm tra kiến thức trắc nghiệm.', icon: Lightbulb, action: () => startQuiz(selectedList), category: 'Core', disabled: false },
             // Games
            { id: 'memory_cards', name: 'Memory Cards', description: 'Ghép từ với nghĩa của chúng.', icon: Copy, action: () => startMatchingGame(selectedList), category: 'Games', disabled: false },
            { id: 'word_search', name: 'Word Search', description: 'Tìm từ vựng trong lưới chữ.', icon: Search, action: () => startWordSearch(selectedList), category: 'Games', disabled: false },
            { id: 'crossword', name: 'Crossword', description: 'Giải ô chữ với các từ đã học.', icon: Puzzle, action: () => startCrossword(selectedList), category: 'Games', disabled: false },
            { id: 'pronunciation_challenge', name: 'Pronunciation', description: 'So sánh phát âm với AI.', icon: Mic, action: () => startPronunciationChallenge(selectedList), category: 'Games', disabled: false },
            { id: 'spelling_bee', name: 'Spelling Bee', description: 'Luyện tập chính tả.', icon: SpellCheck, action: () => startSpellingBee(selectedList), category: 'Games', disabled: false },
            { id: 'anagrams', name: 'Anagrams', description: 'Sắp xếp lại các chữ cái.', icon: Shuffle, action: () => startAnagram(selectedList), category: 'Games', disabled: false },
            { id: 'guess_the_word', name: 'Guess the Word', description: 'Đoán từ dựa trên gợi ý.', icon: HelpCircle, action: () => startGuessTheWord(selectedList), category: 'Games', disabled: false },
            { id: 'word_shooting', name: 'Word Shooting', description: 'Bắn từ đúng theo nghĩa.', icon: Crosshair, category: 'Games', disabled: true },
            // Practice
            { id: 'sentence_scramble', name: 'Sentence Scramble', description: 'Sắp xếp câu đúng thứ tự.', icon: Combine, action: () => startSentenceScramble(selectedList), category: 'Practice', disabled: false },
            { id: 'dictation', name: 'Dictation', description: 'Nghe và viết lại câu.', icon: PenSquare, action: () => startDictation(selectedList), category: 'Practice', disabled: false },
            { id: 'shadowing', name: 'Shadowing', description: 'Lặp lại theo người bản xứ.', icon: Voicemail, action: () => startShadowing(selectedList), category: 'Practice', disabled: false },
            { id: 'error_correction', name: 'Error Correction', description: 'Tìm và sửa lỗi sai trong câu.', icon: CheckCircle2, action: () => startErrorCorrection(selectedList), category: 'Practice', disabled: false },
            { id: 'collocations', name: 'Collocations', description: 'Học các cụm từ đi liền nhau.', icon: Link, action: () => startCollocations(selectedList), category: 'Practice', disabled: false },
            { id: 'synonym_antonym', name: 'Synonym/Antonym', description: 'Tìm từ đồng nghĩa/trái nghĩa.', icon: ArrowRightLeft, action: () => startSynonymAntonym(selectedList), category: 'Practice', disabled: false },
            { id: 'role_play', name: 'Role-Play', description: 'Thực hành hội thoại theo tình huống.', icon: Users, category: 'Practice', disabled: true },
            { id: 'phrasal_verbs', name: 'Phrasal Verbs', description: 'Luyện tập các cụm động từ.', icon: Milestone, category: 'Practice', disabled: true },
            // Advanced
            { id: 'reading_comprehension', name: 'Reading Comprehension', description: 'Đọc hiểu đoạn văn.', icon: FileText, category: 'Advanced', disabled: true },
            { id: 'audio_stories', name: 'Audio Stories', description: 'Nghe truyện ngắn và trả lời câu hỏi.', icon: AudioLines, category: 'Advanced', disabled: true },
            { id: 'image_description', name: 'Image Description', description: 'Mô tả hình ảnh bằng tiếng Anh.', icon: Image, category: 'Advanced', disabled: true },
            { id: 'video_lessons', name: 'Video Lessons', description: 'Học qua các bài giảng video.', icon: Youtube, category: 'Advanced', disabled: true },
            { id: 'ai_chat', name: 'AI Chat', description: 'Trò chuyện với AI về chủ đề.', icon: Bot, category: 'Advanced', disabled: true },
            { id: 'graded_reading', name: 'GradedReading', description: 'Đọc các bài báo được phân cấp.', icon: BookCopy, category: 'Advanced', disabled: true },
            { id: 'progress_tracking', name: 'Progress Tracking', description: 'Xem biểu đồ tiến độ chi tiết.', icon: TrendingUp, category: 'Advanced', disabled: true },
            { id: 'daily_goals', name: 'Daily Goals', description: 'Đặt và theo dõi mục tiêu hàng ngày.', icon: CalendarCheck, category: 'Advanced', disabled: true },
            { id: 'review_manager', name: 'Review Manager', description: 'Quản lý lịch trình ôn tập.', icon: RefreshCw, category: 'Advanced', disabled: true },
            { id: 'topic_maps', name: 'Topic Maps', description: 'Khám phá các từ liên quan.', icon: Map, category: 'Advanced', disabled: true },
            { id: 'study_plan', name: 'Study Plan', description: 'Tạo kế hoạch học tập cá nhân.', icon: CalendarDays, category: 'Advanced', disabled: true },
        ];
        // ... rest of the function
    };
    
    // ... many more render functions for games
    
    const renderAIResultScreen = () => {
        // ...
    }
    
    const renderAIGeneratorScreen = () => {
        // ...
    }

    const renderGameLoadingScreen = () => {
        // ...
    }
    
    // --- RENDER LOGIC ---
    if (gameLoadingState.isLoading) {
        return renderGameLoadingScreen();
    }

    switch (view) {
        case 'browse':
            return renderBrowseScreen();
        case 'listDetail':
            return renderListDetailScreen();
        case 'flashcards':
            if (!selectedList) return handleBackToListDetail();
            const currentCard = selectedList.words[currentCardIndex];
            const progress = ((currentCardIndex + 1) / selectedList.words.length) * 100;
            return (
                 <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100'} p-6 flex items-center justify-center`}>
                    <div className="w-full max-w-3xl">
                        {/* Header */}
                        <div className={`mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow-lg`}>
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="text-2xl font-bold">{selectedList?.name}</h2>
                                <button onClick={exitFlashcardMode} className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-red-600 hover:text-red-800'}`}><X size={28} /></button>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3"><div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: progress + '%' }}></div></div>
                            <p className="text-sm text-gray-500 mt-2">Từ {currentCardIndex + 1} / {selectedList.words.length}</p>
                        </div>
                        {/* Card */}
                        <div className={`relative mb-8 p-12 rounded-2xl shadow-2xl min-h-[24rem] flex flex-col items-center justify-center transition-transform duration-500 ${revealed ? 'transform [rotateY(180deg)]' : ''}`}>
                            {/* Front of Card */}
                            <div className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-12 rounded-2xl backface-hidden ${darkMode ? 'bg-gradient-to-br from-blue-900 to-indigo-900 border-indigo-600 text-white' : 'bg-gradient-to-br from-blue-600 to-indigo-700 border-4 border-indigo-800 text-white'}`}>
                                 <p className="text-sm uppercase opacity-75 mb-4">Mặt trước</p>
                                 <h3 className="text-5xl font-bold">{currentCard.word}</h3>
                                 <p className="mt-4 text-xl opacity-80">/{currentCard.pronunciation}/</p>
                                  <button onClick={(e) => handlePronounce(currentCard.word, e)} className="mt-6 p-3 bg-white/20 rounded-full hover:bg-white/30 transition">
                                     <Volume2 size={24} />
                                 </button>
                            </div>
                             {/* Back of Card */}
                            <div className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-12 rounded-2xl backface-hidden transform [rotateY(180deg)] ${darkMode ? 'bg-gradient-to-br from-green-900 to-green-800 border-green-600' : 'bg-gradient-to-br from-green-100 to-green-50 border-4 border-green-400'}`}>
                                 <p className={`text-sm uppercase mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Mặt sau</p>
                                 <h4 className="text-3xl font-bold mb-2">{currentCard.meaning}</h4>
                                 <p className="italic text-lg mb-4">({currentCard.partOfSpeech})</p>
                                 <p className="text-center">{currentCard.example}</p>
                                 <p className="text-center text-sm opacity-70 mt-1">{currentCard.translation}</p>
                            </div>
                        </div>
                         {/* Controls */}
                        <div className="h-36 flex items-center justify-center">
                            {!revealed ? (
                                <button onClick={() => setRevealed(true)} className={`inline-flex items-center gap-3 px-10 py-4 rounded-lg font-bold text-lg transition shadow-xl transform hover:scale-105 ${darkMode ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-yellow-400 hover:bg-yellow-500 text-black'}`}>
                                    Lật thẻ
                                </button>
                            ) : isAwaitingNext ? (
                                <button onClick={goToNextCard} className={`inline-flex items-center gap-3 px-10 py-4 rounded-lg font-bold text-lg transition shadow-xl transform hover:scale-105 ${darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} animate-pulse`}>
                                    Tiếp theo <ChevronRight size={24} />
                                </button>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                                    {confidenceLevels.map((level) => (
                                        <button key={level.value} onClick={() => handleConfidenceSelect(level.value)} className={`p-4 rounded-lg font-bold text-lg transition ${level.color} flex flex-col items-center justify-center space-y-2 h-32 hover:scale-105 transform ${selectedConfidence === level.value ? 'ring-4 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-900' : ''}`}>
                                            <span className="text-4xl">{level.emoji}</span>
                                            <span>{level.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                 </div>
            );
        case 'matching':
            // ...
        case 'quiz':
            // ...
        case 'aiGenerator':
            return renderAIGeneratorScreen();
        case 'aiResult':
            return renderAIResultScreen();
    }

    // FIX: Added a default return to satisfy the React.FC type, which requires a ReactNode to be returned.
    return null;
};

export default EnglishLearningModule;
