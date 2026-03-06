
import sol1 from "../../assets/panelia-bg/Sol 1.png";
import sol2 from "../../assets/panelia-bg/Sol 2.png";
import sol3 from "../../assets/panelia-bg/Sol 3.png";

import natt1 from "../../assets/panelia-bg/Natt 1.png";
import natt2 from "../../assets/panelia-bg/Natt 2.png";
import natt3 from "../../assets/panelia-bg/Natt 3.png";


export function getBackgroundByTime(date: Date = new Date()) {
  const hour = date.getHours();

  // DAG
  if (hour >= 6 && hour < 8) return sol1;
  if (hour >= 8 && hour < 11) return sol2;
  if (hour >= 11 && hour < 17) return sol3;
  if (hour >= 17 && hour < 20) return sol2;

  // KVELD
  if (hour >= 20 && hour < 23) return natt1;

  // NATT
  if (hour >= 23 || hour < 2) return natt2;
  if (hour >= 2 && hour < 3) return natt3;
  if (hour >= 3 && hour < 5) return natt2;
  if (hour >= 5 && hour < 6) return natt1;

  return sol1;
}