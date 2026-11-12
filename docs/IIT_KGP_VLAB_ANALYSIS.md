# IIT Kharagpur Virtual Labs Analysis

**Reference Portal:** `https://www.vlab.co.in/participating-institute-iit-kharagpur`  
**Featured Experiment Screenshot:** `Electrical Engineering > Analog Signals, Network and Measurement Virtual Laboratory > Experiments > R-L-C Circuit Analysis`

---

## 1. Portal & Participating Institute Overview

The [Virtual Labs IIT Kharagpur Portal](https://www.vlab.co.in/participating-institute-iit-kharagpur) is part of the Ministry of Education's NMEICT initiative. IIT Kharagpur develops and hosts multiple Electrical & Electronics virtual laboratories, most notably:

1. **Analog Signals, Network and Measurement Virtual Laboratory** (`asnm-iitkgp.vlabs.ac.in`)
   - **Basic Electrical Technology Lab:** Network theorems (Thevenin, Norton, Superposition, Millman, Tellegen, Compensation), **R-L-C Circuit Analysis**, Three-Phase Power Measurement, Single-Phase Transformer.
   - **Signals and Networks Lab:** Signal properties, transient response, passive filters, two-port networks.
   - **Measurement Lab:** AC/DC bridges (Carey Foster, Hay's, Kelvin Double, Maxwell, Wien, De Sauty, Owen, Schering, Anderson, Megohm) and Q-Meter.
2. **Basic Electronics Virtual Laboratory** (`be-iitkgp.vlabs.ac.in`)
   - **Ohm's Law** (single resistor, series & parallel combinations, non-ohmic behavior), Diode I-V, Rectifiers, Zener Regulator, BJT, Op-Amp.

---

## 2. Pedagogical Structure of Each Experiment

Every experiment page on the IIT Kharagpur Virtual Lab portal uses a consistent **9-section sidebar navigation** (confirmed directly from the uploaded screenshot):

| Section        | Purpose in IIT Kharagpur Virtual Lab                                       | Implementation in This Application                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aim**        | Clear statement of experimental objective                                  | Dedicated **Aim** tab with learning outcomes & apparatus overview image                                                                                                             |
| **Theory**     | Mathematical equations, circuit laws, phasor/characteristic concepts       | Dedicated **Theory** tab with rendered LaTeX equations, clear explanation, and schematic imagery                                                                                    |
| **Pretest**    | Baseline conceptual MCQs before running simulation                         | Interactive **Pretest** quiz with instant grading & conceptual explanations                                                                                                         |
| **Procedure**  | Step-by-step wiring, meter setup, parameter sweep, and observation logging | Interactive **Procedure** checklist synced to the simulator steps                                                                                                                   |
| **Simulation** | Visual HTML5/JS circuit bench — no programming code exposed to students    | **Circuit Maker & Simulator** workspace (drag/click terminal wiring, user-defined R/L/C/V/f values, Check Connections, live meters, Observation Table, Waveforms & Phasor Diagrams) |
| **Posttest**   | Concluding MCQs verifying experimental takeaways                           | Interactive **Posttest** quiz with instant feedback                                                                                                                                 |
| **References** | Standard textbooks and NPTEL/VLab references                               | Dedicated **References** tab citing IIT KGP VLab & standard texts                                                                                                                   |

---

## 3. Deep Analysis of the Primary Experiments

### Experiment 1: R-L-C Circuit Analysis (IIT KGP ASNM Lab)

- **Aim:** Study the behavior of a series $R$-$L$-$C$ circuit connected to an AC supply, measure individual component voltages ($V_R, V_L, V_C$), current ($I$), active power ($W$), phase angle ($\theta$), and power factor ($\cos\theta$), and verify the phasor relationship $\vec{V}_S = \vec{V}_R + \vec{V}_L + \vec{V}_C$.
- **Circuit Apparatus:**
  - Single-phase AC Power Supply + Auto-Transformer (variable voltage $V_S$ and frequency $f$)
  - DPST Main Switch $K$
  - Series Rheostat / Resistor $R$ ($\Omega$)
  - Inductor Coil $L$ ($\text{mH}$, optionally with coil resistance $r_L$)
  - Capacitor Bank $C$ ($\mu\text{F}$)
  - AC Ammeter (in series), Voltmeters across $V_S, V_R, V_L, V_C$, and Wattmeter ($W$)
- **Core Governing Equations:**
  - Angular frequency: $\omega = 2\pi f$
  - Inductive reactance: $X_L = \omega L = 2\pi f L$
  - Capacitive reactance: $X_C = \frac{1}{\omega C} = \frac{1}{2\pi f C}$
  - Total impedance: $Z = (R + r_L) + j(X_L - X_C)$, magnitude $|Z| = \sqrt{(R + r_L)^2 + (X_L - X_C)^2}$
  - RMS Current: $I = \frac{V_S}{|Z|}$
  - Component voltages: $V_R = I R$, $V_L = I \sqrt{r_L^2 + X_L^2}$, $V_C = I X_C$
  - Phase angle: $\theta = \tan^{-1}\left(\frac{X_L - X_C}{R + r_L}\right)$
  - Power factor: $\text{PF} = \cos\theta = \frac{R + r_L}{|Z|}$
  - Active power: $P = V_S I \cos\theta = I^2 (R + r_L)$
  - Resonant frequency: $f_0 = \frac{1}{2\pi\sqrt{LC}}$, Quality factor $Q = \frac{1}{R + r_L}\sqrt{\frac{L}{C}}$
- **Operating Regimes:**
  - **Inductive ($X_L > X_C$, $f > f_0$):** $\theta > 0$, current lags source voltage.
  - **Capacitive ($X_L < X_C$, $f < f_0$):** $\theta < 0$, current leads source voltage.
  - **Resonance ($X_L = X_C$, $f = f_0$):** $\theta = 0^\circ$, $|Z| = R + r_L$ (minimum), current is maximum, $\text{PF} = 1$.

### Experiment 2: Ohm's Law & V-I Characteristics

- **Aim:** Verify Ohm's Law ($V = I \cdot R$) experimentally by constructing a DC circuit with user-defined voltage and resistance, recording $V$ and $I$ into an observation table, plotting the $V$-$I$ curve, and comparing single, series, parallel, and non-ohmic (diode) circuits.
- **Circuit Apparatus:**
  - Variable DC Voltage Source ($V_{DC}$)
  - Switch $S$
  - Series Ammeter (measures $I$ in A / mA)
  - Parallel Voltmeter across load (measures $V$)
  - Configurable Resistor(s) $R_1$, $R_2$ (or PN Diode in Non-Ohmic mode)
- **Clear Conceptual Explanation:**
  - Ohm's Law states that at constant temperature and physical conditions, current $I$ through a metallic conductor is directly proportional to potential difference $V$ across its ends: $I = \frac{V}{R}$ or $V = I \times R$.
  - **Series Combination:** Same current flows through both resistors; total resistance adds up: $R_{eq} = R_1 + R_2$.
  - **Parallel Combination:** Same voltage appears across both resistors; total conductance adds up: $R_{eq} = \frac{R_1 R_2}{R_1 + R_2}$.
  - **Non-Ohmic Device (Diode):** Current rises exponentially ($I = I_s (e^{V/(\eta V_T)} - 1)$), so $V/I$ is not constant and Ohm's linear law does not hold.

### Experiments 3 & 4 (Completing the 4-Experiment Suite)

3. **Verification of Thevenin's Theorem (`NT-02`):** Replace a linear network ($V_S, R_1, R_2, R_3$) with $V_{th}$ in series with $R_{th}$ across load $R_L$ and verify identical $I_L$ and $V_L$.
4. **Verification of Superposition Theorem (`NT-03`):** Analyze a dual-source ($V_1, V_2$) network with each source active individually and verify $I_{\text{both}} = I^{(V_1)} + I^{(V_2)}$.

---

## 4. Architectural Transition from Previous Code-IDE App

- **Previous State:** 51 code-based Python/Pyodide experiments (`SS`, `NT`, `DSP`, `DIP`, `BEE`, `ACS`, `SSP`) centered around a Monaco Python editor. All 51 definitions have been preserved intact under `archive/legacy-curriculum/`.
- **New Simulation-First Design:**
  - Python code editor is **hidden** from the student workspace.
  - Replaced by an interactive **Circuit Maker & Simulator** canvas where users wire terminals, check connections, set every electrical parameter directly, simulate instantaneously in-browser, log observation tables, and view synchronized phasor/waveform/V-I plots.
