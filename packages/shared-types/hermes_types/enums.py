from enum import StrEnum


class Classification(StrEnum):
    OFFICIAL = "official"
    COMMUNITY = "community"
    DEPRECATED = "deprecated"
    UNSAFE = "unsafe"


class ServerStatus(StrEnum):
    PENDING = "pending"
    INSTALLING = "installing"
    CONFIGURING = "configuring"
    VALIDATING = "validating"
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    STOPPED = "stopped"
    FAILED = "failed"


class TaskStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    WAITING_USER = "waiting_user"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class IncidentState(StrEnum):
    DETECTED = "detected"
    DIAGNOSING = "diagnosing"
    REMEDIATING = "remediating"
    VERIFYING = "verifying"
    RESOLVED = "resolved"
    ESCALATED = "escalated"


class TrustLevel(StrEnum):
    CONFIRM_EVERY = "confirm_every"
    CONFIRM_RISKY = "confirm_risky"
    FULL_AUTONOMY = "full_autonomy"
