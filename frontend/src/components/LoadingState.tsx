import React from "react";
import { FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StyledLoadingStateProps {
  progress: number;
  title?: string;
  loadingText?: string;
  statusText?: string;
}

const StyledLoadingState: React.FC<StyledLoadingStateProps> = ({
  progress,
  title = "Analysera utvärderingsmodell",
  loadingText = "Analyserar upphandlingsdokumentet",
  statusText = "Vänligen vänta medan vi analyserar ditt dokument",
}) => {
  return (
    <Card className="w-[500px] shadow-lg border border-indigo-100">
      <CardHeader className="border-b border-indigo-100">
        <CardTitle className="text-2xl text-center text-indigo-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="text-center mb-4">
          <FileText className="mx-auto h-12 w-12 text-indigo-900 mb-2" />
          <h3 className="text-lg font-medium text-indigo-900">{loadingText}</h3>
          <p className="text-sm text-indigo-700">{statusText}</p>
        </div>
        <Progress value={progress} className="w-full h-2 [&>div]:bg-indigo-900" />
        <p className="text-center text-sm text-indigo-700">{progress}% klar</p>
      </CardContent>
    </Card>
  );
};

export default StyledLoadingState; 