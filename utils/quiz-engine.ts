import type { Subject, Topic, QuizConfig, QuizSession, QuizQuestion, UserAnswer, QuizResult, QuestionType } from '../interfaces/quiz';

export class QuizEngine {
  private sessions: Map<string, QuizSession> = new Map();
  private questionPools: Map<number, QuizQuestion[]> = new Map();

  constructor(private subjects: Subject[]) {
    this.initializeQuestionPools();
  }

  private initializeQuestionPools() {
    this.subjects.forEach(subject => {
      subject.chapters.forEach(chapter => {
        const pool: QuizQuestion[] = [];
        
        chapter.topics.forEach(topic => {
          // Convert topics to multiple question types
          pool.push(...this.convertTopicToQuestions(topic, chapter.id));
        });
        
        this.questionPools.set(chapter.id, pool);
      });
    });
  }

  private convertTopicToQuestions(topic: Topic, chapterId: number): QuizQuestion[] {
    const questions: QuizQuestion[] = [];
    const baseId = `${topic.id}-${Date.now()}`;

    // Multiple Choice
    if (topic.answer.length < 100) {
      questions.push({
        id: `${baseId}-mc`,
        type: 'multiple-choice',
        question: topic.question,
        options: this.generateDistractors(topic.answer, topic.difficulty as string),
        correctAnswer: topic.answer,
        explanation: `Dựa trên: ${topic.question}`,
        difficulty: (topic.difficulty as any) || 'medium',
        points: this.getPointsForDifficulty(topic.difficulty as any),
        timeAllotted: this.getTimeForDifficulty(topic.difficulty as any),
        topicId: topic.id
      });
    }

    // True/False
    if (this.isSuitableForTrueFalse(topic)) {
      questions.push({
        id: `${baseId}-tf`,
        type: 'true-false',
        question: `Đúng hay Sai: ${topic.question}`,
        options: ['Đúng', 'Sai'],
        correctAnswer: 'Đúng',
        explanation: topic.answer,
        difficulty: 'easy',
        points: 10,
        timeAllotted: 30,
        topicId: topic.id
      });
    }

    // Fill in the Blank
    const fillBlankQuestion = this.createFillBlankQuestion(topic);
    if (fillBlankQuestion) {
      questions.push(fillBlankQuestion);
    }

    // Short Answer
    questions.push({
      id: `${baseId}-sa`,
      type: 'short-answer',
      question: `Giải thích ngắn gọn: ${topic.question}`,
      correctAnswer: topic.answer,
      explanation: `Câu trả lời đầy đủ: ${topic.answer}`,
      difficulty: (topic.difficulty as any) || 'medium',
      points: this.getPointsForDifficulty(topic.difficulty as any) * 1.5,
      timeAllotted: this.getTimeForDifficulty(topic.difficulty as any) * 1.5,
      topicId: topic.id
    });

    return questions;
  }

  private generateDistractors(correctAnswer: string, difficulty?: string): string[] {
    const distractors: string[] = [];
    
    if (difficulty === 'easy') {
      distractors.push(
        this.modifyAnswer(correctAnswer, 'remove'),
        this.modifyAnswer(correctAnswer, 'change'),
        'Không có đáp án nào ở trên'
      );
    } else if (difficulty === 'medium') {
      distractors.push(
        this.modifyAnswer(correctAnswer, 'reverse'),
        this.createPlausibleWrongAnswer(correctAnswer),
        'Tất cả đều đúng'
      );
    } else {
      distractors.push(
        this.createAdvancedDistractor(correctAnswer),
        this.createOppositeAnswer(correctAnswer),
        'Cả A và B đều đúng'
      );
    }

    const allOptions = [correctAnswer, ...distractors]
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort(() => Math.random() - 0.5);

    return allOptions.slice(0, 4);
  }

  private modifyAnswer(answer: string, type: 'remove' | 'change' | 'reverse'): string {
    const words = answer.split(' ');
    switch (type) {
      case 'remove':
        return words.slice(1).join(' ') || answer;
      case 'change':
        return words.map(word => 
          word.length > 3 ? word.slice(0, -1) + 'x' : word
        ).join(' ');
      case 'reverse':
        return words.reverse().join(' ');
      default:
        return answer;
    }
  }

  private createPlausibleWrongAnswer(correctAnswer: string): string {
    const wrongAnswers = [
      'Không hoàn toàn chính xác',
      'Chỉ đúng một phần',
      'Thiếu thông tin quan trọng',
      'Quá đơn giản hóa'
    ];
    return wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)];
  }

  private createAdvancedDistractor(correctAnswer: string): string {
    return `Một quan điểm khác: ${correctAnswer.split(' ').slice(0, 3).join(' ')}...`;
  }

  private createOppositeAnswer(correctAnswer: string): string {
    const opposites: {[key: string]: string} = {
      'đúng': 'sai',
      'có': 'không',
      'tăng': 'giảm',
      'cao': 'thấp',
      'nhanh': 'chậm'
    };
    
    let oppositeAnswer = correctAnswer;
    Object.keys(opposites).forEach(key => {
      if (correctAnswer.toLowerCase().includes(key)) {
        oppositeAnswer = correctAnswer.replace(new RegExp(key, 'gi'), opposites[key]);
      }
    });
    
    return oppositeAnswer !== correctAnswer ? oppositeAnswer : 'Ngược lại với ' + correctAnswer;
  }

  private isSuitableForTrueFalse(topic: Topic): boolean {
    return topic.answer.length < 100 && 
           !topic.answer.includes('?') && 
           topic.question.length < 150;
  }

  private createFillBlankQuestion(topic: Topic): QuizQuestion | null {
    try {
      const words = topic.answer.split(' ');
      if (words.length < 3) return null;

      const importantWords = words.filter(word => word.length > 4);
      if (importantWords.length === 0) return null;

      const targetWord = importantWords[Math.floor(Math.random() * importantWords.length)];
      const blankedAnswer = topic.answer.replace(targetWord, '______');

      return {
        id: `${topic.id}-fill-${Date.now()}`,
        type: 'fill-blank',
        question: `Hoàn thành câu sau: "${blankedAnswer}"`,
        correctAnswer: targetWord,
        explanation: `Đáp án đúng là: "${targetWord}" - ${topic.answer}`,
        difficulty: (topic.difficulty as any) || 'medium',
        points: this.getPointsForDifficulty(topic.difficulty as any),
        timeAllotted: this.getTimeForDifficulty(topic.difficulty as any),
        topicId: topic.id
      };
    } catch (error) {
      return null;
    }
  }

  private getPointsForDifficulty(difficulty: string): number {
    const points: { [key: string]: number } = {
      'easy': 10,
      'medium': 15,
      'hard': 25
    };
    return points[difficulty] || 10;
  }

  private getTimeForDifficulty(difficulty: string): number {
    const times: { [key: string]: number } = {
      'easy': 45,
      'medium': 60,
      'hard': 90
    };
    return times[difficulty] || 60;
  }

  public createQuiz(config: QuizConfig): QuizSession {
    const questions = this.selectQuestions(config);
    const session: QuizSession = {
      id: `quiz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      config,
      questions,
      userAnswers: [],
      startTime: new Date(),
      currentQuestionIndex: 0,
      status: 'active',
      score: 0,
      streak: 0,
      maxStreak: 0,
      timeSpent: 0
    };

    this.sessions.set(session.id, session);
    return session;
  }

  private selectQuestions(config: QuizConfig): QuizQuestion[] {
    let pool: QuizQuestion[] = [];
    
    config.chapterIds.forEach(chapterId => {
      const chapterPool = this.questionPools.get(chapterId) || [];
      pool = [...pool, ...chapterPool];
    });

    pool = pool.filter(q => config.questionTypes.includes(q.type));
    pool = pool.filter(q => config.difficulties.includes(q.difficulty));
    pool = pool.sort(() => Math.random() - 0.5).slice(0, config.questionCount);
    
    return pool;
  }

  public submitAnswer(sessionId: string, questionId: string, userAnswer: string, timeSpent: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !questionId) return false;

    const question = session.questions.find(q => q.id === questionId);
    if (!question) return false;

    const isCorrect = this.evaluateAnswer(question, userAnswer);
    let pointsEarned = isCorrect ? question.points : 0;

    // Update streak
    if (isCorrect) {
      session.streak++;
      session.maxStreak = Math.max(session.maxStreak, session.streak);
    } else {
      session.streak = 0;
    }

    // Apply penalties
    if (!isCorrect && session.config.scoring.penaltyForWrong) {
      session.score = Math.max(0, session.score - question.points * 0.5);
    } else {
      session.score += pointsEarned;
    }

    // Streak bonus
    if (isCorrect && session.config.scoring.streakBonus && session.streak >= 3) {
      session.score += Math.floor(session.streak / 3) * 5;
    }

    const userAnswerObj: UserAnswer = {
      questionId,
      userAnswer,
      isCorrect,
      timeSpent,
      timestamp: new Date()
    };

    session.userAnswers.push(userAnswerObj);
    session.timeSpent += timeSpent;

    return isCorrect;
  }

  private evaluateAnswer(question: QuizQuestion, userAnswer: string): boolean {
    if (!userAnswer) return false;

    switch (question.type) {
      case 'multiple-choice':
      case 'true-false':
        return userAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
      
      case 'fill-blank':
      case 'short-answer':
        return this.evaluateTextAnswer(question.correctAnswer, userAnswer);
      
      default:
        return userAnswer === question.correctAnswer;
    }
  }

  private evaluateTextAnswer(correctAnswer: string, userAnswer: string): boolean {
    const correct = correctAnswer.toLowerCase().trim();
    const user = userAnswer.toLowerCase().trim();
    
    if (correct === user) return true;
    
    const keywords = correct.split(' ').filter(word => word.length > 3);
    const matches = keywords.filter(keyword => user.includes(keyword));
    
    return matches.length >= Math.ceil(keywords.length * 0.6);
  }

  public completeQuiz(sessionId: string): QuizResult {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.status = 'completed';
    session.endTime = new Date();

    return this.calculateResult(session);
  }

  private calculateResult(session: QuizSession): QuizResult {
    const totalQuestions = session.questions.length;
    const correctAnswers = session.userAnswers.filter(a => a.isCorrect).length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const averageTime = totalQuestions > 0 ? session.timeSpent / totalQuestions : 0;

    const byType: any = {};
    const byDifficulty: any = {};

    session.questions.forEach(question => {
      const userAnswer = session.userAnswers.find(a => a.questionId === question.id);
      const isCorrect = userAnswer?.isCorrect || false;

      if (!byType[question.type]) {
        byType[question.type] = { correct: 0, total: 0, accuracy: 0 };
      }
      byType[question.type].total++;
      if (isCorrect) byType[question.type].correct++;

      if (!byDifficulty[question.difficulty]) {
        byDifficulty[question.difficulty] = { correct: 0, total: 0, accuracy: 0 };
      }
      byDifficulty[question.difficulty].total++;
      if (isCorrect) byDifficulty[question.difficulty].correct++;
    });

    Object.keys(byType).forEach(type => {
      byType[type].accuracy = byType[type].total > 0 ? (byType[type].correct / byType[type].total) * 100 : 0;
    });
    
    Object.keys(byDifficulty).forEach(diff => {
      byDifficulty[diff].accuracy = byDifficulty[diff].total > 0 ? (byDifficulty[diff].correct / byDifficulty[diff].total) * 100 : 0;
    });

    const strengths = this.identifyStrengths(byType, byDifficulty);
    const weaknesses = this.identifyWeaknesses(byType, byDifficulty);
    const recommendations = this.generateRecommendations(strengths, weaknesses, accuracy);
    const rank = this.calculateRank(accuracy);
    const badgesEarned = this.awardBadges(session);

    return {
      session,
      totalScore: session.score,
      maxPossibleScore: session.questions.reduce((sum, q) => sum + q.points, 0),
      accuracy,
      averageTimePerQuestion: averageTime,
      categoryBreakdown: { byType, byDifficulty },
      strengths,
      weaknesses,
      recommendations,
      rank,
      badgesEarned
    };
  }

  private identifyStrengths(byType: any, byDifficulty: any): string[] {
    const strengths: string[] = [];
    
    Object.entries(byType).forEach(([type, data]: [string, any]) => {
      if (data.accuracy >= 80) {
        strengths.push(`Xuất sắc với câu hỏi ${this.getQuestionTypeLabel(type)}`);
      }
    });
    
    Object.entries(byDifficulty).forEach(([diff, data]: [string, any]) => {
      if (data.accuracy >= 80) {
        strengths.push(`Làm tốt với câu hỏi ${diff === 'hard' ? 'khó' : diff}`);
      }
    });
    
    return strengths.length > 0 ? strengths : ['Khả năng tập trung tốt'];
  }

  private identifyWeaknesses(byType: any, byDifficulty: any): string[] {
    const weaknesses: string[] = [];
    
    Object.entries(byType).forEach(([type, data]: [string, any]) => {
      if (data.accuracy <= 50) {
        weaknesses.push(`Cần cải thiện với câu hỏi ${this.getQuestionTypeLabel(type)}`);
      }
    });
    
    Object.entries(byDifficulty).forEach(([diff, data]: [string, any]) => {
      if (data.accuracy <= 50) {
        weaknesses.push(`Gặp khó khăn với câu hỏi ${diff === 'hard' ? 'khó' : diff}`);
      }
    });
    
    return weaknesses.length > 0 ? weaknesses : ['Cần ôn tập đều tất cả dạng bài'];
  }

  private getQuestionTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'multiple-choice': 'trắc nghiệm',
      'true-false': 'đúng/sai',
      'fill-blank': 'điền khuyết',
      'short-answer': 'tự luận ngắn',
      'matching': 'nối câu',
      'ordering': 'sắp xếp'
    };
    return labels[type] || type;
  }

  private calculateRank(accuracy: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    if (accuracy >= 90) return 'expert';
    if (accuracy >= 75) return 'advanced';
    if (accuracy >= 60) return 'intermediate';
    return 'beginner';
  }

  private awardBadges(session: QuizSession): string[] {
    const badges: string[] = [];
    const correctAnswers = session.userAnswers.filter(a => a.isCorrect).length;
    const totalQuestions = session.questions.length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    if (accuracy >= 90) {
      badges.push('🎯 Thần đồng');
    } else if (accuracy >= 80) {
      badges.push('⭐ Xuất sắc');
    }

    if (session.maxStreak >= 10) {
      badges.push('🔥 Bất bại');
    } else if (session.maxStreak >= 5) {
      badges.push('⚡ Nóng hổi');
    }

    const avgTime = totalQuestions > 0 ? session.timeSpent / totalQuestions : 0;
    if (avgTime < 30) {
      badges.push('🚀 Tốc độ');
    }

    const maxPossible = session.questions.reduce((sum, q) => sum + q.points, 0);
    if (session.score >= maxPossible * 0.9) {
      badges.push('🏆 Vô địch');
    }

    return badges;
  }

  private generateRecommendations(strengths: string[], weaknesses: string[], accuracy: number): string[] {
    const recommendations: string[] = [];

    if (accuracy < 60) {
      recommendations.push('Ôn tập lại toàn bộ kiến thức cơ bản');
      recommendations.push('Tập trung vào các khái niệm chính');
    } else if (accuracy < 80) {
      recommendations.push('Luyện tập thêm các dạng bài còn yếu');
      recommendations.push('Chú ý thời gian làm bài');
    } else {
      recommendations.push('Thử thách bản thân với câu hỏi khó hơn');
      recommendations.push('Duy trì phong độ hiện tại');
    }

    if (weaknesses.length > 0) {
      recommendations.push(`Ưu tiên cải thiện: ${weaknesses.slice(0, 2).join(', ')}`);
    }

    return recommendations;
  }

  public getSession(sessionId: string): QuizSession | undefined {
    return this.sessions.get(sessionId);
  }
}
