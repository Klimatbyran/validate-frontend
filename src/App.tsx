import React, { useState, useCallback } from 'react';
import { FileUp, File, Building2, ArrowRight, Link2, FileText, Twitch as Switch } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/ui/header';
import { QueueStatus } from '@/components/ui/queue-status';
import { QueueGrid } from '@/components/ui/queue-grid';
import { WorkflowDiagram } from '@/components/ui/workflow-diagram';
import { DebugView } from '@/components/ui/debug-view';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

interface UploadedFile {
  file: File;
  id: string;
  company: string;
}

interface UrlInput {
  url: string;
  id: string;
  company: string;
}

function App() {
  const [currentTab, setCurrentTab] = useState('upload');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [processedUrls, setProcessedUrls] = useState<UrlInput[]>([]);
  const [autoApprove, setAutoApprove] = useState(true);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    );

    if (files.length === 0) {
      toast.error('Endast PDF-filer är tillåtna');
      return;
    }

    const newFiles = files.map(file => ({
      file,
      id: crypto.randomUUID(),
      company: file.name.split('_')[0]
    }));

    setUploadedFiles(prev => {
      const updatedFiles = [...prev, ...newFiles];
      toast.success(`${files.length} fil${files.length === 1 ? '' : 'er'} uppladdade`);
      return updatedFiles;
    });
  }, []);

  const handleUrlSubmit = useCallback(async () => {
    // Split the input by newlines and filter out empty lines
    const urls = urlInput.split('\n')
      .map(url => url.trim())
      .filter(url => url)
      // ignorera om filerna slutar på pdf eller ej- vissa kommer inte göra det men ändå vara giltiga pdf:er.

    if (urls.length === 0) {
      toast.error('Inga giltiga PDF-länkar hittades');
      return;
    }

    // Create jobs for each URL
    const jobs = urls.map(url => ({
      name: 'process-pdf',
      data: {
        url,
        threadId: crypto.randomUUID().replace(/-/g, ''),
        autoApprove: Boolean(autoApprove), // Use boolean instead of string
        messageId: crypto.randomUUID().replace(/-/g, '')
      },
      options: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      }
    }));

    // Send jobs to the API
    try {
      const responses = await Promise.all(jobs.map(async job => {
        console.log('Sending job:', job);

        const response = await fetch('/api/queues/nlmParsePDF/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(job)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Job submission error:', errorText);
          throw new Error(`Failed to add job: ${errorText}`);
        }

        return response.json();
      }));

      console.log('Queue responses:', responses);

      const newUrls = urls.map(url => ({
        url,
        id: crypto.randomUUID(),
        company: new URL(url).hostname.split('.')[0]
      }));

      setProcessedUrls(prev => {
        const updatedUrls = [...prev, ...newUrls];
        toast.success(`${urls.length} länk${urls.length === 1 ? '' : 'ar'} tillagda`);
        return updatedUrls;
      });

      // Clear the input field
      setUrlInput('');
    } catch (error) {
      console.error('Failed to add jobs:', error);
      toast.error(`Kunde inte lägga till jobb: ${error.message}`);
    }
  }, [urlInput, autoApprove]);

  const handleContinue = useCallback(() => {
    const totalItems = uploadedFiles.length + processedUrls.length;
    if (totalItems === 0) {
      toast.error('Lägg till filer eller länkar först');
      return;
    }

    setCurrentTab('processing');
    toast('Påbörjar bearbetning...', {
      description: `${totalItems} ${uploadMode === 'file' ? 'fil' : 'länk'}${totalItems === 1 ? '' : 'ar'} att processa`,
    });
  }, [uploadedFiles.length, processedUrls.length, uploadMode]);

  return (
    <div className="min-h-screen bg-gray-05 p-8">
      <Toaster />
      <div className="max-w-[1400px] mx-auto">
        <Header />

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          <TabsList className="bg-gray-04/50 backdrop-blur-sm">
            <TabsTrigger value="upload">Uppladdning</TabsTrigger>
            <TabsTrigger value="processing">Bearbetning</TabsTrigger>
            <TabsTrigger value="grid">Jobbstatus</TabsTrigger>
            <TabsTrigger value="workflow">Processflöde</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
            <TabsTrigger value="results">Resultat</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait" initial={false}>
            <TabsContent key="upload" value="upload" asChild>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="space-y-6">
                  {/* Upload Mode Tabs */}
                  <Tabs value={uploadMode} onValueChange={setUploadMode as any} className="w-full">
                    <TabsList className="inline-flex bg-gray-04/50 p-1 rounded-full">
                      <TabsTrigger value="file" className="rounded-full">
                        <FileText className="w-4 h-4 mr-2" />
                        Filer
                      </TabsTrigger>
                      <TabsTrigger value="url" className="rounded-full">
                        <Link2 className="w-4 h-4 mr-2" />
                        Länkar
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="file">
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`
                          border-2 border-dashed rounded-lg p-12
                          flex flex-col items-center justify-center
                          transition-all duration-200
                          bg-gray-04/50 backdrop-blur-sm
                          ${isDragging 
                            ? 'border-orange-03 bg-orange-05/10' 
                            : 'border-gray-03 hover:border-gray-02'
                          }
                        `}
                      >
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <FileUp 
                            className={`w-12 h-12 mb-4 ${
                              isDragging ? 'text-orange-03' : 'text-gray-02'
                            }`}
                          />
                        </motion.div>
                        <p className="text-lg text-gray-01 text-center">
                          Dra och släpp PDF filer här
                          <br />
                          <span className="text-sm text-gray-02">
                            eller klicka för att välja filer
                          </span>
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="url">
                      <div className="space-y-4">
                        <div className="bg-gray-04/50 backdrop-blur-sm rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <label className="block text-sm font-medium text-gray-01">
                              Klistra in PDF-länkar (en per rad)
                            </label>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-02">
                                Auto-godkänn
                              </span>
                              <button
                                onClick={() => setAutoApprove(!autoApprove)}
                                className={`
                                  relative inline-flex h-6 w-11 items-center rounded-full
                                  transition-colors focus-visible:outline-none
                                  focus-visible:ring-2 focus-visible:ring-ring
                                  focus-visible:ring-offset-2
                                  ${autoApprove ? 'bg-green-03' : 'bg-gray-03'}
                                `}
                              >
                                <span
                                  className={`
                                    inline-block h-4 w-4 transform rounded-full
                                    bg-white transition-transform
                                    ${autoApprove ? 'translate-x-6' : 'translate-x-1'}
                                  `}
                                />
                              </button>
                            </div>
                          </div>
                          <textarea
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="https://example.com/rapport.pdf&#10;https://example.com/rapport2.pdf"
                            className="w-full h-32 bg-gray-03/20 border border-gray-03 rounded-lg p-3 text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03"
                          />
                          <div className="mt-4 flex justify-end">
                            <Button
                              onClick={handleUrlSubmit}
                              disabled={!urlInput.trim()}
                            >
                              <Link2 className="w-4 h-4 mr-2" />
                              Lägg till länkar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* File/URL List */}
                  {(uploadedFiles.length > 0 || processedUrls.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-04/80 backdrop-blur-sm rounded-lg"
                    >
                      <div className="p-4 border-b border-gray-03 flex justify-between items-center">
                        <h2 className="text-lg text-gray-01">
                          {uploadMode === 'file' ? (
                            `Uppladdade filer (${uploadedFiles.length})`
                          ) : (
                            `Tillagda länkar (${processedUrls.length})`
                          )}
                        </h2>
                        <Button
                          variant="primary"
                          onClick={handleContinue}
                        >
                          Se resultat
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                      <ul className="divide-y divide-gray-03">
                        {uploadMode === 'file' ? (
                          uploadedFiles.map(({file, id, company}) => (
                            <motion.li
                              key={id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="p-4 flex items-center space-x-4"
                            >
                              <File className="w-6 h-6 text-orange-03" />
                              <div className="flex-1">
                                <p className="text-sm text-gray-01">
                                  {file.name}
                                </p>
                                <p className="text-sm text-gray-02">
                                  Företag: {company} • {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </motion.li>
                          ))
                        ) : (
                          processedUrls.map(({url, id, company}) => (
                            <motion.li
                              key={id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="p-4 flex items-center space-x-4"
                            >
                              <Link2 className="w-6 h-6 text-orange-03" />
                              <div className="flex-1">
                                <p className="text-sm text-gray-01 break-all">
                                  {url}
                                </p>
                                <p className="text-sm text-gray-02">
                                  Företag: {company}
                                </p>
                              </div>
                            </motion.li>
                          ))
                        )}
                      </ul>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent key="processing" value="processing" asChild>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <QueueStatus />
              </motion.div>
            </TabsContent>

            <TabsContent key="grid" value="grid" asChild>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <QueueGrid />
              </motion.div>
            </TabsContent>

            <TabsContent key="workflow" value="workflow" asChild>
              <motion.div>
                <WorkflowDiagram />
              </motion.div>
            </TabsContent>

            <TabsContent key="debug" value="debug" asChild>
              <motion.div>
                <DebugView />
              </motion.div>
            </TabsContent>

            <TabsContent key="results" value="results" asChild>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6"
              >
                <h2 className="text-xl text-gray-01 mb-4">
                  Resultatöversikt
                </h2>
                <p className="text-gray-02">
                  Här kommer resultaten att visas när bearbetningen är klar.
                </p>
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
