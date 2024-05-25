import {MutableRefObject, useRef} from "react";
import {GridApi} from "./DataGridPremium.tsx";

export const useGridApiRef = () => {
  return useRef({}) as MutableRefObject<GridApi>;
};
