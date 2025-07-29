import { Node, mergeAttributes } from '@tiptap/core';

export const MsgQuote = Node.create({
  name: 'msgQuote',
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
        tag: 'span[data-msg-id]',
        getAttrs: (dom: HTMLElement) => ({
          id: dom.getAttribute('data-msg-id'),
          title:
            dom.getAttribute('data-title') ||
            dom.textContent?.replace('[引用] ', ''),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-msg-id': HTMLAttributes.id,
        'data-title': HTMLAttributes.title,
        class: 'inline-msg-quote',
      }),
      ['span', { style: 'color: #77858F;' }, '[引用]'],
      ' ',
      ['span', { style: 'color: #0068B7;' }, HTMLAttributes.title],
    ];
  },

  renderText({ node }) {
    return `[引用] ${node.attrs.title}`;
  },
});
