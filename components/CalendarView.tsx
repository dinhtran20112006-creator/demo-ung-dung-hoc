import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Brain } from 'lucide-react';

// Interfaces should be imported from a central types file if they exist
interface Topic {
    id: number;
    question: string;
    dueDate?: string;
    stability?: number;
}
interface Chapter {
    id: number;
    name: string;
    topics: Topic[];
}
interface Subject {
    id: number;
    name: string;
    chapters: Chapter[];
}

interface CalendarViewProps {
    subjects: Subject[];
    darkMode: boolean;
    onClose: () => void;
    getWeakestTopics: (subject: Subject, count?: number) => Topic[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ subjects, darkMode, onClose, getWeakestTopics }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const { scheduledTopics, suggestedTopics } = useMemo(() => {
        const schedule: { [key: string]: (Topic & { subjectName: string; chapterName: string })[] } = {};
        const suggestions: (Topic & { subjectName: string; chapterName: string })[] = [];

        subjects.forEach(subject => {
             // Get due topics
            subject.chapters.forEach(chapter => {
                chapter.topics.forEach(topic => {
                    if (topic.dueDate) {
                        if (!schedule[topic.dueDate]) {
                            schedule[topic.dueDate] = [];
                        }
                        schedule[topic.dueDate].push({
                            ...topic,
                            subjectName: subject.name,
                            chapterName: chapter.name,
                        });
                    }
                });
            });
            // Get suggested weakest topics per subject
             const weakest = getWeakestTopics(subject, 3); // Get top 3 weakest
             weakest.forEach(topic => {
                const chapter = subject.chapters.find(c => c.topics.some(t => t.id === topic.id));
                if(chapter) {
                    suggestions.push({
                        ...topic,
                        subjectName: subject.name,
                        chapterName: chapter.name
                    })
                }
             })

        });
        return { scheduledTopics: schedule, suggestedTopics: suggestions };
    }, [subjects, getWeakestTopics]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const renderHeader = () => {
        const monthFormat = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' });
        return (
            <div className="flex justify-between items-center mb-4">
                <button onClick={handlePrevMonth} className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}><ChevronLeft size={20} /></button>
                <h2 className="text-lg font-semibold">{monthFormat.format(currentDate)}</h2>
                <button onClick={handleNextMonth} className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}><ChevronRight size={20} /></button>
            </div>
        );
    };

    const renderDaysOfWeek = () => {
        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        return (
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-gray-500">
                {days.map(day => <div key={day}>{day}</div>)}
            </div>
        );
    };

    const renderCalendarGrid = () => {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="w-full h-12"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateString = date.toISOString().split('T')[0];
            const hasTopics = scheduledTopics[dateString]?.length > 0;
            const isToday = date.getTime() === today.getTime();
            const isSelected = selectedDate === dateString;

            days.push(
                <div key={day} className="flex justify-center items-center">
                    <button
                        onClick={() => setSelectedDate(dateString)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors relative
                            ${isToday ? (darkMode ? 'bg-indigo-700 text-white' : 'bg-indigo-500 text-white') : ''}
                            ${isSelected ? (darkMode ? 'ring-2 ring-indigo-400' : 'ring-2 ring-indigo-500') : ''}
                            ${!isToday && !isSelected ? (darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100') : ''}
                        `}
                    >
                        {day}
                        {hasTopics && <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-red-500'}`}></div>}
                    </button>
                </div>
            );
        }

        return <div className="grid grid-cols-7 gap-2 mt-2">{days}</div>;
    };
    
    const topicsForSelectedDay = selectedDate ? scheduledTopics[selectedDate] : [];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className={`rounded-2xl max-w-4xl w-full flex overflow-hidden shadow-2xl ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`} style={{ height: '600px' }}>
                {/* Calendar Panel */}
                <div className="w-1/2 p-6 border-r flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Lịch ôn tập</h2>
                         <button onClick={onClose} className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}>
                            <X size={24} />
                        </button>
                    </div>
                    {renderHeader()}
                    {renderDaysOfWeek()}
                    {renderCalendarGrid()}
                </div>

                {/* Details Panel */}
                <div className={`w-1/2 p-6 flex flex-col ${darkMode ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                    <h3 className="text-xl font-bold mb-4">
                        {selectedDate ? `Câu hỏi ôn tập ngày ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('vi-VN')}` : "Gợi ý & Lịch trình"}
                    </h3>
                    <div className="flex-1 overflow-y-auto pr-2">
                        {selectedDate ? (
                             topicsForSelectedDay && topicsForSelectedDay.length > 0 ? (
                                <ul className="space-y-3">
                                    {topicsForSelectedDay.map(topic => (
                                        <li key={topic.id} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white border'}`}>
                                            <p className="font-semibold text-sm">{topic.question}</p>
                                            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{topic.subjectName} &gt; {topic.chapterName}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center pt-16">
                                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Không có câu hỏi nào cần ôn tập vào ngày này.</p>
                                </div>
                            )
                        ) : (
                            <div>
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <Brain size={16} className="text-purple-500" />
                                    AI gợi ý ôn tập (Điểm yếu nhất)
                                </h4>
                                {suggestedTopics.length > 0 ? (
                                    <ul className="space-y-2">
                                    {suggestedTopics.map(topic => (
                                        <li key={topic.id} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white border'}`}>
                                            <p className="font-semibold text-sm">{topic.question}</p>
                                            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{topic.subjectName} &gt; {topic.chapterName}</p>
                                        </li>
                                    ))}
                                    </ul>
                                ) : (
                                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tuyệt vời! Không có điểm yếu nào được phát hiện.</p>
                                )}
                                <p className="text-center text-sm mt-8 text-gray-500">Hoặc chọn một ngày trên lịch để xem lịch trình.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarView;