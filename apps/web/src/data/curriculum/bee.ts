import { type ExperimentDefinition } from "@vlab/shared";

export const BEE_EXPERIMENTS: ExperimentDefinition[] = [
  {
    id: "BEE-01",
    title: "PN-Junction Diode I-V Characteristics",
    course: "BEE",
    level: "UG",
    objective: "Simulate forward and reverse bias I-V characteristics of a PN junction diode using the Shockley equation.",
    theory: "Shockley equation: $I = I_s (e^{V_D / (\\eta V_T)} - 1)$, where $V_T \\approx 26\\text{ mV}$ at room temperature.",
    starterCode: `# BEE-01: PN Diode Characteristics
import numpy as np
import vlab

Is = 1e-12 # 1 pA saturation current
Vt = 0.026 # 26 mV thermal voltage
eta = 1.0

v_d = np.linspace(0, 0.8, 200)
i_d = Is * (np.exp(v_d / (eta * Vt)) - 1)

vlab.plot(v_d, i_d * 1e3, label="Diode Current (mA)", title="Forward PN Diode I-V Curve")
print(f"Current at Vd=0.7V: {Is * (np.exp(0.7 / (eta * Vt)) - 1) * 1e3:.2f} mA")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Forward PN Diode I-V Curve" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 300,
    matlabNotes: "exp() -> np.exp()",
    enabled: true,
  },
  {
    id: "BEE-02",
    title: "Rectifiers and Filter Ripple Factor",
    course: "BEE",
    level: "UG",
    objective: "Analyze half-wave and full-wave bridge rectifier waveforms and calculate ripple factor with filter capacitors.",
    theory: "Ripple factor $\\gamma = \\frac{V_{ac,rms}}{V_{dc}} = \\frac{1}{2\\sqrt{3} f R_L C}$ for full-wave rectifiers.",
    starterCode: `# BEE-02: Full-Wave Rectifier
import numpy as np
import vlab

t = np.linspace(0, 0.04, 1000)
v_in = 12.0 * np.sin(2 * np.pi * 50 * t)
v_rect = np.abs(v_in)

vlab.plot(t, v_rect, label="|Vin|", title="Full-Wave Rectified Output")
print(f"DC voltage of full-wave rectified signal: {2 * 12.0 / np.pi:.2f} V")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Full-Wave Rectified Output" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 300,
    matlabNotes: "abs(sin()) -> np.abs(np.sin())",
    enabled: true,
  },
  {
    id: "BEE-03",
    title: "Zener Diode Voltage Regulator",
    course: "BEE",
    level: "UG",
    objective: "Evaluate line and load regulation of a Zener diode voltage regulator circuit.",
    theory: "In breakdown, the Zener diode maintains an almost constant voltage $V_Z$ across varying supply voltages and load currents.",
    starterCode: `# BEE-03: Zener Voltage Regulator
import numpy as np
import vlab

Vz = 5.1 # 5.1V Zener
R_series = 220.0
v_in = np.linspace(0, 15, 100)

v_out = np.where(v_in > Vz, Vz, v_in)

vlab.plot(v_in, v_out, label="V_out vs V_in", title="Zener Line Regulation Curve")
print(f"Regulated voltage clamped at {Vz} V")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Zener Line Regulation Curve" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 300,
    matlabNotes: "where() -> np.where()",
    enabled: true,
  },
  {
    id: "BEE-04",
    title: "BJT Characteristics and Q-Point",
    course: "BEE",
    level: "UG",
    objective: "Plot common-emitter output characteristics ($I_C$ vs $V_{CE}$) and locate the DC operating Q-point.",
    theory: "$I_C = \\beta I_B$ in the active region; DC load line equation is $V_{CE} = V_{CC} - I_C R_C$.",
    starterCode: `# BEE-04: BJT Common-Emitter Characteristics
import numpy as np
import vlab

beta = 100.0
Vce = np.linspace(0, 10, 200)

# Families of curves for Ib = 10uA, 20uA, 30uA, 40uA
Ib_list = [10e-6, 20e-6, 30e-6, 40e-6]
Ic_curves = []

for Ib in Ib_list:
    Ic = beta * Ib * (1 - np.exp(-Vce / 0.3))
    Ic_curves.append(Ic * 1e3)

vlab.plot(Vce, Ic_curves[-1], label="Ib = 40 uA", title="BJT Output Characteristics")
print(f"Computed BJT curves for beta={beta}")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "BJT Output Characteristics" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "For-loop plotting -> multiple series in vlab",
    enabled: true,
  },
  {
    id: "BEE-05",
    title: "Operational Amplifier (Op-Amp) Configurations",
    course: "BEE",
    level: "UG",
    objective: "Simulate inverting, non-inverting, integrator, and differentiator op-amp circuits.",
    theory: "Ideal inverting amplifier closed-loop gain $A_v = -\\frac{R_f}{R_1}$; non-inverting gain $A_v = 1 + \\frac{R_f}{R_1}$.",
    starterCode: `# BEE-05: Inverting Op-Amp
import numpy as np
import vlab

Rf = vlab.param("Rf", 10.0, 1.0, 50.0, 1.0, label="Feedback Rf (kOhms)")
R1 = 2.0 # 2 kOhm
Gain = -Rf / R1

t = np.linspace(0, 0.01, 500)
v_in = 1.0 * np.sin(2 * np.pi * 500 * t)
v_out = Gain * v_in

vlab.plot(t, v_out, label=f"Gain={Gain:.1f}", title="Inverting Op-Amp Output")
print(f"Closed-loop Voltage Gain: {Gain:.2f}")
`,
    parameters: [{ name: "Rf", kind: "slider", default: 10.0, min: 1.0, max: 50.0, step: 1.0, label: "Feedback Rf (kOhms)" }],
    expectedOutputs: [{ kind: "plot", name: "Inverting Op-Amp Output" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 300,
    matlabNotes: "Scalar multiplication Gain * v_in",
    enabled: true,
  },
  {
    id: "BEE-06",
    title: "Logic Gates and Truth Tables",
    course: "BEE",
    level: "UG",
    objective: "Verify truth tables of basic (AND, OR, NOT) and universal (NAND, NOR) logic gates.",
    theory: "Universal gates (NAND, NOR) can realize all boolean functions by combination.",
    starterCode: `# BEE-06: Logic Gates & Truth Table
import numpy as np
import vlab

A = np.array([0, 0, 1, 1], dtype=bool)
B = np.array([0, 1, 0, 1], dtype=bool)

AND_out = A & B
OR_out = A | B
NAND_out = ~(A & B)
XOR_out = A ^ B

vlab.plot(np.arange(4), XOR_out.astype(float), label="XOR Output", title="Logic Gate Truth Table Profile")
print(f"Inputs:\nA: {A.astype(int)}\nB: {B.astype(int)}\nXOR: {XOR_out.astype(int)}")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Logic Gate Truth Table Profile" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 250,
    matlabNotes: "Bitwise logic & | ~ ^ in numpy",
    enabled: true,
  },
  {
    id: "BEE-07",
    title: "RC High-Pass and Low-Pass Filters",
    course: "BEE",
    level: "UG",
    objective: "Demonstrate filtering and phase shift of RC networks over audio frequency ranges.",
    theory: "Cutoff frequency is given by $f_c = \\frac{1}{2\\pi R C}$ where output drops to $\\frac{1}{\\sqrt{2}} \\approx 0.707$ of input.",
    starterCode: `# BEE-07: RC Filter Frequency Response
import numpy as np
import vlab

R = 1000.0 # 1 kOhm
C = 0.1e-6 # 0.1 uF
fc = 1 / (2 * np.pi * R * C)

f = np.logspace(1, 5, 200)
w = 2 * np.pi * f
H_lowpass = 1 / (1 + 1j * w * R * C)
mag_db = 20 * np.log10(np.abs(H_lowpass))

vlab.plot(f, mag_db, label="Low-Pass Response (dB)", title="RC Filter Frequency Response")
print(f"Filter Cutoff Frequency: {fc:.1f} Hz")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "RC Filter Frequency Response" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 300,
    matlabNotes: "semilogx() -> log-scaled axis in vlab",
    enabled: true,
  },
];
