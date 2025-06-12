import { usePipeline } from "@/hooks/usePipeline";
import { Pipeline } from "@/lib/types";
import { createContext, ReactNode } from "react";

export const PipelineContext = createContext<Pipeline | undefined | null>(undefined);

export const PipelineProvider = ({ children }: { children: ReactNode }) => {

  const { pipeline, isLoading, isError, error } = usePipeline();  
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (isError) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <PipelineContext.Provider
      value={ pipeline }
    >
      {children}
    </PipelineContext.Provider>
  );
};  