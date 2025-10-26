
interface StudyRecord {
    confidence: string;
    id: number;
    date: string;
}

interface Topic {
    id: number;
    stability?: number;
    interval?: number;
    repetitions?: number;
    dueDate?: string;
    difficulty?: 'easy' | 'medium' | 'hard' | string | number;
    algorithm?: string;
    studies?: StudyRecord[];
}

interface SpacedRepetitionData {
    stability: number;
    difficulty: string | number;
    interval: number;
    dueDate: string;
    repetitions: number;
    algorithm: string;
}

export interface StudyAlgorithm {
  id: string;
  name: string;
  description: string;
  calculateNextReview: (topic: Topic, performance: number) => SpacedRepetitionData;
  getRetentionRate: (topic: Topic) => number;
}

export class EnhancedSpacedRepetition {
  private algorithms: StudyAlgorithm[] = [];
  private currentAlgorithm: string = 'fsrs';
  private abTestingEnabled: boolean = true;
  private retentionData: {
    algorithm: string;
    topicId: number;
    performance: number;
    timestamp: string;
    retention: number;
  }[] = [];

  constructor() {
    this.initializeAlgorithms();
  }

  private initializeAlgorithms() {
    this.algorithms.push({
      id: 'fsrs',
      name: 'FSRS - Mới',
      description: 'Thuật toán dự đoán dựa trên 4 thành phần: stability, difficulty, retrievability, và expected recall',
      calculateNextReview: this.calculateFSRS.bind(this),
      getRetentionRate: this.getFSRSRetention.bind(this)
    });

    this.algorithms.push({
      id: 'leitner',
      name: 'Leitner - Cũ',
      description: 'Thuật toán hộp truyền thống dựa trên hệ thống hộp',
      calculateNextReview: this.calculateLeitner.bind(this),
      getRetentionRate: this.getLeitnerRetention.bind(this)
    });

    this.algorithms.push({
      id: 'sm2',
      name: 'SM-2',
      description: 'Thuật toán SuperMemo 2 cổ điển',
      calculateNextReview: this.calculateSM2.bind(this),
      getRetentionRate: this.getSM2Retention.bind(this)
    });
  }

  private mapPerformanceToDifficulty(performance: number): number {
    return 11 - (performance * 2);
  }

  private calculateRetrievability(topic: Topic): number {
    const lastStudy = topic.studies?.[topic.studies.length - 1];
    if (!lastStudy?.date || !topic.stability) {
        return 1.0; 
    }
    const t = (new Date().getTime() - new Date(lastStudy.date).getTime()) / (1000 * 60 * 60 * 24);
    const S = topic.stability;
    return Math.exp(-t / S);
  }

  private calculateNewStability(stability: number, difficulty: number, retrievability: number, performance: number): number {
    if (performance < 3) {
        return Math.max(1, stability * 0.5);
    }
    return stability * (1 + (performance - 2.5) * 0.2 * (11 - difficulty));
  }

  private calculateNewDifficulty(difficulty: number, performance: number): number {
    const newDifficulty = difficulty - (performance - 2.5) * 0.2;
    return Math.max(1, Math.min(10, newDifficulty));
  }

  private calculateOptimalInterval(stability: number, performance: number): number {
    if (performance < 3) return 1;
    return Math.round(stability * 2.5);
  }
  
  private getFSRSRetention(topic: Topic): number {
    return this.calculateRetrievability(topic);
  }

  private getLeitnerRetention(topic: Topic): number {
    const box = topic.stability || 1;
    return 1 - (box / 10);
  }

  private getSM2Retention(topic: Topic): number {
    return Math.max(0.5, Math.exp(-(topic.interval || 1) / 100));
  }

  private calculateFSRS(topic: Topic, performance: number): SpacedRepetitionData {
    const currentStability = topic.stability || 0.4;
    const currentDifficulty = this.mapPerformanceToDifficulty(performance);
    const currentRetrievability = this.calculateRetrievability(topic);
    
    const newStability = this.calculateNewStability(
      currentStability,
      currentDifficulty,
      currentRetrievability,
      performance
    );
    
    const newDifficultyValue = this.calculateNewDifficulty(
      currentDifficulty,
      performance
    );
    
    const optimalInterval = this.calculateOptimalInterval(newStability, performance);
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Math.round(optimalInterval));
    
    return {
      stability: newStability,
      difficulty: newDifficultyValue,
      interval: optimalInterval,
      dueDate: dueDate.toISOString().split('T')[0],
      repetitions: (topic.repetitions || 0) + 1,
      algorithm: 'fsrs'
    };
  }

  private calculateLeitner(topic: Topic, performance: number): SpacedRepetitionData {
    const currentBox = topic.stability || 1;
    let newBox = currentBox;
    
    if (performance >= 3) {
      newBox = Math.min(currentBox + 1, 5);
    } else {
      newBox = Math.max(1, currentBox - 1);
    }
    
    const intervals = [1, 2, 4, 7, 14]; // Days for each box
    const interval = intervals[newBox - 1] || 14;
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + interval);
    
    return {
      stability: newBox,
      difficulty: performance,
      interval: interval,
      dueDate: dueDate.toISOString().split('T')[0],
      repetitions: (topic.repetitions || 0) + 1,
      algorithm: 'leitner'
    };
  }

  private calculateSM2(topic: Topic, performance: number): SpacedRepetitionData {
    let easeFactor = typeof topic.difficulty === 'number' ? topic.difficulty : 2.5;
    const repetitions = topic.repetitions || 0;
    
    if (performance < 3) {
        // Incorrect response, reset repetitions and interval
        return {
            stability: easeFactor,
            difficulty: easeFactor,
            interval: 1,
            dueDate: this.getDueDate(1),
            repetitions: 0,
            algorithm: 'sm2'
        };
    }

    // Correct response, update ease factor
    easeFactor = easeFactor + (0.1 - (5 - performance) * (0.08 + (5 - performance) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    let interval;
    if (repetitions === 0) {
        interval = 1;
    } else if (repetitions === 1) {
        interval = 6;
    } else {
        interval = Math.round((topic.interval || 1) * easeFactor);
    }
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + interval);
    
    return {
      stability: easeFactor,
      difficulty: easeFactor,
      interval: interval,
      dueDate: dueDate.toISOString().split('T')[0],
      repetitions: repetitions + 1,
      algorithm: 'sm2'
    };
  }

  public assignAlgorithm(topicId: number): string {
    if (!this.abTestingEnabled) return this.currentAlgorithm;
    
    const hash = this.hashCode(topicId.toString());
    const algorithms = this.algorithms.map(a => a.id);
    return algorithms[hash % algorithms.length];
  }

  public recordRetentionData(topicId: number, algorithm: string, performance: number, retention: number) {
    this.retentionData.push({
      algorithm,
      topicId,
      performance,
      timestamp: new Date().toISOString(),
      retention
    });
    
    if (this.retentionData.length > 1000) {
      this.retentionData = this.retentionData.slice(-1000);
    }
  }

  public getAlgorithmComparison() {
    const comparison: any = {};
    
    this.algorithms.forEach(algorithm => {
      const algorithmData = this.retentionData.filter(d => d.algorithm === algorithm.id);
      
      if (algorithmData.length > 0) {
        const avgRetention = algorithmData.reduce((sum, d) => sum + d.retention, 0) / algorithmData.length;
        const avgPerformance = algorithmData.reduce((sum, d) => sum + d.performance, 0) / algorithmData.length;
        
        comparison[algorithm.id] = {
          name: algorithm.name,
          dataPoints: algorithmData.length,
          averageRetention: avgRetention,
          averagePerformance: avgPerformance,
          retentionRate: (algorithmData.filter(d => d.retention >= 0.7).length / algorithmData.length) * 100
        };
      }
    });
    
    return comparison;
  }

  public calculateNextReview(topic: Topic, performance: number): SpacedRepetitionData {
    const algorithmId = topic.algorithm || this.assignAlgorithm(topic.id);
    const algorithm = this.algorithms.find(a => a.id === algorithmId) || this.algorithms[0];
    
    const result = algorithm.calculateNextReview(topic, performance);
    
    const retention = algorithm.getRetentionRate(topic);
    this.recordRetentionData(topic.id, algorithmId, performance, retention);
    
    return { ...result, algorithm: algorithmId };
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  private getDueDate(interval: number): string {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + Math.ceil(interval));
    return nextDate.toISOString().split('T')[0];
  }

  getMasteryLevel(topic: Topic): number {
    const { interval = 0 } = topic;
    
    if (interval === 0) return 0; // New
    if (interval <= 2) return 1;  // Learning
    if (interval <= 7) return 2;  // Young
    if (interval <= 30) return 3; // Mature
    if (interval <= 90) return 4; // Strong
    return 5; // Mastered
  }

  getMasteryColor(level: number): string {
    const colors = [
      'bg-red-500',    // Level 0: New
      'bg-orange-500', // Level 1: Learning  
      'bg-yellow-500', // Level 2: Young
      'bg-blue-500',   // Level 3: Mature
      'bg-green-500',  // Level 4: Strong
      'bg-purple-500'  // Level 5: Mastered
    ];
    return colors[level] || colors[0];
  }

  getMasteryLabel(level: number): string {
    const labels = [
      'Mới',
      'Đang học',
      'Trẻ',
      'Trưởng thành', 
      'Mạnh',
      'Thành thạo'
    ];
    return labels[level] || labels[0];
  }
}