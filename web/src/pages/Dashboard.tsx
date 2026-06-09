import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useWords, useNextReview } from "@/hooks/useWords";
import StatsCards from "@/components/dashboard/StatsCards";
import Bar3DChart from "@/components/dashboard/Bar3D";
import RingProgress3D from "@/components/dashboard/RingProgress3D";
import { Button } from "@/components/ui/button";
import { RefreshCw, HelpCircle } from "lucide-react";

const mockWeeklyData = [
  { label: "Mon", value: 45 },
  { label: "Tue", value: 32 },
  { label: "Wed", value: 58 },
  { label: "Thu", value: 40 },
  { label: "Fri", value: 52 },
  { label: "Sat", value: 30 },
  { label: "Sun", value: 20 },
];

export default function Dashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: wordsData } = useWords({ per_page: 1 });
  const { data: reviewWords = [] } = useNextReview(50);

  const totalWords = wordsData?.meta.total || 0;
  const masteredPercent = totalWords > 0
    ? Math.round((reviewWords.filter(w => w.learning_status?.status === "mastered").length / totalWords) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">{t.app.title}</h1>
        <p className="mt-1 text-gray-400">{t.app.subtitle}</p>
      </div>

      <StatsCards reviewWords={reviewWords} totalWords={totalWords} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">{t.dashboard.recentActivity}</h2>
          <Bar3DChart data={mockWeeklyData} />
        </div>
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">{t.dashboard.progress}</h2>
          <RingProgress3D percent={masteredPercent} />
        </div>
      </div>

      <div className="flex gap-4">
        <Button
          onClick={() => navigate("/review")}
          className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500"
          size="lg"
        >
          <RefreshCw className="h-5 w-5" />
          {t.dashboard.startReview}
        </Button>
        <Button
          onClick={() => navigate("/quiz")}
          variant="outline"
          className="gap-2 border-white/20 text-white hover:bg-white/10"
          size="lg"
        >
          <HelpCircle className="h-5 w-5" />
          {t.dashboard.startQuiz}
        </Button>
      </div>
    </div>
  );
}
