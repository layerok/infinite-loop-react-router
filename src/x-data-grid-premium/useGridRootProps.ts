import {useContext} from "react";
import {GridRootPropsContext} from "./context.ts";

export const useGridRootProps = () => {
  const context = useContext(GridRootPropsContext);
  if(!context) {
    throw new Error("use grid root props provider");
  }
  return context;
}
