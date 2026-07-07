export default function Gatekeep() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="relative w-full max-w-md rounded-2xl border border-yellow-600/50 bg-gradient-to-br from-black via-zinc-900 to-black p-8 m-2 shadow-2xl shadow-yellow-600/20">
        {/* Warning Icons - Top Row */}
        <div className="absolute -top-4 left-1/2 flex -translate-x-1/2 gap-4">
          <div className="animate-bounce flex h-8 w-8 items-center justify-center rounded-full bg-red-950 text-red-500">
            <svg
              aria-label="Warning"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>Warning</title>
              <path
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <div className="animate-ping flex h-8 w-8 items-center justify-center rounded-full bg-red-950 text-red-500">
            <svg
              aria-label="Blocked"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>Blocked</title>
              <path
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
        </div>

        {/* Warning Icons - Side */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <div className="animate-pulse flex h-10 w-10 items-center justify-center rounded-full bg-red-950 text-red-500">
            <svg
              aria-label="Alert"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>Alert</title>
              <path
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
        </div>

        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <div className="animate-bounce flex h-10 w-10 items-center justify-center rounded-full bg-red-950 text-red-500">
            <svg
              aria-label="Warning"
              className="h-6 w-6 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>Warning</title>
              <path
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
        </div>

        {/* Warning Icons - Bottom Row */}
        <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 gap-4">
          <div className="animate-pulse flex h-8 w-8 items-center justify-center rounded-full bg-amber-950 text-amber-500">
            <svg
              aria-label="Locked"
              className="h-5 w-5 animate-bounce"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>Locked</title>
              <path
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <div className="animate-ping flex h-8 w-8 items-center justify-center rounded-full bg-red-950 text-red-500">
            <svg
              aria-label="Prohibited"
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <title>Prohibited</title>
              <path
                clipRule="evenodd"
                d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
                fillRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Decorative Icons - Top */}
        <div className="mb-6 flex justify-center gap-3">
          <div className="animate-bounce text-red-500">
            <svg
              aria-label="Down arrow"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>Down arrow</title>
              <path
                d="M19 9l-7 7-7-7"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <div className="animate-spin text-red-500">
            <svg aria-label="No access" className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
              <title>No access</title>
              <path
                clipRule="evenodd"
                d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
                fillRule="evenodd"
              />
            </svg>
          </div>
          <div className="animate-pulse text-yellow-500">
            <svg
              aria-label="Lightning"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>Lightning</title>
              <path
                d="M13 10V3L4 14h7v7l9-11h-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <div className="animate-ping text-red-500">
            <svg
              aria-label="Error"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>Error</title>
              <path
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <div className="animate-bounce text-amber-500">
            <svg
              aria-label="Lock"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>Lock</title>
              <path
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6 text-center">
          <h1 className="font-bold text-3xl text-yellow-500 tracking-wide">PRIME Jewellery</h1>

          <p className="text-lg text-white">
            Please make the payment of
            <br />
            this website to access
          </p>

          {/* Decorative Icons - Bottom */}
          <div className="flex justify-center gap-3 py-4">
            <div className="animate-pulse text-red-500">
              <svg
                aria-label="Down"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Down</title>
                <path
                  d="M19 9l-7 7-7-7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
            <div className="animate-bounce text-red-500">
              <svg aria-label="Denied" className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                <title>Denied</title>
                <path
                  clipRule="evenodd"
                  d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
                  fillRule="evenodd"
                />
              </svg>
            </div>
            <div className="animate-ping text-yellow-500">
              <svg
                aria-label="Power"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Power</title>
                <path
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
            <div className="animate-spin text-red-500">
              <svg
                aria-label="Info"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Info</title>
                <path
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
            <div className="animate-pulse text-amber-500">
              <svg
                aria-label="Secure"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Secure</title>
                <path
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="animate-pulse rounded-lg border border-red-900 bg-red-950/50 px-4 py-3">
            <div className="flex items-center justify-center gap-2 text-red-400 text-sm">
              <svg
                aria-label="Alert icon"
                className="h-5 w-5 animate-bounce"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Alert icon</title>
                <path
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              <span className="font-semibold">ACCESS DENIED — PAYMENT REQUIRED</span>
              <svg
                aria-label="Warning icon"
                className="h-5 w-5 animate-bounce"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Warning icon</title>
                <path
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
