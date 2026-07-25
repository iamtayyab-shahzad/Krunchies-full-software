export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
      <h1 className="text-3xl font-black text-orange-500">Krunchies POS</h1>
      <p className="mt-3 max-w-md text-zinc-400">
        You are offline. Use New Order with cached products — orders will sync
        when internet returns.
      </p>
      <a
        href="/orders/new"
        className="mt-6 rounded-lg bg-orange-500 px-5 py-3 text-sm font-bold text-black"
      >
        Open New Order
      </a>
    </div>
  );
}
