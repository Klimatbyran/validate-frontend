import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { QueueJob } from '@/lib/types';
import { WORKFLOW_STAGES } from '@/lib/constants';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  MessageSquare,
  RotateCcw,
  Check,
  X,
  ArrowUpRight,
  ArrowDownRight,
  GitBranch,
  GitMerge,
  HelpCircle
} from 'lucide-react';

interface JobDetailsDialogProps {
  job: QueueJob | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: (approved: boolean) => void;
  onRetry?: () => void;
}

function isJsonString(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

function JsonViewer({ data }: { data: any }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className="font-mono text-sm">
      <div className="flex items-center justify-between mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-03 hover:bg-blue-03/10"
        >
          {isExpanded ? 'Komprimera' : 'Expandera'}
        </Button>
      </div>
      <pre className={`
        bg-gray-03/20 rounded-lg p-3 overflow-x-auto
        ${isExpanded ? 'max-h-none' : 'max-h-32'}
      `}>
        {JSON.stringify(
          typeof data === 'string' ? JSON.parse(data) : data,
          null,
          2
        )}
      </pre>
    </div>
  );
}

export function JobDetailsDialog({ 
  job, 
  isOpen, 
  onOpenChange,
  onApprove,
  onRetry
}: JobDetailsDialogProps) {
  if (!job) return null;

  const stage = WORKFLOW_STAGES.find(s => s.id === job.queueId);
  const needsApproval = !job.data.approved && !job.data.autoApprove;
  const canRetry = job.isFailed;
  const hasParent = !!job.parent;

  const handleApprove = (approved: boolean) => {
    if (onApprove) {
      onApprove(approved);
      onOpenChange(false);
      toast.success(approved ? 'Jobbet godkänt' : 'Jobbet avvisat');
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      onOpenChange(false);
      toast.success('Jobbet omstartat');
    }
  };

  const getStatusIcon = () => {
    if (needsApproval) return <HelpCircle className="w-5 h-5 text-blue-03" />;
    if (job.isFailed) return <AlertTriangle className="w-5 h-5 text-pink-03" />;
    if (job.finishedOn) return <CheckCircle2 className="w-5 h-5 text-green-03" />;
    if (job.processedOn) return (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <RotateCcw className="w-5 h-5 text-blue-03" />
      </motion.div>
    );
    return <MessageSquare className="w-5 h-5 text-gray-02" />;
  };

  const getStatusColor = () => {
    if (needsApproval) return 'bg-blue-03/20';
    if (job.isFailed) return 'bg-pink-03/20';
    if (job.finishedOn) return 'bg-green-03/20';
    if (job.processedOn) return 'bg-blue-03/20';
    return 'bg-gray-03/20';
  };

  const getStatusText = () => {
    if (needsApproval) return 'Väntar på godkännande';
    if (job.isFailed) return 'Misslyckad';
    if (job.finishedOn) return 'Slutförd';
    if (job.processedOn) return 'Bearbetar';
    return 'Väntar';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl mb-2">
            {job.data.companyName || job.data.company}
          </DialogTitle>
          {job.data.description && (
            <DialogDescription className="text-base">
              {job.data.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-6 my-6">
          {/* Status Section */}
          <div className="bg-gray-03/20 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-01 mb-4">Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${getStatusColor()}`}>
                  {getStatusIcon()}
                </div>
                <div>
                  <div className="font-medium text-gray-01">
                    {stage?.name || job.queueId}
                  </div>
                  <div className="text-sm text-gray-02">
                    {getStatusText()}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-02">Skapad</div>
                <div className="text-gray-01">
                  {new Date(job.timestamp).toLocaleString('sv-SE')}
                </div>
              </div>
            </div>
          </div>

          {/* Job Relationships Section */}
          {hasParent && (
            <div className="bg-blue-03/10 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-03 mb-4 flex items-center">
                <GitBranch className="w-5 h-5 mr-2" />
                Jobbrelationer
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-blue-03">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="text-sm">Förälder:</span>
                  <code className="bg-blue-03/20 px-2 py-1 rounded text-sm">
                    {job.parent.queue}:{job.parent.id}
                  </code>
                </div>
              </div>
            </div>
          )}

          {/* Job Data Section */}
          <div className="bg-gray-03/20 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-01 mb-4">Jobbdata</h3>
            <div className="grid grid-cols-1 gap-4">
              {Object.entries(job.data).map(([key, value]) => {
                if (key === 'companyName' || key === 'description') return null;
                
                return (
                  <div key={key} className="bg-gray-04 rounded-lg p-3">
                    <div className="text-sm text-gray-02 mb-1">{key}</div>
                    <div className="text-gray-01 break-words">
                      {typeof value === 'string' && isJsonString(value) ? (
                        <JsonViewer data={value} />
                      ) : typeof value === 'object' ? (
                        <JsonViewer data={value} />
                      ) : (
                        String(value)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error Section */}
          {job.isFailed && job.stacktrace.length > 0 && (
            <div className="bg-pink-03/10 rounded-lg p-4">
              <h3 className="text-lg font-medium text-pink-03 mb-4">Felmeddelande</h3>
              <pre className="text-pink-03 text-sm overflow-x-auto">
                {job.stacktrace.join('\n')}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <div>
              {canRetry && (
                <Button
                  variant="ghost"
                  onClick={handleRetry}
                  className="text-blue-03 hover:bg-blue-03/10"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Försök igen
                </Button>
              )}
            </div>
            {needsApproval && (
              <div className="space-x-2">
                <Button
                  variant="ghost"
                  onClick={() => handleApprove(false)}
                  className="text-pink-03 hover:bg-pink-03/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Avvisa
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleApprove(true)}
                  className="text-green-03 hover:bg-green-03/10"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Godkänn
                </Button>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}