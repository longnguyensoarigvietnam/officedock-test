import dynamic from "next/dynamic";
import { Dispatch, SetStateAction } from "react";
import "react-quill/dist/quill.snow.css";
import "./styles/quill.css";

export type QuillProps = {
  quillRef?: any
  text?: string;
  className?: string;
  placeholder?: string;
  setText?: Dispatch<SetStateAction<string>>;
};

const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import("react-quill");

    return ({ forwardedRef, ...props }: any) => <RQ ref={forwardedRef} {...props} />;
  },
  { ssr: false }
);

const Quill = ({ quillRef, text, setText, className, placeholder = "" }: QuillProps) => {
  const modules = {
    toolbar: [],
  };

  const handleChange = (content: string) => {
    if (setText) {
      setText(content);
    }
  };

  return (
    <>
      <ReactQuill
        theme="snow"
        forwardedRef={quillRef}
        modules={modules}
        onChange={(content: string) => handleChange(content)}
        value={text}
        className={className}
        placeholder={placeholder}
      />
    </>
  );
};

export default Quill;
