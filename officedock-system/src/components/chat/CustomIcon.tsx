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
        parseHTML: (element: HTMLElement) => element.getAttribute('src') || '',
        renderHTML: (attributes: CustomReactionAttrs) => ({
          src: attributes.src,
        }),
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
      <NodeViewWrapper as="span">
        <img
          src={props.node.attrs.src}
          alt={props.node.attrs.name}
          title={props.node.attrs.name}
          style={{
            width: '20px',
            height: '20px',
            verticalAlign: 'sub',
            display: 'inline-block',
            margin: '0 2px',
          }}
        />
      </NodeViewWrapper>
    ));
  },
});
