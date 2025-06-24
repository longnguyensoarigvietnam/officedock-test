'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Editor,
  EditorState,
  CompositeDecorator,
  ContentState,
  ContentBlock,
  SelectionState,
  Modifier,
  RichUtils,
} from 'draft-js';
import 'draft-js/dist/Draft.css';

import { URL_REGEX } from '@constants/regex';

// Link finding strategy

const findLinkEntities = (
  contentBlock: ContentBlock,
  callback: (start: number, end: number) => void,
  contentState: ContentState,
) => {
  contentBlock.findEntityRanges((character) => {
    const entityKey = character.getEntity();
    return (
      entityKey !== null &&
      contentState.getEntity(entityKey).getType() === 'LINK'
    );
  }, callback);
};

// How to render the link
const Link = (props: any) => {
  const { url } = props.contentState.getEntity(props.entityKey).getData();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(url, '_blank');
  };

  return (
    <a
      onMouseDown={handleClick}
      style={{
        color: 'blue',
        textDecoration: 'underline',
        cursor: 'pointer',
        pointerEvents: 'auto',
      }}>
      {props.children}
    </a>
  );
};

const linkDecorator = new CompositeDecorator([
  {
    strategy: findLinkEntities,
    component: Link,
  },
]);

// Process the original text to automatically detect and apply links
function createContentWithLinks(text: string): ContentState {
  let contentState = ContentState.createFromText(text);
  const blockMap = contentState.getBlockMap();

  blockMap.forEach((block: any) => {
    const blockText = block.getText();
    const blockKey = block.getKey();

    let matchArr;
    while ((matchArr = URL_REGEX.exec(blockText)) !== null) {
      const url = matchArr[0];
      const start = matchArr.index;
      const end = start + url.length;

      contentState = contentState.createEntity('LINK', 'MUTABLE', { url });
      const entityKey = contentState.getLastCreatedEntityKey();

      const selection = SelectionState.createEmpty(blockKey).merge({
        anchorOffset: start,
        focusOffset: end,
      });

      contentState = Modifier.applyEntity(
        contentState,
        selection as SelectionState,
        entityKey,
      );
    }
  });

  return contentState;
}

interface TextAreaLinkProps {
  initialValue: string;
  className?: string;
  onChange?: (rawContent: string) => void;
}

const TextAreaLink: React.FC<TextAreaLinkProps> = ({
  initialValue,
  className,
  onChange,
}) => {
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    const content = createContentWithLinks(initialValue);
    const state = EditorState.createWithContent(content, linkDecorator);
    setEditorState(state);
  }, [initialValue]);

  // ✅ Attach compositionend event to handle IME (Japanese typing)
  useEffect(() => {
    const editorDOM = editorRef.current?.editor;

    if (editorDOM) {
      const handleCompositionEnd = () => {
        if (!editorState) return;
        // Re-apply decorator to ensure consistency after IME input
        const updated = EditorState.createWithContent(
          editorState.getCurrentContent(),
          linkDecorator,
        );
        setEditorState(updated);
      };

      editorDOM.addEventListener('compositionend', handleCompositionEnd);
      return () => {
        editorDOM.removeEventListener('compositionend', handleCompositionEnd);
      };
    }
  }, [editorRef, editorState]);

  // Paste the link and apply the entity yourself
  const handlePastedText = (
    text: string,
    html: string | undefined,
    state: EditorState,
  ): 'handled' | 'not-handled' => {
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (!urlMatch) return 'not-handled';

    const url = urlMatch[0];
    const contentState = state.getCurrentContent();
    const selection = state.getSelection();

    const contentWithEntity = contentState.createEntity('LINK', 'MUTABLE', {
      url,
    });
    const entityKey = contentWithEntity.getLastCreatedEntityKey();

    const contentWithText = Modifier.insertText(
      contentWithEntity,
      selection,
      url,
      undefined,
      entityKey,
    );

    const newEditorState = EditorState.push(
      state,
      contentWithText,
      'insert-characters',
    );

    setEditorState(newEditorState);
    return 'handled';
  };

  const handleKeyCommand = (command: string, state: EditorState) => {
    const newState = RichUtils.handleKeyCommand(state, command);
    if (newState) {
      setEditorState(newState);
      return 'handled';
    }
    return 'not-handled';
  };

  // Send text string every time it changes
  useEffect(() => {
    if (editorState && onChange) {
      const plainText = editorState.getCurrentContent().getPlainText();
      onChange(plainText);
    }
  }, [editorState, onChange]);

  if (!editorState) return;

  return (
    <div className={`${className}`} onClick={() => editorRef.current?.focus()}>
      <Editor
        ref={editorRef}
        editorState={editorState}
        onChange={setEditorState}
        handlePastedText={handlePastedText}
        handleKeyCommand={handleKeyCommand}
      />
    </div>
  );
};

export default TextAreaLink;
