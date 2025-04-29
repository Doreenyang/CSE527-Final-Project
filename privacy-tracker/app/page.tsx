'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, AlertTriangle, CheckCircle, Info, Loader } from 'lucide-react';

type AnalysisResult = {
  url: string;
  behaviorSummary: string;
  classification: string;
  reasoning: string;
  timestamp: string;
  error?: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.txt')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Please upload a .txt file');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.txt')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please upload a .txt file');
      }
    }
  };

  const handleTrackClick = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('websites', file);

      setIsAnalyzing(true);
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze websites');
      }

      const data = await response.json();
      setResults(data.results);
    } catch (err) {
      setError(err.message || 'An error occurred during analysis');
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  const getClassificationBadge = (classification: string) => {
    switch (classification) {
      case 'A':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            明显隐私泄露
          </span>
        );
      case 'B':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Info className="w-3 h-3 mr-1" />
            可疑行为
          </span>
        );
      case 'C':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            安全行为
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            未分类
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">NoT.js privacy tracker</h1>
          <p className="mt-1 text-sm text-gray-500">
            Based on LLM
          </p>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* File upload section */}
          <div className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">upload website lists</h2>
              <p className="mt-1 text-sm text-gray-500">
                upload a website with a txt file with URL
              </p>
            </div>
            
            <div className="px-4 py-5 sm:p-6">
              <div 
                className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
              >
                <div className="space-y-1 text-center">
                  <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                      <span>上传文件</span>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        className="sr-only" 
                        accept=".txt"
                        onChange={handleFileSelect}
                      />
                    </label>
                    <p className="pl-1">drag here</p>
                  </div>
                  <p className="text-xs text-gray-500">only support txt</p>
                </div>
              </div>
              
              {file && (
                <div className="mt-4 p-2 bg-gray-50 rounded flex items-center justify-between">
                  <span className="text-sm text-gray-600">{file.name}</span>
                  <button 
                    type="button" 
                    className="text-sm text-red-600"
                    onClick={() => setFile(null)}
                  >
                    delete
                  </button>
                </div>
              )}
              
              {error && (
                <div className="mt-4 p-2 bg-red-50 rounded text-sm text-red-600">
                  {error}
                </div>
              )}
              
              <div className="mt-5">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  onClick={handleTrackClick}
                  disabled={!file || isUploading || isAnalyzing}
                >
                  {isUploading || isAnalyzing ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      {isUploading ? 'uploading...' : 'analyzing...'}
                    </>
                  ) : (
                    'now tracking'
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Results section */}
          {results.length > 0 && (
            <div className="mt-6 bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200">
              <div className="px-4 py-5 sm:px-6">
                <h2 className="text-lg font-medium text-gray-900">result</h2>
                <p className="mt-1 text-sm text-gray-500">
                  based on NoT.js 和 ChatGPT website privacy tracking analysis
                </p>
              </div>
              
              <div className="px-4 py-5 sm:p-6">
                <div className="flow-root">
                  <ul className="-mb-8">
                    {results.map((result, resultIdx) => (
                      <li key={result.url}>
                        <div className="relative pb-8">
                          {resultIdx !== results.length - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                          ) : null}
                          
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                                result.error ? 'bg-red-500' : 
                                result.classification === 'A' ? 'bg-red-500' :
                                result.classification === 'B' ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}>
                                {result.error ? (
                                  <AlertTriangle className="h-5 w-5 text-white" />
                                ) : result.classification === 'A' ? (
                                  <AlertTriangle className="h-5 w-5 text-white" />
                                ) : result.classification === 'B' ? (
                                  <Info className="h-5 w-5 text-white" />
                                ) : (
                                  <CheckCircle className="h-5 w-5 text-white" />
                                )}
                              </span>
                            </div>
                            
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-500">
                                  网站: <span className="font-medium text-gray-900">{result.url}</span>
                                </p>
                                
                                {result.error ? (
                                  <div className="mt-2 text-sm text-red-600">
                                    分析出错: {result.error}
                                  </div>
                                ) : (
                                  <>
                                    <div className="mt-2">
                                      {getClassificationBadge(result.classification)}
                                    </div>
                                    
                                    <div className="mt-3 bg-gray-50 rounded-md p-3">
                                      <p className="text-sm font-medium text-gray-900">GPT 分析结果:</p>
                                      <p className="mt-1 text-sm text-gray-600">{result.reasoning}</p>
                                    </div>
                                    
                                    <div className="mt-3">
                                      <p className="text-sm font-medium text-gray-900">行为摘要:</p>
                                      <div className="mt-1 bg-black rounded-md p-4 overflow-x-auto">
                                        <pre className="text-xs text-green-400 font-mono">
                                          {result.behaviorSummary}
                                        </pre>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                              
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                <time dateTime={result.timestamp}>
                                  {new Date(result.timestamp).toLocaleString()}
                                </time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 
