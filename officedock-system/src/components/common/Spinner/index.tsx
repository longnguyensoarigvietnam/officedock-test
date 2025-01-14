export type SpinnerProps = {
  className?: string;
  iconClassName?: string;
};

const Spinner = ({ className, iconClassName }: SpinnerProps) => {
  return (
    <div
      role="status"
      className={`flex items-center justify-center z-90 h-screen ${className}`}>
      <svg
        aria-hidden="true"
        className={`w-10 h-10 mr-2 animate-spin ${iconClassName}`}
        viewBox="0 0 100 101"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient
            id="half-circle-gradient"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%">
            <stop offset="0%" stopColor="white" />
            <stop offset="50%" stopColor="white" />
            <stop offset="80%" stopColor="#111826" />
            <stop offset="100%" stopColor="#7111826" />
          </linearGradient>
        </defs>
        <path
          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
          fill="url(#half-circle-gradient)"
        />
      </svg>
    </div>
  );
};

export default Spinner;
