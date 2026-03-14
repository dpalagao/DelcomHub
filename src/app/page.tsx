import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Delcom Project Hub
          </h1>
          <p className="mt-2 text-lg text-muted">
            Purchase Request, Approval & Disbursement System
          </p>
        </div>
        <div className="space-y-4">
          <Link
            href="/auth/login"
            className="block w-full rounded-lg bg-primary px-4 py-3 text-center font-semibold text-white transition hover:bg-primary-dark"
          >
            Sign In
          </Link>
          <p className="text-sm text-muted">
            Delcom Projects &mdash; Construction & Fit-Out Management
          </p>
        </div>
      </div>
    </div>
  );
}
