import {useContext} from "react";
import {GridApiContext} from "./context.ts";

export const useGridApiContext = () => {
  const context = useContext(GridApiContext);
  if(!context) {
    throw new Error("use grid api context provider");
  }
  return context;
}
