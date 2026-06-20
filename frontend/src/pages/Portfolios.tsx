import { RefreshCw, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePortfolioSummary } from "@/hooks/usePortfolios";
import PortfolioCard from "@/components/portfolio/PortfolioCard";

export default function Portfolios() {
  const { data, isLoading, error, refetch } = usePortfolioSummary();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading portfolios…
      </div>
    );
  }

  if (error) {
    const msg = (error as Error).message;
    const needsSetup = msg.includes("401") || msg.includes("cookies");
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-loss-light" />
        <p className="text-text-primary font-medium">{msg}</p>
        {needsSetup && (
          <button
            onClick={() => navigate("/setup")}
            className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm hover:bg-accent-purple/80 transition-colors"
          >
            Go to Setup
          </button>
        )}
      </div>
    );
  }

  if (!data) return null;

  const linked = data.portfolios.filter((p) => p.account_type === "linked");
  const watchlists = data.portfolios.filter((p) => p.account_type === "watchlist");
  const manual = data.portfolios.filter((p) => p.account_type === "manual");

  const Section = ({ title, items }: { title: string; items: typeof data.portfolios }) =>
    items.length > 0 ? (
      <section>
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((p) => <PortfolioCard key={p.id} portfolio={p} />)}
        </div>
      </section>
    ) : null;

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Portfolios</h1>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary border border-border rounded-lg hover:bg-bg-hover transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <Section title="Linked Accounts" items={linked} />
      <Section title="Watchlists" items={watchlists} />
      <Section title="Manual" items={manual} />
    </div>
  );
}
