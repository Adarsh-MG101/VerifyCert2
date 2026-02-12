"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

// ─── AI Toolkit Component ───
const AIToolkit = ({ editor, position, onClose }) => {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    const toolkitRef = useRef(null);

    const selectedText = editor?.state?.doc?.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        ' '
    ) || '';

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (toolkitRef.current && !toolkitRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const aiActions = [
        { label: '✨ Improve Writing', action: 'improve' },
        { label: '📝 Make Formal', action: 'formal' },
        { label: '🔄 Rephrase', action: 'rephrase' },
        { label: '📏 Make Shorter', action: 'shorter' },
        { label: '📐 Make Longer', action: 'longer' },
        { label: '🔧 Fix Grammar', action: 'grammar' },
    ];

    const processAIAction = useCallback(async (action) => {
        if (!selectedText.trim()) return;
        setLoading(true);
        setResult('');

        // Simulated AI processing (replace with real API call if needed)
        await new Promise(r => setTimeout(r, 800));

        let transformed = selectedText;
        switch (action) {
            case 'improve':
                transformed = selectedText.charAt(0).toUpperCase() + selectedText.slice(1);
                if (!transformed.endsWith('.')) transformed += '.';
                break;
            case 'formal':
                transformed = selectedText
                    .replace(/\bcan't\b/gi, 'cannot')
                    .replace(/\bdon't\b/gi, 'do not')
                    .replace(/\bwon't\b/gi, 'will not')
                    .replace(/\bit's\b/gi, 'it is')
                    .replace(/\bwe're\b/gi, 'we are')
                    .replace(/\bthey're\b/gi, 'they are')
                    .replace(/\byou're\b/gi, 'you are')
                    .replace(/\bI'm\b/gi, 'I am')
                    .replace(/\bhe's\b/gi, 'he is')
                    .replace(/\bshe's\b/gi, 'she is');
                break;
            case 'rephrase':
                const words = selectedText.split(' ');
                if (words.length > 3) {
                    transformed = words.slice(0, 2).join(' ') + ', ' + words.slice(2).join(' ');
                }
                break;
            case 'shorter':
                const sentences = selectedText.split(/[.!?]+/).filter(s => s.trim());
                transformed = sentences.length > 1
                    ? sentences.slice(0, Math.ceil(sentences.length / 2)).join('. ') + '.'
                    : selectedText;
                break;
            case 'longer':
                transformed = selectedText + ' Furthermore, this is elaborated upon in greater detail.';
                break;
            case 'grammar':
                transformed = selectedText
                    .replace(/\s+/g, ' ')
                    .replace(/\s+([.,!?;:])/g, '$1')
                    .replace(/([.!?])\s*(\w)/g, (_, p, c) => `${p} ${c.toUpperCase()}`)
                    .trim();
                if (transformed.length > 0) {
                    transformed = transformed.charAt(0).toUpperCase() + transformed.slice(1);
                }
                break;
            case 'custom':
                transformed = selectedText;
                break;
            default:
                break;
        }

        setResult(transformed);
        setLoading(false);
    }, [selectedText]);

    const applyResult = useCallback(() => {
        if (!result || !editor) return;
        const { from, to } = editor.state.selection;
        editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, result).run();
        onClose();
    }, [result, editor, onClose]);

    return (
        <div
            ref={toolkitRef}
            className="ai-toolkit-panel"
            style={{
                position: 'fixed',
                top: `${position.y}px`,
                left: `${position.x}px`,
                zIndex: 99999,
            }}
        >
            <div className="ai-toolkit-header">
                <div className="ai-toolkit-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                </div>
                <span>AI Toolkit</span>
                <button onClick={onClose} className="ai-toolkit-close">×</button>
            </div>

            {selectedText && (
                <div className="ai-toolkit-selection">
                    <span className="ai-toolkit-label">Selected:</span>
                    <span className="ai-toolkit-text">&quot;{selectedText.substring(0, 60)}{selectedText.length > 60 ? '...' : ''}&quot;</span>
                </div>
            )}

            <div className="ai-toolkit-actions">
                {aiActions.map(({ label, action }) => (
                    <button
                        key={action}
                        onClick={() => processAIAction(action)}
                        disabled={loading || !selectedText.trim()}
                        className="ai-toolkit-action-btn"
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="ai-toolkit-custom">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Custom instruction..."
                    className="ai-toolkit-input"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && prompt.trim()) {
                            processAIAction('custom');
                        }
                    }}
                />
            </div>

            {loading && (
                <div className="ai-toolkit-loading">
                    <div className="ai-toolkit-spinner"></div>
                    <span>Processing...</span>
                </div>
            )}

            {result && !loading && (
                <div className="ai-toolkit-result">
                    <div className="ai-toolkit-result-header">
                        <span>✅ Result</span>
                    </div>
                    <div className="ai-toolkit-result-text">{result}</div>
                    <div className="ai-toolkit-result-actions">
                        <button onClick={applyResult} className="ai-toolkit-apply-btn">
                            Apply Change
                        </button>
                        <button onClick={() => setResult('')} className="ai-toolkit-discard-btn">
                            Discard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


// ─── Toolbar Button ───
const ToolbarButton = ({ onClick, active, disabled, title, children }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`te-toolbar-btn ${active ? 'te-toolbar-btn--active' : ''}`}
    >
        {children}
    </button>
);

// ─── Toolbar Divider ───
const ToolbarDivider = () => <div className="te-toolbar-divider" />;


// ─── Floating Selection Toolbar ───
const FloatingToolbar = ({ editor }) => {
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const toolbarRef = useRef(null);

    useEffect(() => {
        if (!editor) return;

        const updateToolbar = () => {
            const { selection } = editor.state;
            const { empty } = selection;

            if (empty) {
                setVisible(false);
                return;
            }

            const domSelection = window.getSelection();
            if (!domSelection || domSelection.rangeCount === 0) {
                setVisible(false);
                return;
            }

            const range = domSelection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            if (rect.width === 0 && rect.height === 0) {
                setVisible(false);
                return;
            }

            setPosition({
                top: rect.top - 50,
                left: rect.left + rect.width / 2 - 100,
            });
            setVisible(true);
        };

        editor.on('selectionUpdate', updateToolbar);
        editor.on('blur', () => setVisible(false));

        return () => {
            editor.off('selectionUpdate', updateToolbar);
        };
    }, [editor]);

    if (!visible || !editor) return null;

    const addLink = () => {
        const url = window.prompt('Enter the URL:');
        if (url) {
            editor.chain().focus().setLink({ href: url }).run();
        }
    };

    return (
        <div
            ref={toolbarRef}
            className="te-bubble-menu"
            style={{
                position: 'fixed',
                top: `${position.top}px`,
                left: `${position.left}px`,
                zIndex: 9999,
            }}
        >
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`te-bubble-btn ${editor.isActive('bold') ? 'te-bubble-btn--active' : ''}`}
            >
                <strong>B</strong>
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`te-bubble-btn ${editor.isActive('italic') ? 'te-bubble-btn--active' : ''}`}
            >
                <em>I</em>
            </button>
            <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`te-bubble-btn ${editor.isActive('underline') ? 'te-bubble-btn--active' : ''}`}
            >
                <u>U</u>
            </button>
            <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`te-bubble-btn ${editor.isActive('strike') ? 'te-bubble-btn--active' : ''}`}
            >
                <s>S</s>
            </button>
            <div className="te-bubble-divider" />
            <button
                onClick={addLink}
                className={`te-bubble-btn ${editor.isActive('link') ? 'te-bubble-btn--active' : ''}`}
            >
                🔗
            </button>
        </div>
    );
};


// ─── Main Template Editor ───
const TemplateEditor = ({ template, htmlContent, onSave, onClose, saving }) => {
    const [showAIToolkit, setShowAIToolkit] = useState(false);
    const [aiToolkitPosition, setAiToolkitPosition] = useState({ x: 0, y: 0 });
    const [placeholderInput, setPlaceholderInput] = useState('');
    const [showPlaceholderDropdown, setShowPlaceholderDropdown] = useState(false);
    const hoverTimerRef = useRef(null);
    const editorContainerRef = useRef(null);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4, 5, 6] },
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'te-link',
                },
            }),
            Placeholder.configure({
                placeholder: 'Start editing your template…',
            }),
        ],
        content: htmlContent || '<p>Loading template content...</p>',
        editorProps: {
            attributes: {
                class: 'te-editor-content',
            },
        },
    });

    // Update editor content when htmlContent changes
    useEffect(() => {
        if (editor && htmlContent) {
            editor.commands.setContent(htmlContent);
        }
    }, [htmlContent, editor]);

    // AI Toolkit hover detection - 3 second hover over selected text
    useEffect(() => {
        if (!editor) return;

        const editorElement = editorContainerRef.current;
        if (!editorElement) return;

        const handleMouseUp = () => {
            // Clear previous timer
            if (hoverTimerRef.current) {
                clearTimeout(hoverTimerRef.current);
            }

            // Only trigger if there's text selected
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !selection.toString().trim()) return;

            // Start 3-second timer
            hoverTimerRef.current = setTimeout(() => {
                const domSelection = window.getSelection();
                if (!domSelection || domSelection.isCollapsed) return;

                const range = domSelection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                setAiToolkitPosition({
                    x: Math.min(rect.left, window.innerWidth - 320),
                    y: Math.min(rect.bottom + 8, window.innerHeight - 400),
                });
                setShowAIToolkit(true);
            }, 3000);
        };

        const handleMouseDown = () => {
            if (hoverTimerRef.current) {
                clearTimeout(hoverTimerRef.current);
            }
            setShowAIToolkit(false);
        };

        editorElement.addEventListener('mouseup', handleMouseUp);
        editorElement.addEventListener('mousedown', handleMouseDown);

        return () => {
            editorElement.removeEventListener('mouseup', handleMouseUp);
            editorElement.removeEventListener('mousedown', handleMouseDown);
            if (hoverTimerRef.current) {
                clearTimeout(hoverTimerRef.current);
            }
        };
    }, [editor]);

    const insertPlaceholder = useCallback(() => {
        if (!editor || !placeholderInput.trim()) return;
        const tag = `{{${placeholderInput.trim().toUpperCase()}}}`;
        editor.chain().focus().insertContent(tag).run();
        setPlaceholderInput('');
        setShowPlaceholderDropdown(false);
    }, [editor, placeholderInput]);

    const handleSave = useCallback(() => {
        if (!editor) return;
        const html = editor.getHTML();
        onSave(html);
    }, [editor, onSave]);

    const addLink = useCallback(() => {
        if (!editor) return;
        const url = window.prompt('Enter the URL:');
        if (url) {
            editor.chain().focus().setLink({ href: url }).run();
        }
    }, [editor]);

    if (!editor) return null;

    const charCount = editor.getText().length;
    const wordCount = editor.getText().split(/\s+/).filter(Boolean).length;

    return (
        <div className="te-container">
            {/* Header */}
            <div className="te-header">
                <div className="te-header-left">
                    <button onClick={onClose} className="te-back-btn" title="Back to Templates">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="te-header-info">
                        <h2 className="te-header-title">
                            Editing: {template?.name?.replace(/\.[^/.]+$/, '')}
                        </h2>
                        <span className="te-header-subtitle">Template Editor</span>
                    </div>
                </div>
                <div className="te-header-right">
                    <div className="te-ai-hint">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                        </svg>
                        <span>Select text &amp; hover 3s for AI tools</span>
                    </div>
                    <button onClick={onClose} className="te-cancel-btn">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} className="te-save-btn">
                        {saving ? (
                            <>
                                <div className="te-spinner"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                    <polyline points="17 21 17 13 7 13 7 21" />
                                    <polyline points="7 3 7 8 15 8" />
                                </svg>
                                Save as .docx
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="te-toolbar">
                <div className="te-toolbar-group">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        active={editor.isActive('bold')}
                        title="Bold (Ctrl+B)"
                    >
                        <strong>B</strong>
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        active={editor.isActive('italic')}
                        title="Italic (Ctrl+I)"
                    >
                        <em>I</em>
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        active={editor.isActive('underline')}
                        title="Underline (Ctrl+U)"
                    >
                        <u>U</u>
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        active={editor.isActive('strike')}
                        title="Strikethrough"
                    >
                        <s>S</s>
                    </ToolbarButton>
                </div>

                <ToolbarDivider />

                <div className="te-toolbar-group">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        active={editor.isActive('heading', { level: 1 })}
                        title="Heading 1"
                    >
                        H1
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        active={editor.isActive('heading', { level: 2 })}
                        title="Heading 2"
                    >
                        H2
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        active={editor.isActive('heading', { level: 3 })}
                        title="Heading 3"
                    >
                        H3
                    </ToolbarButton>
                </div>

                <ToolbarDivider />

                <div className="te-toolbar-group">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        active={editor.isActive('bulletList')}
                        title="Bullet List"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        active={editor.isActive('orderedList')}
                        title="Ordered List"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></svg>
                    </ToolbarButton>
                </div>

                <ToolbarDivider />

                <div className="te-toolbar-group">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        active={editor.isActive('blockquote')}
                        title="Blockquote"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" /></svg>
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setHorizontalRule().run()}
                        title="Horizontal Rule"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="12" x2="22" y2="12" /></svg>
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={addLink}
                        active={editor.isActive('link')}
                        title="Add Link"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                    </ToolbarButton>
                    {editor.isActive('link') && (
                        <ToolbarButton
                            onClick={() => editor.chain().focus().unsetLink().run()}
                            title="Remove Link"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M5.16 11.75l-1.72 1.71a5 5 0 0 0 7.07 7.07l1.72-1.71" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                        </ToolbarButton>
                    )}
                </div>

                <ToolbarDivider />

                <div className="te-toolbar-group">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        title="Undo (Ctrl+Z)"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        title="Redo (Ctrl+Shift+Z)"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                    </ToolbarButton>
                </div>

                <ToolbarDivider />

                {/* Placeholder Insertion */}
                <div className="te-toolbar-group te-placeholder-group">
                    <div className="te-placeholder-insert">
                        <button
                            onClick={() => setShowPlaceholderDropdown(!showPlaceholderDropdown)}
                            className="te-placeholder-btn"
                            title="Insert Placeholder"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
                            <span>{'{{ }}'} Placeholder</span>
                        </button>

                        {showPlaceholderDropdown && (
                            <div className="te-placeholder-dropdown">
                                <div className="te-placeholder-dropdown-header">Insert Placeholder</div>
                                <div className="te-placeholder-dropdown-body">
                                    <input
                                        type="text"
                                        value={placeholderInput}
                                        onChange={(e) => setPlaceholderInput(e.target.value)}
                                        placeholder="e.g. NAME, DATE, COURSE"
                                        className="te-placeholder-input"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') insertPlaceholder();
                                            if (e.key === 'Escape') setShowPlaceholderDropdown(false);
                                        }}
                                    />
                                    <button onClick={insertPlaceholder} className="te-placeholder-submit">
                                        Insert
                                    </button>
                                </div>
                                {template?.placeholders?.length > 0 && (
                                    <div className="te-placeholder-existing">
                                        <div className="te-placeholder-existing-label">Existing:</div>
                                        <div className="te-placeholder-tags">
                                            {template.placeholders.map(p => (
                                                <button
                                                    key={p}
                                                    onClick={() => {
                                                        editor.chain().focus().insertContent(`{{${p}}}`).run();
                                                        setShowPlaceholderDropdown(false);
                                                    }}
                                                    className="te-placeholder-tag"
                                                >
                                                    {`{{${p}}}`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Editor Area */}
            <div className="te-editor-wrapper" ref={editorContainerRef}>
                {/* Floating Selection Toolbar */}
                <FloatingToolbar editor={editor} />

                <EditorContent editor={editor} />
            </div>

            {/* Footer Status */}
            <div className="te-footer">
                <div className="te-footer-left">
                    <span className="te-footer-stat">
                        {charCount} characters
                    </span>
                    <span className="te-footer-divider">•</span>
                    <span className="te-footer-stat">
                        {wordCount} words
                    </span>
                </div>
                <div className="te-footer-right">
                    <span className="te-footer-format">.docx</span>
                    <span className="te-footer-save-hint">Saves as Word Document</span>
                </div>
            </div>

            {/* AI Toolkit Overlay */}
            {showAIToolkit && editor && (
                <AIToolkit
                    editor={editor}
                    position={aiToolkitPosition}
                    onClose={() => setShowAIToolkit(false)}
                />
            )}
        </div>
    );
};

export default TemplateEditor;
