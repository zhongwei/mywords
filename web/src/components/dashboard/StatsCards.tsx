import { useI18n } from "@/lib/i18n";
import type { WordDetail } from "@/lib/types";

interface StatsCardsProps {
  reviewWords: WordDetail[];
  totalWords: number;
}

export default function StatsCards({ reviewWords, totalWords }: StatsCardsProps) {
  const { t } = useI18n();

  const mastered = totalWords > 0 ? Math.round((reviewWords.filter(w => w.learning_status?.status === "mastered").length / totalWords) * 100) : 0;
  const accuracy = reviewWords.length > 0
    ? Math.round(
        (reviewWords.reduce((sum, w) => sum + (w.learning_status?.correct_count || 0), 0) /
          Math.max(1, reviewWords.reduce((sum, w) => sum + (w.learning_status?.review_count || 0), 0))) *
          100
      )
    : 0;

  const cards = [
    { label: t.dashboard.todayReview, value: reviewWords.length, gradient: "from-violet-500 to-purple-600" },
    { label: t.dashboard.mastered, value: `${mastered}%`, gradient: "from-blue-500 to-cyan-500" },
    { label: t.dashboard.totalDays, value: "—", gradient: "from-emerald-500 to-teal-500" },
    { label: t.dashboard.accuracy, value: `${accuracy}%`, gradient: "from-orange-500 to-amber-500" },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-violet-500/30"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-10`} />
          <p className="text-sm text-gray-400">{card.label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
