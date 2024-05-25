import {useState} from "react";

export const useForceRerender = () => {
  const [,increment] = useState(0);
  return () => {
    increment(prev => prev++);
  }
}
