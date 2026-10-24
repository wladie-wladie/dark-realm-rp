# Бесшовная текстура без двоения: края склеиваются по шву с минимальной разницей (как в image quilting).
import numpy as np
from PIL import Image

def _cut_cols(a, b):
    # a, b: H×o×3 — полосы, которые должны совпасть; ищем вертикальный путь с минимальной ошибкой
    e = ((a.astype(np.float32) - b.astype(np.float32)) ** 2).sum(2)
    H, o = e.shape; cost = e.copy(); back = np.zeros((H, o), np.int32)
    for y in range(1, H):
        for dx in (-1, 0, 1):
            pass
        prev = cost[y - 1]
        l = np.r_[np.inf, prev[:-1]]; r = np.r_[prev[1:], np.inf]
        stack = np.vstack([l, prev, r]); k = stack.argmin(0)
        cost[y] += stack[k, np.arange(o)]; back[y] = np.arange(o) + k - 1
    path = np.zeros(H, np.int32); path[-1] = int(cost[-1].argmin())
    for y in range(H - 1, 0, -1): path[y - 1] = back[y, path[y]]
    m = np.arange(o)[None, :] < path[:, None]   # слева от шва — a, справа — b
    return np.where(m[..., None], a, b)

def seamless_quilt(img, overlap=None):
    A = np.array(img.convert("RGB"))
    H, W = A.shape[:2]; o = overlap or W // 8
    # по горизонтали: правый край переходит в левый
    left = _cut_cols(A[:, W - o:], A[:, :o])
    A = np.concatenate([left, A[:, o:W - o]], 1)
    # по вертикали — то же для строк
    At = A.transpose(1, 0, 2); H2 = At.shape[1]
    top = _cut_cols(At[:, H2 - o:], At[:, :o])
    At = np.concatenate([top, At[:, o:H2 - o]], 1)
    return Image.fromarray(At.transpose(1, 0, 2))
