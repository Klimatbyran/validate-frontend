import { useEffect, useState } from "react";

const useAllCompanyNames = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyNames, setCompanyNames] = useState<string[]>([]);

  useEffect(() => {
    const fetchCompanyNames = async () => {
      try {
        setError(null);
        const response = await fetch(
          "http://localhost:3000/api/companies/names",
        );

        if (response.ok) {
          const data = await response.json();
          setCompanyNames(data);
          setIsLoading(false);
        } else {
          console.error("Failed to fetch company names:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching company names:", error);
        setError(
          error instanceof Error ? error.message : "Failed to fetch companies",
        );
      }
    };

    fetchCompanyNames();
  }, []);

  return { companyNames, isLoading, error };
};

export default useAllCompanyNames;
