import { Node, mergeAttributes, NodeViewProps } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import React from 'react';

interface CustomReactionAttrs {
  src: string;
  name: string;
}

export const CustomReaction = Node.create({
  name: 'customReaction',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: '',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-src') ?? '',
        renderHTML: (attrs: any) => ({ 'data-src': attrs.src }),
      },
      name: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('name') || '',
        renderHTML: (attributes: CustomReactionAttrs) => ({
          name: attributes.name,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-custom-reaction]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-custom-reaction': 'true' }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => (
      <NodeViewWrapper
        as="span"
        className="inline-block align-middle"
        contentEditable={false}>
        <img
          src={props.node.attrs.src}
          alt={props.node.attrs.name}
          title={props.node.attrs.name}
          style={{
            width: 20,
            height: 20,
            verticalAlign: 'sub',
            display: 'inline-block',
            margin: '0 2px',
          }}
        />
      </NodeViewWrapper>
    ));
  },
});
