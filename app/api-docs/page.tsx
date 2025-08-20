"use client";

import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<object | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    fetch('/openapi.json')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load OpenAPI spec: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setSpec(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load OpenAPI spec:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          Loading API documentation...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold mb-2">Failed to load API documentation</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg">No API specification found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <ApiReferenceReact
        configuration={{
          content: spec,
          theme: theme === 'dark' ? 'moon' : 'default',
          layout: 'modern',
          showSidebar: true,
          searchHotKey: 'k',
          hideDownloadButton: false,
          hideTestRequestButton: false,
          servers: [
            {
              url: process.env.NEXT_PUBLIC_API_URL || `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api`,
              description: 'API Server'
            }
          ],
          authentication: {
            preferredSecurityScheme: 'BearerAuth',
            securitySchemes: {
              BearerAuth: {
                token: ''
              },
              ApiKeyAuth: {
                name: 'X-API-Key',
                in: 'header',
                value: ''
              }
            }
          },
          metaData: {
            title: 'modules Repository API',
            description: 'Complete API documentation for the modules platform',
          },
          tagsSorter: 'alpha',
          operationsSorter: 'alpha',
          hiddenClients: [],
          defaultHttpClient: {
            targetKey: 'js',
            clientKey: 'fetch'
          },
        }}
      />
    </div>
  );
}