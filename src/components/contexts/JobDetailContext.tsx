import { createContext, useState, useCallback } from 'react';

export const JobDetailContext = createContext<{
  jobPopover: {id: string, queue: string} | null;
  togglePopover: (job: {id: string, queue: string} | null) => void;
}>({
  jobPopover: null,
  togglePopover: () => {},
});


// Popover Provider Component
export const JobDetailProvider = ({ children }: { children: React.ReactNode }) => {
  const [popoverState, setPopoverState] = useState<{id: string, queue: string} | null>(null);

  const togglePopover = useCallback((job: {id: string, queue: string} | null) => {
    console.log(job);
    setPopoverState(job);
  }, []);

  return (
    <JobDetailContext.Provider value={{ jobPopover: popoverState, togglePopover }}>
      {children}
    </JobDetailContext.Provider>
  );
};