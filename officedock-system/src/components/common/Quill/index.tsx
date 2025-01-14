import dynamic from 'next/dynamic';
import { Dispatch, SetStateAction, useEffect, useMemo } from 'react';
import 'react-quill/dist/quill.snow.css';
import './styles/quill.css';

export type QuillProps = {
  text?: string;
  msgEditing?: string;
  className?: string;
  setText?: Dispatch<SetStateAction<string>>;
  setMsgEditing?: Dispatch<SetStateAction<string | undefined>>;
  messageSubmitted?: boolean;
  setMessageSubmitted?: Dispatch<SetStateAction<boolean>>;
  handleSendMessageByEnter?: (event: KeyboardEvent) => void;
};

const Quill = ({
  text,
  setText,
  className,
  setMsgEditing,
  msgEditing,
  messageSubmitted,
  setMessageSubmitted,
  handleSendMessageByEnter,
}: QuillProps) => {
  const ReactQuill = useMemo(
    () => dynamic(() => import('react-quill'), { ssr: false }),
    [],
  );

  const modules = {
    toolbar: {
      container: '#toolbar',
    },
  };

  const handleChange = (content: string) => {
    if (setText && setMessageSubmitted) {
      setMessageSubmitted(false);
      setText(content);
    }
    if (setMsgEditing) {
      setMsgEditing(content);
    }
  };

  useEffect(() => {
    if (setText && messageSubmitted) {
      setText('');
    }
  }, [messageSubmitted, setText]);

  const formats = ['bold'];

  return (
    <>
      <ReactQuill
        theme="snow"
        modules={modules}
        formats={formats}
        onChange={(content: string) => handleChange(content)}
        value={msgEditing || text}
        className={className}
        onKeyDown={handleSendMessageByEnter}
      />
    </>
  );
};

export default Quill;
