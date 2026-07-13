export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5" style={{ background: "#0f0f0f" }}>
      <svg className="w-16 h-16 text-zinc-400 animate-spin" style={{ animationDuration: "1s" }} viewBox="0 0 50 50" fill="none">
        <circle cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="80 40" />
      </svg>
      <div className="text-center">
        <p className="text-xl text-white font-light mb-2">Loading Email Data...</p>
        <p className="text-sm text-zinc-500">Counting reminder emails by store</p>
      </div>
    </div>
  );
}
