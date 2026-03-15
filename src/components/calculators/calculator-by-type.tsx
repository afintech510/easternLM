"use client";

import { MulchCalculator } from "./mulch-calculator";
import { TopsoilCalculator } from "./topsoil-calculator";
import { DrivewayCalculator } from "./driveway-calculator";
import { BaseCalculator } from "./base-calculator";
import { FillCalculator } from "./fill-calculator";
import { RcaCalculator } from "./rca-calculator";
import { SandCalculator } from "./sand-calculator";

type CalculatorByTypeProps = {
  type: string | null;
};

export function CalculatorByType({ type }: CalculatorByTypeProps) {
  switch (type) {
    case "mulch": return <MulchCalculator />;
    case "topsoil": return <TopsoilCalculator />;
    case "gravel": return <DrivewayCalculator />;
    case "driveway": return <DrivewayCalculator />;
    case "sand": return <SandCalculator />;
    case "rca": return <RcaCalculator />;
    case "fill": return <FillCalculator />;
    default: return null;
  }
}
