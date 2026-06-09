import { useParams, useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useWord } from "@/hooks/useWords";
import Card3D from "@/components/shared/Card3D";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft } from "lucide-react";

export default function WordDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { data, isLoading } = useWord(Number(id));

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>;
  }

  if (!data) {
    return <div className="py-20 text-center text-gray-400">Word not found</div>;
  }

  const { word, examples, synonyms, learning_status } = data;

  const statusLabel = () => {
    if (!learning_status) return { text: t.wordDetail.statusNew, cls: "bg-gray-500/20 text-gray-400" };
    switch (learning_status.status) {
      case "mastered": return { text: t.wordDetail.statusMastered, cls: "bg-emerald-500/20 text-emerald-300" };
      case "review": return { text: t.wordDetail.statusReview, cls: "bg-blue-500/20 text-blue-300" };
      default: return { text: t.wordDetail.statusLearning, cls: "bg-amber-500/20 text-amber-300" };
    }
  };

  const sl = statusLabel();

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate("/words")}
        className="gap-2 text-gray-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.wordDetail.back}
      </Button>

      <div className="flex items-center gap-4">
        <Badge className={sl.cls}>{sl.text}</Badge>
        {word.source && <Badge variant="outline" className="border-white/20 text-gray-400">{word.source}</Badge>}
      </div>

      <div className="h-72 w-full max-w-lg">
        <Card3D
          front={word.word}
          back={word.meaning_cn || word.meaning_en || "—"}
          subtext={word.phonetic || undefined}
        />
      </div>

      <Tabs defaultValue="meaning" className="w-full">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="meaning" className="text-gray-300 data-[state=active]:bg-violet-500/20 data-[state=active]:text-white">
            {t.wordDetail.meaning}
          </TabsTrigger>
          <TabsTrigger value="examples" className="text-gray-300 data-[state=active]:bg-violet-500/20 data-[state=active]:text-white">
            {t.wordDetail.examples}
          </TabsTrigger>
          <TabsTrigger value="synonyms" className="text-gray-300 data-[state=active]:bg-violet-500/20 data-[state=active]:text-white">
            {t.wordDetail.synonyms}
          </TabsTrigger>
          {(word.root || word.association) && (
            <TabsTrigger value="root" className="text-gray-300 data-[state=active]:bg-violet-500/20 data-[state=active]:text-white">
              {t.wordDetail.root}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="meaning" className="mt-4 space-y-3">
          {word.meaning_cn && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-sm text-gray-400">中文</p>
              <p className="mt-1 text-white">{word.meaning_cn}</p>
            </div>
          )}
          {word.meaning_en && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-sm text-gray-400">English</p>
              <p className="mt-1 text-white">{word.meaning_en}</p>
            </div>
          )}
          {word.pos && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-sm text-gray-400">POS</p>
              <p className="mt-1 text-white">{word.pos}</p>
            </div>
          )}
          {word.collocations && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-sm text-gray-400">{t.wordDetail.collocations}</p>
              <p className="mt-1 text-white">{word.collocations}</p>
            </div>
          )}
          {word.derivatives && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-sm text-gray-400">{t.wordDetail.derivatives}</p>
              <p className="mt-1 text-white">{word.derivatives}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="examples" className="mt-4">
          <ScrollArea className="h-64">
            {examples.length ? examples.map((ex) => (
              <div key={ex.id} className="mb-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-white">{ex.sentence}</p>
                {ex.translation && <p className="mt-1 text-sm text-gray-400">{ex.translation}</p>}
              </div>
            )) : <p className="text-gray-500">—</p>}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="synonyms" className="mt-4">
          <div className="flex flex-wrap gap-2">
            {synonyms.length ? synonyms.map((s) => (
              <Badge key={s.id} variant="outline" className="border-violet-500/30 text-violet-300">
                {s.synonym}
              </Badge>
            )) : <p className="text-gray-500">—</p>}
          </div>
        </TabsContent>

        <TabsContent value="root" className="mt-4 space-y-3">
          {word.root && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-sm text-gray-400">{t.wordDetail.root}</p>
              <p className="mt-1 text-white">{word.root}</p>
            </div>
          )}
          {word.association && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-sm text-gray-400">Association</p>
              <p className="mt-1 text-white">{word.association}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
