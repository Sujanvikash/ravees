"""
A brake on password guessing: after too many wrong passwords for one login from one computer (by default 10
in 15 minutes), sign-in for that pair pauses until the oldest failure is out of the window.

The counts live in this process's memory. That fits the single-process server the showrooms run; with several
workers or servers each keeps its own counts, and a restart forgets them. Move the counts to the database or
Redis before scaling out.
"""

import math
import time
from collections import deque
from collections.abc import Callable
from functools import lru_cache
from threading import Lock

from app.core.config import get_settings

# Above this many tracked keys, keys with no recent failures are swept out, so memory stays bounded.
_SWEEP_ABOVE = 10_000


class LoginThrottle:
    """Failed sign-ins per key (username and client address) within a sliding window. Thread-safe."""

    def __init__(self, max_failures: int, window_seconds: float, clock: Callable[[], float] = time.monotonic) -> None:
        self.max_failures = max_failures
        self.window_seconds = window_seconds
        self._clock = clock
        self._failures: dict[str, deque[float]] = {}
        self._lock = Lock()

    def retry_after(self, key: str) -> int:
        """Seconds until this key may try again; 0 if it may try now."""
        with self._lock:
            now = self._clock()
            failures = self._failures.get(key)
            if failures is None:
                return 0
            self._drop_old(failures, now)
            if len(failures) < self.max_failures:
                return 0
            return max(1, math.ceil(failures[0] + self.window_seconds - now))

    def record_failure(self, key: str) -> None:
        with self._lock:
            now = self._clock()
            failures = self._failures.setdefault(key, deque())
            self._drop_old(failures, now)
            failures.append(now)
            if len(self._failures) > _SWEEP_ABOVE:
                self._sweep(now)

    def reset(self, key: str) -> None:
        """Forgets a key's failures, after a successful sign-in."""
        with self._lock:
            self._failures.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._failures.clear()

    def _drop_old(self, failures: deque[float], now: float) -> None:
        while failures and failures[0] <= now - self.window_seconds:
            failures.popleft()

    def _sweep(self, now: float) -> None:
        cutoff = now - self.window_seconds
        for key in [k for k, failures in self._failures.items() if not failures or failures[-1] <= cutoff]:
            del self._failures[key]


@lru_cache
def get_login_throttle() -> LoginThrottle:
    """The process-wide throttle, sized from the settings."""
    settings = get_settings()
    return LoginThrottle(settings.login_max_failures, settings.login_window_minutes * 60)
