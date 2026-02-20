import { useEffect, useState } from "react";
import { View, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Typography, Button, ProgressBar } from "@/components/ui";
import { useAuth } from "@/providers/auth-provider";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { submitQuizAttempt } from "@/services/quiz";
import type { Quiz, QuizQuestion } from "@/types";

type Phase = "loading" | "playing" | "result";

export default function QuizPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [score, setScore] = useState(0);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setQuiz({
          id: data.id,
          documentId: data.document_id,
          title: data.title,
          questions: data.questions,
          difficulty: data.difficulty,
          createdAt: data.created_at,
        });
        setPhase("playing");
      }
    }
    load();
  }, [id]);

  if (phase === "loading" || !quiz) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0C0A09" : "#FAFAF9", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0D9488" />
      </SafeAreaView>
    );
  }

  const question: QuizQuestion = quiz.questions[currentIndex];
  const total = quiz.questions.length;
  const progress = (currentIndex + (hasAnswered ? 1 : 0)) / total;

  function handleSelectAnswer(index: number) {
    if (hasAnswered) return;
    setSelectedAnswer(index);
    setHasAnswered(true);

    const isCorrect = index === question.correctAnswer;
    if (isCorrect) setScore((s) => s + 1);
    setAnswers((prev) => [...prev, index]);
  }

  function handleNext() {
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setHasAnswered(false);
    } else {
      setPhase("result");
      if (user) {
        submitQuizAttempt(quiz.id, user.id, answers, score, total);
      }
    }
  }

  function getOptionStyle(index: number) {
    if (!hasAnswered) {
      return index === selectedAnswer
        ? "border-teal-600 bg-teal-50 dark:border-teal-400 dark:bg-teal-950"
        : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800";
    }
    if (index === question.correctAnswer) {
      return "border-green-500 bg-green-50 dark:border-green-400 dark:bg-green-950";
    }
    if (index === selectedAnswer && index !== question.correctAnswer) {
      return "border-red-500 bg-red-50 dark:border-red-400 dark:bg-red-950";
    }
    return "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800 opacity-50";
  }

  function getOptionLabel(index: number) {
    return String.fromCharCode(65 + index);
  }

  if (phase === "result") {
    const percentage = Math.round((score / total) * 100);
    const emoji = percentage >= 80 ? "🎉" : percentage >= 50 ? "👍" : "💪";
    const message =
      percentage >= 80
        ? "Excellent work!"
        : percentage >= 50
          ? "Good effort!"
          : "Keep practicing!";

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0C0A09" : "#FAFAF9" }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 }}>
          <View className="items-center gap-4">
            <Typography variant="display">{emoji}</Typography>
            <Typography variant="h1" className="text-center">
              {message}
            </Typography>
            <Typography variant="bodySmall" className="text-center">
              You scored {score} out of {total} ({percentage}%)
            </Typography>

            <View className="mt-4 w-full rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-800">
              <Typography variant="h2" className="mb-4 text-center">
                {quiz.title}
              </Typography>
              <ProgressBar
                progress={percentage / 100}
                color={percentage >= 80 ? "#22C55E" : percentage >= 50 ? "#F59E0B" : "#EF4444"}
              />
              <Typography variant="caption" className="mt-2 text-center">
                {percentage}% correct
              </Typography>
            </View>

            <View className="mt-4 w-full gap-3">
              <Button onPress={() => {
                setPhase("playing");
                setCurrentIndex(0);
                setSelectedAnswer(null);
                setHasAnswered(false);
                setAnswers([]);
                setScore(0);
              }}>
                Try Again
              </Button>
              <Button variant="secondary" onPress={() => router.back()}>
                Back to Learn
              </Button>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0C0A09" : "#FAFAF9" }}>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8 }}>
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Typography variant="bodySmall" className="text-teal-600 dark:text-teal-400">
              ← Exit
            </Typography>
          </Pressable>
          <Typography variant="caption">
            {currentIndex + 1} of {total}
          </Typography>
        </View>

        <View className="mt-3">
          <ProgressBar progress={progress} />
        </View>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingTop: 24, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <Typography variant="h2" className="mb-6">
            {question.question}
          </Typography>

          <View className="gap-3">
            {question.options.map((option, index) => (
              <Pressable
                key={index}
                onPress={() => handleSelectAnswer(index)}
                disabled={hasAnswered}
                className={`flex-row items-center rounded-xl border p-4 ${getOptionStyle(index)}`}
              >
                <View
                  className={`mr-3 h-8 w-8 items-center justify-center rounded-full ${
                    hasAnswered && index === question.correctAnswer
                      ? "bg-green-500"
                      : hasAnswered && index === selectedAnswer
                        ? "bg-red-500"
                        : "bg-stone-100 dark:bg-stone-700"
                  }`}
                >
                  <Typography
                    variant="body"
                    className={`font-inter-semibold ${
                      hasAnswered && (index === question.correctAnswer || index === selectedAnswer)
                        ? "text-white"
                        : ""
                    }`}
                  >
                    {getOptionLabel(index)}
                  </Typography>
                </View>
                <Typography variant="body" className="flex-1">
                  {option}
                </Typography>
              </Pressable>
            ))}
          </View>

          {hasAnswered && (
            <View className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-800 dark:bg-teal-950">
              <Typography variant="body" className="font-inter-semibold text-teal-800 dark:text-teal-200">
                {selectedAnswer === question.correctAnswer ? "Correct! ✓" : "Not quite ✗"}
              </Typography>
              <Typography variant="bodySmall" className="mt-1 text-teal-700 dark:text-teal-300">
                {question.explanation}
              </Typography>
            </View>
          )}
        </ScrollView>

        {hasAnswered && (
          <View style={{ paddingBottom: 16 }}>
            <Button onPress={handleNext}>
              {currentIndex < total - 1 ? "Next Question" : "See Results"}
            </Button>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
