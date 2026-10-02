import { type ExperimentDefinition } from "@vlab/shared";

export const NT_EXPERIMENTS: ExperimentDefinition[] = [
  {
    id: "NT-01",
    title: "Thevenin and Norton Equivalents",
    course: "NT",
    level: "UG",
    objective: "Determine Thevenin voltage, Norton current, and equivalent resistance of linear DC circuits.",
    theory: "Thevenin's theorem reduces any linear two-terminal circuit to an independent voltage source $V_{th}$ in series with $R_{th}$.",
    starterCode: `# NT-01: Thevenin and Norton Equivalents
import numpy as np
import vlab

r_load = np.linspace(10, 500, 100)
v_th = 12.0
r_th = 50.0

i_load = v_th / (r_th + r_load)
v_load = i_load * r_load

vlab.plot(r_load, v_load, label="V_load vs R_load", title="Thevenin Circuit Load Line")
print(f"V_th: {v_th} V, R_th: {r_th} Ohms, I_norton: {v_th/r_th} A")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Thevenin Circuit Load Line" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 300,
    matlabNotes: "Matrix solve A \\ b -> np.linalg.solve(A, b)",
    enabled: true,
  },
  {
    id: "NT-02",
    title: "Maximum Power Transfer Theorem",
    course: "NT",
    level: "UG",
    objective: "Verify that maximum power is delivered to the load when load resistance equals source Thevenin resistance.",
    theory: "Power transferred $P_L = I_L^2 R_L = \\frac{V_{th}^2 R_L}{(R_{th} + R_L)^2}$, maximizing at $R_L = R_{th}$.",
    starterCode: `# NT-02: Maximum Power Transfer
import numpy as np
import vlab

r_th = vlab.param("r_th", 50.0, 10.0, 200.0, 10.0, label="Thevenin R_th (Ohms)")
v_th = 10.0

r_load = np.linspace(1, 200, 300)
p_load = (v_th ** 2 * r_load) / ((r_th + r_load) ** 2)

vlab.plot(r_load, p_load, label="Power (W)", title="Maximum Power Transfer Curve")
print(f"Max power occurs at R_load = {r_th} Ohms with P_max = {(v_th**2)/(4*r_th):.4f} W")
`,
    parameters: [{ name: "r_th", kind: "slider", default: 50.0, min: 10.0, max: 200.0, step: 10.0, label: "Thevenin R_th (Ohms)" }],
    expectedOutputs: [{ kind: "plot", name: "Maximum Power Transfer Curve" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 300,
    matlabNotes: "Element-wise multiplication .* -> * in numpy",
    enabled: true,
  },
  {
    id: "NT-03",
    title: "RLC Transient Response",
    course: "NT",
    level: "UG",
    objective: "Analyze overdamped, critically damped, and underdamped transient responses of series RLC circuits.",
    theory: "The characteristic equation $s^2 + \\frac{R}{L}s + \\frac{1}{LC} = 0$ governs transient damping.",
    starterCode: `# NT-03: RLC Transient Response
import numpy as np
from scipy import signal
import vlab

R = vlab.param("R", 20.0, 1.0, 100.0, 5.0, label="Resistance R (Ohms)")
L = 0.1 # 100 mH
C = 100e-6 # 100 uF

num = [1 / (L * C)]
den = [1, R / L, 1 / (L * C)]
sys = signal.TransferFunction(num, den)

t = np.linspace(0, 0.05, 500)
t, y = signal.step(sys, T=t)

vlab.plot(t, y, label=f"R={R} Ohms", title="Series RLC Step Response")
print(f"Damping ratio zeta: {R / (2 * np.sqrt(L / C)):.3f}")
`,
    parameters: [{ name: "R", kind: "slider", default: 20.0, min: 1.0, max: 100.0, step: 5.0, label: "Resistance R (Ohms)" }],
    expectedOutputs: [{ kind: "plot", name: "Series RLC Step Response" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "step(sys) -> scipy.signal.step(sys)",
    enabled: true,
  },
  {
    id: "NT-04",
    title: "AC Steady State and Phasors",
    course: "NT",
    level: "UG",
    objective: "Compute sinusoidal steady-state voltages and currents using complex impedance and phasor analysis.",
    theory: "Inductive impedance $Z_L = j\\omega L$ and capacitive impedance $Z_C = \\frac{1}{j\\omega C}$.",
    starterCode: `# NT-04: AC Steady State & Phasors
import numpy as np
import vlab

f = 50.0 # 50 Hz
w = 2 * np.pi * f
R = 100.0
L = 0.5
C = 20e-6

Z_total = R + 1j * (w * L - 1 / (w * C))
V_source = 230.0 + 0j
I_circuit = V_source / Z_total

t = np.linspace(0, 0.04, 500)
v_t = np.abs(V_source) * np.cos(w * t + np.angle(V_source))
i_t = np.abs(I_circuit) * np.cos(w * t + np.angle(I_circuit))

vlab.plot(t, v_t, label="v(t) Volts", title="AC Steady-State Voltage Waveform")
print(f"Impedance: {Z_total:.2f} Ohms, Current Mag: {np.abs(I_circuit):.2f} A, Phase: {np.angle(I_circuit, deg=True):.1f} deg")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "AC Steady-State Voltage Waveform" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 300,
    matlabNotes: "1i in MATLAB -> 1j in Python",
    enabled: true,
  },
  {
    id: "NT-05",
    title: "Series and Parallel Resonance",
    course: "NT",
    level: "UG",
    objective: "Determine resonant frequency, quality factor Q, and half-power bandwidth of resonant circuits.",
    theory: "Resonant frequency $\\omega_0 = \\frac{1}{\\sqrt{LC}}$, and Quality Factor $Q = \\frac{\\omega_0 L}{R}$.",
    starterCode: `# NT-05: Series Resonance
import numpy as np
import vlab

L = 10e-3 # 10 mH
C = 100e-9 # 100 nF
R = vlab.param("R", 10.0, 2.0, 50.0, 2.0, label="Resistance R")

f0 = 1 / (2 * np.pi * np.sqrt(L * C))
freqs = np.linspace(f0 * 0.5, f0 * 1.5, 500)
w = 2 * np.pi * freqs

Z = R + 1j * (w * L - 1 / (w * C))
I_mag = 10.0 / np.abs(Z)

vlab.plot(freqs, I_mag, label=f"R={R} Ohms", title="Series RLC Resonance Frequency Response")
print(f"Resonant frequency f0 = {f0:.1f} Hz, Q = {(2*np.pi*f0*L)/R:.2f}")
`,
    parameters: [{ name: "R", kind: "slider", default: 10.0, min: 2.0, max: 50.0, step: 2.0, label: "Resistance R" }],
    expectedOutputs: [{ kind: "plot", name: "Series RLC Resonance Frequency Response" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "logspace() -> np.logspace()",
    enabled: true,
  },
  {
    id: "NT-06",
    title: "Two-Port Network Parameters",
    course: "NT",
    level: "UG",
    objective: "Calculate and convert between Impedance (Z), Admittance (Y), Transmission (ABCD), and Hybrid (h) parameters.",
    theory: "Two-port parameters relate port voltages and currents: $[V] = [Z][I]$ and $[I] = [Y][V]$.",
    starterCode: `# NT-06: Two-Port Parameters
import numpy as np
import vlab

# T-network with Z1=10, Z2=20, Z3=30
Z1, Z2, Z3 = 10.0, 20.0, 30.0

Z11 = Z1 + Z3
Z12 = Z3
Z21 = Z3
Z22 = Z2 + Z3
Z_matrix = np.array([[Z11, Z12], [Z21, Z22]])
Y_matrix = np.linalg.inv(Z_matrix)

vlab.plot(np.arange(4), Z_matrix.flatten(), label="Z Matrix Elements", title="Two-Port Z-Parameters")
print(f"Z-matrix:\n{Z_matrix}\nY-matrix:\n{Y_matrix}")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Two-Port Z-Parameters" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 300,
    matlabNotes: "inv(Z) -> np.linalg.inv(Z)",
    enabled: true,
  },
  {
    id: "NT-07",
    title: "Passive Filter Frequency Response",
    course: "NT",
    level: "UG",
    objective: "Design passive low-pass, high-pass, and band-pass filters and plot Bode magnitude and phase curves.",
    theory: "For a first-order RC low-pass filter, the cutoff frequency is $f_c = \\frac{1}{2\\pi RC}$.",
    starterCode: `# NT-07: Passive RC Filter Bode Plot
import numpy as np
from scipy import signal
import vlab

R = 1e3 # 1 kOhm
C = 100e-9 # 100 nF
fc = 1 / (2 * np.pi * R * C)

sys = signal.TransferFunction([1], [R * C, 1])
w, mag, phase = signal.bode(sys, w=np.logspace(1, 6, 200))

vlab.plot(w / (2 * np.pi), mag, label="Magnitude (dB)", title="Passive Low-Pass Filter Bode Plot")
print(f"Cutoff frequency fc = {fc:.1f} Hz, Magnitude at fc = -3.01 dB")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Passive Low-Pass Filter Bode Plot" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "bode(sys) -> scipy.signal.bode(sys)",
    enabled: true,
  },
];
