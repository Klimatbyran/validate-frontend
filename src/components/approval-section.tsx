import React from "react";
import { HelpCircle, FileText } from "lucide-react";

interface ApprovalSectionProps {
  job: any;
}

export function ApprovalSection({ job }: ApprovalSectionProps) {
  return (
    <div className="bg-gradient-to-r from-blue-03/10 to-blue-04/10 rounded-xl p-6 border border-blue-03/20">
      <div className="flex items-center space-x-4 mb-4">
        <div className="p-3 rounded-full bg-blue-03/20">
          <HelpCircle className="w-6 h-6 text-blue-03" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-blue-03">
            Godkännande krävs
          </h3>
          <p className="text-base text-blue-03/80 leading-relaxed">
            Vänligen granska informationen nedan och godkänn eller avvisa
            jobbet.
          </p>
        </div>
        {job.data.url && (
          <a
            href={job.data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-blue-03 hover:text-blue-03/80 bg-blue-03/20 hover:bg-blue-03/30 p-3 rounded-xl transition-all duration-200 border border-blue-03/30"
            title="Öppna källdokument"
          >
            <FileText className="w-5 h-5" />
            <span className="text-sm font-medium">Öppna PDF</span>
          </a>
        )}
      </div>
    </div>
  );
}
