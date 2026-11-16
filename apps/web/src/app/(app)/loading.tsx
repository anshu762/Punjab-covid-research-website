export default function AppLoading() {
  return (
    <div className="w-full space-y-5 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-7 w-56 bg-slate-200 rounded-lg" />
        <div className="h-4 w-80 max-w-full bg-slate-100 rounded-md" />
      </div>
      <div className="h-40 w-full bg-surface border border-border rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="h-4 w-48 bg-slate-200 rounded" />
        <div className="h-20 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}
