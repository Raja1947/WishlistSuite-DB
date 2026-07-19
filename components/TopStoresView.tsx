"use client";
import Link from "next/link";
import StoreTable, { StoreRow } from "./StoreTable";

export default function TopStoresView({ stores }: { stores: StoreRow[] }) {
  return (
    <div className="min-h-screen px-6 py-8" style={{ background: "#080808" }}>
      <div className="max-w-screen-xl mx-auto">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white mb-6 px-3 py-1.5 rounded-lg transition-colors" style={{ border: "1px solid #2a2a2a" }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </Link>

        <StoreTable
          stores={stores}
          title="Top Performing Stores"
          subtitle="Stores ranked by wishlist revenue"
          csvPrefix="top-stores"
          extraHeaderActions={
            <Link href="/live-vs-dev" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-zinc-300 hover:text-white border border-[#2a2a2a] hover:border-zinc-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14" /></svg>
              Live vs Dev
            </Link>
          }
          secondaryBackLink={{ href: "/", label: "Back to All Stores" }}
        />
      </div>
    </div>
  );
}
