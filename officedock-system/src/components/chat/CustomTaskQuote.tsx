import { mergeAttributes, Node } from '@tiptap/react';

export const TaskQuote = Node.create({
  name: 'taskQuote',
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
        tag: 'span[data-task-id]',
        getAttrs: (dom: HTMLElement) => ({
          id: dom.getAttribute('data-task-id'),
          title:
            dom.getAttribute('data-title') ||
            dom.textContent?.replace('[タスク] ', ''),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-task-id': HTMLAttributes.id,
        'data-title': HTMLAttributes.title,
        class: 'inline-task-quote',
      }),
      ['span', { style: 'color: #77858F;' }, '[タスク]'],
      ' ',
      ['span', { style: 'color: #0068B7;' }, HTMLAttributes.title],
    ];
  },

  renderText({ node }) {
    return `[タスク] ${node.attrs.title}`;
  },
});
