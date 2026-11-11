import { type CircuitBlueprint, type CircuitComponent, type CircuitWire } from "./circuitTypes.js";

function w(
  id: string,
  fromComp: string,
  fromTerm: string,
  toComp: string,
  toTerm: string,
): CircuitWire {
  return {
    id,
    from: { compId: fromComp, terminalId: fromTerm },
    to: { compId: toComp, terminalId: toTerm },
  };
}

function hTerminals(left = "a", right = "b", span = 44) {
  return [
    { id: left, label: left.toUpperCase(), dx: -span, dy: 0 },
    { id: right, label: right.toUpperCase(), dx: span, dy: 0 },
  ];
}

function vTerminals(top = "a", bottom = "b", span = 38) {
  return [
    { id: top, label: top.toUpperCase(), dx: 0, dy: -span },
    { id: bottom, label: bottom.toUpperCase(), dx: 0, dy: span },
  ];
}

export function buildBlueprint(experimentId: string, mode?: string): CircuitBlueprint {
  switch (experimentId) {
    case "NT-01":
      return buildRlcBlueprint(mode || "RLC");
    case "BEE-01":
      return buildOhmsLawBlueprint(mode || "single");
    case "ELC-01":
      return buildRcFilterBlueprint();
    case "ELC-02":
      return buildZenerBlueprint();
    default:
      return buildRlcBlueprint("RLC");
  }
}

function buildRlcBlueprint(mode: string): CircuitBlueprint {
  const hasL = mode === "RLC" || mode === "RL";
  const hasC = mode === "RLC" || mode === "RC";

  // Simple textbook series loop: AC Voltage Source (Vs) -> R -> L -> C
  const components: CircuitComponent[] = [
    {
      id: "vs",
      kind: "ac_source",
      name: "AC Voltage Source (Vs)",
      symbol: "Vs",
      x: 130,
      y: 215,
      orientation: "v",
      terminals: vTerminals("pos", "neg", 40),
      paramKey: "Vs",
      secondaryParamKey: "f",
      unit: "V",
      present: true,
    },
    {
      id: "res",
      kind: "resistor",
      name: "Resistor R",
      symbol: "R",
      x: 400,
      y: 110,
      orientation: "h",
      terminals: hTerminals("a", "b", 44),
      paramKey: "R",
      unit: "Ω",
      present: true,
    },
    {
      id: "ind",
      kind: "inductor",
      name: "Inductor L",
      symbol: "L",
      x: 670,
      y: 215,
      orientation: "v",
      terminals: vTerminals("a", "b", 44),
      paramKey: "L",
      unit: "mH",
      optional: !hasL,
      present: hasL,
    },
    {
      id: "cap",
      kind: "capacitor",
      name: "Capacitor C",
      symbol: "C",
      x: 400,
      y: 320,
      orientation: "h",
      terminals: hTerminals("a", "b", 44),
      paramKey: "C",
      unit: "µF",
      optional: !hasC,
      present: hasC,
    },
  ];

  const defaultWires: CircuitWire[] = [w("w-vs-res", "vs", "pos", "res", "a")];

  if (hasL && hasC) {
    defaultWires.push(
      w("w-res-ind", "res", "b", "ind", "a"),
      w("w-ind-cap", "ind", "b", "cap", "b"),
      w("w-cap-vs", "cap", "a", "vs", "neg"),
    );
  } else if (hasL) {
    defaultWires.push(
      w("w-res-ind", "res", "b", "ind", "a"),
      w("w-ind-vs", "ind", "b", "vs", "neg"),
    );
  } else if (hasC) {
    defaultWires.push(
      w("w-res-cap", "res", "b", "cap", "b"),
      w("w-cap-vs", "cap", "a", "vs", "neg"),
    );
  }

  return {
    experimentId: "NT-01",
    mode,
    components,
    defaultWires,
    requiredSeriesPairs: [],
  };
}

function buildOhmsLawBlueprint(mode: string): CircuitBlueprint {
  const isSeries = mode === "series";
  const isParallel = mode === "parallel";
  const isDiode = mode === "diode";

  const components: CircuitComponent[] = [
    {
      id: "vdc",
      kind: "dc_source",
      name: "DC Power Supply",
      symbol: "Vdc",
      x: 105,
      y: 230,
      orientation: "v",
      terminals: vTerminals("pos", "neg", 40),
      paramKey: "Vdc",
      unit: "V",
      present: true,
    },
    {
      id: "sw",
      kind: "switch",
      name: "Control Switch S",
      symbol: "S",
      x: 235,
      y: 115,
      orientation: "h",
      terminals: hTerminals("a", "b", 36),
      paramKey: "switchClosed",
      present: true,
    },
    {
      id: "am",
      kind: "ammeter",
      name: "DC Ammeter",
      symbol: "A",
      x: 385,
      y: 115,
      orientation: "h",
      terminals: hTerminals("a", "b", 34),
      unit: "A",
      present: true,
    },
    {
      id: "r1",
      kind: "resistor",
      name: isDiode ? "Protective Resistor R₁" : "Test Resistor R₁",
      symbol: "R₁",
      x: isSeries ? 515 : 570,
      y: isSeries ? 115 : isParallel ? 165 : 210,
      orientation: isSeries ? "h" : isParallel ? "h" : "v",
      terminals: isSeries
        ? hTerminals("a", "b", 42)
        : isParallel
          ? hTerminals("a", "b", 42)
          : vTerminals("a", "b", 42),
      paramKey: "R1",
      unit: "Ω",
      present: true,
    },
    {
      id: "r2",
      kind: "resistor",
      name: "Second Resistor R₂",
      symbol: "R₂",
      x: isSeries ? 660 : 570,
      y: isSeries ? 195 : 285,
      orientation: isSeries ? "v" : "h",
      terminals: isSeries ? vTerminals("a", "b", 42) : hTerminals("a", "b", 42),
      paramKey: "R2",
      unit: "Ω",
      optional: !isSeries && !isParallel,
      present: isSeries || isParallel,
    },
    {
      id: "diode",
      kind: "diode",
      name: "Silicon PN Diode",
      symbol: "D₁",
      x: 570,
      y: 315,
      orientation: "v",
      terminals: vTerminals("a", "b", 44),
      optional: !isDiode,
      present: isDiode,
    },
    {
      id: "vm",
      kind: "voltmeter",
      name: "DC Voltmeter",
      symbol: "V",
      x: 410,
      y: 235,
      orientation: "v",
      terminals: vTerminals("a", "b", 34),
      measuresAcross: isDiode ? "diode" : "r1",
      unit: "V",
      optional: true,
      present: true,
    },
    {
      id: "gnd",
      kind: "ground",
      name: "Reference Ground",
      symbol: "GND",
      x: 105,
      y: 365,
      orientation: "v",
      terminals: [{ id: "g", label: "G", dx: 0, dy: -18 }],
      optional: true,
      present: true,
    },
  ];

  if (isDiode) {
    const r1Comp = components.find((c) => c.id === "r1");
    if (r1Comp) {
      r1Comp.x = 530;
      r1Comp.y = 115;
      r1Comp.orientation = "h";
      r1Comp.terminals = hTerminals("a", "b", 42);
    }
    const diodeComp = components.find((c) => c.id === "diode");
    if (diodeComp) {
      diodeComp.x = 655;
      diodeComp.y = 225;
      diodeComp.orientation = "v";
      diodeComp.terminals = vTerminals("a", "b", 44);
    }
  }

  const defaultWires: CircuitWire[] = [
    w("w-v-sw", "vdc", "pos", "sw", "a"),
    w("w-sw-am", "sw", "b", "am", "a"),
    w("w-v-gnd", "vdc", "neg", "gnd", "g"),
  ];

  if (mode === "single") {
    defaultWires.push(
      w("w-am-r1", "am", "b", "r1", "a"),
      w("w-r1-v", "r1", "b", "vdc", "neg"),
      w("w-vm-1", "vm", "a", "r1", "a"),
      w("w-vm-2", "vm", "b", "r1", "b"),
    );
  } else if (mode === "series") {
    defaultWires.push(
      w("w-am-r1", "am", "b", "r1", "a"),
      w("w-r1-r2", "r1", "b", "r2", "a"),
      w("w-r2-v", "r2", "b", "vdc", "neg"),
      w("w-vm-1", "vm", "a", "r1", "a"),
      w("w-vm-2", "vm", "b", "r2", "b"),
    );
  } else if (mode === "parallel") {
    defaultWires.push(
      w("w-am-r1", "am", "b", "r1", "a"),
      w("w-am-r2", "am", "b", "r2", "a"),
      w("w-r1-v", "r1", "b", "vdc", "neg"),
      w("w-r2-v", "r2", "b", "vdc", "neg"),
      w("w-vm-1", "vm", "a", "r1", "a"),
      w("w-vm-2", "vm", "b", "r1", "b"),
    );
  } else if (mode === "diode") {
    defaultWires.push(
      w("w-am-r1", "am", "b", "r1", "a"),
      w("w-r1-d", "r1", "b", "diode", "a"),
      w("w-d-v", "diode", "b", "vdc", "neg"),
      w("w-vm-1", "vm", "a", "diode", "a"),
      w("w-vm-2", "vm", "b", "diode", "b"),
    );
  }

  return {
    experimentId: "BEE-01",
    mode,
    components,
    defaultWires,
    requiredSeriesPairs: [],
  };
}

function buildRcFilterBlueprint(): CircuitBlueprint {
  // Simple textbook RC Low-Pass Filter: Vin -> R (top) -> C (shunt) + Vout voltmeter
  const components: CircuitComponent[] = [
    {
      id: "vs",
      kind: "ac_source",
      name: "AC Voltage Source (Vin)",
      symbol: "Vin",
      x: 130,
      y: 220,
      orientation: "v",
      terminals: vTerminals("pos", "neg", 40),
      paramKey: "Vin",
      secondaryParamKey: "f",
      unit: "V",
      present: true,
    },
    {
      id: "res",
      kind: "resistor",
      name: "Series Resistor R",
      symbol: "R",
      x: 330,
      y: 120,
      orientation: "h",
      terminals: hTerminals("a", "b", 44),
      paramKey: "R",
      unit: "Ω",
      present: true,
    },
    {
      id: "cap",
      kind: "capacitor",
      name: "Capacitor C (Shunt)",
      symbol: "C",
      x: 500,
      y: 220,
      orientation: "v",
      terminals: vTerminals("a", "b", 44),
      paramKey: "C",
      unit: "µF",
      present: true,
    },
    {
      id: "vm",
      kind: "voltmeter",
      name: "Output Voltmeter (Vout)",
      symbol: "Vout",
      x: 650,
      y: 220,
      orientation: "v",
      terminals: vTerminals("a", "b", 36),
      measuresAcross: "cap",
      unit: "V",
      optional: true,
      present: true,
    },
    {
      id: "gnd",
      kind: "ground",
      name: "Reference Ground",
      symbol: "GND",
      x: 130,
      y: 350,
      orientation: "v",
      terminals: [{ id: "g", label: "G", dx: 0, dy: -18 }],
      optional: true,
      present: true,
    },
  ];

  const defaultWires: CircuitWire[] = [
    w("w-vs-res", "vs", "pos", "res", "a"),
    w("w-res-cap", "res", "b", "cap", "a"),
    w("w-cap-vs", "cap", "b", "vs", "neg"),
    w("w-vs-gnd", "vs", "neg", "gnd", "g"),
    w("w-vm-1", "vm", "a", "cap", "a"),
    w("w-vm-2", "vm", "b", "cap", "b"),
  ];

  return {
    experimentId: "ELC-01",
    mode: "rc_filter",
    components,
    defaultWires,
    requiredSeriesPairs: [],
  };
}

function buildZenerBlueprint(): CircuitBlueprint {
  // Simple textbook Zener Regulator: Vs -> Rs (top) -> Zener Dz (reverse biased) + Vout voltmeter
  const components: CircuitComponent[] = [
    {
      id: "vdc",
      kind: "dc_source",
      name: "DC Supply (Vs)",
      symbol: "Vs",
      x: 130,
      y: 220,
      orientation: "v",
      terminals: vTerminals("pos", "neg", 40),
      paramKey: "Vs",
      unit: "V",
      present: true,
    },
    {
      id: "rs",
      kind: "resistor",
      name: "Series Resistor Rs",
      symbol: "Rs",
      x: 330,
      y: 120,
      orientation: "h",
      terminals: hTerminals("a", "b", 44),
      paramKey: "Rs",
      unit: "Ω",
      present: true,
    },
    {
      id: "zener",
      kind: "diode",
      name: "Zener Diode (Vz)",
      symbol: "Dz",
      x: 500,
      y: 220,
      orientation: "v",
      terminals: vTerminals("a", "b", 44),
      paramKey: "Vz",
      unit: "V",
      present: true,
    },
    {
      id: "vm",
      kind: "voltmeter",
      name: "Output Voltmeter (Vout)",
      symbol: "Vout",
      x: 650,
      y: 220,
      orientation: "v",
      terminals: vTerminals("a", "b", 36),
      measuresAcross: "zener",
      unit: "V",
      optional: true,
      present: true,
    },
    {
      id: "gnd",
      kind: "ground",
      name: "Reference Ground",
      symbol: "GND",
      x: 130,
      y: 350,
      orientation: "v",
      terminals: [{ id: "g", label: "G", dx: 0, dy: -18 }],
      optional: true,
      present: true,
    },
  ];

  const defaultWires: CircuitWire[] = [
    w("w-vdc-rs", "vdc", "pos", "rs", "a"),
    w("w-rs-zener", "rs", "b", "zener", "a"),
    w("w-zener-vdc", "zener", "b", "vdc", "neg"),
    w("w-vdc-gnd", "vdc", "neg", "gnd", "g"),
    w("w-vm-1", "vm", "a", "zener", "a"),
    w("w-vm-2", "vm", "b", "zener", "b"),
  ];

  return {
    experimentId: "ELC-02",
    mode: "zener",
    components,
    defaultWires,
    requiredSeriesPairs: [],
  };
}
