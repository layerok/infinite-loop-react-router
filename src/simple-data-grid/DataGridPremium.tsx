import { ElementSize, useResizeObserver } from "@mui/x-data-grid-premium";
import { ownerWindow } from "@mui/material";
import { EventManager } from "./EventManager";
import {
  CSSProperties,
  HTMLAttributes,
  useLayoutEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  MutableRefObject,
} from "react";

const EMPTY_SIZE: ElementSize = { width: 0, height: 0 };

const isEqualElementSizes = (a: ElementSize, b: ElementSize) => {
  return a.width === b.width && a.height === b.height;
};

export interface GridPaginationModel {
  pageSize: number;
  page: number;
}

export type GridColDef = {
  field: string;
  headerName: string;
};

export type GridValidRowModel = {
  [key: string | symbol]: any;
};

export type GridDimensions = {
  rowHeight: number;
  headerHeight: number;
  columnWidth: number;
  viewportInnerSize: ElementSize;
  viewportOuterSize: ElementSize;
};

export const useGridApiRef = () => {
  return useRef({}) as MutableRefObject<GridApi>;
};

type EventMap = {
  viewportInnerSizeChange: (size: GridDimensions["viewportInnerSize"]) => void;
};

type Disposer = () => void;

type GridApi = {
  getDimensions: () => GridDimensions;
  eventManager: EventManager;
  publishEvent: <EventName extends keyof EventMap>(
    eventName: EventName,
    ...arg: Parameters<EventMap[EventName]>
  ) => void;
  subscribeEvent: <EventName extends keyof EventMap>(
    eventName: EventName,
    fn: EventMap[EventName],
  ) => Disposer;
};

type DataGridProps = {
  columns: GridColDef[];
  rows: GridValidRowModel[];
  apiRef?: MutableRefObject<GridApi>;
} & HTMLAttributes<HTMLDivElement>;

export const DataGridPremium = (props: DataGridProps) => {
  const { columns, rows, style, apiRef: apiRefProp } = props;
  const localApiRef = useGridApiRef();
  const apiRef = apiRefProp || localApiRef;

  if (Object.keys(apiRef.current).length === 0) {
    apiRef.current = {
      getDimensions: () => dimensions,
      eventManager: new EventManager(),
      publishEvent: (eventName, ...args) => {
        apiRef.current.eventManager.emit(eventName, ...args);
      },
      subscribeEvent: (eventName, listener) => {
        apiRef.current.eventManager.on(eventName, listener);
        return () => {
          apiRef.current.eventManager.removeListener(eventName, listener);
        };
      },
    };
  }

  const [dimensions, setDimensions] = useState<GridDimensions>({
    rowHeight: 40,
    headerHeight: 40,
    columnWidth: 150,
    viewportInnerSize: EMPTY_SIZE,
    viewportOuterSize: EMPTY_SIZE,
  });

  const rowsMeta = useMemo(
    () => ({
      totalPageHeight: rows.length * 40,
    }),
    [rows.length],
  );

  const [savedSize, setSavedSize] = useState<ElementSize>();
  const previousSize = useRef<ElementSize>();
  const rootDimensionsRef = useRef(EMPTY_SIZE);
  const prevDimensions = useRef<GridDimensions>(dimensions);

  const handleResize = useCallback((size: ElementSize) => {
    rootDimensionsRef.current = size;
    setSavedSize(size);
  }, []);

  const resize = useCallback(() => {
    const element = bodyRef.current;
    if (!element) {
      return;
    }

    const computedStyle = ownerWindow(element).getComputedStyle(element);

    const height = parseFloat(computedStyle.height) || 0;
    const width = parseFloat(computedStyle.width) || 0;

    const hasHeightChanged = height !== previousSize.current?.height;
    const hasWidthChanged = width !== previousSize.current?.width;

    if (!previousSize.current || hasHeightChanged || hasWidthChanged) {
      const size = { width, height };
      // publish resize
      handleResize(size);
      previousSize.current = size;
    }
  }, [handleResize]);

  const updateDimensions = useCallback(() => {
    const contentSize = {
      width: rootDimensionsRef.current.width,
      height: rootDimensionsRef.current.height,
    };

    const viewportOuterSize = {
      width: rootDimensionsRef.current.width,
      height: prevDimensions.current.headerHeight + contentSize.height,
    };

    const newDimensions: GridDimensions = {
      ...prevDimensions.current,
      viewportOuterSize,
      viewportInnerSize: {
        width: Math.max(0, viewportOuterSize.width),
        height: Math.max(0, viewportOuterSize.height),
      },
    };

    if (
      !isEqualElementSizes(
        newDimensions.viewportInnerSize,
        prevDimensions.current.viewportInnerSize,
      )
    ) {
      apiRef.current.publishEvent(
        "viewportInnerSizeChange",
        newDimensions.viewportInnerSize,
      );
    }
    setDimensions(newDimensions);
  }, [apiRef]);

  const bodyRef = useRef<HTMLDivElement | null>(null);

  // inside useGridDimensions hook
  useLayoutEffect(() => {
    if (savedSize) {
      updateDimensions();
    }
  }, [savedSize, updateDimensions]);

  useLayoutEffect(updateDimensions, [updateDimensions]);
  // ---

  // inside useVirtualScroller
  useResizeObserver(bodyRef, () => {
    resize();
  });
  useLayoutEffect(() => {
    resize();
  }, [resize, rowsMeta.totalPageHeight]);
  // ----

  return (
    <div
      style={{
        ...styles.container,
        ...style,
      }}
    >
      <div style={styles.headerRow}>
        {columns.map((column) => (
          <div
            style={{
              ...styles.header,
              height: dimensions.headerHeight,
              width: dimensions.columnWidth,
            }}
            key={column.field}
          >
            {column.headerName}
          </div>
        ))}
      </div>
      <div ref={bodyRef}>
        {rows.map((row) => (
          <div
            style={{
              ...styles.row,
              height: dimensions.rowHeight,
            }}
            key={row.id}
          >
            {columns.map((column) => (
              <div
                style={{
                  ...styles.cell,
                  width: dimensions.columnWidth,
                }}
                key={column.field}
              >
                {row[column.field]}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    border: "1px solid black",
    borderRadius: "6px",
  },
  headerRow: {
    display: "flex",
    borderBottom: "1px solid black",
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "0 10px",
    borderRight: "1px solid black",
  },
  row: {
    display: "flex",
    borderBottom: "1px solid black",
  },
  cell: {
    display: "flex",
    alignItems: "center",
    padding: "0 10px",
    borderRight: "1px solid black",
  },
};
