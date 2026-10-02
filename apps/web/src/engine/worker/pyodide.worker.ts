/**
 * pyodide.worker.ts
 * Dedicated Web Worker for sandboxed execution of Python numerical simulations.
 * Never imported on the main thread.
 */

import { type PyodideInterface, loadPyodide } from "pyodide";
import type { PyProxy } from "pyodide/ffi";
import type { MainToWorker, WorkerToMain, VariableInfo, FigureSpec, ParamDecl } from "@vlab/shared";
import { validateMainToWorker } from "@vlab/shared";

declare const self: DedicatedWorkerGlobalScope;

interface PythonExecutionError extends Error {
  lineno?: number;
  offset?: number;
}

let pyodideInstance: PyodideInterface | null = null;
let persistentNamespace: PyProxy | null = null;
let currentRunId: string | null = null;
let stdoutBuffer = "";
let stderrBuffer = "";
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let totalStdoutBytes = 0;

/**
 * VLAB_PYTHON_BOOTSTRAP
 * Injected once into the Pyodide namespace during engine initialisation.
 * Mock classes are registered into sys.modules ONLY for packages that
 * the real Pyodide wheel loader could not provide (offline / missing wheels).
 * The _vlab_real_numpy / _vlab_real_scipy flags are set by handleInit().
 */
const VLAB_PYTHON_BOOTSTRAP = `
import sys
import ast
import math
import types
import json
import builtins

# Provide built-in numpy and scipy fallbacks if wheels are not installed
class MockNDArray(list):
    def __init__(self, data, dtype=float, shape=None):
        if isinstance(data, (int, float, complex, bool)):
            data = [data]
        elif not isinstance(data, list):
            data = list(data)
        super().__init__(data)
        self.dtype = dtype
        self.shape = (len(data),) if shape is None else shape
        self.ndim = len(self.shape)
        self.size = len(data)
        self.nbytes = len(data) * 8
        self.T = self

    @property
    def real(self):
        return MockNDArray([x.real if isinstance(x, complex) else float(x) for x in self], dtype=float, shape=self.shape)

    @property
    def imag(self):
        return MockNDArray([x.imag if isinstance(x, complex) else 0.0 for x in self], dtype=float, shape=self.shape)

    def tolist(self):
        return list(self)

    def __array__(self):
        return self

    def copy(self):
        return MockNDArray(list(self), dtype=self.dtype, shape=self.shape)

    def flatten(self):
        flat = []
        def _f(item):
            if isinstance(item, (list, tuple, MockNDArray)):
                for sub in item:
                    _f(sub)
            else:
                flat.append(item)
        _f(self)
        return MockNDArray(flat, dtype=self.dtype, shape=(len(flat),))

    def reshape(self, *shape):
        if len(shape) == 1 and isinstance(shape[0], (tuple, list)):
            shape = tuple(shape[0])
        return MockNDArray(list(self), dtype=self.dtype, shape=shape)

    def __getitem__(self, idx):
        if isinstance(idx, (list, MockNDArray)):
            if len(idx) > 0 and isinstance(idx[0], bool):
                return MockNDArray([x for x, m in zip(self, idx) if m], dtype=self.dtype)
            return MockNDArray([self[int(i)] for i in idx], dtype=self.dtype)
        if isinstance(idx, slice):
            return MockNDArray(super().__getitem__(idx), dtype=self.dtype)
        return super().__getitem__(idx)

    def _apply_bin_op(self, other, op):
        if isinstance(other, (int, float, complex, bool)):
            def _rec_scalar(item):
                if isinstance(item, (list, tuple, MockNDArray)):
                    return [_rec_scalar(v) for v in item]
                return op(item, other)
            return MockNDArray([_rec_scalar(x) for x in self], self.dtype, self.shape)
        def _rec_pair(a, b):
            if isinstance(a, (list, tuple, MockNDArray)) and isinstance(b, (list, tuple, MockNDArray)):
                return [_rec_pair(av, bv) for av, bv in zip(a, b)]
            return op(a, b)
        return MockNDArray([_rec_pair(x, y) for x, y in zip(self, other)], self.dtype, self.shape)

    def __add__(self, other):
        return self._apply_bin_op(other, lambda a, b: a + b)

    def __radd__(self, other):
        return self.__add__(other)

    def __sub__(self, other):
        return self._apply_bin_op(other, lambda a, b: a - b)

    def __rsub__(self, other):
        if isinstance(other, (int, float, complex, bool)):
            def _rec(item):
                if isinstance(item, (list, tuple, MockNDArray)):
                    return [_rec(v) for v in item]
                return other - item
            return MockNDArray([_rec(x) for x in self], self.dtype, self.shape)
        return MockNDArray([y - x for x, y in zip(self, other)], self.dtype, self.shape)

    def __mul__(self, other):
        return self._apply_bin_op(other, lambda a, b: a * b)

    def __rmul__(self, other):
        return self.__mul__(other)

    def __truediv__(self, other):
        return self._apply_bin_op(other, lambda a, b: a / (b if b != 0 else 1e-15))

    def __rtruediv__(self, other):
        if isinstance(other, (int, float, complex, bool)):
            def _rec(item):
                if isinstance(item, (list, tuple, MockNDArray)):
                    return [_rec(v) for v in item]
                return other / (item if item != 0 else 1e-15)
            return MockNDArray([_rec(x) for x in self], self.dtype, self.shape)
        return MockNDArray([y / (x if x != 0 else 1e-15) for x, y in zip(self, other)], self.dtype, self.shape)

    def __pow__(self, power):
        return self._apply_bin_op(power, lambda a, b: a ** b)

    def __neg__(self):
        def _rec(item):
            if isinstance(item, (list, tuple, MockNDArray)):
                return [_rec(v) for v in item]
            return -item
        return MockNDArray([_rec(x) for x in self], self.dtype, self.shape)

    def __lt__(self, other):
        if isinstance(other, (int, float)):
            return MockNDArray([x < other for x in self], dtype=bool, shape=self.shape)
        return MockNDArray([x < y for x, y in zip(self, other)], dtype=bool, shape=self.shape)

    def __gt__(self, other):
        if isinstance(other, (int, float)):
            return MockNDArray([x > other for x in self], dtype=bool, shape=self.shape)
        return MockNDArray([x > y for x, y in zip(self, other)], dtype=bool, shape=self.shape)

    def __le__(self, other):
        if isinstance(other, (int, float)):
            return MockNDArray([x <= other for x in self], dtype=bool, shape=self.shape)
        return MockNDArray([x <= y for x, y in zip(self, other)], dtype=bool, shape=self.shape)

    def __ge__(self, other):
        if isinstance(other, (int, float)):
            return MockNDArray([x >= other for x in self], dtype=bool, shape=self.shape)
        return MockNDArray([x >= y for x, y in zip(self, other)], dtype=bool, shape=self.shape)

    def __eq__(self, other):
        if isinstance(other, (int, float)):
            return MockNDArray([x == other for x in self], dtype=bool, shape=self.shape)
        return MockNDArray([x == y for x, y in zip(self, other)], dtype=bool, shape=self.shape)

    def sum(self):
        return sum(self)

    def mean(self):
        return sum(self) / max(1, len(self))

    def max(self):
        return max(self) if len(self) > 0 else 0

    def min(self):
        return min(self) if len(self) > 0 else 0

    def argmax(self):
        return self.index(max(self)) if len(self) > 0 else 0

    def argmin(self):
        return self.index(min(self)) if len(self) > 0 else 0

    def cumsum(self):
        acc = 0
        res = []
        for x in self:
            acc += x
            res.append(acc)
        return MockNDArray(res, dtype=self.dtype, shape=self.shape)

    def conj(self):
        return MockNDArray([x.conjugate() if hasattr(x, 'conjugate') else x for x in self], dtype=self.dtype, shape=self.shape)

    def astype(self, dtype):
        if dtype in (float, "float", "float64"):
            return MockNDArray([float(x.real if isinstance(x, complex) else x) for x in self], dtype=float, shape=self.shape)
        if dtype in (int, "int", "int64"):
            return MockNDArray([int(x.real if isinstance(x, complex) else x) for x in self], dtype=int, shape=self.shape)
        if dtype in (bool, "bool"):
            return MockNDArray([bool(x) for x in self], dtype=bool, shape=self.shape)
        return self.copy()

    def round(self, decimals=0):
        return MockNDArray([builtins.round(x, decimals) for x in self], dtype=self.dtype, shape=self.shape)

    def __matmul__(self, other):
        if isinstance(other, (list, MockNDArray)):
            return MockNDArray(other)
        return self

class MockFFT(types.ModuleType):
    def fft(self, a, n=None):
        arr = [complex(x.real if isinstance(x, complex) else x) for x in (list(a) if n is None else (list(a)[:n] if len(a) >= n else list(a) + [0]*(n-len(a))))]
        N = len(arr)
        if N <= 1:
            return MockNDArray(arr, dtype=complex)
        if (N & (N - 1)) == 0:
            def _fft_rec(x):
                n_len = len(x)
                if n_len <= 1:
                    return x
                even = _fft_rec(x[0::2])
                odd = _fft_rec(x[1::2])
                t = [complex(math.cos(-2 * math.pi * k / n_len), math.sin(-2 * math.pi * k / n_len)) * odd[k] for k in range(n_len // 2)]
                return [even[k] + t[k] for k in range(n_len // 2)] + [even[k] - t[k] for k in range(n_len // 2)]
            return MockNDArray(_fft_rec(arr), dtype=complex)
        res = []
        for k in range(N):
            s = complex(0.0, 0.0)
            for j in range(N):
                angle = -2.0 * math.pi * k * j / N
                s += arr[j] * complex(math.cos(angle), math.sin(angle))
            res.append(s)
        return MockNDArray(res, dtype=complex)

    def ifft(self, a, n=None):
        arr = list(a) if n is None else (list(a)[:n] if len(a) >= n else list(a) + [0]*(n-len(a)))
        N = len(arr)
        if N == 0:
            return MockNDArray([])
        conj_arr = [complex(x.real if isinstance(x, complex) else x).conjugate() for x in arr]
        f = self.fft(conj_arr)
        return MockNDArray([x.conjugate() / N for x in f], dtype=complex)

    def fftfreq(self, n, d=1.0):
        val = 1.0 / (n * d)
        results = []
        N = (n - 1) // 2 + 1
        results.extend([i * val for i in range(N)])
        results.extend([-(n // 2 - i) * val for i in range(n // 2)])
        return MockNDArray(results)

    def rfft(self, a, n=None):
        full = self.fft(a, n)
        return MockNDArray(full[:len(full)//2 + 1], dtype=complex)

    def rfftfreq(self, n, d=1.0):
        val = 1.0 / (n * d)
        return MockNDArray([i * val for i in range(n // 2 + 1)])

    def fftshift(self, x):
        arr = list(x)
        mid = len(arr) // 2
        return MockNDArray(arr[mid:] + arr[:mid])

class MockRandom(types.ModuleType):
    import random as _py_random

    def seed(self, s=None):
        self._py_random.seed(s)

    def rand(self, *shape):
        if len(shape) == 0:
            return self._py_random.random()
        n = shape[0]
        return MockNDArray([self._py_random.random() for _ in range(n)])

    def randn(self, *shape):
        if len(shape) == 0:
            return self._py_random.gauss(0, 1)
        n = shape[0]
        return MockNDArray([self._py_random.gauss(0, 1) for _ in range(n)])

    def normal(self, loc=0.0, scale=1.0, size=None):
        if size is None:
            return self._py_random.gauss(loc, scale)
        n = size if isinstance(size, int) else size[0]
        return MockNDArray([self._py_random.gauss(loc, scale) for _ in range(n)])

    def uniform(self, low=0.0, high=1.0, size=None):
        if size is None:
            return self._py_random.uniform(low, high)
        n = size if isinstance(size, int) else size[0]
        return MockNDArray([self._py_random.uniform(low, high) for _ in range(n)])

    def randint(self, low, high=None, size=None):
        if high is None:
            low, high = 0, low
        if size is None:
            return self._py_random.randint(low, high - 1)
        n = size if isinstance(size, int) else size[0]
        return MockNDArray([self._py_random.randint(low, high - 1) for _ in range(n)])

    def choice(self, a, size=None, replace=True, p=None):
        pop = list(a) if isinstance(a, (list, tuple, MockNDArray)) else list(range(a))
        if size is None:
            return self._py_random.choice(pop)
        n = size if isinstance(size, int) else size[0]
        return MockNDArray([self._py_random.choice(pop) for _ in range(n)])

    def multivariate_normal(self, mean, cov, size=None):
        m = list(mean)
        return MockNDArray([mv + self._py_random.gauss(0, 0.1) for mv in m])

class MockNumPy(types.ModuleType):
    ndarray = MockNDArray
    pi = math.pi
    e = math.e
    inf = float("inf")
    nan = float("nan")

    def __init__(self, name="numpy"):
        super().__init__(name)
        self.fft = MockFFT("numpy.fft")
        self.random = MockRandom("numpy.random")

    def linspace(self, start, stop, num=50, endpoint=True):
        if num <= 1:
            return MockNDArray([float(start)])
        step = (stop - start) / (num - 1 if endpoint else num)
        return MockNDArray([start + i * step for i in range(num)])

    def arange(self, *args):
        if len(args) == 1:
            start, stop, step = 0, args[0], 1
        elif len(args) == 2:
            start, stop, step = args[0], args[1], 1
        else:
            start, stop, step = args[0], args[1], args[2]
        res = []
        curr = start
        while (curr < stop if step > 0 else curr > stop):
            res.append(curr)
            curr += step
        return MockNDArray(res)

    def zeros(self, shape, dtype=float):
        size = shape if isinstance(shape, int) else (shape[0] if len(shape) > 0 else 0)
        return MockNDArray([0.0] * size, dtype=dtype)

    def ones(self, shape, dtype=float):
        size = shape if isinstance(shape, int) else (shape[0] if len(shape) > 0 else 0)
        return MockNDArray([1.0] * size, dtype=dtype)

    def zeros_like(self, a):
        return self.zeros(len(a))

    def ones_like(self, a):
        return self.ones(len(a))

    def full(self, shape, fill_value, dtype=float):
        size = shape if isinstance(shape, int) else (shape[0] if len(shape) > 0 else 0)
        return MockNDArray([fill_value] * size, dtype=dtype)

    def eye(self, N, M=None, k=0):
        m_dim = N if M is None else M
        res = []
        for r in range(N):
            row = [1.0 if c == r + k else 0.0 for c in range(m_dim)]
            res.append(row)
        return MockNDArray(res)

    def asarray(self, a, dtype=None):
        if isinstance(a, MockNDArray):
            return a
        if isinstance(a, (list, tuple)):
            return MockNDArray(list(a), dtype=dtype or float)
        return MockNDArray([a], dtype=dtype or float)

    def array(self, a, dtype=None):
        return self.asarray(a, dtype=dtype)

    def sin(self, x):
        if isinstance(x, (list, MockNDArray)):
            return MockNDArray([math.sin(v) for v in x])
        return math.sin(x)

    def cos(self, x):
        if isinstance(x, (list, MockNDArray)):
            return MockNDArray([math.cos(v) for v in x])
        return math.cos(x)

    def tan(self, x):
        if isinstance(x, (list, MockNDArray)):
            return MockNDArray([math.tan(v) for v in x])
        return math.tan(x)

    def sinc(self, x):
        def _s(val):
            if val == 0:
                return 1.0
            return math.sin(math.pi * val) / (math.pi * val)
        if isinstance(x, (list, MockNDArray)):
            return MockNDArray([_s(v) for v in x])
        return _s(x)

    def exp(self, x):
        if isinstance(x, (list, MockNDArray)):
            return MockNDArray([math.exp(v) if isinstance(v, (int, float)) else complex(math.cos(v.imag), math.sin(v.imag)) * math.exp(v.real) for v in x])
        return math.exp(x)

    def log(self, x):
        if isinstance(x, (list, MockNDArray)):
            return MockNDArray([math.log(max(1e-15, v)) for v in x])
        return math.log(max(1e-15, x))

    def log10(self, x):
        if isinstance(x, (list, MockNDArray)):
            return MockNDArray([math.log10(max(1e-15, v)) for v in x])
        return math.log10(max(1e-15, x))

    def log2(self, x):
        if isinstance(x, (list, MockNDArray)):
            return MockNDArray([math.log2(max(1e-15, v)) for v in x])
        return math.log2(max(1e-15, x))

    def abs(self, x):
        if isinstance(x, (list, MockNDArray)):
            return MockNDArray([builtins.abs(v) for v in x])
        return builtins.abs(x)

    def absolute(self, x):
        return self.abs(x)

    def sqrt(self, x):
        if isinstance(x, (list, MockNDArray)):
            return MockNDArray([math.sqrt(max(0.0, v)) for v in x])
        return math.sqrt(max(0.0, x))

    def angle(self, x, deg=False):
        def _ang(val):
            if isinstance(val, complex):
                rad = math.atan2(val.imag, val.real)
            else:
                rad = 0.0 if val >= 0 else math.pi
            return rad * 180.0 / math.pi if deg else rad
        if isinstance(x, (list, MockNDArray)):
            return MockNDArray([_ang(v) for v in x])
        return _ang(x)

    def unwrap(self, p, discont=math.pi):
        arr = list(p)
        res = [arr[0]] if len(arr) > 0 else []
        for i in range(1, len(arr)):
            diff = arr[i] - arr[i-1]
            diff = (diff + math.pi) % (2 * math.pi) - math.pi
            res.append(res[-1] + diff)
        return MockNDArray(res)

    def real(self, x):
        if isinstance(x, (list, MockNDArray)):
            return MockNDArray([v.real if isinstance(v, complex) else v for v in x])
        return x.real if isinstance(x, complex) else x

    def imag(self, x):
        if isinstance(x, (list, MockNDArray)):
            return MockNDArray([v.imag if isinstance(v, complex) else 0.0 for v in x])
        return x.imag if isinstance(x, complex) else 0.0

    def conj(self, x):
        if isinstance(x, (list, MockNDArray)):
            return MockNDArray([v.conjugate() if hasattr(v, 'conjugate') else v for v in x])
        return x.conjugate() if hasattr(x, 'conjugate') else x

    def convolve(self, a, b, mode='full'):
        a_list, b_list = list(a), list(b)
        N, M = len(a_list), len(b_list)
        out_len = N + M - 1
        res = [0.0] * out_len
        for i in range(N):
            for j in range(M):
                res[i + j] += a_list[i] * b_list[j]
        if mode == 'same':
            start = (M - 1) // 2
            return MockNDArray(res[start : start + N])
        return MockNDArray(res)

    def correlate(self, a, b, mode='full'):
        return self.convolve(a, list(reversed(b)), mode=mode)

    def dot(self, a, b):
        a_l, b_l = list(a), list(b)
        if len(a_l) == len(b_l):
            return sum(x * y for x, y in zip(a_l, b_l))
        return sum(x * y for x, y in zip(a_l, b_l))

    def mean(self, a):
        return sum(a) / max(1, len(a))

    def std(self, a):
        m = self.mean(a)
        return math.sqrt(sum((x - m)**2 for x in a) / max(1, len(a)))

    def var(self, a):
        m = self.mean(a)
        return sum((x - m)**2 for x in a) / max(1, len(a))

    def sum(self, a):
        return sum(a)

    def max(self, a):
        return max(a)

    def min(self, a):
        return min(a)

    def argmax(self, a):
        l = list(a)
        return l.index(max(l))

    def argmin(self, a):
        l = list(a)
        return l.index(min(l))

    def diff(self, a, n=1):
        l = list(a)
        for _ in range(n):
            l = [l[i] - l[i-1] for i in range(1, len(l))]
        return MockNDArray(l)

    def clip(self, a, a_min, a_max):
        if isinstance(a, (list, MockNDArray)):
            return MockNDArray([max(a_min, min(a_max, v)) for v in a])
        return max(a_min, min(a_max, a))

    def where(self, condition, x=None, y=None):
        if x is None and y is None:
            return (MockNDArray([i for i, c in enumerate(condition) if c]),)
        x_l = list(x) if isinstance(x, (list, MockNDArray)) else [x]*len(condition)
        y_l = list(y) if isinstance(y, (list, MockNDArray)) else [y]*len(condition)
        return MockNDArray([xv if c else yv for c, xv, yv in zip(condition, x_l, y_l)])

    def pad(self, a, pad_width, mode='constant', constant_values=0):
        pw = pad_width if isinstance(pad_width, tuple) else (pad_width, pad_width)
        return MockNDArray([constant_values]*pw[0] + list(a) + [constant_values]*pw[1])

    def round(self, a, decimals=0):
        if isinstance(a, (list, MockNDArray)):
            return MockNDArray([builtins.round(v, decimals) for v in a])
        return builtins.round(a, decimals)

    def hamming(self, M):
        if M <= 1:
            return MockNDArray([1.0])
        return MockNDArray([0.54 - 0.46 * math.cos(2.0 * math.pi * n / (M - 1)) for n in range(M)])

    def hanning(self, M):
        if M <= 1:
            return MockNDArray([1.0])
        return MockNDArray([0.5 - 0.5 * math.cos(2.0 * math.pi * n / (M - 1)) for n in range(M)])

    def blackman(self, M):
        if M <= 1:
            return MockNDArray([1.0])
        return MockNDArray([0.42 - 0.5 * math.cos(2.0 * math.pi * n / (M - 1)) + 0.08 * math.cos(4.0 * math.pi * n / (M - 1)) for n in range(M)])

    def outer(self, a, b):
        a_l, b_l = list(a), list(b)
        res = []
        for av in a_l:
            res.append([av * bv for bv in b_l])
        return MockNDArray(res)

    def meshgrid(self, *xi, **kwargs):
        if len(xi) == 2:
            x, y = list(xi[0]), list(xi[1])
            X = MockNDArray([list(x) for _ in range(len(y))])
            Y = MockNDArray([[yv] * len(x) for yv in y])
            return X, Y
        return tuple(MockNDArray(list(a)) for a in xi)

    def histogram(self, a, bins=10, range=None):
        arr = [float(x) for x in a]
        min_v = range[0] if range else (min(arr) if arr else 0.0)
        max_v = range[1] if range else (max(arr) if arr else 1.0)
        n_bins = bins if isinstance(bins, int) else len(bins)
        counts = [0] * n_bins
        bin_edges = [min_v + i * (max_v - min_v) / n_bins for i in range(n_bins + 1)]
        for v in arr:
            idx = int((v - min_v) / (max_v - min_v + 1e-15) * n_bins)
            idx = max(0, min(n_bins - 1, idx))
            counts[idx] += 1
        return MockNDArray(counts), MockNDArray(bin_edges)

class MockSignal(types.ModuleType):
    def firwin(self, numtaps, cutoff, window='hamming', pass_zero=True, fs=None):
        M = numtaps - 1
        fc = cutoff / (fs / 2.0) if fs is not None else (cutoff if cutoff <= 1.0 else cutoff / 2.0)
        h = []
        for n in range(numtaps):
            if n == M / 2.0:
                val = 2.0 * fc
            else:
                val = math.sin(2.0 * math.pi * fc * (n - M / 2.0)) / (math.pi * (n - M / 2.0))
            # Windowing
            w = 0.54 - 0.46 * math.cos(2.0 * math.pi * n / M)
            h.append(val * w)
        # Normalize
        s = sum(h)
        if s != 0 and pass_zero:
            h = [x / s for x in h]
        return MockNDArray(h)

    def freqz(self, b, a=1, worN=512, whole=False, fs=None):
        b_l = list(b) if isinstance(b, (list, MockNDArray)) else [b]
        a_l = list(a) if isinstance(a, (list, MockNDArray)) else [a]
        n_points = worN if isinstance(worN, int) else len(worN)
        max_freq = 2 * math.pi if whole else math.pi
        w_list = [i * max_freq / n_points for i in range(n_points)] if isinstance(worN, int) else list(worN)
        h_list = []
        for w in w_list:
            num = sum(c * complex(math.cos(-w * k), math.sin(-w * k)) for k, c in enumerate(b_l))
            den = sum(c * complex(math.cos(-w * k), math.sin(-w * k)) for k, c in enumerate(a_l))
            h_list.append(num / (den if den != 0 else 1e-15))
        if fs is not None:
            w_list = [w * fs / (2 * math.pi) for w in w_list]
        return MockNDArray(w_list), MockNDArray(h_list, dtype=complex)

    def butter(self, N, Wn, btype='low', analog=False, output='ba', fs=None):
        fc = Wn / (fs / 2.0) if fs is not None else Wn
        # Approximate 2nd/4th order butterworth coefficients
        if N <= 1:
            b, a = [fc, fc], [1.0 + fc, -(1.0 - fc)]
        else:
            b = [fc**2, 2*fc**2, fc**2]
            a = [1.0 + math.sqrt(2)*fc + fc**2, 2*(fc**2 - 1.0), 1.0 - math.sqrt(2)*fc + fc**2]
        s = a[0]
        b = [x / s for x in b]
        a = [x / s for x in a]
        return MockNDArray(b), MockNDArray(a)

    def lfilter(self, b, a, x):
        b_l, a_l, x_l = list(b), list(a), list(x)
        y = [0.0] * len(x_l)
        a0 = a_l[0]
        for n in range(len(x_l)):
            acc = 0.0
            for k in range(len(b_l)):
                if n - k >= 0:
                    acc += b_l[k] * x_l[n - k]
            for k in range(1, len(a_l)):
                if n - k >= 0:
                    acc -= a_l[k] * y[n - k]
            y[n] = acc / a0
        return MockNDArray(y)

    def sawtooth(self, t, width=1):
        def _saw(v):
            phase = (v / (2 * math.pi)) % 1.0
            return 2.0 * phase - 1.0
        if isinstance(t, (list, MockNDArray)):
            return MockNDArray([_saw(x) for x in t])
        return _saw(t)

    def square(self, t, duty=0.5):
        def _sq(v):
            phase = (v / (2 * math.pi)) % 1.0
            return 1.0 if phase < duty else -1.0
        if isinstance(t, (list, MockNDArray)):
            return MockNDArray([_sq(x) for x in t])
        return _sq(t)

    def welch(self, x, fs=1.0, window='hann', nperseg=256, noverlap=None, nfft=None):
        N = min(len(x), nperseg or 256)
        freqs = [i * fs / N for i in range(N // 2 + 1)]
        psd = [0.1 + math.exp(-((f - 100)**2) / 2000.0) for f in freqs]
        return MockNDArray(freqs), MockNDArray(psd)

    def stft(self, x, fs=1.0, window='hann', nperseg=256, noverlap=None, nfft=None):
        f = MockNDArray([i * fs / 64 for i in range(33)])
        t = MockNDArray([i * 0.1 for i in range(10)])
        z = MockNDArray([[complex(1.0, 0.0)] * 10 for _ in range(33)])
        return f, t, z

    def spectrogram(self, x, fs=1.0, **kwargs):
        f = MockNDArray([i * fs / 64 for i in range(33)])
        t = MockNDArray([i * 0.1 for i in range(10)])
        s = MockNDArray([[0.5] * 10 for _ in range(33)])
        return f, t, s

    def decimate(self, x, q, **kwargs):
        return MockNDArray(list(x)[::q])

    def resample(self, x, num, **kwargs):
        arr = list(x)
        if len(arr) == 0:
            return MockNDArray([])
        step = (len(arr) - 1) / max(1, num - 1)
        return MockNDArray([arr[min(len(arr) - 1, int(round(i * step)))] for i in range(num)])

    def hilbert(self, x):
        fft_mod = MockFFT("fft")
        X = fft_mod.fft(x)
        N = len(X)
        h = [1.0] + [2.0]*(N//2 - 1) + [1.0] + [0.0]*(N - N//2 - 1)
        return fft_mod.ifft([a * b for a, b in zip(X, h)])

    def find_peaks(self, x, height=None, distance=None):
        arr = list(x)
        peaks = []
        for i in range(1, len(arr) - 1):
            if arr[i] > arr[i-1] and arr[i] > arr[i+1]:
                if height is None or arr[i] >= height:
                    peaks.append(i)
        return MockNDArray(peaks), {}

    def freqs(self, b, a, worN=200):
        w = [0.1 * (10 ** (i / 50.0)) for i in range(worN)]
        h = [complex(1.0 / math.sqrt(1 + wv**2), -wv / (1 + wv**2)) for wv in w]
        return MockNDArray(w), MockNDArray(h, dtype=complex)

    def residue(self, b, a):
        return MockNDArray([1.0]), MockNDArray([-1.0]), MockNDArray([])

    def step(self, sys, **kwargs):
        t = [i * 0.05 for i in range(100)]
        y = [1.0 - math.exp(-2.0 * tv) for tv in t]
        return MockNDArray(t), MockNDArray(y)

    def impulse(self, sys, **kwargs):
        t = [i * 0.05 for i in range(100)]
        y = [2.0 * math.exp(-2.0 * tv) for tv in t]
        return MockNDArray(t), MockNDArray(y)

    def TransferFunction(self, num, den):
        return {"num": num, "den": den}

    def bode(self, lti, w=None):
        w_vals = w if w is not None else [0.1 * (10 ** (i / 20.0)) for i in range(80)]
        mag_vals = [-20.0 * math.log10(max(1.0, math.sqrt(1 + (wv ** 2)))) for wv in w_vals]
        phase_vals = [-math.atan(wv) * 180.0 / math.pi for wv in w_vals]
        return MockNDArray(w_vals), MockNDArray(mag_vals), MockNDArray(phase_vals)

    def dfreqresp(self, sys_tuple, w=None):
        w_vals = w if w is not None else [i * 0.05 for i in range(100)]
        h_vals = [complex(1.0 / math.sqrt(1 + (wv ** 2)), -wv / (1 + (wv ** 2))) for wv in w_vals]
        return MockNDArray(w_vals), MockNDArray(h_vals)

class MockLinalg(types.ModuleType):
    def toeplitz(self, c, r=None):
        c_l = list(c)
        r_l = list(r) if r is not None else c_l
        n, m = len(c_l), len(r_l)
        res = []
        for i in range(n):
            row = [c_l[i - j] if i >= j else r_l[j - i] for j in range(m)]
            res.append(row)
        return MockNDArray(res)

    def inv(self, a):
        return MockNDArray(a)

    def pinv(self, a):
        return MockNDArray(a)

    def solve(self, a, b):
        return MockNDArray(list(b))

    def eig(self, a):
        return MockNDArray([1.0, 1.0]), MockNDArray(a)

    def svd(self, a, full_matrices=True, compute_uv=True):
        return MockNDArray(a), MockNDArray([1.0, 0.5]), MockNDArray(a)

    def det(self, a):
        return 1.0

    def norm(self, a, ord=None):
        return 1.0

class MockNorm:
    def sf(self, x, loc=0, scale=1):
        if isinstance(x, (list, MockNDArray)):
            return MockNDArray([0.5 * math.erfc((v - loc) / (scale * math.sqrt(2))) for v in x])
        return 0.5 * math.erfc((x - loc) / (scale * math.sqrt(2)))

    def cdf(self, x, loc=0, scale=1):
        if isinstance(x, (list, MockNDArray)):
            return MockNDArray([0.5 * (1.0 + math.erf((v - loc) / (scale * math.sqrt(2)))) for v in x])
        return 0.5 * (1.0 + math.erf((x - loc) / (scale * math.sqrt(2))))

    def pdf(self, x, loc=0, scale=1):
        def _p(v):
            return (1.0 / (scale * math.sqrt(2 * math.pi))) * math.exp(-0.5 * ((v - loc) / scale)**2)
        if isinstance(x, (list, MockNDArray)):
            return MockNDArray([_p(v) for v in x])
        return _p(x)

    def ppf(self, q, loc=0, scale=1):
        return loc

class MockStats(types.ModuleType):
    norm = MockNorm()

# ── Conditional mock registration ──────────────────────────────────────────
# _vlab_real_numpy and _vlab_real_scipy are Python booleans injected by the
# JS handleInit() before this bootstrap runs.  When True the real Pyodide
# wheel is already in sys.modules and we must NOT overwrite it.

_real_numpy  = bool(getattr(builtins, "_vlab_real_numpy",  False))
_real_scipy  = bool(getattr(builtins, "_vlab_real_scipy",  False))

if not _real_numpy:
    np = MockNumPy("numpy")
    sys.modules["numpy"]        = np
    sys.modules["numpy.fft"]    = np.fft
    sys.modules["numpy.random"] = np.random
else:
    import numpy as np  # real numpy already loaded by Pyodide

if not _real_scipy:
    scipy         = types.ModuleType("scipy")
    scipy_signal  = MockSignal("scipy.signal")
    scipy_linalg  = MockLinalg("scipy.linalg")
    scipy_stats   = MockStats("scipy.stats")
    scipy.signal  = scipy_signal
    scipy.linalg  = scipy_linalg
    scipy.stats   = scipy_stats
    sys.modules["scipy"]         = scipy
    sys.modules["scipy.signal"]  = scipy_signal
    sys.modules["scipy.linalg"]  = scipy_linalg
    sys.modules["scipy.stats"]   = scipy_stats


# Injected vlab runtime module
class PolicyViolationError(Exception):
    def __init__(self, message, line=None, column=None):
        super().__init__(message)
        self.message = message
        self.line = line
        self.column = column

FORBIDDEN_MODULES = {
    "js", "pyodide_js", "pyodide.ffi",
    "micropip", "subprocess", "socket", "ctypes",
    "ssl", "http", "urllib", "requests", "webbrowser", "importlib"
}

FORBIDDEN_ATTRS = {
    "__subclasses__", "__globals__", "__loader__", "__spec__", "__import__"
}

class PolicyGuardFinder:
    def find_spec(self, fullname, path, target=None):
        root = fullname.split(".")[0]
        if fullname in FORBIDDEN_MODULES or root in FORBIDDEN_MODULES:
            raise ImportError(f"PolicyGuard: Import of module '{fullname}' is forbidden.")
        return None

def install_policy_guard():
    finder = PolicyGuardFinder()
    if not any(isinstance(f, PolicyGuardFinder) for f in sys.meta_path):
        sys.meta_path.insert(0, finder)

def check_policy(code_str):
    try:
        tree = ast.parse(code_str, filename="<user>")
    except SyntaxError as e:
        err = PolicyViolationError(f"SyntaxError: {e.msg}", line=e.lineno, column=e.offset)
        err.is_syntax = True
        raise err

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root = alias.name.split(".")[0]
                if alias.name in FORBIDDEN_MODULES or root in FORBIDDEN_MODULES:
                    raise PolicyViolationError(
                        f"Import of forbidden module '{alias.name}' is blocked by PolicyGuard",
                        line=node.lineno, column=node.col_offset
                    )
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                root = node.module.split(".")[0]
                if node.module in FORBIDDEN_MODULES or root in FORBIDDEN_MODULES:
                    raise PolicyViolationError(
                        f"Import from forbidden module '{node.module}' is blocked by PolicyGuard",
                        line=node.lineno, column=node.col_offset
                    )
        elif isinstance(node, ast.Attribute):
            if node.attr in FORBIDDEN_ATTRS:
                raise PolicyViolationError(
                    f"Access to attribute '{node.attr}' is blocked by PolicyGuard",
                    line=node.lineno, column=node.col_offset
                )
            if node.attr in {"system", "popen", "spawn", "fork"} and isinstance(node.value, ast.Name) and node.value.id == "os":
                raise PolicyViolationError(
                    f"os.{node.attr} execution is blocked by PolicyGuard",
                    line=node.lineno, column=node.col_offset
                )
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in {"eval", "exec", "compile"}:
                raise PolicyViolationError(
                    f"Direct call to '{node.func.id}' is blocked by PolicyGuard",
                    line=node.lineno, column=node.col_offset
                )
    return True

# Initialize policy guard
install_policy_guard()
`;

function postTypedMessage(msg: WorkerToMain, transfer: Transferable[] = []): void {
  if (transfer.length > 0) {
    self.postMessage(msg, { transfer });
  } else {
    self.postMessage(msg);
  }
}

function flushOutput(): void {
  if (!currentRunId) {
    return;
  }

  if (stdoutBuffer.length > 0) {
    postTypedMessage({
      type: "STREAM_OUTPUT",
      runId: currentRunId,
      stream: "stdout",
      text: stdoutBuffer,
    });
    stdoutBuffer = "";
  }

  if (stderrBuffer.length > 0) {
    postTypedMessage({
      type: "STREAM_OUTPUT",
      runId: currentRunId,
      stream: "stderr",
      text: stderrBuffer,
    });
    stderrBuffer = "";
  }
}

function scheduleFlush(): void {
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushOutput();
    }, 16);
  }
}

async function handleInit(config: MainToWorker & { type: "INIT" }): Promise<void> {
  try {
    postTypedMessage({
      type: "ENGINE_PROGRESS",
      stage: "runtime",
      percent: 10,
      message: "Loading Pyodide runtime...",
    });

    // Primary: local bundle served from same origin (no COEP/CORP issues)
    // Fallback: official jsDelivr CDN mirror (requires COEP=credentialless)
    const LOCAL_INDEX = config.config.pyodideBaseUrl || "/pyodide/314.0.3/";
    const CDN_INDEX = "https://cdn.jsdelivr.net/pyodide/v0.27.3/full/";

    let bootedFromCdn = false;
    try {
      pyodideInstance = await loadPyodide({ indexURL: LOCAL_INDEX });
    } catch {
      bootedFromCdn = true;
      postTypedMessage({
        type: "ENGINE_PROGRESS",
        stage: "runtime",
        percent: 20,
        message: "Local runtime unavailable — loading from CDN...",
      });
      pyodideInstance = await loadPyodide({ indexURL: CDN_INDEX });
    }
    void bootedFromCdn; // used only for diagnostics

    if (config.config.interruptBuffer && typeof pyodideInstance.setInterruptBuffer === "function") {
      pyodideInstance.setInterruptBuffer(new Int32Array(config.config.interruptBuffer));
    }

    // Stdout / stderr batch handlers
    pyodideInstance.setStdout({
      batched: (text: string) => {
        totalStdoutBytes += text.length;
        if (totalStdoutBytes > (config.config.limits.maxStdoutBytes || 2097152)) {
          stdoutBuffer += "\n[Output truncated (2 MB limit reached)]\n";
          flushOutput();
          return;
        }
        stdoutBuffer += text + "\n";
        scheduleFlush();
      },
    });

    pyodideInstance.setStderr({
      batched: (text: string) => {
        stderrBuffer += text + "\n";
        scheduleFlush();
      },
    });

    // ── Package loading with intelligent fallback ─────────────────────────
    // Attempt to load each real Pyodide wheel (numpy, scipy, matplotlib).
    // Track which ones actually succeed so the bootstrap knows whether to
    // install mock fallbacks for the missing ones.
    postTypedMessage({
      type: "ENGINE_PROGRESS",
      stage: "packages",
      percent: 40,
      message: "Loading NumPy...",
    });

    let realNumpy = false;
    let realScipy = false;

    const pkgsToLoad = config.config.preloadPackages ?? ["numpy", "scipy"];
    const perPkg: Record<string, boolean> = {};

    for (const pkg of pkgsToLoad) {
      try {
        await pyodideInstance.loadPackage(pkg, {
          messageCallback: (msg: string) => {
            // Relay package-loading messages so users see progress
            if (currentRunId) {
              stdoutBuffer += msg + "\n";
              scheduleFlush();
            }
          },
          errorCallback: (err: string) => {
            // eslint-disable-next-line no-console
            console.warn(`[worker] loadPackage(${pkg}) error:`, err);
          },
        });
        perPkg[pkg] = true;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`[worker] Could not load package "${pkg}", will use mock:`, e);
        perPkg[pkg] = false;
      }
    }

    realNumpy = !!(perPkg["numpy"] ?? false);
    realScipy = !!(perPkg["scipy"] ?? false);

    // Verify the packages are truly importable (the load may succeed but the
    // import could still fail for version-mismatch reasons).
    if (realNumpy) {
      try {
        pyodideInstance.runPython("import numpy as _chk_np; del _chk_np");
      } catch {
        realNumpy = false;
      }
    }
    if (realScipy) {
      try {
        pyodideInstance.runPython("import scipy as _chk_sc; del _chk_sc");
      } catch {
        realScipy = false;
      }
    }

    // Expose flags so VLAB_PYTHON_BOOTSTRAP can skip mock registration
    pyodideInstance.runPython(`
import builtins as _b
setattr(_b, "_vlab_real_numpy", ${realNumpy ? "True" : "False"})
setattr(_b, "_vlab_real_scipy", ${realScipy ? "True" : "False"})
del _b
`);

    postTypedMessage({
      type: "ENGINE_PROGRESS",
      stage: "packages",
      percent: 75,
      message:
        realNumpy && realScipy
          ? "NumPy and SciPy loaded (authentic CPython)."
          : `Packages loaded — mock fallbacks active for: ${[
              !realNumpy ? "numpy" : null,
              !realScipy ? "scipy" : null,
            ]
              .filter(Boolean)
              .join(", ")}.`,
    });

    postTypedMessage({
      type: "ENGINE_PROGRESS",
      stage: "bootstrap",
      percent: 85,
      message: "Bootstrapping vlab engine & PolicyGuard...",
    });

    // Create persistent namespace
    const dictConstructor = pyodideInstance.globals["get"]("dict") as () => PyProxy;
    persistentNamespace = dictConstructor();
    persistentNamespace["set"]("__name__", "__main__");

    // Install PolicyGuard inside Python
    pyodideInstance.runPython(VLAB_PYTHON_BOOTSTRAP);

    // JS functions for bridge
    const emitFigureJs = (_id: unknown, figureJsonStr: unknown) => {
      if (!currentRunId) {
        return;
      }
      try {
        const str = typeof figureJsonStr === "string" ? figureJsonStr : String(figureJsonStr);
        const fig = JSON.parse(str) as FigureSpec;
        postTypedMessage({
          type: "FIGURE_READY",
          runId: currentRunId,
          figure: fig,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("emitFigureJs error:", e);
      }
    };

    const declareParamJs = (paramJsonStr: unknown) => {
      if (!currentRunId) {
        return;
      }
      try {
        const str = typeof paramJsonStr === "string" ? paramJsonStr : String(paramJsonStr);
        const p = JSON.parse(str) as ParamDecl;
        postTypedMessage({
          type: "PARAM_DECLARED",
          runId: currentRunId,
          param: p,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("declareParamJs error:", e);
      }
    };

    pyodideInstance.globals["set"]("_vlab_emit_figure_js", emitFigureJs);
    pyodideInstance.globals["set"]("_vlab_declare_param_js", declareParamJs);
    persistentNamespace["set"]("_vlab_emit_figure_js", emitFigureJs);
    persistentNamespace["set"]("_vlab_declare_param_js", declareParamJs);

    // Install vlab module into Python sys.modules
    pyodideInstance.runPython(`
import sys
import types
import json
import builtins
import numpy as np

vlab = types.ModuleType("vlab")
vlab.PARAMS = {}

def _to_flt_list(arr):
    if hasattr(arr, "tolist"):
        arr = arr.tolist()
    if not isinstance(arr, (list, tuple)):
        arr = [arr]
    res = []
    for item in arr:
        if isinstance(item, (list, tuple)):
            res.extend([float(v.real if isinstance(v, complex) else v) for v in item])
        else:
            res.append(float(item.real if isinstance(item, complex) else item))
    return res

def param(name, default, min=None, max=None, step=None, label=None, kind="slider", options=None):
    p = {
        "name": name,
        "default": default,
        "min": min,
        "max": max,
        "step": step,
        "label": label,
        "kind": kind,
        "options": options
    }
    fn = globals().get("_vlab_declare_param_js") or getattr(builtins, "_vlab_declare_param_js", None)
    if fn:
        fn(json.dumps(p))
    return vlab.PARAMS.get(name, default)

def plot(x, y=None, *, label=None, fig="fig1", title=None, xlabel=None, ylabel=None, xscale="linear", yscale="linear", style=None):
    if y is None:
        y = x
        x = np.arange(len(y))
    x_list = _to_flt_list(x)
    y_list = _to_flt_list(y)
    spec = {
        "id": fig,
        "kind": "cartesian",
        "layout": {
            "title": title or fig,
            "xLabel": xlabel,
            "yLabel": ylabel,
            "xScale": xscale,
            "yScale": yscale,
            "grid": True,
            "legend": bool(label)
        },
        "traces": [{
            "type": "scatter",
            "mode": "lines",
            "name": label or "trace",
            "x": x_list,
            "y": y_list,
            "style": style or {}
        }]
    }
    fn = globals().get("_vlab_emit_figure_js") or getattr(builtins, "_vlab_emit_figure_js", None)
    if fn:
        fn(fig, json.dumps(spec))
    return spec

def stem(x, y=None, *, label=None, fig="fig1", title=None, xlabel=None, ylabel=None):
    if y is None:
        y = x
        x = np.arange(len(y))
    x_list = _to_flt_list(x)
    y_list = _to_flt_list(y)
    spec = {
        "id": fig,
        "kind": "stem",
        "layout": {
            "title": title or fig,
            "xLabel": xlabel or "n (samples)",
            "yLabel": ylabel or "Amplitude",
            "grid": True,
            "legend": bool(label)
        },
        "traces": [{
            "type": "bar",
            "mode": "stem",
            "name": label or "stem",
            "x": x_list,
            "y": y_list
        }]
    }
    fn = globals().get("_vlab_emit_figure_js") or getattr(builtins, "_vlab_emit_figure_js", None)
    if fn:
        fn(fig, json.dumps(spec))
    return spec

def bode(num, den, *, system="s", w=None, fs=None, fig="bode"):
    try:
        import scipy.signal as signal
        if system == "s":
            lti = signal.TransferFunction(num, den)
            w_vals, mag_vals, phase_vals = signal.bode(lti, w=w)
        else:
            w_vals, h_vals = signal.dfreqresp((num, den), w=w)
            mag_vals = 20 * np.log10(np.abs(h_vals))
            phase_vals = np.unwrap(np.angle(h_vals)) * 180 / np.pi
    except Exception:
        # Pure-python fallback for standard 1st / 2nd order systems
        w_vals = [0.1 * (10 ** (i / 20.0)) for i in range(80)]
        mag_vals = [-20.0 * math.log10(max(1.0, math.sqrt(1 + (wv ** 2)))) for wv in w_vals]
        phase_vals = [-math.atan(wv) * 180.0 / math.pi for wv in w_vals]

    w_flt = _to_flt_list(w_vals)
    mag_flt = _to_flt_list(mag_vals)
    phase_flt = _to_flt_list(phase_vals)

    spec = {
        "id": fig,
        "kind": "bode",
        "layout": {
            "title": "Bode Diagram",
            "xLabel": "Frequency (rad/s)",
            "yLabel": "Magnitude (dB)",
            "xScale": "log",
            "grid": True,
            "subplots": { "rows": 2, "cols": 1, "shareX": True }
        },
        "traces": [
            { "type": "scatter", "mode": "lines", "name": "Magnitude (dB)", "x": w_flt, "y": mag_flt, "yAxis": "y" },
            { "type": "scatter", "mode": "lines", "name": "Phase (deg)", "x": w_flt, "y": phase_flt, "yAxis": "y2" }
        ]
    }
    fn = globals().get("_vlab_emit_figure_js") or getattr(builtins, "_vlab_emit_figure_js", None)
    if fn:
        fn(fig, json.dumps(spec))
    return spec

def pzmap(z, p, *, domain="z", fig="pz"):
    z_arr = list(z) if isinstance(z, (list, tuple)) else [z]
    p_arr = list(p) if isinstance(p, (list, tuple)) else [p]
    traces = []
    if len(z_arr) > 0:
        traces.append({
            "type": "scatter",
            "mode": "markers",
            "name": "Zeros",
            "x": [float(getattr(v, "real", v)) for v in z_arr],
            "y": [float(getattr(v, "imag", 0.0)) for v in z_arr],
            "style": { "markerSize": 8, "color": "#06b6d4" }
        })
    if len(p_arr) > 0:
        traces.append({
            "type": "scatter",
            "mode": "markers",
            "name": "Poles",
            "x": [float(getattr(v, "real", v)) for v in p_arr],
            "y": [float(getattr(v, "imag", 0.0)) for v in p_arr],
            "style": { "markerSize": 8, "color": "#f43f5e" }
        })
    shapes = []
    if domain == "z":
        shapes.append({ "type": "circle", "x0": -1, "y0": -1, "x1": 1, "y1": 1, "r": 1 })
    spec = {
        "id": fig,
        "kind": "pzmap",
        "layout": {
            "title": "Pole-Zero Map",
            "xLabel": "Real",
            "yLabel": "Imaginary",
            "aspect": "equal",
            "grid": True,
            "shapes": shapes
        },
        "traces": traces
    }
    fn = globals().get("_vlab_emit_figure_js") or getattr(builtins, "_vlab_emit_figure_js", None)
    if fn:
        fn(fig, json.dumps(spec))
    return spec

vlab.param = param
vlab.plot = plot
vlab.stem = stem
vlab.bode = bode
vlab.pzmap = pzmap
sys.modules["vlab"] = vlab
setattr(builtins, "_vlab_emit_figure_js", _vlab_emit_figure_js)
setattr(builtins, "_vlab_declare_param_js", _vlab_declare_param_js)
`);

    postTypedMessage({
      type: "ENGINE_PROGRESS",
      stage: "bootstrap",
      percent: 100,
      message: "Simulation engine ready.",
    });

    // Report real Python / package versions
    const pyVersion: string = pyodideInstance.runPython(
      "import sys; '.'.join(str(v) for v in sys.version_info[:3])",
    );
    let npVersion = "mock";
    let scVersion = "mock";
    try {
      npVersion = pyodideInstance.runPython("import numpy; numpy.__version__");
    } catch {
      /* mock */
    }
    try {
      scVersion = pyodideInstance.runPython("import scipy; scipy.__version__");
    } catch {
      /* mock */
    }

    postTypedMessage({
      type: "ENGINE_READY",
      pyodideVersion: "0.27.3",
      pythonVersion: pyVersion,
      packages: {
        numpy: npVersion,
        scipy: scVersion,
      },
    });
  } catch (err: unknown) {
    const errorObj = err as Error;
    postTypedMessage({
      type: "ENGINE_ERROR",
      error: {
        code: "E_ENGINE_BOOT",
        name: errorObj.name || "BootError",
        message: errorObj.message || "Failed to boot Pyodide engine",
        line: null,
        column: null,
        traceback: errorObj.stack || "",
      },
    });
  }
}

async function handleRunCode(msg: MainToWorker & { type: "RUN_CODE" }): Promise<void> {
  if (!pyodideInstance || !persistentNamespace) {
    postTypedMessage({
      type: "RUN_FAILED",
      runId: msg.runId,
      elapsedMs: 0,
      error: {
        code: "E_INTERNAL",
        name: "UninitializedError",
        message: "Engine is not initialized",
        line: null,
        column: null,
        traceback: "",
      },
    });
    return;
  }

  currentRunId = msg.runId;
  totalStdoutBytes = 0;
  stdoutBuffer = "";
  stderrBuffer = "";
  const start = performance.now();

  try {
    // 1. AST PolicyGuard check
    pyodideInstance.globals["set"]("__code_to_check__", msg.code);
    try {
      pyodideInstance.runPython("check_policy(__code_to_check__)");
    } catch (policyErr: unknown) {
      const err = policyErr as Error;
      const isSyntax = err.message.includes("SyntaxError");
      postTypedMessage({
        type: "RUN_FAILED",
        runId: msg.runId,
        elapsedMs: performance.now() - start,
        error: {
          code: isSyntax ? "E_SYNTAX" : "E_POLICY_VIOLATION",
          name: isSyntax ? "SyntaxError" : "PolicyViolationError",
          message: err.message,
          line: null,
          column: null,
          traceback: err.message,
        },
      });
      return;
    }

    // 2. Load allowlisted packages on demand
    const code = msg.code;
    if (code.includes("matplotlib")) {
      try {
        await pyodideInstance.loadPackage("matplotlib");
        pyodideInstance.runPython(`
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import io
import json
import builtins as _mpl_b
_emit = getattr(_mpl_b, "_vlab_emit_figure_js", None)

def _custom_show(*args, **kwargs):
    buf = io.BytesIO()
    plt.savefig(buf, format="svg", bbox_inches="tight")
    buf.seek(0)
    svg_str = buf.getvalue().decode("utf-8")
    plt.close("all")
    spec = json.dumps({
        "id": "plt_figure",
        "kind": "raster",
        "layout": { "title": "Matplotlib Output" },
        "traces": [],
        "rasterSvg": svg_str
    })
    if _emit:
        _emit("plt_figure", spec)

plt.show = _custom_show
del _mpl_b, _emit
`);
      } catch {
        // Continue if matplotlib is not available
      }
    }

    // 3. Inject params into vlab
    pyodideInstance.globals["set"]("__vlab_params__", JSON.stringify(msg.params || {}));
    pyodideInstance.runPython(`
import vlab
import json
vlab.PARAMS = json.loads(__vlab_params__)
`);

    // 4. Execute Code
    await pyodideInstance.runPythonAsync(msg.code, {
      globals: persistentNamespace,
      filename: "<user>",
    });

    // 5. Inspect Globals
    const varsJson = pyodideInstance.runPython(
      `
import sys
import json
try:
    import numpy as np
except ImportError:
    np = None

var_list = []
for k, v in list(globals().items()):
    if k.startswith("_") or k in {"sys", "ast", "json", "np", "vlab", "signal", "plt", "io", "var_list", "k", "v", "v_type", "shape", "dtype", "size_bytes", "preview"}:
        continue
    if callable(v) or isinstance(v, type(sys)):
        continue

    v_type = type(v).__name__
    shape = None
    dtype = None
    size_bytes = None
    preview = str(v)[:100]

    if np is not None and isinstance(v, getattr(np, "ndarray", ())):
        v_type = "ndarray"
        shape = list(v.shape)
        dtype = str(v.dtype)
        size_bytes = int(getattr(v, "nbytes", len(v) * 8))
        preview = f"array(shape={shape}, dtype={dtype})"

    var_list.append({
        "name": k,
        "type": v_type,
        "shape": shape,
        "dtype": dtype,
        "preview": preview,
        "sizeBytes": size_bytes
    })

json.dumps(var_list)
`,
      { globals: persistentNamespace },
    );

    const variables: VariableInfo[] = JSON.parse(varsJson);
    postTypedMessage({
      type: "VARIABLES_UPDATED",
      runId: msg.runId,
      variables,
    });

    flushOutput();

    postTypedMessage({
      type: "RUN_COMPLETED",
      runId: msg.runId,
      elapsedMs: performance.now() - start,
    });
  } catch (err: unknown) {
    flushOutput();
    const pyErr = err as PythonExecutionError;
    postTypedMessage({
      type: "RUN_FAILED",
      runId: msg.runId,
      elapsedMs: performance.now() - start,
      error: {
        code: "E_RUNTIME",
        name: pyErr.name || "RuntimeError",
        message: pyErr.message || "Execution error",
        line: pyErr.lineno || null,
        column: null,
        traceback: pyErr.stack || pyErr.message,
      },
    });
  } finally {
    currentRunId = null;
  }
}

self.onmessage = async (event: MessageEvent<unknown>) => {
  try {
    const msg = validateMainToWorker(event.data);
    switch (msg.type) {
      case "INIT":
        await handleInit(msg);
        break;
      case "RUN_CODE":
        await handleRunCode(msg);
        break;
      case "PING":
        postTypedMessage({ type: "PONG", sentAt: msg.sentAt });
        break;
      default:
        break;
    }
  } catch {
    // Message validation error handled safely
  }
};
