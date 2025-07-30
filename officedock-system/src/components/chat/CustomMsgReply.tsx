import { Node, mergeAttributes } from '@tiptap/core';

export const MsgReply = Node.create({
  name: 'msgReply',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      title: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-msg-reply-id]',
        getAttrs: (dom: HTMLElement) => ({
          id: dom.getAttribute('data-msg-reply-id'),
          title:
            dom.getAttribute('data-title') ||
            dom.textContent?.replace('[返信] ', ''),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-msg-reply-id': HTMLAttributes.id,
        'data-title': HTMLAttributes.title,
        class: 'inline-msg-quote',
      }),
      ['span', { style: 'color: #77858F;' }, '[返信]'],
      ' ',
      ['span', { style: 'color: #0068B7;' }, HTMLAttributes.title],
    ];
  },

  renderText({ node }) {
    return `[返信] ${node.attrs.title}`;
  },
});
