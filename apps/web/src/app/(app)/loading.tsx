export default function AppLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded-lg" />
      <div className="h-4 w-96 bg-slate-100 rounded-md" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        <div className="h-28 bg-slate-200 rounded-[14px]" />
        <div className="h-28 bg-slate-200 rounded-[14px]" />
        <div className="h-28 bg-slate-200 rounded-[14px]" />
        <div className="h-28 bg-slate-200 rounded-[14px]" />
      </div>
      <div className="h-96 bg-slate-100 rounded-[14px] mt-4" />
    </div>
  );
}
