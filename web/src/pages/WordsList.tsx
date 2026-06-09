import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useWords } from "@/hooks/useWords";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

export default function WordsList() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [source, setSource] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const { data, isLoading } = useWords({
    page,
    per_page: 50,
    q: q || undefined,
    source: source || undefined,
    status: status || undefined,
  });

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.per_page) : 1;

  const statusColor = (s: string | null | undefined) => {
    switch (s) {
      case "mastered": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "review": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "learning": return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">{t.nav.words}</h1>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t.words.search}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setQ(searchInput);
                setPage(1);
              }
            }}
            className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-gray-500"
          />
        </div>
        <Select value={source} onValueChange={(v) => { setSource(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-32 border-white/10 bg-white/5 text-white">
            <SelectValue placeholder={t.words.source} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.words.all}</SelectItem>
            <SelectItem value="GRE">GRE</SelectItem>
            <SelectItem value="TOEFL">TOEFL</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-32 border-white/10 bg-white/5 text-white">
            <SelectValue placeholder={t.words.status} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.words.all}</SelectItem>
            <SelectItem value="learning">{t.wordDetail.statusLearning}</SelectItem>
            <SelectItem value="review">{t.wordDetail.statusReview}</SelectItem>
            <SelectItem value="mastered">{t.wordDetail.statusMastered}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
      ) : !data?.data.length ? (
        <div className="py-20 text-center text-gray-400">{t.words.noResults}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.data.map((word) => (
              <button
                key={word.id}
                onClick={() => navigate(`/words/${word.id}`)}
                className="group rounded-xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-violet-500/30 hover:bg-white/10"
              >
                <div className="flex items-start justify-between">
                  <span className="text-lg font-semibold text-white">{word.word}</span>
                  <Badge variant="outline" className="text-xs border-white/20 text-gray-400">
                    {word.source}
                  </Badge>
                </div>
                {word.phonetic && (
                  <p className="mt-1 text-sm text-violet-300">{word.phonetic}</p>
                )}
                <p className="mt-2 line-clamp-2 text-sm text-gray-400">
                  {word.meaning_cn || word.meaning_en || "—"}
                </p>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="border-white/10 text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-400">
              {t.words.page.replace("{page}", String(page)).replace("{total}", String(totalPages))}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="border-white/10 text-white hover:bg-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
