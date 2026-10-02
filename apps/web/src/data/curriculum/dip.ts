import { type ExperimentDefinition } from "@vlab/shared";

export const DIP_EXPERIMENTS: ExperimentDefinition[] = [
  {
    id: "DIP-01",
    title: "Image Point Operations and Gamma Correction",
    course: "DIP",
    level: "UG",
    objective: "Implement negative transformation, logarithmic scaling, and power-law (gamma) intensity modifications.",
    theory: "Power-law transformation is given by $s = c \\cdot r^\\gamma$, used for monitor brightness calibration.",
    starterCode: `# DIP-01: Image Point Operations
import numpy as np
import vlab

gamma = vlab.param("gamma", 1.5, 0.2, 3.0, 0.1, label="Gamma Value")

# Create synthetic 2D gradient test pattern
x = np.linspace(0, 1, 100)
img = np.outer(x, x)

# Apply gamma correction
img_gamma = img ** float(gamma)

vlab.plot(x, img_gamma[50, :], label=f"Gamma = {gamma}", title="Intensity Transformation Profile")
print(f"Computed gamma correction with gamma = {gamma}")
`,
    parameters: [{ name: "gamma", kind: "slider", default: 1.5, min: 0.2, max: 3.0, step: 0.1, label: "Gamma Value" }],
    expectedOutputs: [{ kind: "plot", name: "Intensity Transformation Profile" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 300,
    matlabNotes: "imadjust() -> img ** gamma",
    enabled: true,
  },
  {
    id: "DIP-02",
    title: "Histogram Equalization and Contrast Enhancement",
    course: "DIP",
    level: "UG",
    objective: "Compute image histograms and apply cumulative distribution function (CDF) equalization to improve contrast.",
    theory: "Histogram equalization flattens the probability density function (PDF) using $s_k = T(r_k) = \\sum_{j=0}^k p_r(r_j)$.",
    starterCode: `# DIP-02: Histogram Equalization
import numpy as np
import vlab

# Synthetic low-contrast image matrix
img = np.clip(np.random.normal(120, 20, (128, 128)), 0, 255).astype(np.uint8)

hist, bins = np.histogram(img.flatten(), 256, [0, 256])
cdf = hist.cumsum()
cdf_normalized = (cdf - cdf.min()) * 255 / (cdf.max() - cdf.min())
img_eq = cdf_normalized[img].astype(np.uint8)

vlab.plot(np.arange(256), hist, label="Original Histogram", title="Image Histogram Distribution")
print(f"Histogram Equalization complete. Original dynamic range: [{img.min()}, {img.max()}] -> [{img_eq.min()}, {img_eq.max()}]")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Image Histogram Distribution" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "histeq(I) -> cdf mapping",
    enabled: true,
  },
  {
    id: "DIP-03",
    title: "Spatial Filtering and Noise Reduction",
    course: "DIP",
    level: "UG",
    objective: "Apply averaging, Gaussian smoothing, median, and Laplacian sharpening spatial convolution filters.",
    theory: "Linear spatial filtering computes output pixel as $g(x,y) = \\sum_{s} \\sum_{t} w(s,t) f(x+s, y+t)$.",
    starterCode: `# DIP-03: Spatial Filtering
import numpy as np
from scipy import signal
import vlab

# 2D Gaussian smoothing kernel (5x5)
ax = np.linspace(-2, 2, 5)
xx, yy = np.meshgrid(ax, ax)
kernel = np.exp(-(xx**2 + yy**2) / (2 * 1.0**2))
kernel = kernel / np.sum(kernel)

vlab.plot(ax, kernel[2, :], label="Gaussian Slice", title="Gaussian Filter Profile")
print(f"Gaussian 5x5 Kernel:\n{np.round(kernel, 4)}")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Gaussian Filter Profile" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 300,
    matlabNotes: "fspecial('gaussian') -> custom meshgrid formulation",
    enabled: true,
  },
  {
    id: "DIP-04",
    title: "2D Discrete Fourier Transform & Frequency Filtering",
    course: "DIP",
    level: "UG",
    objective: "Perform 2D FFT on image arrays and analyze ideal and Butterworth low-pass and high-pass filters.",
    theory: "2D DFT $F(u,v) = \\sum_x \\sum_y f(x,y) e^{-j 2\\pi (ux/M + vy/N)}$ reveals directional spatial frequencies.",
    starterCode: `# DIP-04: 2D DFT & Frequency Filtering
import numpy as np
import vlab

N = 128
img = np.zeros((N, N))
img[48:80, 48:80] = 1.0 # Centered square

F = np.fft.fftshift(np.fft.fft2(img))
mag = np.log1p(np.abs(F))

vlab.plot(np.arange(N), mag[64, :], label="Center Spectrum Slice", title="2D Spectrum Log-Magnitude")
print(f"2D DFT calculated on {N}x{N} matrix")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "2D Spectrum Log-Magnitude" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "fft2(I) -> np.fft.fft2(img)",
    enabled: true,
  },
  {
    id: "DIP-05",
    title: "Edge Detection Operators",
    course: "DIP",
    level: "UG",
    objective: "Implement Sobel, Prewitt, and Laplacian edge detectors and analyze gradient magnitude and direction.",
    theory: "The Sobel gradient magnitude $M(x,y) = \\sqrt{G_x^2 + G_y^2}$ detects abrupt intensity discontinuities.",
    starterCode: `# DIP-05: Sobel Edge Detection
import numpy as np
from scipy import signal
import vlab

img = np.zeros((64, 64))
img[20:44, 20:44] = 255.0

Gx_kernel = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])
Gy_kernel = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]])

Gx = signal.convolve2d(img, Gx_kernel, mode="same")
Gy = signal.convolve2d(img, Gy_kernel, mode="same")
mag = np.sqrt(Gx**2 + Gy**2)

vlab.plot(np.arange(64), mag[32, :], label="Sobel Gradient Slice", title="Edge Detection Profile")
print(f"Detected edge magnitude max: {mag.max():.1f}")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Edge Detection Profile" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "edge(I, 'sobel') -> scipy.signal.convolve2d",
    enabled: true,
  },
  {
    id: "DIP-06",
    title: "Morphological Image Processing",
    course: "DIP",
    level: "UG",
    objective: "Execute fundamental morphological operations: erosion, dilation, opening, and closing with structuring elements.",
    theory: "Erosion $A \\ominus B = \\{z \\mid (B)_z \\subseteq A\\}$ shrinks foreground objects; Dilation expands them.",
    starterCode: `# DIP-06: Morphological Processing
import numpy as np
from scipy import ndimage
import vlab

binary_img = np.zeros((50, 50), dtype=bool)
binary_img[15:35, 15:35] = True
struct_elem = ndimage.generate_binary_structure(2, 1)

eroded = ndimage.binary_erosion(binary_img, structure=struct_elem)
dilated = ndimage.binary_dilation(binary_img, structure=struct_elem)

vlab.plot(np.arange(50), dilated[25, :].astype(float), label="Dilated Boundary", title="Morphological Profile")
print(f"Original pixels: {binary_img.sum()}, Eroded: {eroded.sum()}, Dilated: {dilated.sum()}")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Morphological Profile" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 300,
    matlabNotes: "imerode(I, se) -> scipy.ndimage.binary_erosion",
    enabled: true,
  },
  {
    id: "DIP-07",
    title: "Image Segmentation and Thresholding",
    course: "DIP",
    level: "UG",
    objective: "Segment grayscale images into object and background regions using Otsu global optimal thresholding.",
    theory: "Otsu's method maximizes between-class variance $\\sigma_B^2 = \\omega_0 \\omega_1 (\\mu_0 - \\mu_1)^2$.",
    starterCode: `# DIP-07: Otsu Thresholding
import numpy as np
import vlab

# Bimodal synthetic histogram
np.random.seed(42)
img = np.concatenate([np.random.normal(60, 15, 5000), np.random.normal(180, 20, 5000)])
img = np.clip(img, 0, 255).astype(np.uint8)

hist, bins = np.histogram(img, 256, [0, 256])
hist = hist.astype(float) / hist.sum()

variances = []
for t in range(1, 255):
    w0 = np.sum(hist[:t])
    w1 = np.sum(hist[t:])
    if w0 == 0 or w1 == 0:
        variances.append(0)
        continue
    u0 = np.sum(np.arange(t) * hist[:t]) / w0
    u1 = np.sum(np.arange(t, 256) * hist[t:]) / w1
    variances.append(w0 * w1 * ((u0 - u1) ** 2))

optimal_t = np.argmax(variances) + 1
vlab.plot(np.arange(1, 255), variances, label="Between-Class Variance", title="Otsu Variance Optimization")
print(f"Optimal Otsu Threshold computed: {optimal_t}")
`,
    parameters: [],
    expectedOutputs: [{ kind: "plot", name: "Otsu Variance Optimization" }],
    requiredPackages: ["numpy", "scipy"],
    estimatedRuntimeMs: 350,
    matlabNotes: "graythresh(I) -> Otsu variance maximization",
    enabled: true,
  },
];
