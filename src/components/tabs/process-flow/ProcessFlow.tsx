import { PipelineGraph } from "@/components/ui/PipelineDiagram/PipelineGraph";
import { TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";

export function ProcessFlow() {
  return (
    <TabsContent key="workflow" value="workflow" asChild>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6"
      >
        <h2 className="text-xl font-semibold text-gray-01 mb-6">
          Process Flow
        </h2>
        <PipelineGraph />
      </motion.div>
    </TabsContent>
  );
}
