import { Node, mergeAttributes } from '@tiptap/core';

export const CustomReaction = Node.create({
  name: 'customReaction',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      src: { default: '' },
      name: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-custom-reaction="true"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-custom-reaction': 'true' }),
      [
        'img',
        {
          src: HTMLAttributes.src,
          alt: HTMLAttributes.name,
          title: HTMLAttributes.name,
          style:
            'width:20px;height:20px;vertical-align:sub;display:inline-block;margin:0 2px;',
        },
      ],
    ];
  },
});
