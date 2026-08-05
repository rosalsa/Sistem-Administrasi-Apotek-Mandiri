export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-6 w-48 bg-slate-200 rounded" />
        <div className="h-4 w-72 bg-slate-100 rounded" />
      </div>
      <div className="bg-white rounded-xl border p-4 space-y-3">
        <div className="h-10 w-full bg-slate-100 rounded-lg" />
        <div className="h-10 w-full bg-slate-100 rounded-lg" />
        <div className="h-10 w-full bg-slate-100 rounded-lg" />
        <div className="h-10 w-full bg-slate-100 rounded-lg" />
        <div className="h-10 w-full bg-slate-100 rounded-lg" />
      </div>
    </div>
  );
}
