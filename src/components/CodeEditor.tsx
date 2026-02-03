import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { html } from '@codemirror/lang-html';

interface CodeEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function CodeEditor({ content, onChange }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const startState = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        html(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            backgroundColor: '#ffffff',
          },
          '.cm-scroller': {
            fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
            fontSize: '13px',
            lineHeight: '1.6',
          },
          '.cm-content': {
            padding: '16px',
            caretColor: '#0d9488',
            color: '#1e293b',
          },
          '.cm-gutters': {
            backgroundColor: '#f8fafc',
            color: '#64748b',
            borderRight: '1px solid #e2e8f0',
          },
          '.cm-activeLineGutter': {
            backgroundColor: '#e2e8f0',
          },
          '.cm-activeLine': {
            backgroundColor: 'rgba(20, 184, 166, 0.08)',
          },
          '.cm-selectionBackground': {
            backgroundColor: 'rgba(20, 184, 166, 0.2) !important',
          },
          '.cm-cursor': {
            borderLeftColor: '#0d9488',
          },
        }, { dark: false }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    editorViewRef.current = view;

    return () => {
      view.destroy();
    };
  }, []);

  // Update editor content when external content changes (from slide editing)
  useEffect(() => {
    if (editorViewRef.current) {
      const currentContent = editorViewRef.current.state.doc.toString();
      if (currentContent !== content) {
        editorViewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: content,
          },
        });
      }
    }
  }, [content]);

  return (
    <div
      ref={editorRef}
      className="flex-1 overflow-hidden"
      style={{
        backgroundColor: '#ffffff',
      }}
    />
  );
}
