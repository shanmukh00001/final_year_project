import { type ExperimentDefinition } from "@vlab/shared";

export const ACS_EXPERIMENTS: ExperimentDefinition[] = [
  {
    id: "ACS-01",
    title: "Digital Modulation Schemes",
    course: "ACS",
    level: "PG",
    objective: "Simulate and plot constellation diagrams for BPSK, QPSK, 16-QAM, and 64-QAM digital modulation.",
    theory: "M-ary QAM represents $\\log_2(M)$ bits per symbol by modulating in-phase ($I$) and quadrature ($Q$) carrier amplitudes.",
    starterCode: `# ACS-01: Digital Modulation
import numpy as np
import vlab

# Generate 16-QAM Constellation
pts_1d = np.array([-3, -1, 1, 3])
I, Q = np.meshgrid(pts_1d, pts_1d)
symbols = (I + 1j * Q).flatten()

vlab.plot(np.real(symbols), np.imag(symbols), label="16-QAM Constellation", title="16-QAM Constellation Diagram")
print(f"Generated 16-QAM constellation with {len(symbols)} points")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "16-QAM Constellation Diagram" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 300,
    matlabNotes: "qammod(x, 16) -> meshgrid complex mapping",
    enabled: true,
  },
  {
    id: "ACS-02",
    title: "Monte Carlo BER in AWGN versus Theory",
    course: "ACS",
    level: "PG",
    objective: "Perform Monte Carlo simulation of BPSK bit error rate (BER) in AWGN channel and compare against theoretical $Q(\\sqrt{2E_b/N_0})$.",
    theory: "Theoretical BPSK BER: $P_b = \\frac{1}{2} \\operatorname{erfc}\\left(\\sqrt{\\frac{E_b}{N_0}}\\right)$.",
    starterCode: `# ACS-02: BPSK BER in AWGN vs Theory
import numpy as np
from scipy import special
import vlab

ebno_db = np.array([0, 2, 4, 6, 8, 10])
ebno_lin = 10 ** (ebno_db / 10.0)
theory_ber = 0.5 * special.erfc(np.sqrt(ebno_lin))

vlab.plot(ebno_db, np.log10(theory_ber), label="Theoretical BER (log10)", title="BPSK BER Performance")
print(f"At Eb/N0 = 6 dB: Theoretical BER = {theory_ber[3]:.4e}")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "BPSK BER Performance" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 400,
    matlabNotes: "berawgn(EbNo, 'psk', 2, 'nodiff') -> 0.5 * erfc(sqrt(EbNo_lin))",
    enabled: true,
  },
  {
    id: "ACS-03",
    title: "Pulse Shaping and Eye Diagram",
    course: "ACS",
    level: "PG",
    objective: "Design Root-Raised Cosine (RRC) pulse shaping filters and evaluate inter-symbol interference (ISI).",
    theory: "RRC filter with roll-off $\\alpha$ limits bandwidth while satisfying the Nyquist criterion for zero ISI.",
    starterCode: `# ACS-03: Pulse Shaping & RRC Filter
import numpy as np
import vlab

alpha = vlab.param("alpha", 0.35, 0.1, 0.9, 0.05, label="Roll-off Factor")
N_taps = 65
t = np.linspace(-4, 4, N_taps)

# Sinc with raised cosine envelope
h_rrc = np.sinc(t) * np.cos(np.pi * float(alpha) * t) / (1 - (2 * float(alpha) * t) ** 2 + 1e-12)

vlab.plot(t, h_rrc, label=f"RRC alpha={alpha}", title="Root-Raised Cosine Pulse")
print(f"RRC Filter generated with roll-off alpha = {alpha}")
`,
    parameters: [{ name: "alpha", kind: "slider", default: 0.35, min: 0.1, max: 0.9, step: 0.05, label: "Roll-off Factor" }],
    expectedOutputs: [{ kind: "plot", name: "Root-Raised Cosine Pulse" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "rcosdesign(beta, span, sps) -> RRC impulse formula",
    enabled: true,
  },
  {
    id: "ACS-04",
    title: "Matched Filter and Optimal Receiver",
    course: "ACS",
    level: "PG",
    objective: "Demonstrate that the matched filter maximizes SNR at the sampling instant in white Gaussian noise.",
    theory: "The matched filter impulse response is $h(t) = s^*(T - t)$, producing peak output $\\int |s(t)|^2 dt$.",
    starterCode: `# ACS-04: Matched Filter
import numpy as np
from scipy import signal
import vlab

# Rectangular pulse template
pulse = np.ones(20)
noisy_signal = np.concatenate([np.zeros(30), pulse, np.zeros(50)]) + np.random.normal(0, 0.3, 100)

# Matched filter
h_matched = pulse[::-1]
output = signal.convolve(noisy_signal, h_matched, mode="same")

vlab.plot(np.arange(len(output)), output, label="Matched Filter Output", title="Matched Filter SNR Maximization")
print(f"Matched filter output peak: {output.max():.2f}")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Matched Filter SNR Maximization" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "conv(r, fliplr(s)) -> signal.convolve(r, s[::-1])",
    enabled: true,
  },
  {
    id: "ACS-05",
    title: "Fading Channels and Diversity Combining",
    course: "ACS",
    level: "PG",
    objective: "Simulate Rayleigh and Rician flat fading channels and evaluate Maximal Ratio Combining (MRC).",
    theory: "MRC diversity with $L$ independent antennas achieves diversity order $L$, drastically reducing outage probability.",
    starterCode: `# ACS-05: Rayleigh Fading & MRC Diversity
import numpy as np
import vlab

N = 10000
# 2-branch Rayleigh channels
h1 = (np.random.normal(0, 1, N) + 1j * np.random.normal(0, 1, N)) / np.sqrt(2)
h2 = (np.random.normal(0, 1, N) + 1j * np.random.normal(0, 1, N)) / np.sqrt(2)

gamma_1 = np.abs(h1) ** 2
gamma_mrc = np.abs(h1) ** 2 + np.abs(h2) ** 2

vlab.plot(np.sort(gamma_1), np.linspace(0, 1, N), label="Single Antenna", title="Rayleigh vs MRC Diversity CDF")
print(f"Mean SNR single: {gamma_1.mean():.2f}, Mean SNR 2-branch MRC: {gamma_mrc.mean():.2f}")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Rayleigh vs MRC Diversity CDF" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 400,
    matlabNotes: "raylrnd() -> complex normal magnitude",
    enabled: true,
  },
  {
    id: "ACS-06",
    title: "OFDM Transceiver with Cyclic Prefix",
    course: "ACS",
    level: "PG",
    objective: "Implement complete Orthogonal Frequency Division Multiplexing (OFDM) chain with IFFT/FFT and cyclic prefix.",
    theory: "Cyclic Prefix converts linear channel convolution into circular convolution, enabling simple 1-tap frequency domain equalization.",
    starterCode: `# ACS-06: OFDM Transceiver
import numpy as np
import vlab

N_subcarriers = 64
cp_len = 16

# QPSK data on subcarriers
data_bits = np.random.choice([1+1j, 1-1j, -1+1j, -1-1j], size=N_subcarriers)
ofdm_time = np.fft.ifft(data_bits)

# Add Cyclic Prefix
ofdm_tx = np.concatenate([ofdm_time[-cp_len:], ofdm_time])

vlab.plot(np.arange(len(ofdm_tx)), np.real(ofdm_tx), label="OFDM Symbol Real Part", title="OFDM Time-Domain Waveform")
print(f"Transmitted OFDM frame with {N_subcarriers} subcarriers + {cp_len} CP samples")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "OFDM Time-Domain Waveform" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "ifft(data) -> np.fft.ifft(data)",
    enabled: true,
  },
  {
    id: "ACS-07",
    title: "MIMO Channel Capacity and Spatial Multiplexing",
    course: "ACS",
    level: "PG",
    objective: "Calculate ergodic capacity of $N_t \\times N_r$ MIMO channels and simulate Zero-Forcing (ZF) receiver.",
    theory: "MIMO capacity: $C = \\log_2 \\det\\left(I + \\frac{\\rho}{N_t} H H^H\\right)$.",
    starterCode: `# ACS-07: 2x2 MIMO Capacity
import numpy as np
import vlab

snr_db = np.linspace(0, 30, 31)
snr_lin = 10 ** (snr_db / 10.0)

# 2x2 Rayleigh channel matrix H
H = (np.random.normal(0, 1, (2, 2)) + 1j * np.random.normal(0, 1, (2, 2))) / np.sqrt(2)
singular_vals = np.linalg.svd(H, compute_uv=False)

capacity = np.sum([np.log2(1 + (snr_lin / 2) * (s ** 2)) for s in singular_vals], axis=0)

vlab.plot(snr_db, capacity, label="2x2 MIMO", title="MIMO Channel Capacity (bps/Hz)")
print(f"Capacity at 20 dB SNR: {capacity[20]:.2f} bps/Hz")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "MIMO Channel Capacity (bps/Hz)" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 400,
    matlabNotes: "svd(H) -> np.linalg.svd(H, compute_uv=False)",
    enabled: true,
  },
  {
    id: "ACS-08",
    title: "Carrier and Timing Synchronisation",
    course: "ACS",
    level: "PG",
    objective: "Implement Costas loop phase-locked loop (PLL) for carrier recovery and Gardner Timing Error Detector (TED).",
    theory: "The Costas loop phase detector computes $e[n] = I[n] \\cdot Q[n]$ to track carrier frequency offset.",
    starterCode: `# ACS-08: Costas Loop Carrier Recovery
import numpy as np
import vlab

N = 500
t = np.arange(N)
carrier_offset = 0.05 # rad/sample
phase_true = carrier_offset * t

# Phase tracking loop simulation
phase_est = np.zeros(N)
error_sig = np.zeros(N)
mu = 0.05

for i in range(1, N):
    phase_diff = phase_true[i] - phase_est[i-1]
    error = np.sin(phase_diff)
    error_sig[i] = error
    phase_est[i] = phase_est[i-1] + mu * error

vlab.plot(t, phase_est, label="Phase Estimate", title="Costas Loop Carrier Phase Tracking")
print(f"Converged carrier phase slope: {(phase_est[-1]-phase_est[-50])/50:.4f}")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Costas Loop Carrier Phase Tracking" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 400,
    matlabNotes: "Loop iteration over phase tracking",
    enabled: true,
  },
];
