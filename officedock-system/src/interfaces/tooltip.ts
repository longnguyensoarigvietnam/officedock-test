import * as ReactDOM from 'react-dom/client';

export interface TooltipDiv extends HTMLDivElement {
  _reactRoot?: ReactDOM.Root;
}