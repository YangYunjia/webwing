from datetime import datetime, timedelta, timezone
from logging import Logger

import redis


class HourlyTrafficStats:
    def __init__(
        self,
        redis_conn: redis.StrictRedis,
        traffic_logger: Logger,
        api_logger: Logger,
        retention_hours: int = 24 * 30,
        key_prefix: str = "traffic:hourly",
        last_logged_hour_key: str = "traffic:last_logged_hour",
    ):
        self.redis_conn = redis_conn
        self.traffic_logger = traffic_logger
        self.api_logger = api_logger
        self.retention_hours = retention_hours
        self.key_prefix = key_prefix
        self.last_logged_hour_key = last_logged_hour_key

    def record_home_visit(self) -> None:
        self._record_hourly_metric("home_visits")

    def record_predict_success(self) -> None:
        self._record_hourly_metric("predict_success")

    def record_predict_failure(self) -> None:
        self._record_hourly_metric("predict_failure")

    def record_task_result(self, task_id: str, is_success: bool) -> None:
        """
        Record final task result exactly once per task_id.
        Repeated polling on the same finished task will not duplicate metrics.
        """
        counted_key = f"{self.key_prefix}:counted_task:{task_id}"
        try:
            first_record = self.redis_conn.set(counted_key, "1", nx=True, ex=self.retention_hours * 3600)
        except redis.RedisError as exc:
            self.api_logger.warning("Failed to deduplicate task result for %s: %s", task_id, exc)
            return

        if not first_record:
            return

        if is_success:
            self.record_predict_success()
        else:
            self.record_predict_failure()

    def _hour_bucket(self, dt: datetime) -> str:
        return dt.strftime("%Y-%m-%dT%H:00:00Z")

    def _hourly_traffic_key(self, bucket: str) -> str:
        return f"{self.key_prefix}:{bucket}"

    def _parse_bucket(self, value: str) -> datetime:
        return datetime.strptime(value, "%Y-%m-%dT%H:00:00Z").replace(tzinfo=timezone.utc)

    def _decode_redis_value(self, value) -> str:
        if isinstance(value, bytes):
            return value.decode("utf-8")
        return str(value)

    def _flush_completed_hour_logs(self, now: datetime) -> None:
        current_hour = now.replace(minute=0, second=0, microsecond=0)
        raw_last = self.redis_conn.get(self.last_logged_hour_key)
        if raw_last is None:
            self.redis_conn.set(self.last_logged_hour_key, self._hour_bucket(current_hour))
            return

        try:
            last_logged_hour = self._parse_bucket(self._decode_redis_value(raw_last))
        except ValueError:
            self.redis_conn.set(self.last_logged_hour_key, self._hour_bucket(current_hour))
            return

        log_hour = last_logged_hour + timedelta(hours=1)
        while log_hour < current_hour:
            bucket = self._hour_bucket(log_hour)
            values = self.redis_conn.hmget(
                self._hourly_traffic_key(bucket),
                "home_visits",
                "predict_success",
                "predict_failure",
            )
            home_visits = int(values[0] or 0)
            predict_success = int(values[1] or 0)
            predict_failure = int(values[2] or 0)
            self.traffic_logger.info(
                "hour=%s home_visits=%d predict_success=%d predict_failure=%d",
                bucket,
                home_visits,
                predict_success,
                predict_failure,
            )
            log_hour += timedelta(hours=1)

        self.redis_conn.set(self.last_logged_hour_key, self._hour_bucket(current_hour))

    def _record_hourly_metric(self, metric_name: str) -> None:
        now = datetime.now(timezone.utc)
        bucket = self._hour_bucket(now)
        try:
            self._flush_completed_hour_logs(now)
            key = self._hourly_traffic_key(bucket)
            self.redis_conn.hincrby(key, metric_name, 1)
            self.redis_conn.expire(key, self.retention_hours * 3600)
        except redis.RedisError as exc:
            self.api_logger.warning("Failed to record hourly metric %s: %s", metric_name, exc)
