import {createContext, MutableRefObject} from "react";
import {DataGridProps, GridApi} from "./DataGridPremium.tsx";

export const GridRootPropsContext = createContext<DataGridProps | null>(null);

export const GridApiContext = createContext<MutableRefObject<GridApi> | null>(null)
