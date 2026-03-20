export interface PipelineSettings {
  language?: string;
  difficulty?: "easy" | "medium" | "hard";
  focus?: string;
}

export interface DocumentInfo {
  id: string;
  title: string;
  filePath: string;
}

export interface ExtractedDocument {
  documentId: string;
  title: string;
  extractedText: string;
  outline: DocumentOutline;
}

export interface DocumentOutline {
  topics: Array<{
    title: string;
    startSection: string;
    endSection: string;
    summary: string;
  }>;
  totalPages: number | null;
  mainSubject: string;
}

export interface CurriculumLesson {
  title: string;
  objectives: string[];
  sourceText: string;
  orderIndex: number;
}

export interface Curriculum {
  title: string;
  description: string;
  lessons: CurriculumLesson[];
}

export interface SlideshowSlide {
  title: string;
  body: string;
  keyPoints: string[];
  example?: string;
  order: number;
}

export interface StoryCardItem {
  headline: string;
  body: string;
  emoji: string;
  order: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface LessonContent {
  lessonTitle: string;
  orderIndex: number;
  summary: string;
  slideshowCards: SlideshowSlide[];
  storyCards: StoryCardItem[];
  quiz: {
    title: string;
    questions: QuizQuestion[];
  };
  sourceText: string;
}

export interface JudgeVerdict {
  lessonIndex: number;
  approved: boolean;
  feedback: string;
}
