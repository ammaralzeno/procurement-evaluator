import React, { useState } from "react";
import { CloudUpload, InfoIcon, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface StyledUploadFileProps {
  loading: boolean;
  error: string | null;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
  id?: string;
  title?: string;
}

const StyledUploadFile: React.FC<StyledUploadFileProps> = ({
  loading,
  error,
  handleFileChange,
  accept = ".pdf",
  id = "specFile",
  title = "Analysera utvärderingsmodell",
}) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  
  const handleFileClick = () => {
    document.getElementById(id)?.click();
  };
  
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFileName(selectedFile.name);
      setFile(selectedFile);
    }
    handleFileChange(event);
  };

  return (
    <Card className="w-[500px] shadow-lg border border-indigo-100">
      <CardHeader className="border-b border-indigo-100">
        <CardTitle className="text-2xl text-center text-indigo-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <Alert className="border-indigo-200 text-indigo-800 bg-indigo-50">
          <InfoIcon className="h-4 w-4 text-indigo-800" />
          <AlertDescription>
            <ul className="list-disc pl-5 space-y-1">
              <li>Ladda endast upp ett upphandlingsdokument åt gången.</li>
              <li>Dokumentet måste innehålla utvärderingsmodellen eller information om hur anbudet utvärderas.</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        <div 
          className="border-2 border-dashed border-indigo-200 rounded-md p-6 text-center hover:border-indigo-900 transition-colors cursor-pointer"
          onClick={handleFileClick}
          onKeyDown={(e) => e.key === "Enter" && handleFileClick()}
          tabIndex={0}
          aria-label="Klicka för att ladda upp en fil"
        >
          <CloudUpload className="mx-auto h-12 w-12 text-indigo-900 mb-2" />
          <div className="mt-2">
            <Label htmlFor={id} className="cursor-pointer text-sm font-medium text-indigo-900 hover:underline">
              {fileName ? fileName : "Välj en PDF-fil"}
            </Label>
            <Input
              id={id}
              type="file"
              accept={accept}
              className="hidden"
              onChange={handleChange}
              disabled={loading}
            />
          </div>
          <p className="text-xs text-indigo-700 mt-2">
            Stöd format: PDF
          </p>
        </div>
        
        {error && (
          <Alert variant="destructive" className="border-red-500 text-red-800 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Misslyckades</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {loading && <p className="text-sm text-blue-600">Bearbetar fil...</p>}
        
        {file && !loading && (
          <Button 
            className="w-full mt-4 bg-indigo-900 hover:bg-indigo-800 text-white" 
            onClick={() => handleFileChange({ target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>)}
          >
            Analysera
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default StyledUploadFile; 