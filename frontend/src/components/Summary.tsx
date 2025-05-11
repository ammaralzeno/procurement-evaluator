import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";

interface StyledSummaryProps {
  summary: string;
}

/**
 * Displays evaluation model summary in a dialog triggered by a button
 * Markdown is rendered with react-markdown
 */
const StyledSummary: React.FC<StyledSummaryProps> = ({ summary }) => {
  const [open, setOpen] = useState(false);
  
  if (!summary) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="default" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg rounded-full py-3 px-4 flex items-center gap-2"
        >
          <FileText className="h-5 w-5" />
          Sammanfattning av utvärderingsmodellen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[70vw] max-h-[90vh] bg-white pb-0">
        <DialogHeader>
          <DialogTitle>Sammanfattning av utvärderingsmodellen</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-4">
          <div className="prose prose-indigo max-w-none p-10">
          <ReactMarkdown
                                  components={{
                                    p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4" {...props} />,
                                    ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4" {...props} />,
                                    li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                    h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-3 mt-4" {...props} />,
                                    h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-3 mt-4" {...props} />,
                                    h3: ({node, ...props}) => <h3 className="text-base font-bold mb-2 mt-3" {...props} />,
                                    a: ({node, ...props}) => <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                hr: ({node, ...props}) => <hr className="my-4 border-gray-300" {...props} />,
              }}
            >
              {summary}
            </ReactMarkdown>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default StyledSummary; 