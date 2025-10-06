import { Node, mergeAttributes } from '@tiptap/core';

export const MsgQuote = Node.create({
  name: 'msgQuote',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      data: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute('data-msg-data');
          try {
            return raw ? JSON.parse(raw) : null;
          } catch {
            return raw;
          }
        },
        renderHTML: (attributes) => {
          if (!attributes.data) return {};
          return {
            'data-msg-data':
              typeof attributes.data === 'string'
                ? attributes.data
                : JSON.stringify(attributes.data),
          };
        },
      },
      title: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-message]',
        getAttrs: (dom: HTMLElement) => ({
          message: dom.getAttribute('data-message') || '',
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
        'data-message': HTMLAttributes.message,
        'data-title': HTMLAttributes.title,
        'data-quote-msg': 'true',
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
