import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  RotateCcw,
} from "lucide-react";
import { motion } from "framer-motion";
import { QueueJob } from "@/lib/types";

interface JobHeaderProps {
  job: QueueJob;
  stage?: { name: string };
  needsApproval?: boolean;
}

export function JobHeader({
  job,
  stage,
  needsApproval = false,
}: JobHeaderProps) {
  const getStatusIcon = () => {
    if (needsApproval) return <HelpCircle className="w-6 h-6 text-blue-03" />;
    if (job.isFailed) return <AlertTriangle className="w-6 h-6 text-pink-03" />;
    if (job.finishedOn)
      return <CheckCircle2 className="w-6 h-6 text-green-03" />;
    if (job.processedOn) {
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <RotateCcw className="w-6 h-6 text-blue-03" />
        </motion.div>
      );
    }
    return <MessageSquare className="w-6 h-6 text-gray-02" />;
  };

  const getStatusColor = () => {
    if (needsApproval) return "bg-blue-03/20";
    if (job.isFailed) return "bg-pink-03/20";
    if (job.finishedOn) return "bg-green-03/20";
    if (job.processedOn) return "bg-blue-03/20";
    return "bg-gray-03/20";
  };

  const getStatusText = () => {
    if (needsApproval) return "Väntar på godkännande";
    if (job.isFailed) return "Misslyckad";
    if (job.finishedOn) return "Slutförd";
    if (job.processedOn) return "Bearbetar";
    return "Väntar";
  };

  return (
    <DialogHeader className="pb-6">
      <div className="flex items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            <div className={`p-2 rounded-full ${getStatusColor()}`}>
              {getStatusIcon()}
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-01">
                {job.data.companyName || job.data.company}
              </DialogTitle>
              <div className="text-sm text-gray-02 font-medium">
                {needsApproval
                  ? "Väntar på godkännande"
                  : `${stage?.name || job.queueId} • ${getStatusText()}`}
              </div>
            </div>
          </div>
          {job.data.description && (
            <DialogDescription className="text-base text-gray-02 leading-relaxed">
              {job.data.description}
            </DialogDescription>
          )}
        </div>
      </div>
    </DialogHeader>
  );
}
