export default function YardUnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 p-8 text-center">
      <div className="text-5xl">🔒</div>
      <h1 className="text-xl font-bold text-white">Access Denied</h1>
      <p className="max-w-sm text-sm text-zinc-400">
        Your account is not authorized to access the yard register. Contact the administrator to
        request access.
      </p>
      <a
        href="/yard/login"
        className="mt-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Back to Login
      </a>
    </div>
  );
}
