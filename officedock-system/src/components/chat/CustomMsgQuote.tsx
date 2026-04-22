import { Node, mergeAttributes } from '@tiptap/core';

export const MsgQuote = Node.create({
  name: 'msgQuote',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      // internally called `data`, HTML attribute is `data-msg-data`
      data: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const raw = el.getAttribute('data-msg-data');
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

  // match both class and attribute to be robust

  parseHTML() {
    return [{ tag: 'span.inline-msg-quote' }, { tag: 'span[data-msg-data]' }];
  },

  renderHTML({ HTMLAttributes }) {
    // addAttributes.renderHTML will add data-msg-data if attrs.data exists,
    // so here just merge title / class / data-quote-msg

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-title': HTMLAttributes.title || '',
        'data-quote-msg': 'true',
        class: 'inline-msg-quote',
      }),
      ['span', { style: 'color: #77858F;' }, '[引用]'],
      ' ',
      ['span', { style: 'color: #0068B7;' }, HTMLAttributes.title || ''],
    ];
  },

  renderText({ node }) {
    return `[引用] ${node.attrs.title || ''}`;
  },
});
