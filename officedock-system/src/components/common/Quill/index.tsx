import dynamic from 'next/dynamic';
import { Dispatch, SetStateAction, useEffect, useMemo } from 'react';
import 'react-quill/dist/quill.snow.css';
import './styles/quill.css';

export type QuillProps = {
  text?: string;
  msgEditing?: string;
  className?: string;
  placeholder?: string;
  setText?: Dispatch<SetStateAction<string>>;
  setMsgEditing?: Dispatch<SetStateAction<string | undefined>>;
  messageSubmitted?: boolean;
  setMessageSubmitted?: Dispatch<SetStateAction<boolean>>;
};

const Quill = ({
  text,
  setText,
  className,
  placeholder = '',
  setMsgEditing,
  msgEditing,
  messageSubmitted,
  setMessageSubmitted,
}: QuillProps) => {
  const ReactQuill = useMemo(
    () => dynamic(() => import('react-quill'), { ssr: false }),
    [],
  );

  const modules = {
    toolbar: []
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


  return (
    <>
      <ReactQuill
        theme="snow"
        modules={modules}
        onChange={(content: string) => handleChange(content)}
        value={msgEditing || text}
        className={className}
        placeholder={placeholder}
      />
    </>
  );
};

export default Quill;
