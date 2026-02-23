import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export function ProcessingTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] p-8"
    >
      <div className="flex items-center justify-center text-center">
        <div className="space-y-4">
          <CheckCircle2 className="w-16 h-16 text-green-03 mx-auto" />
          <div>
            <h3 className="text-2xl text-gray-01 font-medium">System Ready</h3>
            <p className="text-gray-02 mt-2">
              Queue monitoring has been simplified. Check the "Jobbstatus" tab to view company progress.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
