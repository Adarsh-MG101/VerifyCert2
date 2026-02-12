"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUI } from '@/context/UIContext';
import Link from 'next/link';
import { Card, Button } from '@/components';
import { getEditorConfig, refreshTemplate } from '@/services/onlyofficeService';

export default function TemplateEditorPage() {
    const params = useParams();
    const router = useRouter();
    const { showAlert } = useUI();
    const templateId = params.id;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editorConfig, setEditorConfig] = useState(null);
    const [templateInfo, setTemplateInfo] = useState(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [editorReady, setEditorReady] = useState(false);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [saved, setSaved] = useState(false);
    const editorRef = useRef(null);
    const containerRef = useRef(null);
    const scriptLoadedRef = useRef(false);

    // Fetch editor config
    useEffect(() => {
        if (!templateId) return;

        const fetchConfig = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getEditorConfig(templateId);
                setEditorConfig(data.config);
                setTemplateInfo({
                    name: data.templateName,
                    id: data.templateId,
                    placeholders: data.placeholders,
                    onlyofficeUrl: data.onlyofficeUrl
                });
            } catch (err) {
                console.error('Failed to load editor config:', err);
                const msg = err.response?.data?.error || 'Failed to load editor configuration';
                setError(msg);
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, [templateId]);

    // Load OnlyOffice script
    useEffect(() => {
        if (!templateInfo?.onlyofficeUrl || scriptLoadedRef.current) return;

        const existingScript = document.querySelector('script[data-onlyoffice]');
        if (existingScript) {
            setScriptLoaded(true);
            scriptLoadedRef.current = true;
            return;
        }

        const script = document.createElement('script');
        script.src = `${templateInfo.onlyofficeUrl}/web-apps/apps/api/documents/api.js`;
        script.setAttribute('data-onlyoffice', 'true');
        script.async = true;

        script.onload = () => {
            console.log('✅ OnlyOffice API script loaded');
            setScriptLoaded(true);
            scriptLoadedRef.current = true;
        };

        script.onerror = (e) => {
            console.error('❌ Failed to load OnlyOffice script:', e);
            setError(
                'Could not connect to OnlyOffice Document Server. Make sure it is running at: ' +
                templateInfo.onlyofficeUrl +
                '\n\nRun: docker-compose up -d'
            );
        };

        document.head.appendChild(script);

        return () => {
            // Don't remove script on unmount, it can be reused
        };
    }, [templateInfo?.onlyofficeUrl]);

    // Initialize the editor
    useEffect(() => {
        if (!scriptLoaded || !editorConfig || editorReady) return;
        if (!window.DocsAPI) {
            console.error('❌ OnlyOffice window.DocsAPI not found even though script reported loaded');
            setError('OnlyOffice API not available. Make sure Document Server is running.');
            return;
        }

        console.log('🏗️ Initializing OnlyOffice Editor with config:', JSON.stringify(editorConfig, null, 2));

        // Destroy existing editor if any
        if (editorRef.current) {
            try { editorRef.current.destroyEditor(); } catch (e) { }
            editorRef.current = null;
        }

        // Clear the container
        const container = document.getElementById('onlyoffice-editor');
        if (container) container.innerHTML = '';

        const configWithEvents = {
            ...editorConfig,
            events: {
                onDocumentReady: () => {
                    console.log('📄 Document ready in OnlyOffice editor');
                    setEditorReady(true);
                },
                onDocumentStateChange: (event) => {
                    // event.data is true when document has unsaved changes
                    if (event.data) {
                        setSaved(false);
                    }
                },
                onError: (event) => {
                    console.error('OnlyOffice editor error:', event);
                },
                onRequestClose: () => {
                    router.push('/dashboard/existing-templates');
                }
            }
        };

        try {
            editorRef.current = new window.DocsAPI.DocEditor('onlyoffice-editor', configWithEvents);
        } catch (e) {
            console.error('Failed to create editor:', e);
            setError('Failed to initialize the document editor: ' + e.message);
        }

        return () => {
            if (editorRef.current) {
                try { editorRef.current.destroyEditor(); } catch (e) { }
                editorRef.current = null;
            }
        };
    }, [scriptLoaded, editorConfig]);

    // Handle refresh (re-extract placeholders & thumbnail)
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            const result = await refreshTemplate(templateId);
            if (result.success) {
                setTemplateInfo(prev => ({
                    ...prev,
                    placeholders: result.placeholders
                }));
                showAlert(
                    'Template Refreshed',
                    `Successfully re-extracted ${result.placeholders.length} placeholder(s) and regenerated thumbnail.`,
                    'success'
                );
            }
        } catch (err) {
            console.error('Refresh failed:', err);
            showAlert('Refresh Failed', err.response?.data?.error || 'Failed to refresh template', 'error');
        } finally {
            setRefreshing(false);
        }
    }, [templateId, showAlert]);

    // Loading state
    if (loading) {
        return (
            <div className="animate-fade-in max-w-7xl mx-auto pb-10">
                <div className="flex flex-col items-center justify-center py-32">
                    <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6 shadow-lg shadow-primary/20"></div>
                    <p className="text-primary font-medium animate-pulse text-sm tracking-wider uppercase">Loading Template Editor...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="animate-fade-in max-w-4xl mx-auto pb-10">
                <Card className="p-8">
                    <div className="flex flex-col items-center text-center py-10">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-foreground mb-3">Unable to Load Editor</h2>
                        <p className="text-muted text-sm max-w-md whitespace-pre-line mb-8">{error}</p>

                        <div className="space-y-4 w-full max-w-md">
                            <div className="bg-gray-50 border border-border rounded-lg p-5 text-left">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Setup Instructions</h4>
                                <ol className="text-xs text-muted space-y-2 list-decimal list-inside">
                                    <li>Make sure <span className="text-primary font-mono">Docker Desktop</span> is installed and running</li>
                                    <li>Open terminal in the project root directory</li>
                                    <li>Run: <code className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">docker-compose up -d</code></li>
                                    <li>Wait ~60 seconds for OnlyOffice to start</li>
                                    <li>Refresh this page</li>
                                </ol>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    onClick={() => window.location.reload()}
                                    className="flex-1"
                                >
                                    Retry
                                </Button>
                                <Link href="/dashboard/existing-templates" className="flex-1">
                                    <Button variant="outline" className="w-full">
                                        Back to Library
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="animate-fade-in flex flex-col -mx-8 -mb-8 -mt-4 overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
            {/* Editor Toolbar */}
            <div className="bg-card border-b border-border px-6 py-3 flex items-center justify-between shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/existing-templates"
                        className="flex items-center gap-2 text-muted hover:text-foreground transition-colors group"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
                            <path d="M19 12H5"></path>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        <span className="text-xs font-medium uppercase tracking-wider">Back</span>
                    </Link>

                    <div className="w-px h-6 bg-border"></div>

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold text-foreground leading-tight">
                                {templateInfo?.name || 'Template'}
                            </h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-mono text-muted">ID: {templateInfo?.id?.slice(-8)}</span>
                                {editorReady && (
                                    <span className="inline-flex items-center gap-1 text-[9px] text-green-600 font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                        Live
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Placeholders Badge */}
                    {templateInfo?.placeholders?.length > 0 && (
                        <div className="hidden md:flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-border">
                            <span className="text-[9px] uppercase font-medium text-muted tracking-wider">Placeholders</span>
                            <div className="flex flex-wrap gap-1 max-w-[300px]">
                                {templateInfo.placeholders.slice(0, 4).map(p => (
                                    <span key={p} className="bg-primary/10 text-[9px] px-2 py-0.5 rounded text-primary font-mono border border-primary/20">
                                        {`{{${p}}}`}
                                    </span>
                                ))}
                                {templateInfo.placeholders.length > 4 && (
                                    <span className="text-[9px] text-muted font-medium">+{templateInfo.placeholders.length - 4}</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 border border-border text-sm font-medium text-muted hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Re-extract placeholders & regenerate thumbnail from the saved template"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? 'animate-spin' : ''}>
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        <span className="text-xs uppercase tracking-wider font-medium">
                            {refreshing ? 'Syncing...' : 'Sync'}
                        </span>
                    </button>
                </div>
            </div>

            {/* OnlyOffice Editor Container */}
            <div className="flex-1 relative bg-gray-100" ref={containerRef}>
                {!editorReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gray-50">
                        <div className="relative mb-8">
                            <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary/50">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                </svg>
                            </div>
                        </div>
                        <p className="text-sm font-medium text-muted animate-pulse tracking-wider uppercase">
                            Connecting to OnlyOffice...
                        </p>
                        <p className="text-[10px] text-gray-400 mt-2 font-mono">
                            {templateInfo?.onlyofficeUrl}
                        </p>
                    </div>
                )}
                <div
                    id="onlyoffice-editor"
                    style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
                ></div>
            </div>
        </div>
    );
}
