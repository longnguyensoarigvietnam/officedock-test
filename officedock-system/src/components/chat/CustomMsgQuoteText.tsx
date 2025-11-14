import { Node, mergeAttributes } from '@tiptap/core';

export const MsgQuoteText = Node.create({
  name: 'msgQuoteText',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      title: { default: '' },

      // 🌟 Thêm attribute mới
      data: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const raw = el.getAttribute('data-msg-text-data');
          if (!raw) return null;
          try {
            return JSON.parse(raw);
          } catch {
            return raw;
          }
        },
        renderHTML: (attributes) => {
          if (!attributes.data) return {};
          return {
            'data-msg-text-data':
              typeof attributes.data === 'string'
                ? attributes.data
                : JSON.stringify(attributes.data),
          };
        },
      },
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
          // parse attribute mới
          data: (() => {
            const raw = dom.getAttribute('data-msg-text-data');
            if (!raw) return null;
            try {
              return JSON.parse(raw);
            } catch {
              return raw;
            }
          })(),
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
        'data-quote-text': 'true',
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
