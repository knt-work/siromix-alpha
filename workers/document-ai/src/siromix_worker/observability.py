import re
from typing import Any

PROHIBITED_KEYS = re.compile(
    r"password|secret|token|authorization|cookie|signed.?url|object.?key|"
    r"prompt|answer|question|content|bytes",
    re.IGNORECASE,
)
PROHIBITED_VALUES = re.compile(
    r"bearer\s+\S+|https?://\S+[?&](?:token|signature|x-amz-signature)=\S+|"
    r"-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-(?:proj-)?[A-Za-z0-9_-]{12,}",
    re.IGNORECASE,
)


def redact(value: Any) -> Any:
    if isinstance(value, list):
        return [redact(item) for item in value]
    if isinstance(value, dict):
        return {
            key: "[REDACTED]" if PROHIBITED_KEYS.search(key) else redact(item)
            for key, item in value.items()
        }
    if isinstance(value, str) and PROHIBITED_VALUES.search(value):
        return "[REDACTED]"
    return value
