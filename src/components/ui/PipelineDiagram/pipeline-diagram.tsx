import { motion } from 'framer-motion';
import { usePipeline } from '@/hooks/usePipeline';
import '@xyflow/react/dist/style.css';
import { PipelineGraph } from './PipelineGraph';

export function PipelineDiagram() {
  const { pipeline, isLoading, isError, error } = usePipeline();

  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (isError) {
    return <div>Error: {error.message}</div>;
  }

  if(pipeline) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6"
      >
        <h2 className="text-xl font-semibold text-gray-01 mb-6">Process Flow</h2>
        <div style={{ height: '600px', width: '100%' }}>
          <PipelineGraph pipeline={pipeline} />
        </div>        
      </motion.div>
    );
  }
  
}
