import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Button } from "./button";

interface FieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  fieldName: string;
  companyName: string;
  status: string;
  data: {
    wikiId: string;
    channelId: string;
    urls: string[];
  };
}

export function FieldModal({
  isOpen,
  onClose,
  fieldName,
  companyName,
  status,
  data,
}: FieldModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[#252525] border-[#525252]">
        <DialogHeader>
          <DialogTitle className="text-white">
            {fieldName} - {companyName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-[#2A2A2A] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-2">Status</h3>
            <div className="text-sm text-[#B8B8B8] capitalize">{status}</div>
          </div>

          <div className="bg-[#2A2A2A] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-2">Data</h3>
            <div className="space-y-2 text-sm text-[#B8B8B8]">
              <div>Wiki ID: {data.wikiId}</div>
              <div>Channel ID: {data.channelId}</div>
              <div>
                URLs:
                <ul className="list-disc list-inside ml-4 mt-1">
                  {data.urls.map((url, index) => (
                    <li key={index}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#7BCAE6] hover:underline"
                      >
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[#B8B8B8] hover:text-white"
          >
            Stäng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

