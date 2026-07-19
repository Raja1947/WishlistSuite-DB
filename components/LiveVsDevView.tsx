"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import StoreTable, { StoreRow } from "./StoreTable";

type Group = "live" | "dev";
type DevStoreRow = StoreRow & { partnerDevelopment: boolean };

export default function LiveVsDevView({ stores }: { stores: DevStoreRow[] }) {
  const [group, setGroup] = useState<Group>("live");

  const liveStores = useMemo(() => stores.filter((s) => !s.partnerDevelopment), [stores]);
  const devStores = useMemo(() => stores.filter((s) => s.partnerDevelopment), [stores]);
  const filtered = group === "live" ? liveStores : devStores;

  return (
    <div className="min-h-screen px-6 py-8" style={{ background: "#080808" }}>
      <div className="max-w-screen-xl mx-auto">
        <Link href="/top-stores" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white mb-6 px-3 py-1.5 rounded-lg transition-colors" style={{ border: "1px solid #2a2a2a" }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Live vs Dev Store Revenue</h1>
          <p className="text-zinc-500 text-sm mt-1">See which stores are real merchants vs partner/development stores</p>
        </div>

        {/* Live / Dev toggle */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ background: "#1a1a1a" }}>
          <button
            onClick={() => setGroup("live")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              group === "live" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            Live ({liveStores.length})
          </button>
          <button
            onClick={() => setGroup("dev")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              group === "dev" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            Dev ({devStores.length})
          </button>
        </div>

        <StoreTable
          stores={filtered}
          title={group === "live" ? "Live Stores" : "Dev Stores"}
          subtitle={group === "live" ? "Real merchant stores" : "Partner & development stores"}
          csvPrefix={group === "live" ? "live-stores" : "dev-stores"}
        />
      </div>
    </div>
  );
}
