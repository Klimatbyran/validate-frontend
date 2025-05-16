import { PipelineDiagram } from "@/components/ui/pipeline-diagram";
import { TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";

export function ProcessFlow() {
  return (
    <TabsContent key="workflow" value="workflow" asChild>
      <motion.div>
        <PipelineDiagram />
      </motion.div>
    </TabsContent>
  );
}
