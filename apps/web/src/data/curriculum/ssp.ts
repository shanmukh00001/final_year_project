import { type ExperimentDefinition } from "@vlab/shared";

export const SSP_EXPERIMENTS: ExperimentDefinition[] = [
  {
    id: "SSP-01",
    title: "Random Processes and Autocorrelation",
    course: "SSP",
    level: "PG",
    objective:
      "Generate wide-sense stationary (WSS) random processes and compute sample autocorrelation function (ACF).",
    theory:
      "For ergodic processes, time average $\\hat{R}_{xx}[k] = \\frac{1}{N} \\sum_{n=0}^{N-1-|k|} x[n] x[n+k]$ converges to ensemble $E[x[n]x[n+k]]$.",
    starterCode: `# SSP-01: Autocorrelation of Random Process
import numpy as np
import vlab

np.random.seed(42)
N = 1000
# AR(1) process: x[n] = 0.8*x[n-1] + w[n]
w = np.random.normal(0, 1, N)
x = np.zeros(N)
for n in range(1, N):
    x[n] = 0.8 * x[n-1] + w[n]

# Compute sample ACF
acf = np.correlate(x - x.mean(), x - x.mean(), mode="full") / N
lags = np.arange(-N + 1, N)

center = len(acf) // 2
vlab.plot(lags[center-50:center+50], acf[center-50:center+50], label="Sample ACF", title="AR(1) Autocorrelation Function")
print(f"Variance estimate R(0): {acf[center]:.2f}")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "AR(1) Autocorrelation Function" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "xcorr(x, 'biased') -> np.correlate(x, x, mode='full') / N",
    enabled: true,
  },
  {
    id: "SSP-02",
    title: "Non-Parametric Spectral Estimation (Welch Method)",
    course: "SSP",
    level: "PG",
    objective:
      "Compare raw periodogram, Bartlett averaged periodogram, and Welch overlapping segment averaging.",
    theory:
      "Welch method reduces periodogram variance by averaging $50\\%$ overlapping Hann-windowed segments.",
    starterCode: `# SSP-02: Welch Spectral Estimation
import numpy as np
from scipy import signal
import vlab

np.random.seed(42)
fs = 1000
t = np.linspace(0, 1, fs)
x = np.sin(2 * np.pi * 100 * t) + np.sin(2 * np.pi * 250 * t) + np.random.normal(0, 1, fs)

f, Pxx = signal.welch(x, fs, nperseg=256)

vlab.plot(f, 10 * np.log10(Pxx + 1e-12), label="Welch PSD (dB/Hz)", title="Power Spectral Density Estimate")
print(f"Identified peaks around 100 Hz and 250 Hz")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Power Spectral Density Estimate" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "pwelch(x, 256) -> scipy.signal.welch(x, fs, nperseg=256)",
    enabled: true,
  },
  {
    id: "SSP-03",
    title: "Parametric Spectral Estimation (AR via Yule-Walker)",
    course: "SSP",
    level: "PG",
    objective:
      "Estimate Autoregressive (AR) model parameters using Yule-Walker normal equations and Levinson-Durbin recursion.",
    theory:
      "The Yule-Walker equations relate model parameters $a_k$ to the autocorrelation sequence $R_{xx}$.",
    starterCode: `# SSP-03: AR Yule-Walker Spectral Estimation
import numpy as np
from scipy import linalg
import vlab

# True AR(2) coefficients: [1, -0.9, 0.8]
r = np.array([2.5, 1.2, 0.4]) # Sample autocorrelation
R_toeplitz = linalg.toeplitz(r[:2])
a_params = linalg.solve(R_toeplitz, -r[1:])

w = np.linspace(0, np.pi, 256)
A_poly = 1 + a_params[0] * np.exp(-1j * w) + a_params[1] * np.exp(-2j * w)
PSD_ar = 1.0 / (np.abs(A_poly) ** 2)

vlab.plot(w / np.pi, 10 * np.log10(PSD_ar), label="AR(2) PSD", title="Parametric Yule-Walker Spectrum")
print(f"Estimated AR(2) parameters: a1 = {a_params[0]:.3f}, a2 = {a_params[1]:.3f}")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Parametric Yule-Walker Spectrum" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "aryule(x, p) -> linalg.solve(toeplitz(r), -r)",
    enabled: true,
  },
  {
    id: "SSP-04",
    title: "Wiener Filtering and Optimal Estimation",
    course: "SSP",
    level: "PG",
    objective:
      "Design optimal causal and non-causal FIR Wiener filters to minimize Mean Squared Error (MSE).",
    theory: "Wiener-Hopf equations $R_{xx} w_{opt} = r_{dx}$ minimize $E[(d[n] - \\hat{d}[n])^2]$.",
    starterCode: `# SSP-04: FIR Wiener Filter
import numpy as np
from scipy import linalg, signal
import vlab

np.random.seed(42)
N = 500
d = np.sin(2 * np.pi * 0.05 * np.arange(N)) # Desired clean signal
noise = np.random.normal(0, 0.5, N)
x = d + noise # Noisy observation

# Compute Wiener filter of order M=10
M = 10
r_xx = np.correlate(x, x, mode="full")[N-1:N-1+M] / N
r_dx = np.correlate(d, x, mode="full")[N-1:N-1+M] / N

w_opt = linalg.solve(linalg.toeplitz(r_xx), r_dx)
d_hat = signal.lfilter(w_opt, 1, x)

vlab.plot(np.arange(100), d_hat[:100], label="Wiener Estimate", title="Optimal Signal Recovery")
print(f"Estimated optimal Wiener coefficients: {np.round(w_opt, 3)}")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Optimal Signal Recovery" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "wiener2() -> custom normal equations",
    enabled: true,
  },
  {
    id: "SSP-05",
    title: "Adaptive Filters (LMS and RLS)",
    course: "SSP",
    level: "PG",
    objective:
      "Implement Least Mean Squares (LMS) and Recursive Least Squares (RLS) adaptive filters for system identification.",
    theory:
      "LMS weight update equation: $w[n+1] = w[n] + \\mu e[n] x[n]$, converging to Wiener solution.",
    starterCode: `# SSP-05: LMS Adaptive Filter
import numpy as np
import vlab

np.random.seed(42)
N = 1000
x = np.random.normal(0, 1, N)
# Unknown system impulse response
h_true = np.array([0.3, -0.5, 0.8, -0.2])

d = np.convolve(x, h_true)[:N] + np.random.normal(0, 0.05, N)

# LMS adaptation
M = 4
mu = 0.02
w = np.zeros(M)
errors = np.zeros(N)

for n in range(M, N):
    x_vec = x[n:n-M:-1]
    y = np.dot(w, x_vec)
    e = d[n] - y
    errors[n] = e ** 2
    w += mu * e * x_vec

vlab.plot(np.arange(N), errors, label="Squared Error e^2[n]", title="LMS Learning Curve")
print(f"True weights: {h_true}\nLearned weights: {np.round(w, 3)}")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "LMS Learning Curve" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 400,
    matlabNotes: "dsp.LMSFilter -> Python loop update",
    enabled: true,
  },
  {
    id: "SSP-06",
    title: "Kalman Filter for Object Tracking",
    course: "SSP",
    level: "PG",
    objective:
      "Implement linear Kalman filter for 1D constant-velocity target position and velocity tracking.",
    theory:
      "Kalman filter alternates between Predict ($x_{k|k-1} = F x_{k-1}$) and Update ($K_k = P_{k|k-1} H^T (H P_{k|k-1} H^T + R)^{-1}$).",
    starterCode: `# SSP-06: 1D Constant Velocity Kalman Filter
import numpy as np
import vlab

np.random.seed(42)
N = 100
dt = 0.1

# State transition matrix [pos, vel]
F = np.array([[1, dt], [0, 1]])
H = np.array([[1, 0]])
Q = np.array([[0.01, 0], [0, 0.01]])
R = 1.0

# Generate true trajectory & noisy measurements
x_true = np.zeros((2, N))
x_true[:, 0] = [0, 2.0] # start at 0, moving at 2 m/s
for k in range(1, N):
    x_true[:, k] = F @ x_true[:, k-1] + np.random.multivariate_normal([0, 0], Q)

z = x_true[0, :] + np.random.normal(0, np.sqrt(R), N)

# Kalman filter loop
x_est = np.zeros((2, N))
P = np.eye(2)

for k in range(N):
    if k > 0:
        x_pred = F @ x_est[:, k-1]
        P_pred = F @ P @ F.T + Q
    else:
        x_pred = np.array([0, 0])
        P_pred = P

    K = P_pred @ H.T / (H @ P_pred @ H.T + R)
    x_est[:, k] = x_pred + K.flatten() * (z[k] - H @ x_pred)
    P = (np.eye(2) - K @ H) @ P_pred

vlab.plot(np.arange(N) * dt, x_est[0, :], label="Kalman Estimate", title="Target Tracking Position")
print(f"Tracking RMS position error: {np.sqrt(np.mean((x_true[0, :] - x_est[0, :]) ** 2)):.3f} m")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Target Tracking Position" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 400,
    matlabNotes: "Matrix multiplication A * B in MATLAB -> A @ B in Python",
    enabled: true,
  },
  {
    id: "SSP-07",
    title: "Estimation Theory (MLE and CRLB)",
    course: "SSP",
    level: "PG",
    objective:
      "Evaluate Maximum Likelihood Estimator (MLE) and compare empirical variance against the Cramer-Rao Lower Bound (CRLB).",
    theory:
      "For DC level estimation in AWGN, CRLB is $\\operatorname{var}(\\hat{A}) \\ge \\frac{\\sigma^2}{N}$.",
    starterCode: `# SSP-07: MLE vs CRLB
import numpy as np
import vlab

np.random.seed(42)
A_true = 2.0
sigma2 = 1.0
N_samples = np.array([10, 20, 50, 100, 200])
crlb = sigma2 / N_samples

# Monte Carlo variance calculation
variances = []
for N in N_samples:
    estimates = [np.mean(A_true + np.random.normal(0, np.sqrt(sigma2), N)) for _ in range(500)]
    variances.append(np.var(estimates))

vlab.plot(N_samples, crlb, label="Theoretical CRLB", title="MLE Variance vs CRLB")
print(f"At N=100: Empirical Var = {variances[3]:.4f}, CRLB = {crlb[3]:.4f}")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "MLE Variance vs CRLB" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 450,
    matlabNotes: "var(x) -> np.var(x)",
    enabled: true,
  },
  {
    id: "SSP-08",
    title: "Detection Theory and Receiver Operating Characteristic (ROC)",
    course: "SSP",
    level: "PG",
    objective:
      "Simulate binary hypothesis testing (Neyman-Pearson criterion) and plot Receiver Operating Characteristic (ROC) curves.",
    theory:
      "Under Gaussian noise, detection probability $P_D = Q(Q^{-1}(P_{FA}) - d)$, where $d = \\sqrt{E/N_0}$ is the deflection coefficient.",
    starterCode: `# SSP-08: Neyman-Pearson ROC Curves
import numpy as np
from scipy import stats
import vlab

pfa = np.linspace(0.001, 0.999, 200)
# Deflection coefficients d = 1, 2, 3
d_vals = [1.0, 2.0, 3.0]

for d in d_vals:
    pd = stats.norm.sf(stats.norm.isf(pfa) - d)
    # plot first curve
    if d == 2.0:
        vlab.plot(pfa, pd, label=f"d={d}", title="Receiver Operating Characteristic (ROC)")

print("Evaluated Neyman-Pearson detection probabilities across varying deflection SNR")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Receiver Operating Characteristic (ROC)" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "qfunc() -> scipy.stats.norm.sf()",
    enabled: true,
  },
];
