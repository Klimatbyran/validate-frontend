/**
 * API Helpers - Utilities for authenticated API calls
 * Provides authenticatedFetch for direct fetch() calls
 */

function isWriteOperation(method: string | undefined): boolean {
  const upperMethod = method?.toUpperCase() || "";
  return ["POST", "PUT", "PATCH", "DELETE"].includes(upperMethod);
}

/**
 * Authenticated fetch wrapper
 * Automatically checks for authentication on write operations
 * and shows login modal if not authenticated
 * 
 * @param url - Request URL
 * @param options - Fetch options (same as native fetch)
 * @returns Promise<Response>
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const isWrite = isWriteOperation(options.method);

  if (isWrite) {
    const token = localStorage.getItem("token");
    if (!token) {
      // Show login modal and return a promise that will be resolved after login
      return new Promise((resolve, reject) => {
        window.dispatchEvent(
          new CustomEvent("show-login-modal", {
            detail: {
              action: async () => {
                // Retry the fetch after login
                try {
                  const token = localStorage.getItem("token");
                  if (!token) {
                    reject(new Error("Authentication required"));
                    return;
                  }
                  
                  const fetchOptions: RequestInit = {
                    ...options,
                    headers: {
                      ...options.headers,
                      Authorization: `Bearer ${token}`,
                    },
                  };
                  
                  const response = await fetch(url, fetchOptions);
                  resolve(response);
                } catch (error) {
                  reject(error);
                }
              },
            },
          })
        );
        // Don't reject immediately - wait for login to complete
        // The promise will be resolved/rejected in the action callback
      });
    }

    // Add auth header for write operations
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  // For read operations, make the request without auth header
  // (backend may or may not require it, but we don't block it)
  return fetch(url, options);
}
