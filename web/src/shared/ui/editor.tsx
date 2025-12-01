'use client';

import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/shared/lib/utils';

interface EditorProps {
  value: string;
  onChange: (data: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function Editor({ value, onChange, disabled, className, placeholder }: EditorProps) {
  const [EditorComponent, setEditorComponent] = useState<null | typeof import('@ckeditor/ckeditor5-react').CKEditor>(null);
  const [EditorBuild, setEditorBuild] = useState<null | typeof import('@ckeditor/ckeditor5-build-classic')>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      import('@ckeditor/ckeditor5-react'),
      import('@ckeditor/ckeditor5-build-classic')
    ]).then(([reactEditor, classic]) => {
      if (!isMounted) return;
      setEditorComponent(() => reactEditor.CKEditor);
      setEditorBuild(() => (classic as unknown as { default: unknown }).default as typeof import('@ckeditor/ckeditor5-build-classic'));
    }).catch(() => {
      // ignore load errors; editor will not render
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const editorConfig = useMemo(
    () => ({
      placeholder,
      toolbar: [
        'paragraph',
        '|',
        'bold',
        'italic',
        'underline',
        'strikethrough',
        'highlight',
        '|',
        'bulletedList',
        'numberedList',
        '|',
        'link',
        'insertImage',
        'mediaEmbed',
        '|',
        'blockQuote',
        'code',
        'horizontalLine',
        'insertTable',
        '|',
        'undo',
        'redo'
      ]
    }),
    [placeholder]
  );

  return (
    <div className={cn('w-full min-h-[24rem]', className)} styles={{ color: '#000' }}>
      {EditorComponent && EditorBuild ? (
        <EditorComponent
          editor={EditorBuild}
          data={value}
          config={editorConfig}
          disabled={disabled}
          onChange={(_, editor) => {
            const data = editor.getData();
            onChange(data);
          }}
          onReady={(editor) => {
            editor.editing.view.change((writer) => {
              writer.setStyle('min-height', '20rem', editor.editing.view.document.getRoot()!);
              writer.setStyle('color', '#111827', editor.editing.view.document.getRoot()!);
              writer.setStyle('background-color', '#ffffff', editor.editing.view.document.getRoot()!);
            });
            const editable = editor.editing.view.getDomRoot() as HTMLElement | null;
            if (editable) {
              editable.style.padding = '1rem';
              editable.classList.add('ckeditor-theme-adaptive');
            }
            const toolbar = editor.ui.view.toolbar.element;
            if (toolbar) {
              toolbar.classList.add('ckeditor-theme-adaptive');
            }
          }}
        />
      ) : (
        <div className="min-h-[24rem] rounded-[1rem] bg-muted/60" />
      )}
      <style jsx global>{`
        .ckeditor-theme-adaptive .ck-editor__editable {
          background: #ffffff !important;
          color: #111827 !important;
          border-radius: 0 !important;
          min-height: 20rem;
        }
        .ckeditor-theme-adaptive .ck-editor__editable.ck-focused {
          background: #ffffff !important;
          color: #111827 !important;
        }
        .ckeditor-theme-adaptive .ck-toolbar {
          background: #f3f4f6 !important;
          border-radius: 0 !important;
          border: none !important;
        }
        .ckeditor-theme-adaptive .ck-editor__editable:not(.ck-focused) {
          border-color: #e5e7eb !important;
        }
        .ckeditor-theme-adaptive .ck-content {
          background: #ffffff !important;
          color: #111827 !important;
        }
      `}</style>
    </div>
  );
}
