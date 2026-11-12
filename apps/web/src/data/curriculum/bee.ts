import { type ExperimentDefinition } from "@vlab/shared";

export const IIT_ISM_BEE_EXPERIMENTS: ExperimentDefinition[] = [
  {
    id: "BEE-01",
    title: "Ohm's Law & V-I Characteristics",
    course: "BEE",
    level: "UG",
    institute: "IIT (ISM) Dhanbad",
    labName: "Electrical Engineering Virtual Laboratory",
    sourceUrl: "https://www.vlab.co.in/",
    imageUrl: "/images/ohms-law-bench.jpg",
    objective:
      "Verify Ohm's Law (V = I × R) by building the DC circuit, setting custom supply voltage and resistance values, recording V-I readings, and comparing Single, Series, Parallel, and Non-Ohmic Diode behaviors.",
    aimDetails: [
      "Understand and verify Ohm's Law: current through a conductor is directly proportional to applied potential difference at constant temperature.",
      "Construct the DC circuit using a DC Supply, Switch, Series Ammeter, Load Resistor(s), and Parallel Voltmeter.",
      "Investigate equivalent resistance and V-I linearity in Single Resistor, Series (R₁ + R₂), and Parallel (R₁ ∥ R₂) configurations.",
      "Contrast ohmic resistors against a non-ohmic Silicon PN Diode whose V/I ratio varies non-linearly with applied voltage.",
    ],
    apparatus: [
      "Variable DC Power Supply (0 – 50 V)",
      "Control Switch (S)",
      "DC Ammeter connected in series",
      "DC Voltmeter connected in parallel across the load",
      "User-configurable Resistors R₁ and R₂ (1 Ω – 100 kΩ)",
      "Silicon PN Junction Diode (for Non-Ohmic comparison)",
    ],
    theory: `### What is Ohm's Law? (Clear Explanation)
**Ohm's Law**, formulated by Georg Simon Ohm, states that the electric current ($I$) flowing through a metallic conductor between two points is **directly proportional** to the voltage ($V$) applied across those two points, provided physical conditions such as temperature remain constant:

$$V = I \\times R \\quad \\Longleftrightarrow \\quad I = \\frac{V}{R} \\quad \\Longleftrightarrow \\quad R = \\frac{V}{I}$$

Where:
- **$V$ (Voltage / Potential Difference)** in Volts ($\\text{V}$) — the electrical "push" driving charge around the circuit.
- **$I$ (Current)** in Amperes ($\\text{A}$) or milliamperes ($\\text{mA}$) — the rate of flow of electric charge.
- **$R$ (Resistance)** in Ohms ($\\Omega$) — the opposition offered to current flow.

### Why Does the V–I Graph Form a Straight Line?
Because $R$ is constant for an ohmic resistor, doubling the voltage $V$ **doubles** the current $I$. Plotting $I$ on the vertical axis against $V$ on the horizontal axis produces a straight line passing through the origin $(0,0)$ with constant slope $\\frac{\\Delta I}{\\Delta V} = \\frac{1}{R}$.

### Four Circuit Modes You Can Build & Simulate:
1. **Single Resistor (Ohmic):** $R_{eq} = R_1$, so $I = V_{DC} / R_1$.
2. **Series Resistors ($R_1 + R_2$):** Current has only one path, so $I$ is identical through both resistors and resistances add: $R_{eq} = R_1 + R_2$. Voltage divides as $V_1 = I R_1$ and $V_2 = I R_2$.
3. **Parallel Resistors ($R_1 \\parallel R_2$):** Both resistors share the same voltage $V_{DC}$, while current splits: $R_{eq} = \\frac{R_1 R_2}{R_1 + R_2}$.
4. **Non-Ohmic PN Diode:** A semiconductor diode follows the exponential Shockley equation $I = I_s (e^{V_D / (\\eta V_T)} - 1)$ instead of a straight line, demonstrating a **non-ohmic** element where $V/I$ is not constant.`,
    procedureSteps: [
      "Inspect the Circuit Maker canvas: verify that the DC Source (Vdc), Switch (S), Ammeter (A), Resistor(s), and Parallel Voltmeter (V) are properly wired. You can click 'Clear Wires' to practice wiring terminals yourself and press 'Check Connections'.",
      "Choose your Circuit Mode ('Single Resistor', 'Series Resistors', 'Parallel Resistors', or 'Non-Ohmic Diode') in the left Circuit Controls panel.",
      "Set your own custom values for DC Voltage (Vdc) and Resistance (R₁, R₂) using the number inputs or sliders.",
      "Ensure Switch S is ON and click 'Simulate Circuit' (or enable 'Live Sim ON') to observe live Ammeter, Voltmeter, and Power readings.",
      "Click 'Add to Table' at several different voltage levels (e.g., 2 V, 5 V, 10 V, 15 V, 20 V) — or use 'Auto-Sweep 5 Points' — to plot your measured points on the V-I Characteristic graph and confirm linearity.",
    ],
    pretest: [
      {
        id: "ohm-pre-1",
        question:
          "How must an Ammeter and Voltmeter be connected to verify Ohm's Law across a resistor R?",
        options: [
          "Ammeter in series with R, and Voltmeter in parallel across R",
          "Ammeter in parallel across R, and Voltmeter in series with R",
          "Both Ammeter and Voltmeter in series with R",
          "Both Ammeter and Voltmeter in parallel across the DC source",
        ],
        correctIndex: 0,
        explanation:
          "An ammeter has very low resistance and must be in series to measure loop current, while a voltmeter has very high resistance and must be in parallel across the component to measure potential difference.",
      },
      {
        id: "ohm-pre-2",
        question:
          "If Vdc = 12 V and R₁ = 1000 Ω (1 kΩ), what current flows through the single resistor?",
        options: ["120 mA", "12 mA", "1.2 mA", "83.3 mA"],
        correctIndex: 1,
        explanation: "By Ohm's Law, I = V / R = 12 V / 1000 Ω = 0.012 A = 12 mA.",
      },
      {
        id: "ohm-pre-3",
        question:
          "For two resistors R₁ = 100 Ω and R₂ = 100 Ω connected in parallel, the equivalent resistance Req is:",
        options: ["200 Ω", "100 Ω", "50 Ω", "25 Ω"],
        correctIndex: 2,
        explanation: "In parallel, Req = (R₁ × R₂) / (R₁ + R₂) = (100 × 100) / 200 = 50 Ω.",
      },
    ],
    posttest: [
      {
        id: "ohm-post-1",
        question:
          "If you double the supply voltage across a fixed ohmic resistor from 5 V to 10 V, what happens to power P = V·I?",
        options: [
          "Power stays the same",
          "Power doubles (2×)",
          "Power quadruples (4×)",
          "Power halves (0.5×)",
        ],
        correctIndex: 2,
        explanation: "Because I also doubles when V doubles, P = V² / R increases by 2² = 4×.",
      },
      {
        id: "ohm-post-2",
        question: "Why does the Silicon PN Diode fail to satisfy Ohm's Law?",
        options: [
          "Its resistance increases linearly with voltage",
          "Its current rises exponentially with voltage above ~0.6 V, giving a curved non-linear I-V plot",
          "It allows current equally in both directions",
          "Its voltage drop is always zero",
        ],
        correctIndex: 1,
        explanation:
          "A PN junction diode obeys the exponential Shockley diode equation rather than a constant V/I ratio, making it non-ohmic.",
      },
    ],
    references: [
      "IIT (ISM) Dhanbad Virtual Labs — Basic Electronics & Electrical Engineering Lab",
      "Boylestad, R. L., 'Introductory Circuit Analysis', Pearson Education.",
      "Alexander, C. K., & Sadiku, M. N. O., 'Fundamentals of Electric Circuits', McGraw-Hill.",
    ],
    starterCode: "# Circuit simulation runs via interactive Circuit Maker",
    parameters: [
      {
        name: "mode",
        kind: "select",
        default: "single",
        label: "Circuit Configuration",
        options: ["single", "series", "parallel", "diode"],
      },
      {
        name: "Vdc",
        kind: "slider",
        default: 10,
        min: 0,
        max: 50,
        step: 0.5,
        label: "DC Supply Voltage (Vdc)",
        unit: "V",
      },
      {
        name: "R1",
        kind: "number",
        default: 1000,
        min: 10,
        max: 50000,
        step: 10,
        label: "Primary Resistance (R₁)",
        unit: "Ω",
      },
      {
        name: "R2",
        kind: "number",
        default: 2000,
        min: 10,
        max: 50000,
        step: 10,
        label: "Secondary Resistance (R₂)",
        unit: "Ω",
      },
      {
        name: "switchClosed",
        kind: "toggle",
        default: true,
        label: "Control Switch (S)",
      },
    ],
    expectedOutputs: [
      { kind: "plot", name: "Ohm's Law V-I Characteristic" },
      { kind: "plot", name: "Power Dissipation P vs V" },
    ],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 5,
    enabled: true,
  },
];
