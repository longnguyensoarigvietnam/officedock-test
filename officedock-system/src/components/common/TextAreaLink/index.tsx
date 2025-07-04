'use client';

import React, { useEffect } from 'react';

import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Link } from '@tiptap/extension-link';

interface TextAreaLinkProps {
  initialValue: string;
  className?: string;
  disabled?: boolean;
  onChange?: (text: string) => void;
}

const TextAreaLink: React.FC<TextAreaLinkProps> = ({
  initialValue,
  className,
  disabled,
  onChange,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
      }),
    ],
    content: initialValue,
    onUpdate({ editor }) {
      const { state, view } = editor;
      const { schema } = state;
      const tr = state.tr;

      state.doc.descendants((node, pos) => {
        if (node.isText) {
          node.marks.forEach((mark) => {
            if (mark.type.name === 'link') {
              const text = node.text || '';
              const href = mark.attrs.href;

              if (/^https?:\/\/[^\s]+$/.test(text)) {
                // Optional: update href if text changed
                if (href !== text) {
                  tr.removeMark(pos, pos + node.nodeSize, schema.marks.link);
                  tr.addMark(
                    pos,
                    pos + node.nodeSize,
                    schema.marks.link.create({ href: text }),
                  );
                }
              } else {
                tr.removeMark(pos, pos + node.nodeSize, schema.marks.link);
              }
            }
          });
        }
      });

      if (tr.docChanged) {
        view.dispatch(tr);
      }

      onChange?.(editor.getHTML());
    },
    editorProps: {
      handleKeyDown(view, event) {
        const { state, dispatch } = view;
        const { schema, selection } = state;
        const linkMark = schema.marks.link;
        const $from = selection.$from;

        // Only run for typing characters (space included)
        if (event.key.length !== 1) return false;

        // If inside a link
        const marks = state.storedMarks || $from.marks();
        const isInsideLink = marks.some((mark) => mark.type === linkMark);

        if (isInsideLink) {
          // Remove the stored mark so that next characters won't inherit the link
          dispatch(state.tr.removeStoredMark(linkMark));
        }

        return false;
      },
    },
  });

  // Optional: Update content when `initialValue` changes
  useEffect(() => {
    if (editor && initialValue !== editor.getHTML()) {
      editor.commands.setContent(initialValue, false);
    }
  }, [editor, initialValue]);

  return (
    <div className={className}>
      <EditorContent
        editor={editor}
        disabled={disabled}
        className="prose prose-sm max-w-none [&_a]:text-blue-600 [&_a]:cursor-pointer text-sm"
      />
    </div>
  );
};

export default TextAreaLink;
