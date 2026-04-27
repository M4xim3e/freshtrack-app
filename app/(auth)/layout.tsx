export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 text-dark font-bold text-xl">
            <span className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-lg">🌿</span>
            FreshTrack
          </a>
        </div>
        {children}
      </div>
    </div>
  )
}
