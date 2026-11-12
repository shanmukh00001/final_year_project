import { type ExperimentDefinition } from "@vlab/shared";

export const IIT_ISM_NT_EXPERIMENTS: ExperimentDefinition[] = [
  {
    id: "NT-01",
    title: "R-L-C Circuit Analysis",
    course: "NT",
    level: "UG",
    institute: "IIT (ISM) Dhanbad",
    labName: "Electrical Engineering Virtual Laboratory",
    sourceUrl: "https://www.vlab.co.in/",
    imageUrl: "/images/rlc-circuit-setup.jpg",
    objective:
      "To study the behaviour of a series R-L-C circuit under AC excitation and observe voltage phase relationships across each component.",
    aimDetails: [
      "Study the steady-state AC response of a Series R-L-C circuit with an AC voltage source, Resistor (R), Inductor (L), and Capacitor (C).",
      "Verify that vector addition of component voltages matches source voltage: Vs = √(VR² + (VL − VC)²).",
      "Observe inductive (XL > XC), capacitive (XC > XL), and resonance (XL = XC) behaviour by varying R, L, C values.",
      "Record trials and inspect real-time AC waveforms for Vs, VR, VL, and VC.",
    ],
    apparatus: [
      "Single-Phase AC Voltage Source (Vs, f)",
      "Resistor (R in Ω)",
      "Inductor (L in mH)",
      "Capacitor (C in µF)",
    ],
    theory: `### Series R-L-C AC Circuit Analysis
When a resistor $R$, inductor $L$, and capacitor $C$ are connected in **series** across an AC voltage source $V_S$ of frequency $f$, the same alternating current $I$ flows through all three elements:

- **Inductive Reactance:** $X_L = 2\\pi f L$ (voltage $V_L$ leads current by $+90°$)
- **Capacitive Reactance:** $X_C = \\frac{1}{2\\pi f C}$ (voltage $V_C$ lags current by $-90°$)
- **Total Impedance:** $|Z| = \\sqrt{R^2 + (X_L - X_C)^2}$
- **RMS Current:** $I = \\frac{V_S}{|Z|}$
- **Component Voltages:** $V_R = I \\cdot R$, $\\quad V_L = I \\cdot X_L$, $\\quad V_C = I \\cdot X_C$
- **Phase Angle:** $\\theta = \\tan^{-1}\\left(\\frac{X_L - X_C}{R}\\right)$

### Three Operating Regimes
1. **Inductive ($X_L > X_C$):** Current lags source voltage.
2. **Capacitive ($X_C > X_L$):** Current leads source voltage.
3. **Resonance ($X_L = X_C$):** At $f_0 = \\frac{1}{2\\pi\\sqrt{LC}}$, impedance is minimum $|Z| = R$ and current is maximum.`,
    procedureSteps: [
      "Verify the Series R-L-C connections on the Circuit board: AC Source (Vs) → Resistor (R) → Inductor (L) → Capacitor (C) → Return.",
      "Set values for Supply Voltage (Vs), Frequency (f), Resistance (R), Inductance (L), and Capacitance (C) in the Controls panel.",
      "Click 'Simulate Circuit' (or keep 'Live ON') to observe live component voltages, circuit current, and simple AC waveforms.",
      "Vary C or frequency to observe transition from Capacitive to Resonance to Inductive behaviour.",
      "Click 'Add to Table' to record each trial into the Observation Table.",
    ],
    pretest: [
      {
        id: "rlc-pre-1",
        question: "In a series R-L-C circuit, which quantity is common to all components?",
        options: [
          "Source Voltage Vs",
          "Capacitor Voltage VC",
          "Circuit Current I",
          "Inductor Voltage VL",
        ],
        correctIndex: 2,
        explanation:
          "Because R, L, and C are in series, the same current I flows through every component.",
      },
      {
        id: "rlc-pre-2",
        question: "When XL > XC in a series R-L-C circuit, the circuit behaves as:",
        options: [
          "Purely resistive",
          "Inductive (current lags Vs)",
          "Capacitive (current leads Vs)",
          "Open circuit",
        ],
        correctIndex: 1,
        explanation:
          "When XL > XC, the net reactance is positive, so current lags the source voltage.",
      },
      {
        id: "rlc-pre-3",
        question: "At series resonance (XL = XC), the impedance |Z| equals:",
        options: ["Zero", "Infinity", "R", "XL + XC"],
        correctIndex: 2,
        explanation: "At resonance XL − XC = 0, so |Z| = √(R² + 0) = R, the minimum impedance.",
      },
    ],
    posttest: [
      {
        id: "rlc-post-1",
        question: "How can VL or VC individually exceed the total supply voltage Vs?",
        options: [
          "Energy is created inside the inductor",
          "VL leads I by +90° while VC lags I by −90°, so they cancel vectorially",
          "The ammeter amplifies voltage",
          "This is impossible in AC circuits",
        ],
        correctIndex: 1,
        explanation:
          "Because VL and VC are 180° out of phase, only their difference enters Vs = √(VR² + (VL − VC)²). Near resonance with high Q, both can individually exceed Vs.",
      },
      {
        id: "rlc-post-2",
        question:
          "With L = 150 mH and C = 35 µF, approximately where does series resonance f₀ occur?",
        options: ["~15.2 Hz", "~69.5 Hz", "~210 Hz", "~500 Hz"],
        correctIndex: 1,
        explanation: "f₀ = 1 / (2π √(0.15 × 35×10⁻⁶)) ≈ 69.5 Hz.",
      },
    ],
    references: [
      "IIT (ISM) Dhanbad — Electrical Engineering Virtual Laboratory: R-L-C Circuit Analysis",
      "Hayt, W. H., Kemmerly, J. E., & Durbin, S. M., 'Engineering Circuit Analysis', McGraw-Hill.",
    ],
    starterCode: "# Circuit simulation runs via interactive Circuit Maker",
    parameters: [
      {
        name: "mode",
        kind: "select",
        default: "RLC",
        label: "Circuit Topology",
        options: ["RLC", "RL", "RC"],
      },
      {
        name: "Vs",
        kind: "slider",
        default: 70,
        min: 5,
        max: 250,
        step: 1,
        label: "Supply Voltage (Vs RMS)",
        unit: "V",
      },
      {
        name: "f",
        kind: "slider",
        default: 50,
        min: 1,
        max: 2000,
        step: 0.5,
        label: "Supply Frequency (f)",
        unit: "Hz",
      },
      {
        name: "R",
        kind: "number",
        default: 100,
        min: 1,
        max: 2000,
        step: 1,
        label: "Resistance (R)",
        unit: "Ω",
      },
      {
        name: "L",
        kind: "number",
        default: 150,
        min: 1,
        max: 2000,
        step: 1,
        label: "Inductance (L)",
        unit: "mH",
      },
      {
        name: "C",
        kind: "number",
        default: 35,
        min: 1,
        max: 1000,
        step: 1,
        label: "Capacitance (C)",
        unit: "µF",
      },
    ],
    expectedOutputs: [{ kind: "plot", name: "AC Waveforms" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 5,
    enabled: true,
  },
];

export const IIT_ISM_ELC_EXPERIMENTS: ExperimentDefinition[] = [
  {
    id: "ELC-01",
    title: "RC Low-Pass Filter",
    course: "NT",
    level: "UG",
    institute: "IIT (ISM) Dhanbad",
    labName: "Electrical Engineering Virtual Laboratory",
    sourceUrl: "https://www.vlab.co.in/",
    imageUrl: "/images/rc-lowpass-filter.jpg",
    objective:
      "To study the frequency response of a simple RC Low-Pass Filter and observe how the output voltage (across capacitor) varies with input frequency.",
    aimDetails: [
      "Understand the concept of an RC Low-Pass Filter: a circuit that allows low-frequency signals to pass while attenuating high-frequency signals.",
      "Calculate the cut-off frequency: fc = 1 / (2πRC) at which Vout drops to 70.7% (−3 dB) of Vin.",
      "Observe the output waveform (Vout across C) compared to input waveform (Vin) at different frequencies.",
      "Plot the frequency response: Vout vs frequency to identify the passband and stopband.",
    ],
    apparatus: [
      "AC Voltage Source (Vin, f)",
      "Resistor R (series)",
      "Capacitor C (shunt to ground)",
      "Voltmeter across C (measuring Vout)",
    ],
    theory: `### RC Low-Pass Filter
An RC Low-Pass Filter consists of a **resistor R** in series and a **capacitor C** in shunt (to ground). The output is taken across the capacitor.

**Transfer Function:**
$$V_{out} = V_{in} \\times \\frac{X_C}{\\sqrt{R^2 + X_C^2}}, \\quad X_C = \\frac{1}{2\\pi f C}$$

**Cut-off Frequency:**
$$f_c = \\frac{1}{2\\pi RC}$$

At $f = f_c$: $V_{out} = \\frac{V_{in}}{\\sqrt{2}} \\approx 0.707 \\times V_{in}$ (−3 dB point)

**Behaviour:**
- **Below fc (passband):** Vout ≈ Vin, capacitor acts as open circuit
- **Above fc (stopband):** Vout decreases, capacitor acts as short circuit
- **Phase shift:** Vout lags Vin by $\\theta = -\\tan^{-1}(2\\pi f R C)$`,
    procedureSteps: [
      "Verify the RC circuit connections: AC Source (Vin) → Resistor R → Node A → Capacitor C → Ground, with Voltmeter across C measuring Vout.",
      "Set Supply Voltage (Vin), Resistance (R), and Capacitance (C) values in the Controls panel.",
      "Note the calculated cut-off frequency fc = 1/(2πRC) shown in the Quantities panel.",
      "Click 'Simulate Circuit' to observe Vin and Vout waveforms. The output should lag behind input.",
      "Vary the frequency (f) above and below fc to observe attenuation in the output.",
    ],
    pretest: [
      {
        id: "rc-pre-1",
        question: "In an RC Low-Pass Filter, the output is taken across:",
        options: ["The resistor R", "The capacitor C", "The source", "Both R and C"],
        correctIndex: 1,
        explanation:
          "The output voltage Vout is measured across the capacitor C in a low-pass RC filter.",
      },
      {
        id: "rc-pre-2",
        question: "The cut-off frequency of an RC filter with R = 1 kΩ and C = 1 µF is:",
        options: ["159.2 Hz", "1000 Hz", "62.8 Hz", "318.3 Hz"],
        correctIndex: 0,
        explanation: "fc = 1/(2π × 1000 × 1×10⁻⁶) = 1/(6.283×10⁻³) ≈ 159.2 Hz.",
      },
      {
        id: "rc-pre-3",
        question: "At the cut-off frequency fc, the output voltage Vout equals:",
        options: ["Vin", "0.5 × Vin", "0.707 × Vin", "2 × Vin"],
        correctIndex: 2,
        explanation: "At fc, Vout = Vin/√2 ≈ 0.707 × Vin (the −3 dB point).",
      },
    ],
    posttest: [
      {
        id: "rc-post-1",
        question: "If the frequency is much higher than fc in a low-pass RC filter, Vout will:",
        options: [
          "Equal Vin",
          "Approach zero (capacitor shorts the output)",
          "Double Vin",
          "Stay constant",
        ],
        correctIndex: 1,
        explanation:
          "At very high frequencies, XC → 0, the capacitor acts like a short circuit to ground, so Vout → 0.",
      },
      {
        id: "rc-post-2",
        question: "To lower the cut-off frequency of an RC filter, you should:",
        options: [
          "Decrease R or decrease C",
          "Increase R or increase C",
          "Increase the input voltage",
          "Increase the input frequency",
        ],
        correctIndex: 1,
        explanation:
          "fc = 1/(2πRC). Increasing R or C decreases fc, moving the cutoff to lower frequencies.",
      },
    ],
    references: [
      "IIT (ISM) Dhanbad — Electrical Engineering Virtual Laboratory: RC Low-Pass Filter",
      "Boylestad, R. L., 'Introductory Circuit Analysis', Pearson Education.",
    ],
    starterCode: "# Circuit simulation runs via interactive Circuit Maker",
    parameters: [
      {
        name: "Vin",
        kind: "slider",
        default: 10,
        min: 1,
        max: 50,
        step: 1,
        label: "Input Voltage (Vin RMS)",
        unit: "V",
      },
      {
        name: "f",
        kind: "slider",
        default: 100,
        min: 10,
        max: 10000,
        step: 10,
        label: "Supply Frequency (f)",
        unit: "Hz",
      },
      {
        name: "R",
        kind: "number",
        default: 1000,
        min: 100,
        max: 100000,
        step: 100,
        label: "Resistance (R)",
        unit: "Ω",
      },
      {
        name: "C",
        kind: "number",
        default: 1,
        min: 0.1,
        max: 100,
        step: 0.1,
        label: "Capacitance (C)",
        unit: "µF",
      },
    ],
    expectedOutputs: [{ kind: "plot", name: "RC Filter Waveforms" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 5,
    enabled: true,
  },
  {
    id: "ELC-02",
    title: "Zener Diode Characteristics",
    course: "NT",
    level: "UG",
    institute: "IIT (ISM) Dhanbad",
    labName: "Electrical Engineering Virtual Laboratory",
    sourceUrl: "https://www.vlab.co.in/",
    imageUrl: "/images/zener-diode-circuit.jpg",
    objective:
      "To study the V-I characteristics of a Zener diode in reverse bias and verify its voltage regulation property.",
    aimDetails: [
      "Understand the Zener diode as a special PN junction designed to operate in reverse breakdown without damage.",
      "Plot the reverse-bias V-I characteristic showing the sharp breakdown at Zener voltage Vz.",
      "Verify voltage regulation: when Vs > Vz, the Zener maintains Vz across its terminals while excess current flows through series resistor Rs.",
      "Calculate Zener current: Iz = (Vs − Vz) / Rs.",
    ],
    apparatus: [
      "Variable DC Supply (Vs)",
      "Series Limiting Resistor (Rs)",
      "Zener Diode (reverse biased)",
      "DC Voltmeter across Zener",
      "Ground Reference (GND)",
    ],
    theory: `### Zener Diode & Voltage Regulation
A **Zener diode** is a heavily doped PN junction designed to operate in **reverse breakdown**. Unlike normal diodes, it maintains a nearly constant voltage $V_Z$ across its terminals once the reverse voltage reaches the breakdown value.

**Circuit:**
$$V_S \\to R_S \\to \\text{Zener (reverse biased)} \\to \\text{GND}$$

**When $V_S < V_Z$:** Zener is off (open circuit). No current flows.
$$V_{out} = V_S, \\quad I_Z = 0$$

**When $V_S \\geq V_Z$:** Zener conducts, regulating output at $V_Z$.
$$V_{out} = V_Z, \\quad I_Z = \\frac{V_S - V_Z}{R_S}$$

**V-I Characteristic:** Shows a sharp vertical breakdown at $-V_Z$ in the reverse bias region, indicating near-constant voltage despite varying current.`,
    procedureSteps: [
      "Verify circuit connections: DC Source (Vs) → Series Resistor (Rs) → Zener Diode (reverse biased) → Ground, with Voltmeter across the Zener.",
      "Set the Supply Voltage (Vs), Series Resistance (Rs), and Zener Voltage (Vz) in the Controls panel.",
      "Click 'Simulate Circuit' to observe the Zener voltage, current, and operating mode.",
      "Gradually increase Vs from 0 to above Vz and observe the transition from non-conducting to regulation mode.",
      "Click 'Add to Table' at each voltage level to build the V-I characteristic curve.",
    ],
    pretest: [
      {
        id: "zen-pre-1",
        question: "A Zener diode is normally operated in:",
        options: [
          "Forward bias only",
          "Reverse breakdown region",
          "Zero bias",
          "Both forward and reverse equally",
        ],
        correctIndex: 1,
        explanation:
          "The Zener diode is designed to operate in the reverse breakdown region, maintaining a stable voltage Vz.",
      },
      {
        id: "zen-pre-2",
        question:
          "If Vs = 15 V, Vz = 5.1 V, and Rs = 470 Ω, the Zener current Iz is approximately:",
        options: ["31.9 mA", "10.8 mA", "21.1 mA", "32 mA"],
        correctIndex: 2,
        explanation: "Iz = (Vs − Vz) / Rs = (15 − 5.1) / 470 = 9.9 / 470 ≈ 21.1 mA.",
      },
      {
        id: "zen-pre-3",
        question: "The purpose of the series resistor Rs in a Zener regulator is to:",
        options: [
          "Increase Zener voltage",
          "Limit current and drop excess voltage",
          "Filter AC noise",
          "Reverse bias the diode",
        ],
        correctIndex: 1,
        explanation:
          "Rs limits current through the Zener and drops the excess voltage (Vs − Vz), protecting the Zener from excessive current.",
      },
    ],
    posttest: [
      {
        id: "zen-post-1",
        question:
          "In a Zener voltage regulator, if the input voltage Vs increases, what happens to Vout?",
        options: [
          "Vout increases proportionally",
          "Vout stays approximately constant at Vz",
          "Vout decreases",
          "Vout becomes zero",
        ],
        correctIndex: 1,
        explanation:
          "In the breakdown region, the Zener maintains Vz across its terminals regardless of changes in Vs (within its operating range).",
      },
      {
        id: "zen-post-2",
        question: "What happens if the series resistor Rs is removed from a Zener regulator?",
        options: [
          "The circuit works better",
          "The Zener may be destroyed due to excessive current",
          "Output voltage increases",
          "Nothing changes",
        ],
        correctIndex: 1,
        explanation:
          "Without Rs, there is no current limiting, so excessive current would flow through the Zener, destroying it.",
      },
    ],
    references: [
      "IIT (ISM) Dhanbad — Electrical Engineering Virtual Laboratory: Zener Diode Characteristics",
      "Boylestad, R. L., & Nashelsky, L., 'Electronic Devices and Circuit Theory', Pearson.",
    ],
    starterCode: "# Circuit simulation runs via interactive Circuit Maker",
    parameters: [
      {
        name: "Vs",
        kind: "slider",
        default: 10,
        min: 0,
        max: 30,
        step: 0.5,
        label: "Supply Voltage (Vs)",
        unit: "V",
      },
      {
        name: "Rs",
        kind: "number",
        default: 470,
        min: 100,
        max: 10000,
        step: 10,
        label: "Series Resistor (Rs)",
        unit: "Ω",
      },
      {
        name: "Vz",
        kind: "number",
        default: 5.1,
        min: 1.8,
        max: 20,
        step: 0.1,
        label: "Zener Breakdown Voltage (Vz)",
        unit: "V",
      },
    ],
    expectedOutputs: [{ kind: "plot", name: "Zener V-I Characteristic" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 5,
    enabled: true,
  },
];
