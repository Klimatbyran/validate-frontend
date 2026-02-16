type SearchQuery = {
  name: string;
  reportYear: string;
};

const fetchCompanyReports = async (searchQuery: SearchQuery) => {
  console.log([searchQuery]);
  try {
    const response = await fetch("http://localhost:3000/api/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([searchQuery]),
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.error("Failed to fetch company report:", response.statusText);
      throw new Error(`Failed to fetch report: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error fetching company report:", error);
    throw error instanceof Error ? error : new Error("Failed to fetch report");
  }
};

export default fetchCompanyReports;
