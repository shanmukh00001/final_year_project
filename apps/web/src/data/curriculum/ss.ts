import { type ExperimentDefinition } from "@vlab/shared";

export const SS_EXPERIMENTS: ExperimentDefinition[] = [
  {
    id: "SS-01",
    title: "Elementary Signal Generation",
    course: "SS",
    level: "UG",
    objective: "Generate and analyze continuous and discrete elementary signals (step, ramp, impulse, exponentials, sinusoids).",
    theory: "Elementary signals like unit step $u(t)$, ramp $r(t) = t \\cdot u(t)$, and sinusoidal signals $x(t) = A \\cos(2\\pi f t + \\phi)$ form the basis for continuous and discrete-time system analysis.",
    starterCode: `# SS-01: Elementary Signal Generation
import numpy as np
import vlab

f = vlab.param("f", 5.0, 1.0, 50.0, 1.0, label="Frequency (Hz)")
amp = vlab.param("amp", 1.0, 0.1, 5.0, 0.1, label="Amplitude")

t = np.linspace(0, 1, 1000)
sine_wave = amp * np.sin(2 * np.pi * f * t)
step_wave = (t >= 0.2).astype(float)

vlab.plot(t, sine_wave, label="Sinusoid", title="Elementary Sinusoidal Signal")
print(f"Generated {len(t)} samples at f = {f} Hz, amplitude = {amp}")
`,
    parameters: [
      { name: "f", kind: "slider", default: 5.0, min: 1.0, max: 50.0, step: 1.0, label: "Frequency (Hz)" },
      { name: "amp", kind: "slider", default: 1.0, min: 0.1, max: 5.0, step: 0.1, label: "Amplitude" },
    ],
    expectedOutputs: [{ kind: "plot", name: "Elementary Sinusoidal Signal" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 300,
    matlabNotes: "MATLAB sin() -> np.sin(); linspace() -> np.linspace()",
    enabled: true,
  },
  {
    id: "SS-02",
    title: "Linear Convolution",
    course: "SS",
    level: "UG",
    objective: "Compute linear convolution of discrete signals and explore commutative and associative properties.",
    theory: "Linear convolution of $x[n]$ and $h[n]$ is defined as $y[n] = \\sum_{k=-\\infty}^{\\infty} x[k] h[n-k]$.",
    starterCode: `# SS-02: Linear Convolution
import numpy as np
import vlab

n = np.arange(0, 20)
x = (0.8 ** n) * (n >= 0)
h = np.ones(5)

y = np.convolve(x, h)
ny = np.arange(0, len(y))

vlab.plot(ny, y, label="y[n] = x[n] * h[n]", title="Discrete Linear Convolution")
print(f"Convolution output length: {len(y)}")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Discrete Linear Convolution" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 300,
    matlabNotes: "conv(x, h) -> np.convolve(x, h)",
    enabled: true,
  },
  {
    id: "SS-03",
    title: "Fourier Series and Gibbs Phenomenon",
    course: "SS",
    level: "UG",
    objective: "Reconstruct periodic signals using Fourier series harmonic sums and observe the Gibbs phenomenon.",
    theory: "A periodic square wave is represented by $x(t) = \\frac{4}{\\pi} \\sum_{k=1,3,5,\\dots}^{N} \\frac{1}{k} \\sin(k \\omega_0 t)$.",
    starterCode: `# SS-03: Fourier Series & Gibbs Phenomenon
import numpy as np
import vlab

N = vlab.param("N", 7, 1, 35, 2, kind="number", label="Harmonics Count")

t = np.linspace(-1, 1, 1000)
f0 = 1.0
w0 = 2 * np.pi * f0
x_recon = np.zeros_like(t)

for k in range(1, int(N) + 1, 2):
    x_recon += (4 / (np.pi * k)) * np.sin(k * w0 * t)

vlab.plot(t, x_recon, label=f"N={N} harmonics", title="Fourier Series Square Wave Approximation")
print(f"Synthesized Fourier series up to harmonic {N}")
`,
    parameters: [{ name: "N", kind: "number", default: 7, min: 1, max: 35, step: 2, label: "Harmonics Count" }],
    expectedOutputs: [{ kind: "plot", name: "Fourier Series Square Wave Approximation" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "For-loops over numpy arrays -> vectorised numpy ops or list comprehensions",
    enabled: true,
  },
  {
    id: "SS-04",
    title: "Fourier Transform Properties",
    course: "SS",
    level: "UG",
    objective: "Verify linearity, time-shifting, and frequency-scaling properties of the Continuous-Time Fourier Transform.",
    theory: "For $x(t) \\leftrightarrow X(j\\omega)$, time shifting states $x(t - t_0) \\leftrightarrow X(j\\omega) e^{-j\\omega t_0}$.",
    starterCode: `# SS-04: Fourier Transform Properties
import numpy as np
import vlab

t = np.linspace(-5, 5, 2048)
dt = t[1] - t[0]
x = np.exp(-t**2) # Gaussian pulse

freqs = np.fft.fftfreq(len(t), dt)
X = np.fft.fft(x) * dt

vlab.plot(np.fft.fftshift(freqs), np.fft.fftshift(np.abs(X)), label="|X(f)|", title="Continuous Fourier Transform Magnitude")
print("Computed Fourier transform spectrum")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Continuous Fourier Transform Magnitude" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 400,
    matlabNotes: "fftshift(fft(x)) -> np.fft.fftshift(np.fft.fft(x))",
    enabled: true,
  },
  {
    id: "SS-05",
    title: "Sampling Theorem and Aliasing",
    course: "SS",
    level: "UG",
    objective: "Demonstrate Nyquist-Shannon sampling theorem and the occurrence of aliasing when sampling below the Nyquist rate.",
    theory: "To avoid aliasing, the sampling frequency must satisfy $f_s > 2 f_{max}$.",
    starterCode: `# SS-05: Sampling Theorem & Aliasing
import numpy as np
import vlab

fs = vlab.param("fs", 20.0, 5.0, 100.0, 5.0, label="Sampling Rate fs (Hz)")
f_sig = 10.0 # 10 Hz signal, Nyquist rate is 20 Hz

t_cont = np.linspace(0, 0.5, 1000)
x_cont = np.sin(2 * np.pi * f_sig * t_cont)

t_samp = np.arange(0, 0.5, 1.0 / fs)
x_samp = np.sin(2 * np.pi * f_sig * t_samp)

vlab.plot(t_samp, x_samp, label=f"Sampled at {fs} Hz", title="Signal Sampling & Aliasing Demonstration")
print(f"Sampling frequency: {fs} Hz (Nyquist: {2*f_sig} Hz)")
`,
    parameters: [{ name: "fs", kind: "slider", default: 20.0, min: 5.0, max: 100.0, step: 5.0, label: "Sampling Rate fs (Hz)" }],
    expectedOutputs: [{ kind: "plot", name: "Signal Sampling & Aliasing Demonstration" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 300,
    matlabNotes: "stem(t, x) -> vlab.plot(t, x)",
    enabled: true,
  },
  {
    id: "SS-06",
    title: "Pole-Zero Plots and LTI Stability",
    course: "SS",
    level: "UG",
    objective: "Analyze pole-zero constellation and determine BIBO stability and frequency response of linear time-invariant systems.",
    theory: "A continuous LTI system is BIBO stable if all poles of its transfer function $H(s)$ have negative real parts.",
    starterCode: `# SS-06: Pole-Zero Plots and Stability
import numpy as np
from scipy import signal
import vlab

w, h = signal.freqs([1], [1, 2, 1], np.logspace(-1, 2, 200))

vlab.plot(w, 20 * np.log10(np.abs(h)), label="|H(jw)| (dB)", title="LTI System Frequency Response")
print("Evaluated second-order continuous LTI frequency response")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "LTI System Frequency Response" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 400,
    matlabNotes: "freqs(num, den, w) -> scipy.signal.freqs(num, den, w)",
    enabled: true,
  },
  {
    id: "SS-07",
    title: "Laplace and Z-Transform Analysis",
    course: "SS",
    level: "UG",
    objective: "Perform partial fraction expansion and compute impulse response of continuous and discrete systems.",
    theory: "Partial fraction expansion decomposes $H(s) = \\frac{B(s)}{A(s)} = \\sum \\frac{r_k}{s - p_k} + k(s)$.",
    starterCode: `# SS-07: Laplace and Z-Transform
import numpy as np
from scipy import signal
import vlab

b = [1, 3]
a = [1, 3, 2]
r, p, k = signal.residue(b, a)

t = np.linspace(0, 5, 200)
t, y = signal.impulse((b, a), T=t)

vlab.plot(t, y, label="Impulse Response h(t)", title="Laplace Inverse Transform Response")
print(f"Residues: {r}, Poles: {p}")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Laplace Inverse Transform Response" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "residue(b, a) -> scipy.signal.residue(b, a)",
    enabled: true,
  },
];
