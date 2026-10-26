from app.modules.auth.throttling import LoginThrottle


class Clock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def test_pauses_after_too_many_failures_and_recovers():
    clock = Clock()
    throttle = LoginThrottle(max_failures=3, window_seconds=900, clock=clock)
    for _ in range(3):
        assert throttle.retry_after('goa|1.2.3.4') == 0
        throttle.record_failure('goa|1.2.3.4')
        clock.now += 10
    assert throttle.retry_after('goa|1.2.3.4') == 900 - 30
    assert throttle.retry_after('goa|5.6.7.8') == 0  # another computer
    assert throttle.retry_after('pune|1.2.3.4') == 0  # another login

    clock.now += 900 - 30  # the first failure leaves the window
    assert throttle.retry_after('goa|1.2.3.4') == 0


def test_success_resets():
    throttle = LoginThrottle(max_failures=2, window_seconds=60, clock=Clock())
    throttle.record_failure('k')
    throttle.reset('k')
    throttle.record_failure('k')
    assert throttle.retry_after('k') == 0


def test_checking_does_not_track_keys():
    throttle = LoginThrottle(max_failures=2, window_seconds=60, clock=Clock())
    throttle.retry_after('never-failed')
    assert throttle._failures == {}
