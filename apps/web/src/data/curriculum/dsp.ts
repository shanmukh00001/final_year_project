import { type ExperimentDefinition } from "@vlab/shared";

export const DSP_EXPERIMENTS: ExperimentDefinition[] = [
  {
    id: "DSP-01",
    title: "DFT, FFT, and Spectral Leakage",
    course: "DSP",
    level: "UG",
    objective: "Analyze DFT frequency resolution, window functions (Rectangular, Hamming, Hanning), and zero padding.",
    theory: "The N-point Discrete Fourier Transform converts time series $x[n]$ to discrete spectrum $X[k] = \\sum_{n=0}^{N-1} x[n] e^{-j 2\\pi k n / N}$.",
    starterCode: `# DSP-01: DFT, FFT & Spectral Leakage
import numpy as np
import vlab

N = 64
n = np.arange(N)
f_bin = 5.5 # Non-integer bin causing leakage
x = np.cos(2 * np.pi * f_bin * n / N)

w_rect = x
w_hamm = x * np.hamming(N)

X_rect = np.abs(np.fft.fft(w_rect, 512))
X_hamm = np.abs(np.fft.fft(w_hamm, 512))

vlab.plot(np.linspace(0, 1, len(X_rect)), 20 * np.log10(X_rect + 1e-12), label="Rectangular Window", title="Spectral Leakage & Windowing")
print(f"Computed 512-point zero-padded FFT with Rectangular and Hamming windows")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Spectral Leakage & Windowing" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "fft(x, N) -> np.fft.fft(x, N); hamming(N) -> np.hamming(N)",
    enabled: true,
  },
  {
    id: "DSP-02",
    title: "Linear and Circular Convolution",
    course: "DSP",
    level: "UG",
    objective: "Implement linear convolution via circular convolution with appropriate zero-padding and overlap-add methods.",
    theory: "Linear convolution of length $L$ and $M$ equals circular convolution when padded to length $N \\ge L + M - 1$.",
    starterCode: `# DSP-02: Linear vs Circular Convolution
import numpy as np
import vlab

x = np.array([1, 2, 3, 4, 5])
h = np.array([1, -1, 2])

# Linear convolution
y_lin = np.convolve(x, h)

# Circular convolution via FFT
N = len(x) + len(h) - 1
X = np.fft.fft(x, N)
H = np.fft.fft(h, N)
y_circ = np.real(np.fft.ifft(X * H))

diff = np.max(np.abs(y_lin - y_circ))
vlab.plot(np.arange(len(y_lin)), y_lin, label="Linear Convolution Output", title="Convolution Equivalence")
print(f"Max absolute difference between linear & FFT convolution: {diff:.2e}")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Convolution Equivalence" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 300,
    matlabNotes: "ifft(X .* H) -> np.fft.ifft(X * H)",
    enabled: true,
  },
  {
    id: "DSP-03",
    title: "FIR Filter Design",
    course: "DSP",
    level: "UG",
    objective: "Design linear-phase FIR filters using window method and Parks-McClellan (Remez) algorithm.",
    theory: "FIR filters offer exact linear phase and guaranteed stability due to having only zeros.",
    starterCode: `# DSP-03: FIR Filter Design
import numpy as np
from scipy import signal
import vlab

fc = vlab.param("fc", 0.3, 0.05, 0.95, 0.05, label="Cutoff Frequency (normalized)")
numtaps = vlab.param("numtaps", 51, 11, 101, 2, kind="number", label="Filter Taps")

h = signal.firwin(int(numtaps), float(fc), window="hamming")
w, H = signal.freqz(h, worN=512)

vlab.plot(w / np.pi, 20 * np.log10(np.abs(H) + 1e-12), label="Magnitude Response (dB)", title="FIR Filter Frequency Response")
print(f"Designed FIR filter with {numtaps} taps and cutoff {fc}")
`,
    parameters: [
      { name: "fc", kind: "slider", default: 0.3, min: 0.05, max: 0.95, step: 0.05, label: "Cutoff Frequency (normalized)" },
      { name: "numtaps", kind: "number", default: 51, min: 11, max: 101, step: 2, label: "Filter Taps" },
    ],
    expectedOutputs: [{ kind: "plot", name: "FIR Filter Frequency Response" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "fir1(N, Wn) -> scipy.signal.firwin(N+1, Wn)",
    enabled: true,
  },
  {
    id: "DSP-04",
    title: "IIR Filter Design",
    course: "DSP",
    level: "UG",
    objective: "Design digital IIR filters using Bilinear Transformation (Butterworth, Chebyshev, and Elliptic).",
    theory: "IIR filters achieve sharp cutoff transitions with significantly fewer coefficients than FIR filters.",
    starterCode: `# DSP-04: IIR Butterworth Filter Design
import numpy as np
from scipy import signal
import vlab

order = vlab.param("order", 4, 1, 8, 1, kind="number", label="Filter Order")
Wn = 0.2

b, a = signal.butter(int(order), Wn, btype="low")
w, h = signal.freqz(b, a, worN=512)

vlab.plot(w / np.pi, 20 * np.log10(np.abs(h) + 1e-12), label=f"Order {order} Butterworth", title="IIR Low-Pass Response")
print(f"Butterworth Order {order} coefficients:\nb = {b}\na = {a}")
`,
    parameters: [{ name: "order", kind: "slider", default: 4, min: 1, max: 8, step: 1, label: "Filter Order" }],
    expectedOutputs: [{ kind: "plot", name: "IIR Low-Pass Response" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "butter(N, Wn) -> scipy.signal.butter(N, Wn)",
    enabled: true,
  },
  {
    id: "DSP-05",
    title: "Short-Time Fourier Transform (STFT)",
    course: "DSP",
    level: "UG",
    objective: "Compute and visualize time-frequency spectrograms of non-stationary signals and chirp waveforms.",
    theory: "STFT segments signal with sliding window: $X(m, \\omega) = \\sum_n x[n] w[n-m] e^{-j\\omega n}$.",
    starterCode: `# DSP-05: STFT and Spectrogram
import numpy as np
from scipy import signal
import vlab

fs = 1000
t = np.linspace(0, 2, 2 * fs)
# Linear chirp from 20 Hz to 200 Hz
x = signal.chirp(t, f0=20, t1=2, f1=200, method="linear")

f, t_spec, Zxx = signal.stft(x, fs, nperseg=128)

vlab.plot(t, x, label="Chirp Waveform", title="Time-Varying Linear Chirp Signal")
print(f"STFT computed: {Zxx.shape[0]} frequency bins, {Zxx.shape[1]} time segments")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Time-Varying Linear Chirp Signal" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 400,
    matlabNotes: "spectrogram(x) -> scipy.signal.stft(x, fs)",
    enabled: true,
  },
  {
    id: "DSP-06",
    title: "Multirate Signal Processing",
    course: "DSP",
    level: "UG",
    objective: "Implement decimation (downsampling with anti-aliasing) and interpolation (upsampling with anti-imaging).",
    theory: "Decimation reduces sampling rate by factor $M$ requiring anti-aliasing lowpass filter with cutoff $\\pi / M$.",
    starterCode: `# DSP-06: Decimation and Interpolation
import numpy as np
from scipy import signal
import vlab

fs = 1000
t = np.linspace(0, 0.1, 100)
x = np.sin(2 * np.pi * 50 * t) + np.sin(2 * np.pi * 300 * t)

# Decimate by factor 4
y_dec = signal.decimate(x, 4)

vlab.plot(np.arange(len(y_dec)), y_dec, label="Decimated (M=4)", title="Multirate Decimation Output")
print(f"Original length: {len(x)}, Decimated length: {len(y_dec)}")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Multirate Decimation Output" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "decimate(x, r) -> scipy.signal.decimate(x, r)",
    enabled: true,
  },
  {
    id: "DSP-07",
    title: "Audio Filtering and Equalization",
    course: "DSP",
    level: "UG",
    objective: "Filter audio signals using bandpass and notch filters to remove noise and unwanted tones.",
    theory: "Notch filters eliminate a specific interfering harmonic frequency without altering surrounding spectrum.",
    starterCode: `# DSP-07: Audio Tone Filtering
import numpy as np
from scipy import signal
import vlab

fs = 8000
t = np.linspace(0, 0.5, 4000)
voice = np.sin(2 * np.pi * 300 * t)
hum_50hz = 0.5 * np.sin(2 * np.pi * 50 * t)
audio_noisy = voice + hum_50hz

# Notch filter at 50 Hz
b_notch, a_notch = signal.iirnotch(50, Q=30, fs=fs)
filtered_audio = signal.filtfilt(b_notch, a_notch, audio_noisy)

vlab.plot(t[:200], filtered_audio[:200], label="Filtered Signal", title="50 Hz Notch Filtering")
print(f"Signal processed with 50 Hz Notch filter (Q=30)")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "50 Hz Notch Filtering" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 400,
    matlabNotes: "iirnotch(w0, bw) -> scipy.signal.iirnotch(w0, Q, fs=fs)",
    enabled: true,
  },
];
